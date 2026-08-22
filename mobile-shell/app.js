/* Loop — standalone offline-bundled short video app (Capacitor WebView-free assets) */

// Video source: called directly from the app. Falls back to the hosted proxy
// if the device blocks the direct cross-origin call.
const SOURCE = "https://girledit-api-version-2.vercel.app/api/request/f";
const PROXIES = [
  "https://project--a691ccd6-a37a-4d28-be72-6b983a02d6e2.lovable.app/api/public/video",
  "https://project--a691ccd6-a37a-4d28-be72-6b983a02d6e2-dev.lovable.app/api/public/video",
];
let proxyIdx = 0;
const BODY = JSON.stringify({ credits: "Eugene Aguilar" });

const feed = document.getElementById("feed");
const tpl = document.getElementById("card-tpl");
const splash = document.getElementById("splash");

let muted = true;
let loading = false;
const cards = [];
let active = -1;

function normalize(raw) {
  const d = (raw && (raw.result || raw.data)) || raw || {};
  const url = d.url || d.video || d.link || d.videoUrl || (Array.isArray(d.urls) ? d.urls[0] : null);
  if (!url) throw new Error("no url");
  return {
    url,
    username: d.username || d.author || "loopuser",
    nickname: d.nickname || d.name || "Loop creator",
    title: d.title || d.caption || "Random video",
  };
}

async function once(endpoint, direct) {
  const res = await fetch(endpoint, {
    method: direct ? "POST" : "GET",
    headers: direct ? { "Content-Type": "application/json" } : undefined,
    body: direct ? BODY : undefined,
  });
  if (!res.ok) throw new Error("http " + res.status);
  return normalize(await res.json());
}

async function fetchVideo() {
  const deadline = Date.now() + 25000;
  let useProxy = false;
  while (Date.now() < deadline) {
    try {
      const attempts = [0, 1, 2].map(() =>
        useProxy ? once(PROXIES[proxyIdx % PROXIES.length], false) : once(SOURCE, true),
      );
      return await Promise.any(attempts);
    } catch {
      if (useProxy) proxyIdx++;
      useProxy = !useProxy; // alternate direct / proxy
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error("unavailable");
}

function buildCard(item, index) {
  const node = tpl.content.firstElementChild.cloneNode(true);
  const video = node.querySelector("video");
  const spinner = node.querySelector(".spinner");
  const failed = node.querySelector(".failed");
  const fill = node.querySelector(".bar-fill");
  const likeBtn = node.querySelector(".like");
  const likeCount = likeBtn.querySelector(".count");
  const muteBtn = node.querySelector(".mute");

  node.dataset.index = String(index);
  video.src = item.url;
  video.muted = muted;
  node.querySelector(".user").textContent = "@" + item.username;
  node.querySelector(".nick").textContent = item.nickname;
  node.querySelector(".desc").textContent = item.title || "Random video";
  likeCount.textContent = String(Math.floor(Math.random() * 900) + 40);
  node.querySelector(".comment .count").textContent = String(Math.floor(Math.random() * 200) + 3);

  video.addEventListener("loadeddata", () => spinner.classList.add("hidden"));
  video.addEventListener("error", () => {
    spinner.classList.add("hidden");
    failed.classList.remove("hidden");
  });
  video.addEventListener("timeupdate", () => {
    if (video.duration) fill.style.width = (video.currentTime / video.duration) * 100 + "%";
  });
  node.querySelector(".retry").addEventListener("click", () => {
    failed.classList.add("hidden");
    spinner.classList.remove("hidden");
    video.load();
    video.play().catch(() => {});
  });

  let liked = false;
  likeBtn.addEventListener("click", () => {
    liked = !liked;
    likeBtn.classList.toggle("liked", liked);
    likeCount.textContent = String(Number(likeCount.textContent) + (liked ? 1 : -1));
  });

  node.querySelector(".share").addEventListener("click", async () => {
    try {
      if (navigator.share) await navigator.share({ title: item.nickname, url: item.url });
      else await navigator.clipboard.writeText(item.url);
    } catch {
      /* ignored */
    }
  });

  muteBtn.addEventListener("click", () => {
    muted = !muted;
    cards.forEach((c) => {
      c.video.muted = muted;
      c.node.querySelector(".ico-muted").classList.toggle("hidden", !muted);
      c.node.querySelector(".ico-loud").classList.toggle("hidden", muted);
    });
  });

  video.addEventListener("click", () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });

  node.querySelector(".ico-muted").classList.toggle("hidden", !muted);
  node.querySelector(".ico-loud").classList.toggle("hidden", muted);

  return { node, video };
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const idx = Number(entry.target.dataset.index);
      const card = cards[idx];
      if (!card) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
        active = idx;
        cards.forEach((c, i) => {
          if (i === idx) {
            c.video.muted = muted;
            c.video.play().catch(() => {});
          } else if (!c.video.paused) {
            c.video.pause();
            c.video.currentTime = 0;
          }
        });
        if (idx >= cards.length - 2) loadMore(1);
      }
    });
  },
  { root: feed, threshold: [0.6] },
);

async function loadMore(count) {
  if (loading) return;
  loading = true;
  try {
    for (let i = 0; i < count; i++) {
      const item = await fetchVideo();
      const card = buildCard(item, cards.length);
      cards.push(card);
      feed.appendChild(card.node);
      observer.observe(card.node);
      if (cards.length === 1) {
        splash.classList.add("out");
        setTimeout(() => splash.classList.add("hidden"), 400);
        card.video.play().catch(() => {});
        active = 0;
      }
    }
  } catch {
    if (!cards.length) {
      splash.querySelector(".splash-text").textContent = "Tap to retry";
      splash.onclick = () => {
        splash.querySelector(".splash-text").textContent = "Loading feed";
        splash.onclick = null;
        loadMore(2);
      };
    }
  } finally {
    loading = false;
  }
}

document.addEventListener("visibilitychange", () => {
  const card = cards[active];
  if (!card) return;
  if (document.hidden) card.video.pause();
  else card.video.play().catch(() => {});
});

loadMore(2);
