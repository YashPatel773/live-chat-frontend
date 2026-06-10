import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// ASYNC ACTION: Fetch user list from Laravel database
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (_, { rejectWithValue }) => {
    try {
        const response = await api.get('/users');
        console.log({response});
        
        return response.data; // Returns array of users from ChatController@getUsers
    } catch (error) {
        return rejectWithValue(error.response?.data || 'Failed to load users');
    }
});

const usersSlice = createSlice({
    name: 'users',
    initialState: {
        list: [],
        onlineUserIds: [], // Stores clean array of active user database IDs: ['1', '5']
        loading: false,
    },
    reducers: {
        // Triggered dynamically whenever Node.js broadcasts the 'getOnlineUsers' event
        setOnlineUsers: (state, action) => {
            state.onlineUserIds = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => { state.loading = true; })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchUsers.rejected, (state) => { state.loading = false; });
    }
});

export const { setOnlineUsers } = usersSlice.actions;
export default usersSlice.reducer;