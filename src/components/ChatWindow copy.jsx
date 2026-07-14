import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMessages, markAsSeen, setActiveUser } from "../redux/chatSlice";
import ManageMembersModal from "./ManageMembersModal";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { getSocket } from "../services/socket";

const formatLastSeen = (lastSeenStr) => {
  if (!lastSeenStr) return "Offline";
  try {
    const d = new Date(lastSeenStr);
    if (isNaN(d.getTime())) return "Offline";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (itemDate.getTime() === today.getTime()) {
      return `last seen today at ${timeStr}`;
    } else if (itemDate.getTime() === yesterday.getTime()) {
      return `last seen yesterday at ${timeStr}`;
    } else {
      const dateStr = d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `last seen on ${dateStr} at ${timeStr}`;
    }
  } catch (e) {
    return "Offline";
  }
};

const getMemberDisplayName = (member, friends, currentUserId) => {
  if (!member) return "";
  if (String(member.id) === String(currentUserId)) return "You";
  const isFriend = friends.some((f) => String(f.id) === String(member.id));
  return isFriend ? member.name : member.email;
};

const ChatWindow = () => {
  const dispatch = useDispatch();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const {
    activeUser: selectedUser,
    loading,
    messages,
    typingUsers,
    groups,
  } = useSelector((state) => state.chat);
console.log({groups});
console.log({selectedUser});

  const { user } = useSelector((state) => state.auth);
  const { onlineUserIds, list: users } = useSelector((state) => state.users);
 
  const activeUser = selectedUser
    ? selectedUser.is_group
      ? groups.find((g) => String(g.id) === String(selectedUser.id)) || selectedUser
      : users.find((u) => String(u.id) === String(selectedUser.id)) || selectedUser
    : null;
console.log({activeUser});

  useEffect(() => {
    if (selectedUser) {
      dispatch(
        fetchMessages({
          id: selectedUser.id,
          isGroup: selectedUser.is_group,
        })
      );
    }
  }, [selectedUser, dispatch]);

  useEffect(() => {
    if (!activeUser || !user || activeUser.is_group) return;
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
    activeUser && !activeUser.is_group && onlineUserIds?.includes(String(activeUser.id));

  /* ── Empty state ── */
  if (!activeUser) {
    return (
      <div className="w-full h-full bg-[#0a0a10] flex flex-col items-center justify-center relative overflow-hidden">
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

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a10]">
      <div className="relative flex items-center justify-between px-5 py-3.5 bg-[#0d0d1a]/95 border-b border-white/[0.06] backdrop-blur-md z-10">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

        <div className="flex items-center gap-3">
          {/* Back button visible only on mobile screens */}
          <button
            onClick={() => dispatch(setActiveUser(null))}
            className="md:hidden p-1 mr-1 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center rounded-lg hover:bg-white/5 active:scale-95"
            aria-label="Back to contacts"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-[13px] bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-[14px]">
              {activeUser.is_group ? "👥" : activeUser.name.charAt(0).toUpperCase()}
            </div>
            {!activeUser.is_group && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d1a]
        ${isActiveUserOnline ? "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]" : "bg-slate-600"}`}
              />
            )}
          </div>

          <div className="flex flex-col justify-center items-start min-w-0 gap-0.5 w-full">
            <h3 className="text-white font-semibold text-[15px] leading-snug truncate">
              {activeUser.name}
            </h3>

            <p
              className={`text-xs truncate w-[85%] md:w-[90%] ${
                !activeUser.is_group && typingUsers?.[String(activeUser.id)]
                  ? "text-emerald-400"
                  : !activeUser.is_group && isActiveUserOnline
                    ? "text-emerald-400"
                    : "text-slate-400"
              }`}
            >
              {activeUser.is_group
                ? (activeUser.members || [])
                    .map((m) => getMemberDisplayName(m, users, user.id))
                    .join(", ")
                : typingUsers?.[String(activeUser.id)]
                  ? "Typing..."
                  : isActiveUserOnline
                    ? "Online"
                    : formatLastSeen(activeUser.last_seen)}
            </p>
          </div>
        </div>

        {activeUser.is_group && (
          <button
            onClick={() => setIsManageOpen(true)}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 flex items-center justify-center cursor-pointer"
            title="Manage Group Members"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        )}
      </div>
 
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

      <ManageMembersModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        group={activeUser}
      />
    </div>
  );
};

export default ChatWindow;
