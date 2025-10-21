<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import ImageUpload from '@/components/image/image-upload.vue'

// 定义表单数据类型
interface CastAgentForm {
  avatar: string
  nickName: string
  personalization: string
  welcomeMessage: string
}

// 定义事件
const emit = defineEmits<{
  submit: [formData: CastAgentForm, messageId: string]
  cancel: [messageId: string]
}>()

// 定义props
const props = defineProps<{
  messageId: string
}>()

// 表单数据
const formData = reactive<CastAgentForm>({
  avatar: '',
  nickName: '',
  personalization: '',
  welcomeMessage: '',
})

// 表单验证规则
const rules = {
  nickName: [
    { required: true, message: 'Please enter Agent nickname', trigger: 'blur' },
    { min: 2, max: 20, message: 'Nickname should be 2-20 characters', trigger: 'blur' },
  ],
  personalization: [
    { required: true, message: 'Please enter personalization description', trigger: 'blur' },
    { min: 10, max: 200, message: 'Personalization should be 10-200 characters', trigger: 'blur' },
  ],
  welcomeMessage: [
    { required: true, message: 'Please enter welcome message', trigger: 'blur' },
    { min: 5, max: 100, message: 'Welcome message should be 5-100 characters', trigger: 'blur' },
  ],
}

// 表单引用
const formRef = ref()

// 处理头像上传
const handleAvatarUpload = (url: string) => {
  formData.avatar = url
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    // 检查头像是否已上传
    if (!formData.avatar) {
      ElMessage.warning('Please upload Agent avatar')
      return
    }

    emit('submit', { ...formData }, props.messageId)
  } catch (error) {
    console.error('Form validation failed:', error)
  }
}

// 取消表单
const handleCancel = () => {
  emit('cancel', props.messageId)
}

// 重置表单
const resetForm = () => {
  formData.avatar = ''
  formData.nickName = ''
  formData.personalization = ''
  formData.welcomeMessage = ''
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 暴露重置方法给父组件
defineExpose({
  resetForm,
})
</script>

<template>
  <div class="cast-agent-form">
    <div class="form-header">
      <h3>Cast Agent</h3>
      <p class="form-description">Create a dedicated AI Agent to be your intelligent assistant</p>
    </div>

    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px" class="agent-form">
      <!-- Avatar Upload -->
      <el-form-item label="Avatar" required>
        <div class="avatar-upload-section">
          <ImageUpload :image-url="formData.avatar" @upload-success="handleAvatarUpload" upload-text="Upload Agent Avatar" />
          <p class="upload-tip">Recommended square image, minimum 200x200px</p>
        </div>
      </el-form-item>

      <!-- Nickname -->
      <el-form-item label="Nickname" prop="nickName">
        <el-input v-model="formData.nickName" placeholder="Enter Agent nickname" maxlength="20" show-word-limit />
      </el-form-item>

      <!-- Personalization -->
      <el-form-item label="Personalization" prop="personalization">
        <el-input v-model="formData.personalization" type="textarea" :rows="4" placeholder="Describe Agent's personality, skills and characteristics..." maxlength="200" show-word-limit />
      </el-form-item>

      <!-- Welcome Message -->
      <el-form-item label="Welcome Message" prop="welcomeMessage">
        <el-input v-model="formData.welcomeMessage" type="textarea" :rows="3" placeholder="Agent's greeting message when meeting users for the first time..." maxlength="100" show-word-limit />
      </el-form-item>
    </el-form>

    <!-- Action Buttons -->
    <div class="form-actions">
      <el-button @click="handleCancel" size="large"> Cancel </el-button>
      <el-button type="primary" @click="handleSubmit" size="large" :disabled="!formData.avatar || !formData.nickName || !formData.personalization || !formData.welcomeMessage"> Cast Agent </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.cast-agent-form {
  background: #f8fafc;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  max-width: 100%;
  margin: 0;

  .form-header {
    text-align: left;
    margin-bottom: 20px;

    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .form-description {
      font-size: 12px;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }
  }

  .agent-form {
    .el-form-item {
      margin-bottom: 16px;

      :deep(.el-form-item__label) {
        font-weight: 500;
        color: #374151;
      }

      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        &:hover {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        &.is-focus {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
      }

      :deep(.el-textarea__inner) {
        border-radius: 8px;
        resize: vertical;
        min-height: 80px;
      }
    }
  }

  .avatar-upload-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .upload-tip {
      font-size: 12px;
      color: #9ca3af;
      margin: 0;
      text-align: center;
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;

    .el-button {
      min-width: 80px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;

      &.el-button--primary {
        background-color: #3b82f6;
        border-color: #3b82f6;

        &:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }

        &:disabled {
          background-color: #9ca3af;
          border-color: #9ca3af;
        }
      }
    }
  }
}

@media screen and (max-width: 768px) {
  .cast-agent-form {
    padding: 16px;
    margin: 16px;

    .form-header h3 {
      font-size: 20px;
    }

    .form-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
