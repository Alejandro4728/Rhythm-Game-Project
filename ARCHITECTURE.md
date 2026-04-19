# Rhythm Game (p5.js)
## Architecture

This document defines the runtime structure for the browser-based p5.js rhythm game described in the PRD.

## 1. Architectural Goals
- Keep rhythm timing driven entirely by audio playback time.
- Separate scene flow, input, note logic, scoring, and rendering.
- Make the MVP small enough to implement in the p5.js web editor or a local BUILD folder.
- Keep gameplay deterministic so frame drops do not change judgments.

## 2. System Overview
The game is a single-player, browser-based rhythm game built with p5.js and p5.sound.

At runtime, the app is organized into these layers:
- Scene layer: title, menu, loading, playing, paused, results, error
- Timing layer: audio playback time plus a configurable offset
- Gameplay layer: note spawn, hit detection, miss detection, scoring
- Input layer: immediate keyboard capture plus short-lived buffering
- Rendering layer: lanes, notes, judgment effects, and HUD
- Data layer: chart files, song metadata, and runtime stats

## 3. Runtime Flow
1. The app starts in the title scene.
2. The player presses a key to unlock audio and move to the menu.
3. The menu selects a song and difficulty.
4. The loading scene validates and prepares the selected chart and audio.
5. The playing scene reads audio time and updates notes from that time.
6. Keyboard input is buffered and matched to the closest valid note in the same lane.
7. Score, combo, accuracy, and judgment counts update from the resolved hit.
8. When the song ends and all notes are resolved, the game transitions to results.

## 4. State Machine
### 4.1 States
Use a finite state machine with these states:
- TITLE
- MENU
- LOADING
- PLAYING
- PAUSED
- RESULTS
- ERROR

### 4.2 Transitions
- TITLE -> MENU
- MENU -> LOADING
- LOADING -> PLAYING
- PLAYING -> PAUSED
- PAUSED -> PLAYING
- PLAYING -> RESULTS
- RESULTS -> MENU
- LOADING -> ERROR
- ERROR -> MENU

### 4.3 State Responsibilities
#### TITLE
- Show the start prompt.
- Wait for a user gesture.
- Unlock the audio context.

#### MENU
- Show song selection.
- Show difficulty selection.
- Trigger loading when the player starts a song.

#### LOADING
- Load audio and chart data.
- Validate the chart structure.
- Prepare all runtime state for gameplay.

#### PLAYING
- Run the main gameplay loop.
- Spawn notes from audio time.
- Capture and process inputs.
- Resolve judgments and scoring.

#### PAUSED
- Freeze gameplay updates.
- Pause audio playback.
- Allow resume, restart, or exit to menu.

#### RESULTS
- Display final score and stats.
- Allow return to menu or restart.

#### ERROR
- Show a readable load or validation failure.
- Allow the player to return to the menu.

## 5. Module Boundaries
### 5.1 `stateManager`
Responsibilities:
- Own the active state.
- Enforce valid scene transitions.
- Store scene-level error messages.

### 5.2 `audioManager`
Responsibilities:
- Load and store the current `p5.SoundFile`.
- Unlock audio on the first user gesture.
- Start, pause, resume, and stop playback.
- Expose `currentTime()` and `duration()`.

Design rule:
- Audio time is the source of truth for all rhythm decisions.

### 5.3 `chartValidator`
Responsibilities:
- Validate note objects before gameplay starts.
- Reject malformed data.
- Enforce ascending note time order.
- Enforce lane range `[0, 3]`.

### 5.4 `noteManager`
Responsibilities:
- Hold the active note list.
- Spawn notes before they reach the hit line.
- Move notes based on time until hit.
- Mark notes as hit, missed, or resolved.
- Remove notes after they are no longer needed.

### 5.5 `inputManager`
Responsibilities:
- Capture key presses immediately.
- Map keys to lanes.
- Buffer recent inputs for deterministic processing.
- Drop stale inputs after the configured age limit.

