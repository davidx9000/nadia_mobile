import { io, Socket } from 'socket.io-client';

class WebSocketService {
  socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    this.socket = io('wss://www.nadiaradio.com', {
      path: '/socket',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10000000000,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 5000,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }
}

export default new WebSocketService();