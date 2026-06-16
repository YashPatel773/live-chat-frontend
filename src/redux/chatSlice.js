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

class TaskQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { task, resolve, reject } = this.queue[0];
      try {
        const result = await task();
        resolve(result);
        this.queue.shift();
      } catch (error) {
        reject(error);
        this.queue.shift();
      }
    }

    this.processing = false;
  }
}

const messageSendQueue = new TaskQueue();

const waitTillOnline = () => {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener("online", resolve, { once: true });
  });
};

const sendWithRetry = async (receiverId, message) => {
  let attempt = 0;
  while (true) {
    if (!navigator.onLine) {
      console.log(
        "[Offline] Message sending paused. Waiting for connection...",
      );
      await waitTillOnline();
      console.log("[Online] Connection restored. Retrying message send...");
    }

    try {
      const response = await api.post(
        "/messages",
        {
          receiver_id: receiverId,
          message,
        },
        {
          timeout: 10000, // 10 seconds timeout for slow networks
        },
      );
      return response.data.message;
    } catch (error) {
      attempt++;
      const isNetworkOrServerError =
        !error.response ||
        (error.response.status >= 500 && error.response.status <= 599);
      if (isNetworkOrServerError) {
        const backoffDelay = Math.min(attempt * 2000, 10000);
        console.log(
          `[Send Error] Network/server issue. Attempt ${attempt} failed. Retrying in ${backoffDelay / 1000}s...`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      } else {
        throw error;
      }
    }
  }
};

// 2. ASYNC ACTION: Post a new message out to Laravel API
export const sendNewMessage = createAsyncThunk(
  "chat/sendNewMessage",
  async ({ receiverId, message, tempId, senderId }, { rejectWithValue }) => {
    try {
      const result = await messageSendQueue.enqueue(async () => {
        return await sendWithRetry(receiverId, message);
      });
      return result;
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
export const clearSidebarChat = createAsyncThunk(
  "chat/clearSidebarChat",
  async (friendId, { rejectWithValue }) => {
    try {
      await api.post(`/messages/clear/${friendId}`);
      return friendId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to clear chat");
    }
  },
);

export const removeFriend = createAsyncThunk(
  "chat/removeFriend",
  async (friendId, { rejectWithValue }) => {
    try {
      await api.post(`/friend-request/remove`, { friend_id: friendId });
      return friendId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to remove friend");
    }
  },
);

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

export const deleteMessage = createAsyncThunk(
  "chat/deleteMessage",
  async ({ messageId, type }, { rejectWithValue }) => {
    try {
      await api.delete(`/messages/${messageId}`, { data: { type } });
      return { messageId, type };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Delete failed");
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
    typingUsers: {}, // key: senderId, value: boolean
    pendingQueue: [], // Track messages that are currently sending/pending
  },
  reducers: {
    // Change current conversation focus target
    // setActiveUser: (state, action) => {

    //   if (
    //     !state.activeUser ||
    //     String(state.activeUser.id) !== String(action.payload.id)
    //   ) {
    //     state.activeUser = action.payload;
    //     state.messages = [];
    //   }
    //   // Reset unread count for the opened chat
    //   if (action.payload) {
    //     const userId = String(action.payload.id);
    //     state.unreadCounts[userId] = 0;
    //   }
    // },

    setActiveUser: (state, action) => {
      if (action.payload === null) {
        state.activeUser = null;
        state.messages = [];
        return;
      }

      if (
        !state.activeUser ||
        String(state.activeUser.id) !== String(action.payload.id)
      ) {
        state.activeUser = action.payload;
        state.messages = [];
      }

      // Reset unread count for the opened chat
      const userId = String(action.payload.id);
      state.unreadCounts[userId] = 0;
    },

    receiveMessage: (state, action) => {
      if (
        state.activeUser &&
        (String(action.payload.sender_id) === String(state.activeUser.id) ||
          String(action.payload.receiver_id) === String(state.activeUser.id))
      ) {
        state.messages.push(action.payload);
      } else {
        const senderId = String(action.payload.sender_id);
        state.unreadCounts[senderId] = (state.unreadCounts[senderId] || 0) + 1;
      }
    },
    // Update typing indicator state flag dynamically
    setTypingStatus: (state, action) => {
      const { senderId, isTyping } = action.payload;
      state.typingUsers[String(senderId)] = isTyping;
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
    removeMessage: (state, action) => {
      // action.payload = { messageId, type }
      // 'everyone' removes for both sides, 'me' only removes locally
      state.messages = state.messages.filter(
        (msg) => msg.id !== action.payload.messageId,
      );
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(deleteMessage.fulfilled, (state, action) => {
        state.messages = state.messages.filter(
          (msg) => msg.id !== action.payload.messageId,
        );
      })
      .addCase(clearSidebarChat.fulfilled, (state, action) => {
        if (
          state.activeUser &&
          String(state.activeUser.id) === String(action.payload)
        ) {
          state.messages = [];
        }
      })
      .addCase(removeFriend.fulfilled, (state, action) => {
        if (
          state.activeUser &&
          String(state.activeUser.id) === String(action.payload)
        ) {
          state.activeUser = null;
          state.messages = [];
        }
      })

      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const fetchedMessages = action.payload || [];
        const pendingForActiveUser = (state.pendingQueue || []).filter(
          (msg) =>
            state.activeUser &&
            String(msg.receiver_id) === String(state.activeUser.id),
        );
        state.messages = [...fetchedMessages, ...pendingForActiveUser];
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.loading = false;
      })

      .addCase(sendNewMessage.pending, (state, action) => {
        const { receiverId, message, tempId, senderId } = action.meta.arg;
        const tempMsg = {
          id: tempId,
          sender_id: senderId,
          receiver_id: receiverId,
          message: message,
          created_at: new Date().toISOString(),
          is_seen: false,
          status: "pending",
        };
        if (!state.pendingQueue) state.pendingQueue = [];
        state.pendingQueue.push(tempMsg);

        if (
          state.activeUser &&
          String(state.activeUser.id) === String(receiverId)
        ) {
          state.messages.push(tempMsg);
        }
      })
      .addCase(sendNewMessage.fulfilled, (state, action) => {
        const { tempId } = action.meta.arg;
        if (state.pendingQueue) {
          state.pendingQueue = state.pendingQueue.filter(
            (msg) => msg.id !== tempId,
          );
        }

        const index = state.messages.findIndex((msg) => msg.id === tempId);
        if (index !== -1) {
          state.messages[index] = action.payload;
        } else {
          const receiverId = action.payload.receiver_id;
          if (
            state.activeUser &&
            (String(action.payload.sender_id) === String(state.activeUser.id) ||
              String(receiverId) === String(state.activeUser.id))
          ) {
            state.messages.push(action.payload);
          }
        }
      })
      .addCase(sendNewMessage.rejected, (state, action) => {
        const { tempId } = action.meta.arg;
        if (state.pendingQueue) {
          state.pendingQueue = state.pendingQueue.filter(
            (msg) => msg.id !== tempId,
          );
        }
        state.messages = state.messages.filter((msg) => msg.id !== tempId);
      });
  },
});

export const {
  setActiveUser,
  receiveMessage,
  setTypingStatus,
  markMessagesSeen,
  removeMessage,
} = chatSlice.actions;
export default chatSlice.reducer;
