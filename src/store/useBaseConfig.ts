import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
interface BaseConfigStore {
    location: string;
    setLocation: (value: string) => void
}
const useBaseConfigStore = create<BaseConfigStore>()(
    devtools(
        persist(
            (set) => ({
                location: '',
                setLocation: (value: string) => set(() => ({ location: value })),
            }),
            {
                name: 'base-config', // 必须指定存储的 key 名称
            }
        )
    )
)

export default useBaseConfigStore