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

        // Cleanup function hook to turn off indicator if the focus target changes suddenly
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

        // Retrieve the latest socket connection instance dynamically
        const socket = getSocket();

        // Dispatch message processing object to Laravel MySQL database pipeline
        dispatch(sendNewMessage({ receiverId: activeUser.id, message: text }))
            .unwrap()
            .then((savedMessage) => {
                // If safely written into database, broadcast message packet into the live socket thread
                if (socket) {
                    socket.emit('sendMessage', savedMessage);
                }
            });

        setText('');
    };

    return (
        <form onSubmit={handleSend} className="p-4 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
            <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                placeholder={`Type a secure message to ${activeUser.name}...`}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition duration-150" />
            <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm px-5 py-3 rounded-xl transition duration-150">
                Send 
            </button>
        </form>
    );
};

export default MessageInput;