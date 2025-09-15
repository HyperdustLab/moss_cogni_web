<template>
  <el-dialog v-model="dialogVisible" title="Bind Account" width="50%" @close="onClose">
    <!-- component -->
    <div class="relative py-16 bg-white">
      <div class="relative m-auto px-6 text-gray-600 md:px-12 xl:px-40 h-full">
        <div class="m-auto md:w-8/12 lg:w-6/12 xl:w-10/12 h-full">
          <div class="rounded-xl shadow-xl h-full">
            <div class="p-6 sm:p-16 h-full">
              <div class="space-y-4">
                <div class="flex justify-center">
                  <img src="/logo2.png" loading="lazy" class="w-40" alt="tailus logo" />
                </div>
              </div>

              <div class="mt-16 grid space-y-4">
                <button v-if="bindStatus === 'email'" @click="loginWithGoogle" class="group h-12 w-1/2 mx-auto px-6 border-2 border-black rounded-full transition duration-300 hover:border-black focus:bg-black active:bg-black bg-black shadow-sm hover:shadow-md">
                  <div class="relative flex items-center justify-center">
                    <img :src="googleIcon" class="w-5 mr-2" alt="google logo" />
                    <span class="block w-max font-semibold tracking-wide text-white text-sm transition duration-300 group-hover:text-white sm:text-base">Continue with Google</span>
                  </div>
                </button>
                <button v-if="bindStatus === 'metamask'" @click="handleMetamaskLogin" class="group h-12 w-1/2 mx-auto px-6 border-2 border-black rounded-full transition duration-300 hover:border-black focus:bg-black active:bg-black bg-black shadow-sm hover:shadow-md">
                  <div class="relative flex items-center space-x-4 justify-center">
                    <img :src="metamaskIcon" class="w-5 mr-2" alt="google logo" />
                    <span class="block w-max font-semibold tracking-wide text-white text-sm transition duration-300 group-hover:text-white sm:text-base">Continue with MetaMask</span>
                  </div>
                </button>
              </div>

              <template v-if="bindStatus === 'email'">
                <div class="flex items-center mb-3">
                  <hr class="h-0 border-b border-solid border-gray-300 grow" />
                  <p class="mx-4 text-gray-500">or</p>
                  <hr class="h-0 border-b border-solid border-gray-300 grow" />
                </div>

                <div class="mt-16 grid space-y-4">
                  <el-form ref="ruleFormRef" :model="form" :rules="rules" label-position="top">
                    <el-form-item label="Email" prop="email">
                      <el-input v-model="form.email" :disabled="false" />
                    </el-form-item>
                    <el-form-item label="Verification Code" prop="code">
                      <el-input v-model="form.code">
                        <template #append>
                          <el-button :disabled="sendCodeDisabled" :loading="loading" @click="sendCode" class="bg-black text-white border-black hover:bg-gray-800">{{ sendCodeTxt }}</el-button>
                        </template>
                      </el-input>
                    </el-form-item>
                  </el-form>

                  <el-button type="primary" @click="updateEmail" class="group h-12 w-1/2 mx-auto px-12 border-2 border-black rounded-full transition duration-300 shadow-sm hover:shadow-md bg-black hover:bg-black">
                    <div class="relative flex items-center space-x-4 justify-center">
                      <span class="block w-max font-semibold tracking-wide text-white text-sm transition duration-300 group-hover:text-white sm:text-base">Bind with Email</span>
                    </div>
                  </el-button>
                </div>
              </template>

              <template v-else>
                <div class="mt-16 grid space-y-4">
                  <p class="text-gray-600 text-sm">Don't have a MetaMask wallet? <a href="https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn" target="_blank" class="text-blue-600 hover:text-blue-700 hover:underline transition duration-300">Get Wallet</a></p>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script lang="ts" setup>
import metamaskIcon from '@/assets/image/metamask.png'
import googleIcon from '@/assets/image/google.png'

import { ElMessage } from 'element-plus'

import { ref, reactive, nextTick } from 'vue'

const dialogVisible = ref(false)

import { request } from '@/utils/request'

const loginWithGoogle = () => {
  window.open(import.meta.env.VITE_API_HYPERAGI_API + '/sys/thirdLogin/render/google?token=' + localStorage.getItem('X-Token'), 'googleLogin', 'width=500,height=600')
}

const ruleFormRef = ref(null)

const sendCodeDisabled = ref(false)
const loading = ref(false)
const sendCodeTxt = ref('Send')

