import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMessages, markAsSeen, setActiveUser } from "../redux/chatSlice";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { getSocket } from "../services/socket";

const ChatWindow = () => {
  const dispatch = useDispatch();
  const { activeUser, isTyping, loading, messages } = useSelector(
    (state) => state.chat,
  );

  const { user } = useSelector((state) => state.auth);
  const { onlineUserIds } = useSelector((state) => state.users);

  useEffect(() => {
    if (activeUser) {
      dispatch(fetchMessages(activeUser.id));
    }
  }, [activeUser, dispatch]);

  useEffect(() => {
    if (!activeUser || !user) return;
    console.log(
      "[ChatWindow] useEffect triggered for seen. activeUser:",
      activeUser.id,
      "messages length:",
      messages.length,
    );
    dispatch(markAsSeen(activeUser.id));
    const socket = getSocket();
    if (socket) {
      console.log("[ChatWindow] Emitting messageSeen via socket.");
      socket.emit("messageSeen", {
        senderId: activeUser.id,
        receiverId: user.id,
      });
    } else {
      console.warn(
        "[ChatWindow] Socket not found when trying to emit messageSeen",
      );
    }
  }, [activeUser, messages, user, dispatch]);

  const isActiveUserOnline =
    activeUser && onlineUserIds?.includes(String(activeUser.id));

  /* ── Empty state ── */
  if (!activeUser) {
    return (
      <div className="flex-1 h-screen bg-[#0a0a10] flex flex-col items-center justify-center relative overflow-hidden">
        {/* subtle grid bg */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#8b5cf6 1px,transparent 1px),linear-gradient(90deg,#8b5cf6 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/[0.05] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(139,92,246,0.7)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-[17px] font-bold text-slate-200 tracking-tight">
              No Conversation Open
            </h3>
            <p className="text-[13px] text-slate-500 mt-1.5 max-w-[240px] leading-relaxed">
              Pick a contact from the sidebar to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Active chat ── */
  return (
    <div className="flex-1 h-screen flex flex-col bg-[#0a0a10]">
      {/* Header */}
      <div className="relative flex items-center justify-between px-5 py-3.5 bg-[#0d0d1a]/95 border-b border-white/[0.06] backdrop-blur-md z-10">
        {/* bottom glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-[13px] bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-[14px]">
              {activeUser.name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d1a]
              ${isActiveUserOnline ? "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]" : "bg-slate-600"}`}
            />
          </div>

          <div>
            <p className="text-[14.5px] font-bold text-violet-50 tracking-wide leading-tight">
              {activeUser.name}
            </p>
            <span
              className={`text-[11px] mt-0.5 font-medium ${isActiveUserOnline ? "text-emerald-400" : "text-slate-500"}`}
            >
              {isActiveUserOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Encrypted badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/15">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(52,211,153,0.8)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[10px] font-semibold text-emerald-400/80 tracking-wide">
            Encrypted
          </span>
        </div>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
          <span className="text-[12.5px] text-slate-500 tracking-wide">
            Loading messages…
          </span>
        </div>
      ) : (
        <MessageList />
      )}

      <MessageInput />
    </div>
  );
};

export default ChatWindow;
