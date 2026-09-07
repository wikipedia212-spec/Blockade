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
    easy:   { startColors: 6,  powerChance: 0.08, label: "Easy" },
    normal: { startColors: 9,  powerChance: 0.05, label: "Normal" },
    hard:   { startColors: 12, powerChance: 0.03, label: "Hard" }
};
let difficulty = "normal";
let startColors = DIFFICULTIES.normal.startColors;
let powerChance = DIFFICULTIES.normal.powerChance;
let cellTheme = "patterns";   // uzorak na kvadratićima: "plain" | "patterns"
let showNumbers = true;       // prikaz brojeva na bojama (pomoć za daltoniste)
let musicOn = true;           // sviranje pozadinske glazbe
let gameMode = "classic";     // oblik polja: "classic" (kvadrati) | "hex" (saće)

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

// Outline kapljice (ikona za moć koja pretvara polje u džoker)
function dropletSvg(px) {
    return '<svg class="drop-mark" width="' + px + '" height="' + px + '" viewBox="0 0 24 25" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 2.5 C 14 8 19 12 19 15.5 A 7 7 0 0 1 5 15.5 C 5 12 10 8 12 2.5 Z" ' +
        'fill="none" stroke="#111827" stroke-width="2.2" stroke-linejoin="round"/>' +
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
let combo = 0;             // koliko je kvadrata zatvoreno zaredom
let completedThisDrop = false; // je li trenutni potez na ploču zatvorio kvadrat
let activeColors = [];     // prave boje aktivne na ovom nivou + bijeli džoker

const MAX_SCORES = 10;         // koliko igrača se pamti na ljestvici
const RACE_START_MS = 60000;   // Time Race: početno vrijeme (60 s)
const RACE_BONUS_MS = 5000;    // Time Race: +5 s po zatvorenom kvadratu
let leaderboard = [];      // [{name, score, level, difficulty, mode}] - endless (Classic/HEX)
let leaderboardTime = [];  // [{name, score, level, difficulty}] - Time Race, sortirano po bodovima
let playerName = "";       // zadnje upisano ime igrača
let currentEntry = null;   // unos trenutne igre na aktivnoj ljestvici (za živo uređivanje imena)
let raceEndTime = 0;       // performance.now() trenutak isteka vremena
let raceRemainingMs = 0;   // trenutačno preostalo vrijeme (za prikaz + pauzu)
let raceInterval = null;   // setInterval id za odbrojavanje

let storage = [null, null, null, null, null, null];

let dragSource = null;     // { from:"incoming" } | { from:"storage", index }
let touchDragCtx = null;   // { mirror, offsetX, offsetY } - stanje touch drag-a

const bigSquares = [];

// ===== DOM =====
const incomingDiv = document.getElementById("incoming");
const storageDiv = document.getElementById("storage");
const boardDiv = document.getElementById("board");
const scoreDiv = document.getElementById("score");
const levelSpan = document.getElementById("level");
const bgm = document.getElementById("bgm");
const raceHud = document.getElementById("raceHud");
const raceTimeSpan = document.getElementById("raceTime");
const finalTimeP = document.getElementById("finalTimeP");
const finalTimeSpan = document.getElementById("finalTime");
const finalScoreP = document.getElementById("finalScoreP");
const gameOverMsg = document.getElementById("gameOverMsg");
const collectorBox = document.getElementById("collector");
const remainingSpan = document.getElementById("remaining");
const overlay = document.getElementById("overlay");
const finalScoreSpan = document.getElementById("finalScore");
const finalLevelSpan = document.getElementById("finalLevel");
const newRecordP = document.getElementById("newRecord");
const nameInput = document.getElementById("nameInput");
const btnSaveName = document.getElementById("btnSaveName");
const restartBtn = document.getElementById("restartBtn");

// Izbornici
const menuBtn = document.getElementById("menuBtn");
const helpBtn = document.getElementById("helpBtn");
const musicPrevBtn = document.getElementById("musicPrev");
const musicPlayBtn = document.getElementById("musicPlay");
const musicNextBtn = document.getElementById("musicNext");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const rotateFsBtn = document.getElementById("rotateFsBtn");
const screenMain = document.getElementById("screen-main");
const screenSettings = document.getElementById("screen-settings");
const screenHighscore = document.getElementById("screen-highscore");
const screenPause = document.getElementById("screen-pause");
const screenLegend = document.getElementById("screen-legend");
const screenTutorial = document.getElementById("screen-tutorial");
const hsListDiv = document.getElementById("hsList");
const allScreens = [screenMain, screenSettings, screenHighscore, screenPause, screenLegend, screenTutorial, overlay];

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
    const t = targetForLevel(level);
    remainingSpan.textContent = Math.max(0, t - completedThisLevel);
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

// Pomakni boju u svjetliju/tamniju nijansu (pct: + svjetlije, - tamnije)
function shade(hex, pct) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * pct)));
    const h = (v) => clamp(v).toString(16).padStart(2, "0");
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "#" + h(r) + h(g) + h(b);
}

// Svaka boja ima svoj APSTRAKTNI uzorak (azulejo motivi), u malo drugačijoj nijansi.
// Motivi su mali SVG-ovi koji se ponavljaju (data URI).
const TILE = 26;
function tileBg(inner) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + TILE + "' height='" + TILE +
        "' viewBox='0 0 " + TILE + " " + TILE + "'>" + inner + "</svg>";
    return { image: "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")", size: TILE + "px " + TILE + "px" };
}

const PATTERNS = [
    // cvijet / četverolist
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><circle cx='13' cy='6' r='5'/><circle cx='13' cy='20' r='5'/><circle cx='6' cy='13' r='5'/><circle cx='20' cy='13' r='5'/></g>"),
    // koncentrični krugovi
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><circle cx='13' cy='13' r='3.5'/><circle cx='13' cy='13' r='8.5'/></g>"),
    // valoviti potezi
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M1 8 C 7 1, 12 15, 18 8 S 25 1, 30 8'/><path d='M1 19 C 7 12, 12 26, 18 19 S 25 12, 30 19'/></g>"),
    // vrtuljak (latice)
    (s) => tileBg("<g fill='" + s + "'><path d='M13 13 Q 12 3 19 4 Q 14 7 13 13'/><path d='M13 13 Q 23 12 22 19 Q 19 14 13 13'/><path d='M13 13 Q 14 23 7 22 Q 12 19 13 13'/><path d='M13 13 Q 3 14 4 7 Q 7 12 13 13'/></g>"),
    // zvijezda
    (s) => tileBg("<path d='M13 2 L15.5 10.5 L24 13 L15.5 15.5 L13 24 L10.5 15.5 L2 13 L10.5 10.5 Z' fill='" + s + "'/>"),
    // latica / oko
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M13 4 C 21 8, 21 18, 13 22 C 5 18, 5 8, 13 4 Z'/><circle cx='13' cy='13' r='1.6' fill='" + s + "'/></g>"),
    // riblje ljuske (lukovi)
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='1.8'><path d='M0 0 A 13 13 0 0 1 26 0'/><path d='M0 26 A 13 13 0 0 1 26 26'/><path d='M-13 13 A 13 13 0 0 1 13 13'/><path d='M13 13 A 13 13 0 0 1 39 13'/></g>"),
    // spirala
    (s) => tileBg("<path d='M13 13 Q 13 8 18 8 Q 23 8 23 14 Q 23 22 14 22 Q 4 22 4 11' fill='none' stroke='" + s + "' stroke-width='2'/>"),
    // isprepletene petlje (beskonačno)
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><circle cx='8' cy='13' r='5'/><circle cx='18' cy='13' r='5'/></g>"),
    // kapljica / vrtlog
    (s) => tileBg("<path d='M13 3 C 13 3 21 11 21 16 A 8 8 0 0 1 5 16 C 5 11 13 3 13 3 Z' fill='none' stroke='" + s + "' stroke-width='2'/>"),
    // mreža lukova (val)
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M0 20 Q 6.5 8 13 20 T 26 20'/><path d='M0 9 Q 6.5 -3 13 9 T 26 9'/></g>"),
    // trolist
    (s) => tileBg("<g fill='" + s + "'><circle cx='13' cy='7' r='4'/><circle cx='8' cy='17' r='4'/><circle cx='18' cy='17' r='4'/></g>"),
    // romb sa zrakama
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M13 3 L23 13 L13 23 L3 13 Z'/><path d='M13 8 L18 13 L13 18 L8 13 Z'/></g>"),
    // polukrugovi
    (s) => tileBg("<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M4 4 A 9 9 0 0 1 22 4'/><path d='M4 22 A 9 9 0 0 0 22 22'/></g>")
];

