const GameState = {
  TITLE: "TITLE",
  MENU: "MENU",
  LOADING: "LOADING",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  RESULTS: "RESULTS",
  ERROR: "ERROR"
};

const DIFFICULTIES = ["Easy", "Normal", "Hard"];

const LANE_COUNT = 4;
const TRAVEL_TIME = 2.0;
const GLOBAL_OFFSET_SEC = 0;
const PERFECT_MS = 50;
const GREAT_MS = 100;
const MAX_INPUT_AGE_MS = 150;

const BASE_POINTS = {
  perfect: 100,
  great: 70,
  miss: 0
};

const KEY_TO_LANE = {
  a: 0,
  ArrowLeft: 0,
  s: 1,
  ArrowDown: 1,
  d: 2,
  ArrowUp: 2,
  f: 3,
  ArrowRight: 3
};

const palette = {
  bgTop: [16, 23, 39],
  bgBottom: [7, 10, 17],
  lane: [26, 35, 58],
  laneDivider: [69, 84, 121],
  note: [72, 233, 255],
  hitLine: [255, 128, 66],
  text: [238, 244, 255],
  dimText: [160, 173, 209],
  warn: [255, 151, 92],
  good: [118, 245, 255],
  ok: [164, 255, 148],
  bad: [255, 122, 122]
};

let gameState = GameState.TITLE;
let layout;

let songManifest = [];
let selectedSongIndex = 0;
let selectedDifficultyIndex = 1;

let activeSongDef = null;
let activeChartPath = "";
let activeChart = [];
let activeAudio = null;
let loadToken = 0;

let inputBuffer = [];
let feedback = "";
let feedbackUntil = 0;
let missFlashUntil = 0;
let errorMessage = "";
let loadingMessage = "";

let runtime = makeFreshRuntime();
let resultsDeterminism = null;

function setup() {
  const canvas = createCanvas(1120, 700);
  canvas.parent("app");
  textFont("Trebuchet MS");
}

function draw() {
  updateLayout();
  drawBackground();

  if (gameState === GameState.TITLE) {
    drawTitle();
    return;
  }

  if (gameState === GameState.MENU) {
    drawMenu();
    return;
  }

  if (gameState === GameState.LOADING) {
    drawLoading();
    return;
  }

  if (gameState === GameState.PLAYING) {
    updatePlaying();
    drawPlaying();
    return;
  }

  if (gameState === GameState.PAUSED) {
    drawPlaying();
    drawPausedOverlay();
    return;
  }

  if (gameState === GameState.RESULTS) {
    drawResults();
    return;
  }

  if (gameState === GameState.ERROR) {
    drawError();
  }
}

function keyPressed() {
  if (gameState === GameState.TITLE) {
    ensureAudioUnlocked();
    goToMenu();
    return false;
  }

  if (gameState === GameState.MENU) {
    handleMenuInput();
    return false;
  }

  if (gameState === GameState.LOADING) {
    if (key === "m" || key === "M" || keyCode === ESCAPE) {
      goToMenu();
    }
    return false;
  }

  if (gameState === GameState.ERROR) {
    if (key === "m" || key === "M" || keyCode === ENTER) {
      goToMenu();
    }
    return false;
  }

  if (gameState === GameState.RESULTS) {
    if (key === "r" || key === "R" || keyCode === ENTER) {
      startLoadingSelection();
    } else if (key === "m" || key === "M") {
      goToMenu();
    }
    return false;
  }

  if (gameState === GameState.PAUSED) {
    if (keyCode === ESCAPE || key === "p" || key === "P") {
      resumePlay();
    } else if (key === "r" || key === "R") {
      startLoadingSelection();
    } else if (key === "m" || key === "M") {
      stopActiveAudio();
      goToMenu();
    }
    return false;
  }

  if (gameState !== GameState.PLAYING) {
    return false;
  }

  if (keyCode === ESCAPE || key === "p" || key === "P") {
    pausePlay();
    return false;
  }

  const lane = keyToLane(key, keyCode);
  if (lane === null) {
    return false;
  }

  const gameplayTime = getGameplayTime();
  inputBuffer.push({ lane, time: gameplayTime });
  processInputsAndMisses(gameplayTime);
  return false;
}

