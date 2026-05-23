// ===== KONSTANTE =====
// "Prave" boje (bez džokera). Svaki nivo otključa jednu sljedeću -> teže.
const ALL_COLORS = [
    "#ef4444",  // crvena
    "#3b82f6",  // plava
    "#22c55e",  // zelena
    "#eab308",  // žuta
    "#a855f7",  // ljubičasta
    "#f97316",  // narančasta
    "#06b6d4",  // cijan
    "#ec4899",  // roza
    "#84cc16",  // limeta
    "#14b8a6",  // tirkizna
    "#6366f1",  // indigo
    "#92400e",  // smeđa
    "#db2777",  // magenta
    "#64748b",  // siva
    "#ca8a04",  // zlatna
    "#f43f5e",  // ružičasto-crvena
    "#6ee7b7",  // menta
    "#c4b5fd"   // lavanda
];

const WHITE = "#ffffff";

// Postavke težine: koliko je boja aktivno na 1. nivou + šansa za moći
const DIFFICULTIES = {
    easy:   { startColors: 6,  powerChance: 0.08, label: "Lako" },
    normal: { startColors: 9,  powerChance: 0.05, label: "Normalno" },
    hard:   { startColors: 12, powerChance: 0.03, label: "Teško" }
};
let difficulty = "normal";
let startColors = DIFFICULTIES.normal.startColors;
let powerChance = DIFFICULTIES.normal.powerChance;

// Oznaka džokera: outline jokerske kape/glave, okrenut naopačke (rotacija 180°)
function jokerSvg() {
    return '' +
    '<svg class="joker-mark" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<g transform="rotate(180 50 50)" fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">' +
            '<path d="M16 72 L11 22 L33 56 L50 10 L67 56 L89 22 L84 72 Q50 82 16 72 Z"/>' +
            '<circle cx="11" cy="16" r="5"/>' +
            '<circle cx="50" cy="4" r="5"/>' +
            '<circle cx="89" cy="16" r="5"/>' +
        '</g>' +
    '</svg>';
}

// Definicije 4 moći (dijamanti)
const POWERS = {
    white:  { color: "#e5e7eb", symbol: "⬜" },
    add:    { color: "#22c55e", symbol: "+"  },
    remove: { color: "#ef4444", symbol: "–"  },
    fill:   { color: "#3b82f6", symbol: "★"  }
};
const POWER_KEYS = Object.keys(POWERS);

// ===== STANJE =====
let incomingItem = null;   // { kind:"color", color } | { kind:"power", power }
let score = 0;
let gameOver = false;

let level = 1;
let completedThisLevel = 0;
let collectedCount = 0;    // koliko je boja skupljeno u spremnik
let combo = 0;             // koliko je kvadrata zatvoreno zaredom
let completedThisDrop = false; // je li trenutni potez na ploču zatvorio kvadrat
let activeColors = [];     // prave boje aktivne na ovom nivou + bijeli džoker

const MAX_SCORES = 5;      // koliko igrača se pamti na ljestvici
let leaderboard = [];      // [{name, score, level}], sortirano silazno (localStorage)
let playerName = "";       // zadnje upisano ime igrača
let currentEntry = null;   // unos trenutne igre na ljestvici (za živo uređivanje imena)

let storage = [null, null, null, null, null];

let dragSource = null;     // { from:"incoming" } | { from:"storage", index }

const bigSquares = [];

// ===== DOM =====
const incomingDiv = document.getElementById("incoming");
const storageDiv = document.getElementById("storage");
const boardDiv = document.getElementById("board");
const scoreDiv = document.getElementById("score");
const levelSpan = document.getElementById("level");
const progressSpan = document.getElementById("progress");
const targetSpan = document.getElementById("target");
const collectorBox = document.getElementById("collector");
const collectedSpan = document.getElementById("collected");
const overlay = document.getElementById("overlay");
const finalScoreSpan = document.getElementById("finalScore");
const finalLevelSpan = document.getElementById("finalLevel");
const newRecordP = document.getElementById("newRecord");
const nameInput = document.getElementById("nameInput");
const btnSaveName = document.getElementById("btnSaveName");
const restartBtn = document.getElementById("restartBtn");

