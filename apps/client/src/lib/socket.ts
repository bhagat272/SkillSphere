import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (socket) {
    if (token) {
      socket.auth = { token };
    }
    return socket;
  }

  // Create new socket connection
  socket = io(window.location.origin, {
    autoConnect: false,
    auth: token ? { token } : undefined,
    transports: ['websocket'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
