/**
 * Chat WebSocket client.
 *
 * Typed send/receive over the browser WebSocket, with auto-reconnect and a
 * send queue for messages dispatched before the socket opens.
 *
 * The JWT is passed as a query param because browsers can't set Authorization
 * headers on WebSocket connections.
 */

import { wsUrl } from "@/lib/api/client";
import type { ClientMessage, ServerMessage } from "@/lib/types/chat";

type Listener = (msg: ServerMessage) => void;

export class ChatSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempts = 0;
  private explicitlyClosed = false;
  private token: string;
  private pendingSends: ClientMessage[] = [];

  constructor(token: string) {
    this.token = token;
  }

  connect(): void {
    this.explicitlyClosed = false;
    const url = `${wsUrl("/api/chat/ws")}?token=${encodeURIComponent(this.token)}`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener("message", (ev) => {
      try {
        const parsed = JSON.parse(ev.data as string) as ServerMessage;
        this.listeners.forEach((l) => l(parsed));
      } catch {
        // Ignore malformed frames
      }
    });

    this.ws.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      const queued = this.pendingSends;
      this.pendingSends = [];
      for (const msg of queued) {
        this.ws?.send(JSON.stringify(msg));
      }
    });

    this.ws.addEventListener("close", () => {
      if (this.explicitlyClosed) return;
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    });
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.pendingSends.push(msg);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.explicitlyClosed = true;
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
    this.pendingSends = [];
  }
}
