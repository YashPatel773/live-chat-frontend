import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

const MessageList = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const scrollAnchor = useRef(null);
  const { activeUser, isTyping, loading, messages } = useSelector(
    (state) => state.chat,
  );

  const { onlineUserIds } = useSelector((state) => state.users);

  const isActiveUserOnline =
    activeUser && onlineUserIds?.includes(String(activeUser.id));

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  console.log({ messages });

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

  // Group by date
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
      className="flex-1 overflow-y-auto px-5 py-4 space-y-1
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
        /* Date divider */
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
          >
            <div
              className={`max-w-[68%] px-4 py-2.5 text-[14px] leading-relaxed break-words
                ${
                  isSentByMe
                    ? "bg-gradient-to-br from-violet-600 to-violet-800 text-white rounded-[18px] rounded-br-[4px] shadow-[0_4px_18px_rgba(109,40,217,0.35)]"
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
                {isSentByMe && (
                  <span
                    title={msg.is_seen ? "Seen" : "Sent"}
                    className={`text-[12px] font-bold leading-none ${msg.is_seen ? "text-sky-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]" : "text-violet-300/40"}`}
                  >
                    {msg.is_seen ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
  {isTyping && (
  <div className="py-2 w-[80px] mt-10 " >
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
    </div>
  );
};

export default MessageList;
