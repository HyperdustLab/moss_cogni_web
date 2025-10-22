import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const BASE_URL = import.meta.env.VITE_API_PREFIX
export const request = axios.create({
  baseURL: BASE_URL,
  timeout: 600000,
})

// 请求拦截器 - 为GET方法添加随机数参数
request.interceptors.request.use(
  (config) => {
    // 如果是GET请求，添加随机数参数防止缓存
    if (config.method === 'get') {
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2)

      // 如果已经有params，则添加随机数参数
      if (config.params) {
        config.params._t = timestamp
        config.params._r = random
      } else {
        config.params = {
          _t: timestamp,
          _r: random,
        }
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)
request.interceptors.response.use(
  (res) => {
    return res.data
  },
  ({ response }) => {
    console.info('response:', response)

    if (response.data.code === 10012) {
      localStorage.removeItem('X-Token')

      router.push('/')
      return
    }

    if (response.data.code !== 1 && response.data.code !== 401) {
      console.info()
      ElMessage.warning({ message: 'Request failed, please try again later' })
    }

    return Promise.reject(response.data)
  }
)
