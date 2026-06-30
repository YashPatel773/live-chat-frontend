import React from "react";
import { useSelector } from "react-redux";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

const ResponsiveChatApp = () => {
  // We use the activeUser from your chatSlice to know if a chat is currently open
  const { activeUser } = useSelector((state) => state.chat);

  return (
    <div className="w-screen h-screen flex bg-[#0a0a10] text-slate-200 overflow-hidden select-none">
      
 
      <div 
        className={`w-full md:w-80 h-full flex-shrink-0 flex-col bg-[#0d0d15] border-r border-white/[0.06] 
        ${activeUser ? "hidden md:flex" : "flex"}`}
      >
        <Sidebar />
      </div>

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