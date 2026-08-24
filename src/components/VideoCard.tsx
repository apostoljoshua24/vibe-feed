import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Loader2 } from "lucide-react";

export type VideoItem = {
  id: string;
  url: string;
  username: string;
  nickname: string;
  title: string;
};

type Props = {
  item: VideoItem;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onRetry?: () => void;
};

export function VideoCard({ item, active, muted, onToggleMute, onRetry }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Validate URL on mount or when item changes
  useEffect(() => {
    if (!item.url || item.url.trim() === "") {
      setLoading(false);
      setFailed(true);
    } else {
      setFailed(false);
      setLoading(true);
    }
  }, [item.id]); // Use item.id instead of item.url to trigger on new items

  useEffect(() => {
    const v = ref.current;
    if (!v || !item.url) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active, item.url]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: item.nickname, url: item.url });
      else await navigator.clipboard.writeText(item.url);
    } catch {
      /* ignored */
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setLoading(true);
    setFailed(false);
    
    if (item.url && item.url.trim() !== "") {
      // If URL exists, try reloading the video
      ref.current?.load();
    } else if (onRetry) {
      // If no URL, request a new video
      onRetry();
    }
    
    // Reset retry flag after 500ms
    setTimeout(() => setIsRetrying(false), 500);
  };

  return (
    <section className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-background">
      <div className="relative mx-auto flex h-full w-full items-center justify-center md:aspect-[9/16] md:h-full md:w-auto md:shadow-glow">
        {item.url && item.url.trim() !== "" && (
          <video
            ref={ref}
            src={item.url}
            className="h-full w-full object-cover"
            loop
            playsInline
            muted={muted}
            preload={active ? "auto" : "metadata"}
            onLoadedData={() => {
              setLoading(false);
              setFailed(false);
            }}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
          />
        )}

        {loading && !failed && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 grid place-items-center gap-3 bg-background/85 p-6 text-center">
            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">Error: no url</p>
              <p className="text-xs text-muted-foreground/70">Unable to load video. Tap button to get another video.</p>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                "Tap to retry"
              )}
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5">
          <ActionButton
            label={liked ? "Liked" : "Like"}
            onClick={() => setLiked((l) => !l)}
            active={liked}
          >
            <Heart className={liked ? "size-7 fill-current" : "size-7"} />
          </ActionButton>
          <ActionButton label="Comments" onClick={() => {}}>
            <MessageCircle className="size-7" />
          </ActionButton>
          <ActionButton label="Share" onClick={share}>
            <Share2 className="size-7" />
          </ActionButton>
          <ActionButton label={muted ? "Unmute" : "Mute"} onClick={onToggleMute}>
            {muted ? <VolumeX className="size-7" /> : <Volume2 className="size-7" />}
          </ActionButton>
        </div>

        <div className="absolute inset-x-0 bottom-8 px-4 pr-20">
          <p className="text-base font-semibold text-foreground">@{item.username}</p>
          <p className="text-sm text-muted-foreground">{item.nickname}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
            {item.title || "Random video"}
          </p>
        </div>

        {item.url && item.url.trim() !== "" && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground/10">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
    </section>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`grid size-12 place-items-center rounded-full bg-foreground/10 backdrop-blur transition active:scale-90 ${
        active ? "text-primary" : "text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
