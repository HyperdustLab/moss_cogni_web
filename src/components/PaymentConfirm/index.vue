<template>
  <el-dialog v-model="visible" title="Payment Confirmation" width="480px" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false" class="payment-confirm-dialog">
    <div class="payment-content">
      <div class="payment-info">
        <div class="info-row">
          <span class="info-label">Network</span>
          <span class="info-value network-badge">{{ paymentInfo.network }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Currency</span>
          <div class="info-value currency-value">
            <span class="currency-symbol">{{ paymentInfo.currency || 'ETH' }}</span>
          </div>
        </div>
        <div class="info-row amount-row">
          <span class="info-label">Amount</span>
          <div class="amount-container">
            <span class="info-value amount">{{ parsedAmount }}</span>
            <span class="amount-currency">{{ parsedCurrency }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel" :disabled="isProcessing" size="default">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="isProcessing" size="default">Confirm Payment</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface PaymentInfo {
  network: string
  currency: string
  amount: string
  decimals?: number // Token decimals, default 18 for ETH
}

const props = defineProps<{
  modelValue: boolean
  paymentInfo: PaymentInfo
  isProcessing?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const visible = ref(false)

watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal
  },
  { immediate: true }
)

watch(visible, (newVal) => {
  if (!newVal) {
    emit('update:modelValue', false)
  }
})

// Check if a string is an Ethereum address (starts with 0x and has 42 characters)
const isAddress = (str: string): boolean => {
  if (!str) return false
  return str.startsWith('0x') && str.length === 42 && /^0x[a-fA-F0-9]{40}$/.test(str)
}

// Format address to show first 6 and last 4 characters
const formatAddress = (address: string): string => {
  if (!address) return ''
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Convert token amount from smallest unit to human-readable format based on decimals
// e.g., WEI to ETH (decimals=18), or smallest unit to token (decimals=6 for USDC)
const convertFromSmallestUnit = (value: string | number, decimals: number = 18): string => {
  try {
    // Convert to string and remove any non-numeric characters
    const valueStr = String(value).replace(/[^\d]/g, '')
    if (!valueStr || valueStr === '0') return '0'

    // Use BigInt for precision with large numbers
    const valueBigInt = BigInt(valueStr)

    // Calculate divisor based on decimals (10^decimals)
    const divisorStr = '1' + '0'.repeat(decimals)
    const divisor = BigInt(divisorStr)

    // Calculate quotient and remainder for precise division
    const quotient = valueBigInt / divisor
    const remainder = valueBigInt % divisor

    // Convert to decimal string
    const quotientStr = quotient.toString()
    const remainderStr = remainder.toString().padStart(decimals, '0')

    // Remove trailing zeros from remainder
    const remainderTrimmed = remainderStr.replace(/0+$/, '')

    // Combine quotient and remainder
    let tokenValueStr = quotientStr
    if (remainderTrimmed) {
      tokenValueStr += '.' + remainderTrimmed
    }

    // Convert to number for formatting (with up to decimals decimal places, but max 6 for display)
    const tokenValue = parseFloat(tokenValueStr)

    // Format with appropriate decimal places (show up to decimals, but cap at 6 for readability)
    const maxDecimals = Math.min(decimals, 6)
    return tokenValue.toLocaleString('en-US', {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: 0,
    })
  } catch (error) {
    console.error('Error converting from smallest unit:', error)
    return '0'
  }
}

// Check if a number string looks like smallest unit (very large number, typically >= 10^(decimals-3))
const isLikelySmallestUnit = (numStr: string, decimals: number = 18): boolean => {
  const num = parseFloat(numStr.replace(/[^\d.]/g, ''))
  // If the number is >= 10^(decimals-3), it's likely in smallest unit
  const threshold = Math.pow(10, Math.max(decimals - 3, 12))
  return !isNaN(num) && num >= threshold
}

// Parse amount string and convert from smallest unit to human-readable format based on decimals
// Amount is now stored as raw number string (e.g., "1000" for 1000 smallest units)
const parsedAmount = computed(() => {
  const amountStr = props.paymentInfo?.amount || ''
  const decimals = props.paymentInfo?.decimals ?? 18

  if (!amountStr || amountStr.trim() === '') return '0'

  // Amount is now a raw number string, extract the numeric part
  const trimmed = amountStr.trim()
  // Remove any non-numeric characters (shouldn't be needed, but keep for safety)
  const cleanNumStr = trimmed.replace(/[^\d]/g, '')

  if (!cleanNumStr || cleanNumStr === '0') return '0'

  // Always convert from smallest unit to human-readable format using decimals
  // This handles cases like:
  // - "1000" with decimals=6 → "0.001" (USDC)
  // - "1000000000000000000" with decimals=18 → "1" (ETH)
  return convertFromSmallestUnit(cleanNumStr, decimals)
})

// Parse currency from currency field (now contains token name from extra.name)
const parsedCurrency = computed(() => {
  const currencyStr = props.paymentInfo?.currency || ''

  // Currency now contains the token name (e.g., "USDC", "ETH")
  // If it's empty or invalid, default to ETH
  if (!currencyStr) {
    return 'ETH'
  }

  // If it's an address (shouldn't happen now, but keep as fallback), show ETH
  if (isAddress(currencyStr)) {
    return 'ETH'
  }

  // Return the currency name as is (e.g., "USDC", "ETH")
  return currencyStr
})

// Copy to clipboard
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('Address copied to clipboard')
  } catch (err) {
    ElMessage.error('Failed to copy address')
  }
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}
</script>

