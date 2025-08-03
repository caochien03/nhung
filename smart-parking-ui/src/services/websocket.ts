// WebSocket service for real-time communication

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface CameraEvent {
  type: "auto_capture";
  uid: string;
  cameraIndex: number;
  imageData?: string;
  licensePlate?: string;
}

export interface BarrieEvent {
  type: "barrie_status";
  barrieId: number;
  status: "open" | "closed" | "error";
}

export interface PaymentEvent {
  type: "payment_received";
  parkingRecordId: string;
  amount: number;
  method: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private listeners: Map<string, Function[]> = new Map();

  connect(url: string = "ws://localhost:8080") {
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners("connected", null);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          // Error parsing WebSocket message
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  private notifyListeners(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error("Error in WebSocket listener:", error);
      }
    });
  }

  private handleMessage(message: any) {
    const listeners = this.listeners.get(message.type) || [];
    listeners.forEach(listener => {
      try {
        // Truyền toàn bộ message, không chỉ message.data
        listener(message);
      } catch (error) {
        console.error("Error in WebSocket listener:", error);
      }
    });
  }

  subscribe(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  unsubscribe(eventType: string, callback: Function) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }

  disconnect() {
    this.isConnected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();
export default wsService;
