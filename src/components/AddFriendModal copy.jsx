import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { getSocket } from "../services/socket";

const AddFriendModal = ({ isOpen, onClose, onFriendAdded }) => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("suggested"); // 'suggested' or 'requests'
  const [suggestedFriends, setsuggestedFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState(new Set());
 
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === "suggested") {
          const res = await api.get("/suggested-friends");
          setsuggestedFriends(res.data || []);
        } else {
          const res = await api.get("/pending-requests");
          setPendingRequests(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching friend data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const handleSendRequest = async (userId) => {
    try {
      await api.post("/friend-request/send", { receiver_id: userId });
      setSentRequestIds((prev) => {
        const updated = new Set(prev);
        updated.add(userId);
        return updated;
      });

      // Emit real-time socket signal to receiver
      const socket = getSocket();
      if (socket && currentUser) {
        socket.emit("friendRequestSent", {
          senderId: currentUser.id,
          receiverId: userId,
        });
      }
    } catch (err) {
      console.error("Error sending friend request:", err);
    }
  };

  const handleAcceptRequest = async (senderId) => {
    try {
      await api.post("/friend-request/accept", { sender_id: senderId });
      // Remove from local list
      setPendingRequests((prev) => prev.filter((r) => r.id !== senderId));
      // Notify parent sidebar to refresh friends list
      if (onFriendAdded) {
        onFriendAdded();
      }

      // Emit real-time socket signal to the sender who originally requested
      const socket = getSocket();
      if (socket && currentUser) {
        socket.emit("friendRequestAccepted", {
          senderId : senderId,
          receiverId: currentUser.id,
        });
      }
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  const handleDeclineRequest = async (senderId) => {
    try {
      await api.post("/friend-request/decline", { sender_id: senderId });
       
      setPendingRequests((prev) => prev.filter((r) => r.id !== senderId));
    } catch (err) {
      console.error("Error declining friend request:", err);
    }
  };

  // Filter suggested friends locally
  const filteredSuggested = suggestedFriends.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="bg-[#0e0e16] border border-white/[0.08] w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[80vh] overflow-hidden z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-bold text-violet-50 tracking-wide">
            Add Connections
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex border-b border-white/[0.06] mb-4 p-0.5 bg-white/[0.02] rounded-2xl">
          <button
            onClick={() => setActiveTab("suggested")}
            className={`flex-1 py-2.5 text-[13px] font-bold tracking-wide rounded-xl transition-all duration-300 ${
              activeTab === "suggested"
                ? "bg-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Find Friends
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-2.5 text-[13px] font-bold tracking-wide rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === "requests"
                ? "bg-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Friend Requests
            {pendingRequests.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 scrollbar-thin scrollbar-thumb-violet-800/40 scrollbar-track-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
              <span className="text-[12px] text-slate-500 tracking-wide">
                Loading users...
              </span>
            </div>
          ) : activeTab === "suggested" ? (
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all duration-200"
                />
              </div>

              {filteredSuggested.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-500">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <span className="text-[12.5px] text-slate-400 font-medium">
                    No suggested users available
                  </span>
                  <span className="text-[11px] text-slate-500 max-w-[200px]">
                    Everyone is already connected or you have a pending invitation.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSuggested.map((user) => {
                    const isSent = sentRequestIds.has(user.id);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.06] transition-all duration-200"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-[13.5px] font-semibold text-slate-200 truncate">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                        {isSent ? (
                          <button
                            disabled
                            className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-violet-500/20 text-violet-400/60 text-[11px] font-bold bg-violet-500/[0.03] transition-all"
                          >
                            Requested
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user.id)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500 active:scale-95 transition-all shadow-[0_2px_8px_rgba(139,92,246,0.2)]"
                          >
                            + Add Friend
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-500">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </div>
                  <span className="text-[12.5px] text-slate-400 font-medium">
                    No pending requests
                  </span>
                  <span className="text-[11px] text-slate-500 max-w-[200px]">
                    Any invitation sent to you will appear here.
                  </span>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.06] transition-all duration-200"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-[13.5px] font-semibold text-slate-200 truncate">
                        {request.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {request.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_2px_8px_rgba(16,185,129,0.2)]"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold hover:bg-red-500/20 hover:text-red-300 active:scale-95 transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;
