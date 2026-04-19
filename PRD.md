# Rhythm Game (p5.js)
## PRD v3 (Implementation-Ready)

## 1. Overview
### 1.1 Product Summary
A browser-based 4-lane rhythm game built with p5.js and p5.sound. Players press lane keys in sync with falling notes timed to a music track. Gameplay is timing-critical and audio-driven.

### 1.2 Product Goals
- Keep gameplay timing stable and synced to audio.
- Sustain smooth rendering at target frame rate.
- Provide responsive keyboard input.
- Deliver complete loop: title -> menu -> loading -> gameplay -> results.

### 1.3 Non-Goals (MVP)
- Multiplayer
- User-generated charts
- Online services (accounts, cloud saves, leaderboards)

## 2. Scope and Platform
### 2.1 In Scope (MVP)
- Single-player gameplay
- Predefined songs and charts
- Difficulty presets (Easy, Normal, Hard)
- Pause/resume/restart/exit flow
- Results screen with score metrics
- Basic visual judgment feedback

### 2.2 Out of Scope (MVP)
- Hold/long notes
- Hit sound customization
- Skin/theme editor
- Mobile touch controls

### 2.3 Target Platform
- Desktop web browsers (latest Chrome/Edge/Firefox)
- Keyboard input only
- 16:9 and 16:10 displays supported; scales to smaller windows

## 3. Success Criteria (Acceptance)
A build is considered acceptable when all are true:
1. Timing logic uses audio time as the only sync source during gameplay.
2. At 60 FPS and 30 FPS, judgment outcomes remain functionally equivalent for the same timed input replay.
3. Pause for 5 seconds and resume without visible timing jump in note alignment.
4. Core loop fully works: title -> menu -> loading -> playing -> results -> menu.
5. No unresolved active notes remain at results transition.
6. Chart validation rejects malformed input and fails gracefully.

## 4. Architecture
### 4.1 State Machine
```js
const GameState = {
  TITLE: "TITLE",
  MENU: "MENU",
  LOADING: "LOADING",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  RESULTS: "RESULTS",
  ERROR: "ERROR"
};
```

Primary transitions:
- TITLE -> MENU
- MENU -> LOADING -> PLAYING
- PLAYING -> PAUSED -> PLAYING
- PLAYING -> RESULTS -> MENU
- LOADING -> ERROR (if validation/load fails)

### 4.2 Core Modules
- Scene Manager
- Audio Manager (source of truth for playback time)
- Note Manager (spawn/update/despawn/judgment state)
- Input Manager (key capture + short-lived buffer)
- Scoring Manager
- Renderer/HUD
- Chart Validator

## 5. Timing and Synchronization (Critical)
### 5.1 Source of Truth
Use audio playback time only:
```js
currentTime = song.currentTime(); // seconds
```
Do not drive note timing by frame count or millis().

### 5.2 Global Offset
Include one configurable timing offset for MVP:
```js
gameplayTime = currentTime + globalOffsetSec;
```
- Default `globalOffsetSec = 0`.
- Keep configurable in code/constants for per-device adjustment.

### 5.3 Note Travel
```js
const TRAVEL_TIME = 2.0; // seconds
```
Spawn when:
```js
note.time - gameplayTime <= TRAVEL_TIME
```
Position:
```js
y = lerp(spawnY, hitLineY, 1 - (timeUntilHit / TRAVEL_TIME));
```
where:
```js
timeUntilHit = note.time - gameplayTime
```

## 6. Input and Judgment Rules
### 6.1 Lane Mapping
| Lane | Primary | Alternate |
|---|---|---|
| 0 | A | Left Arrow |
| 1 | S | Down Arrow |
| 2 | D | Up Arrow |
| 3 | F | Right Arrow |

### 6.2 Input Capture
- Use `keyPressed()` for immediate event capture.
- Record input event as `{ lane, time }` where `time` is gameplayTime at capture.
- Keep input buffer max age `MAX_INPUT_AGE_MS = 150`.
- Purge stale buffered entries each frame before judgment.

### 6.3 Windows (Milliseconds)
- Perfect: `deltaMs <= 50`
- Great: `50 < deltaMs <= 100`
- Miss: `deltaMs > 100`

where:
```js
deltaMs = Math.abs(inputTimeSec - note.time) * 1000
```

### 6.4 Deterministic Matching
For each buffered input:
1. Select unresolved note in same lane with minimal `deltaMs`.
2. If no candidate within 100 ms, consume input as empty press (no score change).
3. If candidate found, assign one judgment and lock note as resolved.
4. A resolved note cannot be judged again.

### 6.5 Auto-Miss Rule
A note becomes auto-miss only if unresolved and:
```js
(gameplayTime - note.time) * 1000 > 100
```
This executes after input matching in the same update tick to avoid race conflicts.

