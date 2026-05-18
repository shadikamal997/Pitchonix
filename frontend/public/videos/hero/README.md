# Add Your Hero Video Here

## Quick Start:

1. **Add your video file:**
   - Place your video in this folder
   - Recommended name: `login-hero.mp4` or `hero-background.mp4`
   - Format: MP4 (H.264 codec)
   - Max file size: 5-10MB

2. **Update the login page:**
   - The code already supports video backgrounds
   - Just replace the `videoSrc` prop in the login/register pages
   - Example: `/videos/hero/login-hero.mp4`

## Example Video Download Sources:

### Free Stock Video Sites:
- **Pexels:** https://www.pexels.com/videos/
- **Pixabay:** https://pixabay.com/videos/
- **Coverr:** https://coverr.co/
- **Videvo:** https://www.videvo.net/

### Recommended Search Terms:
- "business meeting"
- "office work"
- "modern workspace"
- "team collaboration"
- "presentation"
- "professional office"
- "startup culture"
- "creative workspace"

## Video Optimization:

If your video is too large, compress it with FFmpeg:

```bash
# Compress to under 5MB with good quality
ffmpeg -i your-video.mp4 -c:v libx264 -crf 28 -preset fast -vf scale=1920:1080 -an login-hero.mp4
```

## Example Usage:

Once you add `login-hero.mp4` to this folder, the login page will automatically use it!
