import React, { createContext, useContext, useEffect, useState } from 'react';
import WebSocketService from '@/services/websocket';

const WebSocketContext = createContext({
  emit: (event: string, data?: any) => {},
  on: (event: string, callback: (data: any) => void) => {},
  off: (event: string, callback: (data: any) => void) => {},
  isConnected: false,
  chatStation: 'chat',
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    WebSocketService.connect();

    WebSocketService.on('connect', () => {
      setIsConnected(true);
    });

    WebSocketService.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      WebSocketService.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        emit: WebSocketService.emit.bind(WebSocketService),
        on: WebSocketService.on.bind(WebSocketService),
        off: WebSocketService.off.bind(WebSocketService),
        isConnected,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