// Oboji element + uzorak specifičan za tu boju (u malo drugačijoj nijansi)
function applyCellPattern(el, color) {
    el.style.backgroundColor = color;
    el.style.backgroundPosition = "0 0";

    if (cellTheme === "plain" || color === WHITE) {
        el.style.backgroundImage = "none";
        el.style.backgroundSize = "";
        return;
    }

    const idx = ALL_COLORS.indexOf(color);
    const pat = PATTERNS[(idx >= 0 ? idx : 0) % PATTERNS.length];
    // nijansa uzorka: tamnija na svijetlim bojama, svjetlija na tamnima
    const sh = isLightColor(color) ? shade(color, -0.16) : shade(color, 0.22);

    const out = pat(sh);
    el.style.backgroundImage = out.image;
    el.style.backgroundSize = out.size;
}

// ===== VIZUAL JEDNOG PREDMETA =====
function makeVisual(item, size) {

    const el = document.createElement("div");
    el.style.width = size + "px";
    el.style.height = size + "px";

    if (item.kind === "color") {
        el.className = "vis-color";
        applyCellPattern(el, item.color);
        if (item.color === WHITE) {
            el.classList.add("is-joker");
            el.innerHTML = jokerSvg();
        } else if (showNumbers) {
            el.classList.add("has-num");
            el.appendChild(numberLabel(item.color, size));
        }
    } else {
        const p = POWERS[item.power];
        el.className = "vis-power";
        el.style.setProperty("--pw", p.color);

        const span = document.createElement("span");
        span.className = "pw-symbol";
        if (item.power === "white") {
            // umjesto emojija: outline kapljice
            span.innerHTML = dropletSvg(size * 0.5);
        } else {
            el.style.fontSize = (size * 0.32) + "px";
            span.textContent = p.symbol;
        }
        el.appendChild(span);
    }

    return el;
}

// ===== DRAG & DROP POMOĆNE =====
function makeDraggable(el, source) {
    // ===== Mouse: HTML5 drag & drop =====
    el.draggable = true;
    el.ondragstart = (e) => {
        if (gameOver) { e.preventDefault(); return; }
        dragSource = source;
        e.dataTransfer.setData("text/plain", "x");
        e.dataTransfer.effectAllowed = "move";
    };
    el.ondragend = () => { dragSource = null; };

    // ===== Touch: ručna implementacija za mobitele =====
    el.addEventListener("touchstart", (e) => {
        if (gameOver) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        dragSource = source;

        const rect = el.getBoundingClientRect();
        const mirror = el.cloneNode(true);
        mirror.style.position = "fixed";
        mirror.style.left = rect.left + "px";
        mirror.style.top = rect.top + "px";
        mirror.style.width = rect.width + "px";
        mirror.style.height = rect.height + "px";
        mirror.style.margin = "0";
        mirror.style.pointerEvents = "none";
        mirror.style.opacity = "0.85";
        mirror.style.zIndex = "100";
        mirror.style.transition = "none";
        document.body.appendChild(mirror);

        touchDragCtx = {
            mirror: mirror,
            offsetX: t.clientX - rect.left,
            offsetY: t.clientY - rect.top
        };
    }, { passive: false });
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
            const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
            const vis = makeVisual(item, isTouch ? 70 : 60);
            if (!gameOver) makeDraggable(vis, { from: "storage", index: index });
            slot.appendChild(vis);
        }

        makeDropTarget(slot, () => dropOnSlot(index));

        storageDiv.appendChild(slot);
    });
}

// ===== PLOČA =====
// HEX mod: 6 trokutastih polja (kriški) koja zajedno čine šesterokut
const HEX_WEDGES = [
    "polygon(50% 50%, 50% 0%, 100% 25%)",
    "polygon(50% 50%, 100% 25%, 100% 75%)",
    "polygon(50% 50%, 100% 75%, 50% 100%)",
    "polygon(50% 50%, 50% 100%, 0% 75%)",
    "polygon(50% 50%, 0% 75%, 0% 25%)",
    "polygon(50% 50%, 0% 25%, 50% 0%)"
];
// težišta kriški (udio širine/visine) za broj i let boja u spremnik
const HEX_CENTROIDS = [
    [0.667, 0.25], [0.833, 0.5], [0.667, 0.75],
    [0.333, 0.75], [0.167, 0.5], [0.333, 0.25]
];

// obris šesterokuta + linije koje razdvajaju 6 kriški (od centra do svakog vrha)
function hexOutlineBg(stroke) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
        "<g fill='none' stroke='" + stroke + "' stroke-width='2.5' stroke-linejoin='round' stroke-linecap='round'>" +
            "<polygon points='50,2 98,26 98,74 50,98 2,74 2,26'/>" +
            "<path d='M50 50 L50 2 M50 50 L98 26 M50 50 L98 74 M50 50 L50 98 M50 50 L2 74 M50 50 L2 26'/>" +
        "</g></svg>";
    return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
}

function cellsPerSquare() {
    return gameMode === "hex" ? 6 : 4;
}

function createBoard() {
    boardDiv.innerHTML = "";
    bigSquares.length = 0;

    const n = cellsPerSquare();
    const hex = gameMode === "hex";

    for (let i = 0; i < 10; i++) {

        const square = { cells: new Array(n).fill(null) };
        bigSquares.push(square);

        const bigDiv = document.createElement("div");
        bigDiv.className = "big-square";
        square.element = bigDiv;

        for (let j = 0; j < n; j++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            if (hex) {
                cell.classList.add("wedge");
                cell.style.clipPath = HEX_WEDGES[j];
                cell._cx = HEX_CENTROIDS[j][0];
                cell._cy = HEX_CENTROIDS[j][1];
            }
            makeDropTarget(cell, () => dropOnCell(square, j));
            bigDiv.appendChild(cell);
        }

        if (hex) {
            const outline = document.createElement("div");
            outline.className = "hex-outline";
            outline.style.backgroundImage = hexOutlineBg("#555");
            bigDiv.appendChild(outline);
        }

        // drop na cijeli veliki kvadrat (razmak/padding izvan polja) -> auto-place za boju
        bigDiv.addEventListener("dragover", (e) => e.preventDefault());
        bigDiv.addEventListener("drop", (e) => {
            e.preventDefault();
            if (e.target !== bigDiv) return;  // već obradio cell handler
            const it = draggedItem();
            if (!it || it.kind !== "color") return;  // moći trebaju konkretno polje
            dropOnCell(square, 0);   // cellIndex se za boju ionako ignorira (auto-place)
        });

        boardDiv.appendChild(bigDiv);
    }

    renderBoard();
}

