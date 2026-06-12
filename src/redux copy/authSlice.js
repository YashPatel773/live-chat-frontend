
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

// 1. ASYNC ACTION: Handle user login request to Laravel
export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { rejectWithValue }) => {
    try {
        const response = await api.post('/login', credentials);
        console.log({response});
        
        // Save token and user details to browser storage so they stay logged in on refresh
        localStorage.setItem('chat_token', response.data.access_token);
        localStorage.setItem('chat_user', JSON.stringify(response.data.user));
        
        // Start live real-time connection
        connectSocket(response.data.user);
        
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
});

// 2. ASYNC ACTION: Handle registration request to Laravel
export const registerUser = createAsyncThunk('auth/registerUser', async (userData, { rejectWithValue }) => {
    try {
        const response = await api.post('/register', userData); 
        
        
        localStorage.setItem('chat_token', response.data.access_token);
        localStorage.setItem('chat_user', JSON.stringify(response.data.user));
        
        connectSocket(response.data.user);
        
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response?.data?.errors || 'Registration failed');
    }
});

// 3. THE SLICE ARCHITECTURE
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: JSON.parse(localStorage.getItem('chat_user')) || null,
        token: localStorage.getItem('chat_token') || null,
        loading: false,
        error: null,
    },
    reducers: { 
        logout: (state) => {
            localStorage.removeItem('chat_token');
            localStorage.removeItem('chat_user');
            disconnectSocket();  
            state.user = null;
            state.token = null;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Login lifecycle states
            .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.access_token;
            })
            .addCase(loginUser.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
            
            // Register lifecycle states
            .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.access_token;
            })
            .addCase(registerUser.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
    }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;