### 5.6 `scoringManager`
Responsibilities:
- Convert judgments into points.
- Track combo and max combo.
- Track perfect, great, and miss counts.
- Compute accuracy.
- Apply the score multiplier and cap it.

### 5.7 `renderer`
Responsibilities:
- Draw the lanes and judgment line.
- Draw notes in their computed positions.
- Draw HUD values.
- Draw feedback flashes and bursts for judgments.

## 6. Timing Model
### 6.1 Source of Truth
Use audio playback time only:
```js
currentTime = song.currentTime();
```
Do not use frame count or `millis()` to determine hit timing.

### 6.2 Global Offset
Support a configurable offset:
```js
gameplayTime = currentTime + globalOffsetSec;
```
- Default: `0`
- Purpose: small per-device timing adjustment

### 6.3 Note Travel
Notes should reach the hit line exactly at their scheduled time.

Recommended timing constant:
```js
TRAVEL_TIME = 2.0;
```

Spawn condition:
```js
note.time - gameplayTime <= TRAVEL_TIME
```

Position calculation:
```js
y = lerp(spawnY, hitLineY, 1 - (timeUntilHit / TRAVEL_TIME));
```
where:
```js
timeUntilHit = note.time - gameplayTime
```

### 6.4 Judgment Windows
- Perfect: within 50 ms
- Great: within 100 ms
- Miss: beyond 100 ms

Judgment is based on the absolute delta between input time and note time.

### 6.5 Miss Handling
A note becomes a miss if it remains unresolved after its judgment window expires.

Miss resolution must happen after hit matching in the same update tick so one note cannot be judged twice.

## 7. Input Model
### 7.1 Lane Mapping
- Lane 0: A or Left Arrow
- Lane 1: S or Down Arrow
- Lane 2: D or Up Arrow
- Lane 3: F or Right Arrow

### 7.2 Input Buffering
Inputs are stored briefly so the update loop can evaluate them deterministically.

Processing order:
1. Capture key press
2. Convert key to lane
3. Record input time using gameplay time
4. Purge stale inputs
5. Match each input to the closest unresolved note in the same lane

### 7.3 Matching Rule
For each buffered input:
- Search unresolved notes in the same lane
- Choose the note with the smallest time delta
- If delta is inside the judgment window, assign one judgment
- Mark the note as resolved
- Consume the buffered input

### 7.4 Duplicate Protection
- A note can only be resolved once.
- A buffered input can only be consumed once.

## 8. Scoring Model
### 8.1 Base Points
- Perfect: 100
- Great: 70
- Miss: 0

### 8.2 Combo and Multiplier
- Combo increases on Perfect or Great.
- Combo resets on Miss.
- Multiplier formula: `min(4.0, 1 + combo * 0.05)`

### 8.3 Accuracy
Accuracy is calculated from awarded points relative to maximum possible points.

If no notes have been scored yet, accuracy displays as `0.00%`.

### 8.4 Stats Tracked
- perfect count
- great count
- miss count
- max combo
- current score
- accuracy

## 9. Chart Data Model
### 9.1 Note Shape
```json
[
	{ "time": 1.25, "lane": 0 },
	{ "time": 1.50, "lane": 2 }
]
```

### 9.2 Validation Rules
- `time` must be a finite number in seconds and `>= 0`
- `lane` must be an integer in `[0, 3]`
- Notes must be sorted by ascending `time`
- Invalid charts must fail loading with a readable error

### 9.3 Song Shape
```js
song = {
	audio: p5.SoundFile,
	notes: [...],
	bpm: null
};
```

## 10. Rendering Model
### 10.1 Playfield Layout
- Four equal-width vertical lanes
- Judgment line near 80 percent of the screen height
- Notes spawn above the visible playfield

### 10.2 Judgment Feedback
- Perfect: bright flash and scale burst
- Great: medium flash
- Miss: dim flash

