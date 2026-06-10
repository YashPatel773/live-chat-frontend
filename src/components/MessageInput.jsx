import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendNewMessage } from '../redux/chatSlice';
import { getSocket } from '../services/socket';

const MessageInput = () => {
    const [text, setText] = useState('');
    const dispatch = useDispatch();
    const { activeUser } = useSelector((state) => state.chat);
    const { user: currentUser } = useSelector((state) => state.auth);

    // typing state lifecycle management variables
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeUser) return;

        if (text.length > 0) {
            socket.emit('typing', { senderId: currentUser.id, receiverId: activeUser.id, isTyping: true });
        } else {
            socket.emit('typing', { senderId: currentUser.id, receiverId: activeUser.id, isTyping: false });
        }

        return () => {
            const activeSocket = getSocket();
            if (activeSocket && activeUser) {
                activeSocket.emit('typing', { senderId: currentUser.id, receiverId: activeUser.id, isTyping: false });
            }
        };
    }, [text, activeUser, currentUser.id]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        const socket = getSocket(); 
        
        console.log("[Socket] Attempting to send message. Socket instance exists:", !!socket);

        dispatch(sendNewMessage({ receiverId: activeUser.id, message: text }))
            .unwrap()
            .then((savedMessage) => {
                console.log("[Socket] Message saved in DB. Payload:", savedMessage);
                if (socket) {
                    socket.emit('sendMessage', savedMessage);
                    console.log("[Socket] 'sendMessage' event emitted to server with payload:", savedMessage);
                } else {
                    console.warn("[Socket] Cannot emit: Socket is not connected/initialized!");
                }
            })
            .catch((err) => {
                console.error("[Socket] Failed to save message in DB:", err);
            });

            console.log("jhsdbj") 
        setText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
    };

    const hasText = text.trim().length > 0;

    return (
        <form
            onSubmit={handleSend}
            className="relative flex items-center gap-2.5 px-4 py-3.5 bg-[#0d0d1a]/97 border-t border-white/[0.06]"
        >
            {/* Top glow line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />

            {/* Input */}
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${activeUser?.name || ''}…`}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3
                  text-[14px] text-slate-200 placeholder-slate-600 font-normal
                  outline-none tracking-[0.01em] leading-snug
                  focus:border-violet-500/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]
                  transition-all duration-200"
            />

            {/* Send button */}
            <button
                type="submit"
                disabled={!hasText}
                className={`w-11 h-11 flex-shrink-0 rounded-[13px] flex items-center justify-center transition-all duration-200
                  ${hasText
                    ? 'bg-gradient-to-br from-violet-600 to-violet-800 shadow-[0_4px_16px_rgba(109,40,217,0.4)] hover:shadow-[0_6px_22px_rgba(109,40,217,0.5)] hover:-translate-y-px hover:scale-[1.03] active:scale-95 active:translate-y-0'
                    : 'bg-white/[0.04] border border-white/[0.06] cursor-not-allowed'
                  }`}
            >
                <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`translate-x-px ${!hasText ? 'opacity-20' : ''}`}
                >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
            </button>
        </form>
    );
};

export default MessageInput;    