import { create } from 'zustand'
import { getAsyncRouterAPI } from '@/api/layout'
import type { GetAsyncRouterParams, RouterItem } from '@/type/layout'
interface AsyncRouterStore {
    asyncRouter: [];
    setAsyncRouter: (asyncRouter: RouterItem[]) => void;
    getAsyncRouter: (params: GetAsyncRouterParams) => Promise<void>;
}
const useAsyncRouterStore = create<AsyncRouterStore>((set) => ({
    asyncRouter: [],
    setAsyncRouter: () => set(() => ({ asyncRouter: [] })),
    getAsyncRouter: async (params: GetAsyncRouterParams) => {
        const res = await getAsyncRouterAPI(params)
        set(() => ({ asyncRouter: JSON.parse(JSON.parse(res.data.data as string).menu) }))
    }
}))

export default useAsyncRouterStore;