// iscrtaj sadržaj jednog polja (boja + uzorak + broj/džoker)
function renderCell(cell, c) {
    if (!c) {
        cell.style.backgroundColor = "#374151";
        cell.style.backgroundImage = "none";
        cell.style.backgroundSize = "";
        cell.innerHTML = "";
        return;
    }

    applyCellPattern(cell, c);

    const hex = cell._cx !== undefined;
    const pos = hex ? ("left:" + (cell._cx * 100) + "%;top:" + (cell._cy * 100) + "%;") : "";

    if (c === WHITE) {
        cell.innerHTML = hex
            ? '<span class="wedge-mark" style="' + pos + '">' + jokerSvg() + '</span>'
            : jokerSvg();
    } else if (showNumbers) {
        const txt = isLightColor(c) ? "#111" : "#fff";
        const fs = hex ? 16 : 22;
        cell.innerHTML =
            '<span class="color-num" style="' + pos + "color:" + txt + ";font-size:" + fs + 'px">' +
            colorNumber(c) + '</span>';
    } else {
        cell.innerHTML = "";
    }
}

function renderBoard() {
    bigSquares.forEach(square => {
        const cells = square.element.children;
        for (let i = 0; i < square.cells.length; i++) {
            renderCell(cells[i], square.cells[i]);
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
    let applied;
    if (item.kind === "color") {
        // AUTO-PLACE: boja se stavlja u prvo slobodno polje u kvadratu (ako paše)
        if (!colorFitsSquare(square, item.color)) return;
        const emptyIdx = square.cells.findIndex(c => c === null);
        if (emptyIdx === -1) return;
        applied = tryPlaceColor(square, emptyIdx, item.color);
    } else {
        applied = tryApplyPower(square, cellIndex, item.power);
    }
    if (!applied) return;

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

    const item = draggedItem();
    if (!item) return;

    // Bijela moć na obojenu kockicu u spremištu -> pretvori tu kockicu u džoker
    if (item.kind === "power" && item.power === "white"
        && storage[index] && storage[index].kind === "color"
        && storage[index].color !== WHITE) {
        storage[index] = { kind: "color", color: WHITE };
        consumeDragSource();
        dragSource = null;
        renderStorage();
        renderIncoming();
        checkGameOver();
        return;
    }

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
        for (let i = 0; i < square.cells.length; i++) {
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

// Boje iz popunjenog polja "odlete" u kutiju za preostale kvadrate
function flyColorsToCollector(points) {
    const box = collectorBox.getBoundingClientRect();
    const targetX = box.left + box.width / 2;
    const targetY = box.top + box.height / 2;
    const SIZE = 30;

    points.forEach((p, i) => {
        const tile = document.createElement("div");
        tile.className = "fly-tile";
        tile.style.left = (p.x - SIZE / 2) + "px";
        tile.style.top = (p.y - SIZE / 2) + "px";
        tile.style.width = SIZE + "px";
        tile.style.height = SIZE + "px";

        applyCellPattern(tile, p.color);
        if (p.color === WHITE) {
            tile.classList.add("is-joker");
            tile.innerHTML = jokerSvg();
        }

        document.body.appendChild(tile);

        const dx = targetX - p.x;
        const dy = targetY - p.y;

        const anim = tile.animate(
            [
                { transform: "translate(0,0) scale(1)", opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.5 }
            ],
            { duration: 500, easing: "cubic-bezier(0.5, 0, 0.75, 1)", delay: i * 50, fill: "forwards" }
        );

        anim.onfinish = () => {
            tile.remove();
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

// Bljesak "+20s" iznad Time Race tajmera
function showTimeBonus() {
    if (!raceHud) return;
    const pop = document.createElement("span");
    pop.className = "time-bonus-pop";
    pop.textContent = "+5s";
    raceHud.appendChild(pop);
    pop.addEventListener("animationend", () => pop.remove());
}

// Specijalni bljesak preko cijelog ekrana kad se polje popuni samim džokerima
function showJokerBonus() {
    const wrap = document.createElement("div");
    wrap.className = "joker-bonus";
    const text = document.createElement("div");
    text.className = "joker-text";
    text.textContent = "JOKER BONUS  +100";
    wrap.appendChild(text);
    document.body.appendChild(wrap);
    let removed = false;
    const done = () => { if (!removed) { removed = true; wrap.remove(); } };
    text.addEventListener("animationend", done);
    setTimeout(done, 1800);   // fallback
}

// Bljesak natpisa kod prelaska na novi nivo
function showLevelUp() {
    const banner = document.createElement("div");
    banner.className = "level-up";
    banner.textContent = "Level " + level + "!";
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
        // specijalni bonus: polje popunjeno isključivo džokerima -> 100 bodova
        const allJokers = square.cells.every(c => c === WHITE);
        const base = allJokers ? 100 : square.cells.length;
        score += base + bonus;
        scoreDiv.textContent = score;
        pulse(scoreDiv);

        if (bonus > 0) showCombo(combo, bonus);
        if (allJokers) showJokerBonus();

        completedThisLevel++;

        // Time Race: svaki zatvoreni kvadrat produžuje tajmer
        if (isTimeRace()) addRaceBonus();

        if (completedThisLevel >= targetForLevel(level)) {
            level++;
            completedThisLevel = 0;
            rebuildActiveColors();
            showLevelUp();
            cycleBackground();   // svaki nivo -> nova pozadina
        }
        updateHud();

        // zapamti polazne točke (centar polja) i boje pa ih pošalji u kutiju
        const cells = square.element.children;
        const boxRect = square.element.getBoundingClientRect();
        const points = [];
        for (let i = 0; i < square.cells.length; i++) {
            const cell = cells[i];
            let x, y;
            if (cell._cx !== undefined) {            // HEX: težište kriške
                x = boxRect.left + cell._cx * boxRect.width;
                y = boxRect.top + cell._cy * boxRect.height;
            } else {                                  // klasično: centar polja
                const cr = cell.getBoundingClientRect();
                x = cr.left + cr.width / 2;
                y = cr.top + cr.height / 2;
            }
            points.push({ x: x, y: y, color: square.cells[i] });
        }

        // polje se oslobađa odmah nakon bodovanja
        square.cells = new Array(square.cells.length).fill(null);
        flyColorsToCollector(points);
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
    stopRaceTimer();
    finalScoreSpan.textContent = score;
    finalLevelSpan.textContent = level;

    const timeRace = isTimeRace();

    // Time Race: iznad game overa piše "Time's up!"; score/level se prikazuju kao i inače
    if (finalScoreP) finalScoreP.hidden = false;
    if (finalTimeP) finalTimeP.hidden = true;
    if (gameOverMsg) gameOverMsg.textContent = timeRace ? "Time's up!" : "No more moves.";

    // pokušaj uvrstiti u odgovarajuću ljestvicu
    currentEntry = null;
    if (timeRace) {
        if (qualifiesForTimeBoard(score)) {
            currentEntry = { name: playerName, score: score, level: level, difficulty: difficulty };
            leaderboardTime.push(currentEntry);
            sortLeaderboardTime();
            if (leaderboardTime.indexOf(currentEntry) === -1) currentEntry = null;
            saveLeaderboards();
        }
    } else if (qualifiesForBoard(score)) {
        currentEntry = { name: playerName, score: score, level: level, difficulty: difficulty, mode: gameMode };
        leaderboard.push(currentEntry);
        sortLeaderboard();
        if (leaderboard.indexOf(currentEntry) === -1) currentEntry = null;
        saveLeaderboards();
    }

    if (currentEntry) {
        const list = timeRace ? leaderboardTime : leaderboard;
        const rank = list.indexOf(currentEntry) + 1;
        newRecordP.textContent = rank === 1 ? "New record! 🎉" : ("You made top " + MAX_SCORES + "! (" + rank + ")");
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
        const rawT = localStorage.getItem("blockade_leaderboard_time");
        leaderboardTime = rawT ? JSON.parse(rawT) : [];
        if (!Array.isArray(leaderboardTime)) leaderboardTime = [];
        playerName = localStorage.getItem("blockade_player_name") || "";
    } catch (e) {
        leaderboard = [];
        leaderboardTime = [];
        playerName = "";
    }
    sortLeaderboard();
    sortLeaderboardTime();
}

function sortLeaderboard() {
    leaderboard.sort((a, b) => b.score - a.score);
    if (leaderboard.length > MAX_SCORES) leaderboard.length = MAX_SCORES;
}

// Time Race (blitz): sortirano po bodovima silazno (više = bolje)
function sortLeaderboardTime() {
    leaderboardTime.sort((a, b) => b.score - a.score);
    if (leaderboardTime.length > MAX_SCORES) leaderboardTime.length = MAX_SCORES;
}

function qualifiesForBoard(s) {
    if (s <= 0) return false;
    if (leaderboard.length < MAX_SCORES) return true;
    return s > leaderboard[leaderboard.length - 1].score;
}

function qualifiesForTimeBoard(s) {
    if (s <= 0) return false;
    if (leaderboardTime.length < MAX_SCORES) return true;
    return s > leaderboardTime[leaderboardTime.length - 1].score;
}

function saveLeaderboards() {
    try {
        localStorage.setItem("blockade_leaderboard", JSON.stringify(leaderboard));
        localStorage.setItem("blockade_leaderboard_time", JSON.stringify(leaderboardTime));
    } catch (e) {}
}
// legacy alias (nekad se zvala saveLeaderboard)
function saveLeaderboard() { saveLeaderboards(); }

function savePlayerName() {
    try { localStorage.setItem("blockade_player_name", playerName); } catch (e) {}
}

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let hsTab = "score";   // "score" | "time"

function updateHighscoreScreen() {
    const list = hsTab === "time" ? leaderboardTime : leaderboard;
    if (list.length === 0) {
        hsListDiv.innerHTML = '<p class="hs-empty">No scores yet.</p>';
        return;
    }
    let html = "";
    list.forEach((e, i) => {
        const nm = e.name ? escapeHtml(e.name) : "—";
        const diffLabel = e.difficulty && DIFFICULTIES[e.difficulty] ? DIFFICULTIES[e.difficulty].label : "";
        if (hsTab === "time") {
            html +=
                '<div class="hs-row">' +
                    '<span class="hs-rank">' + (i + 1) + '.</span>' +
                    '<div class="hs-pname">' +
                        '<div class="hs-name-main">' + nm + '</div>' +
                        (diffLabel ? '<div class="hs-meta">' + diffLabel + '</div>' : '') +
                    '</div>' +
                    '<span class="hs-pscore">' + e.score + '</span>' +
                    '<span class="hs-plevel">lvl ' + e.level + '</span>' +
                '</div>';
        } else {
            const modeLabel = e.mode === "hex" ? "HEX" : (e.mode === "classic" ? "Classic" : "");
            const meta = [diffLabel, modeLabel].filter(Boolean).join(" · ");
            html +=
                '<div class="hs-row">' +
                    '<span class="hs-rank">' + (i + 1) + '.</span>' +
                    '<div class="hs-pname">' +
                        '<div class="hs-name-main">' + nm + '</div>' +
                        (meta ? '<div class="hs-meta">' + meta + '</div>' : '') +
                    '</div>' +
                    '<span class="hs-pscore">' + e.score + '</span>' +
                    '<span class="hs-plevel">lvl ' + e.level + '</span>' +
                '</div>';
        }
    });
    hsListDiv.innerHTML = html;
}

function setHsTab(tab) {
    hsTab = (tab === "time") ? "time" : "score";
    document.querySelectorAll(".hs-tab").forEach(b => {
        b.classList.toggle("active", b.dataset.hstab === hsTab);
    });
    updateHighscoreScreen();
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

// ===== TEMA KVADRATIĆA (uzorak) =====
function setCellTheme(theme, save) {
    if (theme !== "plain" && theme !== "patterns") theme = "patterns";
    cellTheme = theme;
    if (save) {
        try { localStorage.setItem("blockade_celltheme", theme); } catch (e) {}
    }
    updateThemeButtons();
    // ponovno iscrtaj sve obojano da se uzorak primijeni
    renderBoard();
    renderStorage();
    renderIncoming();
}

function loadCellTheme() {
    let t = "patterns";
    try { t = localStorage.getItem("blockade_celltheme") || "patterns"; } catch (e) {}
    cellTheme = (t === "plain" || t === "patterns") ? t : "patterns";
    updateThemeButtons();
}

function updateThemeButtons() {
    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === cellTheme);
    });
}

// ===== BROJEVI NA BOJAMA =====
function setNumbers(on, save) {
    showNumbers = !!on;
    if (save) {
        try { localStorage.setItem("blockade_numbers", showNumbers ? "1" : "0"); } catch (e) {}
    }
    updateNumButtons();
    renderBoard();
    renderStorage();
    renderIncoming();
}

function loadNumbers() {
    let v = "1";
    try { const s = localStorage.getItem("blockade_numbers"); if (s !== null) v = s; } catch (e) {}
    showNumbers = v !== "0";
    updateNumButtons();
}

function updateNumButtons() {
    document.querySelectorAll(".num-btn").forEach(btn => {
        btn.classList.toggle("active", (btn.dataset.num === "on") === showNumbers);
    });
}

// ===== POZADINSKA GLAZBA (playlist) =====
// Dodaj novu datoteku u ovaj popis (mora biti u istoj mapi kao veco.html).
const MUSIC_TRACKS = [
    "music.mp3.mp3",
    "music3.mp3.mp3"
];
let currentTrack = 0;
let musicErrorStreak = 0;

if (bgm) {
    bgm.volume = 0.4;
    bgm.addEventListener("ended", () => { musicErrorStreak = 0; playTrack(currentTrack + 1); });
    bgm.addEventListener("error", () => {
        musicErrorStreak++;
        if (musicErrorStreak < MUSIC_TRACKS.length) playTrack(currentTrack + 1);
    });
    bgm.addEventListener("playing", () => { musicErrorStreak = 0; });
}

function playTrack(i) {
    if (!bgm || MUSIC_TRACKS.length === 0) return;
    const n = MUSIC_TRACKS.length;
    currentTrack = ((i % n) + n) % n;
    bgm.src = MUSIC_TRACKS[currentTrack];
    if (musicOn) {
        const p = bgm.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
    }
}

function tryPlayMusic() {
    if (!bgm || !musicOn) return;
    if (!bgm.src) {
        playTrack(currentTrack);
    } else {
        const p = bgm.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
    }
}

function setMusic(on, save) {
    musicOn = !!on;
    if (save) {
        try { localStorage.setItem("blockade_music", musicOn ? "1" : "0"); } catch (e) {}
    }
    updateMusicButtons();
    if (bgm) {
        if (musicOn) tryPlayMusic();
        else bgm.pause();
    }
}

function loadMusic() {
    let v = "1";
    try { const s = localStorage.getItem("blockade_music"); if (s !== null) v = s; } catch (e) {}
    musicOn = v !== "0";
    updateMusicButtons();
}

function updateMusicButtons() {
    document.querySelectorAll(".music-btn").forEach(btn => {
        btn.classList.toggle("active", (btn.dataset.music === "on") === musicOn);
    });
    updateMusicPlayBtn();
}

function updateMusicPlayBtn() {
    if (musicPlayBtn) musicPlayBtn.textContent = musicOn ? "⏸" : "▶";
}

// ===== GAME MOD (oblik polja / time race) =====
function isTimeRace() { return gameMode === "time"; }

function setGameMode(mode, save) {
    if (mode !== "classic" && mode !== "hex" && mode !== "time") mode = "classic";
    gameMode = mode;
    boardDiv.classList.toggle("hex", mode === "hex");
    boardDiv.classList.toggle("time-race", mode === "time");
    if (raceHud) raceHud.hidden = !isTimeRace();
    createBoard();   // ponovo izgradi ploču (4 ili 6 polja po kvadratu; time race koristi 4)
    if (save) {
        try { localStorage.setItem("blockade_mode", mode); } catch (e) {}
    }
    updateModeButtons();
}

// samo postavi mod (bez ponovne izgradnje) — ploču gradi START nakon ovoga
function loadGameMode() {
    let m = "classic";
    try { m = localStorage.getItem("blockade_mode") || "classic"; } catch (e) {}
    gameMode = (m === "hex" || m === "time") ? m : "classic";
    boardDiv.classList.toggle("hex", gameMode === "hex");
    boardDiv.classList.toggle("time-race", gameMode === "time");
    if (raceHud) raceHud.hidden = !isTimeRace();
    updateModeButtons();
}

// ===== TIME RACE TAJMER (countdown) =====
function formatRaceTime(ms) {
    if (ms < 0) ms = 0;
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = totalSec - m * 60;
    return String(m).padStart(2, "0") + ":" + s.toFixed(1).padStart(4, "0");
}

function updateRaceDisplay() {
    if (!raceTimeSpan) return;
    raceTimeSpan.textContent = formatRaceTime(raceRemainingMs);
    // vizualni alarm kad je vrijeme kratko
    raceTimeSpan.classList.toggle("race-low", raceRemainingMs > 0 && raceRemainingMs < 10000);
}

function tickRaceTimer() {
    if (!isTimeRace() || gameOver) return;
    raceRemainingMs = raceEndTime - performance.now();
    if (raceRemainingMs <= 0) {
        raceRemainingMs = 0;
        updateRaceDisplay();
        finishTimeRace();
        return;
    }
    updateRaceDisplay();
}

function startRaceTimer() {
    raceEndTime = performance.now() + RACE_START_MS;
    raceRemainingMs = RACE_START_MS;
    if (raceInterval) clearInterval(raceInterval);
    raceInterval = setInterval(tickRaceTimer, 100);
    updateRaceDisplay();
}

function stopRaceTimer() {
    if (raceInterval) { clearInterval(raceInterval); raceInterval = null; }
}

function pauseRaceTimer() {
    if (!raceInterval) return;   // već pauziran
    raceRemainingMs = raceEndTime - performance.now();
    clearInterval(raceInterval);
    raceInterval = null;
}

function resumeRaceTimer() {
    if (gameOver) return;
    if (raceRemainingMs <= 0) return;
    raceEndTime = performance.now() + raceRemainingMs;
    if (!raceInterval) raceInterval = setInterval(tickRaceTimer, 100);
    updateRaceDisplay();
}

// Dodaj bonus vrijeme (na zatvoreni kvadrat)
function addRaceBonus() {
    raceEndTime += RACE_BONUS_MS;
    raceRemainingMs = raceEndTime - performance.now();
    updateRaceDisplay();
    showTimeBonus();
}

// Poziva se kad istekne vrijeme -> kraj igre
function finishTimeRace() {
    stopRaceTimer();
    gameOver = true;
    showGameOver();
}

function updateModeButtons() {
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === gameMode);
    });
}

// ===== IZBORNICI =====
function openScreen(screen) {
    allScreens.forEach(s => s.classList.remove("show"));
    if (screen) screen.classList.add("show");
    const hide = screen ? "none" : "";
    menuBtn.style.display = hide;
    helpBtn.style.display = hide;
    if (musicPrevBtn) musicPrevBtn.style.display = hide;
    if (musicPlayBtn) musicPlayBtn.style.display = hide;
    if (musicNextBtn) musicNextBtn.style.display = hide;
    if (fullscreenBtn) fullscreenBtn.style.display = hide;
    // Time Race: pauziraj tajmer kad je otvoren izbornik (osim Game Over overlaya)
    if (screen && screen !== overlay && isTimeRace() && !gameOver) pauseRaceTimer();
}

function closeToGame() {
    allScreens.forEach(s => s.classList.remove("show"));
    menuBtn.style.display = "";
    helpBtn.style.display = "";
    if (musicPrevBtn) musicPrevBtn.style.display = "";
    if (musicPlayBtn) musicPlayBtn.style.display = "";
    if (musicNextBtn) musicNextBtn.style.display = "";
    if (fullscreenBtn) fullscreenBtn.style.display = "";
    if (isTimeRace() && !gameOver) resumeRaceTimer();
}

// ===== TUTORIAL =====
let tutorialSlide = 0;
const tutSlidesEl = document.getElementById("tutorialSlides");
const tutStepSpan = document.getElementById("tutStep");
const tutTotalSpan = document.getElementById("tutTotal");
const btnTutPrev = document.getElementById("btnTutPrev");
const btnTutNext = document.getElementById("btnTutNext");
const btnTutSkip = document.getElementById("btnTutSkip");
const tutSlidesCount = tutSlidesEl ? tutSlidesEl.children.length : 0;
if (tutTotalSpan) tutTotalSpan.textContent = tutSlidesCount;

function showTutorialSlide(n) {
    if (!tutSlidesEl) return;
    const slides = tutSlidesEl.children;
    n = Math.max(0, Math.min(slides.length - 1, n));
    tutorialSlide = n;
    for (let i = 0; i < slides.length; i++) slides[i].hidden = (i !== n);
    if (tutStepSpan) tutStepSpan.textContent = (n + 1);
    if (btnTutPrev) btnTutPrev.disabled = (n === 0);
    if (btnTutNext) btnTutNext.textContent = (n === slides.length - 1) ? "Start" : "Next";
}

function openTutorial() {
    showTutorialSlide(0);
    openScreen(screenTutorial);
}

function tutorialNext() {
    if (tutorialSlide >= tutSlidesCount - 1) startGame();
    else showTutorialSlide(tutorialSlide + 1);
}

function tutorialPrev() {
    if (tutorialSlide > 0) showTutorialSlide(tutorialSlide - 1);
}

// ===== POKRETANJE / RESET IGRE =====
function startGame() {
    score = 0;
    scoreDiv.textContent = "0";
    level = 1;
    completedThisLevel = 0;
    combo = 0;
    completedThisDrop = false;
    rebuildActiveColors();
    storage = [null, null, null, null, null, null];
    bigSquares.forEach(sq => sq.cells = new Array(sq.cells.length).fill(null));
    dragSource = null;
    gameOver = false;

    updateHud();
    renderBoard();
    renderStorage();
    generateNext();
    if (typeof loadBackground === "function") loadBackground();  // vrati na spremljeni izbor

    // Time Race: pokreni tajmer, inače ga zaustavi
    stopRaceTimer();
    if (raceTimeSpan) raceTimeSpan.textContent = "00:00.0";
    if (isTimeRace()) startRaceTimer();

    closeToGame();
}

// ===== POVEZIVANJE GUMBA =====
let settingsReturn = screenMain;   // ekran na koji se vraća iz Postavki

menuBtn.onclick = () => { if (!gameOver) openScreen(screenPause); };
helpBtn.onclick = () => { if (!gameOver) openScreen(screenLegend); };
document.getElementById("btnLegendBack").onclick = closeToGame;

document.getElementById("btnStart").onclick = openTutorial;

if (btnTutNext) btnTutNext.onclick = tutorialNext;
if (btnTutPrev) btnTutPrev.onclick = tutorialPrev;
if (btnTutSkip) btnTutSkip.onclick = startGame;
document.getElementById("btnSettings").onclick = () => { settingsReturn = screenMain; openScreen(screenSettings); };
document.getElementById("btnHighscore").onclick = () => { updateHighscoreScreen(); openScreen(screenHighscore); };

document.querySelectorAll(".hs-tab").forEach(btn => {
    btn.onclick = () => setHsTab(btn.dataset.hstab);
});

document.getElementById("btnSettingsBack").onclick = () => openScreen(settingsReturn);
document.getElementById("btnHsBack").onclick = () => openScreen(screenMain);

document.getElementById("btnPauseSettings").onclick = () => { settingsReturn = screenPause; openScreen(screenSettings); };

document.querySelectorAll(".diff-btn").forEach(btn => {
    btn.onclick = () => setDifficulty(btn.dataset.diff, true);
});

document.querySelectorAll(".bg-btn").forEach(btn => {
    btn.onclick = () => setBackground(btn.dataset.bg, true);
});

document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.onclick = () => setCellTheme(btn.dataset.theme, true);
});

document.querySelectorAll(".num-btn").forEach(btn => {
    btn.onclick = () => setNumbers(btn.dataset.num === "on", true);
});

document.querySelectorAll(".music-btn").forEach(btn => {
    btn.onclick = () => setMusic(btn.dataset.music === "on", true);
});

if (musicPrevBtn) musicPrevBtn.onclick = () => playTrack(currentTrack - 1);
if (musicNextBtn) musicNextBtn.onclick = () => playTrack(currentTrack + 1);
if (musicPlayBtn) musicPlayBtn.onclick = () => setMusic(!musicOn, true);

// ===== FULLSCREEN =====
function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function toggleFullscreen() {
    const el = document.documentElement;
    if (!isFullscreen()) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!req) return;
        const p = req.call(el);
        const afterEnter = () => {
            // pokušaj zaključati orijentaciju na landscape (radi na Chrome/Android u fullscreenu)
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock("landscape").catch(() => {});
            }
        };
        if (p && typeof p.then === "function") p.then(afterEnter).catch(() => {});
        else afterEnter();
    } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
    }
}

