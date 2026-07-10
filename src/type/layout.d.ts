export interface ResponseData<T> {
    code: string;
    data: T;
    message: string;
}

export interface RouterItem {
    id: string;
    pid: string;
    map: {
        yymc: string; // 菜单名称
        yymc: string; // 菜单名称
        zymc: string; // 按钮名称
        zyms: string; // 按钮描述
        ydzm: string; // 路由路径
        ydz: string; // 路由地址
        px: number; // 排序
        children?: RouterItem[]; // 子菜单
    };
}

export interface UserInfo {
    bmdm: string;
    bmmc: string;
    csny: string;
    rybh: string;
    ryjh: string;
    ryxb: string;
    ryxm: string;
}

export interface GetAsyncRouterParams {
    yydm: string;
}

export interface GetUserInfoParams {
    token: string;
}