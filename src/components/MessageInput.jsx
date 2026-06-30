import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import EmojiPicker from "emoji-picker-react";
import { sendNewMessage } from "../redux/chatSlice";
import { getSocket } from "../services/socket";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const { activeUser } = useSelector((state) => state.chat);
  const { user: currentUser } = useSelector((state) => state.auth);

  // typing state lifecycle management variables
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeUser || activeUser.is_group) return;

    if (text.length > 0) {
      socket.emit("typing", {
        senderId: currentUser.id,
        receiverId: activeUser.id,
        isTyping: true,
      });
    } else {
      socket.emit("typing", {
        senderId: currentUser.id,
        receiverId: activeUser.id,
        isTyping: false,
      });
    }

    return () => {
      const activeSocket = getSocket();
      if (activeSocket && activeUser && !activeUser.is_group) {
        activeSocket.emit("typing", {
          senderId: currentUser.id,
          receiverId: activeUser.id,
          isTyping: false,
        });
      }
    };
  }, [text, activeUser, currentUser.id]);

  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    const socket = getSocket();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const isGroup = activeUser?.is_group;

    // 1. Create Multipart FormData
    const formData = new FormData();
    if (isGroup) {
      formData.append("group_id", activeUser.id);
    } else {
      formData.append("receiver_id", activeUser.id);
    }

    if (text.trim()) formData.append("message", text);
    if (selectedFile) formData.append("file", selectedFile);

    // 2. Dispatch updated payload to slice
    dispatch(
      sendNewMessage({
        formData,
        tempId,
        senderId: currentUser.id,
      }),
    )
      .unwrap()
      .then((savedMessage) => {
        if (socket) {
          socket.emit("sendMessage", savedMessage);
          console.log("[Socket] 'sendMessage' emitted:", savedMessage);
        } else {
          console.warn("[Socket] Socket is not connected/initialized!");
        }
      })
      .catch((err) => {
        console.error("[Socket] Failed to save message in DB:", err);
      });

    // 3. Reset states
    setText("");
    setSelectedFile(null);
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) handleSend(e);
  };

  const hasContent = text.trim().length > 0 || selectedFile !== null;

  return (
    <div className="relative w-full bg-[#0d0d1a]/97 border-t border-white/[0.06]">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/25 to-transparent" />

      {/* File Preview Attachment Strip */}
      {selectedFile && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="text-violet-400">📎</span>
            <span className="truncate max-w-xs font-medium">{selectedFile.name}</span>
            <span className="text-xs text-slate-500">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="text-slate-400 hover:text-red-400 transition-colors duration-150 text-sm font-semibold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Popover Emoji Picker Drawer */}
      {showEmoji && (
        <div className="absolute bottom-[76px] left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/[0.08]">
          <EmojiPicker 
            onEmojiClick={onEmojiClick} 
            theme="dark"
            previewConfig={{ showPreview: false }} 
          />
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2.5 px-4 py-3.5">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className={`text-xl p-1 opacity-60 hover:opacity-100 transition-opacity duration-200 ${showEmoji ? "opacity-100 text-violet-400" : ""}`}
        >
          😀
        </button>

        {/* Hidden System File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.sql"
        />

        {/* Paperclip File Select Trigger Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="text-xl p-1 opacity-60 hover:opacity-100 text-slate-400 transition-opacity duration-200"
        >
          📎
        </button>

        {/* Main Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${activeUser?.name || ""}…`}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3
                    text-[14px] text-slate-200 placeholder-slate-600 font-normal
                    outline-none tracking-[0.01em] leading-snug
                    focus:border-violet-500/50 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]
                    transition-all duration-200"
        />

        {/* Dynamic Send Button */}
        <button
          type="submit"
          disabled={!hasContent}
          className={`w-11 h-11 flex-shrink-0 rounded-[13px] flex items-center justify-center transition-all duration-200
                    ${
                      hasContent
                        ? "bg-gradient-to-br from-violet-600 to-violet-800 shadow-[0_4px_16px_rgba(109,40,217,0.4)] hover:shadow-[0_6px_22px_rgba(109,40,217,0.5)] hover:-translate-y-px hover:scale-[1.03] active:scale-95 active:translate-y-0"
                        : "bg-white/[0.04] border border-white/[0.06] cursor-not-allowed"
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
            className={`translate-x-px ${!hasContent ? "opacity-20" : ""}`}
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default MessageInput;