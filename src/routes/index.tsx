import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, Zap } from "lucide-react";
import { VideoCard, type VideoItem } from "@/components/VideoCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SacShawty — Endless Short Video Feed" },
      {
        name: "description",
        content:
          "Swipe through an endless vertical feed of random short videos. No login, instant playback, mobile-first.",
      },
      { property: "og:title", content: "SacShawty — Endless Short Video Feed" },
      {
        property: "og:description",
        content: "Swipe through an endless vertical feed of random short videos. No login needed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Feed,
});

async function fetchVideo(retries = 3): Promise<VideoItem> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch("/api/public/video");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      return { ...data, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error("failed");
}

function Feed() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async (count = 1) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      for (let i = 0; i < count; i++) {
        const video = await fetchVideo();
        setItems((prev) => [...prev, video]);
        setError(false);
      }
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadMore(2);
  }, [loadMore]);

  useEffect(() => {
    if (items.length && activeIndex >= items.length - 2) loadMore(1);
  }, [activeIndex, items.length, loadMore]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset["index"]);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root, threshold: [0.6] },
    );
    root.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items.length]);

  if (!items.length) {
    return (
      <main className="grid h-[100dvh] place-items-center bg-background px-6 text-center">
        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Unable to load video</p>
            <button
              onClick={() => loadMore(2)}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Zap className="mx-auto size-10 animate-pulse text-primary" />
            <p className="text-sm tracking-widest text-muted-foreground uppercase">Loading feed</p>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
        <h1 className="flex items-center gap-1.5 text-lg font-black tracking-tight text-foreground">
          <Zap className="size-5 text-primary" /> SacShawty
        </h1>
        <button
          aria-label="Search"
          className="pointer-events-auto grid size-9 place-items-center rounded-full bg-foreground/10 text-foreground backdrop-blur"
        >
          <Search className="size-4" />
        </button>
      </header>

      <div
        ref={containerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div key={item.id} data-index={i}>
            <VideoCard
              item={item}
              active={i === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
            />
          </div>
        ))}
        <div className="grid h-24 place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    </main>
  );
}
