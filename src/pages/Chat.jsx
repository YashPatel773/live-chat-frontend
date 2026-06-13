import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { connectSocket, getSocket } from "../services/socket";
import { setOnlineUsers, fetchUsers, updateUserLastSeen } from "../redux/usersSlice";
import {
  markMessagesSeen,
  receiveMessage,
  removeMessage,
  setTypingStatus,
} from "../redux/chatSlice";

const Chat = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { list: users } = useSelector((state) => state.users);

  // Store latest users list in ref to avoid re-binding socket listeners when list updates
  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    if (!user) return;

    // 1. Initialize global web socket communication interface
    const socket = connectSocket(user);
    console.log("[Socket] Initialized connectSocket for user:", user);

    // 2. Set up global real-time event signal response listeners
    socket.on("connect", () => {
      console.log("[Socket] Connected successfully. Socket ID:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error);
    });

    socket.on("getOnlineUsers", (userIdsList) => {
      console.log("[Socket] Received online users list:", userIdsList);
      dispatch(setOnlineUsers(userIdsList));
    });

    socket.on("messageSeenAck", (data) => {
      console.log("[Socket] Received messageSeenAck event. Data:", data);
      dispatch(markMessagesSeen(data));
    });

    socket.on("userJoined", (newUser) => {
      console.log("[Socket] Received userJoined event:", newUser);
      const exists = usersRef.current.some((u) => u.id === newUser.id);
      if (!exists) {
        console.log(
          "[Socket] New user not found in local list. Fetching updated user roster.",
        );
        dispatch(fetchUsers());
      }
    });

    socket.on("getMessage", (incomingMessage) => {
      console.log("[Socket] Received getMessage event:", incomingMessage);
      dispatch(receiveMessage(incomingMessage));
    });

    socket.on("userTyping", ({ senderId, isTyping }) => {
      dispatch(setTypingStatus({ senderId, isTyping }));
    });

    socket.on("friendRequestAccepted", (data) => {
      console.log("[Socket] Friend request accepted by other user:", data);
      dispatch(fetchUsers());
    });

    socket.on("friendRequestReceived", (data) => {
      console.log("[Socket] Friend request received from user:", data);
    });

    socket.on("messageDeletedForEveryone", ({ messageId }) => {
      console.log("[Socket] Message deleted for everyone:", messageId);
      dispatch(removeMessage({ messageId }));
    });

    socket.on("userOffline", (data) => {
      console.log("[Socket] Received userOffline event. Data:", data);
      dispatch(updateUserLastSeen(data));
    });

    return () => {
      console.log("[Socket] Cleaning up listeners");
      socket.off("connect");
      socket.off("connect_error");
      socket.off("getOnlineUsers");
      socket.off("userJoined");
      socket.off("getMessage");
      socket.off("userTyping");
      socket.off("friendRequestAccepted");
      socket.off("friendRequestReceived");
      socket.off("messageDeletedForEveryone");
      socket.off("userOffline");
    };
  }, [user, dispatch]);

  return (
    <div className="w-full h-screen overflow-hidden flex bg-[#0a0a10] select-none">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default Chat;
