<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import UploadImage from '@/components/UploadImage/index.vue'

import { buildContract, exceptionHandling } from '@/utils/index'

import { ethers } from 'ethers'

import { getDictText } from '@/api/login'
import { request } from '@/utils/request'

// Define form data type
interface CastAgentForm {
  avatar: string
  nickName: string
  position: string
  personalization: string
  welcomeMessage: string
  chargeAmount: number | undefined
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
  position: '',
  personalization: '',
  welcomeMessage: '',
  chargeAmount: undefined,
})

// Form validation rules
const rules = {
  nickName: [
    { required: true, message: 'Please enter Agent nickname', trigger: 'blur' },
    { min: 2, max: 20, message: 'Nickname should be 2-20 characters', trigger: 'blur' },
  ],
  position: [
    { required: true, message: 'Please enter position', trigger: 'blur' },
    { max: 50, message: 'Position should not exceed 50 characters', trigger: 'blur' },
  ],
  personalization: [
    { required: true, message: 'Please enter personalization description', trigger: 'blur' },
    { min: 2, max: 200, message: 'Personalization should be 2-200 characters', trigger: 'blur' },
  ],
  welcomeMessage: [
    { required: true, message: 'Please enter welcome message', trigger: 'blur' },
    { min: 2, max: 100, message: 'Welcome message should be 2-100 characters', trigger: 'blur' },
  ],
  chargeAmount: [
    { required: true, message: 'Please enter charge amount', trigger: 'blur' },
    { type: 'number' as const, min: 0, message: 'Charge amount must be greater than or equal to 0', trigger: 'blur' },
  ],
}

// Form reference
const formRef = ref()

// Loading state
const isSubmitting = ref(false)

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

    // Set loading state
    isSubmitting.value = true

    const curr_blockchain = await getDictText('sys_config', 'curr_blockchain')

    const HyperAGI_Agent_Mint = await buildContract(curr_blockchain, 'HyperAGI_Agent_Mint')

    // 准备参数
    const id = 358
    const agentParams = [
      formData.avatar, // 头像
      formData.nickName, // 昵称
      formData.personalization, // 个性化描述
      formData.welcomeMessage, // 欢迎消息
      formData.position, // 职位（合约要求 agentParams[4] 必须是 position）
    ]

    const uintParams = [ethers.parseEther(String(formData.chargeAmount ?? 0))]

    const tx = await HyperAGI_Agent_Mint.mintAndCreateAgentV2(id, agentParams, uintParams, {
      value: ethers.parseEther('0.001'), // 根据合约逻辑，这里可能需要调整
    })
    await tx.wait()

    ElMessage.success('Agent cast successfully!')

    // 获取最新的 agent 数据并回写到表单
    await fetchAndUpdateAgentData(id)

    // Emit success event to show message in chat
    emit('success', props.messageId)
  } catch (error) {
    exceptionHandling(error)
  } finally {
    // Reset loading state
    isSubmitting.value = false
  }
}

