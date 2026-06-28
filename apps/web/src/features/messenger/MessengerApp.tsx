import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Conversation, Message } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { Badge, Button, Card, Input } from "../../lib/ui";

export function MessengerApp() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const queryClient = useQueryClient();
  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<{ conversations: Conversation[] }>("/api/conversations"),
  });

  const active = activeId ?? conversations.data?.conversations[0]?.id ?? null;

  const messages = useQuery({
    queryKey: ["messages", active],
    queryFn: () =>
      api<{ messages: Message[] }>(`/api/conversations/${active}/messages`),
    enabled: Boolean(active),
  });

  const send = useMutation({
    mutationFn: () =>
      api(`/api/conversations/${active}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: text }),
      }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (conversations.isError) {
    return (
      <QueryErrorCard
        title="Messenger failed to load"
        error={conversations.error}
        onRetry={() => void conversations.refetch()}
        className="p-4"
      />
    );
  }

  return (
    <div className="grid min-h-[420px] gap-3 md:grid-cols-[180px_1fr]">
      <Card className="p-3">
        <h2 className="text-lg font-black text-ocean">Messenger</h2>
        <div className="mt-3 grid gap-2">
          {conversations.isLoading && (
            <p className="text-sm text-slate-600">Loading conversations...</p>
          )}
          {conversations.data?.conversations.map((conversation) => (
            <Button
              key={conversation.id}
              variant={active === conversation.id ? "primary" : "soft"}
              className="justify-between"
              onClick={() => setActiveId(conversation.id)}
            >
              {conversation.title}
              {conversation.unreadCount > 0 && (
                <Badge>{conversation.unreadCount}</Badge>
              )}
            </Button>
          ))}
          {!conversations.isLoading &&
            !conversations.data?.conversations.length && (
              <p className="text-sm text-slate-600">No conversations yet.</p>
            )}
        </div>
      </Card>
      <Card className="grid grid-rows-[1fr_auto] gap-3 p-3">
        <div className="grid content-start gap-2 overflow-auto">
          {!active && (
            <p className="text-sm text-slate-600">
              Pick a conversation to start chatting.
            </p>
          )}
          {active && messages.isLoading && (
            <p className="text-sm text-slate-600">Loading messages...</p>
          )}
          {active && messages.isError && (
            <QueryErrorCard
              title="Messages failed to load"
              error={messages.error}
              onRetry={() => void messages.refetch()}
            />
          )}
          {messages.data?.messages.map((message) => (
            <div
              key={message.id}
              className="rounded-lg bg-white/80 px-3 py-2 text-sm"
            >
              <b className="text-ocean">{message.sender.displayName}:</b>{" "}
              {message.body}
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {send.isError && <ErrorNotice error={send.error} />}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim() && active) send.mutate();
            }}
          >
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write a message..."
            />
            <Button disabled={!active || !text.trim() || send.isPending}>
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
