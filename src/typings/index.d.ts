// 定义本地类型替代 @/apis 引入
export type MenuDto = {
  'MenuRepository/SIMPLE_FETCHER': {
    id: string
    name: string
    // 添加其他需要的属性
  }
}

export type EditMode = 'CREATE' | 'UPDATE'
export interface Scope<T> {
  row: T
  $index: number
}

export interface Result<T> {
  code: number
  success: boolean
  msg: string
  result: T
}
export type MenuTreeDto = {
  children?: MenuTreeDto[]
} & MenuDto['MenuRepository/SIMPLE_FETCHER']