### 10.3 Frame-Time Policy
- `deltaTime` may only be used for animation smoothing
- `deltaTime` must never control rhythm timing

## 11. Game Loop Order
During PLAYING, the main loop should follow this order:
1. Read audio time
2. Purge expired inputs
3. Spawn and update notes
4. Resolve hits
5. Resolve auto-misses
6. Update scoring and stats
7. Render the scene

This order keeps judgments deterministic and frame-rate independent.

## 12. Error Handling
### 12.1 Load Failure
If audio or chart loading fails:
- Transition to ERROR
- Show a readable reason
- Allow return to menu

### 12.2 Validation Failure
If the chart is invalid:
- Reject it before gameplay starts
- Do not enter PLAYING
- Show the problem to the player or developer

### 12.3 Audio Unlock Failure
If the browser blocks audio playback:
- Stay in TITLE or MENU
- Retry on the next valid user gesture

## 13. File Structure
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

## 14. Build Mapping
Use this mapping to implement the BUILD folder in a predictable order.

### 14.1 `BUILD/index.html`
Purpose:
- Load p5.js and p5.sound.
- Load all game modules in dependency order.
- Mount the canvas into the page shell.

Contains:
- HTML shell
- p5.js script tags
- module script tags for `/src`
- a container element for the sketch canvas

### 14.2 `BUILD/style.css`
Purpose:
- Define the page and canvas layout.
- Keep the game centered and readable in the browser.

Contains:
- Full-page body reset
- canvas sizing and presentation rules
- basic background and typography styles

### 14.3 `BUILD/src/stateManager.js`
Purpose:
- Define the game state constants.
- Centralize state transitions.

Contains:
- `GameState` enum-like object
- `StateManager` class
- `transition(nextState, errorMessage)`

### 14.4 `BUILD/src/audioManager.js`
Purpose:
- Own song loading and playback control.
- Expose timing data to gameplay systems.

Contains:
- `AudioManager` class
- `setSound(soundFile)`
- `currentTime()`
- `duration()`
- `play()`, `pause()`, `stop()`

### 14.5 `BUILD/src/chartValidator.js`
Purpose:
- Validate chart data before gameplay starts.

Contains:
- `validateChart(notes)`
- checks for array shape, lane range, time validity, and sort order

### 14.6 `BUILD/src/noteManager.js`
Purpose:
- Track active notes and their runtime state.

Contains:
- `NoteManager` class
- note reset/rebuild logic
- active note collection
- helper methods for spawn, update, resolve, and despawn

### 14.7 `BUILD/src/inputManager.js`
Purpose:
- Capture and buffer keyboard input.

Contains:
- `InputManager` class
- key-to-lane mapping
- input buffer
- stale input purge logic

### 14.8 `BUILD/src/scoring.js`
Purpose:
- Calculate points, combo, accuracy, and hit breakdowns.

Contains:
- `ScoringManager` class
- `reset()`
- `applyJudgment(judgment)`
- `getAccuracy()`

### 14.9 `BUILD/src/sketch.js`
Purpose:
- Compose all systems into the p5.js runtime.

Contains:
- `setup()`
- `draw()`
- `keyPressed()`
- scene rendering helpers
- gameplay loop orchestration

### 14.10 `BUILD/assets/audio`
Purpose:
- Store the game soundtrack or placeholder audio files.

Contains:
- approved audio assets

### 14.11 `BUILD/assets/charts`
Purpose:
- Store note charts for each song and difficulty.

Contains:
- JSON chart files

## 15. Extensibility
The architecture leaves room for later additions:
- hold notes
- calibration UI
- hit sounds
- skin themes
- leaderboards
- richer chart metadata

## 16. MVP Definition of Done
The architecture is ready when the implementation can:
- Load a selected song and chart
- Play a full song with audio-synced notes
- Judge hits consistently
- Track score, combo, accuracy, and max combo
- Handle pause, restart, and menu exit cleanly
- Fail safely on invalid charts or missing assets
