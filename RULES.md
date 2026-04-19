# Rhythm Game (p5.js)
## RULES

This document defines the playable rules for the rhythm game.

## 1. Game Objective
- Hit notes in time with the music.
- Match the correct lane key to the falling note.
- Build score, combo, and accuracy by hitting notes cleanly.

## 2. Core Gameplay Loop
- The game starts on the title screen.
- Press any key to continue to the menu.
- Choose a song and difficulty.
- Wait for the song to load.
- Play by pressing keys as notes reach the judgment line.
- The song ends when the audio finishes and all notes are resolved.
- View results and return to the menu.

## 3. Controls
### 3.1 Lane Keys
| Lane | Primary | Alternate |
|---|---|---|
| 0 | A | Left Arrow |
| 1 | S | Down Arrow |
| 2 | D | Up Arrow |
| 3 | F | Right Arrow |

### 3.2 Menu and Scene Controls
- Press any key on the title screen to continue.
- Use the menu to choose a song and difficulty.
- Press Escape during gameplay to pause.
- While paused, resume, restart, or exit to the menu.

## 4. Note Rules
- Notes fall in four lanes.
- A note must be hit in the same lane it appears in.
- Notes are judged by how close your input is to the note timing.
- Each note can only be judged once.
- Notes that pass the judgment window become misses.

## 5. Timing Rules
- The game uses the song’s audio time as the timing source.
- Frame rate does not decide whether a note is hit or missed.
- A configurable timing offset may exist for calibration.
- Notes should line up with the judgment line when they are due.

## 6. Judgment Windows
- Perfect: within 50 ms of the note time.
- Great: more than 50 ms and up to 100 ms from the note time.
- Miss: more than 100 ms from the note time, or a note that goes unresolved past the window.

## 7. Scoring Rules
- Perfect awards 100 points.
- Great awards 70 points.
- Miss awards 0 points.
- Perfect and Great increase combo.
- Miss resets combo.
- A combo multiplier increases score value, up to the game’s cap.

## 8. Accuracy Rules
- Accuracy is based on awarded points compared with the maximum possible score.
- If no notes have been scored yet, accuracy displays as 0.00%.

## 9. Scene Rules
### 9.1 Title
- Shows "Press Any Key".

### 9.2 Menu
- Lets the player choose a song.
- Lets the player choose a difficulty.

### 9.3 Loading
- Loads the song and chart.
- Rejects invalid charts.

### 9.4 Playing
- Displays lanes, notes, score, combo, and accuracy.
- Updates gameplay while the song is active.

### 9.5 Paused
- Stops gameplay updates.
- Pauses the audio.
- Lets the player resume, restart, or exit.

### 9.6 Results
- Shows final score.
- Shows accuracy.
- Shows Perfect, Great, Miss counts.
- Shows max combo.

## 10. Chart Rules
- Charts contain notes with a time and lane.
- Time must be a non-negative value in seconds.
- Lane must be an integer from 0 to 3.
- Charts must be sorted by time.
- Invalid charts do not start the game.

## 11. Audio Rules
- The soundtrack is chosen by the project owner.
- Only owned, created, or properly licensed tracks should be used.
- Placeholder tracks may be used during development.

### 11.1 Planned Soundtrack
- Pulse Drive - 120 BPM - Easy
- Neon Circuit - 128 BPM - Normal
- Overclock - 140 BPM - Normal
- Final Sync - 150 BPM - Hard
- Afterimage - 160 BPM - Hard

## 12. Difficulty Rules
- Easy, Normal, and Hard are the supported difficulties.
- Each difficulty may use a different chart.
- Difficulty selection affects the note pattern, not the basic control scheme.

## 13. End Conditions
- The song ends when the audio is finished and all notes are resolved.
- The results screen appears after the song ends.

## 14. Out of Scope
- Multiplayer
- User-generated charts
- Online services
- Hold notes
- Mobile touch controls
- Skin or theme editing

## 15. Player Goal Summary
- Stay on rhythm.
- Hit the correct lane.
- Build combo.
- Finish the song with the best score possible.