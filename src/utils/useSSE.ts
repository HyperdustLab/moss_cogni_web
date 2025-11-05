import { ref } from 'vue'
import { useWallet, connectWallet } from './useWallet'
import { createPaymentHeader, selectPaymentRequirements } from 'x402/client'
import { PaymentRequirementsSchema } from 'x402/types'
import axios from 'axios'

export interface PostResponse {
  success: boolean
  data?: any
  status?: number
  statusText?: string
  headers?: Record<string, string>
  error?: string
  errorDetails?: any
}

const postResponse = ref<PostResponse | null>(null)
const isRequesting = ref<boolean>(false)
const postError = ref<string | null>(null)

export function useSSE() {
  const wallet = useWallet()

  const makePostRequest = async (url: string, body?: Record<string, any>) => {
    if (isRequesting.value) {
      throw new Error('请求正在进行中，请稍候')
    }

    // 检查钱包连接状态，如果未连接则自动连接
    if (!wallet.isConnected.value || !wallet.signer.value) {
      try {
        await connectWallet()
      } catch (error: any) {
        const errorMessage = error.message || '钱包连接失败'
        throw new Error(`钱包连接失败: ${errorMessage}`)
      }
    }

    isRequesting.value = true
    postError.value = null
    postResponse.value = null

    try {
      // Step 1: 使用不带支付拦截器的 axios 获取支付要求（402 响应）
      let paymentHeader: string

      try {
        // 使用普通的 axios 实例（不带支付拦截器）来获取 402 响应
        const baseClient = axios.create({
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const response = await baseClient.post(
          url,
          body || {}, // 将参数作为 JSON body 发送
          {
            validateStatus: (status) => status === 402 || status === 200, // 接受 402 和 200
          }
        )

        if (response.status === 402) {
          // 解析支付要求
          const { x402Version, accepts } = response.data

          if (!x402Version || !accepts || !Array.isArray(accepts)) {
            throw new Error('无效的 402 响应格式')
          }

          // 解析支付要求
          const parsedPaymentRequirements = accepts.map((x) => PaymentRequirementsSchema.parse(x))

          // 选择支付要求（使用 base-sepolia 网络）
          const selectedPaymentRequirements = selectPaymentRequirements(parsedPaymentRequirements, 'base-sepolia', 'exact')

          // 创建支付 header（确保 signer 存在）
          if (!wallet.signer.value) {
            throw new Error('钱包签名器未初始化')
          }
          paymentHeader = await createPaymentHeader(wallet.signer.value, x402Version, selectedPaymentRequirements)
        } else if (response.status === 200) {
          // 如果直接返回 200，说明不需要支付
          paymentHeader = '' // 空支付 header
        } else {
          throw new Error(`意外的响应状态: ${response.status}`)
        }
      } catch (error: any) {
        if (error.response?.status === 402) {
          // 如果捕获到 402，尝试处理
          const { x402Version, accepts } = error.response.data

          if (!x402Version || !accepts || !Array.isArray(accepts)) {
            throw new Error('无效的 402 响应格式')
          }

          const parsedPaymentRequirements = accepts.map((x) => PaymentRequirementsSchema.parse(x))
          const selectedPaymentRequirements = selectPaymentRequirements(parsedPaymentRequirements, 'base-sepolia', 'exact')

          // 确保 signer 存在
          if (!wallet.signer.value) {
            throw new Error('钱包签名器未初始化')
          }
          paymentHeader = await createPaymentHeader(wallet.signer.value, x402Version, selectedPaymentRequirements)
        } else {
          throw error
        }
      }

      // Step 2: 使用带支付 header 的 POST 请求
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // 如果有支付 header，添加到请求头
      if (paymentHeader) {
        headers['X-PAYMENT'] = paymentHeader
      }

      const response = await axios.post(url, body || {}, {
        headers,
      })

      // 成功响应
      postResponse.value = {
        success: true,
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
      }

      return postResponse.value
    } catch (error: any) {
      const errorMsg = error.message || String(error)
      postError.value = errorMsg

      // 处理错误响应
      if (error.response) {
        postResponse.value = {
          success: false,
          error: errorMsg,
          errorDetails: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers as Record<string, string>,
          data: error.response.data,
        }
      } else {
        postResponse.value = {
          success: false,
          error: errorMsg,
          errorDetails: error,
        }
      }

      throw error
    } finally {
      isRequesting.value = false
    }
  }

  const clearResponse = () => {
    postResponse.value = null
    postError.value = null
  }

  return {
    postResponse,
    isRequesting,
    postError,
    makePostRequest,
    clearResponse,
  }
}
