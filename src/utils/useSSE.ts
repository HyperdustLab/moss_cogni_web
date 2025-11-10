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

  const makePostRequest = async (url: string, body?: Record<string, any>, customHeaders?: Record<string, string>) => {
    if (isRequesting.value) {
      throw new Error('Request in progress, please wait')
    }

    // Check wallet connection status, auto-connect if not connected
    if (!wallet.isConnected.value || !wallet.signer.value) {
      try {
        await connectWallet()
      } catch (error: any) {
        const errorMessage = error.message || 'Wallet connection failed'
        throw new Error(`Wallet connection failed: ${errorMessage}`)
      }
    }

    isRequesting.value = true
    postError.value = null
    postResponse.value = null

    try {
      // Step 1: Use axios without payment interceptor to get payment requirements (402 response)
      let paymentHeader: string

      try {
        // Use plain axios instance (without payment interceptor) to get 402 response
        const baseHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        // Merge custom headers if provided
        if (customHeaders) {
          Object.assign(baseHeaders, customHeaders)
        }

        const baseClient = axios.create({
          headers: baseHeaders,
        })

        const response = await baseClient.post(
          url,
          body || {}, // Send parameters as JSON body
          {
            validateStatus: (status) => status === 402 || status === 200, // Accept 402 and 200
          }
        )

        if (response.status === 402) {
          // Parse payment requirements
          const { x402Version, accepts } = response.data

          if (!x402Version || !accepts || !Array.isArray(accepts)) {
            throw new Error('Invalid 402 response format')
          }

          // Parse payment requirements
          const parsedPaymentRequirements = accepts.map((x) => PaymentRequirementsSchema.parse(x))

          // Select payment requirements (using base-sepolia network)
          const selectedPaymentRequirements = selectPaymentRequirements(parsedPaymentRequirements, 'base-sepolia', 'exact')

          // Create payment header (ensure signer exists)
          if (!wallet.signer.value) {
            throw new Error('Wallet signer not initialized')
          }
          paymentHeader = await createPaymentHeader(wallet.signer.value, x402Version, selectedPaymentRequirements)
        } else if (response.status === 200) {
          // If directly returns 200, payment not required
          paymentHeader = '' // Empty payment header
        } else {
          throw new Error(`Unexpected response status: ${response.status}`)
        }
      } catch (error: any) {
        if (error.response?.status === 402) {
          // If 402 is caught, try to handle it
          const { x402Version, accepts } = error.response.data

          if (!x402Version || !accepts || !Array.isArray(accepts)) {
            throw new Error('Invalid 402 response format')
          }

          const parsedPaymentRequirements = accepts.map((x) => PaymentRequirementsSchema.parse(x))
          const selectedPaymentRequirements = selectPaymentRequirements(parsedPaymentRequirements, 'base-sepolia', 'exact')

          // Ensure signer exists
          if (!wallet.signer.value) {
            throw new Error('Wallet signer not initialized')
          }
          paymentHeader = await createPaymentHeader(wallet.signer.value, x402Version, selectedPaymentRequirements)
        } else {
          throw error
        }
      }

      // Step 2: Use POST request with payment header
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Merge custom headers if provided
      if (customHeaders) {
        Object.assign(headers, customHeaders)
      }

      // If payment header exists, add to request headers
      if (paymentHeader) {
        headers['X-PAYMENT'] = paymentHeader
      }

      const response = await axios.post(url, body || {}, {
        headers,
      })

      // Success response
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

      // Handle error response
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