const bindStatus = ref('none')

let intervalId
const codeNum = ref(60)

const rules = ref({
  email: [
    { required: true, message: 'Please input email', trigger: 'blur' },
    {
      validator: (rule: any, value: any, callback: any) => {
        if (!isValidEmail(value)) {
          callback(new Error('Please enter a valid email address'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  code: [{ required: true, message: 'Please input code', trigger: 'blur' }],
})

const form = reactive({
  email: '',
  code: '',
})

function show(_bindStatus: string) {
  bindStatus.value = _bindStatus

  dialogVisible.value = true
  window.addEventListener('message', handleMessage, false)

  Object.assign(form, {
    email: '',
    code: '',
  })

  nextTick(() => {
    ruleFormRef.value.resetFields()
  })
}

function onClose() {
  dialogVisible.value = false
  window.removeEventListener('message', handleMessage, false)
}

async function handleMetamaskLogin() {
  await metamaskBind()
  dialogVisible.value = false
}

async function metamaskBind() {
  // @ts-ignore
  await window.ethereum.enable()
  // @ts-ignore
  const accounts = await ethereum.request({ method: 'eth_accounts' })

  const data = await request({
    url: '/sys/getPersonalSignMessage',
    method: 'GET',
    params: {
      address: accounts[0],
    },
  })

  // @ts-ignore
  const signature = await ethereum.request({
    method: 'personal_sign',
    // @ts-ignore
    params: [data.result, accounts[0]],
  })

  // @ts-ignore
  const { result } = await request({
    url: '/sys/bindMetaMask',
    method: 'POST',
    data: {
      address: accounts[0],
      signature: signature,
    },
  })
}

function isValidEmail(email: string) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

async function sendCode() {
  const valid = await ruleFormRef.value.validateField('email')
  if (!valid) {
    return
  }

  loading.value = true

  await request({
    url: '/sys/sendEmailLoginCode',
    method: 'GET',
    params: {
      email: form.email,
      type: 'bindEmail',
    },
  })

  loading.value = false

  ElMessage.success('Verification code sent successfully')

  codeNum.value = 60
  sendCodeDisabled.value = true

  intervalId = window.setInterval(() => {
    if (codeNum.value === 0) {
      sendCodeDisabled.value = false
      sendCodeTxt.value = 'Send'
      clearInterval(intervalId)
    } else {
      codeNum.value--
      sendCodeTxt.value = codeNum.value.toString()
    }
  }, 1000)
}

async function updateEmail() {
  const valid = await ruleFormRef.value.validate()
  if (!valid) {
    return
  }

  await request({
    url: '/sys/user/updateEmail',
    method: 'POST',
    data: form,
  })

  dialogVisible.value = false
}

defineExpose({
  show,
})

function handleMessage(event: any) {
  // 你可以根据 event.origin 判断消息的来源是否是你信任的源
  // 例如: if (event.origin !== "https://your-trusted-domain.com") return;

  // 接收父窗口传递的数据
  var receivedData = event.data

  console.info(import.meta.env.VITE_API_HYPERAGI_API)
  console.info(event.origin)

  // 判断receivedData是否为JSON字符串
  let isJsonString = false
  try {
    const json = JSON.parse(receivedData)

    if (json.token) {
      localStorage.setItem('X-Token', json.token)
      location.href = '/'
    }
  } catch (e) {
    isJsonString = false
  }
}
</script>

<style scoped lang="scss">
::v-deep .el-form-item__content {
  display: flex;
  flex-wrap: wrap;
  align-items: normal;
  flex: 1;
  line-height: 32px;
  position: relative;
  font-size: var(--font-size);
  min-width: 0;
}

.social-media-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.social-media-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.social-media-icon img {
  width: 30px; /* You can set this to the size you need */
  height: 30px; /* Make sure this is the same as the width for a circle */
}

.social-media-icon span {
  margin-top: 8px;
  font-size: 12px;
}

/* 取消Element Plus按钮的绿色边框 */
::v-deep .el-button:focus {
  outline: none !important;
  border-color: black !important;
}

::v-deep .el-button:focus-visible {
  outline: none !important;
  border-color: black !important;
}

::v-deep .el-button:hover {
  border-color: black !important;
}

::v-deep .el-button:active {
  border-color: black !important;
}

::v-deep .el-button.is-focus {
  border-color: black !important;
}

/* 取消所有Element Plus按钮的默认样式 */
::v-deep .el-button {
  border-color: black !important;
}
</style>
