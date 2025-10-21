import { request } from '@/utils/request'

export const api = {
  getUserInfo: () => {
    return request({
      url: '/api/user/info',
      method: 'get',
    })
  },
}
