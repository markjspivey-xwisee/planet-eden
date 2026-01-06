# Quick Integration Guide

## Making Your Simulation Production-Ready in 5 Minutes

### Option 1: Quick Integration (Recommended)

Add this single line to your existing `index.html` right before the closing `</body>` tag:

```html
    <!-- Production Enhancements -->
    <script src="production-enhancements.js"></script>
</body>
</html>
```

That's it! The enhancements will automatically:
- ✅ Check WebGL compatibility
- ✅ Monitor performance (FPS tracking)
- ✅ Handle errors gracefully
- ✅ Show tutorial on first visit
- ✅ Warn mobile users
- ✅ Save user settings
- ✅ Add keyboard shortcuts (H for help, P for screenshot, F for fullscreen)

### Option 2: Inline Integration

If you want everything in a single file, copy the contents of `production-enhancements.js` and paste it into a `<script>` tag in your `index.html`:

```html
    <!-- Production Enhancements -->
    <script>
        // Paste contents of production-enhancements.js here
    </script>
</body>
</html>
```

### Option 3: Custom Configuration

To customize the behavior, edit the `CONFIG` object in `production-enhancements.js`:

```javascript
const CONFIG = {
    VERSION: '1.0.0',
    DEBUG_MODE: false,              // Set true for console logs
    ANALYTICS_ID: 'G-XXXXXXXXXX',   // Your Google Analytics ID
    SENTRY_DSN: null,               // Your Sentry DSN for error tracking
    AUTO_QUALITY_ADJUST: true,       // Auto-reduce quality if FPS drops
    PERFORMANCE_MONITORING: true,    // Show FPS counter
    SHOW_TUTORIAL: true,            // Show tutorial on first visit
    MOBILE_WARNING: true            // Warn mobile users
};
```

## Additional Production Features

### 1. Add Google Analytics

1. Get your Google Analytics ID from https://analytics.google.com
2. Set `ANALYTICS_ID` in the CONFIG
3. Tracking will start automatically

Events tracked:
- Session start
- Tutorial shown/completed/skipped
- Screenshots captured
- Errors and exceptions
- Performance metrics
- View changes
- User interactions

### 2. Add Error Tracking with Sentry

1. Sign up at https://sentry.io
2. Get your DSN
3. Add this before `production-enhancements.js`:

```html
<script src="https://js.sentry-cdn.com/YOUR_KEY.min.js"></script>
<script>
  Sentry.init({
    dsn: 'YOUR_DSN',
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 0.1,
  });
</script>
<script src="production-enhancements.js"></script>
```

4. Set `SENTRY_DSN` in CONFIG

### 3. Add Meta Tags for SEO

Add to the `<head>` section of your index.html:

```html
<meta name="description" content="Experience a living rainforest ecosystem growing in real-time">
<meta name="keywords" content="rainforest, simulation, 3D, nature, ecosystem, WebGL">

<!-- Open Graph / Social Media -->
<meta property="og:title" content="Rainforest Growth Simulation">
<meta property="og:description" content="Watch a rainforest ecosystem grow and evolve in real-time">
<meta property="og:image" content="https://yourdomain.com/preview.jpg">
<meta property="og:url" content="https://yourdomain.com/">
```

### 4. Add FPS Counter UI

Add this to your HTML where you want the FPS to appear:

```html
<div style="position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.7); color: #6bb85a; padding: 0.5rem; border-radius: 4px; font-family: monospace;">
    FPS: <span id="fps-counter">60</span>
</div>
```

It will auto-update every second.

## Testing Your Production Build

### 1. Test WebGL Error Handling

Temporarily disable WebGL in your browser:
- Chrome: chrome://flags → Disable WebGL
- Should show a friendly error message instead of crashing

### 2. Test Mobile Warning

Open in mobile device or use Chrome DevTools:
- F12 → Toggle device toolbar
- Should show mobile warning on first visit
- Warning dismissal should persist

### 3. Test Tutorial

Clear localStorage and reload:
```javascript
localStorage.clear();
location.reload();
```
Should show tutorial overlay.

### 4. Test Screenshot