function updateFullscreenBtn() {
    if (fullscreenBtn) fullscreenBtn.title = isFullscreen() ? "Exit fullscreen" : "Fullscreen";
}

// U fullscreenu izračunaj scale da game što bolje ispuni ekran
function fitFullscreen() {
    const gameEl = document.querySelector(".game");
    if (!gameEl) return;
    const fs = isFullscreen();
    document.body.classList.toggle("fs", fs);   // sakrij body scroll u fullscreenu
    if (fs) {
        gameEl.style.transform = "none";
        gameEl.style.transformOrigin = "center center";
        // izmjeri prirodnu veličinu (bez transformacije)
        void gameEl.offsetHeight;
        const w = gameEl.offsetWidth || 1;
        const h = gameEl.offsetHeight || 1;
        // fit-inside: skaliraj da stane u oba dimenzija (bez rezanja)
        const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
        // U HEX modu pomakni sve desno da bolje sjedne u fullscreen
        const isHex = boardDiv.classList.contains("hex");
        // na dodiru: pomakni malo dolje da gumbi za glazbu ne prekrivaju gornji red
        const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        const shiftX = isHex ? 90 : 0;
        const shiftY = isTouch ? 40 : 0;
        gameEl.style.transform =
            "translate(" + shiftX + "px, " + shiftY + "px) scale(" + scale.toFixed(4) + ")";
    } else {
        gameEl.style.transform = "";
        gameEl.style.transformOrigin = "";
    }
}

