import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addMemberToGroup, removeMemberFromGroup } from "../redux/chatSlice";
import { getSocket } from "../services/socket";

const ManageMembersModal = ({ isOpen, onClose, group }) => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { list: friends } = useSelector((state) => state.users);

  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMemberId, setLoadingMemberId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset errors and query on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSearchQuery("");
    }
  }, [isOpen]);

  if (!isOpen || !group) return null;

  const isAdmin = String(group.created_by) === String(currentUser?.id);

  // Friends who are not already in the group
  const nonMembers = friends.filter(
    (friend) =>
      !group.members?.some((member) => String(member.id) === String(friend.id))
  );

  const filteredNonMembers = nonMembers.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async (friendId) => {
    setLoadingMemberId(friendId);
    setErrorMsg("");
    try {
      const actionResult = await dispatch(
        addMemberToGroup({ groupId: group.id, memberId: friendId })
      );
      if (addMemberToGroup.fulfilled.match(actionResult)) {
        const updatedGroup = actionResult.payload;
        // Emit Socket event to sync additions real-time
        const socket = getSocket();
        if (socket) {
          socket.emit("updateGroup", {
            group: updatedGroup,
            addedMemberId: friendId,
          });
        }
      } else {
        setErrorMsg(actionResult.payload || "Failed to add member.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setLoadingMemberId(memberId);
    setErrorMsg("");
    try {
      const actionResult = await dispatch(
        removeMemberFromGroup({ groupId: group.id, memberId: memberId })
      );
      if (removeMemberFromGroup.fulfilled.match(actionResult)) {
        const updatedGroup = actionResult.payload;
        // Emit Socket event to sync removals real-time
        const socket = getSocket();
        if (socket) {
          socket.emit("updateGroup", {
            group: updatedGroup,
            removedMemberId: memberId,
          });
        }
      } else {
        setErrorMsg(actionResult.payload || "Failed to remove member.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoadingMemberId(null);
    }
  };

  const renderModalContent = () => (
    <div className="flex flex-col h-full min-h-0">
      {/* Current Group Members Section */}
      <div className="flex-1 min-h-0 flex flex-col mb-4">
        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2 flex-shrink-0">
          Current Members ({group.members?.length || 0})
        </label>
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-1 scrollbar-thin scrollbar-thumb-violet-800/40 scrollbar-track-transparent min-h-0 max-h-[180px]">
          {group.members?.map((member) => {
            const isMemberCreator = String(member.id) === String(group.created_by);
            const isMe = String(member.id) === String(currentUser?.id);
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-[13px] font-semibold text-slate-200 truncate">
                    {member.name} {isMe && <span className="text-violet-400 font-normal">(You)</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {isMemberCreator ? "Group Admin / Creator" : member.email}
                  </p>
                </div>

                {isAdmin && !isMemberCreator && (
                  <button
                    disabled={loadingMemberId !== null}
                    onClick={() => handleRemoveMember(member.id)}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-400 border border-rose-500/20 bg-rose-500/[0.04] rounded-xl hover:bg-rose-500/[0.12] hover:border-rose-400/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingMemberId === member.id ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Members Section (Only for Admin) */}
      {isAdmin && (
        <div className="flex-1 min-h-0 flex flex-col mb-2">
          <div className="border-t border-white/[0.06] pt-4 mt-2 mb-2 flex-shrink-0" />
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2 flex-shrink-0">
            Add Friend to Group
          </label>

          {/* Search Box */}
          <div className="relative mb-3 flex-shrink-0">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              width="13"
              height="13"
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
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all duration-200"
            />
          </div>

          {/* Non-members friends list */}
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-1 scrollbar-thin scrollbar-thumb-violet-800/40 scrollbar-track-transparent min-h-0 max-h-[180px]">
            {filteredNonMembers.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-[12px]">
                {searchQuery ? "No matching friends found" : "All eligible friends are in the group"}
              </div>
            ) : (
              filteredNonMembers.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.02] transition-all duration-200"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-[13px] font-semibold text-slate-200 truncate">
                      {friend.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {friend.email}
                    </p>
                  </div>

                  <button
                    disabled={loadingMemberId !== null}
                    onClick={() => handleAddMember(friend.id)}
                    className="px-2.5 py-1 text-[11px] font-bold text-violet-400 border border-violet-500/20 bg-violet-600/[0.04] rounded-xl hover:bg-violet-600/[0.12] hover:border-violet-400/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingMemberId === friend.id ? "Adding..." : "Add"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="text-red-400 text-xs font-semibold px-1 mt-2 mb-2 flex-shrink-0">
          {errorMsg}
        </div>
      )}
    </div>
  );

  // Desktop view
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Content */}
        <div className="bg-[#0e0e16] border border-white/[0.08] w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <div>
              <h3 className="text-[16px] font-bold text-violet-50 tracking-wide">
                Group Settings
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {group.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 cursor-pointer"
            >
              <svg
                width="15"
                height="15"
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

          {/* Body */}
          {renderModalContent()}
        </div>
      </div>
    );
  }

  // Mobile View
  return (
    <div className="fixed inset-0 z-50 bg-[#0c0c14] flex flex-col animate-in slide-in-from-right duration-250">
      {/* Mobile Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-[#0d0d17]/80 backdrop-blur-md flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center rounded-lg hover:bg-white/5"
          aria-label="Back"
        >
          <svg
            width="22"
            height="22"
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
        <div>
          <h3 className="text-[16px] font-bold text-violet-50 tracking-wide">
            Group Settings
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
            {group.name}
          </p>
        </div>
      </div>

      {/* Mobile Body content */}
      <div className="flex-1 min-h-0 p-5 overflow-hidden">
        {renderModalContent()}
      </div>
    </div>
  );
};

export default ManageMembersModal;
