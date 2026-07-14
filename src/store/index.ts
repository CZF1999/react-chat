import { configureStore } from '@reduxjs/toolkit'
import userReducer from './modules/userSlice'
import configReducer from './modules/configSlice'

export const store = configureStore({
    reducer: {
        user: userReducer,
        config: configReducer
    }
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch