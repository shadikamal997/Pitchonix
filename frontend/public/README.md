# Public Assets Directory

This folder contains all static assets (images, videos, fonts, etc.) for the Pitchonix application.

## Folder Structure

```
public/
├── images/          # Static images (PNG, JPG, SVG, WebP)
│   ├── hero/        # Hero section images
│   ├── logos/       # Brand logos
│   └── ui/          # UI elements and icons
├── videos/          # Video files (MP4, WebM)
│   └── hero/        # Hero section videos
└── README.md        # This file
```

## How to Add Assets

### Images
Place your images in the appropriate subfolder:
```
public/images/hero/business-presentation.jpg
public/images/logos/pitchonix-logo.svg
```

Usage in components:
```tsx
<img src="/images/hero/business-presentation.jpg" alt="Hero" />
```

### Videos
Place your videos in the videos folder:
```
public/videos/hero/hero-background.mp4
```

Usage in components:
```tsx
<video autoPlay muted loop playsInline>
  <source src="/videos/hero/hero-background.mp4" type="video/mp4" />
</video>
```

## Video Format Recommendations

### Hero Video Specifications:
- **Format:** MP4 (H.264 codec) for best browser compatibility
- **Resolution:** 1920x1080 (Full HD) or 1280x720 (HD)
- **Aspect Ratio:** 16:9 for landscape, 9:16 for vertical content
- **File Size:** Keep under 5-10MB for fast loading
- **Duration:** 10-30 seconds (looping)
- **Frame Rate:** 30fps or 24fps
- **Bitrate:** 2-5 Mbps for good quality/size balance

### Optimization Tips:
1. Compress videos using tools like HandBrake or FFmpeg
2. Use WebM as fallback format for better compression
3. Consider using a poster image for initial load
4. Mute videos to avoid autoplay restrictions

### Example FFmpeg Compression:
```bash
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast -vf scale=1920:1080 -an output.mp4
```

## Current Assets

### Login/Register Pages:
- Hero video: `public/videos/hero/login-hero.mp4` (add your video here)
- Fallback image: Uses Unsplash URL (can be replaced with local image)

### Recommended Hero Video Themes:
- Business meetings and collaboration
- Modern office environments
- Technology and innovation
- Professional presentations
- Creative workspace scenes
- Startup culture moments

## Performance Best Practices

1. **Lazy Loading:** Videos should use loading="lazy" when possible
2. **Responsive Videos:** Provide multiple resolutions for different devices
3. **Poster Images:** Always include a poster frame for videos
4. **Preload:** Use preload="metadata" for hero videos
5. **Fallbacks:** Always provide image fallbacks for slow connections