// Izbornici
const menuBtn = document.getElementById("menuBtn");
const screenMain = document.getElementById("screen-main");
const screenSettings = document.getElementById("screen-settings");
const screenHighscore = document.getElementById("screen-highscore");
const screenPause = document.getElementById("screen-pause");
const hsListDiv = document.getElementById("hsList");
const allScreens = [screenMain, screenSettings, screenHighscore, screenPause, overlay];

// ===== NIVOI =====
// Nivo 1 traži 10 popunjenih kvadratića, svaki sljedeći +1.
function targetForLevel(lvl) {
    return 9 + lvl;
}

// Aktivne boje za trenutni nivo = prvih (startColors + nivo-1) pravih boja + džoker.
function rebuildActiveColors() {
    const count = Math.min(startColors + (level - 1), ALL_COLORS.length);
    activeColors = ALL_COLORS.slice(0, count).concat([WHITE]);
}

function updateHud() {
    levelSpan.textContent = level;
    progressSpan.textContent = completedThisLevel;
    targetSpan.textContent = targetForLevel(level);
}

// ===== GENERIRANJE NOVOG PREDMETA =====
function randomColor() {
    return activeColors[Math.floor(Math.random() * activeColors.length)];
}

function generateNext() {

    if (Math.random() < powerChance) {
        const power = POWER_KEYS[Math.floor(Math.random() * POWER_KEYS.length)];
        incomingItem = { kind: "power", power: power };
    } else {
        incomingItem = { kind: "color", color: randomColor() };
    }

    renderIncoming();
}

// Broj boje (1-based) -> isti broj uvijek znači istu boju (pomoć za daltoniste)
function colorNumber(color) {
    return ALL_COLORS.indexOf(color) + 1;
}

// Je li boja svijetla (da odaberemo čitljiv crni ili bijeli broj)
function isLightColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 150;
}

function numberLabel(color, size) {
    const span = document.createElement("span");
    span.className = "color-num";
    span.textContent = colorNumber(color);
    span.style.color = isLightColor(color) ? "#111" : "#fff";
    span.style.fontSize = (size * 0.42) + "px";
    return span;
}

// ===== VIZUAL JEDNOG PREDMETA =====
function makeVisual(item, size) {

    const el = document.createElement("div");
    el.style.width = size + "px";
    el.style.height = size + "px";

    if (item.kind === "color") {
        el.className = "vis-color";
        el.style.background = item.color;
        if (item.color === WHITE) {
            el.classList.add("is-joker");
            el.innerHTML = jokerSvg();
        } else {
            el.classList.add("has-num");
            el.appendChild(numberLabel(item.color, size));
        }
    } else {
        const p = POWERS[item.power];
        el.className = "vis-power";
        el.style.setProperty("--pw", p.color);
        el.style.fontSize = (size * 0.32) + "px";

        const span = document.createElement("span");
        span.className = "pw-symbol";
        span.textContent = p.symbol;
        el.appendChild(span);
    }

    return el;
}

// ===== DRAG & DROP POMOĆNE =====
function makeDraggable(el, source) {
    el.draggable = true;
    el.ondragstart = (e) => {
        if (gameOver) { e.preventDefault(); return; }
        dragSource = source;
        e.dataTransfer.setData("text/plain", "x");
        e.dataTransfer.effectAllowed = "move";
    };
    el.ondragend = () => { dragSource = null; };
}

function makeDropTarget(el, onDrop) {
    el.ondragover = (e) => { e.preventDefault(); el.classList.add("drag-over"); };
    el.ondragleave = () => el.classList.remove("drag-over");
    el.ondrop = (e) => {
        e.preventDefault();
        el.classList.remove("drag-over");
        onDrop();
    };
}

// Predmet koji se trenutno povlači
function draggedItem() {
    if (!dragSource) return null;
    if (dragSource.from === "incoming") return incomingItem;
    if (dragSource.from === "storage") return storage[dragSource.index];
    return null;
}

// Makni predmet iz njegovog izvora (nakon uspješnog poteza na ploči)
function consumeDragSource() {
    if (!dragSource) return;
    if (dragSource.from === "incoming") {
        generateNext();
    } else if (dragSource.from === "storage") {
        storage[dragSource.index] = null;
    }
}

