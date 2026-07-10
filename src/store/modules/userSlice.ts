import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getUserInfoAPI } from '@/api/layout'
import type { GetUserInfoParams, UserInfo } from '@/type/layout'

interface UserState {
    userInfo: UserInfo | null;
    token: string;
    // 增加请求状态，方便组件判断 loading 或 error
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}
// 1. 定义异步 Thunk
export const getUserInfoByToken = createAsyncThunk(
    'user/getUserInfoByToken',
    async (params: GetUserInfoParams, { rejectWithValue }) => {
        try {
            // 发起网络请求
            const response = await getUserInfoAPI(params);
            return response.data.data; // 返回的数据会自动传递给 fulfilled action
        } catch (error) {
            // 请求失败时，将错误信息传递给 rejected action
            return rejectWithValue('获取用户信息失败');
        }
    }
)

const initialState: UserState = {
    userInfo: {} as UserInfo,
    token: localStorage.getItem('token') || '',
    status: 'idle',
    error: null
}
const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserInfo: (state, action) => {
            state.userInfo = action.payload
        },
        setToken: (state, action) => {
            state.token = action.payload
        }
    },
    // 2. 处理 createAsyncThunk 产生的生命周期 action
    extraReducers: (builder) => {
        builder
            .addCase(getUserInfoByToken.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(getUserInfoByToken.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.userInfo = JSON.parse(action.payload as string);
            })
            .addCase(getUserInfoByToken.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
})
export const { setUserInfo, setToken } = userSlice.actions
export default userSlice.reducer