## 7. Scoring and Stats
### 7.1 Base Points
- Perfect: 100
- Great: 70
- Miss: 0

### 7.2 Combo and Multiplier
- Combo increases on Perfect/Great.
- Combo resets on Miss.
- Multiplier formula:
```js
multiplier = Math.min(4.0, 1 + combo * 0.05)
```

### 7.3 Score Update
```js
score += Math.round(basePoints * multiplier)
```

### 7.4 Accuracy
Track:
```js
maxScore += 100
actualScore += awardedPoints
accuracy = (actualScore / maxScore) * 100
```
If `maxScore === 0`, display `0.00%`.

### 7.5 Breakdown
```js
stats = {
  perfect: 0,
  great: 0,
  miss: 0,
  maxCombo: 0
};
```

## 8. Data Contracts
### 8.1 Chart Format
```json
[
  { "time": 1.25, "lane": 0 },
  { "time": 1.50, "lane": 2 }
]
```

### 8.2 Chart Validation Requirements
- Array of objects only
- `time` is finite number in seconds, `time >= 0`
- `lane` is integer in `[0, 3]`
- Sorted by ascending `time`
- Reject malformed chart with explicit error message and transition to `ERROR`

### 8.3 Song Object
```js
song = {
  audio: p5.SoundFile,
  notes: [...],
  bpm: null // optional metadata
};
```

## 9. Scene Behavior
### 9.1 Title
- Display "Press Any Key".
- First input unlocks audio context and transitions to menu.

### 9.2 Menu
- Song select (up to 5 songs chosen by the project owner during development).
- Difficulty select: Easy, Normal, Hard.
- Start transitions to loading.

### 9.3 Loading
- Load audio/chart.
- Validate chart.
- Transition to playing only when assets ready + audio unlocked.
- On failure, transition to error scene with readable reason.

### 9.4 Playing
- Update order in `draw()`:
```js
updateTime();
captureAndPurgeInput();
spawnAndUpdateNotes();
resolveHits();
resolveAutoMisses();
updateScoreAndStats();
render();
```
- HUD shows score, combo, and accuracy.

### 9.5 Paused
- Trigger key: Escape.
- Pause audio and freeze gameplay updates.
- Options: Resume, Restart, Exit to Menu.
- Resume continues from same audio time basis.

### 9.6 Results
Display:
- Final score
- Accuracy (%)
- Perfect/Great/Miss
- Max combo

### 9.7 End Condition
Transition to results when both are true:
1. Audio playback ended (or `currentTime >= duration`), and
2. All notes are resolved (hit or miss).

## 10. Rendering
### 10.1 Layout
- 4 equal vertical lanes
- Judgment line at ~80% screen height
- Notes spawn above visible playfield

### 10.2 Feedback
- Perfect: bright flash + scale burst
- Great: medium flash
- Miss: dim flash

### 10.3 Frame-Time Policy
- Use `deltaTime` only for visual interpolation/animation smoothing.
- Never use frame delta as rhythm timing source.

## 11. Performance Requirements
- Target 60 FPS on baseline desktop hardware.
- Gameplay remains timing-correct under frame drops.
- Avoid allocations in hot loops where practical.

## 12. File Structure
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

## 13. Risks and Mitigations
### 13.1 Audio Desync
- Mitigation: audio time as source of truth + global offset constant.

### 13.2 Input Latency Variance
- Mitigation: immediate key capture + small input buffer + deterministic matching.

### 13.3 Chart Quality
- Mitigation: validator + manual playtest pass per chart.

### 13.4 Browser Audio Restrictions
- Mitigation: require user gesture to unlock audio before play.

## 14. Music and Licensing
- The project owner chooses the game soundtrack.
- Use only tracks you own, created, or properly licensed for distribution.
- During development, include placeholder assets with clear attribution metadata where required.
- Do not ship copyrighted commercial tracks without explicit rights.

### 14.1 Planned Soundtrack
The initial planned soundtrack for development is:
- Pulse Drive - 120 BPM - Easy
- Neon Circuit - 128 BPM - Normal
- Overclock - 140 BPM - Normal
- Final Sync - 150 BPM - Hard
- Afterimage - 160 BPM - Hard

These names are placeholder or original-track targets unless the project owner has confirmed rights to specific commercial songs.

## 15. Future Enhancements
- In-game calibration UI
- Hold/long notes
- Hit sound effects
- Lane animation themes
- Online leaderboard

## 16. Definition of Done (MVP)
MVP is done when:
1. One full song is fully playable end-to-end with stable timing and results output.
2. At least one chart per difficulty exists and passes validator.
3. Pause/resume/restart/exit behavior works without sync regressions.
4. No known critical bugs in scoring, judgment, or scene transitions.