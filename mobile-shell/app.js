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
  
  if (http) {
    // Native HTTP: no CORS, no preflight, works from the file:// WebView origin.
    try {
      const res = await http.request({
        url: endpoint,
        method: direct ? "POST" : "GET",
        headers: direct ? { "Content-Type": "application/json" } : {},
        data: direct ? { credits: "Eugene Aguilar" } : undefined,
        connectTimeout: 8000,
        readTimeout: 8000,
      });
      if (res.status < 200 || res.status >= 300) throw new Error("http " + res.status);
      const body = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      return normalize(body);
    } catch (err) {
      throw new Error(`Native HTTP: ${err.message}`);
    }
  }
  
  // Fetch API with AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  try {
    const res = await fetch(endpoint, {
      method: direct ? "POST" : "GET",
      headers: direct ? { "Content-Type": "application/json" } : undefined,
      body: direct ? BODY : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    return normalize(data);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

let lastError = "";

async function fetchVideo() {
  const deadline = Date.now() + 20000; // 20 seconds total
  let useProxy = false;
  let attempts = 0;
  
  while (Date.now() < deadline) {
    try {
      attempts++;
      const endpoint = useProxy ? PROXIES[proxyIdx % PROXIES.length] : SOURCE;
      
      // Try 2 parallel requests
      const promises = [once(endpoint, !useProxy), once(endpoint, !useProxy)];
      const result = await Promise.any(promises);
      
      console.log(`✓ Video fetched on attempt ${attempts}`);
      return result;
    } catch (err) {
      lastError = err.message || err + "";
      console.warn(`✗ Attempt ${attempts} failed:`, lastError);
      
      // Switch between direct and proxy more aggressively
      if (attempts % 1 === 0) {
        useProxy = !useProxy;
        if (useProxy) proxyIdx = (proxyIdx + 1) % PROXIES.length;
      }
      
      // Very short wait before retry
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  
  console.error("✗ All attempts failed after", attempts);
  throw new Error(`Failed after ${attempts} attempts: ${lastError}`);
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

  video.addEventListener("loadeddata", () => {
    spinner.classList.add("hidden");
    failed.classList.add("hidden");
  });
  video.addEventListener("error", () => {
    spinner.classList.add("hidden");
    failed.classList.remove("hidden");
  });
  video.addEventListener("timeupdate", () => {
    if (video.duration) fill.style.width = (video.currentTime / video.duration) * 100 + "%";
  });
  
  const retryBtn = node.querySelector(".retry");
  retryBtn.addEventListener("click", async () => {
    spinner.classList.remove("hidden");
    failed.classList.add("hidden");
    retryBtn.disabled = true;
    retryBtn.textContent = "Retrying...";
    
    try {
      // Try to reload the current video
      video.src = item.url;
      video.load();
      await new Promise(r => setTimeout(r, 100));
      playVideo(video);
      retryBtn.disabled = false;
      retryBtn.textContent = "Retry";
    } catch (err) {
      console.error("Retry failed:", err);
      failed.classList.remove("hidden");
      spinner.classList.add("hidden");
      retryBtn.disabled = false;
      retryBtn.textContent = "Retry";
    }
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
    console.error("loadMore error:", err);
    if (!cards.length) {
      const text = splash.querySelector(".splash-text");
      const hint = splash.querySelector(".splash-hint");
      text.textContent = "Tap to retry";
      if (hint) hint.textContent = lastError.slice(0, 100);
      
      splash.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        text.textContent = "Loading feed...";
        if (hint) hint.textContent = "";
        splash.onclick = null;
        await loadMore(2);
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

console.log("🎬 App initialized. Starting video load...");
loadMore(2);
