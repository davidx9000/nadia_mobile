import { io, Socket } from 'socket.io-client';

class WebSocketService {
  socket: Socket | null = null;
  hasListeners = false;

  connect() {
    if (this.socket) {
      if (!this.socket.connected && !this.socket.active) {
        this.socket.connect();
      }
      return;
    }

    this.socket = io('wss://www.nadiaradio.com', {
      path: '/socket',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 5000,
      autoConnect: true,
    });

    this.hasListeners = false;
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket || this.hasListeners) return;
    this.hasListeners = true;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected');
    });

    this.socket.on('disconnect', (err) => {
      if (!this.socket?.active) {
        this.connect();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connect error', err?.message || err);
      if (!this.socket?.active) {
        this.connect();
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.hasListeners = false;
    }
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