document.addEventListener("fullscreenchange", () => { updateFullscreenBtn(); fitFullscreen(); });
document.addEventListener("webkitfullscreenchange", () => { updateFullscreenBtn(); fitFullscreen(); });
window.addEventListener("resize", fitFullscreen);
window.addEventListener("orientationchange", () => setTimeout(fitFullscreen, 100));

if (fullscreenBtn) fullscreenBtn.onclick = toggleFullscreen;
if (rotateFsBtn) rotateFsBtn.onclick = toggleFullscreen;

// pokreni glazbu na prvi klik (preglednici trebaju korisničku gesturu)
document.addEventListener("click", () => { tryPlayMusic(); }, { once: false, capture: true });

// ===== TOUCH DRAG (mobiteli) =====
document.addEventListener("touchmove", (e) => {
    if (!touchDragCtx) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    touchDragCtx.mirror.style.left = (t.clientX - touchDragCtx.offsetX) + "px";
    touchDragCtx.mirror.style.top = (t.clientY - touchDragCtx.offsetY) + "px";
}, { passive: false });

function endTouchDrag(clientX, clientY, dropOnTarget) {
    const ctx = touchDragCtx;
    if (!ctx) return;
    touchDragCtx = null;
    ctx.mirror.style.display = "none";  // sakrij da elementFromPoint nađe element ispod
    const target = (clientX != null && dropOnTarget)
        ? document.elementFromPoint(clientX, clientY)
        : null;
    ctx.mirror.remove();

    if (!dropOnTarget || !target || !dragSource) { dragSource = null; return; }

    // pronađi drop target: prvo cell, pa big-square, pa slot
    const cell = target.closest ? target.closest(".cell") : null;
    if (cell && cell.parentNode && cell.parentNode.classList.contains("big-square")) {
        const sq = bigSquares.find(s => s.element === cell.parentNode);
        if (sq) {
            const idx = Array.prototype.indexOf.call(cell.parentNode.children, cell);
            dropOnCell(sq, idx);
            return;
        }
    }
    const bigSq = target.closest ? target.closest(".big-square") : null;
    if (bigSq) {
        const sq = bigSquares.find(s => s.element === bigSq);
        if (sq) {
            const it = draggedItem();
            if (it && it.kind === "color") dropOnCell(sq, 0);   // auto-place za boju
        }
        dragSource = null;
        return;
    }
    const slot = target.closest ? target.closest(".slot") : null;
    if (slot && slot.parentNode === storageDiv) {
        const slotIdx = Array.prototype.indexOf.call(storageDiv.children, slot);
        dropOnSlot(slotIdx);
        return;
    }
    dragSource = null;
}

