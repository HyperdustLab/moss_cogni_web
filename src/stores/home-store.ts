import { defineStore } from 'pinia'
import { ref } from 'vue'
// 定义本地类型替代 @/apis 引入
export type UserDto = {
  'UserRepository/FETCHER': {
    id: string
    username: string
    // 添加其他需要的用户属性
  }
}
import { api } from '@/utils/api-instance'

export const useHomeStore = defineStore('home', () => {
  const userInfo = ref<UserDto['UserRepository/FETCHER']>()
  const getUserInfo = async () => {
    try {
      userInfo.value = await api.userController.userInfo()
      return userInfo.value
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // TODO: 处理错误，可能需要显示用户友好的错误消息
      return undefined
    }
  }
  const init = async () => {
    await getUserInfo()
  }
  const logout = () => {
    userInfo.value = undefined
  }
  return { userInfo, getUserInfo, init, logout }
})
