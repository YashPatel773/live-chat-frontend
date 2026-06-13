import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { deleteMessage, removeMessage } from "../redux/chatSlice";
import { getSocket } from "../services/socket";

const MessageList = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const scrollAnchor = useRef(null);
  const { activeUser, loading, messages, typingUsers } = useSelector(
    (state) => state.chat,
  );
  const { onlineUserIds } = useSelector((state) => state.users);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  // { messageId, senderId, receiverId, x, y }

  const menuRef = useRef(null);

  const isActiveUserOnline =
    activeUser && onlineUserIds?.includes(String(activeUser.id));

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Right-click or long-press handler
  const handleContextMenu = (e, msg) => {
    if (msg.status === "pending" || String(msg.id).startsWith("temp-")) {
      return;
    }
    e.preventDefault();
    const isMine = String(msg.sender_id) === String(currentUser?.id);
    setContextMenu({
      messageId: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      isMine,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleDelete = async (type) => {
    if (!contextMenu) return;
    const { messageId, receiverId, senderId } = contextMenu;
    setContextMenu(null);

    // Optimistically remove from UI
    dispatch(removeMessage({ messageId }));

    // Call Laravel API
    await dispatch(deleteMessage({ messageId, type }));

    // If "delete for everyone", notify the other user via socket
    if (type === "everyone") {
      const socket = getSocket();
      if (socket) {
        // The "other user" is whoever is not the current user
        const otherUserId =
          String(senderId) === String(currentUser?.id) ? receiverId : senderId;
        socket.emit("messageDeletedForEveryone", {
          messageId,
          receiverId: otherUserId,
        });
      }
    }
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const label = getDateLabel(msg.created_at);
    if (label !== lastDate) {
      grouped.push({ type: "divider", label });
      lastDate = label;
    }
    grouped.push({ type: "msg", data: msg });
  });

  return (
    <div
      className="flex-1 overflow-y-auto px-5 py-4 space-y-1 relative
      [&::-webkit-scrollbar]:w-[3px]
      [&::-webkit-scrollbar-thumb]:bg-violet-700/30
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-track]:bg-transparent"
    >
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center gap-2 pb-10">
          <span className="text-3xl opacity-20 grayscale">💬</span>
          <span className="text-[12.5px] text-slate-600 tracking-wide">
            No messages yet — say hello!
          </span>
        </div>
      )}

      {grouped.map((item, idx) => {
        if (item.type === "divider") {
          return (
            <div key={`d-${idx}`} className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.1em] whitespace-nowrap">
                {item.label}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
            </div>
          );
        }

        const msg = item.data;
        const isSentByMe = String(msg.sender_id) === String(currentUser?.id);

        return (
          <div
            key={msg.id}
            className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
          >
            <div
              className={`max-w-[68%] px-4 py-2.5 text-[14px] leading-relaxed break-words cursor-pointer select-text
                ${
                  isSentByMe
                    ? "bg-gradient-to-br  from-violet-600 to-violet-800 text-white rounded-[18px] rounded-br-[4px] shadow-[0_4px_18px_rgba(109,40,217,0.35)]"
                    : "bg-white/[0.05] text-slate-200 border border-white/[0.07] rounded-[18px] rounded-bl-[4px]"
                }`}
            >
              <p>{msg.message}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span
                  className={`text-[10px] ${isSentByMe ? "text-violet-200/70" : "text-slate-500"}`}
                >
                  {formatTime(msg.created_at)}
                </span>
                {isSentByMe &&
                  (msg.status === "pending" ||
                  String(msg.id).startsWith("temp-") ? (
                    <span
                      title="Sending..."
                      className="text-violet-300/60 flex items-center justify-center animate-pulse"
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 15 12" />
                      </svg>
                    </span>
                  ) : (
                    <span
                      title={msg.is_seen ? "Seen" : "Sent"}
                      className={`text-[12px] font-bold leading-none ${
                        msg.is_seen
                          ? "text-sky-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]"
                          : "text-violet-300/40"
                      }`}
                    >
                      {msg.is_seen ? "✓✓" : "✓"}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        );
      })}

      {activeUser && typingUsers?.[String(activeUser.id)] && (
        <div className="py-2 w-[80px] mt-10">
          <div className="gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
              <span
                className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={scrollAnchor} />

      {/* ── WhatsApp-style Context Menu ── */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-2xl overflow-hidden
            bg-[#16161f] border border-white/[0.08]
            shadow-[0_8px_32px_rgba(0,0,0,0.6)]
            animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 140),
            left: Math.min(contextMenu.x, window.innerWidth - 200),
          }}
        >
          {/* Delete for me — always available */}
          <button
            onClick={() => handleDelete("me")}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-slate-200
              hover:bg-white/[0.05] transition-colors duration-150 text-left"
          >
            {/* Trash icon */}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-400 flex-shrink-0"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Delete for me
          </button>

          {/* Divider */}
          <div className="h-px bg-white/[0.05] mx-3" />

          {/* Delete for everyone — only for sender */}
          {contextMenu.isMine ? (
            <button
              onClick={() => handleDelete("everyone")}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-red-400
                hover:bg-red-500/[0.08] transition-colors duration-150 text-left"
            >
              {/* Unsend / delete everyone icon */}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Delete for everyone
            </button>
          ) : (
            <div className="px-4 py-3 text-[12px] text-slate-600 italic select-none">
              Only sender can unsend
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageList;
