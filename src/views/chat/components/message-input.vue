<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Position, ArrowDown } from '@element-plus/icons-vue'
import ImageUpload from '@/components/image/image-upload.vue'
import { ElMessage } from 'element-plus'
import { request } from '@/utils/request'

import worldPng from '@/assets/image/world.png'
import send_1 from '@/assets/send_1.png'
import send_2 from '@/assets/send_2.png'
import browuserPng from '@/assets/image/browuser.png'
import ai_worldPng from '@/assets/image/ai_world.png'

type Message = {
  text: string
  image: string
}

const agentList = ref<any[]>([])

const sids = ref<string[]>([
  '0x3efe0ce7b0741282e4e5b1da44b46991fb1c429060fa0eb245920812cd663766',
  '0xf88c19433a2e058e7801f8b3e509db0aa57f6a66a75b407c1bf843e2be2ac9b0',
  '0x6c7977490c492fb35fd388b0cb006d3b9b8fb9cb6a2657d3f41aa6a4d54562a9',
  '0x045990e6c6dedd212ba480d50e98997e2d8443143e460e1a282837f75dc34893',
  '0x0042968e7ea4ca8b3630ad50c905a0559c058bef0e1213ff70cc2b102b6add59',
  '0x98d9867b15a5bbac3217c7c738ce3c5a1ee433acb21fd87c680119195ae38d51',
  '0x4f61db87f7a7bd15586f9afc64d9b13a85c11af332786f3580ac77083a515054',
])

const selectedAgent = ref('')
const props = defineProps<{
  functionStatus: string
  loading: boolean
}>()