Press `P` or add a button:
```html
<button onclick="window.ProductionEnhancements.Screenshot.capture()">
    📷 Screenshot
</button>
```

### 5. Test Error Recovery

Trigger an error in console:
```javascript
throw new Error('Test error');
```
Should show user-friendly error notification.

### 6. Test Performance Monitoring

Watch the console for:
```
[Performance] Low FPS detected, reducing quality
```
Will auto-adjust if FPS drops below 20.

## Deployment Checklist

- [ ] Production enhancements integrated
- [ ] Google Analytics ID configured (optional)
- [ ] Meta tags added for SEO
- [ ] Tested on Chrome, Firefox, Safari, Edge
- [ ] Tested on mobile device
- [ ] Screenshot function works
- [ ] Tutorial shows on first visit
- [ ] Error handling works
- [ ] Performance monitoring active
- [ ] Settings persist across reloads

## Quick Deploy to Netlify

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Deploy
cd d:\devstuff\simulation
netlify deploy --prod

# Follow prompts to connect to Netlify account
```

Your site will be live at `https://random-name.netlify.app`

## Quick Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd d:\devstuff\simulation
vercel --prod
```

Your site will be live at `https://rainforest-simulation.vercel.app`

## Advanced Features

### Custom Analytics Events

```javascript
window.ProductionEnhancements.Analytics.track('custom_event', {
    category: 'interaction',
    label: 'tree_spawned',
    value: 1
});
```

### Manual Quality Control

```javascript
window.performanceMonitor.setQuality('low');   // Force low quality
window.performanceMonitor.setQuality('medium'); // Force medium
window.performanceMonitor.setQuality('high');   // Force high
```

### Programmatic Screenshot

```javascript
window.ProductionEnhancements.Screenshot.capture();
```

### Show/Hide Tutorial

```javascript
window.ProductionEnhancements.Tutorial.show();  // Show tutorial
window.ProductionEnhancements.Tutorial.skip();  // Skip and don't show again
```

### Reset Settings

```javascript
window.ProductionEnhancements.Settings.reset();  // Clear all saved settings
location.reload();  // Reload to apply
```

## Troubleshooting

### "THREE is not defined"
Make sure the production enhancements script comes AFTER Three.js loads.

### Tutorial doesn't show
Check: `localStorage.getItem('rainforest-settings')`
If it shows `tutorialCompleted: true`, clear it:
```javascript
localStorage.clear();
location.reload();
```

### FPS counter not updating
Make sure you have an element with `id="fps-counter"` in your HTML.

### Analytics not tracking
1. Check CONFIG.ANALYTICS_ID is set
2. Check browser console for Google Analytics errors
3. Verify ID format: `G-XXXXXXXXXX` (GA4) not `UA-XXXXXXXXXX` (old GA)

## Performance Optimization Tips

1. **Auto quality adjustment is enabled by default**
   - Will drop from medium→low if FPS < 20
   - Will increase from low→medium if FPS > 55

2. **Manual quality presets:**
   - Low: 40K grass, 7.5K rain particles, 1024px shadows
   - Medium: 80K grass, 15K rain particles, 2048px shadows
   - High: 120K grass, 25K rain particles, 4096px shadows

3. **Mobile devices automatically use low quality**

## Need More Help?

- See [PRODUCTION_GUIDE.md](PRODUCTION_GUIDE.md) for comprehensive guide
- See [README.md](README.md) for basic usage
- See [spec.md](spec.md) for technical details

## Quick Reference

| Feature | Keyboard | Code |
|---------|----------|------|
| Help | `H` | - |
| Screenshot | `P` | `Screenshot.capture()` |
| Fullscreen | `F` | - |
| Track Event | - | `Analytics.track('event', {})` |
| Set Quality | - | `performanceMonitor.setQuality('low')` |
| Reset Settings | - | `Settings.reset()` |

---

**You're now ready for production! 🚀**

The simulation will automatically:
- Check compatibility
- Monitor performance
- Handle errors gracefully
- Guide new users
- Track analytics (if configured)
- Save user preferences
- Optimize for mobile

All with zero additional code in your main application!