// 获取最新的 agent 数据并回写到表单
const fetchAndUpdateAgentData = async (agentId: number) => {
  try {
    const token = localStorage.getItem('X-Token')
    const response = (await request({
      url: '/mgn/agent/list',
      method: 'GET',
      params: {
        id: agentId,
      },
      headers: {
        'X-Access-Token': token || '',
      },
    })) as any

    const { result } = response

    if (result.records && result.records.length > 0) {
      const agentData = result.records[0]

      // 回写数据到表单
      if (agentData.avatar) formData.avatar = agentData.avatar
      if (agentData.nickName) formData.nickName = agentData.nickName
      if (agentData.position) formData.position = agentData.position
      if (agentData.personalization) formData.personalization = agentData.personalization
      if (agentData.welcomeMessage) formData.welcomeMessage = agentData.welcomeMessage
      if (agentData.chargeAmount !== undefined) {
        // 如果 chargeAmount 是字符串格式的以太币值，需要转换
        formData.chargeAmount = typeof agentData.chargeAmount === 'string' ? parseFloat(ethers.formatEther(agentData.chargeAmount)) : agentData.chargeAmount
      }

      ElMessage.success('Agent data updated successfully!')
    }
  } catch (error) {
    console.error('Failed to fetch agent data:', error)
    // 不显示错误消息，因为创建已经成功
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
  formData.position = ''
  formData.personalization = ''
  formData.welcomeMessage = ''
  formData.chargeAmount = undefined
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
      <div class="header-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21ZM14 10V12H22V10H14ZM14 14V16H22V14H14ZM14 18V20H19V18H14Z" fill="currentColor" />
        </svg>
      </div>
      <div class="header-content">
        <h3>Cast Agent</h3>
        <p class="form-description">Create a dedicated AI Agent to be your intelligent assistant</p>
      </div>
    </div>

    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px" label-position="right" class="agent-form">
      <!-- Avatar Upload -->
      <el-form-item label="Avatar" required>
        <div class="avatar-upload-section">
          <UploadImage v-model="formData.avatar" :limit="1" />
          <p class="upload-tip">Recommended square image, minimum 200x200px</p>
        </div>
      </el-form-item>

      <!-- Nickname -->
      <el-form-item label="* Nickname" prop="nickName">
        <el-input v-model="formData.nickName" placeholder="Enter Agent nickname" maxlength="20" show-word-limit clearable />
      </el-form-item>

      <!-- Position -->
      <el-form-item label="* Position" prop="position">
        <el-input v-model="formData.position" placeholder="Enter Agent position" maxlength="50" show-word-limit clearable />
      </el-form-item>

      <!-- Personalization -->
      <el-form-item label="* Personalization" prop="personalization">
        <el-input v-model="formData.personalization" type="textarea" :rows="4" placeholder="Describe Agent's personality, skills and characteristics..." maxlength="1000" show-word-limit resize="vertical" />
      </el-form-item>

      <!-- Welcome Message -->
      <el-form-item label="* Welcome Message" prop="welcomeMessage">
        <el-input v-model="formData.welcomeMessage" type="textarea" :rows="3" placeholder="Agent's greeting message when meeting users for the first time..." maxlength="1000" show-word-limit resize="vertical" />
      </el-form-item>

      <!-- Charge Amount -->
      <el-form-item label="* Task Rate" prop="chargeAmount">
        <div class="charge-amount-wrapper">
          <el-input-number v-model="formData.chargeAmount" :min="0" :precision="2" :step="0.01" placeholder="Enter task rate (HYPT)" class="charge-input" controls-position="right" />
          <p class="form-tip">The amount users need to pay to use this Agent (in HYPT)</p>
        </div>
      </el-form-item>
    </el-form>

    <!-- Action Buttons -->
    <div class="form-actions">
      <el-button @click="handleCancel" size="large" :disabled="isSubmitting"> Cancel </el-button>
      <el-button type="primary" @click="handleSubmit" size="large" :loading="isSubmitting" :disabled="isSubmitting || !formData.avatar || !formData.nickName || !formData.position || !formData.personalization || !formData.welcomeMessage || formData.chargeAmount === undefined">
        Create Agent
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.cast-agent-form {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  .form-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f3f4f6;
    flex-direction: row-reverse;
    justify-content: flex-start;

    .header-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f9ff;
      border-radius: 8px;
      color: #3b82f6;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .header-content {
      flex: 1;
      text-align: right;

      h3 {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 6px 0;
        line-height: 1.4;
      }

      .form-description {
        font-size: 13px;
        color: #6b7280;
        margin: 0;
        line-height: 1.5;
      }
    }
  }

  .agent-form {
    .el-form-item {
      margin-bottom: 24px;

      :deep(.el-form-item__label) {
        font-weight: 500;
        color: #374151;
        font-size: 14px;
        line-height: 1.5;
        padding-bottom: 8px;
        text-align: right;
        justify-content: flex-end;
      }

      :deep(.el-form-item__content) {
        line-height: 1.5;
        text-align: right;
      }

      :deep(.el-form-item__error) {
        text-align: right;
        right: 0;
        left: auto;
      }

      :deep(.el-input__wrapper) {
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        border: 1px solid #d1d5db;
        transition: all 0.2s ease;

        &:hover {
          border-color: #9ca3af;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        &.is-focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      }

      :deep(.el-input__inner) {
        font-size: 14px;
        color: #111827;
        padding: 10px 12px;
        height: auto;
        text-align: right;

        &::placeholder {
          text-align: right;
          direction: ltr;
        }
      }

      :deep(.el-textarea__inner) {
        border-radius: 8px;
        resize: vertical;
        min-height: 100px;
        border: 1px solid #d1d5db;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
        font-size: 14px;
        color: #111827;
        padding: 10px 12px;
        line-height: 1.5;
        text-align: right;

        &::placeholder {
          text-align: right;
          direction: ltr;
        }

        &:hover {
          border-color: #9ca3af;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        &:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      }

      :deep(.el-input__count) {
        color: #9ca3af;
        font-size: 12px;
        background: transparent;
        bottom: 8px;
        left: 12px;
        right: auto;
        text-align: left;
      }

      :deep(.el-textarea__count) {
        color: #9ca3af;
        font-size: 12px;
        background: transparent;
        bottom: 8px;
        left: 12px;
        right: auto;
        text-align: left;
      }
    }

    .form-tip {
      font-size: 12px;
      color: #6b7280;
      margin: 8px 0 0 0;
      line-height: 1.5;
      text-align: right;
    }
  }

  .avatar-upload-section {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;

    .upload-tip {
      font-size: 12px;
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
      text-align: right;
    }
  }

  .charge-amount-wrapper {
    width: 100%;

    .charge-input {
      width: 100%;

      :deep(.el-input__wrapper) {
        width: 100%;
      }

      :deep(.el-input__inner) {
        width: 100%;
        text-align: right;

        &::placeholder {
          text-align: right;
          direction: ltr;
        }
      }
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;

    .el-button {
      min-width: 120px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
      height: 40px;
      padding: 0 20px;
      transition: all 0.2s ease;

      &.el-button--default {
        border-color: #d1d5db;
        color: #374151;

        &:hover {
          border-color: #9ca3af;
          color: #111827;
          background-color: #f9fafb;
        }
      }

      &.el-button--primary {
        background-color: #3b82f6;
        border-color: #3b82f6;

        &:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }

        &:disabled {
          background-color: #d1d5db;
          border-color: #d1d5db;
          color: #9ca3af;
        }
      }
    }
  }
}

@media screen and (max-width: 768px) {
  .cast-agent-form {
    padding: 20px 16px;
    border-radius: 8px;

    .form-header {
      margin-bottom: 24px;
      padding-bottom: 16px;

      .header-icon {
        width: 28px;
        height: 28px;
      }

      .header-content h3 {
        font-size: 18px;
      }

      .header-content .form-description {
        font-size: 12px;
      }
    }

    .agent-form {
      :deep(.el-form-item) {
        margin-bottom: 20px;
      }

      :deep(.el-form-item__label) {
        font-size: 13px;
      }
    }

    .form-actions {
      flex-direction: column;
      margin-top: 24px;
      padding-top: 16px;

      .el-button {
        width: 100%;
        min-width: auto;
      }
    }
  }
}
</style>
