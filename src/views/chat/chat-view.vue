<script lang="ts" setup>
import { nextTick, normalizeClass, onMounted, onUnmounted, ref, Text, watch, computed } from 'vue'
import SessionItem from './components/session-item.vue'
import { ChatRound, Close, Delete, EditPen, Upload, Share, Message, Document, User, Plus, Edit, Search } from '@element-plus/icons-vue'
import MessageRow from './components/message-row.vue'
import MessageInput from './components/message-input.vue'
import { storeToRefs } from 'pinia'
import { ElIcon, ElMessage, type UploadProps, type UploadUserFile } from 'element-plus'
import { getDictText, getDictItems } from '@/api/login'
import { SSE } from 'sse.js'
import { type AiMessage, useChatStore } from './store/chat-store'
import Login from '@/components/Login/index.vue'

import IntroductionBindAccount from '@/components/IntroductionBindAccount/index.vue'

import { useWebSocket } from '@vueuse/core'

import { ElMessageBox } from 'element-plus'

import UploadEmbedding from './components/uploadEmbedding.vue'

import user from '@/assets/user.png'
import agent from '@/assets/agent.png'

import { request } from '@/utils/request'

type ChatResponse = {
  metadata: {
    usage: {
      totalTokens: number
    }
  }
  result: {
    metadata: {
      finishReason: string
    }
    output: {
      messageType: string
      content: string
    }
  }
}

const introductionBindAccountRef = ref(null)

const API_PREFIX = import.meta.env.VITE_API_PREFIX
const chatStore = useChatStore()
// const { handleDeleteSession, handleUpdateSession, handleClearMessage } = chatStore
// const { activeSession, sessionList, isEdit } = storeToRefs(chatStore)
const messageListRef = ref<InstanceType<typeof HTMLDivElement>>()

const activeSession = ref<any>(null)
const sessionList = ref<any[]>([])

// 邮箱弹窗状态
const showEmailDropdown = ref(false)
const emailDropdownPosition = ref({ x: 0, y: 0 })

import logoutPng from '@/assets/image/logout.png?url'

import Substring from '@/components/Substring.vue'

const loading = ref(false)

const sendLoading = ref(false)

let setTimeoutId: any = null

const showContactPanel = ref(false)

const defaultWelcomeMessage = ref('')

const loginRef = ref<InstanceType<typeof Login>>()

const BASE_URL = import.meta.env.VITE_API_HYPERAGI_API

const wsUserId = generateUUID()

const selectMyAgentId = ref('')

const replySearch = ref(null)

// Add timestamp and flag for message processing control
const lastProcessedTime = ref(0)
const isProcessing = ref(false)

const reasoningRecord = ref(null)

// ChatGPT response
const responseMessage = ref<AiMessage>({
  id: new Date().getTime().toString(),
  type: 'ASSISTANT',
  medias: [],
  textContent: '',
  sessionId: '',
})

const chatMessage = ref<AiMessage>({
  id: new Date().getTime().toString(),
  type: 'USER',
  medias: [],
  textContent: '',
  sessionId: '',
})

function showBindEmail() {
  if (introductionBindAccountRef.value) {
    introductionBindAccountRef.value.show('email')
  }
}

const wsUrl = BASE_URL.replace('http', 'ws').replace('https', 'wss') + '/ws/app/websocket/' + wsUserId

const { status, data, send, open, close } = useWebSocket(wsUrl, {
  autoReconnect: true,
  onMessage: async (ws, event) => {
    console.info('event', event)
    try {
      const currentTime = Date.now()
      // Only process if more than 10 seconds have passed since last processing
      if (currentTime - lastProcessedTime.value < 3000 || isProcessing.value) {
        console.log('Message ignored due to rate limiting')
        return
      }

      const msg = JSON.parse(event.data)

      if (msg.data.replyTweetsRecordId !== wsUserId) {
        console.log('msg.data.replyTweetsRecordId', msg.data.replyTweetsRecordId)
        console.log('wsUserId', wsUserId)
        return
      }

      const text = inputText.value

      if (!sendLoading.value) {
        return
      }

      switch (msg.action) {
        case 'callbackAutoReplyTweetsMedia':
          isProcessing.value = true
          lastProcessedTime.value = currentTime
          inputReplyMediaFileUrls.value = msg.data.replyMediaFileUrls
          inputText.value = msg.data.tweets
          sendLoading.value = true
          console.log('inputTextReplyStatus.value', inputTextReplyStatus.value)

          if (!inputTextReplyStatus.value) {
            inputTextReplyStatus.value = true

            if (inputReplyMediaFileUrls.value.length > 0) {
              messageList.value[messageList.value.length - 1].medias = inputReplyMediaFileUrls.value.map((url) => ({ type: 'image', data: url }))
            }

            console.log('messageList.value[messageList.value.length - 1]', messageList.value[messageList.value.length - 1])

            if (reasoningRecord.value) {
              reasoningRecord.value.inputReplyMediaFileUrls = inputReplyMediaFileUrls.value
            }

            // @ts-ignore
            responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'

            // @ts-ignore
            responseMessage.value.thinkingList.push({ title: 'Think complete', status: 'success' })

            await saveMessage(chatMessage.value)
            await saveMessage(responseMessage.value)

            await addReasoningRecord(reasoningRecord.value)

            isProcessing.value = false
            sendLoading.value = false
          }

          break
        case 'callbackAutoReplyTweetsText':
          console.info('callbackAutoReplyTweetsText inputTextReplyStatus.value', inputTextReplyStatus.value)
          if (inputTextReplyStatus.value) {
            return
          }

          if (setTimeoutId) {
            clearTimeout(setTimeoutId)
          }

          isProcessing.value = true
          lastProcessedTime.value = currentTime
          inputTextReplyStatus.value = true
          inputText.value = msg.data.tweets
          sendLoading.value = true

          // @ts-ignore
          responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'

          // @ts-ignore
          responseMessage.value.thinkingList.push({ title: 'Think', status: 'pending' })

          handleSendMessage({ text: text, inputText: inputText.value, image: '' }).finally(() => {
            isProcessing.value = false
          })
          break
      }
    } catch (error) {
      console.error('error', error)
      isProcessing.value = false
    }
  },
})

window.setInterval(() => {
  send('PING')
}, 10000)

const myAgentList = ref<any[]>([])

const messageList = ref<any[]>([])

const showSessionEdit = ref(false)
const isSessionPanelCollapsed = ref(true)

const token = ref(localStorage.getItem('X-Token'))

const uploadEmbeddingRef = ref<InstanceType<typeof UploadEmbedding>>()

const agentList = ref<any[]>([])

// 添加分页相关参数
const pageNum = ref(1)
const pageSize = ref(15)
const total = ref(0)
const noMore = ref(false)

const agentCount = ref({
  total: 0,
  online: 0,
})

// 添加选中的agent id
const selectAgent = ref<any>(null)
const selectAgentId = ref<string | null>(null)

const currSessionId = ref(generateUUID())

// 添加搜索相关的响应式变量
const searchQuery = ref('')

const inputText = ref('')

const inputTextReplyStatus = ref(false)

const inputReplyMediaFileUrls = ref([])

const loginUser = ref(null)

// 用户信息显示相关函数
const getUserInitials = (user: any) => {
  if (!user) return '?'

  // 优先使用用户名
  if (user.username) {
    return user.username.charAt(0).toUpperCase()
  }

  // 如果没有用户名，使用邮箱
  if (user.email) {
    return user.email.charAt(0).toUpperCase()
  }

  // 如果都没有，返回默认字符
  return 'U'
}

const getUserDisplayName = (user: any) => {
  if (!user) return 'Guest'

  // 如果没有钱包地址，显示邮箱
  if (user.email) {
    return user.email
  }

  // 优先显示用户名
  if (user.username) {
    return user.username
  }

  // 优先显示钱包地址的简化版本
  if (user.walletAddress) {
    const address = user.walletAddress
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return 'Guest'
}

// 获取用户主要标识信息（钱包地址或邮箱）
const getUserMainIdentifier = (user: any) => {
  if (!user) return null

  // 优先返回钱包地址
  if (user.walletAddress) {
    return {
      type: 'wallet',
      value: user.walletAddress,
      display: `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`,
      icon: '🔗',
    }
  }

  // 如果没有钱包地址，返回邮箱
  if (user.email) {
    return {
      type: 'email',
      value: user.email,
      display: user.email,
      icon: '📧',
    }
  }

  return null
}

const getUserLevel = (user: any) => {
  if (!user) return '访客'

  // 根据用户信息判断会员等级
  // 这里可以根据实际的业务逻辑来判断
  if (user.isPremium || user.vipLevel || user.membership) {
    return user.membership || user.vipLevel || '高级版'
  }

  // 如果有钱包地址，可能是付费用户
  if (user.walletAddress && user.email) {
    return '标准版'
  }

  return '免费版'
}

const isPremiumUser = (user: any) => {
  if (!user) return false

  // 判断是否为高级用户的逻辑
  return user.isPremium || user.vipLevel || user.membership || false
}

const handleUpgrade = () => {
  // 跳转到升级页面或显示升级弹窗
  goUser() // 使用现有的跳转到dashboard的函数
}

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // 可以添加一个简单的提示，比如改变按钮状态
    return true
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}

