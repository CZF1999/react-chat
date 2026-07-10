import { request, HeadersContentType } from '@/utils/request'
import type { ResponseData } from '@/type/layout'
import type { GetAjglListParams, GetCjajListParams, AjglListData, CjajListItem, AjglListItem, DelCjajParams } from '@/type/classification'

export function getAjglListAPI(data: GetAjglListParams) {
    return request<ResponseData<AjglListData<AjglListItem>>>({
        url: '/aj/selectList_ajgl',
        method: 'post',
        headers: {
            'Content-Type': HeadersContentType.urlencoded
        },
        data: data
    })
}

export function getCjajListAPI(data: GetCjajListParams) {
    return request<ResponseData<AjglListData<CjajListItem>>>({
        url: '/aj/selectList_cjaj',
        method: 'post',
        headers: {
            'Content-Type': HeadersContentType.urlencoded
        },
        data: data
    })
}

export function delCjajAPI(data: DelCjajParams) {
    return request<ResponseData<number>>({
        url: 'aj/del',
        method: 'post',
        headers: {
            'Content-Type': HeadersContentType.json
        },
        data: data
    })
}