// ===== RENDERIRANJE =====
function renderIncoming() {

    incomingDiv.innerHTML = "";

    if (!incomingItem) return;

    const el = makeVisual(incomingItem, 70);
    if (!gameOver) makeDraggable(el, { from: "incoming" });

    incomingDiv.appendChild(el);
}

function renderStorage() {

    storageDiv.innerHTML = "";

    storage.forEach((item, index) => {

        const slot = document.createElement("div");
        slot.className = "slot";

        if (item) {
            const vis = makeVisual(item, 38);
            if (!gameOver) makeDraggable(vis, { from: "storage", index: index });
            slot.appendChild(vis);
        }

        makeDropTarget(slot, () => dropOnSlot(index));

        storageDiv.appendChild(slot);
    });
}

// ===== PLOČA =====
function createBoard() {

    for (let i = 0; i < 10; i++) {

        const square = { cells: [null, null, null, null] };
        bigSquares.push(square);

        const bigDiv = document.createElement("div");
        bigDiv.className = "big-square";
        square.element = bigDiv;

        for (let j = 0; j < 4; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            makeDropTarget(cell, () => dropOnCell(square, j));
            bigDiv.appendChild(cell);
        }

        boardDiv.appendChild(bigDiv);
    }

    renderBoard();
}

function renderBoard() {

    bigSquares.forEach(square => {
        const cells = square.element.children;

        for (let i = 0; i < 4; i++) {
            const c = square.cells[i];
            cells[i].style.background = c ? c : "#374151";

            if (c === WHITE) {
                cells[i].innerHTML = jokerSvg();
            } else if (c) {
                const txt = isLightColor(c) ? "#111" : "#fff";
                cells[i].innerHTML =
                    '<span class="color-num" style="color:' + txt + ';font-size:22px">' +
                    colorNumber(c) + '</span>';
            } else {
                cells[i].innerHTML = "";
            }
        }
    });
}

// ===== ISPUST NA POLJE / SLOT =====
function dropOnCell(square, cellIndex) {
    if (gameOver || !dragSource) return;

    const item = draggedItem();
    if (!item) return;

    // ilegalan potez -> predmet ostaje gdje je
    completedThisDrop = false;
    if (!tryApplyItem(square, cellIndex, item)) return;

    // valjan potez koji NIJE zatvorio kvadrat prekida combo niz
    if (!completedThisDrop) combo = 0;

    consumeDragSource();
    dragSource = null;

    renderBoard();
    renderStorage();
    renderIncoming();
    checkGameOver();
}

function dropOnSlot(index) {
    if (gameOver || !dragSource) return;

    // samo prazan slot prima (nema zamjene)
    if (storage[index] !== null) return;

    if (dragSource.from === "incoming") {
        storage[index] = incomingItem;
        generateNext();
    } else if (dragSource.from === "storage") {
        if (dragSource.index === index) return;
        storage[index] = storage[dragSource.index];
        storage[dragSource.index] = null;
    }

    dragSource = null;

    renderStorage();
    renderIncoming();
    checkGameOver();
}

// ===== LOGIKA POSTAVLJANJA =====
// Bijela (#ffffff) je "džoker" i paše uz svaku boju.
// Prava boja kvadratića = prva ne-bijela boja u njemu (null ako su sve bijele/prazne).
function squareRealColor(square) {
    return square.cells.find(c => c !== null && c !== WHITE) || null;
}

// Može li se boja staviti u kvadratić: bijela uvijek, inače mora pašati s pravom bojom.
function colorFitsSquare(square, color) {
    if (color === WHITE) return true;
    const real = squareRealColor(square);
    return real === null || real === color;
}

// Sve "try*" funkcije vrate true ako su promijenile ploču (uspješan potez).
function tryApplyItem(square, cellIndex, item) {
    if (item.kind === "color") return tryPlaceColor(square, cellIndex, item.color);
    return tryApplyPower(square, cellIndex, item.power);
}

function tryPlaceColor(square, cellIndex, color) {
    if (square.cells[cellIndex]) return false;
    if (!colorFitsSquare(square, color)) return false;

    square.cells[cellIndex] = color;
    checkCompleted(square);
    return true;
}

