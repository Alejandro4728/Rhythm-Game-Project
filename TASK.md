# Rhythm Game (p5.js)
## TASK.md

This file breaks the PRD into an implementation checklist for the rhythm game MVP.

## 1. Project Setup
- [ ] Confirm the runtime target is the `BUILD` folder or p5.js web editor equivalent.
- [ ] Create the browser entry file for the game.
- [ ] Add basic page styling and canvas layout.
- [ ] Load p5.js and p5.sound before the game code.
- [ ] Create the source folder structure for the game modules.

## 2. Core Game Structure
- [ ] Implement the finite state machine with TITLE, MENU, LOADING, PLAYING, PAUSED, RESULTS, and ERROR.
- [ ] Add a central state manager to control scene changes.
- [ ] Define shared constants for judgment windows, travel time, and input age.
- [ ] Keep the active gameplay state isolated from scene-specific UI state.

## 3. Audio and Timing
- [ ] Implement an audio manager for song loading and playback.
- [ ] Make audio playback time the source of truth for rhythm timing.
- [ ] Add a configurable global timing offset for calibration.
- [ ] Add pause, resume, stop, and restart playback support.
- [ ] Unlock audio on the first valid user gesture.

## 4. Chart Data and Validation
- [ ] Define the chart format as a list of notes with `time` and `lane`.
- [ ] Validate that `time` is a finite number in seconds and is not negative.
- [ ] Validate that `lane` is an integer from 0 to 3.
- [ ] Reject charts that are unsorted by time.
- [ ] Show a readable error when chart validation fails.
- [ ] Add placeholder or approved chart files for development.

## 5. Note System
- [ ] Implement note storage for the current song chart.
- [ ] Spawn notes when they enter the travel window.
- [ ] Move notes toward the judgment line based on audio time.
- [ ] Mark notes as hit, missed, or resolved.
- [ ] Remove notes after they are no longer needed.
- [ ] Prevent a note from being judged more than once.

## 6. Input System
- [ ] Capture keyboard input immediately with `keyPressed()`.
- [ ] Map A, S, D, F and arrow keys to lanes 0 through 3.
- [ ] Store recent inputs in a short-lived buffer.
- [ ] Purge stale inputs each frame before judgment.
- [ ] Consume each input only once during hit resolution.

## 7. Judgment Logic
- [ ] Match each input to the closest unresolved note in the same lane.
- [ ] Apply the Perfect window at 50 ms or less.
- [ ] Apply the Great window above 50 ms and up to 100 ms.
- [ ] Treat anything beyond 100 ms as a miss.
- [ ] Run auto-miss resolution after hit matching in the same update tick.

## 8. Scoring and Stats
- [ ] Add score values for Perfect, Great, and Miss.
- [ ] Increase combo on Perfect and Great.
- [ ] Reset combo on Miss.
- [ ] Apply the combo multiplier with a cap.
- [ ] Track perfect, great, miss, max combo, score, and accuracy.
- [ ] Display accuracy as a percentage.

## 9. Gameplay Loop
- [ ] Update audio time at the start of each gameplay frame.
- [ ] Purge expired inputs before judgment.
- [ ] Spawn and update notes.
- [ ] Resolve hits.
- [ ] Resolve auto-misses.
- [ ] Update score and stats.
- [ ] Render the scene.

## 10. Scenes
- [ ] TITLE: show the "Press Any Key" prompt.
- [ ] TITLE: unlock audio and transition to MENU.
- [ ] MENU: support song selection.
- [ ] MENU: support difficulty selection.
- [ ] LOADING: load audio and chart data.
- [ ] LOADING: transition to PLAYING only when assets are ready.
- [ ] PAUSED: freeze gameplay and pause audio.
- [ ] RESULTS: show final score, accuracy, hit breakdown, and max combo.
- [ ] ERROR: display a readable reason for failure and allow return to menu.

## 11. Rendering
- [ ] Draw four equal-width vertical lanes.
- [ ] Draw the judgment line near 80 percent of the screen height.
- [ ] Draw notes traveling from the top toward the hit line.
- [ ] Add visual feedback for Perfect, Great, and Miss.
- [ ] Draw the HUD with score, combo, and accuracy.
- [ ] Use `deltaTime` only for animation smoothing.

## 12. Music and Content
- [ ] Use only tracks that are owned, created, or licensed for use.
- [ ] Add the planned soundtrack or approved placeholder audio.
- [ ] Create at least one chart per difficulty.
- [ ] Verify each chart against the judgment windows.

## 13. Error Handling
- [ ] Fail safely when audio loading fails.
- [ ] Fail safely when chart validation fails.
- [ ] Retry audio unlock on the next valid input if needed.
- [ ] Keep the game out of PLAYING when assets are missing or invalid.

## 14. Final Validation
- [ ] Confirm the full loop works: title -> menu -> loading -> playing -> results -> menu.
- [ ] Confirm timing remains stable at 60 FPS and degraded frame rates.
- [ ] Confirm the same chart yields consistent judgments.
- [ ] Confirm pause and resume do not break note alignment.
- [ ] Confirm unresolved notes are not left behind at results.
- [ ] Confirm invalid charts fail cleanly with a readable message.

## 15. Definition of Done
The MVP is complete when the game can:
- Load a selected song and chart
- Play a full song with audio-synced notes
- Judge hits consistently
- Track score, combo, accuracy, and max combo
- Handle pause, restart, and menu exit cleanly
- Fail safely on invalid charts or missing assets