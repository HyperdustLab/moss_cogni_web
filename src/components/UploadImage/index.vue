<!-- @format -->

<template>
  <div>
    <el-upload v-if="limit === 1" class="avatar-uploader" :show-file-list="false" :action="actionComputed" :headers="headers" :on-success="handleAvatarSuccess">
      <img v-if="image" :src="image" class="avatar" />
      <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
    </el-upload>

    <el-upload v-else class="avatar-uploader" :limit="4" v-model:file-list="fileList" :action="action" list-type="picture-card" :headers="headers" :on-success="handleAvatarSuccess">
      <el-icon><Plus /></el-icon>
    </el-upload>
  </div>
</template>

<script lang="ts" setup>
import { ref, onBeforeMount, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  limit: { type: Number, required: true, default: 1 },
  action: { type: String, required: false, default: '/sys/common/upload' },
})

const fileList = ref<UploadUserFile[]>([])

onBeforeMount(() => {
  if (props.modelValue) {
    const array = props.modelValue.split(',')

    fileList.value = array.map((i) => {
      return { name: i, url: i }
    })
  }
})

const image = ref(props.modelValue)

const emit = defineEmits(['update:modelValue'])

const BASE_URL = import.meta.env.VITE_API_PREFIX

const actionComputed = computed(() => {
  return BASE_URL + props.action || '/sys/common/upload'
})

const headers = {
  'X-Access-Token': localStorage.getItem('X-Token') || '',
}

import type { UploadProps, UploadUserFile } from 'element-plus'

const handleAvatarSuccess: UploadProps['onSuccess'] = (response, uploadFile, uploadFiles) => {
  if (response.code !== 0 && response.code !== 200) {
    ElMessage.error(response.message)
    return
  }
  console.info(response.result)

  image.value = response.result

  console.info(uploadFiles)

  const fileURLList = uploadFiles.map((item) => item.response.message)

  const files = fileURLList.join(',')

  emit('update:modelValue', files)
}
</script>

<style scoped>
.avatar-uploader .avatar {
  width: 178px;
  height: 178px;
  display: block;
}
</style>

<style>
.avatar-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.el-icon.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
}
</style>
