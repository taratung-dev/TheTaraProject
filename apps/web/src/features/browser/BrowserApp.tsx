import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ExternalLink,
  Home,
  RefreshCcw,
  Search,
} from "lucide-react";
import type {
  BrowserBookmark,
  BrowserHistoryItem,
  BrowserMetadata,
  BrowserSettings,
  User,
} from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { SkeletonRow } from "../../lib/Skeleton";
import { Badge, Button, Card, Input } from "../../lib/ui";
import { GOpostClassic } from "../gopost/GOpostClassic";

function normalize(input: string) {
  if (input.startsWith("/")) return input;
  if (!/^https?:\/\//i.test(input)) return `https://${input}`;
  return input;
}

export function BrowserApp({ user }: { user: User }) {
  const [url, setUrl] = useState("/gopost");
  const [address, setAddress] = useState("/gopost");
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ["browser-history"],
    queryFn: () =>
      api<{ history: BrowserHistoryItem[] }>("/api/browser/history"),
  });
  const bookmarks = useQuery({
    queryKey: ["browser-bookmarks"],
    queryFn: () =>
      api<{ bookmarks: BrowserBookmark[] }>("/api/browser/bookmarks"),
  });
  const settings = useQuery({
    queryKey: ["browser-settings"],
    queryFn: () => api<{ settings: BrowserSettings }>("/api/browser/settings"),
  });
  const metadata = useQuery({
    queryKey: ["browser-metadata", url],
    queryFn: () =>
      api<{ metadata: BrowserMetadata }>(
        `/api/browser/metadata?url=${encodeURIComponent(url)}`,
      ),
    enabled: !url.startsWith("/") || url !== "/gopost",
  });

  const title = useMemo(
    () =>
      url === "/gopost"
        ? "GOpost! Classic"
        : (metadata.data?.metadata.title ?? url),
    [metadata.data, url],
  );

  const visit = useMutation({
    mutationFn: (nextUrl: string) =>
      api("/api/browser/history", {
        method: "POST",
        body: JSON.stringify({
          url: nextUrl,
          title: nextUrl === "/gopost" ? "GOpost! Classic" : title,
        }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["browser-history"] }),
  });

  const bookmark = useMutation({
    mutationFn: () =>
      api("/api/browser/bookmarks", {
        method: "POST",
        body: JSON.stringify({ url, title }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["browser-bookmarks"] }),
  });

  function navigate(next: string, push = true) {
    const normalized = normalize(next);
    if (push) {
      setBackStack((current) => [url, ...current]);
      setForwardStack([]);
    }
    setUrl(normalized);
    setAddress(normalized);
    visit.mutate(normalized);
  }

  function back() {
    const [previous, ...rest] = backStack;
    if (!previous) return;
    setForwardStack((current) => [url, ...current]);
    setBackStack(rest);
    navigate(previous, false);
  }

  function forward() {
    const [next, ...rest] = forwardStack;
    if (!next) return;
    setBackStack((current) => [url, ...current]);
    setForwardStack(rest);
    navigate(next, false);
  }

  return (
    <div className="grid min-h-[560px] gap-3 lg:grid-cols-[1fr_230px]">
      <section className="grid grid-rows-[auto_1fr] gap-3">
        <div className="grid gap-3">
          <Card className="grid gap-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="soft"
                className="h-9 w-9 p-0"
                onClick={back}
                disabled={!backStack.length}
              >
                <ArrowLeft size={16} />
              </Button>
              <Button
                variant="soft"
                className="h-9 w-9 p-0"
                onClick={forward}
                disabled={!forwardStack.length}
              >
                <ArrowRight size={16} />
              </Button>
              <Button
                variant="soft"
                className="h-9 w-9 p-0"
                onClick={() => navigate(url, false)}
              >
                <RefreshCcw size={16} />
              </Button>
              <Button
                variant="soft"
                className="h-9 w-9 p-0"
                onClick={() =>
                  navigate(settings.data?.settings.homepage ?? "/gopost")
                }
              >
                <Home size={16} />
              </Button>
              <form
                className="flex min-w-0 flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  navigate(address);
                }}
              >
                <Input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="/gopost or example.com"
                />
                <Button>
                  <Search size={16} />
                  Go
                </Button>
              </form>
              <Button
                variant="soft"
                className="h-9 w-9 p-0"
                onClick={() => bookmark.mutate()}
                disabled={bookmark.isPending}
              >
                <Bookmark size={16} />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Badge>
                {url.startsWith("/") ? "Internal" : "Internet Preview"}
              </Badge>
              <span>{title}</span>
            </div>
          </Card>

          {(settings.isError || visit.isError || bookmark.isError) && (
            <div className="grid gap-2">
              {settings.isError && (
                <ErrorNotice
                  error={settings.error}
                  message="Browser settings are temporarily unavailable. Using the default homepage."
                />
              )}
              {visit.isError && <ErrorNotice error={visit.error} />}
              {bookmark.isError && <ErrorNotice error={bookmark.error} />}
            </div>
          )}
        </div>

        <Card className="overflow-hidden">
          {metadata.isError && url !== "/gopost" ? (
            <QueryErrorCard
              title="This page failed to load"
              error={metadata.error}
              onRetry={() => void metadata.refetch()}
              className="m-4"
            />
          ) : (
            <BrowserPage
              url={url}
              metadata={metadata.data?.metadata}
              user={user}
            />
          )}
        </Card>
      </section>

      <aside className="grid content-start gap-3">
        <Card className="p-3">
          <h3 className="font-black text-ocean">Bookmarks</h3>
          <div className="mt-2 grid gap-1 text-sm">
            {bookmarks.isLoading ? (
              <>
                <SkeletonRow className="h-7" />
                <SkeletonRow className="mt-1 h-7" />
              </>
            ) : bookmarks.isError ? (
              <ErrorNotice error={bookmarks.error} />
            ) : bookmarks.data?.bookmarks.length ? (
              bookmarks.data.bookmarks.map((item) => (
                <button
                  key={item.id}
                  className="truncate rounded px-2 py-1 text-left hover:bg-sky-50"
                  onClick={() => navigate(item.url)}
                >
                  {item.title}
                </button>
              ))
            ) : (
              <span className="text-slate-500">No bookmarks yet.</span>
            )}
          </div>
        </Card>
        <Card className="p-3">
          <h3 className="font-black text-ocean">History</h3>
          <div className="mt-2 grid gap-1 text-sm">
            {history.isLoading ? (
              <>
                <SkeletonRow className="h-7" />
                <SkeletonRow className="mt-1 h-7" />
                <SkeletonRow className="mt-1 h-7" />
              </>
            ) : history.isError ? (
              <ErrorNotice error={history.error} />
            ) : history.data?.history.length ? (
              history.data.history.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  className="truncate rounded px-2 py-1 text-left hover:bg-sky-50"
                  onClick={() => navigate(item.url)}
                >
                  {item.title}
                </button>
              ))
            ) : (
              <span className="text-slate-500">No history yet.</span>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function BrowserPage({
  url,
  metadata,
  user,
}: {
  url: string;
  metadata?: BrowserMetadata;
  user: User;
}) {
  if (url === "/gopost") {
    return (
      <div className="h-[520px] overflow-auto">
        <GOpostClassic user={user} embedded />
      </div>
    );
  }

  if (metadata?.embeddable) {
    return (
      <iframe
        className="h-[520px] w-full bg-white"
        src={metadata.url}
        title={metadata.title}
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
      />
    );
  }

  return (
    <div className="grid min-h-[520px] place-items-center bg-slate-50 p-6 text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-black text-ocean">
          {metadata?.title ?? url}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {metadata?.description ||
            metadata?.reason ||
            "This site cannot be safely embedded here."}
        </p>
        <a
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ocean px-4 py-2 text-sm font-bold text-white"
          href={metadata?.url ?? url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={16} />
          Open externally
        </a>
      </div>
    </div>
  );
}
