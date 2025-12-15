import axios from 'axios'
import { withPaymentInterceptor, decodeXPaymentResponse } from 'x402-axios'
import { createWalletClient, custom, getAddress, type Address } from 'viem'
import { base, baseSepolia, avalancheFuji, avalanche, polygon, polygonAmoy } from 'viem/chains'

type SupportedNetwork = 'base-sepolia' | 'base' | 'avalanche-fuji' | 'avalanche' | 'polygon' | 'polygon-amoy'

function networkToChain(network: SupportedNetwork) {
  switch (network) {
    case 'base-sepolia':
      return baseSepolia
    case 'base':
      return base
    case 'avalanche-fuji':
      return avalancheFuji
    case 'avalanche':
      return avalanche
    case 'polygon':
      return polygon
    case 'polygon-amoy':
      return polygonAmoy
    default:
      return baseSepolia
  }
}

let cachedWallet: any | null = null
let cachedAxios: import('axios').AxiosInstance | null = null

async function getMetaMaskWallet(network: SupportedNetwork) {
  if (cachedWallet) return cachedWallet

  const eth = (window as any).ethereum
  if (!eth) {
    throw new Error('未检测到 MetaMask，请先安装或启用。')
  }

  const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
  const account: Address = getAddress(accounts[0])
  const chain = networkToChain(network)

  cachedWallet = createWalletClient({
    chain,
    account,
    transport: custom(eth),
  })

  return cachedWallet
}

export async function getX402Axios(): Promise<import('axios').AxiosInstance> {
  if (cachedAxios) return cachedAxios

  const baseURL = import.meta.env.VITE_X402_RESOURCE_SERVER_URL as string | undefined
  const network = (import.meta.env.VITE_X402_NETWORK as SupportedNetwork) || 'base-sepolia'

  console.info('[x402] 初始化 axios 客户端:', { baseURL, network })

  const wallet = await getMetaMaskWallet(network)
  const axiosClient = baseURL ? axios.create({ baseURL }) : axios.create()
  
  // 添加调试：监听请求和响应
  axiosClient.interceptors.request.use(
    (config) => {
      console.info('[x402] 请求发出:', config.method, config.url)
      return config
    },
    (error) => {
      console.error('[x402] 请求错误:', error)
      return Promise.reject(error)
    }
  )

  axiosClient.interceptors.response.use(
    (response) => {
      console.info('[x402] 响应成功:', response.status, response.config.url)
      return response
    },
    (error) => {
      console.error('[x402] 响应错误:', {
        status: error.response?.status,
        url: error.config?.url,
        headers: error.response?.headers
      })
      return Promise.reject(error)
    }
  )

  const api = withPaymentInterceptor(axiosClient, wallet)

  cachedAxios = api
  return api
}

// 触发一次受 402 保护的资源请求，以完成支付（拦截器会自动处理支付与重试）
export async function ensurePaid(path?: string): Promise<string | null> {
  const endpointPath = path || (import.meta.env.VITE_X402_ENDPOINT_PATH as string)
  if (!endpointPath) {
    throw new Error('缺少环境变量 VITE_X402_ENDPOINT_PATH')
  }

  try {
    console.info('[x402] 发起支付请求:', endpointPath)
    const api = await getX402Axios()
    const response = await api.get(endpointPath)
    console.info('[x402] 收到响应:', {
      status: response.status,
      headers: response.headers,
      hasPaymentResponse: !!(response.headers?.['x-payment-response'] || response.headers?.['X-Payment-Response'])
    })
    
    const header = response.headers?.['x-payment-response'] || response.headers?.['X-Payment-Response']
    if (header) {
      try {
        const decoded = decodeXPaymentResponse(header)
        console.info('[x402] 支付响应解码:', decoded)
        return header as string
      } catch (err) {
        console.error('[x402] 支付响应解码失败:', err)
      }
    }
    
    // 如果没有支付响应头，可能已经通过其他方式完成了支付
    console.info('[x402] 未发现支付响应头，可能已自动完成支付')
    return null
  } catch (error: any) {
    console.error('[x402] 支付请求失败:', error)
    // 如果是 402 错误，拦截器应该已经处理了
    if (error.response?.status === 402) {
      console.info('[x402] 收到 402 状态码，拦截器应该处理支付')
      throw new Error('支付失败，请重试')
    }
    throw error
  }
}