// 处理复制按钮点击
const handleCopyClick = async (event: MouseEvent, user: any) => {
  event.stopPropagation()
  const identifier = getUserMainIdentifier(user)
  if (identifier?.value) {
    const success = await copyToClipboard(identifier.value)
    if (success) {
      ElMessage.success('Copied successfully!')
    } else {
      ElMessage.error('Copy failed, please try again')
    }
  }
}

// 显示邮箱弹窗
const handleEmailClick = (event: MouseEvent) => {
  event.stopPropagation()
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  const dropdownWidth = 320 // 弹窗宽度 (min-w-64 = 16rem = 256px, 但实际会更宽)
  const dropdownHeight = 280 // 弹窗高度 (增加了间距后更高)

  let x = rect.left
  let y = rect.top - dropdownHeight - 10 // 在邮箱上方显示

  // 确保弹窗不会超出屏幕右边界
  if (x + dropdownWidth > windowWidth) {
    x = windowWidth - dropdownWidth - 10
  }

  // 确保弹窗不会超出屏幕上边界
  if (y < 10) {
    y = rect.bottom + 10 // 如果上方空间不够，显示在下方
  }

  emailDropdownPosition.value = { x, y }
  showEmailDropdown.value = true
}

// 隐藏邮箱弹窗
const hideEmailDropdown = () => {
  showEmailDropdown.value = false
}

// 点击外部关闭弹窗
const handleClickOutside = (event: MouseEvent) => {
  if (showEmailDropdown.value) {
    const target = event.target as HTMLElement
    if (!target.closest('.email-dropdown') && !target.closest('.email-clickable')) {
      hideEmailDropdown()
    }
  }
}

import { useRoute } from 'vue-router'
import { fa } from 'element-plus/es/locales.mjs'

const route = useRoute()
const sid = route.query.sid

const defaultContent = ref(null)

const isOnline = ref(false)

const defAvatar = ref(agent)

const options = ref<any>({
  enableVectorStore: true,
  enableAgent: false,
  model: '',
  baseUrl: '',
})
const embeddingLoading = ref(false)

const showAgentPanel = ref(true) // 控制agent面板显示/隐藏
const showSessionPanel = ref(false) // 控制session面板显示/隐藏
const isSidebarCollapsed = ref(false) // 控制整个左边区域（侧边栏）的折叠状态
const showChatList = ref(false) // 控制聊天列表显示/隐藏

// 控制agent面板显示/隐藏
function toggleAgentPanel() {
  showAgentPanel.value = true
  showContactPanel.value = true
}

onMounted(async () => {
  getReplySearch()
  await getDefaultWelcomeMessage()
  await getDefaultContent()

  if (localStorage.getItem('X-Token')) {
    await getLoginUser()
  }

  await getAgentList()

  agentCount.value.online = await getAgentCount(true)
  agentCount.value.total = await getAgentCount(false)

  // 添加全局点击事件监听器
  document.addEventListener('click', handleClickOutside)

  if (sid) {
    const { result } = await request({
      url: BASE_URL + '/mgn/agent/list',
      params: {
        sid: sid,
      },
      method: 'GET',
    })

    handleSelectAgent(result.records[0])
  } else {
    if (loginUser.value) {
      await getMyAgent()

      handleSelectAgent(myAgentList.value[0])
      selectMyAgentId.value = myAgentList.value[0].id
    } else {
      handleSelectAgent(agentList.value[0])
    }
  }

  // 添加滚动监听
  contactListRef.value?.addEventListener('scroll', handleScroll)
})

async function getReplySearch() {
  const { result } = await request({
    url: BASE_URL + '/sys/dict/getDictText/3d_client_config/reply_search',
    method: 'GET',
    headers: {
      'X-Access-Token': token.value,
    },
  })

  replySearch.value = JSON.parse(result)
}

async function getDefaultWelcomeMessage() {
  const { result } = await request({
    url: BASE_URL + '/sys/dict/getDictText/sys_config/welcomeMessage',
    method: 'GET',
    headers: {
      'X-Access-Token': token.value,
    },
  })

  defaultWelcomeMessage.value = result
}

// 组件卸载时移除监听
onUnmounted(() => {
  contactListRef.value?.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
})

async function getDefaultContent() {
  const { result } = await request({
    url: BASE_URL + '/mgn/agentNpc/list',
    method: 'GET',
    params: {
      name: 'agentme',
    },
    headers: {
      'X-Access-Token': token.value,
    },
  })
  if (result.records.length > 0) {
    defaultContent.value = result.records[0].alpacaPrompt
  }
}

function generateUUID() {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)

  bytes[6] = (bytes[6] & 0x0f) | 0x40 // Set the version to 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // Set the variant to 10xx

  const uuid = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`
}

async function handleCreateMyAgent() {
  const AIPodDownload = await getDictText('sys_config', 'AIPodDownload')
  window.open(AIPodDownload)
}

async function handleShareTwitter(sid: any) {
  const currentUrl = window.location.origin + '?sid=' + (sid || selectAgent.value.sid)
  const shareText = `check out moss AI agent`
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`
  window.open(twitterShareUrl, '_blank')
}

async function getSessionList() {
  if (!selectAgent.value) {
    sessionList.value = []
    return
  }

  const { result } = await request({
    url: BASE_URL + '/mgn/aiSession/list',
    method: 'GET',
    headers: {
      'X-Access-Token': token.value,
    },

    params: {
      pageNo: 1,
      pageSize: 20,
      column: 'createdTime',
      order: 'desc',
      type: '3',
      creatorId: loginUser.value?.id || currSessionId.value,
      agentId: selectAgent.value.sid,
    },
  })

  sessionList.value = result.records

  // 如果没有sessions，自动创建一个新的
  if (sessionList.value.length === 0) {
    await handleSessionCreate()
  } else {
    // 选择第一个session
    handleSelectSession(sessionList.value[0])
  }
}

function handleSelectSession(session: any) {
  activeSession.value = session
  getMessageList()
}

async function getCurrAgentOnlineStatus() {
  const { result } = await request({
    url: BASE_URL + '/mgn/agent/list',
    method: 'GET',
    params: {
      sid: selectAgent.value.sid,
    },
    headers: {
      'X-Access-Token': token.value,
    },
  })

  const agent = result.records[0]
  return agent.onlineStatus === 1
}

const preHandleSendMessage = async (message: { text: string; image: string }) => {
  sendLoading.value = true
  inputText.value = message.text

  inputTextReplyStatus.value = false

  // 发送消息时显示聊天列表
  showChatList.value = true

  isOnline.value = await getCurrAgentOnlineStatus()

  // Image/Audio
  const medias: AiMessage['medias'] = []
  if (message.image) {
    medias.push({ type: 'image', data: message.image })
  }

  for (const item of messageList.value) {
    item.thinkingList = null
  }

  responseMessage.value = {
    type: 'ASSISTANT',
    textContent: '',
    aiSessionId: activeSession.value.id,
    sessionId: activeSession.value.id,
    avatar: selectAgent.value.avatar,
    name: selectAgent.value.nickName,
    creatorId: selectAgent.value.sid,
    editorId: selectAgent.value.sid,
    thinkingList: [],
  }

  chatMessage.value = {
    aiSessionId: activeSession.value.id,
    sessionId: activeSession.value.id,
    medias: null,
    textContent: message.text,
    type: 'USER',
    avatar: loginUser.value?.avatar,
    name: loginUser.value?.walletAddress || 'Guest',
    creatorId: loginUser.value?.id || currSessionId.value,
    editorId: loginUser.value?.id || currSessionId.value,
  }

  messageList.value.push(chatMessage.value)
  messageList.value.push(responseMessage.value)

  // 确保在下一个 tick 时滚动到底部
  await nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTo({
        top: messageListRef.value.scrollHeight,
        behavior: 'smooth',
      })
    }
  })

  if (isOnline.value) {
    const msg = {
      action: 'autoReplyTweetsText',
      data: {
        replyTweetsRecordId: wsUserId,
        tweets: inputText.value,
      },
    }

    await request.post(BASE_URL + '/ws/socketMsg/sendSocketMsg', {
      userId: selectAgent.value.owner,
      msg: JSON.stringify(msg),
    })

    // @ts-ignore
    responseMessage.value.thinkingList.push({ title: 'Observing the environment', status: 'pending' })

    setTimeoutId = setTimeout(() => {
      console.info('inputTextReplyStatus.value', inputTextReplyStatus.value)
      if (!inputTextReplyStatus.value) {
        inputTextReplyStatus.value = true
        // @ts-ignore
        responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'
        // @ts-ignore
        responseMessage.value.thinkingList.push({ title: 'Think', status: 'pending' })
        handleSendMessage({ text: message.text, inputText: message.text, image: '' })
      }
    }, 10 * 1000)
  } else {
    // @ts-ignore

    responseMessage.value.thinkingList.push({ title: 'Think', status: 'pending' })

    handleSendMessage({ text: message.text, inputText: message.text, image: '' })
  }
}

