import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { SkeletonCard } from "../../lib/Skeleton";
import { Button, Card, Input, Tabs, Textarea } from "../../lib/ui";

function renderMarkdown(markdown: string) {
  const blocks = markdown.split(/\n\n+/).filter(Boolean);
  if (!blocks.length) {
    return <p className="text-sm text-slate-500">Nothing to preview yet.</p>;
  }
  return blocks.map((block) => {
    const blockKey = `block-${block}`;
    const lines = block.split("\n");
    if (lines.every((line) => line.trim().startsWith("- "))) {
      return (
        <ul
          key={blockKey}
          className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700"
        >
          {lines.map((line) => (
            <li key={`${blockKey}-${line}`}>{line.trim().slice(2)}</li>
          ))}
        </ul>
      );
    }
    const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const Tag =
        heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      return (
        <Tag key={blockKey} className="font-black text-ocean">
          {heading[2]}
        </Tag>
      );
    }
    return (
      <p
        key={blockKey}
        className="whitespace-pre-wrap text-sm leading-6 text-slate-700"
      >
        {block}
      </p>
    );
  });
}

export function NotesApp() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [tab, setTab] = useState<"Edit" | "Preview">("Edit");

  const notes = useQuery({
    queryKey: ["notes"],
    queryFn: () => api<{ notes: Note[] }>("/api/notes"),
  });

  const selectedNote =
    notes.data?.notes.find((note) => note.id === selectedId) ??
    notes.data?.notes[0] ??
    null;

  const selectedNoteId = selectedNote?.id ?? null;

  useEffect(() => {
    if (!selectedNote) return;
    setSelectedId(selectedNote.id);
    setDraft({ title: selectedNote.title, body: selectedNote.body });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId]);

  const createNote = useMutation({
    mutationFn: () =>
      api<{ note: Note }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "New Note", body: "" }),
      }),
    onSuccess: ({ note }) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setSelectedId(note.id);
      setDraft({ title: note.title, body: note.body });
      setTab("Edit");
    },
  });

  const saveNote = useMutation({
    mutationFn: () =>
      api<{ note: Note }>(`/api/notes/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      }),
    onSuccess: ({ note }) => {
      queryClient.setQueryData<{ notes: Note[] }>(["notes"], (current) => ({
        notes: current?.notes.map((item) =>
          item.id === note.id ? note : item,
        ) ?? [note],
      }));
      setDraft({ title: note.title, body: note.body });
    },
  });

  const removeNote = useMutation({
    mutationFn: (noteId: number) =>
      api(`/api/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: (_, noteId) => {
      queryClient.setQueryData<{ notes: Note[] }>(["notes"], (current) => ({
        notes: current?.notes.filter((item) => item.id !== noteId) ?? [],
      }));
      setSelectedId((current) => (current === noteId ? null : current));
    },
  });

  if (notes.isError) {
    return (
      <QueryErrorCard
        title="Notes failed to load"
        error={notes.error}
        onRetry={() => void notes.refetch()}
        className="p-4"
      />
    );
  }

  if (!notes.data) {
    return <SkeletonCard lines={5} className="p-4" />;
  }

  const dirty =
    Boolean(selectedNote) &&
    (draft.title !== selectedNote?.title || draft.body !== selectedNote?.body);

  return (
    <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black text-ocean">Notes Mini</h2>
          <Button
            type="button"
            className="px-2 py-1 text-xs"
            onClick={() => createNote.mutate()}
            disabled={createNote.isPending}
          >
            {createNote.isPending ? "Adding..." : "New Note"}
          </Button>
        </div>
        <div className="mt-3 grid gap-2">
          {notes.data.notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`rounded-xl border px-3 py-2 text-left transition ${
                note.id === selectedNote?.id
                  ? "border-sky-300 bg-sky-50"
                  : "border-slate-200 bg-white/80 hover:border-sky-200 hover:bg-sky-50/60"
              }`}
              onClick={() => {
                setSelectedId(note.id);
                setDraft({ title: note.title, body: note.body });
              }}
            >
              <div className="font-bold text-ocean">
                {note.title || "Untitled Note"}
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                {note.body || "Empty note"}
              </div>
            </button>
          ))}
          {!notes.data.notes.length && (
            <p className="text-sm text-slate-500">
              No notes yet. Create your first one.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-4">
        {selectedNote ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Untitled Note"
                className="font-bold"
              />
              <div className="flex flex-wrap gap-2">
                <Tabs
                  tabs={["Edit", "Preview"]}
                  active={tab}
                  onChange={(value) => setTab(value as "Edit" | "Preview")}
                />
                <Button
                  type="button"
                  onClick={() => saveNote.mutate()}
                  disabled={!dirty || saveNote.isPending}
                >
                  {saveNote.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => removeNote.mutate(selectedNote.id)}
                  disabled={removeNote.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
            {tab === "Edit" ? (
              <Textarea
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="Write your markdown note here..."
                className="min-h-[320px]"
              />
            ) : (
              <div className="grid min-h-[320px] content-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
                {renderMarkdown(draft.body)}
              </div>
            )}
            {(saveNote.isError || removeNote.isError || createNote.isError) && (
              <ErrorNotice
                error={saveNote.error ?? removeNote.error ?? createNote.error}
              />
            )}
          </div>
        ) : (
          <div className="grid min-h-[240px] place-items-center text-sm text-slate-500">
            Pick a note to start editing.
          </div>
        )}
      </Card>
    </div>
  );
}
