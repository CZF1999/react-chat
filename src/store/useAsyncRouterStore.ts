import { create } from 'zustand'
import { getAsyncRouterAPI } from '@/api/layout'
import { devtools } from 'zustand/middleware'
import type { GetAsyncRouterParams, RouterItem } from '@/type/layout'
interface AsyncRouterStore {
    asyncRouter: RouterItem[];
    setAsyncRouter: (asyncRouter: RouterItem[]) => void;
    getAsyncRouter: (params: GetAsyncRouterParams) => Promise<void>;
}
const useAsyncRouterStore = create<AsyncRouterStore>()(
    devtools(
        (set) => ({
            asyncRouter: [],
            setAsyncRouter: (asyncRouter) => set(() => ({ asyncRouter })),
            getAsyncRouter: async (params: GetAsyncRouterParams) => {
                const res = await getAsyncRouterAPI(params)
                try {
                    const parsed = JSON.parse(res.data.data as string)
                    const menu = JSON.parse(parsed.menu)
                    set(() => ({ asyncRouter: menu }))
                } catch (e) {
                    console.error('解析路由数据失败:', e)
                }
            }
        }),
        { name: 'AsyncRouterStore' }
    )
)

export default useAsyncRouterStore;