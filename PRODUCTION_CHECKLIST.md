# Production Deployment Checklist

Use this checklist to ensure your Rainforest Simulation is ready for retail consumers.

## ✅ Pre-Deployment (5-15 minutes)

### Essential (Must-Have)

- [ ] **Add production enhancements**
  ```html
  <script src="production-enhancements.js"></script>
  ```

- [ ] **Test WebGL compatibility**
  - Open in Chrome, Firefox, Edge, Safari
  - Should load without errors
  - Verify fallback error message if WebGL disabled

- [ ] **Test mobile experience**
  - Open on phone/tablet OR use Chrome DevTools mobile view
  - Mobile warning should appear
  - Performance should be acceptable (20+ FPS)

- [ ] **Verify tutorial shows**
  - Clear localStorage: `localStorage.clear()`
  - Reload page
  - Tutorial overlay should appear

- [ ] **Test error handling**
  - Trigger error in console: `throw new Error('test')`
  - Should show user-friendly notification, not crash

### Recommended (Should-Have)

- [ ] **Add SEO meta tags** (see INTEGRATION.md)
  ```html
  <meta name="description" content="Your description">
  <meta property="og:title" content="Rainforest Simulation">
  ```

- [ ] **Configure Google Analytics** (optional but recommended)
  - Get GA4 ID from analytics.google.com
  - Set in `production-enhancements.js`: `ANALYTICS_ID: 'G-XXXXXXXXXX'`
  - Verify tracking in GA Real-Time view

- [ ] **Test on multiple browsers**
  - [ ] Chrome/Chromium
  - [ ] Firefox
  - [ ] Safari (Mac/iOS)
  - [ ] Edge

- [ ] **Test keyboard shortcuts**
  - `H` - Shows help
  - `P` - Takes screenshot
  - `F` - Toggles fullscreen
  - `ESC` - Exits first person

### Optional (Nice-to-Have)

- [ ] **Set up error tracking**
  - Sign up for Sentry.io
  - Add Sentry script before production-enhancements.js
  - Set SENTRY_DSN in CONFIG

- [ ] **Create social media preview image**
  - Take screenshot of simulation
  - Resize to 1200x630px
  - Update `og:image` meta tag

- [ ] **Add custom favicon**
  ```html
  <link rel="icon" type="image/png" href="favicon.png">
  ```

## 🧪 Testing (15-30 minutes)

### Functional Testing

- [ ] **Simulation loads**
  - Loading bar progresses
  - No errors in console
  - Scene renders correctly

- [ ] **All features work**
  - [ ] Bird's eye view camera (rotate, zoom, pan)
  - [ ] First person mode (WASD movement, mouse look)
  - [ ] Auto rotate toggle
  - [ ] Time speed control (1x, 2x, 5x, 10x)
  - [ ] Spawn tree button
  - [ ] Trigger rain button

- [ ] **Day/night cycle**
  - Dawn → Day → Dusk → Night transitions
  - Sky colors change correctly
  - Stars appear at night
  - Sun/moon lighting works

- [ ] **Weather system**
  - Rain starts automatically
  - Cloud cover increases
  - Rain particles visible
  - Water ripples during rain

- [ ] **Growth mechanics**
  - Trees spawn over time
  - Trees grow taller
  - Tree count increases
  - Flowers open/close with time of day

### Performance Testing

- [ ] **Check FPS on different devices**
  - High-end (60 FPS expected)
  - Mid-range (40-60 FPS)
  - Low-end (20-40 FPS with auto quality reduction)
  - Mobile (15-30 FPS acceptable)

- [ ] **Verify auto quality adjustment**
  - Force low performance: Open 10+ browser tabs
  - Should auto-reduce quality if FPS < 20
  - Console message: "Low FPS detected, reducing quality"

- [ ] **Monitor memory usage**
  - Open DevTools → Performance Monitor
  - Should stay < 500MB on desktop
  - Should stay < 200MB on mobile

### Accessibility Testing

- [ ] **Keyboard navigation**
  - Can tab through all buttons
  - Focus indicators visible
  - Shortcuts work (H, P, F, ESC)

- [ ] **Screen reader** (Optional)
  - Announcements work
  - ARIA labels present
  - Status updates announced

- [ ] **Color contrast**
  - Text readable on backgrounds
  - Buttons clearly visible

## 🚀 Deployment (5-10 minutes)

### Choose Your Platform

#### Option A: Netlify (Easiest)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd d:\devstuff\simulation
netlify deploy --prod
```

- [ ] Deployment successful
- [ ] Site accessible at provided URL
- [ ] Test live site
- [ ] No console errors on live site

#### Option B: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd d:\devstuff\simulation
vercel --prod
```