function handleMenuInput() {
  if (!songManifest.length) {
    if (key === "r" || key === "R" || keyCode === ENTER) {
      startLoadingSelection();
    }
    return;
  }

  if (keyCode === UP_ARROW) {
    selectedSongIndex = (selectedSongIndex - 1 + songManifest.length) % songManifest.length;
    return;
  }
  if (keyCode === DOWN_ARROW) {
    selectedSongIndex = (selectedSongIndex + 1) % songManifest.length;
    return;
  }
  if (keyCode === LEFT_ARROW) {
    selectedDifficultyIndex = (selectedDifficultyIndex - 1 + DIFFICULTIES.length) % DIFFICULTIES.length;
    return;
  }
  if (keyCode === RIGHT_ARROW) {
    selectedDifficultyIndex = (selectedDifficultyIndex + 1) % DIFFICULTIES.length;
    return;
  }
  if (keyCode === ENTER || key === " ") {
    startLoadingSelection();
  }
}

function ensureAudioUnlocked() {
  userStartAudio();
  return getAudioContext().state === "running";
}

function goToMenu() {
  if (!songManifest.length) {
    startLoadingSelection(true);
    return;
  }
  gameState = GameState.MENU;
}

function startLoadingSelection(isBootstrap = false) {
  const token = ++loadToken;
  gameState = GameState.LOADING;
  loadingMessage = "Loading manifest...";
  errorMessage = "";
  stopActiveAudio();

  loadSelection(token, isBootstrap)
    .then(() => {
      if (token !== loadToken) {
        return;
      }
      startRunFromLoadedAssets();
    })
    .catch((err) => {
      if (token !== loadToken) {
        return;
      }
      errorMessage = err instanceof Error ? err.message : String(err);
      gameState = GameState.ERROR;
    });
}

async function loadSelection(token, isBootstrap) {
  if (!ensureAudioUnlocked()) {
    throw new Error("Audio context is locked. Press any key and try again.");
  }

  if (!songManifest.length || isBootstrap) {
    loadingMessage = "Loading song manifest...";
    songManifest = await fetchJson("./assets/songs.json", "Failed to load songs manifest");
    if (!Array.isArray(songManifest) || !songManifest.length) {
      throw new Error("songs.json is empty or invalid.");
    }
    selectedSongIndex = constrain(selectedSongIndex, 0, songManifest.length - 1);
  }

  if (token !== loadToken) {
    return;
  }

  activeSongDef = songManifest[selectedSongIndex];
  const difficulty = DIFFICULTIES[selectedDifficultyIndex];
  activeChartPath = activeSongDef.charts?.[difficulty];
  if (!activeChartPath) {
    throw new Error(`No chart path for difficulty ${difficulty}.`);
  }

  loadingMessage = `Loading chart (${difficulty})...`;
  const chartJson = await fetchJson(activeChartPath, "Failed to load chart file");
  const validation = validateChart(chartJson);
  if (!validation.ok) {
    throw new Error(`Chart validation failed: ${validation.error}`);
  }
  activeChart = chartJson;

  if (token !== loadToken) {
    return;
  }

  loadingMessage = "Loading audio...";
  activeAudio = await loadSoundFile(activeSongDef.audioPath);
}

function startRunFromLoadedAssets() {
  const notes = activeChart.map((n) => ({
    time: n.time,
    lane: n.lane,
    resolved: false,
    result: null
  }));

  runtime = makeFreshRuntime();
  runtime.notes = notes;
  runtime.bpm = activeSongDef.bpm || 0;
  runtime.songTitle = activeSongDef.title || activeSongDef.id || "Unknown Song";
  runtime.songArtist = activeSongDef.artist || "Unknown";

  inputBuffer = [];
  feedback = "";
  feedbackUntil = 0;
  missFlashUntil = 0;
  resultsDeterminism = null;

  if (!activeAudio) {
    throw new Error("Audio asset failed to load.");
  }

  activeAudio.stop();
  activeAudio.play();
  gameState = GameState.PLAYING;
}

