// Mirrors backend/app/schemas/chat.py — keep in sync.

// ---- Client -> server ----
export type ClientUserMessage = { kind: "user_message"; text: string };
export type ClientNew = { kind: "new" };
export type ClientResume = { kind: "resume"; session_id: string };
export type ClientMessage = ClientUserMessage | ClientNew | ClientResume;

// ---- Server -> client ----
export type ServerSession = {
  kind: "session";
  session_id: string;
  title: string | null;
};
export type ServerText = { kind: "text"; text: string };
export type ServerToolCall = {
  kind: "tool_call";
  id: string;
  name: string;
  input: Record<string, unknown>;
};
export type ServerToolResult = {
  kind: "tool_result";
  id: string;
  name: string;
  result: Record<string, unknown>;
};
export type ServerTitle = { kind: "title"; title: string };
export type ServerDone = { kind: "done"; final_text: string };
export type ServerError = { kind: "error"; message: string };

export type ServerMessage =
  | ServerSession
  | ServerText
  | ServerToolCall
  | ServerToolResult
  | ServerTitle
  | ServerDone
  | ServerError;

// ---- UI-facing chat turn ----
export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: Record<string, unknown>;
  }>;
  streaming?: boolean;
};

// ---- Chat session metadata (REST) ----
export type ChatSession = {
  session_id: string;
  title: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateSessionBody = {
  title?: string | null;
  pinned?: boolean | null;
};