- [ ] Deployment successful
- [ ] Site accessible
- [ ] Test live site

#### Option C: GitHub Pages

```bash
# Create repo, commit files
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/rainforest-sim.git
git push -u origin main

# Enable GitHub Pages in repo settings
```

- [ ] Repo created
- [ ] Files pushed
- [ ] GitHub Pages enabled
- [ ] Site accessible at username.github.io/rainforest-sim

#### Option D: Custom Server

- [ ] Upload files via FTP/SFTP
- [ ] Configure web server (Nginx/Apache)
- [ ] HTTPS enabled
- [ ] CDN configured (optional)

### Post-Deployment

- [ ] **Verify live site loads**
  - Open in incognito window
  - No cached files
  - Everything works

- [ ] **Test from different locations**
  - Different network
  - Different country (optional)
  - Mobile network

- [ ] **Check performance**
  - Use PageSpeed Insights: https://pagespeed.web.dev/
  - Should score 80+ on Performance
  - Address any critical issues

- [ ] **Verify analytics** (if configured)
  - Visit site
  - Check Google Analytics Real-Time
  - Should show 1 active user

## 📊 Monitoring (Ongoing)

### Week 1

- [ ] **Check error rates daily**
  - Console errors
  - Sentry dashboard (if configured)
  - Should be < 1% error rate

- [ ] **Monitor performance**
  - Average FPS
  - Load times
  - Bounce rate

- [ ] **User feedback**
  - Social media mentions
  - Email feedback
  - GitHub issues

### Ongoing

- [ ] **Weekly analytics review**
  - Sessions
  - Average session duration
  - Device breakdown
  - Browser breakdown

- [ ] **Monthly performance check**
  - FPS stats
  - Error rates
  - User engagement

- [ ] **Quarterly updates**
  - Fix known bugs
  - Add requested features
  - Update dependencies

## 🐛 Common Issues & Fixes

### "THREE is not defined"
**Fix:** Move `production-enhancements.js` to load AFTER Three.js

### Tutorial doesn't show
**Fix:** Clear localStorage: `localStorage.clear()` then reload

### Poor FPS on all devices
**Fix:** Check if quality settings are configured correctly in production-enhancements.js

### Mobile warning doesn't appear
**Fix:** Set `MOBILE_WARNING: true` in CONFIG

### Analytics not tracking
**Fix:** Verify `ANALYTICS_ID` is set and correct format (G-XXXXXXXXXX)

### Screenshot doesn't work
**Fix:** Ensure renderer is initialized, check browser allows downloads

## 📞 Support Plan

### User Support

- [ ] **Set up support email**
  - Example: support@example.com
  - Add to error reporting

- [ ] **Create FAQ page** (optional)
  - Common questions
  - Troubleshooting steps

- [ ] **GitHub issues** (if open source)
  - Enable issues in repo
  - Add issue templates

### Emergency Response

Have a plan for critical issues:

1. **Site down**: Check hosting status, verify DNS
2. **Major bug**: Hot-fix deploy within 4 hours
3. **Security issue**: Patch immediately, notify users

## ✨ Launch Checklist

**Day Before Launch**

- [ ] All testing complete
- [ ] Deployment tested
- [ ] Social media posts scheduled
- [ ] Support channels ready

**Launch Day**

- [ ] Deploy to production
- [ ] Verify live site
- [ ] Post on social media
- [ ] Monitor for first hour
- [ ] Respond to feedback

**Week After Launch**

- [ ] Daily error monitoring
- [ ] Address critical bugs
- [ ] Thank early users
- [ ] Plan next update

---

## 🎯 Success Metrics

Track these to measure success:

- **Performance**: Average FPS > 40
- **Reliability**: Error rate < 1%
- **Engagement**: Avg session > 2 minutes
- **Compatibility**: Works on 95%+ devices
- **User Satisfaction**: Positive feedback ratio > 80%

---

## ✅ Ready for Production?

If you've checked all items in "Pre-Deployment > Essential", you're ready to go live!

**Minimum viable production**: ~15 minutes
**Full production ready**: ~2-4 hours
**Enterprise-grade**: See [PRODUCTION_GUIDE.md](PRODUCTION_GUIDE.md)

---

## Need Help?

- **Quick questions**: See [INTEGRATION.md](INTEGRATION.md)
- **Comprehensive guide**: See [PRODUCTION_GUIDE.md](PRODUCTION_GUIDE.md)
- **Technical details**: See [spec.md](spec.md)
- **Basic usage**: See [README.md](README.md)

Good luck with your launch! 🚀🌳
