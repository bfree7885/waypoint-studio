# Wire public YouTube IDs into DFD stories

Keep `youtubeVideoId: null` until the video is **public** and you have the real ID.

## Files

| Story | JSON record |
| --- | --- |
| Mount Hood | `data/deep-forest-dispatch/stories/mount-hood-rain-shadow.json` |
| Lençóis | `data/deep-forest-dispatch/stories/lencois-maranhenses.json` |

Also refresh catalog card metadata if needed (usually unchanged). Sitemap already lists the stories.

## Steps

1. Publish on YouTube → copy the video ID (e.g. `dQw4w9WgXcQ` from `youtube.com/watch?v=…` or `youtu.be/…`).  
2. Set `"youtubeVideoId": "<REAL_ID>"` in the story JSON (replace `null`). Leave `youtubeUrl` null or set the full watch URL consistently with existing schema.  
3. Re-render and test:

```bash
node scripts/dfd/render-stories.mjs
node automation/test-deep-forest-dispatch.mjs
```

4. Confirm the story HTML now embeds `youtube-nocookie.com` and includes VideoObject JSON-LD (tests enforce this when an ID is set).  
5. Commit, merge/deploy via normal Pages workflow (`push` to `main`).  
6. Verify production story page shows the embed (not “No film companion yet”).

## Do not

- Invent IDs  
- Commit placeholder IDs  
- Add VideoObject without a real public video
