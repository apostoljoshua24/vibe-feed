# Vibe Feed

Create a modern mobile-first  apk that works like a TikTok-style vertical short-video feed. Apk app gagawin mo then e build nalang sa github

Core concept:

* No login or registration required.
* Open the website and immediately show a full-screen vertical video.
* Users can swipe/scroll vertically to move between videos, similar to TikTok.
* Each video occupies the entire screen.
* Videos should autoplay when they become visible.
* Pause videos when they are no longer visible.
* Use smooth vertical snap scrolling.
* The interface should feel like a real short-video social media app, but do not copy TikTok branding, logo, or copyrighted UI assets.

VIDEO API:
Use this API as the source for random videos:

POST:
https://girledit-api-version-2.vercel.app/api/request/f

Request body:
{
"credits": "Eugene Aguilar"
}

The API response contains:

* url = video URL
* username = username associated with the video
* nickname = display nickname

Example Node.js logic:

const axios = require("axios");

const response = await axios.post(
"https://girledit-api-version-2.vercel.app/api/request/f",
{
credits: "Eugene Aguilar"
}
);

const videoUrl = response.data.url;
const username = response.data.username;
const nickname = response.data.nickname;

IMPORTANT:
Do not download the video to the server before displaying it. Use the returned video URL directly in the HTML5 video player whenever possible.

BACKEND:
Use Node.js + Express.

Create an API endpoint such as:

GET /api/video

When requested:

1. Send a POST request to the provided GirlEdit API.
2. Extract url, username, and nickname.
3. Return JSON to the frontend:

{
"url": "...",
"username": "...",
"nickname": "..."
}

Handle API errors properly and return a clean error response.

FRONTEND:
Create a full-screen vertical feed.

Each video card should contain:

* Full-screen 9:16 video
* Autoplay
* Muted by default
* Loop
* PlaysInline
* Username
* Nickname
* Small description such as "Random video"
* Like button
* Comment button UI
* Share button
* Mute/unmute button
* Loading indicator
* Small progress indicator if appropriate

VERTICAL SCROLL:
Implement TikTok-like scrolling:

* One video per screen.
* CSS scroll-snap-type: y mandatory.
* Each item should use scroll-snap-align: start.
* Smooth scrolling.
* Detect which video is currently visible using IntersectionObserver.
* Automatically play the visible video.
* Automatically pause videos outside the viewport.

LOADING:
When the app opens:

1. Show a loading screen.
2. Request the first video from /api/video.
3. Display the first video.
4. Prefetch another video in the background.
5. When the user scrolls toward the next video, show the prefetched video immediately.
6. Continue loading additional videos as the user scrolls.

INFINITE FEED:
The feed must be practically infinite.

Whenever the user reaches near the last loaded video:

* Request another video from /api/video.
* Add it to the feed.
* Prefetch the next one.
* Never require the user to manually refresh.

PERFORMANCE:

* Do not load many videos simultaneously.
* Use lazy loading.
* Only preload the next one or two videos.
* Pause videos that are far outside the viewport.
* Prevent unnecessary API requests.
* Add retry logic when the API fails.
* Show "Unable to load video" with a retry button when necessary.

DESIGN:
Make the UI dark, clean, modern, and mobile-first.

The video should be the main focus.

Example layout:

---

|                                              |
|                 FULL VIDEO                   |
|                                              |
|                                              |
|                                              |
|                              ❤️              |
|                              💬              |
|                              ↗               |
|                              🔊              |
|                                              |
| @username                                    |
| Nickname                                      |
| Random video                                  |
|                                              |
------------------------------------------------

```
      swipe up for next video
```

DESKTOP:
On desktop, keep the video centered with a 9:16 aspect ratio and a dark background around it.

MOBILE:
On mobile, the video should fill the entire viewport.

NAVIGATION:
Keep the interface minimal.

Top:

* App name/logo
* Optional search button

Right side:

* Like
* Comment
* Share
* Sound

Bottom:

* Username
* Nickname
* Short description

No login screen.
No signup screen.
No account creation.
No complicated dashboard.

TECH STACK:

* Node.js
* Express
* HTML
* CSS
* Vanilla JavaScript
* Axios

Keep CSS and JavaScript organized and make the project easy to deploy.

PROJECT STRUCTURE:

/project
server.js
package.json
/public
index.html
style.css
app.js

The Express server should serve the frontend from /public.

SECURITY:
Keep API requests on the backend instead of exposing unnecessary server-side logic in the browser.

Do not hardcode temporary video results. The app must dynamically request new videos from the API.

The final result should feel like a polished TikTok-style random video discovery app with instant playback, vertical swipe navigation, infinite loading, and no login requirement.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a691ccd6-a37a-4d28-be72-6b983a02d6e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
