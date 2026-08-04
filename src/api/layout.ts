import { request, HeadersContentType } from '@/utils/request'
import type { ResponseData, GetAsyncRouterParams, GetUserInfoParams } from '@/type/layout'

export function getAsyncRouterAPI(params: GetAsyncRouterParams) {
    return request<ResponseData<unknown>>({
        url: '/getAppMenu',
        method: 'get',
        headers: {
            'Content-Type': HeadersContentType.urlencoded
        },
        params
    })
}
// getUserInfo
export function getUserInfoAPI(params: GetUserInfoParams) {
    return request<ResponseData<unknown>>({
        url: '/getUserInfo',
        method: 'get',
        headers: {
            'Content-Type': HeadersContentType.urlencoded
        },
        params
    })
}