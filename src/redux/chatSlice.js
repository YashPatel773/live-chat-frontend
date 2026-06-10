import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

// 1. ASYNC ACTION: Load historical conversation data from MySQL
export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (receiverId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/messages/${receiverId}`);
      return response.data.messages;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to load chat history",
      );
    }
  },
);

// 2. ASYNC ACTION: Post a new message out to Laravel API
export const sendNewMessage = createAsyncThunk(
  "chat/sendNewMessage",
  async ({ receiverId, message }, { rejectWithValue }) => {
    try {
      const response = await api.post("/messages", {
        receiver_id: receiverId,
        message,
      });
      return response.data.message; // Returns newly generated DB row object
    } catch (error) {
      return rejectWithValue(error.response?.data || "Message failed to send");
    }
  },
);

// export const markAsSeen = createAsyncThunk(
//   "chat/markAsSeen",
//   async ({ senderId }) => {
//     try {
//       const response = await api.post(`/messages/seen/${senderId}`, {
//         receiver_id: receiverId,
//       });
//       return response.data.message;
//     } catch (error) {
//       console.log(error);
//     }
//   },
// );

export const markAsSeen = createAsyncThunk(
  "chat/markAsSeen",
  async (senderId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/messages/seen/${senderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to mark messages as seen",
      );
    }
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    activeUser: null, // User object you are currently messaging
    messages: [], // Message array for active viewport window
    isTyping: false, // Tracks if active user is typing to you
    loading: false,
    unreadCounts: {}, // Track real-time unread badge counts for each sender
  },
  reducers: {
    // Change current conversation focus target
    setActiveUser: (state, action) => {
      // Only change active user and clear messages if the clicked user is different
      if (
        !state.activeUser ||
        String(state.activeUser.id) !== String(action.payload.id)
      ) {
        state.activeUser = action.payload;
        state.messages = [];
        state.isTyping = false;
      }
      // Reset unread count for the opened chat
      if (action.payload) {
        const userId = String(action.payload.id);
        state.unreadCounts[userId] = 0;
      }
    },

    receiveMessage: (state, action) => {
      // Push message to active layout ONLY if it belongs to current conversation thread
      if (
        state.activeUser &&
        (String(action.payload.sender_id) === String(state.activeUser.id) ||
          String(action.payload.receiver_id) === String(state.activeUser.id))
      ) {
        state.messages.push(action.payload);
      } else {
        // Message is from a background user — increment their unread badge count
        const senderId = String(action.payload.sender_id);
        state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
      }
    },
    // Update typing indicator state flag dynamically
    setTypingStatus: (state, action) => {
      if (
        state.activeUser &&
        String(action.payload.senderId) === String(state.activeUser.id)
      ) {
        state.isTyping = action.payload.isTyping;
      }
    },
    // Add markMessagesSeen Reducer
    markMessagesSeen: (state, action) => {
      const { receiverId } = action.payload;
      console.log(
        "[Redux] markMessagesSeen reducer called. receiverId:",
        receiverId,
        "activeUser:",
        state.activeUser?.id,
      );
      // If we are currently chatting with the user who viewed the messages,
      // update all messages we sent to them to is_seen = true
      if (
        state.activeUser &&
        String(state.activeUser.id) === String(receiverId)
      ) {
        let count = 0;
        state.messages.forEach((msg) => {
          if (String(msg.receiver_id) === String(receiverId)) {
            msg.is_seen = true;
            count++;
          }
        });
        console.log(
          `[Redux] Marked ${count} messages as seen in active conversation.`,
        );
      } else {
        console.log(
          "[Redux] markMessagesSeen: receiverId does not match activeUser or activeUser is null.",
        );
      }
    },
  },

  extraReducers: (builder) => {
    builder

      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.loading = false;
      })

      .addCase(sendNewMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload); // Add our own successfully saved message to view
      });
  },
});

export const {
  setActiveUser,
  receiveMessage,
  setTypingStatus,
  markMessagesSeen,
} = chatSlice.actions;
export default chatSlice.reducer;
