import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../redux/authSlice';
import usersReducer from '../redux/usersSlice';
import chatReducer from '../redux/chatSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        users: usersReducer,
        chat: chatReducer,
    },
});