function pausePlay() {
  if (activeAudio && activeAudio.isPlaying()) {
    activeAudio.pause();
  }
  gameState = GameState.PAUSED;
}

function resumePlay() {
  if (activeAudio && !activeAudio.isPlaying()) {
    activeAudio.play();
  }
  gameState = GameState.PLAYING;
}

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.stop();
  }
}

function getGameplayTime() {
  if (!activeAudio) {
    return 0;
  }
  return activeAudio.currentTime() + GLOBAL_OFFSET_SEC;
}

function updatePlaying() {
  const gameplayTime = getGameplayTime();
  processInputsAndMisses(gameplayTime);

  const unresolved = runtime.notes.some((note) => !note.resolved);
  const songDone = activeAudio && !activeAudio.isPlaying() && activeAudio.currentTime() >= max(0, activeAudio.duration() - 0.02);
  if (songDone && !unresolved) {
    resultsDeterminism = runDeterminismSelfCheck(runtime.notes);
    gameState = GameState.RESULTS;
  }
}

function processInputsAndMisses(gameplayTime) {
  purgeStaleInputs(gameplayTime);

  for (let i = 0; i < inputBuffer.length; i++) {
    const input = inputBuffer[i];
    const candidate = findBestCandidate(input.lane, input.time);
    if (candidate && candidate.deltaMs <= GREAT_MS) {
      resolveHit(candidate.note, candidate.deltaMs);
    }
    inputBuffer.splice(i, 1);
    i -= 1;
  }

  for (const note of runtime.notes) {
    if (note.resolved) {
      continue;
    }
    if ((gameplayTime - note.time) * 1000 > GREAT_MS) {
      resolveMiss(note);
    }
  }
}

function purgeStaleInputs(gameplayTime) {
  inputBuffer = inputBuffer.filter((entry) => (gameplayTime - entry.time) * 1000 <= MAX_INPUT_AGE_MS);
}

function findBestCandidate(lane, inputTime) {
  let best = null;
  let bestDelta = Infinity;
  for (const note of runtime.notes) {
    if (note.resolved || note.lane !== lane) {
      continue;
    }
    const deltaMs = Math.abs(inputTime - note.time) * 1000;
    if (deltaMs < bestDelta) {
      bestDelta = deltaMs;
      best = note;
    }
  }
  return best ? { note: best, deltaMs: bestDelta } : null;
}

function resolveHit(note, deltaMs) {
  note.resolved = true;
  const judgment = deltaMs <= PERFECT_MS ? "perfect" : "great";
  note.result = judgment;

  const awarded = scoreForJudgment(judgment);
  runtime.actualScore += awarded;
  runtime.maxScore += 100;
  runtime.score += awarded;
  runtime.combo += 1;
  runtime.maxCombo = max(runtime.maxCombo, runtime.combo);
  runtime.stats[judgment] += 1;

  feedback = judgment.toUpperCase();
  feedbackUntil = millis() + 260;
}

function resolveMiss(note) {
  note.resolved = true;
  note.result = "miss";
  runtime.maxScore += 100;
  runtime.combo = 0;
  runtime.stats.miss += 1;

  feedback = "MISS";
  feedbackUntil = millis() + 260;
  missFlashUntil = millis() + 130;
}

function scoreForJudgment(judgment) {
  const base = BASE_POINTS[judgment];
  const multiplier = min(4.0, 1 + runtime.combo * 0.05);
  return Math.round(base * multiplier);
}

