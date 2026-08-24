/* Loop — standalone offline-bundled short video app (Capacitor WebView-free assets) */

// Video source: called directly from the app. Falls back to the hosted proxy
// if the device blocks the direct cross-origin call.
const SOURCE = "https://assh-nu.vercel.app/api/request/f";
const PROXIES = [
  "https://project--a691ccd6-a37a-4d28-be72-6b983a02d6e2-dev.lovable.app/api/public/video",
  "https://project--a691ccd6-a37a-4d28-be72-6b983a02d6e2.lovable.app/api/public/video",
];
let proxyIdx = 0;
const BODY = JSON.stringify({ credits: "Eugene Aguilar" });

const feed = document.getElementById("feed");
const tpl = document.getElementById("card-tpl");
const splash = document.getElementById("splash");

let muted = false;

// Play with sound; if the platform blocks unmuted autoplay, fall back to muted.
function playVideo(video) {
  video.muted = muted;
  const p = video.play();
  if (p && p.catch) {
    p.catch(() => {
      muted = true;
      video.muted = true;
      syncMuteIcons();
      video.play().catch(() => {});
    });
  }
}

function syncMuteIcons() {
  cards.forEach((c) => {
    c.video.muted = muted;
    c.node.querySelector(".ico-muted").classList.toggle("hidden", !muted);
    c.node.querySelector(".ico-loud").classList.toggle("hidden", muted);
  });
}
let loading = false;
const cards = [];
let active = -1;

function normalize(raw) {
  const d = (raw && (raw.result || raw.data)) || raw || {};
  const url = d.url || d.video || d.link || d.videoUrl || (Array.isArray(d.urls) ? d.urls[0] : null);
  if (!url || typeof url !== 'string' || url.trim() === '') throw new Error("no url");
  return {
    url: url.trim(),
    username: d.username || d.author || "loopuser",
    nickname: d.nickname || d.name || "Loop creator",
    title: d.title || d.caption || "Random video",
  };
}

function nativeHttp() {
  const cap = window.Capacitor;
  return cap && cap.Plugins && cap.Plugins.CapacitorHttp ? cap.Plugins.CapacitorHttp : null;
}

async function once(endpoint, direct) {
  const http = nativeHttp();
  const timeoutMs = direct ? 12000 : 10000;
  
  if (http) {
    // Native HTTP: no CORS, no preflight, works from the file:// WebView origin.
    try {
      const res = await http.request({
        url: endpoint,
        method: direct ? "POST" : "GET",
        headers: direct ? { "Content-Type": "application/json" } : {},
        data: direct ? { credits: "Eugene Aguilar" } : undefined,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      if (res.status < 200 || res.status >= 300) throw new Error("http " + res.status);
      const body = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      return normalize(body);
    } catch (err) {
      throw new Error(`Native HTTP failed: ${err.message}`);
    }
  }
  
  // Fetch API with AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(endpoint, {
      method: direct ? "POST" : "GET",
      headers: direct ? { "Content-Type": "application/json" } : undefined,
      body: direct ? BODY : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("http " + res.status);
    return normalize(await res.json());
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error("timeout");
    }
    throw err;
  }
}

let lastError = "";

async function fetchVideo() {
  const deadline = Date.now() + 30000; // Reduced to 30 seconds
  let useProxy = false;
  let attempts = 0;
  
  while (Date.now() < deadline) {
    try {
      const endpoint = useProxy ? PROXIES[proxyIdx % PROXIES.length] : SOURCE;
      const promises = [0, 1, 2].map(() => once(endpoint, !useProxy)); // Reduced parallel attempts
      return await Promise.any(promises);
    } catch (err) {
      attempts++;
      lastError = (err && err.errors ? err.errors[0] : err) + "";
      
      // Switch strategy after 2 attempts
      if (attempts % 2 === 0) {
        useProxy = !useProxy;
        if (useProxy) proxyIdx++;
      }
      
      // Shorter wait before retry
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error("unavailable after 30 seconds");
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
  const desc = node.querySelector(".desc");
  const moreBtn = node.querySelector(".more");
  desc.textContent = item.title || "Random video";
  desc.classList.add("clamped");
  requestAnimationFrame(() => {
    if (desc.scrollHeight - desc.clientHeight > 2) moreBtn.classList.remove("hidden");
  });
  moreBtn.addEventListener("click", () => {
    const open = desc.classList.toggle("clamped");
    moreBtn.textContent = open ? "See more" : "See less";
  });
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
    playVideo(video);
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
    syncMuteIcons();
  });

  video.addEventListener("click", () => {
    if (video.paused) playVideo(video);
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
            playVideo(c.video);
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
        playVideo(card.video);
        active = 0;
      }
    }
  } catch (err) {
    if (!cards.length) {
      splash.querySelector(".splash-text").textContent = "Tap to retry";
      const hint = splash.querySelector(".splash-hint");
      if (hint) hint.textContent = lastError.slice(0, 120);
      splash.onclick = () => {
        splash.querySelector(".splash-text").textContent = "Loading feed";
        if (hint) hint.textContent = "";
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
  else playVideo(card.video);
});

loadMore(2);
