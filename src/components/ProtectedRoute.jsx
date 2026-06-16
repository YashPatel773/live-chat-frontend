import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
    // Read the current token status straight from the Redux global state store
    const { token } = useSelector((state) => state.auth);

    // If the token is null, redirect the user immediately to the login view
    if (!token) {
        localStorage.removeItem("chat_token");
        localStorage.removeItem("chat_user");
        return <Navigate to="/login" replace />;
    }

    // Otherwise, allow them to view the protected component securely
    return children;
};

export default ProtectedRoute;