function drawPlaying() {
  const gameplayTime = getGameplayTime();
  const laneW = layout.trackWidth / LANE_COUNT;

  drawTrack(laneW);

  for (const note of runtime.notes) {
    if (note.resolved) {
      continue;
    }
    const timeUntilHit = note.time - gameplayTime;
    if (timeUntilHit > TRAVEL_TIME || timeUntilHit < -0.16) {
      continue;
    }
    const t = 1 - timeUntilHit / TRAVEL_TIME;
    const y = lerp(layout.spawnY, layout.hitLineY, t);
    const x = layout.trackLeft + laneW * note.lane + laneW * 0.5;

    noStroke();
    fill(...palette.note);
    rectMode(CENTER);
    rect(x, y, laneW * 0.62, 18, 6);
  }

  drawHud(gameplayTime);
}

function drawTrack(laneW) {
  noStroke();
  fill(...palette.lane);
  rect(layout.trackLeft, layout.trackTop, layout.trackWidth, layout.trackHeight, 12);

  stroke(...palette.laneDivider);
  strokeWeight(2);
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = layout.trackLeft + laneW * i;
    line(x, layout.trackTop, x, layout.trackBottom);
  }

  stroke(...palette.hitLine);
  strokeWeight(4);
  line(layout.trackLeft, layout.hitLineY, layout.trackRight, layout.hitLineY);

  if (millis() < missFlashUntil) {
    noStroke();
    fill(255, 60, 60, 70);
    rect(layout.trackLeft, layout.trackTop, layout.trackWidth, layout.trackHeight, 12);
  }
}

function drawHud(gameplayTime) {
  const acc = runtime.maxScore === 0 ? 0 : (runtime.actualScore / runtime.maxScore) * 100;
  fill(...palette.text);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(24);
  text(`Score: ${runtime.score}`, 34, 22);
  textSize(22);
  text(`Combo: ${runtime.combo}`, 34, 58);
  textSize(18);
  text(`Accuracy: ${acc.toFixed(2)}%`, 34, 92);

  textAlign(RIGHT, TOP);
  textSize(20);
  text(`${runtime.songTitle}`, width - 34, 22);
  textSize(16);
  text(`${runtime.songArtist}  |  BPM ${runtime.bpm}`, width - 34, 52);

  if (millis() < feedbackUntil) {
    textAlign(CENTER, CENTER);
    textSize(34);
    if (feedback === "PERFECT") {
      fill(...palette.good);
    } else if (feedback === "GREAT") {
      fill(...palette.ok);
    } else {
      fill(...palette.bad);
    }
    text(feedback, width * 0.5, layout.hitLineY - 55);
  }

  fill(...palette.dimText);
  textAlign(CENTER, TOP);
  textSize(15);
  text(
    `Time ${gameplayTime.toFixed(2)}s  |  Perfect ${runtime.stats.perfect}  Great ${runtime.stats.great}  Miss ${runtime.stats.miss}`,
    width * 0.5,
    height - 30
  );
}

function drawTitle() {
  fill(...palette.text);
  textAlign(CENTER, CENTER);
  textSize(56);
  text("RHYTHM PROTOTYPE", width * 0.5, height * 0.38);
  textSize(24);
  fill(...palette.dimText);
  text("Press Any Key", width * 0.5, height * 0.50);
  textSize(18);
  text("This unlocks audio and opens the menu", width * 0.5, height * 0.57);
}

function drawMenu() {
  fill(...palette.text);
  textAlign(CENTER, CENTER);
  textSize(44);
  text("MENU", width * 0.5, 92);

  textSize(20);
  fill(...palette.dimText);
  text("Up/Down: Song   Left/Right: Difficulty   Enter: Start", width * 0.5, 132);

  const startY = 230;
  const rowGap = 52;
  for (let i = 0; i < songManifest.length; i++) {
    const song = songManifest[i];
    const selected = i === selectedSongIndex;
    textAlign(LEFT, CENTER);
    textSize(24);
    fill(...(selected ? palette.good : palette.dimText));
    const prefix = selected ? ">" : " ";
    text(`${prefix} ${song.title} - ${song.artist}`, 180, startY + i * rowGap);
  }

  fill(...palette.text);
  textAlign(CENTER, CENTER);
  textSize(26);
  text(`Difficulty: ${DIFFICULTIES[selectedDifficultyIndex]}`, width * 0.5, height - 150);

  textSize(18);
  fill(...palette.dimText);
  text("Gameplay: A S D F or Arrow keys | Esc: Pause", width * 0.5, height - 112);
}

