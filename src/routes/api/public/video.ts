import { createFileRoute } from "@tanstack/react-router";

const SOURCE = "https://girledit-api-version-2.vercel.app/api/request/f";

async function fetchOne() {
  const res = await fetch(SOURCE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credits: "Eugene Aguilar" }),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  if (!data || typeof data["url"] !== "string") throw new Error("Invalid upstream payload");
  return {
    url: data["url"] as string,
    username: (data["username"] as string) ?? "unknown",
    nickname: (data["nickname"] as string) ?? "Unknown",
    title: (data["title"] as string) ?? "Random video",
  };
}

export const Route = createFileRoute("/api/public/video")({
  server: {
    handlers: {
      GET: async () => {
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            // Upstream is flaky: race a few parallel attempts and take the first success.
            const video = await Promise.any([fetchOne(), fetchOne(), fetchOne()]);
            return new Response(JSON.stringify(video), {
              headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
          } catch {
            await new Promise((r) => setTimeout(r, 200));
          }
        }
        return new Response(JSON.stringify({ error: "Unable to load video" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      },

    },
  },
});