// Send message event
const emit = defineEmits<{
  send: [message: Message]
  search: [message: boolean]
  stop: []
  agentChange: [agentId: string]
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

// Handle keyboard events for multiline input
const handleKeydown = (event: KeyboardEvent | Event) => {
  const keyboardEvent = event as KeyboardEvent
  if (keyboardEvent.key === 'Enter') {
    if (keyboardEvent.shiftKey) {
      // Shift+Enter: Allow new line (default behavior)
      return
    } else {
      // Enter: Send message
      keyboardEvent.preventDefault()
      sendMessage()
    }
  }
}

async function getAgentList() {
  const response = await request({
    url: '/mgn/agent/list',
    method: 'GET',
    params: {
      pageNo: 1,
      pageSize: 10,
      sid: sids.value.join(','),
    },
    headers: {
      'X-Access-Token': localStorage.getItem('X-Token') || '',
    },
  })
  agentList.value = (response as any).result.records

  console.info('agentList.value', agentList.value)
}

const selectAgentObject = computed(() => {
  // 如果是固定的agent，返回对应的信息
  if (selectedAgent.value === 'ai_world') {
    return { nickName: 'AI World' }
  }
  if (selectedAgent.value === 'browuser') {
    return { nickName: 'Browser Use' }
  }
  // 否则从agentList中查找
  const agent = agentList.value.find((agent) => agent.id === selectedAgent.value)

  emit('agentChange', agent?.id)

  return agent
})

const sendMessage = () => {
  // 如果当前处于加载状态，执行停止操作
  if (props.loading) {
    emit('stop')
    return
  }

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

// 选择agent
const selectAgent = (agentId: string) => {
  selectedAgent.value = agentId
  emit('agentChange', agentId)
}

onMounted(async () => {
  await getAgentList()
})
</script>

<template>
  <div class="message-input">
    <div class="input-wrapper">
      <div class="input-container">
        <!-- 参考截图的输入框设计 -->
        <div class="input-field">
          <div class="input-content">
            <!-- 可输入的文本框 -->
            <el-input v-model="message.text" type="textarea" class="message-input-field" @keydown="handleKeydown" @focus="handleFocus" @blur="handleBlur" :placeholder="'Message ' + (selectAgentObject?.nickName || '')" :autosize="{ minRows: 1, maxRows: 6 }" resize="none"></el-input>
            <!-- Agent头像列表和Send按钮 -->
            <div class="input-bottom-row">
              <div class="agent-avatars">
                <div class="avatar-list">
                  <button class="avatar-btn" :class="{ active: selectedAgent === 'ai_world' }" title="AI world" @click="selectAgent('ai_world')">
                    <div class="avatar-icon" :style="{ backgroundColor: ai_worldPng }">
                      <span class="icon-text">
                        <el-avatar :size="48" :src="ai_worldPng" fit="contain" />
                      </span>
                    </div>
                  </button>

                  <button class="avatar-btn" :class="{ active: selectedAgent === 'browuser' }" title="Browser use" @click="selectAgent('browuser')">
                    <div class="avatar-icon" :style="{ backgroundColor: browuserPng }">
                      <span class="icon-text">
                        <el-avatar :size="48" :src="browuserPng" fit="contain" />
                      </span>
                    </div>
                  </button>

                  <button v-for="agent in agentList" :key="agent.id" class="avatar-btn" :class="{ active: selectedAgent === agent.id }" @click="selectAgent(agent.id)" :title="agent.name">
                    <div class="avatar-icon" :style="{ backgroundColor: agent.color }">
                      <span class="icon-text">
                        <el-avatar :size="48" :src="agent.avatar" fit="contain" />
                      </span>
                    </div>
                  </button>
                </div>
                <div class="separator"></div>
              </div>
              <button @click="sendMessage" :disabled="!props.loading && !message.text.trim()">
                <img v-if="!props.loading && !message.text.trim()" class="send-icon" style="width: 50px; height: auto" :src="send_2" alt="Send" />
                <span v-else-if="!props.loading && message.text.trim()">
                  <img class="send-icon" style="width: 50px; height: auto" :src="send_1" alt="Send" />
                </span>
              </button>

              <button v-if="props.loading" @click="sendMessage" class="stop-btn">
                <span> Stop </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="disclaimer-text">MOSS can make mistakes. Please monitor its work</div>
  </div>
</template>

<style lang="scss" scoped>
.message-input {
  padding: 0;
  background-color: transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 100%;
  height: 100%;
  min-height: fit-content;

  .input-wrapper {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input-container {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input-field {
    position: relative;
    width: 100%;
    background-color: #f9fafb;
    border-radius: 50px;
    padding: 24px;
    box-shadow: none;
    transition: all 0.2s ease;

    &:hover {
      border-color: #d1d5db;
    }

    &:focus-within {
      border-color: #e5e7eb;
      box-shadow: none;
    }
  }

  .input-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .input-bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .message-input-field {
    // 全局重置所有可能的边框样式
    :deep(*) {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }

    :deep(.el-textarea__wrapper) {
      background-color: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.5;
      min-height: 40px;
      outline: none !important;
    }

    :deep(.el-textarea__inner) {
      background-color: transparent !important;
      border: none !important;
      color: #374151;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.5;
      padding: 0 !important;
      resize: none !important;
      min-height: 40px !important;
      outline: none !important;

      &::placeholder {
        color: #9ca3af;
      }

      &:focus {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
      }

      &:blur {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
      }
    }

    :deep(.el-textarea) {
      border: none !important;
      outline: none !important;
    }

    // 覆盖所有可能的状态
    :deep(.el-textarea__wrapper):hover,
    :deep(.el-textarea__wrapper.is-focus),
    :deep(.el-textarea__wrapper.is-disabled),
    :deep(.el-textarea__wrapper.is-error),
    :deep(.el-textarea__wrapper:not(.is-focus)),
    :deep(.el-textarea__wrapper:not(.is-disabled)),
    :deep(.el-textarea__wrapper:not(.is-error)) {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }

    // 确保失焦状态
    :deep(.el-textarea__wrapper:not(.is-focus)) {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }

    // 覆盖可能的伪元素
    :deep(.el-textarea__wrapper::before),
    :deep(.el-textarea__wrapper::after),
    :deep(.el-textarea__inner::before),
    :deep(.el-textarea__inner::after) {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
  }

  .agent-avatars {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar-list {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar-btn {
    position: relative;
    width: 56px;
    height: 56px;
    border: none;
    border-radius: 50%;
    background-color: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      transform: scale(1.05);
    }

    &.active {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .avatar-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #000000;
      font-weight: bold;
      line-height: 1;
      overflow: hidden;

      .icon-text {
        display: block;
        font-size: 12px;
        line-height: 1;
        color: #000000;
        font-weight: bold;
        text-align: center;
      }
    }
  }

  .separator {
    width: 2px;
    height: 40px;
    background-color: #000000;
    margin: 0 0 0 10px;
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
    justify-content: center;
    gap: 4px;
    padding: 6px 10px;
    background-color: #f3f4f6;
    border: none;
    border-radius: 6px;
    color: #374151;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 110px;
    height: 32px;
    box-sizing: border-box;
    flex-shrink: 0;

    &:hover {
      background-color: #e5e7eb;
    }

    .el-icon {
      font-size: 14px;
    }

    .control-btn-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      flex-shrink: 0;
      display: block;
    }

    span {
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
      flex-shrink: 0;
    }
  }

  // 确保两个按钮样式完全一致
  .browser-btn,
  .ai-world-btn {
    background-color: #f3f4f6;

    &:hover {
      background-color: #e5e7eb;
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
    justify-content: center;
    width: 40px;
    height: 40px;
    background-color: #000000;
    border: none;
    border-radius: 50%;
    color: #ffffff;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;

    &:hover:not(:disabled) {
      background-color: #333333;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      background-color: #9ca3af;
      color: #ffffff;
    }

    .send-icon {
      width: 10px;
      height: 10px;
      object-fit: contain;
    }
  }

  .stop-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background-color: #000000;
    border: none;
    border-radius: 20px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: #333333;
    }

    span {
      color: #ffffff;
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
    display: flex;
    align-items: center;
    justify-content: center;

    .input-wrapper {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .input-container {
      position: relative;
      z-index: 1001;
    }

    .agent-avatars {
      flex-wrap: wrap;
      gap: 8px;
    }

    .avatar-list {
      gap: 8px;
    }

    .avatar-btn {
      width: 36px;
      height: 36px;

      .avatar-icon {
        width: 28px;
        height: 28px;
        font-size: 14px;

        .icon-text {
          font-size: 11px;
        }
      }
    }

    .control-btn {
      padding: 6px 10px;
      font-size: 13px;
    }

    .send-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      font-size: 14px;

      .send-icon {
        width: 18px;
        height: 18px;
        object-fit: contain;
      }
    }
  }

  .disclaimer-text {
    text-align: center;
    margin-top: 20px;
    color: #6b7280;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    opacity: 0.8;
    white-space: pre-line;
    word-break: break-word;
    display: block;
    width: 100%;
    align-self: flex-end;
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
