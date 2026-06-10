import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { connectSocket, getSocket } from '../services/socket';
import { setOnlineUsers } from '../redux/usersSlice';
import { receiveMessage, setTypingStatus } from '../redux/chatSlice';

const Chat = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    

    useEffect(() => {
        if (!user) return;

        // 1. Initialize global web socket communication interface
        const socket = connectSocket(user.id);
        console.log("[Socket] Initialized connectSocket for user.id:", user.id);

        // 2. Set up global real-time event signal response listeners
        socket.on('connect', () => {
            console.log("[Socket] Connected successfully. Socket ID:", socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error("[Socket] Connection error:", error);
        });

        socket.on('getOnlineUsers', (userIdsList) => {
            console.log("[Socket] Received online users list:", userIdsList);
            dispatch(setOnlineUsers(userIdsList));
        });

        socket.on('getMessage', (incomingMessage) => {
            console.log("[Socket] Received getMessage event:", incomingMessage);
            dispatch(receiveMessage(incomingMessage));
        });

        socket.on('userTyping', ({ senderId, isTyping }) => {
            dispatch(setTypingStatus({ senderId, isTyping }));
        });

        // 3. React cleanup execution hook layer
        return () => {
            console.log("[Socket] Cleaning up listeners");
            socket.off('connect');
            socket.off('connect_error');
            socket.off('getOnlineUsers');
            socket.off('getMessage');
            socket.off('userTyping');
        };
    }, [user, dispatch]);

    return (
        <div className="w-full h-screen overflow-hidden flex bg-slate-900 select-none">
            {/* Left Workspace Panel: Sidebar Nav */}
            <Sidebar />

            {/* Right Workspace Panel: Active Conversation Stream Content Viewport Dashboard */}
            <ChatWindow />
        </div>
    );
};

export default Chat;