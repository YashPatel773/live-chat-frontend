import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { connectSocket, getSocket } from "../services/socket";
import {
  setOnlineUsers,
  fetchUsers,
  updateUserLastSeen,
} from "../redux/usersSlice";
import {
  markMessagesSeen,
  receiveMessage,
  removeMessage,
  setTypingStatus,
  fetchGroups,
  addGroup,
  updateGroup,
  removeGroup,
  updateMessageReactions,
  updateMessageText,
} from "../redux/chatSlice";

const Chat = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { list: users } = useSelector((state) => state.users);

  const { activeUser, groups } = useSelector((state) => state.chat);

  // Store latest users list in ref to avoid re-binding socket listeners when list updates
  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // Fetch groups on mount
  useEffect(() => {
    if (user) {
      dispatch(fetchGroups());
    }
  }, [user, dispatch]);

  // Join Socket.io rooms for all groups
  useEffect(() => {
    if (groups.length > 0) {
      const socket = getSocket();
      if (socket) {
        const groupIds = groups.map((g) => g.id);
        socket.emit("joinGroups", groupIds);
        console.log("[Socket] Joined groups rooms:", groupIds);
      }
    }
  }, [groups]);

  useEffect(() => {
    if (!user) return;

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

    socket.on("groupCreated", (newGroup) => {
      console.log("[Socket] Group created event received:", newGroup);
      dispatch(addGroup(newGroup));
      socket.emit("joinGroup", newGroup.id);
    });

    socket.on("groupUpdated", ({ group }) => {
      console.log("[Socket] Group updated event received:", group);
      dispatch(updateGroup(group));
    });

    socket.on("groupRemoved", ({ groupId }) => {
      console.log("[Socket] Group removed event received:", groupId);
      dispatch(removeGroup(groupId));
    });

    socket.on("userOffline", (data) => {
      console.log("[Socket] Received userOffline event. Data:", data);
      dispatch(updateUserLastSeen(data));
    });

    socket.on("messageReactionUpdated", (data) => {
      console.log("[Socket] Received messageReactionUpdated event:", data);
      dispatch(
        updateMessageReactions({
          messageId: data.message_id,
          reactions: data.reactions,
        }),
      );
    });

    socket.on("messageEdited", (data) => {
      console.log("[Socket] Received messageEdited event:", data);
      dispatch(
        updateMessageText({
          messageId: data.message_id,
          message: data.message,
          is_edited: data.is_edited,
        }),
      );
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
      socket.off("groupCreated");
      socket.off("groupUpdated");
      socket.off("groupRemoved");
      socket.off("messageReactionUpdated");
      socket.off("messageEdited");
    };
  }, [user, dispatch]);

  return (
    <div className="w-full h-screen overflow-hidden flex bg-[#0a0a10] select-none">
      {/* Sidebar Wrapper */}
      <div
        className={`w-full md:w-80 h-full flex-shrink-0 flex flex-col border-r border-white/[0.06] ${
          activeUser ? "hidden md:flex" : "flex"
        }`}
      >
        <Sidebar />
      </div>

      {/* ChatWindow Wrapper */}
      <div
        className={`w-full h-full md:flex-1 flex flex-col bg-[#0a0a10] ${
          !activeUser ? "hidden md:flex" : "flex"
        }`}
      >
        <ChatWindow />
      </div>
    </div>
  );
};

export default Chat;
