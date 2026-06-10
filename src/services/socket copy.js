import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

// Initialize the socket variable wrapper
let socket = null;

export const connectSocket = (userId) => {
    // Prevent creating duplicate connections if one already exists
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false // Don't connect instantly until we tell it to
        });
    }

    // Define the connect event handler
    const onConnect = () => {
        console.log("[Socket] Connection established/re-established. Emitting join for userId:", userId);
        socket.emit('join', userId);
    };

    // Clean up any previously registered connect handshakes to avoid duplicate joins
    if (socket._connectHandler) {
        socket.off('connect', socket._connectHandler);
    }
    
    // Store the handler reference on the socket object so we can remove it specifically later
    socket._connectHandler = onConnect;
    socket.on('connect', onConnect);

    socket.connect();

    // If the socket is already connected, emit the join event immediately
    if (socket.connected) {
        console.log("[Socket] Already connected. Emitting join immediately for userId:", userId);
        socket.emit('join', userId);
    }
    
    return socket;
};

export const getSocket = () => {
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        if (socket._connectHandler) {
            socket.off('connect', socket._connectHandler);
            delete socket._connectHandler;
        }
        socket.disconnect();
        socket = null; // Clear out the object reference completely
    }
};