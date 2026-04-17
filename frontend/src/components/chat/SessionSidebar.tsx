"use client";

import {
  Check,
  MessageSquarePlus,
  MoreVertical,
  Pin,
  PinOff,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import {
  useChatSessions,
  useChatSessionMutations,
} from "@/lib/hooks/useChatSessions";
import type { ChatSession } from "@/lib/types/chat";
import { cn } from "@/lib/utils/cn";

type Props = {
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
};

type Bucket = { label: string; items: ChatSession[] };

/** Group sessions into pinned, today, past week, and older buckets. */
function bucketize(sessions: ChatSession[]): Bucket[] {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const pinned: ChatSession[] = [];
  const today: ChatSession[] = [];
  const week: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const s of sessions) {
    if (s.pinned) {
      pinned.push(s);
      continue;
    }
    const age = now - new Date(s.updated_at).getTime();
    if (age < ONE_DAY) today.push(s);
    else if (age < 7 * ONE_DAY) week.push(s);
    else older.push(s);
  }

  return [
    { label: "Pinned", items: pinned },
    { label: "Today", items: today },
    { label: "Past week", items: week },
    { label: "Older", items: older },
  ].filter((b) => b.items.length > 0);
}

export function SessionSidebar({ activeSessionId, onSelect, onNew }: Props) {
  const { data: sessions, isLoading } = useChatSessions();
  const { update, remove } = useChatSessionMutations();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const buckets = sessions ? bucketize(sessions) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border-subtle px-3 py-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onNew}
          className="w-full justify-center"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-3 py-4 text-xs text-fg-subtle">Loading…</div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-fg-subtle">
            No past conversations. Start chatting to see them here.
          </div>
        ) : (
          buckets.map((bucket) => (
            <div key={bucket.label} className="py-1">
              <div className="px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.15em] text-fg-subtle">
                {bucket.label}
              </div>
              <div>
                {bucket.items.map((s) => (
                  <SessionRow
                    key={s.session_id}
                    session={s}
                    active={s.session_id === activeSessionId}
                    menuOpen={menuFor === s.session_id}
                    renaming={renamingId === s.session_id}
                    onSelect={() => onSelect(s.session_id)}
                    onOpenMenu={() =>
                      setMenuFor((m) => (m === s.session_id ? null : s.session_id))
                    }
                    onCloseMenu={() => setMenuFor(null)}
                    onStartRename={() => {
                      setRenamingId(s.session_id);
                      setMenuFor(null);
                    }}
                    onFinishRename={(newTitle) => {
                      if (newTitle && newTitle !== s.title) {
                        update.mutate({
                          id: s.session_id,
                          body: { title: newTitle },
                        });
                      }
                      setRenamingId(null);
                    }}
                    onTogglePin={() => {
                      update.mutate({
                        id: s.session_id,
                        body: { pinned: !s.pinned },
                      });
                      setMenuFor(null);
                    }}
                    onRequestDelete={() => {
                      setDeleteConfirmId(s.session_id);
                      setMenuFor(null);
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {deleteConfirmId ? (
        <div className="border-t border-border-subtle bg-bg-sunken px-3 py-2">
          <p className="mb-2 text-xs text-fg-muted">
            Delete this conversation?
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={remove.isPending}
              onClick={() => {
                remove.mutate(deleteConfirmId, {
                  onSuccess: () => {
                    setDeleteConfirmId(null);
                    if (deleteConfirmId === activeSessionId) onNew();
                  },
                });
              }}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type RowProps = {
  session: ChatSession;
  active: boolean;
  menuOpen: boolean;
  renaming: boolean;
  onSelect: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onStartRename: () => void;
  onFinishRename: (newTitle: string) => void;
  onTogglePin: () => void;
  onRequestDelete: () => void;
};

function SessionRow({
  session,
  active,
  menuOpen,
  renaming,
  onSelect,
  onOpenMenu,
  onCloseMenu,
  onStartRename,
  onFinishRename,
  onTogglePin,
  onRequestDelete,
}: RowProps) {
  const [draft, setDraft] = useState(session.title ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(session.title ?? "");
      // Next tick so input is mounted
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [renaming, session.title]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, onCloseMenu]);

  const title = session.title || "Untitled chat";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 px-2",
        active && "bg-accent/10",
      )}
    >
      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onFinishRename(draft.trim());
          }}
          className="flex w-full items-center gap-1 py-1.5"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onFinishRename(draft.trim())}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onFinishRename(session.title ?? "");
              }
            }}
            className="flex-1 rounded border border-accent bg-bg-sunken px-1.5 py-1 text-xs text-fg focus:outline-none"
            autoFocus
          />
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1.5 truncate rounded px-1.5 py-1.5 text-left text-xs",
              active ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
            title={title}
          >
            {session.pinned ? (
              <Pin className="h-3 w-3 flex-shrink-0 text-fg-subtle" />
            ) : null}
            <span className="truncate">{title}</span>
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Chat options"
            className={cn(
              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-fg-subtle transition-opacity",
              "hover:bg-surface-muted hover:text-fg-muted",
              menuOpen || active
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </>
      )}

      {menuOpen ? (
        <div
          ref={menuRef}
          className="absolute right-2 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded-md border border-border-subtle bg-bg-raised shadow-overlay"
        >
          <MenuItem onClick={onStartRename}>
            <Check className="h-3 w-3" />
            Rename
          </MenuItem>
          <MenuItem onClick={onTogglePin}>
            {session.pinned ? (
              <>
                <PinOff className="h-3 w-3" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="h-3 w-3" />
                Pin
              </>
            )}
          </MenuItem>
          <MenuItem onClick={onRequestDelete} danger>
            <Trash2 className="h-3 w-3" />
            Delete
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
        "hover:bg-surface-muted",
        danger ? "text-signal-down" : "text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