<style lang="scss" scoped>
.payment-confirm-dialog {
  :deep(.el-dialog__header) {
    padding: 24px 28px 20px;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%);
  }

  :deep(.el-dialog__title) {
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    letter-spacing: -0.02em;
  }

  :deep(.el-dialog__body) {
    padding: 28px;
    background-color: #ffffff;
  }

  :deep(.el-dialog__footer) {
    padding: 20px 28px 24px;
    border-top: 1px solid #e5e7eb;
    background-color: #fafbfc;
  }

  :deep(.el-dialog) {
    border-radius: 12px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
}

.payment-content {
  .payment-info {
    display: flex;
    flex-direction: column;
    gap: 0;

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 0;
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: #fafbfc;
        margin: 0 -12px;
        padding-left: 12px;
        padding-right: 12px;
        border-radius: 8px;
      }

      &:last-child {
        border-bottom: none;
      }

      &.amount-row {
        align-items: flex-start;
        padding-top: 20px;
        padding-bottom: 20px;
      }

      .info-label {
        font-size: 14px;
        color: #6b7280;
        font-weight: 500;
        min-width: 80px;
        flex-shrink: 0;
        letter-spacing: 0.01em;
      }

      .info-value {
        font-size: 14px;
        color: #111827;
        font-weight: 600;
        text-align: right;
        word-break: break-all;
        flex: 1;
        margin-left: 16px;

        &.network-badge {
          display: inline-block;
          padding: 4px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          text-transform: capitalize;
          letter-spacing: 0.02em;
        }

        &.amount {
          display: block;
          color: #2563eb;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }
      }

      .currency-value {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-left: 16px;

        .currency-address {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          color: #374151;
          background-color: #f3f4f6;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .currency-symbol {
          font-size: 14px;
          color: #111827;
          font-weight: 600;
          padding: 4px 12px;
          background-color: #eff6ff;
          border-radius: 6px;
          border: 1px solid #dbeafe;
        }

        .copy-btn {
          padding: 4px;
          min-height: auto;
          opacity: 0.7;
          transition: opacity 0.2s ease;

          &:hover {
            opacity: 1;
          }

          :deep(.el-icon) {
            font-size: 14px;
          }
        }
      }

      .amount-container {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        flex: 1;
        margin-left: 16px;

        .amount-currency {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          color: #6b7280;
          background-color: #f9fafb;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  :deep(.el-button) {
    padding: 10px 24px;
    font-size: 14px;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s ease;
    min-width: 120px;

    &:not(.el-button--primary) {
      background-color: #ffffff;
      border-color: #d1d5db;
      color: #374151;

      &:hover {
        background-color: #f9fafb;
        border-color: #9ca3af;
        color: #111827;
      }
    }

    &.el-button--primary {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border-color: #2563eb;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);

      &:hover {
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        border-color: #1d4ed8;
        box-shadow: 0 6px 8px -1px rgba(37, 99, 235, 0.3);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}
</style>