document.addEventListener("touchend", (e) => {
    if (!touchDragCtx) return;
    const t = e.changedTouches[0];
    endTouchDrag(t.clientX, t.clientY, true);
}, { passive: false });

document.addEventListener("touchcancel", () => {
    endTouchDrag(null, null, false);
});

document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.onclick = () => setGameMode(btn.dataset.mode, true);
});

document.getElementById("btnResetHs").onclick = () => {
    leaderboard = [];
    leaderboardTime = [];
    saveLeaderboards();
    updateHighscoreScreen();
};

// Upis imena na Game Over ekranu
nameInput.oninput = applyName;
nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { applyName(); nameInput.blur(); }
});
btnSaveName.onclick = () => {
    applyName();
    btnSaveName.textContent = "Saved ✓";
    setTimeout(() => { btnSaveName.textContent = "Save"; }, 1200);
};

document.getElementById("btnResume").onclick = closeToGame;
document.getElementById("btnPauseRestart").onclick = openTutorial;
document.getElementById("btnPauseMain").onclick = () => openScreen(screenMain);

restartBtn.onclick = openTutorial;
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

// ===== ZVUK KLIKA (generiran, bez vanjske datoteke) =====
let audioCtx = null;
function playClick() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();

        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(660, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
    } catch (e) { /* zvuk nedostupan */ }
}

// klik zvuk na svaki gumb (i buduće)
document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("button")) playClick();
}, true);

// ===== START =====
loadHighScore();
loadDifficulty();
loadCellTheme();
loadNumbers();
loadMusic();
loadGameMode();
createBoard();
renderBoard();
renderStorage();
updateHud();
openScreen(screenMain);

// ===== POZADINSKA ANIMACIJA (više vrsta: točkice / voda / tamno) =====
const bgCanvas = document.getElementById("bg");
const bgCtx = (bgCanvas && bgCanvas.getContext) ? bgCanvas.getContext("2d") : null;
let bgMode = "dots";          // dots | water | constellation | warp | fireflies | ripples | none
let bgW = 0, bgH = 0;
let bgDots = [];
let bgNet = [];               // konstelacije
let bgStars = [];             // zvjezdani warp
let bgFireflies = [];         // krijesnice
let bgRipples = [];           // valovi/ripples
let bgTopoPeaks = [];         // topografska karta - središta krugova
let bgMatrixCols = [];        // matrix code - kolone
const BG_TRAIL = 45;
const bgStart = Date.now();
const BG_MODES = ["dots", "water", "constellation", "warp", "fireflies", "ripples", "topo", "matrix", "none"];
// redoslijed kroz koji pozadina rotira na svaki novi nivo
const BG_CYCLE = ["dots", "water", "constellation", "warp", "fireflies", "ripples", "topo", "matrix"];

