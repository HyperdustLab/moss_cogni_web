import { request } from '@/utils/request'
import type * as Login from './types/login'

/** 获取登录验证码 */
export function getLoginCodeApi() {
  return request<Login.LoginCodeResponseData>({
    url: 'login/code',
    method: 'get',
  })
}

/** 登录并返回 Token */
export function loginApi(data: Login.LoginRequestData) {
  return request<Login.LoginResponseData>({
    url: 'users/login',
    method: 'post',
    data,
  })
}

/** 获取用户详情 */
export function getUserInfoApi() {
  return request<Login.UserInfoResponseData>({
    url: '/sys/getCurrUser',
    method: 'get',
  })
}

export async function getDictItems(dictCode: string) {
  const { result } = await request({ url: '/sys/dict/getDictItems/' + dictCode, method: 'get' })
  return result
}

export async function getDictText(dictCode: string, key: string) {
  const { result } = await request({ url: `/sys/dict/getDictText/${dictCode}/${key}`, method: 'get' })

  debugger
  return result
}
