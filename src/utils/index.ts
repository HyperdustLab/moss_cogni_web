import dayjs from 'dayjs'

import { ethers } from 'ethers'

import { request } from '@/utils/request'

import numeral from 'numeral'

import moment from 'moment-timezone'

import { type FormInstance, type FormRules, ElMessage, ElMessageBox } from 'element-plus'

/** Format date and time */
export const formatDateTime = (time: string | number | Date) => {
  return time ? dayjs(new Date(time)).format('YYYY-MM-DD HH:mm:ss') : 'N/A'
}

/** Get global CSS variable value using JS */
export const getCssVariableValue = (cssVariableName: string) => {
  let cssVariableValue = ''
  try {
    // Returns an empty string if no value is obtained
    cssVariableValue = getComputedStyle(document.documentElement).getPropertyValue(cssVariableName)
  } catch (error) {
    console.error(error)
  }
  return cssVariableValue
}

/** Set global CSS variable value using JS */
export const setCssVariableValue = (cssVariableName: string, cssVariableValue: string) => {
  try {
    document.documentElement.style.setProperty(cssVariableName, cssVariableValue)
  } catch (error) {
    console.error(error)
  }
}

async function checkChainId(chainId) {
  try {
    console.info(chainId)
    // @ts-ignore
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + parseInt(chainId).toString(16) }],
    })

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export async function buildContract(blockchainId, smartContractCode) {
  const blockchain = await getBlockchain(blockchainId)

  const currChainId = await ethereum.request({ method: 'eth_chainId' })

  // @ts-ignore
  if (parseInt(currChainId, 16) !== blockchain.chainId) {
    // example of switching or adding network with Harmony Mainnet
    const switchNetwork = async () => {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + parseInt(blockchain.chainId).toString(16) }],
        })
      } catch (switchError) {
        // 4902 error code indicates the chain is missing on the wallet
        if (switchError.code === 4902) {
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x' + parseInt(blockchain.chainId).toString(16),
                  chainName: blockchain.name,
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: [blockchain.publicRpcUrl],
                  blockExplorerUrls: [blockchain.blockBrowserUrl],
                },
              ],
            })
          } catch (error) {
            console.error(error)
          }
        }
      }
    }

    await switchNetwork()
  }

  const provider = new ethers.BrowserProvider(window.ethereum)

  const signer = await provider.getSigner()

  console.info('blockchainId:', blockchainId)

  const smartContract = await getSmartContractByCode(smartContractCode, blockchainId)

  console.info('blockchainId:', blockchainId)

  const contract = new ethers.Contract(smartContract.address, smartContract.contractBinary, signer)
  console.info(contract)
  return contract
}

async function getBlockchain(id) {
  const { result } = await request({ url: '/mgn/blockchain/queryById', method: 'get', params: { id } })

  return result
}

export async function getSmartContractByCode(code, blockchainId) {
  const { result } = await request({ url: '/mgn/smartContract/getSmartContractByCode', method: 'get', params: { code, blockchainId: blockchainId.toString() } })

  return result
}

export async function handleAuthorized(blockchainId, address, amount) {
  const provider = new ethers.BrowserProvider(window.ethereum)

  const signer = await provider.getSigner()

  const MGN_token = await buildContract(blockchainId, 'Hyperdust_Token')

  const allowance = await MGN_token.allowance(signer.getAddress(), address)

  if (allowance >= ethers.parseEther('100')) {
    return
  }

  await (await MGN_token.approve(address, ethers.parseEther('9999999999'))).wait()
}

export function toAmount(amount) {
  return toCustomizeAmount(amount, 2)
}

export function toAccountAmount(amount) {
  return toCustomizeAmount(amount, 10)
}

export function toCustomizeAmount(amount, num) {
  if (!amount) {
    return '0.00'
  }

  let formatString = '0,0.' + '0'.repeat(num)
  let str = numeral(amount).format(formatString)

  // If the decimal part is 0, keep up to 2 decimal places
  let floatNum = parseFloat(str.replace(/,/g, ''))
  str = floatNum.toString()

  // Remove trailing zeros in the decimal part
  str = str.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')

  // If the decimal part has only one digit, add one more 0
  if (str.indexOf('.') !== -1 && str.split('.')[1].length < 2) {
    str += '0'
  }

  // If there is no decimal part, add two decimal places
  if (str.indexOf('.') === -1) {
    str += '.00'
  }

  return str
}

export function toLocalTime(dateStr) {
  let beijingTime = moment.tz(dateStr, 'Asia/Shanghai')
  let localTime = beijingTime.clone().tz(moment.tz.guess())

  let localTimeString = localTime.format('YYYY-MM-DD HH:mm:ss')

  return localTimeString
}

export function toServerTime(dateStr) {
  let beijingTime = moment.tz(dateStr, moment.tz.guess())
  let localTime = beijingTime.clone().tz('Asia/Shanghai')

  let localTimeString = localTime.format('YYYY-MM-DD HH:mm:ss')

  return localTimeString
}

export function exceptionHandling(e) {
  console.error('Error details:', e) // Output complete error details

  if (!e.code) {
    // Check for network-related errors
    if (e.message.includes('Failed to fetch') || e.message.includes('Network Error')) {
      ElMessage.error('Network connection failed. Please check your internet connection and try again.')
      return
    } else {
      ElMessage.error(e.message)
      return
    }
  }

  const error = e.info.error
  // RPC error handling
  if (error.code && error.code === 4001) {
    // User rejected the transaction request
    ElMessage.error('Transaction was rejected by user.')
  } else if (error.code && error.code === -32000) {
    // Server rejected the request, possibly due to low gas price
    ElMessage.error('Server rejected the request. Please try again later.')
  } else if (e.reason) {
    // Contract error
    ElMessage.error(`Contract error: ${e.reason}`)
  } else {
    // Other types of errors
    ElMessage.error(e.message || 'An unknown error occurred.')
  }
}

export function compareDates(date1, date2) {
  const format = 'YYYY-MM-DD'
  const d1 = moment(date1, format)
  const d2 = moment(date2, format)

  if (d1.isBefore(d2)) {
    return -1 // Return -1 indicates date1 is before date2
  } else if (d1.isAfter(d2)) {
    return 1 // Return 1 indicates date1 is after date2
  } else {
    return 0 // Return 0 indicates date1 is the same as date2
  }
}

/**
 * Wallet signature related type definitions
 */
export interface WalletSignatureResult {
  address: string
  signature: string
  message: string
}
