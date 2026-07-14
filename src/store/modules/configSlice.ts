import { createSlice } from '@reduxjs/toolkit'
interface ConfigState {
    isCollapse: boolean,
    isFullScreen: boolean,
    isLockScreen: boolean,
    lockPasswd: string,
    lockTime: number,
    tagNavList: any[],
    tagNavListCache: any[],
    theme: string,
    pageOpenedList: any[],
    currentPageName: string
}
const initialState: ConfigState = {
    isCollapse: false,
    isFullScreen: false,
    isLockScreen: false,
    lockPasswd: '',
    lockTime: 0,
    tagNavList: [],
    tagNavListCache: [],
    theme: 'theme-red',
    pageOpenedList: [],
    currentPageName: ''
}
export const configSlice = createSlice({
    name: 'config',
    initialState,
    reducers: {
        setCollapse: (state, action) => {
            state.isCollapse = action.payload
        },
        setFullScreen: (state, action) => {
            state.isFullScreen = action.payload
        },
        setLockScreen: (state, action) => {
            state.isLockScreen = action.payload
        },
        setLockPasswd: (state, action) => {
            state.lockPasswd = action.payload
        }
    },
})
export default configSlice.reducer
export const { setFullScreen, setLockScreen, setLockPasswd } = configSlice.actions