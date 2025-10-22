<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import UploadImage from '@/components/UploadImage/index.vue'

import { buildContract, exceptionHandling } from '@/utils/index'

import { ethers } from 'ethers'

import { getDictText } from '@/api/login'

// Define form data type
interface CastAgentForm {
  avatar: string
  nickName: string
  personalization: string
  welcomeMessage: string
}

// Define events
const emit = defineEmits<{
  submit: [formData: CastAgentForm, messageId: string]
  cancel: [messageId: string]
  success: [messageId: string]
}>()

// Define props
const props = defineProps<{
  messageId: string
}>()

// Form data
const formData = reactive<CastAgentForm>({
  avatar: '',
  nickName: '',
  personalization: '',
  welcomeMessage: '',
})

// Form validation rules
const rules = {
  nickName: [
    { required: true, message: 'Please enter Agent nickname', trigger: 'blur' },
    { min: 2, max: 20, message: 'Nickname should be 2-20 characters', trigger: 'blur' },
  ],
  personalization: [
    { required: true, message: 'Please enter personalization description', trigger: 'blur' },
    { min: 2, max: 200, message: 'Personalization should be 2-200 characters', trigger: 'blur' },
  ],
  welcomeMessage: [
    { required: true, message: 'Please enter welcome message', trigger: 'blur' },
    { min: 2, max: 100, message: 'Welcome message should be 2-100 characters', trigger: 'blur' },
  ],
}

// Form reference
const formRef = ref()

// Submit form
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    // Check if avatar has been uploaded
    if (!formData.avatar) {
      ElMessage.warning('Please upload Agent avatar')
      return
    }

    const curr_blockchain = await getDictText('sys_config', 'curr_blockchain')

    const HyperAGI_Agent_Mint = await buildContract(curr_blockchain, 'HyperAGI_Agent_Mint')

    // 准备参数
    const id = 358
    const agentParams = [
      formData.avatar, // 头像
      formData.nickName, // 昵称
      formData.personalization, // 个性化描述
      formData.welcomeMessage, // 欢迎消息
    ]

    const tx = await HyperAGI_Agent_Mint.mintAndCreateAgent(id, agentParams, {
      value: ethers.parseEther('0.001'), // 根据合约逻辑，这里可能需要调整
    })
    await tx.wait()

    ElMessage.success('Agent cast successfully!')
  } catch (error) {
    exceptionHandling(error)
  }
}

// Cancel form
const handleCancel = () => {
  emit('cancel', props.messageId)
}

// Reset form
const resetForm = () => {
  formData.avatar = ''
  formData.nickName = ''
  formData.personalization = ''
  formData.welcomeMessage = ''
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// Expose reset method to parent component
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
          <UploadImage v-model="formData.avatar" :limit="1" />
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
      <el-button type="primary" @click="handleSubmit" size="large" :disabled="!formData.avatar || !formData.nickName || !formData.personalization || !formData.welcomeMessage"> Create Agent </el-button>
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
