import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import EmojiPicker from "emoji-picker-react";
import { sendNewMessage, clearReplyingTo, clearEditingMessage, editMessage } from "../redux/chatSlice";
import { getSocket } from "../services/socket";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const { activeUser, replyingTo, editingMessage } = useSelector((state) => state.chat);
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

  // Load message content into input when edit mode is activated
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.message || "");
      dispatch(clearReplyingTo());
    } else {
      setText("");
    }
  }, [editingMessage, dispatch]);

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

    if (editingMessage) {
      const messageId = editingMessage.id;
      const updatedText = text;
      
      dispatch(editMessage({ messageId, message: updatedText }))
        .unwrap()
        .then(() => {
          if (socket) {
            socket.emit("messageEdit", {
              message_id: messageId,
              receiver_id: activeUser?.is_group ? null : activeUser.id,
              group_id: activeUser?.is_group ? activeUser.id : null,
              message: updatedText,
              is_edited: true
            });
          }
        })
        .catch((err) => {
          console.error("Failed to edit message in backend:", err);
        });

      dispatch(clearEditingMessage());
      setText("");
      setShowEmoji(false);
      return;
    }

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
    if (replyingTo) {
      formData.append("reply_to_id", replyingTo.id);
    }

    // 2. Dispatch updated payload to slice
    dispatch(
      sendNewMessage({
        formData,
        tempId,
        senderId: currentUser.id,
        replyToPreview: replyingTo ? {
          id: replyingTo.id,
          message: replyingTo.message,
          type: replyingTo.type,
          sender_id: replyingTo.sender_id,
          sender: replyingTo.sender
        } : null
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
    dispatch(clearReplyingTo());
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

      {/* Reply Preview Attachment Strip */}
      {replyingTo && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-violet-950/20 border border-violet-500/10 px-4 py-2.5 rounded-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex-1 min-w-0 border-l-2 border-violet-500 pl-3">
            <div className="text-xs font-bold text-violet-400">
              Replying to {String(replyingTo.sender_id) === String(currentUser?.id) ? "yourself" : replyingTo.sender?.name || "User"}
            </div>
            <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">
              {replyingTo.message || (replyingTo.type === "image" ? "📷 Image" : "📎 Attachment")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearReplyingTo())}
            className="text-slate-400 hover:text-red-400 transition-colors duration-150 text-sm font-semibold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Edit Preview Strip */}
      {editingMessage && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-violet-950/20 border border-violet-500/10 px-4 py-2.5 rounded-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex-1 min-w-0 border-l-2 border-amber-500 pl-3">
            <div className="text-xs font-bold text-amber-400">
              Editing message
            </div>
            <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">
              {editingMessage.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearEditingMessage())}
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
          disabled={!!editingMessage}
          onClick={() => fileInputRef.current.click()}
          className={`text-xl p-1 opacity-60 hover:opacity-100 text-slate-400 transition-opacity duration-200 ${
            editingMessage ? "cursor-not-allowed opacity-20" : ""
          }`}
        >
          📎
        </button>

        {/* Main Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={editingMessage ? "Edit message…" : `Message ${activeUser?.name || ""}…`}
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
                        ? (editingMessage 
                           ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-[0_4px_16px_rgba(245,158,11,0.4)]" 
                           : "bg-gradient-to-br from-violet-600 to-violet-800 shadow-[0_4px_16px_rgba(109,40,217,0.4)] hover:shadow-[0_6px_22px_rgba(109,40,217,0.5)]") + " hover:-translate-y-px hover:scale-[1.03] active:scale-95 active:translate-y-0"
                        : "bg-white/[0.04] border border-white/[0.06] cursor-not-allowed"
                    }`}
        >
          {editingMessage ? (
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={!hasContent ? "opacity-20" : ""}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
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
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;