function tryApplyPower(square, cellIndex, power) {

    if (power === "white") {
        // pretvori već popunjeno polje u bijeli džoker
        if (!square.cells[cellIndex]) return false;
        square.cells[cellIndex] = WHITE;
        checkCompleted(square);
        return true;
    }

    if (power === "remove") {
        // ukloni boju iz tog polja
        if (!square.cells[cellIndex]) return false;
        square.cells[cellIndex] = null;
        return true;
    }

    if (power === "add") {
        // dodaj pravu boju kvadratića u jedno prazno polje
        const target = squareRealColor(square);
        if (target === null) return false;
        const emptyIndex = square.cells.findIndex(c => c === null);
        if (emptyIndex === -1) return false;

        square.cells[emptyIndex] = target;
        checkCompleted(square);
        return true;
    }

    if (power === "fill") {
        // napuni sva prazna polja pravom bojom kvadratića
        const target = squareRealColor(square);
        if (target === null) return false;

        let changed = false;
        for (let i = 0; i < 4; i++) {
            if (square.cells[i] === null) { square.cells[i] = target; changed = true; }
        }
        if (!changed) return false;
        checkCompleted(square);
        return true;
    }

    return false;
}

// ===== ANIMACIJE =====
// Kratki "poskok" elementa (npr. bodovi, spremnik)
function pulse(el) {
    el.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }],
        { duration: 300, easing: "ease-out" }
    );
}

// Boje iz popunjenog kvadratića "odlete" u spremnik
function flyColorsToCollector(rects, colors) {
    const box = collectorBox.getBoundingClientRect();
    const targetX = box.left + box.width / 2;
    const targetY = box.top + box.height / 2;

    rects.forEach((r, i) => {
        const color = colors[i];

        const tile = document.createElement("div");
        tile.className = "fly-tile";
        tile.style.left = r.left + "px";
        tile.style.top = r.top + "px";
        tile.style.width = r.width + "px";
        tile.style.height = r.height + "px";

        tile.style.background = color;
        if (color === WHITE) {
            tile.classList.add("is-joker");
            tile.innerHTML = jokerSvg();
        }

        document.body.appendChild(tile);

        const dx = targetX - (r.left + r.width / 2);
        const dy = targetY - (r.top + r.height / 2);

        const anim = tile.animate(
            [
                { transform: "translate(0,0) scale(1)", opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.5 }
            ],
            { duration: 500, easing: "cubic-bezier(0.5, 0, 0.75, 1)", delay: i * 60, fill: "forwards" }
        );

        anim.onfinish = () => {
            tile.remove();
            collectedCount++;
            collectedSpan.textContent = collectedCount;
            pulse(collectorBox);
        };
    });
}

// Bljesak combo bonusa (kad zatvoriš kvadrate zaredom)
function showCombo(comboCount, bonus) {
    const pop = document.createElement("div");
    pop.className = "combo-pop";
    pop.textContent = "Combo x" + comboCount + "  +" + bonus;
    document.body.appendChild(pop);
    pop.addEventListener("animationend", () => pop.remove());
}

// Bljesak natpisa kod prelaska na novi nivo
function showLevelUp() {
    const banner = document.createElement("div");
    banner.className = "level-up";
    banner.textContent = "Nivo " + level + "!";
    document.body.appendChild(banner);
    banner.addEventListener("animationend", () => banner.remove());
}

// ===== PROVJERA POPUNJENOSTI =====
function checkCompleted(square) {

    const full = square.cells.every(c => c !== null);
    if (!full) return;

    // popunjen je ako su sva polja ista prava boja ili bijeli džoker
    const real = squareRealColor(square);
    const same = square.cells.every(c => c === WHITE || c === real);

    if (same) {
        // combo: bonus se udvostručuje (x2 +4, x3 +8, x4 +16, x5 +32, ...)
        completedThisDrop = true;
        combo++;
        const bonus = combo >= 2 ? 4 * Math.pow(2, combo - 2) : 0;
        score += 4 + bonus;
        scoreDiv.textContent = score;
        pulse(scoreDiv);

        if (bonus > 0) showCombo(combo, bonus);

        completedThisLevel++;
        if (completedThisLevel >= targetForLevel(level)) {
            level++;
            completedThisLevel = 0;
            rebuildActiveColors();
            showLevelUp();
        }
        updateHud();

        // zapamti pozicije i boje polja, pa ih "pošalji" u spremnik
        const cells = square.element.children;
        const rects = [];
        const colors = [];
        for (let i = 0; i < 4; i++) {
            rects.push(cells[i].getBoundingClientRect());
            colors.push(square.cells[i]);
        }

        // boje su odletjele -> kvadratić se odmah oslobađa
        square.cells = [null, null, null, null];
        flyColorsToCollector(rects, colors);
    }
}

