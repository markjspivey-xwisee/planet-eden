# Planet Eden - Fix Plan

Priority-ordered task list for the Ralph development loop.

## Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## High Priority (Bugs)

- [ ] Fix mobile panel toggle not working after GUI cleanup
- [ ] Ensure sparkline graph doesn't overlap with screenshot button
- [ ] Test and verify all keyboard shortcuts work correctly

## Medium Priority (Polish)

- [ ] Add ? key to show full keyboard shortcuts modal
- [ ] Add organism count by type to stats panel
- [ ] Improve follow mode camera smoothness
- [ ] Add visual indicator when goal is completed (confetti particles)

## Low Priority (Features)

- [ ] Add organism reproduction particles
- [ ] Connect particle system to actual game events (births, deaths)
- [ ] Add weather sound effects (rain, thunder)
- [ ] Implement tribe color indicators on humanoids

## Backlog (Ideas)

- [ ] Add minimap showing organism distribution
- [ ] Day/night ambient light color changes
- [ ] Seasonal effects (winter snow, autumn leaves)
- [ ] Save/load simulation state to localStorage

---

## Recently Completed

- [x] Fix camera follow mode upside-down orientation
- [x] Clean up GUI panels (hide by default)
- [x] Add event/toast notification system
- [x] Add ambient audio system
- [x] Add particle effects system
- [x] Add goals/milestones system
- [x] Add screenshot system
- [x] Add population sparkline graph
- [x] Reduce energy drain for longer survival
- [x] Increase organism capacity to 500
- [x] Disable compaction (fixes visual jerking)
- [x] Optimize water avoidance performance

---

## Notes

- Zig build path: `./zig/zig-windows-x86_64-0.13.0/zig.exe build --release=small`
- Dev server: `node server.js` then open http://localhost:3000
- WASM version tracked in `src/main.zig` getVersion()
