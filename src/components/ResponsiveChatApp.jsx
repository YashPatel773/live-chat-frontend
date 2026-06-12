import React from "react";
import { useSelector } from "react-redux";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

const ResponsiveChatApp = () => {
  // We use the activeUser from your chatSlice to know if a chat is currently open
  const { activeUser } = useSelector((state) => state.chat);

  return (
    <div className="w-screen h-screen flex bg-[#0a0a10] text-slate-200 overflow-hidden select-none">
      
      {/* 📳 MOBILE LAYOUT: Takes full width (`w-full`). If a chat is active, `hidden` kicks in to hide the contact list.
        💻 LAPTOP VIEW: `md:w-80` fixes its width to a clean sidebar panel, and `md:flex` forces it to stay visible.
      */}
      <div 
        className={`w-full md:w-80 h-full flex-shrink-0 flex-col bg-[#0d0d15] border-r border-white/[0.06] 
        ${activeUser ? "hidden md:flex" : "flex"}`}
      >
        <Sidebar />
      </div>

      {/* 📳 MOBILE LAYOUT: If NO active user is selected, it hides (`hidden`). If selected, it takes over the full mobile screen (`flex w-full`).
        💻 LAPTOP VIEW: `md:flex-1` makes the chat screen grow dynamically to fill up the remaining viewport space.
      */}
      <div 
        className={`w-full h-full md:flex-1 flex-col bg-[#0a0a10] 
        ${!activeUser ? "hidden md:flex" : "flex"}`}
      >
        <ChatWindow />
      </div>

    </div>
  );
};

export default ResponsiveChatApp;