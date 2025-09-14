<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { Position, ArrowDown } from '@element-plus/icons-vue'
import ImageUpload from '@/components/image/image-upload.vue'
import { ElMessage } from 'element-plus'
type Message = {
  text: string
  image: string
}
const props = defineProps<{
  functionStatus: string
  loading: boolean
}>()

// Send message event
const emit = defineEmits<{
  send: [message: Message]
  search: [message: boolean]
}>()
// Message in input box
const message = ref<Message>({ text: '', image: '' })

// Handle input focus and blur
const handleFocus = () => {
  // Remove the fixed positioning that prevents scrolling
  // Only prevent overflow on desktop if needed
  if (window.innerWidth > 768) {
    document.body.style.overflow = 'hidden'
  }
}

const handleBlur = () => {
  // Restore normal scrolling
  document.body.style.overflow = ''
  document.body.style.position = ''
}

const sendMessage = () => {
  // 去除首尾空格并检查实际内容
  const trimmedText = message.value.text?.trim()
  if (!trimmedText) {
    ElMessage.warning('Please enter a message')
    return
  }
  emit('send', { ...message.value, text: trimmedText })
  // Clear after sending
  message.value = { text: '', image: '' }
}

const buttonActive = reactive({
  search: false,
  upload: false,
})

const searchToggleButton = () => {
  buttonActive.search = !buttonActive.search
  emit('search', buttonActive.search)
}

const uploadToggleButton = () => {
  buttonActive.upload = !buttonActive.upload
}
</script>

<template>
  <div class="message-input">
    <div class="input-wrapper">
      <div class="input-container">
        <!-- 参考截图的输入框设计 -->
        <div class="input-field">
          <div class="input-content">
            <!-- 可输入的文本框 -->
            <el-input v-model="message.text" class="message-input-field" @keydown.enter.prevent="sendMessage" @focus="handleFocus" @blur="handleBlur" placeholder="Message Dancer"></el-input>
            <div class="input-controls">
              <div class="agent-dropdown">
                <span class="dropdown-label">Agent</span>
                <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
              </div>
              <div class="control-buttons">
                <button class="control-btn browser-btn">
                  <el-icon><Position /></el-icon>
                  <span>Browser Use</span>
                </button>
                <button class="control-btn ai-world-btn">
                  <div class="ai-world-icon">
                    <div class="dot"></div>
                    <div class="dot"></div>
                  </div>
                  <span>AI World</span>
                </button>
                <button class="send-btn" @click="sendMessage" :disabled="props.loading">
                  <el-icon v-if="!props.loading"><Position /></el-icon>
                  <span v-if="props.loading">Sending...</span>
                  <span v-else>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-input {
  padding: 20px;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;

  .input-wrapper {
    width: 100%;
  }

  .input-container {
    position: relative;
    width: 100%;
  }

  .input-field {
    position: relative;
    width: 100%;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    box-shadow: none;
    transition: all 0.2s ease;

    &:hover {
      border-color: #d1d5db;
    }

    &:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }

  .input-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message-input-field {
    :deep(.el-input__wrapper) {
      background-color: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.5;
    }

    :deep(.el-input__inner) {
      background-color: transparent !important;
      border: none !important;
      color: #374151;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.5;
      padding: 0 !important;

      &::placeholder {
        color: #9ca3af;
      }

      &:focus {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
      }
    }

    :deep(.el-input) {
      border: none !important;
    }

    :deep(.el-input__wrapper):hover {
      border: none !important;
      box-shadow: none !important;
    }

    :deep(.el-input__wrapper.is-focus) {
      border: none !important;
      box-shadow: none !important;
    }
  }

  .input-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .agent-dropdown {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }

    .dropdown-label {
      color: #374151;
      font-size: 13px;
      font-weight: 500;
    }

    .dropdown-icon {
      color: #6b7280;
      font-size: 10px;
    }
  }

  .control-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .control-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #374151;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }

    .el-icon {
      font-size: 14px;
    }
  }

  .ai-world-icon {
    display: flex;
    gap: 2px;

    .dot {
      width: 4px;
      height: 4px;
      background-color: #6b7280;
      border-radius: 50%;
    }
  }

  .send-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background-color: #3b82f6;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background-color: #2563eb;
      border-color: #2563eb;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .el-icon {
      font-size: 14px;
    }
  }

  @media screen and (max-width: 768px) {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    margin-bottom: 0;
    z-index: 1000;
    border-radius: 0;
    padding: 10px;
    height: auto;
    -webkit-overflow-scrolling: touch;
    overflow-y: auto;

    .input-container {
      position: relative;
      z-index: 1001;
    }

    .input-controls {
      flex-wrap: wrap;
      gap: 8px;
    }

    .control-btn {
      padding: 6px 10px;
      font-size: 13px;
    }

    .send-btn {
      padding: 6px 12px;
      font-size: 13px;
    }
  }
}

.button-wrapper {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 20px;

  .image {
    margin-right: 20px;
  }
}
</style>