function bgResize() {
    if (!bgCanvas) return;
    bgW = bgCanvas.width = window.innerWidth;
    bgH = bgCanvas.height = window.innerHeight;
}

function bgMakeDots() {
    const count = Math.max(30, Math.round((bgW * bgH) / 22000));
    bgDots = [];
    for (let i = 0; i < count; i++) {
        bgDots.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            r: Math.random() * 1.6 + 0.6,
            speed: Math.random() * 1.6 + 0.6,
            trail: []
        });
    }
}

function bgMakeNet() {
    const count = Math.max(24, Math.min(140, Math.round((bgW * bgH) / 16000)));
    bgNet = [];
    for (let i = 0; i < count; i++) {
        bgNet.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
        });
    }
}

function bgMakeStars() {
    const count = Math.max(120, Math.round((bgW * bgH) / 5000));
    bgStars = [];
    for (let i = 0; i < count; i++) {
        bgStars.push({
            x: (Math.random() - 0.5) * bgW,
            y: (Math.random() - 0.5) * bgH,
            z: Math.random() * bgW
        });
    }
}

function bgMakeFireflies() {
    const count = Math.max(30, Math.round((bgW * bgH) / 20000));
    bgFireflies = [];
    for (let i = 0; i < count; i++) {
        bgFireflies.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            r: 1 + Math.random() * 1.8,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            phase: Math.random() * Math.PI * 2,
            freq: 0.4 + Math.random() * 0.6
        });
    }
}

function bgMakeRipples() {
    bgRipples = [];
}

function bgMakeTopo() {
    bgTopoPeaks = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
        bgTopoPeaks.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            amp: 60 + Math.random() * 90,       // visina brda
            width: 110 + Math.random() * 130    // sigma (širina)
        });
    }
}

const MATRIX_FONT_SIZE = 16;
const MATRIX_COL_STEP = 32;   // razmak između kolona (manje kolona = rjeđe padanje)
const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&";
function bgMakeMatrix() {
    const cols = Math.max(1, Math.floor(bgW / MATRIX_COL_STEP));
    bgMatrixCols = [];
    for (let i = 0; i < cols; i++) {
        bgMatrixCols.push({
            y: Math.random() * bgH,
            speed: 1 + Math.random() * 2
        });
    }
}

function bgInit(mode) {
    if (mode === "dots") bgMakeDots();
    else if (mode === "constellation") bgMakeNet();
    else if (mode === "warp") bgMakeStars();
    else if (mode === "fireflies") bgMakeFireflies();
    else if (mode === "ripples") bgMakeRipples();
    else if (mode === "topo") bgMakeTopo();
    else if (mode === "matrix") bgMakeMatrix();
}

// bijele točkice s tragom koji nestane
function bgDrawDots() {
    bgCtx.clearRect(0, 0, bgW, bgH);
    for (const d of bgDots) {
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > BG_TRAIL) d.trail.shift();

        d.y += d.speed;
        if (d.y - d.r > bgH) { d.y = -d.r; d.x = Math.random() * bgW; d.trail.length = 0; }

        const len = d.trail.length;
        for (let i = 0; i < len; i++) {
            const p = d.trail[i];
            const t = i / len;
            bgCtx.fillStyle = "rgba(255, 255, 255, " + (t * 0.45) + ")";
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, d.r * t, 0, Math.PI * 2);
            bgCtx.fill();
        }
        bgCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
        bgCtx.beginPath();
        bgCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        bgCtx.fill();
    }
}

// apstraktna voda: crna pozadina + bijele valovite crte koje teku
function bgDrawWater(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);
    bgCtx.lineWidth = 1.3;

    const lines = 16;
    for (let i = 0; i < lines; i++) {
        const baseY = (bgH / (lines + 1)) * (i + 1);
        const amp = 10 + (i % 4) * 8;
        const freq = 0.006 + (i % 4) * 0.0016;
        const phase = t * (0.5 + (i % 3) * 0.22) + i * 0.6;

        bgCtx.strokeStyle = "rgba(255, 255, 255, " + (0.18 + 0.22 * ((i % 3) / 2)) + ")";
        bgCtx.beginPath();
        for (let x = 0; x <= bgW; x += 10) {
            const y = baseY
                + amp * Math.sin(x * freq + phase)
                + amp * 0.5 * Math.sin(x * freq * 2.3 + phase * 1.6);
            if (x === 0) bgCtx.moveTo(x, y);
            else bgCtx.lineTo(x, y);
        }
        bgCtx.stroke();
    }
}

// konstelacije: točkice povezane linijama kad su blizu
function bgDrawConstellation() {
    bgCtx.clearRect(0, 0, bgW, bgH);

    for (const p of bgNet) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > bgW) p.vx *= -1;
        if (p.y < 0 || p.y > bgH) p.vy *= -1;
    }

    const maxD2 = 120 * 120;
    bgCtx.lineWidth = 1;
    for (let i = 0; i < bgNet.length; i++) {
        for (let j = i + 1; j < bgNet.length; j++) {
            const a = bgNet[i], b = bgNet[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < maxD2) {
                bgCtx.strokeStyle = "rgba(255,255,255," + (1 - d2 / maxD2) * 0.45 + ")";
                bgCtx.beginPath();
                bgCtx.moveTo(a.x, a.y);
                bgCtx.lineTo(b.x, b.y);
                bgCtx.stroke();
            }
        }
    }

    bgCtx.fillStyle = "rgba(255,255,255,0.8)";
    for (const p of bgNet) {
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        bgCtx.fill();
    }
}

// krijesnice: točkice koje se laganim disanjem pojavljuju i nestaju dok drift-aju
function bgDrawFireflies(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    for (const f of bgFireflies) {
        f.x += f.vx;
        f.y += f.vy;
        if (f.x < 0) f.x = bgW; else if (f.x > bgW) f.x = 0;
        if (f.y < 0) f.y = bgH; else if (f.y > bgH) f.y = 0;

        const alpha = 0.15 + 0.55 * Math.abs(Math.sin(t * f.freq + f.phase));

        // meki sjaj
        bgCtx.fillStyle = "rgba(255, 245, 200, " + (alpha * 0.15) + ")";
        bgCtx.beginPath();
        bgCtx.arc(f.x, f.y, f.r * 3.5, 0, Math.PI * 2);
        bgCtx.fill();

        // jezgra
        bgCtx.fillStyle = "rgba(255, 250, 220, " + alpha + ")";
        bgCtx.beginPath();
        bgCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        bgCtx.fill();
    }
}

// zvjezdani warp: zvijezde promiču iz sredine prema rubovima
function bgDrawWarp() {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    const cx = bgW / 2, cy = bgH / 2;
    const focal = bgW * 0.6;
    const speed = bgW * 0.005;
    bgCtx.strokeStyle = "#fff";
    bgCtx.lineCap = "round";

    for (const s of bgStars) {
        const pz = s.z;
        s.z -= speed;
        if (s.z <= 1) {
            s.x = (Math.random() - 0.5) * bgW;
            s.y = (Math.random() - 0.5) * bgH;
            s.z = bgW;
            continue;
        }
        const sx = cx + (s.x / s.z) * focal;
        const sy = cy + (s.y / s.z) * focal;
        const px = cx + (s.x / pz) * focal;
        const py = cy + (s.y / pz) * focal;

        const k = 1 - s.z / bgW;        // 0 daleko, 1 blizu
        bgCtx.lineWidth = Math.max(0.5, k * 2.2);
        bgCtx.globalAlpha = Math.min(1, k + 0.2);
        bgCtx.beginPath();
        bgCtx.moveTo(px, py);
        bgCtx.lineTo(sx, sy);
        bgCtx.stroke();
    }
    bgCtx.globalAlpha = 1;
}

