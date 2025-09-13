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
  <!-- Add active class if session is active -->
  <div :class="['session-item', active ? 'active' : '']">
    <!-- Session name -->
    <div class="name">{{ session.name }}</div>
    <!-- Message count and last modified time -->
    <div class="count-time">
      <div class="count">{{ session.messageCount }} messages</div>
      <div class="time mr-50">{{ session.createdTime }}</div>
    </div>
    <!-- Show overlay on hover -->
    <div class="mask"></div>
    <!-- Show delete button on hover -->
    <div class="btn-wrapper">
      <el-icon :size="15" class="close" @click="handleDeleteSession">
        <CircleClose />
      </el-icon>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.session-item {
  /* Add padding to prevent content from touching edges */
  padding: 12px;
  background-color: #ffffff;
  color: #000000;
  /* Add border radius for rounded corners */
  border-radius: 10px;
  /* Fixed width */
  width: 250px;
  /* Change cursor on hover to indicate clickable. Drag feature to be added later */
  cursor: grab;
  /* Relative parent for absolute child positioning */
  position: relative;
  /* Hide overflow for mask animation */
  overflow: visible;

  .name {
    /* Larger font for session name */
    font-size: 14px;
    /* Bold for emphasis */
    font-weight: 700;
    width: 200px;
    /* Lighter color after bold */
    color: rgba(0, 0, 0, 0.8);
  }

  .count-time {
    /* Add spacing */
    margin-top: 10px;
    /* Smaller font than session name (14px) */
    font-size: 10px;
    color: rgba(0, 0, 0, 0.5);
    /* Horizontal layout */
    display: flex;
    /* Space between count and time */
    justify-content: space-between;
  }

  /* Add blue border when active */
  &.active {
    /* Add transition */
    transition: all 0.12s linear;
    background-color: #f3f4f6;
  }

  /* Styles triggered on hover */
  &:hover {
    /* Mask slides in from left, becomes opaque */
    .mask {
      opacity: 1;
      left: 0;
    }

    .btn-wrapper {
      /* Indicate button is clickable */
      &:hover {
        cursor: pointer;
      }

      /* Button slides in from right, becomes opaque */
      opacity: 1;
      right: 20px;
    }

    background-color: #f3f4f6;
  }

  .mask {
    /* Transition animation */
    transition: all 0.2s ease-out;
    /* Absolute position relative to parent */
    position: absolute;
    background-color: rgba(0, 0, 0, 0.05);
    /* Full parent width */
    width: 100%;
    /* Full parent height */
    height: 100%;
    /* Align to parent top */
    top: 0;
    /* Start one parent width to the left */
    left: -100%;
    /* Start transparent */
    opacity: 0;
  }

  /* Delete button styling similar to mask */
  .btn-wrapper {
    color: rgba(0, 0, 0, 0.5);
    transition: all 0.2s ease-out;
    position: absolute;
    top: 10px;
    right: -20px;
    z-index: 10;
    opacity: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 50%;

    &:hover {
      color: black;
      background-color: rgba(0, 0, 0, 0.1);
    }

    .edit {
      margin-right: 5px;
    }
  }
}
</style>
