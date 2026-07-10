export interface GetAjglListParams {
    slsj?: string;
    ajlbdm?: string;
    dqbh?: string;
    pageNum: number;
    pageSize: number;
}

export interface AjglListData<T> {
    endRow: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
    list: T[];
    navigateFirstPage: number;
    navigateLastPage: number;
    navigatePages: number;
    nextPage: number;
    pageNum: number;
    pageSize: number;
    pages: number;
    prePage: number;
    size: number;
    startRow: number;
    total: number;
    navigatepageNums: number[];

}

export interface AjglListItem {
    ajbh: string;
    ajlbmc: string;
    ajmc: string;
    ajztmc: string;
    bary_xm: string;
    cjrmc: string;
    cjsj: string;
    id: number;
    jjsj: string;
    sfjxwz: string;
    sjly: string;
    sjlymc: string;
    xgsj: string;
}

export interface CjajListItem {
    ajbh: string;
    ajlbmc: string;
    ajmc: string;
    ajztdm: string;
    ajztmc: string;
    bary_xm: string;
    bm12: string;
    cjrmc: string;
    cjsj: string;
    hbnum: number;
    id: number;
    jij_xm: string;
    jjsj: string;
    sfgd: string;
    sfjxwz: string;
    sjlx: string;
    sjly: string;
    xgsj: string;
    xsnum: number;
}

export interface GetCjajListParams {
    ajmc: string;
    ajbh: string;
    kssj: string;
    jssj: string;
    ajlbdm: string;
    pageNum: number;
    pageSize: number;
}

export interface DelCjajParams {
    ids: number | number[];
    sfscsj: string;
}