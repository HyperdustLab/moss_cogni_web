<script lang="ts" setup>
import { Picture, Warning, Share, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
// import TextLoading from './text-loading.vue'
import MarkdownMessage from './markdown-message.vue'
import type { AiMessage } from '../store/chat-store'
import ThoughtChain from './ThoughtChain.vue'

const BASE_URL = import.meta.env.VITE_API_HYPERAGI_API
const downloading = ref(false)
const showThinkingList = ref(false)

const props = defineProps<{
  message: AiMessage
  defAgentAvatar: string
  isCurrentMessage?: boolean
}>()

const userAvatar = 'https://s3.hyperdust.io/upload/20250411/67f8cbcbe4b0bc355fbb060e.png'

const agentAvatar = 'https://s3.hyperdust.io/upload/20250416/67ff421d5bce8066f1e25655.jpg'

const isUser = computed(() => props.message.type === 'USER')
const isError = computed(() => props.message.type === 'ERROR' || props.message.isError)
const hasThinkingList = computed(() => props.message.thinkingList && props.message.thinkingList.length > 0)
const hasPendingThinking = computed(() => hasThinkingList.value && props.message.thinkingList!.some((item) => item.status === 'pending'))
const isHistoryMessage = computed(() => props.message.type === 'ASSISTANT' && hasThinkingList.value)
const isCurrentThinkingMessage = computed(() => props.isCurrentMessage && hasPendingThinking.value)

const avatar = computed(() => {
  return isUser.value ? userAvatar : props.defAgentAvatar || agentAvatar
})

const images = computed(() => {
  if (!props.message.medias) return []
  return props.message.medias.filter((media) => media.type === 'image').map((media) => media.data)
})

const handleDownload = async (imageUrl: string) => {
  try {
    downloading.value = true
    const objectId = imageUrl.replace('https://s3.hyperdust.io/', '')

    // 获取图片数据
    const response = await fetch(BASE_URL + '/sys/common/download?objectId=' + objectId)
    const blob = await response.blob()

    // 创建下载链接
    const link = document.createElement('a')
    const url = window.URL.createObjectURL(blob)
    link.href = url

    // 设置下载文件名
    const fileName = imageUrl.split('/').pop() || 'image.png'
    link.download = fileName

    // 添加到文档中并触发下载
    document.body.appendChild(link)
    link.click()

    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="message-row" :class="{ 'message-row-user': isUser, 'message-row-error': isError }">
    <div class="avatar">
      <el-avatar :size="40" :src="(message as any).avatar || avatar" />
    </div>
    <div class="message-content" :class="{ 'error-content': isError }">
      <!-- 流程列表展开/隐藏按钮 - 仅对历史消息显示 -->
      <div v-if="isHistoryMessage" class="thinking-toggle" @click="showThinkingList = !showThinkingList">
        <el-button size="small" type="text" class="toggle-btn">
          <el-icon>
            <ArrowDown v-if="!showThinkingList" />
            <ArrowUp v-else />
          </el-icon>
          <span>{{ showThinkingList ? 'Hide Steps' : 'Show Steps' }}</span>
        </el-button>
      </div>

      <!-- 流程列表 - 历史消息默认隐藏，当前消息直接显示，正在进行的推理流程默认展开 -->
      <ThoughtChain v-if="hasThinkingList && (!isHistoryMessage || showThinkingList || isCurrentThinkingMessage)" :items="message.thinkingList || []" />

      <div class="message-text mt-5" :class="{ 'error-text': isError }">
        <MarkdownMessage v-if="!isError" :message="message.textContent || (message as any).text || (message as any).content || ''" />
        <div v-else v-html="`<span style='color: #dc2626; font-weight: 500; white-space: pre-line;'>${message.textContent || (message as any).text || (message as any).content || ''}</span>`"></div>
      </div>

      <div class="image-container" v-if="images && images.length > 0">
        <div v-for="(image, index) in images" :key="index" class="image-wrapper">
          <el-image class="image" fit="cover" style="width: 50%; height: 50%" :preview-src-list="images" :src="image">
            <template #placeholder>
              <div class="image-placeholder">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
            <template #error>
              <div class="image-error">
                <el-icon><Warning /></el-icon>
              </div>
            </template>
          </el-image>
          <div class="image-actions">
            <el-button size="small" type="primary" :loading="downloading" @click="handleDownload(image)">
              <template #icon>
                <el-icon><Share /></el-icon>
              </template>
              <span>Download & Share</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-row {
  display: flex;
  margin-bottom: 16px;
  padding: 0 12px;

  &.message-row-user {
    flex-direction: row-reverse;
  }

  .avatar {
    margin: 0 8px;
  }

  .message-content {
    max-width: 85%;
    background-color: #f3f4f6;
    padding: 8px 12px;
    border-radius: 8px;
    color: black;
    word-break: break-word;

    &.error-content {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
    }
  }

  .message-text {
    &.error-text {
      color: #dc2626 !important;
      font-weight: 500 !important;

      // 确保所有子元素也使用红色
      * {
        color: #dc2626 !important;
      }
    }
  }

  .thinking-toggle {
    margin-bottom: 8px;

    .toggle-btn {
      color: #666;
      font-size: 12px;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 4px;

      &:hover {
        color: #409eff;
        background-color: rgba(64, 158, 255, 0.1);
      }
    }
  }
}

.image-container {
  position: relative;
  display: inline-block;
  margin-top: 8px;
  width: 100%;
}

.image-wrapper {
  position: relative;
  display: inline-block;
  margin-top: 8px;
  width: 100%;
}

.image-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 1;
  display: flex;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px;
  border-radius: 4px;

  .el-button {
    background-color: transparent;
    border: none;
    color: black;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 4px 8px;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }
}

// 响应式样式
@media screen and (max-width: 768px) {
  .message-row {
    margin-bottom: 12px;
    padding: 0 8px;

    .avatar {
      margin: 0 6px;
    }

    .message-content {
      max-width: 90%;
      padding: 6px 10px;
    }
  }

  .el-image {
    width: 100% !important;
    height: auto !important;
  }

  .image-actions {
    .el-button {
      font-size: 11px;
      padding: 3px 6px;
    }
  }
}
</style>
