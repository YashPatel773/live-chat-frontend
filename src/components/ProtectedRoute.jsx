import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);
  const localToken = localStorage.getItem("chat_token");
  if (!token) {
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_user");
    return <Navigate to="/login" replace />;
  }

  // Otherwise, allow them to view the protected component securely
  return children;
};

export default ProtectedRoute;
