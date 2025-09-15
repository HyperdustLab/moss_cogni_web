<script lang="ts" setup>
import { CircleClose } from '@element-plus/icons-vue'
import type { AiSession } from '@/views/chat/store/chat-store'

// Entity: Session information for display
const prop = defineProps<{ active: boolean; session: AiSession }>()
// Define delete event that emits the deleted session to parent
const emit = defineEmits<{
  delete: [session: AiSession]
}>()
// When hovering over session, show delete icon. Click icon to emit delete event
const handleDeleteSession = () => {
  emit('delete', prop.session)
}
</script>

<template>
  <!-- 参考截图设计，简化session item样式 -->
  <div :class="['session-item', active ? 'active' : '']">
    <!-- 简化的session显示，只显示名称，类似截图中的简短消息 -->
    <div class="session-content">
      <div class="name">{{ session.name || 'New Chat' }}</div>
      <div v-if="active" class="delete-btn" @click="handleDeleteSession">
        <el-icon :size="14">
          <CircleClose />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.session-item {
  /* 参考截图设计，简化样式 */
  padding: 8px 12px;
  background-color: transparent;
  color: #000000;
  border-radius: 6px;
  width: 100%;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  margin-bottom: 2px;

  .session-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .name {
    font-size: 14px;
    font-weight: 400;
    color: rgba(0, 0, 0, 0.8);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delete-btn {
    opacity: 0;
    color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 2px;
    border-radius: 4px;

    &:hover {
      color: #ef4444;
      background-color: rgba(239, 68, 68, 0.1);
    }
  }

  /* 选中状态 */
  &.active {
    background-color: #f3f4f6;
    border-left: 3px solid #3b82f6;

    .name {
      color: #1f2937;
      font-weight: 500;
    }

    .delete-btn {
      opacity: 1;
    }
  }

  /* 悬停状态 */
  &:hover:not(.active) {
    background-color: #f9fafb;

    .delete-btn {
      opacity: 0.7;
    }
  }
}
</style>