function drawLoading() {
  fill(...palette.text);
  textAlign(CENTER, CENTER);
  textSize(44);
  text("LOADING", width * 0.5, height * 0.43);
  textSize(22);
  fill(...palette.dimText);
  text(loadingMessage || "Preparing assets...", width * 0.5, height * 0.52);
  textSize(16);
  text("Press M or Esc to return to menu", width * 0.5, height * 0.58);
}

function drawPausedOverlay() {
  fill(8, 11, 18, 190);
  noStroke();
  rect(0, 0, width, height);

  fill(...palette.text);
  textAlign(CENTER, CENTER);
  textSize(50);
  text("PAUSED", width * 0.5, height * 0.40);

  textSize(20);
  fill(...palette.dimText);
  text("Esc/P: Resume   R: Restart   M: Menu", width * 0.5, height * 0.50);
}

function drawResults() {
  const acc = runtime.maxScore === 0 ? 0 : (runtime.actualScore / runtime.maxScore) * 100;
  fill(...palette.text);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("RESULTS", width * 0.5, 96);

  textSize(20);
  fill(...palette.dimText);
  text(`${runtime.songTitle} - ${runtime.songArtist}`, width * 0.5, 136);

  fill(...palette.text);
  textSize(28);
  text(`Score: ${runtime.score}`, width * 0.5, 220);
  text(`Accuracy: ${acc.toFixed(2)}%`, width * 0.5, 270);
  text(`Max Combo: ${runtime.maxCombo}`, width * 0.5, 320);

  textSize(24);
  text(`Perfect ${runtime.stats.perfect}`, width * 0.5 - 180, 400);
  text(`Great ${runtime.stats.great}`, width * 0.5, 400);
  text(`Miss ${runtime.stats.miss}`, width * 0.5 + 180, 400);

  textSize(16);
  fill(...palette.dimText);
  if (resultsDeterminism) {
    text(`Replay Check 60fps vs 30fps: ${resultsDeterminism.pass ? "PASS" : "MISMATCH"}`, width * 0.5, 470);
  }
  text("Press R/Enter to replay, or M for menu", width * 0.5, 510);
}

function drawError() {
  fill(...palette.bad);
  textAlign(CENTER, CENTER);
  textSize(44);
  text("ERROR", width * 0.5, height * 0.36);

  fill(...palette.text);
  textSize(18);
  text(errorMessage || "Unknown load error.", width * 0.5, height * 0.48, width * 0.75, height * 0.28);

  fill(...palette.dimText);
  textSize(18);
  text("Press M or Enter to return to menu", width * 0.5, height * 0.62);
}

function updateLayout() {
  const marginX = 140;
  const marginY = 100;
  const trackWidth = width - marginX * 2;
  const trackHeight = height - marginY * 2;
  const trackTop = marginY;

  layout = {
    trackLeft: marginX,
    trackTop,
    trackRight: marginX + trackWidth,
    trackBottom: trackTop + trackHeight,
    trackWidth,
    trackHeight,
    spawnY: trackTop + 40,
    hitLineY: trackTop + trackHeight - 90
  };
}

function drawBackground() {
  for (let y = 0; y < height; y++) {
    const t = map(y, 0, height, 0, 1);
    const r = lerp(palette.bgTop[0], palette.bgBottom[0], t);
    const g = lerp(palette.bgTop[1], palette.bgBottom[1], t);
    const b = lerp(palette.bgTop[2], palette.bgBottom[2], t);
    stroke(r, g, b);
    line(0, y, width, y);
  }
}