// ===== MOŽE LI SE PREDMET IGDJE ODIGRATI =====
function canPlaceColor(square, color) {
    const hasEmpty = square.cells.some(c => c === null);
    return hasEmpty && colorFitsSquare(square, color);
}

function canApplyPower(square, power) {
    const hasEmpty = square.cells.some(c => c === null);
    const hasAny = square.cells.some(c => c !== null);
    const hasReal = squareRealColor(square) !== null;

    if (power === "white")  return hasReal;             // treba ne-bijelo polje za pretvoriti
    if (power === "remove") return hasAny;              // treba bilo koje obojano polje
    if (power === "add")    return hasReal && hasEmpty;
    if (power === "fill")   return hasReal && hasEmpty;
    return false;
}

function canPlaceItem(item) {
    if (!item) return false;
    if (item.kind === "color") {
        return bigSquares.some(sq => canPlaceColor(sq, item.color));
    }
    return bigSquares.some(sq => canApplyPower(sq, item.power));
}

// ===== GAME OVER =====
// Kraj kad nema nijednog mogućeg poteza:
// - dok ima prazan slot, uvijek možeš odložiti i vući dalje -> nije kraj
// - kad je spremište puno, jedini potezi su odigrati dolazeći ili neki iz
//   spremišta na ploču; ako ništa od toga ne ide -> kraj.
function checkGameOver() {
    if (gameOver) return;

    const hasEmptySlot = storage.some(s => s === null);
    if (hasEmptySlot) return;

    const candidates = storage.filter(Boolean);
    candidates.push(incomingItem);

    if (candidates.some(canPlaceItem)) return;

    gameOver = true;
    showGameOver();
}

function showGameOver() {
    finalScoreSpan.textContent = score;
    finalLevelSpan.textContent = level;

    // pokušaj uvrstiti rezultat na ljestvicu (top 5)
    currentEntry = null;
    if (qualifiesForBoard(score)) {
        currentEntry = { name: playerName, score: score, level: level };
        leaderboard.push(currentEntry);
        sortLeaderboard();
        if (leaderboard.indexOf(currentEntry) === -1) currentEntry = null;
        saveLeaderboard();
    }

    if (currentEntry) {
        const rank = leaderboard.indexOf(currentEntry) + 1;
        newRecordP.textContent = rank === 1 ? "Novi rekord! 🎉" : ("Ušao si u top 5! (" + rank + ".)");
        newRecordP.style.display = "";
    } else {
        newRecordP.style.display = "none";
    }

    nameInput.value = playerName;

    renderIncoming();   // makni draggable s dolazećeg
    renderStorage();    // makni draggable iz spremišta
    openScreen(overlay);
}

// Upis imena na kraju igre (sprema se odmah; ažurira unos na ljestvici ako je ušao)
function applyName() {
    playerName = nameInput.value.trim();
    savePlayerName();
    if (currentEntry) {
        currentEntry.name = playerName;
        saveLeaderboard();
    }
}

// ===== HIGH SCORE / LJESTVICA (localStorage) =====
function loadHighScore() {
    try {
        const raw = localStorage.getItem("blockade_leaderboard");
        leaderboard = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(leaderboard)) leaderboard = [];
        playerName = localStorage.getItem("blockade_player_name") || "";
    } catch (e) {
        leaderboard = [];
        playerName = "";
    }
    sortLeaderboard();
}

function sortLeaderboard() {
    leaderboard.sort((a, b) => b.score - a.score);
    if (leaderboard.length > MAX_SCORES) leaderboard.length = MAX_SCORES;
}

function qualifiesForBoard(s) {
    if (s <= 0) return false;
    if (leaderboard.length < MAX_SCORES) return true;
    return s > leaderboard[leaderboard.length - 1].score;
}

function saveLeaderboard() {
    try { localStorage.setItem("blockade_leaderboard", JSON.stringify(leaderboard)); } catch (e) {}
}

