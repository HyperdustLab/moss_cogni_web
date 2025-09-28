<template>
  <div>
    <!-- component -->
    <div class="w-70% relative py-11 bg-white h-220 flex items-center justify-center" style="margin-left: 15%">
      <div class="relative m-auto px-4 text-gray-800 md:px-8 xl:px-28 h-full">
        <div class="m-auto md:w-8/12 lg:w-6/12 xl:w-10/12 h-full">
          <div class="rounded-xl shadow-xl h-full">
            <div class="p-4 sm:p-11 h-full">
              <div class="space-y-3">
                <div class="flex justify-center">
                  <div class="flex flex-col items-center gap-3">
                    <img src="../../assets/logo2.png" style="width: 20rem; height: auto" class="object-contain" loading="lazy" alt="tailus logo" />
                  </div>
                </div>
              </div>

              <div class="mt-11 grid space-y-3">
                <button @click="loginWithGoogle" class="group h-12 w-1/2 mx-auto px-6 border-2 border-black rounded-full transition duration-300 hover:border-black focus:bg-black active:bg-black bg-black shadow-sm hover:shadow-md">
                  <div class="relative flex items-center justify-center">
                    <img :src="googleIcon" class="w-5 mr-2 flex-shrink-0" alt="google logo" />
                    <span class="block font-semibold tracking-wide text-white text-sm transition duration-300 group-hover:text-white sm:text-base">Continue with Google</span>
                  </div>
                </button>
                <button @click="handleMetamaskLogin" class="group h-12 w-1/2 mx-auto px-6 border-2 border-black rounded-full transition duration-300 hover:border-black focus:bg-black active:bg-black bg-black shadow-sm hover:shadow-md">
                  <div class="relative flex items-center justify-center">
                    <img :src="metamaskIcon" class="w-5 mr-2 flex-shrink-0" alt="google logo" />
                    <span class="block font-semibold tracking-wide text-white text-sm transition duration-300 group-hover:text-white sm:text-base">Continue with MetaMask</span>
                  </div>
                </button>
              </div>

              <div class="flex items-center mb-2">
                <hr class="h-0 border-b border-solid border-grey-500 grow" />
                <p class="mx-3 text-gray-500 text-base">or</p>
                <hr class="h-0 border-b border-solid border-grey-500 grow" />
              </div>

              <div class="mt-11 grid space-y-3">
                <el-form ref="ruleFormRef" :model="form" :rules="rules" label-position="top">
                  <el-form-item label="Email" prop="email">
                    <el-input v-model="form.email" :disabled="false" size="large" />
                  </el-form-item>
                  <el-form-item label="Verification Code" prop="code">
                    <el-input v-model="form.code" size="large">
                      <template #append>
                        <el-button :disabled="sendCodeDisabled" :loading="loading" @click="sendCode" class="bg-black text-white border-black hover:bg-black focus:bg-black active:bg-black disabled:bg-black disabled:text-white">{{ sendCodeTxt }}</el-button>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-form>

                <div>
                  <div class="flex justify-center">
                    <el-button type="primary" @click="emailLogin" class="group h-12 w-1/2 mx-auto px-12 border-2 border-black rounded-full transition duration-300 shadow-sm hover:shadow-md bg-black hover:bg-black focus:bg-black active:bg-black">
                      <div class="relative flex items-center justify-center">
                        <span class="block font-semibold tracking-wide text-white text-sm transition duration-300 group-hover:text-white sm:text-base">Login with Email</span>
                      </div>
                    </el-button>
                  </div>
                </div>
              </div>

              <div class="mt-22 space-y-3 text-gray-500 text-center sm:-mb-6">
                <p class="text-xs">By proceeding, you agree to our <a href="/termsService" class="underline" target="_blank">Terms of Use</a> and confirm you have read our <a href="/privacyPolicy" class="underline" target="_blank">Privacy and Cookie Statement</a>.</p>
                <p class="text-xs">This site is protected by reCAPTCHA and the <a href="https://policies.google.com/privacy" class="underline" target="_blank">Google Privacy Policy</a> and <a href="https://policies.google.com/terms" class="underline" target="_blank">Terms of Service</a> apply.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import metamaskIcon from '@/assets/image/metamask.png'