// valovi (ripples): koncentrični krugovi šire se iz nasumičnih točaka i nestaju
function bgDrawRipples(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    // povremeno stvori novi val
    if (Math.random() < 0.03) {
        bgRipples.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            birth: t,
            maxR: 80 + Math.random() * 140,
            life: 2.5 + Math.random() * 1.5
        });
    }

    bgCtx.lineWidth = 1.4;
    for (let i = bgRipples.length - 1; i >= 0; i--) {
        const r = bgRipples[i];
        const age = t - r.birth;
        if (age > r.life) { bgRipples.splice(i, 1); continue; }
        const p = age / r.life;                    // 0..1
        const radius = r.maxR * p;
        const alpha = (1 - p) * 0.55;
        bgCtx.strokeStyle = "rgba(255, 255, 255, " + alpha + ")";
        bgCtx.beginPath();
        bgCtx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        bgCtx.stroke();
    }
}

// topografska karta planine: zbroj gausovskih brda + konturne linije (marching squares)
const TOPO_LEVELS = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 175, 200];
function bgDrawTopo(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    // pomakni brda i odbij od rubova
    for (const p of bgTopoPeaks) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -p.width || p.x > bgW + p.width) p.vx *= -1;
        if (p.y < -p.width || p.y > bgH + p.width) p.vy *= -1;
    }

    // predizračunaj elevaciju u točkama grida
    const step = 14;
    const cols = Math.ceil(bgW / step);
    const rows = Math.ceil(bgH / step);
    const gridW = cols + 1;
    const gridH = rows + 1;
    const elev = new Float32Array(gridW * gridH);
    for (let j = 0; j < gridH; j++) {
        const py = j * step;
        for (let i = 0; i < gridW; i++) {
            const px = i * step;
            let e = 0;
            for (const m of bgTopoPeaks) {
                const dx = px - m.x;
                const dy = py - m.y;
                const w2 = m.width * m.width;
                e += m.amp * Math.exp(-(dx * dx + dy * dy) / (2 * w2));
            }
            elev[j * gridW + i] = e;
        }
    }

    // konturne linije za nekoliko nivoa (marching squares)
    bgCtx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    bgCtx.lineWidth = 1;
    for (const L of TOPO_LEVELS) {
        bgCtx.beginPath();
        for (let j = 0; j < rows; j++) {
            const j0 = j * gridW;
            const j1 = (j + 1) * gridW;
            const y0 = j * step;
            const y1 = y0 + step;
            for (let i = 0; i < cols; i++) {
                const e00 = elev[j0 + i];
                const e10 = elev[j0 + i + 1];
                const e01 = elev[j1 + i];
                const e11 = elev[j1 + i + 1];
                let idx = 0;
                if (e00 > L) idx |= 1;
                if (e10 > L) idx |= 2;
                if (e11 > L) idx |= 4;
                if (e01 > L) idx |= 8;
                if (idx === 0 || idx === 15) continue;

                const x0 = i * step;
                const x1 = x0 + step;
                const tx = x0 + step * (L - e00) / (e10 - e00);
                const ry = y0 + step * (L - e10) / (e11 - e10);
                const bx = x0 + step * (L - e01) / (e11 - e01);
                const ly = y0 + step * (L - e00) / (e01 - e00);

                switch (idx) {
                    case 1: case 14:
                        bgCtx.moveTo(tx, y0); bgCtx.lineTo(x0, ly); break;
                    case 2: case 13:
                        bgCtx.moveTo(tx, y0); bgCtx.lineTo(x1, ry); break;
                    case 3: case 12:
                        bgCtx.moveTo(x0, ly); bgCtx.lineTo(x1, ry); break;
                    case 4: case 11:
                        bgCtx.moveTo(x1, ry); bgCtx.lineTo(bx, y1); break;
                    case 5:
                        bgCtx.moveTo(tx, y0); bgCtx.lineTo(x0, ly);
                        bgCtx.moveTo(x1, ry); bgCtx.lineTo(bx, y1); break;
                    case 6: case 9:
                        bgCtx.moveTo(tx, y0); bgCtx.lineTo(bx, y1); break;
                    case 7: case 8:
                        bgCtx.moveTo(x0, ly); bgCtx.lineTo(bx, y1); break;
                    case 10:
                        bgCtx.moveTo(tx, y0); bgCtx.lineTo(x1, ry);
                        bgCtx.moveTo(x0, ly); bgCtx.lineTo(bx, y1); break;
                }
            }
        }
        bgCtx.stroke();
    }
}

// matrix code: bijeli znakovi se penju odozdo prema gore s tragom koji nestaje
function bgDrawMatrix() {
    // tamni preljev brže briše trag
    bgCtx.fillStyle = "rgba(0, 0, 0, 0.2)";
    bgCtx.fillRect(0, 0, bgW, bgH);

    bgCtx.font = MATRIX_FONT_SIZE + "px monospace";
    bgCtx.textBaseline = "top";

    for (let i = 0; i < bgMatrixCols.length; i++) {
        const col = bgMatrixCols[i];
        const x = i * MATRIX_COL_STEP;

        // srednji znak tik ispod glave -> postaje dio traga koji ostaje iza (dolje)
        const ch1 = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        bgCtx.fillStyle = "rgba(200, 200, 200, 0.75)";
        bgCtx.fillText(ch1, x, col.y + MATRIX_FONT_SIZE);

        // svijetla "glava" - najsvjetliji bijeli znak (na vrhu strujice)
        const ch2 = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        bgCtx.fillStyle = "rgba(255, 255, 255, 1)";
        bgCtx.fillText(ch2, x, col.y);

        col.y -= col.speed;   // penje se prema gore
        if (col.y < -MATRIX_FONT_SIZE && Math.random() < 0.025) {
            col.y = bgH;      // vrati na dno da se opet penje
            col.speed = 1 + Math.random() * 2;
        }
    }
}

function bgLoop() {
    if (bgCtx) {
        const t = (Date.now() - bgStart) / 1000;
        if (bgMode === "dots") bgDrawDots();
        else if (bgMode === "water") bgDrawWater(t);
        else if (bgMode === "constellation") bgDrawConstellation();
        else if (bgMode === "warp") bgDrawWarp();
        else if (bgMode === "fireflies") bgDrawFireflies(t);
        else if (bgMode === "ripples") bgDrawRipples(t);
        else if (bgMode === "topo") bgDrawTopo(t);
        else if (bgMode === "matrix") bgDrawMatrix();
        else bgCtx.clearRect(0, 0, bgW, bgH);
    }
    requestAnimationFrame(bgLoop);
}

function updateBgButtons() {
    document.querySelectorAll(".bg-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.bg === bgMode);
    });
}

function setBackground(mode, save) {
    if (BG_MODES.indexOf(mode) === -1) mode = "dots";
    bgMode = mode;
    if (bgCtx) {
        bgCtx.clearRect(0, 0, bgW, bgH);
        bgInit(mode);
    }
    // crna podloga za sve animacije, standardna tamna samo za "Tamno"
    document.body.style.background = (mode === "none") ? "#111827" : "#000";
    if (save) { try { localStorage.setItem("blockade_bg", mode); } catch (e) {} }
    updateBgButtons();
}

function loadBackground() {
    let m = "dots";
    try { m = localStorage.getItem("blockade_bg") || "dots"; } catch (e) {}
    setBackground(m, false);
}

// Prebaci pozadinu na sljedeću u ciklusu (koristi se pri prelasku na novi nivo).
// Ne sprema u localStorage - korisnikova postavka ostaje netaknuta.
function cycleBackground() {
    const idx = BG_CYCLE.indexOf(bgMode);
    const next = BG_CYCLE[(idx + 1 + BG_CYCLE.length) % BG_CYCLE.length];
    setBackground(next, false);
}

if (bgCanvas) {
    bgResize();
    window.addEventListener("resize", () => { bgResize(); bgInit(bgMode); });
    loadBackground();
    bgLoop();
}