function savePlayerName() {
    try { localStorage.setItem("blockade_player_name", playerName); } catch (e) {}
}

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateHighscoreScreen() {
    if (leaderboard.length === 0) {
        hsListDiv.innerHTML = '<p class="hs-empty">Još nema rezultata.</p>';
        return;
    }
    let html = "";
    leaderboard.forEach((e, i) => {
        const nm = e.name ? escapeHtml(e.name) : "—";
        html +=
            '<div class="hs-row">' +
                '<span class="hs-rank">' + (i + 1) + '.</span>' +
                '<span class="hs-pname">' + nm + '</span>' +
                '<span class="hs-pscore">' + e.score + '</span>' +
                '<span class="hs-plevel">niv ' + e.level + '</span>' +
            '</div>';
    });
    hsListDiv.innerHTML = html;
}

// ===== TEŽINA (postavke) =====
function setDifficulty(d, save) {
    if (!DIFFICULTIES[d]) return;
    difficulty = d;
    startColors = DIFFICULTIES[d].startColors;
    powerChance = DIFFICULTIES[d].powerChance;
    if (save) {
        try { localStorage.setItem("blockade_difficulty", d); } catch (e) {}
    }
    updateDiffButtons();
}

function loadDifficulty() {
    let d = "normal";
    try { d = localStorage.getItem("blockade_difficulty") || "normal"; } catch (e) {}
    setDifficulty(DIFFICULTIES[d] ? d : "normal", false);
}

function updateDiffButtons() {
    document.querySelectorAll(".diff-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.diff === difficulty);
    });
}

// ===== IZBORNICI =====
function openScreen(screen) {
    allScreens.forEach(s => s.classList.remove("show"));
    if (screen) screen.classList.add("show");
    menuBtn.style.display = screen ? "none" : "";
}

function closeToGame() {
    allScreens.forEach(s => s.classList.remove("show"));
    menuBtn.style.display = "";
}

// ===== POKRETANJE / RESET IGRE =====
function startGame() {
    score = 0;
    scoreDiv.textContent = "0";
    level = 1;
    completedThisLevel = 0;
    collectedCount = 0;
    collectedSpan.textContent = "0";
    combo = 0;
    completedThisDrop = false;
    rebuildActiveColors();
    storage = [null, null, null, null, null];
    bigSquares.forEach(sq => sq.cells = [null, null, null, null]);
    dragSource = null;
    gameOver = false;

    updateHud();
    renderBoard();
    renderStorage();
    generateNext();
    closeToGame();
}

// ===== POVEZIVANJE GUMBA =====
menuBtn.onclick = () => { if (!gameOver) openScreen(screenPause); };

document.getElementById("btnStart").onclick = startGame;
document.getElementById("btnSettings").onclick = () => openScreen(screenSettings);
document.getElementById("btnHighscore").onclick = () => { updateHighscoreScreen(); openScreen(screenHighscore); };

document.getElementById("btnSettingsBack").onclick = () => openScreen(screenMain);
document.getElementById("btnHsBack").onclick = () => openScreen(screenMain);

document.querySelectorAll(".diff-btn").forEach(btn => {
    btn.onclick = () => setDifficulty(btn.dataset.diff, true);
});

document.getElementById("btnResetHs").onclick = () => {
    leaderboard = [];
    saveLeaderboard();
    updateHighscoreScreen();
};

// Upis imena na Game Over ekranu
nameInput.oninput = applyName;
nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { applyName(); nameInput.blur(); }
});
btnSaveName.onclick = () => {
    applyName();
    btnSaveName.textContent = "Spremljeno ✓";
    setTimeout(() => { btnSaveName.textContent = "Spremi"; }, 1200);
};

document.getElementById("btnResume").onclick = closeToGame;
document.getElementById("btnPauseRestart").onclick = startGame;
document.getElementById("btnPauseMain").onclick = () => openScreen(screenMain);

restartBtn.onclick = startGame;
document.getElementById("btnGoMain").onclick = () => openScreen(screenMain);

// Escape: pauza / nastavi (samo dok igra traje)
document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || gameOver) return;
    if (screenPause.classList.contains("show")) {
        closeToGame();
    } else if (!allScreens.some(s => s.classList.contains("show"))) {
        openScreen(screenPause);
    }
});

// ===== START =====
loadHighScore();
loadDifficulty();
createBoard();
renderBoard();
renderStorage();
updateHud();
openScreen(screenMain);
