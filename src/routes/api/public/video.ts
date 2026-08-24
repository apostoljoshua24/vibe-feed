import { createFileRoute } from "@tanstack/react-router";

const SOURCE = "https://girledit-api-version-2.vercel.app/api/request/f";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function fetchOne() {
  const res = await fetch(SOURCE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credits: "Eugene Aguilar" }),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  
  // Strict validation - reject empty or missing URLs
  if (!data || typeof data["url"] !== "string" || !data["url"].trim()) {
    throw new Error("Invalid upstream payload: missing or empty URL");
  }
  
  return {
    url: (data["url"] as string).trim(),
    username: (data["username"] as string) ?? "unknown",
    nickname: (data["nickname"] as string) ?? "Unknown",
    title: (data["title"] as string) ?? "Random video",
  };
}

export const Route = createFileRoute("/api/public/video")({
  server: {
    handlers: {
      GET: async () => {
        // Upstream is flaky: fire several parallel attempts per round and
        // keep retrying within a time budget before giving up.
        const deadline = Date.now() + 30_000; // Increased to 30 seconds
        let lastError: Error | null = null;
        
        while (Date.now() < deadline) {
          try {
            const video = await Promise.any([
              fetchOne(),
              fetchOne(),
              fetchOne(),
              fetchOne(),
              fetchOne(),
            ]);
            
            // Double-check that URL is valid before returning
            if (!video.url || !video.url.trim()) {
              throw new Error("URL validation failed before response");
            }
            
            return new Response(JSON.stringify(video), {
              headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
          } catch (err) {
            lastError = err as Error;
            console.error("Fetch attempt failed:", err);
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        
        // If we get here, all retries failed
        console.error("All video fetch attempts failed:", lastError);
        return new Response(
          JSON.stringify({ 
            error: "Unable to load video after retries",
            details: lastError?.message,
          }), 
          {
            status: 502,
            headers: { ...CORS, "Content-Type": "application/json" },
          }
        );
      },
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
    },
  },
});
