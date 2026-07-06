import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { deleteMessage, removeMessage, fetchMessages, setReplyingTo, updateMessageReactions, setEditingMessage } from "../redux/chatSlice";
import { getSocket } from "../services/socket";
import api from "../services/api";

const getMemberDisplayName = (member, friends, currentUserId) => {
  if (!member) return "";
  if (String(member.id) === String(currentUserId)) return "You";
  const isFriend = friends.some((f) => String(f.id) === String(member.id));
  return isFriend ? member.name : member.email;
};

const STORAGE_BASE_URL = import.meta.env.VITE_API_URL?.replace(
  /\/api\/?$/,
  "",
);


const getFileUrl = (filePath) => {
  if (!filePath) return null;
  return `${STORAGE_BASE_URL}/storage/${filePath}`;
};
const MessageList = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const scrollAnchor = useRef(null);
  const containerRef = useRef(null);
  const {
    activeUser,
    loading,
    messages,
    typingUsers,
    nextCursor,
    hasMore,
    isPaginationLoading,
  } = useSelector((state) => state.chat);
  const { onlineUserIds, list: friends } = useSelector((state) => state.users);

  console.log({ messages });

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  // { messageId, senderId, receiverId, x, y }

  const menuRef = useRef(null);

  const isActiveUserOnline =
    activeUser && onlineUserIds?.includes(String(activeUser.id));

  const scrollHeightBeforeLoadRef = useRef(0);
  const shouldAdjustScrollRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const lastScrollTimeRef = useRef(Date.now());
  const isStoppingRef = useRef(false);

  const handleScroll = (e) => {
    const container = e.currentTarget;
    const currentScrollTop = container.scrollTop;
    const currentTime = Date.now();

    const timeDiff = currentTime - lastScrollTimeRef.current;
    let velocity = 0;
    if (timeDiff > 0) {
      const deltaY = lastScrollTopRef.current - currentScrollTop;
      velocity = deltaY / timeDiff; // pixels per millisecond
    }

    // Keep track of scroll position and time for subsequent scroll events
    const lastScrollTop = lastScrollTopRef.current;
    lastScrollTopRef.current = currentScrollTop;
    lastScrollTimeRef.current = currentTime;

    // We only care about scrolling UP (where currentScrollTop is less than lastScrollTop)
    if (currentScrollTop >= lastScrollTop) {
      return;
    }

    if (
      hasMore &&
      !isPaginationLoading &&
      !loading &&
      !isStoppingRef.current
    ) {
      const VELOCITY_THRESHOLD = 1.2;

      if (currentScrollTop < 100 && velocity > VELOCITY_THRESHOLD) {
        // Fast scroll detected: Stop momentum, show loader, load messages
        isStoppingRef.current = true;
        container.style.overflowY = "hidden";

        scrollHeightBeforeLoadRef.current = container.scrollHeight;
        shouldAdjustScrollRef.current = true;

        dispatch(
          fetchMessages({
            id: activeUser.id,
            isGroup: activeUser.is_group,
            cursor: nextCursor,
          })
        ).finally(() => {
          // Restore overflow-y to auto after state updates, letting scroll resume
          setTimeout(() => {
            container.style.overflowY = "auto";
            isStoppingRef.current = false;
          }, 100);
        });
      } else if (currentScrollTop <= 10) {
        // Slow scroll detected: Smooth load when hitting the absolute top (no stop)
        scrollHeightBeforeLoadRef.current = container.scrollHeight;
        shouldAdjustScrollRef.current = true;

        dispatch(
          fetchMessages({
            id: activeUser.id,
            isGroup: activeUser.is_group,
            cursor: nextCursor,
          })
        );
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    if (shouldAdjustScrollRef.current) {
      container.scrollTop = container.scrollHeight - scrollHeightBeforeLoadRef.current;
      shouldAdjustScrollRef.current = false;
    } else {
      container.scrollTop = container.scrollHeight;
    }
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

  const handleReact = async (emoji) => {
    if (!contextMenu) return;
    const { messageId } = contextMenu;
    const isGroup = activeUser?.is_group;
    setContextMenu(null);

    try {
      const response = await api.post(`/messages/${messageId}/react`, { reaction: emoji });
      if (response.data.success) {
        const updatedReactions = response.data.reactions;
        dispatch(updateMessageReactions({ messageId, reactions: updatedReactions }));

        const socket = getSocket();
        if (socket) {
          socket.emit("messageReaction", {
            message_id: messageId,
            receiver_id: isGroup ? null : activeUser.id,
            group_id: isGroup ? activeUser.id : null,
            reactions: updatedReactions,
          });
        }
      }
    } catch (err) {
      console.error("Failed to react to message:", err);
    }
  };

  const handleReactionClick = async (emoji, messageId) => {
    const isGroup = activeUser?.is_group;
    try {
      const response = await api.post(`/messages/${messageId}/react`, { reaction: emoji });
      if (response.data.success) {
        const updatedReactions = response.data.reactions;
        dispatch(updateMessageReactions({ messageId, reactions: updatedReactions }));

        const socket = getSocket();
        if (socket) {
          socket.emit("messageReaction", {
            message_id: messageId,
            receiver_id: isGroup ? null : activeUser.id,
            group_id: isGroup ? activeUser.id : null,
            reactions: updatedReactions,
          });
        }
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const scrollToMessage = (targetId) => {
    const element = document.getElementById(`msg-bubble-${targetId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-violet-500", "ring-offset-2", "ring-offset-slate-900");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-violet-500", "ring-offset-2", "ring-offset-slate-900");
      }, 2000);
    }
  };

  const renderReactions = (reactions, messageId) => {
    if (!reactions || reactions.length === 0) return null;
    
    // Group reactions by emoji
    const groups = {};
    reactions.forEach(r => {
      if (!groups[r.reaction]) {
        groups[r.reaction] = [];
      }
      groups[r.reaction].push(r.user?.name || "Someone");
    });
    
    return (
      <div className="flex flex-wrap gap-1 mt-1.5 select-none">
        {Object.entries(groups).map(([emoji, users]) => {
          const hasReacted = reactions.some(
            (r) => String(r.user_id) === String(currentUser?.id) && r.reaction === emoji
          );
          return (
            <div
              key={emoji}
              title={users.join(", ")}
              onClick={(e) => {
                e.stopPropagation();
                handleReactionClick(emoji, messageId);
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs cursor-pointer border transition-all duration-150
                ${
                  hasReacted
                    ? "bg-violet-500/25 border-violet-500/40 text-violet-200 shadow-[0_0_5px_rgba(139,92,246,0.2)]"
                    : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.08]"
                }`}
            >
              <span>{emoji}</span>
              <span className="text-[10px] font-bold">{users.length}</span>
            </div>
          );
        })}
      </div>
    );
  };

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
  console.log({ grouped });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-5 py-4 space-y-1 relative
      [&::-webkit-scrollbar]:w-[3px]
      [&::-webkit-scrollbar-thumb]:bg-violet-700/30
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-track]:bg-transparent"
    >
      {isPaginationLoading && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        </div>
      )}
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
        const sender = msg.sender;
        const senderDisplayName = sender
          ? getMemberDisplayName(sender, friends, currentUser?.id)
          : "Unknown Member";

        return (
          <div
            key={msg.id}
            id={`msg-bubble-${msg.id}`}
            className={`flex flex-col ${isSentByMe ? "items-end" : "items-start"} mb-1`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
          >
            {activeUser?.is_group && !isSentByMe && (
              <span className="text-[11px] font-bold text-violet-400/80 mb-0.5 ml-2 tracking-wide">
                {senderDisplayName}
              </span>
            )}
            <div
              className={`max-w-[85%] md:max-w-[68%] px-4 py-2.5 text-[14px] leading-relaxed break-words cursor-pointer select-text
                ${
                  isSentByMe
                    ? "bg-gradient-to-br from-violet-600 to-violet-800 text-white rounded-[18px] rounded-br-[4px] shadow-[0_4px_18px_rgba(109,40,217,0.35)]"
                    : "bg-white/[0.05] text-slate-200 border border-white/[0.07] rounded-[18px] rounded-bl-[4px]"
                }`}
            >
              {msg.reply_to && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToMessage(msg.reply_to.id);
                  }}
                  className="mb-2 px-3 py-1.5 rounded-lg text-xs border-l-2 bg-black/35 border-violet-400 cursor-pointer hover:bg-black/50 transition-all duration-150 text-left select-none max-w-full"
                >
                  <div className="font-bold text-violet-300 truncate">
                    {String(msg.reply_to.sender_id) === String(currentUser?.id) ? "You" : msg.reply_to.sender?.name || "User"}
                  </div>
                  <div className="text-slate-300 truncate max-w-[300px] mt-0.5">
                    {msg.reply_to.message || (msg.reply_to.type === "image" ? "📷 Image" : "📎 Attachment")}
                  </div>
                </div>
              )}
              <p>
                {msg.type === "image" && msg.file_path && (
                  <img
                    src={getFileUrl(msg.file_path)}
                    alt={msg.file_name || "image"}
                    className="max-w-[220px] rounded-lg mb-1 cursor-pointer"
                    onClick={() =>
                      window.open(getFileUrl(msg.file_path), "_blank")
                    }
                  />
                )}

                {msg.type === "file" && msg.file_path && (
                  <a
                    href={getFileUrl(msg.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs underline mb-1"
                  >
                    📎 {msg.file_name || "Download file"}
                  </a>
                )}

                {msg.message && <p>{msg.message}</p>}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                {!!msg.is_edited && (
                  <span
                    className={`text-[9px] font-medium opacity-65 select-none ${
                      isSentByMe ? "text-violet-200" : "text-slate-500"
                    }`}
                  >
                    edited
                  </span>
                )}
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
              {renderReactions(msg.reactions, msg.id)}
            </div>
          </div>
        );
      })}

      {activeUser &&
        !activeUser.is_group &&
        typingUsers?.[String(activeUser.id)] && (
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
          className="fixed z-50 min-w-[200px] rounded-2xl overflow-hidden
            bg-[#16161f] border border-white/[0.08]
            shadow-[0_8px_32px_rgba(0,0,0,0.6)]
            animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 220),
          }}
        >
          {/* Reaction Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06]">
            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-lg hover:scale-125 transition-transform duration-100 p-1 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply Option */}
          <button
            onClick={() => {
              const msg = messages.find(m => m.id === contextMenu.messageId);
              if (msg) {
                dispatch(setReplyingTo(msg));
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-slate-200
              hover:bg-white/[0.05] transition-colors duration-150 text-left"
          >
            {/* Reply icon */}
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
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            Reply
          </button>

          {/* Edit Option — Only for sender & only for text messages */}
          {contextMenu.isMine && (() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            return msg && msg.type === "text";
          })() && (
            <>
              {/* Divider */}
              <div className="h-px bg-white/[0.05] mx-3" />
              <button
                onClick={() => {
                  const msg = messages.find(m => m.id === contextMenu.messageId);
                  if (msg) {
                    dispatch(setEditingMessage(msg));
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-slate-200
                  hover:bg-white/[0.05] transition-colors duration-150 text-left"
              >
                {/* Pencil / Edit icon */}
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Edit message
              </button>
            </>
          )}

          {/* Divider */}
          <div className="h-px bg-white/[0.05] mx-3" />

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
