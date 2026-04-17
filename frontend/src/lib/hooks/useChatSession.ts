"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatSocket } from "@/lib/api/chat";
import { chatSessionsApi } from "@/lib/api/chat-sessions";
import { useAuthStore } from "@/lib/stores/authStore";
import type { ChatTurn, ServerMessage } from "@/lib/types/chat";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Chat session hook.
 *
 * Owns the ChatSocket and the local turn log. Streams events, resumes past
 * sessions from DB-reconstructed history, starts new sessions, and receives
 * auto-generated titles. The optional onChange callback fires whenever
 * session metadata changes so callers can invalidate session caches.
 */
export function useChatSession(onChange?: () => void) {
  const token = useAuthStore((s) => s.token);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = new ChatSocket(token);
    socketRef.current = socket;

    const unsubscribe = socket.subscribe((msg) =>
      handleServerMessage(msg, {
        setTurns,
        setSessionId: (id, title) => {
          setSessionId(id);
          setCurrentTitle(title);
          onChange?.();
        },
        setTitle: (title) => {
          setCurrentTitle(title);
          onChange?.();
        },
      }),
    );
    socket.connect();
    setConnected(true);

    return () => {
      unsubscribe();
      socket.close();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTurns((t) => [
      ...t,
      { id: uid(), role: "user", text: trimmed },
      { id: uid(), role: "assistant", text: "", toolCalls: [], streaming: true },
    ]);
    socketRef.current?.send({ kind: "user_message", text: trimmed });
  }, []);

  const newChat = useCallback(() => {
    setTurns([]);
    setCurrentTitle(null);
    socketRef.current?.send({ kind: "new" });
  }, []);

  const resume = useCallback(async (id: string) => {
    if (!token) return;
    setSessionId(id);
    setLoadingHistory(true);
    setTurns([]);

    try {
      const history = await chatSessionsApi.getMessages(id);
      setTurns(history.turns);
      socketRef.current?.send({ kind: "resume", session_id: id });
    } catch (e) {
      console.error("Failed to load session history:", e);
      setTurns([
        {
          id: uid(),
          role: "assistant",
          text: `_Couldn't load this conversation._`,
        },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  return {
    turns,
    sessionId,
    currentTitle,
    connected,
    loadingHistory,
    send,
    newChat,
    resume,
  };
}

// ---- Server event handling -------------------------------------------------

type Handlers = {
  setTurns: React.Dispatch<React.SetStateAction<ChatTurn[]>>;
  setSessionId: (id: string, title: string | null) => void;
  setTitle: (title: string) => void;
};

function handleServerMessage(msg: ServerMessage, h: Handlers) {
  switch (msg.kind) {
    case "session":
      h.setSessionId(msg.session_id, msg.title);
      return;

    case "title":
      h.setTitle(msg.title);
      return;

    case "text":
      h.setTurns((turns) =>
        updateLastAssistant(turns, (t) => ({
          ...t,
          text: (t.text ?? "") + (t.text ? "\n\n" : "") + msg.text,
        })),
      );
      return;

    case "tool_call":
      h.setTurns((turns) =>
        updateLastAssistant(turns, (t) => ({
          ...t,
          toolCalls: [
            ...(t.toolCalls ?? []),
            { id: msg.id, name: msg.name, input: msg.input },
          ],
        })),
      );
      return;

    case "tool_result":
      h.setTurns((turns) =>
        updateLastAssistant(turns, (t) => ({
          ...t,
          toolCalls: (t.toolCalls ?? []).map((tc) =>
            tc.id === msg.id ? { ...tc, result: msg.result } : tc,
          ),
        })),
      );
      return;

    case "done":
      h.setTurns((turns) =>
        updateLastAssistant(turns, (t) => ({
          ...t,
          text: msg.final_text || t.text,
          streaming: false,
        })),
      );
      return;

    case "error":
      h.setTurns((turns) =>
        updateLastAssistant(turns, (t) => ({
          ...t,
          text: (t.text ?? "") + `\n\n**Error:** ${msg.message}`,
          streaming: false,
        })),
      );
      return;
  }
}

function updateLastAssistant(
  turns: ChatTurn[],
  updater: (t: ChatTurn) => ChatTurn,
): ChatTurn[] {
  if (turns.length === 0) return turns;
  const last = turns[turns.length - 1];
  if (last.role !== "assistant") return turns;
  return [...turns.slice(0, -1), updater(last)];
}
