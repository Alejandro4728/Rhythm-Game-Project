# Rhythm Game (p5.js)
## HANDOFF

This document is a transition summary for continuing implementation of the rhythm game.

## 1. Project Summary
- Browser-based 4-lane rhythm game built with p5.js and p5.sound.
- Timing is audio-driven.
- The MVP includes title, menu, loading, playing, paused, results, and error scenes.
- The game targets single-player desktop web play only.

## 2. Current Documentation Set
- [PRD.md](PRD.md): product requirements and feature scope.
- [ARCHITECTURE.md](ARCHITECTURE.md): system design and module boundaries.
- [TASK.md](TASK.md): implementation checklist.
- [RULES.md](RULES.md): gameplay rules and player-facing behavior.

## 3. Core Requirements to Preserve
- Use audio playback time as the source of truth for rhythm timing.
- Keep judgments deterministic and independent of frame rate.
- Support four lanes with A/S/D/F and arrow-key alternates.
- Use Perfect, Great, and Miss judgment windows.
- Support score, combo, accuracy, and max combo tracking.
- Reject malformed charts before gameplay starts.
- Keep pause/resume/restart/exit behavior stable.

## 4. Planned Soundtrack
The current planned soundtrack list is:
- Pulse Drive - 120 BPM - Easy
- Neon Circuit - 128 BPM - Normal
- Overclock - 140 BPM - Normal
- Final Sync - 150 BPM - Hard
- Afterimage - 160 BPM - Hard

These are placeholder or original-track targets unless rights are confirmed for other songs.

## 5. Architecture Summary
### Runtime States
- TITLE
- MENU
- LOADING
- PLAYING
- PAUSED
- RESULTS
- ERROR

### Main Modules
- stateManager
- audioManager
- chartValidator
- noteManager
- inputManager
- scoringManager
- renderer

### File Structure Target
```text
/src
  sketch.js
  stateManager.js
  audioManager.js
  noteManager.js
  inputManager.js
  scoring.js
  chartValidator.js
/assets
  /audio
  /charts
```

## 6. Implementation Priorities
### Priority 1
- Make the BUILD folder runnable in the browser.
- Load p5.js and p5.sound correctly.
- Confirm the app can transition TITLE -> MENU -> LOADING -> PLAYING.

### Priority 2
- Load and validate chart data.
- Spawn notes from audio time.
- Capture lane input and resolve judgments.

### Priority 3
- Add scoring, combo, and accuracy.
- Add results output.
- Add pause/resume/restart/exit flows.

### Priority 4
- Add actual charts and audio assets.
- Test timing consistency at reduced frame rates.
- Clean up visuals and feedback.

## 7. Key Rules
- Do not use frame count or `millis()` as the rhythm source.
- Do not allow a note to be judged twice.
- Resolve hits before auto-misses in the same update tick.
- Keep charts sorted by time and lanes constrained to 0-3.
- Fail gracefully when assets or validation are invalid.

## 8. Known Constraints
- Multiplayer is out of scope.
- User-generated charts are out of scope.
- Online systems are out of scope.
- Hold notes are out of scope for MVP.
- Mobile touch controls are out of scope.

## 9. Suggested Next Steps
1. Make the BUILD folder contain a runnable p5.js entry point.
2. Wire the scene manager into the sketch loop.
3. Add chart loading and validation.
4. Add note spawn, input capture, and judgment resolution.
5. Add score and results rendering.
6. Add real songs and charts.

## 10. Handoff Notes
- Keep the design aligned with [ARCHITECTURE.md](ARCHITECTURE.md).
- Keep implementation tasks aligned with [TASK.md](TASK.md).
- Keep user-visible behavior aligned with [RULES.md](RULES.md).
- If you need one source of truth for feature scope, use [PRD.md](PRD.md).