function keyToLane(rawKey, rawCode) {
  if (KEY_TO_LANE[rawKey] !== undefined) {
    return KEY_TO_LANE[rawKey];
  }
  if (rawCode === LEFT_ARROW) {
    return 0;
  }
  if (rawCode === DOWN_ARROW) {
    return 1;
  }
  if (rawCode === UP_ARROW) {
    return 2;
  }
  if (rawCode === RIGHT_ARROW) {
    return 3;
  }
  return null;
}

function validateChart(chart) {
  if (!Array.isArray(chart)) {
    return { ok: false, error: "Chart root must be an array." };
  }

  let prevTime = -Infinity;
  for (let i = 0; i < chart.length; i++) {
    const note = chart[i];
    if (!note || typeof note !== "object" || Array.isArray(note)) {
      return { ok: false, error: `Note ${i} is not an object.` };
    }

    const time = note.time;
    const lane = note.lane;

    if (!Number.isFinite(time) || time < 0) {
      return { ok: false, error: `Note ${i} has invalid time.` };
    }
    if (!Number.isInteger(lane) || lane < 0 || lane >= LANE_COUNT) {
      return { ok: false, error: `Note ${i} has invalid lane.` };
    }
    if (time < prevTime) {
      return { ok: false, error: `Chart is not sorted at note ${i}.` };
    }
    prevTime = time;
  }

  return { ok: true };
}

function loadSoundFile(path) {
  return new Promise((resolve, reject) => {
    loadSound(
      path,
      (snd) => resolve(snd),
      (err) => reject(new Error(`Audio load failed (${path}): ${err}`))
    );
  });
}

async function fetchJson(path, fallbackMessage) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${fallbackMessage} (${res.status})`);
  }
  return res.json();
}

function makeFreshRuntime() {
  return {
    notes: [],
    bpm: 0,
    songTitle: "",
    songArtist: "",
    score: 0,
    combo: 0,
    maxCombo: 0,
    stats: {
      perfect: 0,
      great: 0,
      miss: 0
    },
    actualScore: 0,
    maxScore: 0
  };
}

function runDeterminismSelfCheck(notes) {
  const replayInputs = notes.map((n, idx) => ({
    lane: n.lane,
    time: n.time + (Math.sin(idx * 0.83) * 0.018)
  }));

  const at60 = simulateReplay(notes, replayInputs, 1 / 60);
  const at30 = simulateReplay(notes, replayInputs, 1 / 30);

  const pass =
    at60.perfect === at30.perfect &&
    at60.great === at30.great &&
    at60.miss === at30.miss;

  return {
    pass,
    at60,
    at30
  };
}

function simulateReplay(notes, replayInputs, dt) {
  const simNotes = notes.map((n) => ({
    time: n.time,
    lane: n.lane,
    resolved: false
  }));
  let inputIndex = 0;
  let t = 0;
  const endTime = (simNotes[simNotes.length - 1]?.time || 0) + 1.0;
  const stats = { perfect: 0, great: 0, miss: 0 };

  while (t <= endTime) {
    const frameInputs = [];
    while (inputIndex < replayInputs.length && replayInputs[inputIndex].time <= t) {
      frameInputs.push(replayInputs[inputIndex]);
      inputIndex += 1;
    }

    for (const inp of frameInputs) {
      let best = null;
      let bestDelta = Infinity;
      for (const n of simNotes) {
        if (n.resolved || n.lane !== inp.lane) {
          continue;
        }
        const d = Math.abs(inp.time - n.time) * 1000;
        if (d < bestDelta) {
          bestDelta = d;
          best = n;
        }
      }
      if (best && bestDelta <= GREAT_MS) {
        best.resolved = true;
        if (bestDelta <= PERFECT_MS) {
          stats.perfect += 1;
        } else {
          stats.great += 1;
        }
      }
    }

    for (const n of simNotes) {
      if (!n.resolved && (t - n.time) * 1000 > GREAT_MS) {
        n.resolved = true;
        stats.miss += 1;
      }
    }

    t += dt;
  }

  return stats;
}
