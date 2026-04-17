import { apiFetch } from "@/lib/api/client";
import type {
  ChatSession,
  ChatTurn,
  UpdateSessionBody,
} from "@/lib/types/chat";

type SessionMessagesOut = {
  session_id: string;
  turns: ChatTurn[];
};

export const chatSessionsApi = {
  list(): Promise<ChatSession[]> {
    return apiFetch<ChatSession[]>("/api/chat/sessions");
  },

  getMessages(sessionId: string): Promise<SessionMessagesOut> {
    return apiFetch<SessionMessagesOut>(
      `/api/chat/sessions/${sessionId}/messages`,
    );
  },

  update(sessionId: string, body: UpdateSessionBody): Promise<ChatSession> {
    return apiFetch<ChatSession>(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      body,
    });
  },

  delete(sessionId: string): Promise<void> {
    return apiFetch<void>(`/api/chat/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },
};
