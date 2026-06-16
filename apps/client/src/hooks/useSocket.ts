import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { getSocket, disconnectSocket } from '../lib/socket';

export const useSocket = () => {
  const { accessToken, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      const socket = getSocket(accessToken);
      
      if (!socket.connected) {
        socket.connect();
      }

      return () => {
        // We disconnect socket on logout rather than every component unmount
      };
    }

    disconnectSocket();
    return undefined;
  }, [isAuthenticated, accessToken]);

  const socket = isAuthenticated && accessToken ? getSocket(accessToken) : null;
  return { socket, userId: user?._id };
};
