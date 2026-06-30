import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createGroup } from "../redux/chatSlice";
import { getSocket } from "../services/socket";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { list: friends } = useSelector((state) => state.users);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Reset states on modal close or open
  useEffect(() => {
    if (isOpen) {
      setGroupName("");
      setSelectedMembers([]);
      setSearchQuery("");
      setErrorMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMember = (friendId) => {
    setSelectedMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg("Group name is required.");
      return;
    }
    if (selectedMembers.length === 0) {
      setErrorMsg("Please select at least one member.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const actionResult = await dispatch(
        createGroup({
          name: groupName.trim(),
          members: selectedMembers,
        })
      );

      if (createGroup.fulfilled.match(actionResult)) {
        const newGroup = actionResult.payload;
        // Emit Socket.IO groupCreated notification so other online members receive it in real-time
        const socket = getSocket();
        if (socket) {
          socket.emit("createGroup", { group: newGroup });
          socket.emit("joinGroup", newGroup.id);
        }
        onClose();
      } else {
        setErrorMsg(actionResult.payload || "Failed to create group.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Content rendering helper
  const renderFormContent = () => (
    <form onSubmit={handleCreate} className="flex flex-col h-full min-h-0">
      {/* Group Name input */}
      <div className="space-y-1.5 mb-4 flex-shrink-0">
        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
          Group Name
        </label>
        <input
          type="text"
          placeholder="e.g. Project Discussion, Family Chat"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[13.5px] text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all duration-200"
          required
        />
      </div>

      {/* Select Members Section */}
      <div className="space-y-2 flex-1 min-h-0 flex flex-col mb-4">
        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 flex-shrink-0">
          Select Members ({selectedMembers.length} selected)
        </label>

        {/* Member Search */}
        <div className="relative flex-shrink-0">
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
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[12.5px] text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-all duration-200"
          />
        </div>

        {/* Friends scrollable checklist */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-1 scrollbar-thin scrollbar-thumb-violet-800/40 scrollbar-track-transparent min-h-0">
          {filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
              <span className="text-[12px]">No friends found</span>
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isChecked = selectedMembers.includes(friend.id);
              return (
                <div
                  key={friend.id}
                  onClick={() => handleToggleMember(friend.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 border
                    ${
                      isChecked
                        ? "bg-violet-600/[0.08] border-violet-500/20"
                        : "bg-white/[0.01] border-transparent hover:bg-white/[0.03]"
                    }`}
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-[13px] font-semibold text-slate-200 truncate">
                      {friend.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {friend.email}
                    </p>
                  </div>

                  {/* Custom Checkbox */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200
                        ${
                          isChecked
                            ? "bg-violet-600 border-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                            : "border-white/[0.15]"
                        }`}
                    >
                      {isChecked && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="text-red-400 text-xs font-semibold px-1 mb-3 flex-shrink-0">
          {errorMsg}
        </div>
      )}

      {/* Submit Action */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white text-[13.5px] font-bold hover:shadow-[0_4px_16px_rgba(109,40,217,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 flex-shrink-0"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            Creating Group...
          </>
        ) : (
          "Create Group"
        )}
      </button>
    </form>
  );

  // Desktop popup overlay
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={onClose}
        />

        {/* Modal content */}
        <div className="bg-[#0e0e16] border border-white/[0.08] w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 flex-shrink-0">
            <h3 className="text-[17px] font-bold text-violet-50 tracking-wide">
              Create New Group
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

          {/* Form */}
          {renderFormContent()}
        </div>
      </div>
    );
  }

  // Mobile full screen view
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
        <h3 className="text-[16.5px] font-bold text-violet-50 tracking-wide">
          Create Group
        </h3>
      </div>

      {/* Mobile Form content */}
      <div className="flex-1 min-h-0 p-5 overflow-hidden">
        {renderFormContent()}
      </div>
    </div>
  );
};

export default CreateGroupModal;
