import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "../redux/usersSlice";
import { setActiveUser } from "../redux/chatSlice";
import { logout } from "../redux/authSlice";
import AddFriendModal from "./AddFriendModal";

const avatarGradients = [
  "from-violet-500 to-purple-700",
  "from-cyan-500 to-blue-700",
  "from-emerald-500 to-teal-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-violet-700",
];

const formatLastSeenShort = (lastSeenStr) => {
  if (!lastSeenStr) return "Offline";
  try {
    const d = new Date(lastSeenStr);
    if (isNaN(d.getTime())) return "Offline";
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    if (itemDate.getTime() === today.getTime()) {
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `Last seen ${timeStr}`;
    } else if (itemDate.getTime() === yesterday.getTime()) {
      return "Last seen yesterday";
    } else {
      const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
      return `Last seen ${dateStr}`;
    }
  } catch (e) {
    return "Offline";
  }
};

const Sidebar = () => {
  const dispatch = useDispatch();
  const {
    list: users,
    onlineUserIds,
    loading,
  } = useSelector((state) => state.users);
  const { activeUser, unreadCounts, typingUsers } = useSelector(
    (state) => state.chat,
  );

  const { user: currentUser } = useSelector((state) => state.auth);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);

  console.log({ users });

  const handleFriendAdded = () => {
    dispatch(fetchUsers());
  };

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  console.log({ users });

  return (
    <div className="w-80 h-screen flex flex-col bg-[#0d0d15] border-r border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div>
          <p className="text-[15px] font-bold text-violet-50 tracking-wide max-w-[148px] truncate">
            {currentUser?.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[10.5px] font-semibold text-emerald-400 uppercase tracking-widest">
              Online
            </span>
          </div>
        </div>

        <button
          onClick={() => dispatch(logout())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 text-[11.5px] font-medium hover:bg-red-500/[0.16] hover:border-red-400/40 hover:text-red-300 transition-all duration-200"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>

      {/* Section label + count */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500">
          Contacts
        </span>
        <div className="flex items-center gap-2">
          {!loading && users.length > 0 && (
            <span className="text-[10px] font-semibold text-violet-400/70 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              {users.length}
            </span>
          )}
          <button
            onClick={() => setIsAddFriendOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 text-[10.5px] font-bold hover:bg-violet-600/20 hover:border-violet-400/40 hover:text-violet-300 transition-all duration-200"
          >
            + Add Friend
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-0.5 scrollbar-thin scrollbar-thumb-violet-800/40 scrollbar-track-transparent">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
            <span className="text-[12px] text-slate-500 tracking-wide">
              Loading contacts...
            </span>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3 bg-white/[0.01] rounded-3xl border border-white/[0.03] mx-1 mt-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-300">
                No Friends Yet
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[190px] mx-auto leading-relaxed">
                Connect with colleagues or buddies by adding them!
              </p>
            </div>
            <button
              onClick={() => setIsAddFriendOpen(true)}
              className="mt-1 px-4 py-2 rounded-xl bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-700 hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] active:scale-95 transition-all duration-200"
            >
              Add Friend
            </button>
          </div>
        )}  

        {!loading &&
          users.length > 0 &&
          users.map((user) => {
            const isOnline = onlineUserIds.includes(String(user.id));
            const isSelected = activeUser?.id === user.id;
            const unread = unreadCounts?.[String(user.id)] || 0;
            const gradientClass =
              avatarGradients[user.id % avatarGradients.length];
            const badgeLabel =
              unread > 99
                ? "99+"
                : unread > 5
                  ? `${unread}+`
                  : unread > 0
                    ? String(unread)
                    : null;

            return (
              <div
                key={user.id}
                onClick={() => dispatch(setActiveUser(user))}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 group
                ${
                  isSelected
                    ? "bg-violet-600/[0.18] border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                    : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                }`}
              >
                {/* Active left bar */}
                {isSelected && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] rounded-r-full bg-gradient-to-b from-violet-400 to-violet-700" />
                )}

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-[13px] bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-[14px]`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d18]
                  ${isOnline ? "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,0.7)]" : "bg-slate-600"}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[13.5px] font-semibold truncate ${isSelected ? "text-violet-50" : "text-slate-200"}`}
                  >
                    {user.name}
                  </p>
                  <p
                    className={`text-[11px] mt-0.5 font-medium ${isOnline ? "text-emerald-400" : "text-slate-500"}`}
                  >
                    {typingUsers?.[String(user.id)] &&
                    activeUser?.id !== user.id
                      ? "Typing..."
                      : isOnline
                        ? "● Online"
                        : "Offline"}
                  </p>
                </div>
                {!isSelected && badgeLabel && (
                  <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.6)] animate-pulse">
                    {badgeLabel}
                  </span>
                )}
              </div>
            );
          })}
      </div>

      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onFriendAdded={handleFriendAdded}
      />
    </div>
  );
};

export default Sidebar;