// 1. 新增 evtSourceRef 用于管理推理流
const evtSourceRef = ref<any>(null)

const handleSendMessage = async (message: { text: string; inputText: string; image: string }) => {
  if (!activeSession.value) {
    ElMessage.warning('Please create a session')
    return
  }

  let content = selectAgent.value.personalization

  if (!content) {
    content = defaultContent.value
  }

  content = content.replace('[agent name]', selectAgent.value.nickName)

  const messageParams = {
    assistantId: selectAgent.value.sid,
    model: 'MFDoom/deepseek-r1-tool-calling:32b',
    content: content,
    userId: loginUser.value?.id || currSessionId.value,
    textContent: message.inputText,
    sessionId: activeSession.value.id,
    enableVectorStore: true,
    enableTool: selectAgent.value.functionStatus === 'Y',
  }

  const evtSource = new SSE(BASE_URL + '/mgn/agent/asyncChat', {
    withCredentials: true,
    // Disable auto start, need to call stream() to initiate request
    start: false,
    payload: JSON.stringify(messageParams),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  // 记录当前推理流
  evtSourceRef.value = evtSource

  let isThinking = false
  let buffer = ''

  evtSource.stream()

  evtSource.addEventListener('message', async (event: any) => {
    console.info('event.data', event.data)

    const eventData = event.data
    const data = JSON.parse(eventData)

    if (isThinking) {
      // Accumulate content in buffer
      buffer += data.content || ''

      // Check if buffer contains the complete </think> tag
      if (buffer.includes('</think>')) {
        isThinking = false
        // Extract content after </think>, if any
        const thinkEndIndex = buffer.indexOf('</think>') + 8
        const contentAfterThink = buffer.slice(thinkEndIndex).trim()
        // Append only content after </think>, if it exists
        if (contentAfterThink) {
          responseMessage.value.textContent += contentAfterThink
        }
        // Clear buffer
        buffer = ''
        // Scroll to bottom
        await nextTick(() => {
          messageListRef.value?.scrollTo(0, messageListRef.value.scrollHeight)
        })
      }
      // Do nothing if still in thinking mode (skip appending)
    } else {
      // Append content directly if not in thinking mode
      responseMessage.value.textContent += data.content || ''
      // Scroll to bottom
      await nextTick(() => {
        messageListRef.value?.scrollTo(0, messageListRef.value.scrollHeight)
      })
    }

    if (data.fullPrompt) {
      evtSource.close()

      chatMessage.value.textContent = message.text
      // if (message.mediaFileUrls) {
      //   responseMessage.value.medias = message.mediaFileUrls.map((url) => ({ type: 'image', data: url }))
      // }

      reasoningRecord.value = {
        inputContent: message.inputText,
        outContent: responseMessage.value.textContent,
        agentId: selectAgent.value.sid,
        userId: loginUser.value?.id || '',
        prompt: data.fullPrompt,
        serviceName: options.value.model,
        systemContent: content,
        remark: options.value.baseUrl,
      }

      let avatar = loginUser.value ? loginUser.value.avatar : ''

      if (!avatar) {
        avatar = defAvatar.value
      }

      inputTextReplyStatus.value = false

      if (!isOnline.value) {
        sendLoading.value = false
        await saveMessage(chatMessage.value)
        await saveMessage(responseMessage.value)

        await addReasoningRecord(reasoningRecord.value)

        inputTextReplyStatus.value = true
        // @ts-ignore
        responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'

        // @ts-ignore
        responseMessage.value.thinkingList.push({ title: 'Think complete', status: 'success' })
      } else {
        const type = await isPhotoOrCelebrity(message.text)

        if (type === 'celebrity') {
          // @ts-ignore
          responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'
          // @ts-ignore
          responseMessage.value.thinkingList.push({ title: 'Generating postcard', status: 'pending' })
        } else if (type === 'photo') {
          // @ts-ignore
          responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'
          // @ts-ignore
          responseMessage.value.thinkingList.push({ title: 'Generating images', status: 'pending' })
        }

        if (type === 'other') {
          isProcessing.value = false
          sendLoading.value = false
          // @ts-ignore
          responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'
          // @ts-ignore
          responseMessage.value.thinkingList.push({ title: 'Think complete', status: 'success' })
          await saveMessage(chatMessage.value)
          await saveMessage(responseMessage.value)

          await addReasoningRecord(reasoningRecord.value)
        } else {
          const msg = {
            action: 'autoReplyTweetsMedia',
            data: {
              replyTweetsRecordId: wsUserId,
              tweets: chatMessage.value.textContent,
              replyTweets: responseMessage.value.textContent,
              replyTweetsName: selectAgent.value.xusername || selectAgent.value.nickName,
              authorName: '',
              authorUserName: loginUser.value?.walletAddress ? `${loginUser.value.walletAddress.slice(0, 6)}...${loginUser.value.walletAddress.slice(-4)}` : '',
              avatar: avatar,
            },
          }
          await request.post(BASE_URL + '/ws/socketMsg/sendSocketMsg', {
            userId: selectAgent.value.owner,
            msg: JSON.stringify(msg),
          })

          setTimeout(async () => {
            if (!inputTextReplyStatus.value) {
              console.info('autoReplyTweetsMedia inputTextReplyStatus.value', inputTextReplyStatus.value)

              inputTextReplyStatus.value = true
              isProcessing.value = false
              await saveMessage(chatMessage.value)
              await saveMessage(responseMessage.value)

              await addReasoningRecord(reasoningRecord.value)

              sendLoading.value = false
              // @ts-ignore
              responseMessage.value.thinkingList[responseMessage.value.thinkingList.length - 1].status = 'success'
              // @ts-ignore
              responseMessage.value.thinkingList.push({ title: 'Think complete', status: 'success' })
            }
          }, 30 * 1000)
        }
      }
    }
  })
}

async function addReasoningRecord(reasoningRecord: any) {
  await request({
    url: BASE_URL + '/mgn/reasoningRecord/add',
    method: 'POST',
    data: reasoningRecord,
    headers: {
      'X-Access-Token': token.value,
    },
  })
}

async function saveMessage(message: any) {
  await request({
    url: BASE_URL + '/mgn/aiMessage/add',
    method: 'POST',
    data: message,
    headers: {
      'X-Access-Token': token.value,
    },
  })
}

const handleSessionCreate = async () => {
  if (!selectAgent.value) {
    ElMessage.warning('Please select an agent first')
    return
  }

  await request({
    url: BASE_URL + '/mgn/aiSession/add',
    method: 'POST',
    data: {
      agentId: selectAgent.value.sid,
      name: 'New Chat',
      creatorId: loginUser.value?.id || currSessionId.value,
      type: '3',
    },
    headers: {
      'X-Access-Token': token.value,
    },
  })
  await getSessionList()
}

async function getMyAgent() {
  const { result } = await request({
    url: BASE_URL + '/mgn/agent/list',
    method: 'GET',
    headers: {
      'X-Access-Token': token.value,
    },
    params: {
      walletAddress: loginUser.value.walletAddress || loginUser.value.email,
    },
  })

  myAgentList.value = result.records
}

// 修改获取agent列表的方法，添加搜索参数
async function getAgentList(isLoadMore = false) {
  if (loading.value || noMore.value) return

  try {
    const params = {
      pageNo: pageNum.value,
      pageSize: pageSize.value,
      userOrderNum: true,
      showStatus: 'Y',
      noWalletAddress: loginUser.value ? loginUser.value.walletAddress : '',
    }

    // 只有在搜索关键词不为空时才添加 nickName 参数
    if (searchQuery.value.trim()) {
      params.nickName = `*${searchQuery.value.trim()}*`
    }

    const { result } = await request({
      url: BASE_URL + '/mgn/agent/list',
      params,
      method: 'GET',
      headers: {
        'X-Access-Token': token.value,
      },
    })

    total.value = result.total

    if (isLoadMore) {
      agentList.value = [...agentList.value, ...result.records]
    } else {
      agentList.value = result.records
    }

    noMore.value = agentList.value.length >= total.value
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 添加搜索处理函数
const handleSearch = () => {
  pageNum.value = 1 // 重置页码
  noMore.value = false // 重置 noMore 状态
  agentList.value = [] // 清空现有列表
  getAgentList() // 重新获取数据
}

// 添加防抖处理
let searchTimer: any = null
const debouncedSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 300)
}

// 修改 watch 处理
watch(searchQuery, () => {
  if (!searchQuery.value.trim()) {
    // 当搜索框清空时，重置所有状态并重新加载
    pageNum.value = 1
    noMore.value = false
    agentList.value = []
    getAgentList()
  } else {
    debouncedSearch()
  }
})

async function getLoginUser() {
  try {
    const res = await request({
      url: BASE_URL + '/sys/getCurrUser',
      headers: {
        'X-Access-Token': token.value,
      },
      method: 'GET',
    })

    loginUser.value = res.result
  } catch (error) {
    console.error(error)
  }
}

const disconnect = () => {
  localStorage.removeItem('X-Token')
  location.reload()
}

const goHome = () => {
  location.href = `https://www.hyperagi.ai`
}

function goUser() {
  location.href = `https://dashboard.hyperagi.ai/login?token=${token.value}`
}

function showUploadEmbedding() {
  uploadEmbeddingRef.value?.show(selectAgent.value.id)
}

const handleBindTwitter = () => {
  const data = {
    token: token.value,
    id: selectAgent.value.sid,
    type: '1',
  }

  const encodedData = btoa(JSON.stringify(data))

  window.removeEventListener('message', handleMessage, false)

  window.addEventListener('message', handleMessage, false)

  window.open(BASE_URL + '/mgn/x/render?data=' + encodedData, 'googleLogin', 'width=500,height=600')
}

const fileList = ref<UploadUserFile[]>([])

// 添加滚动加载方法
const contactListRef = ref<HTMLElement>()
const handleScroll = () => {
  if (!contactListRef.value) return

  const { scrollTop, scrollHeight, clientHeight } = contactListRef.value
  // 当滚动到距离底部20px时触发加载
  if (scrollHeight - scrollTop - clientHeight < 20) {
    loadMore()
  }
}

// 加载更多
const loadMore = () => {
  if (loading.value || noMore.value) return
  pageNum.value++
  getAgentList(true)
}

const preHandleSelectAgent = (agent: any) => {
  selectMyAgentId.value = ''

  handleSelectAgent(agent)
  showSessionPanel.value = true
}

// 添加选中方法
const handleSelectAgent = (_agent: any) => {
  // 终止推理逻辑
  if (isProcessing.value || sendLoading.value) {
    isProcessing.value = false
    sendLoading.value = false
    if (evtSourceRef.value) {
      evtSourceRef.value.close()
      evtSourceRef.value = null
    }

    loading.value = false
    sendLoading.value = false

    ElMessage({
      type: 'warning',
      message: 'Reasoning interrupted',
      customClass: 'dark-message',
    })
  }
  if (_agent) {
    selectAgent.value = _agent
    selectAgentId.value = _agent.id
  } else {
    selectAgent.value = agentList.value[0]
    selectAgentId.value = agentList.value[0].id
  }
  console.info('selectAgentId.value', selectAgentId.value)

  getSessionList()
  handleSearchWeb(false)
}

async function getMessageList() {
  const { result } = await request({
    url: BASE_URL + '/mgn/aiMessage/list',
    method: 'GET',
    headers: {
      'X-Access-Token': token.value,
    },
    params: {
      aiSessionId: activeSession.value.id,
      pageSize: -1,
      column: 'createTime',
      order: 'asc',
    },
  })

  messageList.value = result.records

  if (messageList.value.length === 0) {
    let welcomeMessage = selectAgent.value.welcomeMessage
    if (!welcomeMessage) {
      welcomeMessage = defaultWelcomeMessage.value.replace('[agentName].', selectAgent.value.nickName)
    }

    messageList.value.push({
      type: 'ASSISTANT',
      textContent: welcomeMessage,
      aiSessionId: activeSession.value.id,
      sessionId: activeSession.value.id,
      avatar: selectAgent.value.avatar,
      name: selectAgent.value.nickName,
      creatorId: selectAgent.value.sid,
      editorId: selectAgent.value.sid,
      thinkingList: [],
    })
  }
}

const handleEditSession = () => {
  console.log('before:', showSessionEdit.value)
  showSessionEdit.value = true
  console.log('after:', showSessionEdit.value)
}

const handleCancelEdit = () => {
  console.log('before:', showSessionEdit.value)
  showSessionEdit.value = false
  console.log('after:', showSessionEdit.value)
}

async function handleDeleteSession(sessionId: string) {
  try {
    const result = await ElMessageBox.confirm('Are you sure you want to delete this session?', 'Warning', {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning',
      customClass: 'dark-message-box',
      buttonSize: 'default',
      confirmButtonClass: 'dark-confirm-button',
      cancelButtonClass: 'dark-cancel-button',
      draggable: true,
      center: true,
      roundButton: true,
    })

    if (result === 'confirm') {
      await request({
        url: BASE_URL + '/mgn/aiSession/delete',
        method: 'DELETE',
        headers: {
          'X-Access-Token': token.value,
        },
        params: {
          id: sessionId,
        },
      })

      ElMessage({
        type: 'success',
        message: 'Deleted successfully',
        customClass: 'dark-message',
      })

      getSessionList()
    }
  } catch {
    // User cancelled deletion
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

    if (json.action === 'bindXSuccess') {
      ElMessage({
        type: 'success',
        message: 'Bind X successfully',
        customClass: 'dark-message',
      })
      location.reload()
    }
  } catch (e) {
    isJsonString = false
  }
}

// 添加更新会话名称的方法
const handleUpdateSession = async () => {
  try {
    await request({
      url: BASE_URL + '/mgn/aiSession/edit',
      method: 'POST',
      headers: {
        'X-Access-Token': token.value,
      },
      data: {
        id: activeSession.value.id,
        name: activeSession.value.name,
      },
    })

    // 更新成功后关闭编辑模式
    showSessionEdit.value = false
    // 可选：刷新会话列表
    getSessionList()
  } catch (error) {
    console.error('Update session failed:', error)
  }
}

async function handleSearchWeb(message: boolean) {
  options.value.enableAgent = message
}

function handleLogin() {
  if (loginRef.value) {
    loginRef.value.show()
  }
}

async function isPhotoOrCelebrity(question: string) {
  // Keywords related to celebrity photos
  const celebrityKeywords = replySearch.value?.['明信片'] || []

  // Keywords related to taking photos
  const photoKeywords = replySearch.value?.['拍照'] || []

  // Check for celebrity keywords
  const isCelebrity = celebrityKeywords.some((keyword: any) => {
    // For English words, compare in lowercase
    if (/^[a-zA-Z\s]+$/.test(keyword)) {
      return question.toLowerCase().includes(keyword.toLowerCase())
    }
    // For Chinese characters, compare directly
    return question.includes(keyword)
  })

  // Check for photo keywords
  const isPhoto = photoKeywords.some((keyword: any) => {
    if (/^[a-zA-Z\s]+$/.test(keyword)) {
      return question.toLowerCase().includes(keyword.toLowerCase())
    }
    return question.includes(keyword)
  })

  if (isCelebrity) {
    return 'celebrity'
  } else if (isPhoto) {
    return 'photo'
  }

  return 'other'
}

async function getAgentCount(online: boolean | null) {
  const { result } = await request({
    url: BASE_URL + '/mgn/agent/list',
    method: 'GET',
    params: {
      selectOnline: online,
      pageSize: 1,
    },
  })

  return result.total
}

async function unbindX() {
  try {
    const confirmResult = await ElMessageBox.confirm('Are you sure you want to unbind X?', 'Warning', {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: 'warning',
      customClass: 'dark-message-box',
      buttonSize: 'default',
      confirmButtonClass: 'dark-confirm-button',
      cancelButtonClass: 'dark-cancel-button',
      draggable: true,
      center: true,
      roundButton: true,
    })

    if (confirmResult === 'confirm') {
      await request({
        url: BASE_URL + '/mgn/agent/unbindX',
        method: 'GET',
        params: {
          sid: selectAgent.value.sid,
        },
        headers: {
          'X-Access-Token': token.value,
        },
      })
      location.reload()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage({
        type: 'error',
        message: 'Failed to unbind X',
      })
    }
  }
}

const toggleSessionPanel = () => {
  showSessionPanel.value = !showSessionPanel.value
  showContactPanel.value = true
}

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  showContactPanel.value = !showContactPanel.value

  // 当侧边栏展开时，默认显示agent list
  if (isSidebarCollapsed.value) {
    console.log('toggleAgentPanel', showContactPanel.value)
    toggleAgentPanel()
  }
}

// 按时间分组sessions的计算属性
const groupedSessions = computed(() => {
  if (!sessionList.value || sessionList.value.length === 0) {
    return []
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups = {
    today: { label: 'Today', sessions: [] },
    thisWeek: { label: 'This week', sessions: [] },
    thisMonth: { label: 'This month', sessions: [] },
    older: { label: 'Older', sessions: [] },
  }

  sessionList.value.forEach((session) => {
    const sessionDate = new Date(session.createdTime)

    if (sessionDate >= today) {
      groups.today.sessions.push(session)
    } else if (sessionDate >= thisWeek) {
      groups.thisWeek.sessions.push(session)
    } else if (sessionDate >= thisMonth) {
      groups.thisMonth.sessions.push(session)
    } else {
      groups.older.sessions.push(session)
    }
  })

  // 只返回有sessions的组
  return Object.values(groups).filter((group) => group.sessions.length > 0)
})
</script>
<template>
  <div class="home-view light">
    <!-- 参考截图的顶部导航栏设计 -->
    <div class="top-navbar">
      <div class="navbar-content">
        <div class="navbar-left">
          <!-- 参考截图的LOGO设计 -->
          <div class="logo-container" @click="goHome">
            <img src="/logo2.png" alt="Logo" class="logo-shape" />
          </div>
        </div>

        <!-- 将登录按钮移到logo旁边 -->
        <!-- <div v-if="!loginUser" class="user-login-btn" @click="handleLogin">
          <el-avatar :size="16" :src="user" style="border: none" fit="contain" />
          <span class="ml-1.25 text-black mobile:ml-0.5">Login In</span>
        </div>
        <el-dropdown v-else class="user-dropdown">
          <span class="el-dropdown-link flex items-center">
            <el-avatar :size="16" :src="loginUser.avatar || defAvatar" style="border: none" fit="contain" />

            <span class="ml-1.25 mobile:ml-0.5">
              <Substring :copys="false" color="#000000" fontSize="13px" :value="loginUser.walletAddress || loginUser.email"></Substring>
            </span>

            <el-icon size="13" class="el-icon--right mobile:hidden">
              <arrow-down />
            </el-icon>
          </span>
          <template #dropdown>
            <el-card class="w-50 bg-white text-black mobile:w-40" style="border: 1px solid #e5e7eb">
              <template #header>
                <div class="card-header flex items-center">
                  <el-avatar :size="25" :src="loginUser.avatar || defAvatar" fit="contain" />

                  <span class="ml-3.75 mobile:ml-2">
                    <Substring fontSize="12px" :value="loginUser.walletAddress || loginUser.email"></Substring>
                  </span>
                </div>
              </template>

              <p class="ml-1.25 flex items-center">
                <el-icon size="20" class="text-black">
                  <User />
                </el-icon>

                <el-button type="text" @click="goUser" style="color: black" class="text-xs text-black" link>Dashboard</el-button>
              </p>

              <p class="ml-1.25 flex items-center mt-7.5">
                <el-icon size="20" class="text-black flex-shrink-0">
                  <Message />
                </el-icon>

                <el-button type="text" @click="showBindEmail" style="color: black; white-space: nowrap; overflow: visible; text-overflow: unset" class="text-xs text-black ml-2 flex-shrink-0" link>
                  {{ loginUser.email || 'Bind Email' }}
                </el-button>
              </p>

              <p v-if="!loginUser.walletAddress" class="ml-1.25 flex items-center mt-7.5">
                <el-icon size="20">
                  <SvgIcon width="1.5em" height="1.5em" name="metamask" />
                </el-icon>
                <el-button type="text" @click="showBindAccount" class="text-xs text-black" link> Bind Wallet </el-button>
              </p>

              <p class="ml-1.25 flex items-center mt-7.5">
                <el-image :src="logoutPng" class="w-5 h-5"></el-image>

                <el-button type="text" @click="disconnect" style="color: black" class="text-xs text-black" link>Disconnect</el-button>
              </p>
            </el-card>
          </template> 
        </el-dropdown>-->
      </div>
    </div>

    <!-- Entire chat panel -->
    <div class="chat-panel" v-loading="loading">
      <!-- 在非移动端显示联系人列表 -->
      <div class="contact-panel border-r border-gray-300 bg-white h-full flex flex-col" :class="showContactPanel ? 'w-60' : 'w-20'">
        <div class="contact-panel-content relative">
          <!-- 菜单按钮 - 相对于contact-panel-content区域靠右 -->
          <div class="menu-toggle-btn" :class="{ 'menu-btn-collapsed': isSidebarCollapsed }" @click="toggleSidebar">
            <img src="@/assets/image/menu.png" alt="agent" style="width: 20px; height: 20px" />
          </div>
          <!-- 参考截图的侧边栏设计 - 始终显示图标 -->
          <div class="sidebar-icons" style="margin-top: 80px">
            <div class="icon-item agent-item" :class="{ selected: showAgentPanel }" @click="toggleAgentPanel">
              <img src="@/assets/agent.png" alt="agent" style="width: 20px; height: 20px" />
              <span v-if="showContactPanel" class="agent-text"
                >Agent List

                <span class="ml-10"
                  >(<span class="text-yellow-500">{{ agentCount.online }}</span
                  >/<span>{{ agentCount.total }}</span
                  >)</span
                >
              </span>
            </div>
          </div>
        </div>

        <!-- Agent List 面板 -->
        <div v-if="showContactPanel && showAgentPanel" class="w-60 border-r border-gray-200 p-4 flex flex-col h-full" style="background-color: #f9fafb">
          <div class="mb-4">
            <el-input v-model="searchQuery" placeholder="Search agents..." class="w-full search-input-no-border" :prefix-icon="Search"></el-input>
          </div>
          <div ref="contactListRef" class="h-[calc(75vh-140px)] overflow-y-auto custom-scrollbar" style="max-height: calc(90% - 180px)">
            <div class="space-y-2">
              <div v-for="agent in agentList" :key="agent.id" class="flex items-center space-x-3 p-2 bg-white hover:bg-gray-100 rounded-lg cursor-pointer transition-colors duration-200" :class="{ 'bg-gray-100': selectAgentId === agent.id }" @click="preHandleSelectAgent(agent)">
                <div class="relative">
                  <el-avatar :size="40" :src="agent.avatar" fit="contain" />
                  <div v-if="agent.tokenCount24h > 0" class="absolute bottom-0 right-0 w-3 h-3">
                    <img src="@/assets/online.png" alt="online" class="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <div class="text-black text-sm flex items-center">
                    {{ agent.nickName }}
                    <img v-if="agent.xname" src="../../assets/x.svg" alt="X" class="w-4 h-4 ml-6 mt-2" />
                  </div>
                </div>
              </div>

              <!-- Loading status -->
              <div v-if="loading" class="text-center py-4 text-gray-400">Loading...</div>

              <!-- No more data -->
              <div v-if="noMore && agentList.length > 0" class="text-center py-4 text-gray-400">No more data</div>

              <!-- No data -->
              <div v-if="!loading && agentList.length === 0" class="text-center py-4 text-gray-400">No data</div>
            </div>
          </div>
        </div>

        <!-- 用户信息区域 - 底部固定 -->
        <div v-if="showContactPanel" class="user-info-section mt-auto p-4 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <!-- 用户信息 -->
            <div class="flex items-center space-x-3">
              <!-- 用户头像 -->
              <div v-if="loginUser?.avatar" class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                <img :src="loginUser.avatar" alt="用户头像" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <img src="@/assets/image/user.png" alt="用户头像" class="w-full h-full object-cover" />
              </div>
              <!-- 用户详情 -->
              <div class="flex flex-col">
                <span class="text-gray-800 font-medium text-sm hover:text-black transition-colors duration-200">
                  {{ getUserDisplayName(loginUser) }}
                </span>
                <!-- 主要标识信息（钱包地址或邮箱）- 美化展示 -->
                <div v-if="getUserMainIdentifier(loginUser)" class="flex items-center mt-1">
                  <div class="flex items-center px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 cursor-pointer group" @click="handleEmailClick">
                    <span class="text-xs mr-1.5 group-hover:scale-110 transition-transform duration-200">
                      {{ getUserMainIdentifier(loginUser)?.icon }}
                    </span>
                    <span class="text-gray-600 text-xs font-medium transition-colors duration-200">
                      {{ getUserMainIdentifier(loginUser)?.display }}
                    </span>
                    <button @click="handleCopyClick($event, loginUser)" class="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer">
                      <img src="@/assets/image/copy.png" alt="copy" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 登录按钮 -->
            <button v-if="!loginUser" class="login-btn px-3 py-1.5 text-xs text-black" @click="handleLogin">Login</button>
          </div>
        </div>

        <!-- 邮箱弹窗 -->
        <Transition name="dropdown" appear>
          <div v-if="showEmailDropdown" class="email-dropdown fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-0 min-w-64 max-w-80 overflow-hidden backdrop-blur-sm" :style="{ left: emailDropdownPosition.x + 'px', top: emailDropdownPosition.y + 'px' }" @click.stop>
            <!-- 用户信息头部 -->
            <div class="bg-white px-6 py-5 border-b border-gray-200">
              <div class="flex items-center">
                <div v-if="loginUser?.avatar" class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center mr-4 ring-2 ring-white shadow-sm">
                  <img :src="loginUser.avatar" alt="用户头像" class="w-full h-full object-cover" />
                </div>
                <div v-else class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mr-4 ring-2 ring-white shadow-sm">
                  <span class="text-white font-semibold text-base">
                    {{ getUserInitials(loginUser) }}
                  </span>
                </div>
                <div class="flex flex-col flex-1 min-w-0 space-y-1">
                  <span class="text-gray-800 font-semibold text-base truncate">{{ getUserDisplayName(loginUser) }}</span>
                  <!-- 美化后的主要标识信息展示 -->
                  <div v-if="getUserMainIdentifier(loginUser)" class="flex items-center">
                    <span class="text-sm mr-2">{{ getUserMainIdentifier(loginUser)?.icon }}</span>
                    <span class="text-gray-600 text-sm truncate">{{ getUserMainIdentifier(loginUser)?.display }}</span>
                    <button @click="handleCopyClick($event, loginUser)" class="ml-2 text-xs text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded-full hover:bg-gray-200 transition-colors duration-200 cursor-pointer" title="复制到剪贴板"></button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作菜单 -->
            <div class="py-4">
              <!-- Dashboard -->
              <div class="flex items-center py-4 px-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 group" @click="goUser">
                <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4 group-hover:bg-gray-200 transition-colors">
                  <el-icon size="18" class="text-gray-600">
                    <User />
                  </el-icon>
                </div>
                <span class="text-base text-gray-700 font-medium group-hover:text-gray-800 transition-colors">Dashboard</span>
              </div>

              <!-- 绑定邮箱 -->
              <div class="flex items-center py-4 px-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 group" @click="showBindEmail">
                <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4 group-hover:bg-gray-200 transition-colors">
                  <el-icon size="18" class="text-gray-600">
                    <Message />
                  </el-icon>
                </div>
                <div class="flex flex-col flex-1 min-w-0 space-y-1">
                  <span class="text-base text-gray-700 font-medium group-hover:text-gray-800 transition-colors truncate">{{ loginUser?.email || 'Bind Email' }}</span>
                  <span v-if="loginUser?.email" class="text-sm text-gray-500 truncate">Manage email settings</span>
                </div>
              </div>

              <!-- 绑定钱包 -->
              <div v-if="!loginUser?.walletAddress" class="flex items-center py-4 px-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 group" @click="showBindAccount">
                <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4 group-hover:bg-gray-200 transition-colors">
                  <SvgIcon width="18" height="18" name="metamask" class="text-gray-600" />
                </div>
                <div class="flex flex-col flex-1 min-w-0 space-y-1">
                  <span class="text-base text-gray-700 font-medium group-hover:text-gray-800 transition-colors">Bind Wallet</span>
                  <span class="text-sm text-gray-500">Connect MetaMask</span>
                </div>
              </div>

              <!-- 分隔线 -->
              <div class="mx-6 my-4 border-t border-gray-100"></div>

              <!-- 断开连接 -->
              <div class="flex items-center py-4 px-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 group" @click="disconnect">
                <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-4 group-hover:bg-gray-200 transition-colors">
                  <el-image :src="logoutPng" class="w-5 h-5"></el-image>
                </div>
                <span class="text-base text-gray-700 font-medium group-hover:text-gray-800 transition-colors">Disconnect</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Session List 面板 - 独立容器 -->
      <div v-if="showSessionPanel && showContactPanel" class="w-65 border-r mt-[5rem] border-gray-200 flex flex-col h-auto ml-20" style="background-color: rgb(249, 250, 251)">
        <!-- 创建新会话按钮 -->
        <div class="mb-4 px-4">
          <div class="create-session-btn cursor-pointer flex items-center justify-start px-4 py-3 text-sm bg-blue-500 hover:bg-blue-600 rounded-lg border border-blue-500 transition-colors duration-200" @click="handleSessionCreate">
            <el-icon size="20" class="mr-2 text-black">
              <Edit />
            </el-icon>
            <span class="text-black">New Chat</span>
          </div>
        </div>

        <!-- 会话列表 -->
        <div class="h-[calc(75vh-140px)] overflow-y-auto custom-scrollbar px-4" style="max-height: calc(90% - 180px)">
          <div class="space-y-4">
            <!-- 按时间分组显示sessions -->
            <div v-for="group in groupedSessions" :key="group.label" class="session-group">
              <div class="group-label text-sm text-gray-500 mb-2 px-1">{{ group.label }}</div>
              <div class="space-y-1">
                <session-item v-for="session in group.sessions" :key="session?.id || Math.random()" :active="activeSession && session?.id === activeSession?.id" :session="session" class="session" @click="handleSelectSession(session)" @delete="handleDeleteSession(session?.id)" />
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="sessionList.length === 0" class="text-center py-8 text-gray-400">
              <div class="text-lg mb-2">No sessions yet</div>
              <div class="text-sm">Create your first session to get started</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 会话列表面板 - 已集成到左侧面板中，这里隐藏 -->
      <div v-if="false" class="session-panel" :class="{ collapsed: isSessionPanelCollapsed }">
        <div class="button-wrapper mt-20">
          <div class="flex items-center justify-between w-full">
            <div v-if="!isSessionPanelCollapsed" class="create-session-btn cursor-pointer flex items-center px-4 py-2 text-sm hover:bg-gray-700 rounded" @click="handleSessionCreate">
              <img src="../../assets/create.png" alt="create" class="create-icon w-5 h-5" />
            </div>
          </div>
        </div>

        <div class="session-list h-[calc(80vh-80px)] overflow-y-auto custom-scrollbar" v-if="activeSession && !isSessionPanelCollapsed">
          <session-item v-for="session in sessionList" :key="session.id" :active="session.id === activeSession.id" :session="session" class="session" @click="handleSelectSession(session)" @delete="handleDeleteSession(session.id)" />
        </div>

        <div class="option-panel" v-if="!isSessionPanelCollapsed">
          <el-form size="small" v-if="selectMyAgentId" class="rag-form">
            <el-form-item label-width="8.2rem" label="RAG Knowledge" class="form-item-align">
              <el-button class="ml-0" :style="{ backgroundColor: '#2d2736', color: 'white', border: 'aliceblue' }" @click="showUploadEmbedding">
                <img style="width: 15px; height: 15px" src="../../assets/docUpload.svg" alt="upload" />
              </el-button>
            </el-form-item>
            <el-form-item label="Enable Knowledge Base" class="form-item-align">
              <el-switch class="ml-0" v-model="options.enableVectorStore" style="--el-switch-on-color: #13ce66"></el-switch>
            </el-form-item>
            <el-form-item v-if="!selectAgent || !selectAgent.xname" label="Bind X" class="form-item-align">
              <el-button class="ml-0" :style="{ backgroundColor: '#2d2736', color: 'white', border: 'aliceblue' }" @click="handleBindTwitter">
                <img style="width: 15px; height: 15px" src="../../assets/bind.svg" alt="upload" />
              </el-button>
            </el-form-item>

            <el-form-item v-else label="Unbind X" class="form-item-align">
              <el-button class="ml-0" :style="{ backgroundColor: '#2d2736', color: 'white', border: 'aliceblue' }" @click="unbindX">
                <img style="width: 15px; height: 15px" src="../../assets/unbind.svg" alt="upload" />
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 消息面板 -->
      <div class="message-panel" :class="{ 'full-width': isSidebarCollapsed }">
        <!-- Session name -->
        <div class="header" v-if="activeSession">
          <!-- <div class="front">
            <div class="flex flex-col">
              <div class="flex items-center">
                <el-avatar :size="30" :src="selectAgent.avatar" class="mr-3" fit="contain" />
                <div class="flex flex-col ml-10">
                  <div class="flex items-center">
                    <span class="text-black text-base">{{ selectAgent.nickName }}</span>

                    <el-link v-if="!selectAgent.xname" class="flex items-center transition-all duration-300 hover:scale-105 ml-5 mt-2" @click="handleShareTwitter(selectAgent.sid)" :underline="false">
                      <el-icon size="18" class="text-blue-400 hover:text-blue-300 transition-colors duration-300">
                        <Share />
                      </el-icon>
                    </el-link>
                  </div>

                  <div v-if="selectAgent.xname" class="mt-3 flex items-start rounded-lg transition-all duration-300 hover:bg-gray-700/10">
                    <span class="text-gray-600 text-sm flex items-center group text-left">
                      <img src="../../assets/x.svg" alt="X" class="w-4 h-4 mr-2 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                      <a :href="`https://x.com/${selectAgent.xusername}`" target="_blank" class="font-medium truncate text-gray-600">@{{ selectAgent.xusername }}</a>
                    </span>
                    <el-link class="flex items-center transition-all duration-300 hover:scale-105 ml-5 mt-2" :underline="false" @click="handleShareTwitter(selectAgent.sid)">
                      <el-icon size="18" class="text-blue-400 hover:text-blue-300 transition-colors duration-300">
                        <Share />
                      </el-icon>
                    </el-link>
                  </div>
                </div>
              </div>
            </div>
          </div> -->
          <!-- Edit buttons at end -->
          <!-- <div class="flex items-center">
            <div class="rear">
              <el-icon :size="20" style="margin-right: 10px; color: black">
                <Delete @click="handleDeleteSession(activeSession.id)" />
              </el-icon>

              <el-icon :size="20" style="color: black" @click="handleEditSession">
                <EditPen v-if="!isEdit" />
                <Close v-else @click="handleCancelEdit" />
              </el-icon>
            </div>
            <div class="front">
              <div v-if="showSessionEdit" class="title flex-grow">
                <el-input v-model="activeSession.name" @keydown.enter="handleUpdateSession" @blur="handleUpdateSession"></el-input>
              </div>

              <div v-else class="title flex-grow">{{ activeSession.name }}</div>
            </div>
          </div> -->
        </div>
        <!-- <el-divider :border-style="'solid'" border-color="#666666" /> -->
        <div ref="messageListRef" class="message-list" style="background-color: rgb(249, 250, 251)" v-show="showChatList">
          <!-- Transition effect -->
          <transition-group name="list" v-if="activeSession && selectAgent">
            <message-row v-for="message in messageList" :defAgentAvatar="selectAgent.avatar" :avatar="message.avatar" :key="message.id" :message="message"></message-row>
          </transition-group>
        </div>

        <!-- 输入区域 - 有聊天记录时在底部，没有时居中 -->
        <div class="input-section" :class="{ 'input-section-bottom': showChatList }" v-if="activeSession && selectAgent">
          <!-- 添加 >.dancer 标题 - 只在没有聊天记录时显示 -->
          <template v-if="!showChatList">
            <div class="mb-50">
              <div class="dancer-title">Embod·i</div>
              <div class="dancer-title-sub">embodied, use anything</div>
            </div>
          </template>

          <message-input @send="preHandleSendMessage" :loading="sendLoading" @search="handleSearchWeb" :functionStatus="selectAgent.functionStatus"></message-input>
        </div>

        <div class="disclaimer-text">Dancer can make mistakes. &nbsp;Please monitor its work.</div>

        <Login ref="loginRef" />

        <UploadEmbedding ref="uploadEmbeddingRef"></UploadEmbedding>
      </div>
    </div>

    <IntroductionBindAccount ref="introductionBindAccountRef"></IntroductionBindAccount>
  </div>
</template>
<style lang="scss" scoped>
/* Montserrat-Bold 字体定义 */
@font-face {
  font-family: 'Montserrat-Bold';
  src: url('@/assets/font/Montserrat-Bold.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
}

/* 弹窗动画效果 */
.dropdown-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.98);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* 弹窗样式优化 */
.email-dropdown {
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

:deep .el-card {
  --el-card-border-color: #e4e7ed;
  --el-card-border-radius: 4px;
  --el-card-padding: 20px;
  --el-card-bg-color: var(--el-fill-color-blank);
  background-color: var(--el-card-bg-color);
  border: 1px solid var(--el-card-border-color);
  border-radius: var(--el-card-border-radius);
  color: var(--el-text-color-primary);
  overflow: hidden;
  transition: var(--el-transition-duration);
}

:deep .el-input-group__append {
  border-left: 0;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  box-shadow:
    0 0 0 0 var(--el-input-border-color) inset,
    0 0 0 0 var(--el-input-border-color) inset,
    0 0 0 0 var(--el-input-border-color) inset;
}

:deep .el-menu--horizontal {
  display: flex;
  flex-wrap: nowrap;
  border-bottom: solid 0px var(--el-menu-border-color);
  border-right: none;
}

.search-wrapper {
  margin-bottom: 20px;

  :deep(.el-card__body) {
    padding-bottom: 2px;
  }
}

.toolbar-wrapper {
  justify-content: space-between;
  margin-bottom: 20px;
}

.table-wrapper {
  margin-bottom: 20px;
}

.disclaimer-text {
  text-align: center;
  margin-top: 12px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  opacity: 0.8;
  white-space: normal;
  word-break: break-word;
  display: block;
}

.pager-wrapper {
  display: flex;
  justify-content: flex-end;
}

.time {
  font-size: 12px;
  color: #999;
}

.bottom {
  margin-top: 13px;
  line-height: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.button {
  padding: 0;
  min-height: auto;
}

.image {
  width: 400px;
  height: 200px;
  display: block;
}

::v-deep .el-dropdown-link--active,
::v-deep .el-dropdown-link:active,
::v-deep .el-dropdown-link:focus {
  outline: none;
  border: none;
  box-shadow: none;
}

.el-dropdown-link {
  font-size: 14px;

  padding-left: 6%;
}

.loading-indicator {
  text-align: center;
  padding: 10px;
  font-size: 16px;
  color: #303133;
}

:deep(.el-divider--horizontal) {
  border-top: none;
  display: block;
  height: 1px;
  margin: 24px 0;
  width: 100%;
}

:deep(.el-form-item--small .el-form-item__label) {
  height: 24px;
  line-height: 24px;
  color: black;
}

.home-view {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  overflow: hidden;

  .top-navbar {
    width: 100%;
    height: 60px;
    background-color: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    padding: 0 20px;

    .navbar-content {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .navbar-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .logo-container {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          opacity: 0.8;
        }

        .logo-shape {
          width: 10rem;
          height: 5rem;
          object-fit: contain;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #000000;
          letter-spacing: 0.5px;
        }
      }
    }
  }

  .chat-panel {
    margin: 0 auto;
    width: 100%;
    display: flex;
    background-color: #ffffff;
    height: calc(100vh - 60px);
    margin-top: 60px;
    overflow: hidden;

    .session-panel {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      padding: 10px;
      position: relative;
      border-right: none;
      background-color: #f8f9fa;
      height: 100%;
      overflow: hidden;
      width: 64px;
      transition: width 0.3s ease;

      &.collapsed {
        width: 40px;
      }

      &:not(.collapsed) {
        width: 350px;
      }

      .button-wrapper {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 10px 0;
      }

      .toggle-panel-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.3s ease;
        background-color: #ffffff;
        cursor: pointer;
        margin: 0;
        padding: 0;
        border: none;
        outline: none;

        &:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }

        .el-icon {
          color: black;
          font-size: 20px;
        }
      }

      .create-session-btn {
        margin-left: auto;
      }

      .session-list {
        overflow-y: scroll;
        margin: 20px 0;
        flex: 1;

        .session {
          /* Space between sessions */
          margin-top: 20px;
        }

        .session:first-child {
          margin-top: 0;
        }
      }
    }

    /* Right message history panel */
    .message-panel {
      width: 1200px;
      max-width: 1200px;
      height: calc(100vh - 60px); /* 设置高度为视口高度减去顶部导航栏高度 */
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      touch-action: none;
      -webkit-overflow-scrolling: none;
      overscroll-behavior: none;
      -webkit-overscroll-behavior: none;
      align-items: center;
      justify-content: center; /* 添加垂直居中 */
      background-color: #ffffff;
      transition: width 0.3s ease;
      margin: 0 auto;

      &.full-width {
        width: 1200px;
        max-width: 1200px;
      }

      .header {
        padding: 20px 20px 0 20px;
        display: flex;
        /* Session name and edit button distributed left and right horizontally */
        justify-content: space-between;

        /* Front title and message count */
        .front {
          .title {
            color: rgba(0, 0, 0, 0.7);
            font-size: 16px;
          }

          .description {
            margin-top: 10px;
            color: rgba(0, 0, 0, 0.5);
          }
        }

        /* Edit and cancel edit buttons at end */
        .rear {
          display: flex;
          align-items: center;
        }
      }

      .message-list {
        padding: 20px;
        padding-bottom: 120px;
        width: 100%;
        flex: 1;
        box-sizing: border-box;
        margin: 0 auto;
        overflow-y: auto;
        overflow-x: hidden;
        touch-action: pan-y;
        max-width: 96%;
        scroll-behavior: smooth;
        overscroll-behavior: none;
        -webkit-overscroll-behavior: none;
        background-color: #ffffff;
        position: relative;
      }
    }

    // Options panel
    .option-panel {
      width: 100%;
      padding: 20px;
      border-left: none;

      .upload {
        width: 160px;
      }
    }
  }
}

// Global scrollbar hiding
:deep(*) {
  &::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

// Hide scrollbars for message list
.message-list {
  &::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

// Hide scrollbars for session list
.session-list {
  &::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

// Hide scrollbars for contact list
.contact-panel {
  position: relative;
  &::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  transition:
    width 0.3s ease,
    padding 0.3s ease;

  &.w-0 {
    width: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    border-right: none !important;
  }

  .menu-toggle-btn {
    position: absolute !important;
    top: 40px !important;
    right: 20px !important;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #6b7280;
    z-index: 1001;

    &:hover {
      background-color: #f3f4f6;
      border-color: #d1d5db;
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    &.menu-btn-collapsed {
      top: 40px !important;
      right: -12px !important;
      justify-content: center;

      &:hover {
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        border-color: transparent !important;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .sidebar-icons {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 20px 16px;
    gap: 16px;

    // margin-top 由 Tailwind/UnoCSS 类控制

    // 当侧边栏收起时，移除背景色
    .contact-panel:not(.w-60) & {
      background-color: transparent !important;
    }
  }

  // 使用 :deep() 穿透 scoped CSS 来覆盖收起状态的背景色
  :deep(.contact-panel:not(.w-60) .sidebar-icons) {
    background-color: transparent !important;
  }

  .icon-item {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #6b7280;

    &:hover {
      background-color: #e5e7eb;
      color: #374151;
    }

    &.active {
      background-color: #3b82f6;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
    }

    &.agent-item {
      width: auto;
      padding: 0 12px;
      gap: 8px;
    }

    .agent-text {
      font-size: 14px;
      color: #374151;
      white-space: nowrap;
    }
  }
}

// Hide scrollbars for drawer content
.drawer-content {
  &::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

// Hide scrollbars for el-select dropdown
:deep(.el-select-dropdown__wrap) {
  &::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

// 可以添加选中状态的过渡效果
.transition-colors {
  transition: background-color 0.2s ease;
}

:deep(.option-form) {
  .el-form-item {
    margin-bottom: 12px;

    .el-form-item__label {
      justify-content: flex-start;
      padding-right: 8px;
    }
  }

  .el-button {
    margin-left: 0;
  }

  .el-switch {
    margin-left: 0;
  }
}

:deep(.el-input) {
  .el-input__wrapper {
    background-color: #ffffff !important;
    background-color: #ffffff;
    box-shadow: 0 0 0 1px #d1d5db inset !important;
    border: 1px solid #d1d5db !important;

    &.is-focus {
      box-shadow: 0 0 0 1px #3b82f6 inset !important;
      border: 1px solid #3b82f6 !important;
    }

    &:hover {
      box-shadow: 0 0 0 1px #9ca3af inset !important;
      border: 1px solid #9ca3af !important;
    }
  }

  .el-input__inner {
    color: black !important;

    &::placeholder {
      color: #9ca3af;
    }
  }
}

// 取消搜索输入框的边框
:deep(.search-input-no-border) {
  .el-input__wrapper {
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;

    &.is-focus {
      box-shadow: none !important;
      border: none !important;
    }

    &:hover {
      box-shadow: none !important;
      border: none !important;
    }
  }
}

.rag-form {
  :deep(.form-item-align) {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .el-form-item__label {
      justify-content: flex-start;
    }

    .el-form-item__content {
      margin-left: auto !important;
      justify-content: flex-end;
    }
  }
}

:deep(.el-select) {
  .el-input__wrapper {
    background-color: #ffffff !important;
    box-shadow: 0 0 0 1px #d1d5db inset !important;
    border: 1px solid #d1d5db !important;

    &:hover {
      box-shadow: 0 0 0 1px #9ca3af inset !important;
      border: 1px solid #9ca3af !important;
    }

    &.is-focus {
      box-shadow: 0 0 0 1px #3b82f6 inset !important;
      border: 1px solid #3b82f6 !important;
    }
  }

  .el-input__inner {
    color: #000000 !important;

    &::placeholder {
      color: #9ca3af;
    }
  }
}

:deep(.el-select-dropdown) {
  background-color: #ffffff !important;
  border: 1px solid #d1d5db;

  .el-select-dropdown__item {
    color: #000000;

    &:hover {
      background-color: #f3f4f6;
    }

    &.selected {
      color: #3b82f6;
      background-color: #f3f4f6;
    }
  }
}

.dark-select {
  .el-input__wrapper {
    background-color: #ffffff !important;
    box-shadow: 0 0 0 1px #d1d5db inset;

    &:hover {
      box-shadow: 0 0 0 1px #3b82f6 inset;
    }

    &.is-focus {
      box-shadow: 0 0 0 1px #3b82f6 inset;
    }
  }

  .el-input__inner {
    color: #000000 !important;

    &::placeholder {
      color: #9ca3af;
    }
  }
}

:deep(.dark-option) {
  background-color: #ffffff !important;
  color: #000000 !important;
  margin-top: 50px;

  &:hover {
    background-color: #f3f4f6 !important;
  }

  &.selected {
    color: #3b82f6 !important;
    background-color: #f3f4f6 !important;
  }
}

// 添加全局浅色模式样式
.light {
  .el-drawer {
    :deep {
      background-color: #ffffff;
    }

    :deep(.el-drawer__header) {
      background-color: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 0;
      padding: 12px 16px;
      color: black;
    }
  }

  .el-card {
    :deep {
      background-color: #ffffff;
      border-color: #e5e7eb;
    }

    :deep(.el-card__header) {
      border-bottom-color: #e5e7eb;
    }
  }
}

// 自定义滚动条样式
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #d1d5db #f3f4f6;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: #f3f4f6;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 4px;
  }
}

// 消息列表过渡动画
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.toggle-btn {
  background: transparent;
  border: none;
  padding: 0;
  color: #303133;

  &:hover {
    background: transparent;
    color: #409eff;
  }
}

.dark-button {
  background-color: #ffffff !important;
  border-color: #d1d5db !important;
  color: black !important;

  &:hover {
    background-color: #f3f4f6 !important;
    border-color: #3b82f6 !important;
  }

  &:active {
    background-color: #f3f4f6 !important;
    border-color: #3b82f6 !important;
  }
}

.user-dropdown {
  background-color: #f3f4f6;
  border-radius: 9999px;
  height: 28px;
  width: 160px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #e5e7eb;
  }
}

.user-login-btn {
  background-color: #f3f4f6;
  border-radius: 9999px;
  height: 28px;
  width: 160px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #e5e7eb;
  }
}

.create-session-btn {
  margin: 0;
  transition: all 0.2s ease;
  border: 1px solid #d1d5db;
  background-color: #ffffff;

  img {
    transition: transform 0.3s ease;
  }

  &:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;

    img {
      transform: rotate(90deg);
    }
  }

  &:active {
    background-color: #f3f4f6;
    transform: scale(0.98);
  }
}

// 用户信息区域样式
.user-info-section {
  background-color: #f9fafb;
  border-top: 1px solid #e5e7eb;

  .upgrade-btn {
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

// Add styles for the message input container
.message-input-container {
  position: sticky;
  bottom: 0;
  width: 100%;
  background-color: #ffffff;
  padding: 15px;
  z-index: 10;
}

// 输入区域样式
.input-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 20px;
  background-color: #ffffff;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;

  // 当有聊天记录时，输入框显示在底部
  &.input-section-bottom {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    margin-top: auto;
    padding-top: 20px;
    padding-bottom: 20px;
  }
}

// >.dancer 标题样式
.dancer-title {
  font-family: 'Montserrat-Bold', sans-serif;
  font-size: 48px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
  text-align: center;
  letter-spacing: -0.025em;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dancer-title-sub {
  font-size: 28px;
  font-weight: 200;
  color: black;
  margin-bottom: 24px;
  text-align: center;
  letter-spacing: 0.05em;
  line-height: 1.4;
  text-transform: lowercase;
  opacity: 0.9;
}
</style>