import googleIcon from '@/assets/image/google.png'

import { request } from '@/utils/request'

import { ElMessage } from 'element-plus'

import { ref, reactive, nextTick, onBeforeMount, onBeforeUnmount } from 'vue'

const loginWithGoogle = () => {
  window.open(BASE_URL + '/sys/thirdLogin/render/GOOGLE', 'googleLogin', 'width=500,height=600')
}

const ruleFormRef = ref(null)

const BASE_URL = import.meta.env.VITE_API_HYPERAGI_API

import { useRoute } from 'vue-router'

const route = useRoute()

const sendCodeDisabled = ref(false)
const loading = ref(false)
const sendCodeTxt = ref('Send')

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

function onClose() {
  window.removeEventListener('message', handleMessage, false)
}

async function handleMetamaskLogin() {
  if (typeof window.ethereum === 'undefined') {
    ElMessage.error('Please install a wallet to use this feature.')
    throw new Error('Please install a wallet to use this feature.')
  }

  // @ts-ignore
  await window.ethereum.enable()
  // @ts-ignore
  const accounts = await ethereum.request({ method: 'eth_accounts' })

  const { result } = await request.postForm('/sys/getPersonalSignMessage', {
    address: accounts[0],
  })

  console.info([result, accounts[0]])

  // @ts-ignore
  const signature = await ethereum.request({
    method: 'personal_sign',
    // @ts-ignore
    params: [result, accounts[0]],
  })

  // @ts-ignore
  const res = await request.post('/sys/metaMaskLogin', {
    address: accounts[0],
    signature: signature,
    role: 'user',
  })

  loginToken(res.result.token)
}

async function loginToken(token: string) {
  localStorage.setItem('X-Token', token)
  location.href = '/'
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

  await request.postForm('/sys/sendEmailLoginCode', { email: form.email, type: 'login' })

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

async function emailLogin() {
  const valid = await ruleFormRef.value.validate()
  if (!valid) {
    return
  }

  const { result, success, message } = await request.post('/sys/emailLogin', form)

  if (success) {
    loginToken(result.token)
  } else {
    ElMessage.error(message)
  }
}

function handleMessage(event: any) {
  // 你可以根据 event.origin 判断消息的来源是否是你信任的源
  // 例如: if (event.origin !== "https://your-trusted-domain.com") return;

  // 接收父窗口传递的数据
  var receivedData = event.data

  console.info(BASE_URL)
  console.info(event.origin)
  console.info('receivedData:', receivedData)
  // 判断receivedData是否为JSON字符串
  let isJsonString = false
  try {
    const json = JSON.parse(receivedData)
    console.info('json:', json)
    if (json.token) {
      loginToken(json.token)
    }
  } catch (e) {
    isJsonString = false
  }
}

onBeforeMount(() => {
  window.addEventListener('message', handleMessage, false)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage, false)
})
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

:deep(.el-overlay) {
  background-color: rgba(255, 255, 255, 0.8) !important;
}

.modal-mask {
  background-color: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(8px);
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
  background-color: black !important;
  color: white !important;
}

::v-deep .el-button:hover {
  background-color: black !important;
  color: white !important;
}

::v-deep .el-button:focus {
  background-color: black !important;
  color: white !important;
}

::v-deep .el-button:active {
  background-color: black !important;
  color: white !important;
}

::v-deep .el-button.is-focus {
  background-color: black !important;
  color: white !important;
}

::v-deep .el-button.is-disabled {
  background-color: black !important;
  color: white !important;
  opacity: 0.6;
}
</style>
