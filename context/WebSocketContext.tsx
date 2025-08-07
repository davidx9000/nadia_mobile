import React, { createContext, useContext, useEffect, useState, useCallback, useFocusEffect } from 'react';
import { AppState } from 'react-native';
import WebSocketService from '@/services/websocket';

const WebSocketContext = createContext({
  emit: (event: string, data?: any) => {},
  on: (event: string, callback: (data: any) => void) => {},
  off: (event: string, callback: (data: any) => void) => {},
  isConnected: false,
  chatStation: null,
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(WebSocketService.socket?.connected ?? false);

  useEffect(() => {
    const syncStatus = () => {
      setIsConnected(WebSocketService.socket?.connected ?? false);
    };

    WebSocketService.connect();
    syncStatus();

    WebSocketService.on('connect', syncStatus);
    WebSocketService.on('disconnect', syncStatus);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        WebSocketService.connect();
      }
    });

    return () => {
      subscription.remove();
      WebSocketService.disconnect();
      WebSocketService.off('connect', syncStatus);
      WebSocketService.off('disconnect', syncStatus);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        emit: WebSocketService.emit.bind(WebSocketService),
        on: WebSocketService.on.bind(WebSocketService),
        off: WebSocketService.off.bind(WebSocketService),
        isConnected,
        chatStation: 'chat',
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};