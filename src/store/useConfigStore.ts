import { create } from 'zustand'
interface ConfigStore {
    isTheme: 'light' | 'dark'
    setIsTheme: (config: 'light' | 'dark') => void
}
const useConfigStore = create<ConfigStore>((set) => ({
    isTheme: 'light',
    setIsTheme: (isTheme) => set(() => ({ isTheme })),
}))

export default useConfigStore