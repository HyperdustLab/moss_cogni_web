import { request } from '@/utils/request'

// 简单的 API 客户端替代生成的 Api 类
export const api = {
  userController: {
    userInfo: async (): Promise<any> => {
      // TODO: 实现实际的 API 调用
      throw new Error('API 调用需要重新实现')
    },
    register: async (params: { body: any }): Promise<any> => {
      // TODO: 实现实际的 API 调用
      throw new Error('API 调用需要重新实现')
    },
  },
  aiSessionController: {
    save: async (params: { body: any }): Promise<{ result: string }> => {
      // TODO: 实现实际的 API 调用
      throw new Error('API 调用需要重新实现')
    },
    findById: async (params: { id: string }): Promise<{ result: any }> => {
      // TODO: 实现实际的 API 调用
      throw new Error('API 调用需要重新实现')
    },
    delete: async (params: { body: string[] }): Promise<void> => {
      // TODO: 实现实际的 API 调用
      throw new Error('API 调用需要重新实现')
    },
  },
  aiMessageController: {
    deleteHistory: async (params: { sessionId: string }): Promise<void> => {
      // TODO: 实现实际的 API 调用
      throw new Error('API 调用需要重新实现')
    },
  },
}
