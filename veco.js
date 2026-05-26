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
let cellTheme = "patterns";   // uzorak na kvadratićima: "plain" | "patterns"
let showNumbers = true;       // prikaz brojeva na bojama (pomoć za daltoniste)
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

// obris šesterokuta (samo rub, prozirna ispuna) kao pozadinska sličica
function hexOutlineBg(stroke) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
        "<polygon points='50,2 98,26 98,74 50,98 2,74 2,26' fill='none' stroke='" + stroke + "' stroke-width='3' stroke-linejoin='round'/></svg>";
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
            outline.style.backgroundImage = hexOutlineBg("#94a3b8");
            bigDiv.appendChild(outline);
        }

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
        const fs = hex ? 13 : 22;
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

// Boje iz popunjenog polja "odlete" u spremnik (points: [{x, y, color}])
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
        score += square.cells.length + bonus;   // 1 bod po polju (4 klasično, 6 hex)
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

        // zapamti polazne točke (centar polja) i boje, pa ih "pošalji" u spremnik
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

        // boje su odletjele -> polje se odmah oslobađa
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

// ===== GAME MOD (oblik polja) =====
function setGameMode(mode, save) {
    if (mode !== "classic" && mode !== "hex") mode = "classic";
    gameMode = mode;
    boardDiv.classList.toggle("hex", mode === "hex");
    createBoard();   // ponovo izgradi ploču (4 ili 6 polja po kvadratu)
    if (save) {
        try { localStorage.setItem("blockade_mode", mode); } catch (e) {}
    }
    updateModeButtons();
}

// samo postavi mod (bez ponovne izgradnje) — ploču gradi START nakon ovoga
function loadGameMode() {
    let m = "classic";
    try { m = localStorage.getItem("blockade_mode") || "classic"; } catch (e) {}
    gameMode = (m === "hex") ? "hex" : "classic";
    boardDiv.classList.toggle("hex", gameMode === "hex");
    updateModeButtons();
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
    bigSquares.forEach(sq => sq.cells = new Array(sq.cells.length).fill(null));
    dragSource = null;
    gameOver = false;

    updateHud();
    renderBoard();
    renderStorage();
    generateNext();
    closeToGame();
}

// ===== POVEZIVANJE GUMBA =====
let settingsReturn = screenMain;   // ekran na koji se vraća iz Postavki

menuBtn.onclick = () => { if (!gameOver) openScreen(screenPause); };

document.getElementById("btnStart").onclick = startGame;
document.getElementById("btnSettings").onclick = () => { settingsReturn = screenMain; openScreen(screenSettings); };
document.getElementById("btnHighscore").onclick = () => { updateHighscoreScreen(); openScreen(screenHighscore); };

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

document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.onclick = () => setGameMode(btn.dataset.mode, true);
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
loadGameMode();
createBoard();
renderBoard();
renderStorage();
updateHud();
openScreen(screenMain);

// ===== POZADINSKA ANIMACIJA (više vrsta: točkice / voda / tamno) =====
const bgCanvas = document.getElementById("bg");
const bgCtx = (bgCanvas && bgCanvas.getContext) ? bgCanvas.getContext("2d") : null;
let bgMode = "dots";          // dots | water | constellation | aurora | warp | grid | none
let bgW = 0, bgH = 0;
let bgDots = [];
let bgNet = [];               // konstelacije
let bgStars = [];             // zvjezdani warp
const BG_TRAIL = 45;
const bgStart = Date.now();
const BG_MODES = ["dots", "water", "constellation", "aurora", "warp", "grid", "none"];

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

function bgInit(mode) {
    if (mode === "dots") bgMakeDots();
    else if (mode === "constellation") bgMakeNet();
    else if (mode === "warp") bgMakeStars();
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

// aurora / plazma: meki obojeni valovi (radijalni sjaj) na crnom
function bgDrawAurora(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    const colors = ["34,197,94", "59,130,246", "168,85,247", "6,182,212"];
    bgCtx.globalCompositeOperation = "lighter";
    for (let i = 0; i < colors.length; i++) {
        const cx = bgW * (0.5 + 0.35 * Math.sin(t * 0.15 + i * 1.7));
        const cy = bgH * (0.5 + 0.30 * Math.cos(t * 0.12 + i * 2.1));
        const rad = Math.min(bgW, bgH) * (0.45 + 0.1 * Math.sin(t * 0.2 + i));
        const g = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, "rgba(" + colors[i] + ",0.40)");
        g.addColorStop(1, "rgba(" + colors[i] + ",0)");
        bgCtx.fillStyle = g;
        bgCtx.fillRect(0, 0, bgW, bgH);
    }
    bgCtx.globalCompositeOperation = "source-over";
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

// neonska mreža (synthwave): perspektivna rešetka koja klizi
function bgDrawGrid(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    const horizon = bgH * 0.45;
    const cx = bgW / 2;

    // okomite linije (konvergiraju u horizont)
    bgCtx.strokeStyle = "rgba(236,72,153,0.6)";
    bgCtx.lineWidth = 1.5;
    const cols = 16;
    for (let i = -cols; i <= cols; i++) {
        bgCtx.beginPath();
        bgCtx.moveTo(cx, horizon);
        bgCtx.lineTo(cx + (i / cols) * bgW, bgH);
        bgCtx.stroke();
    }

    // vodoravne linije koje klize prema gledatelju
    bgCtx.strokeStyle = "rgba(34,211,238,0.6)";
    const rows = 16;
    const off = (t * 0.25) % 1;
    for (let i = 0; i < rows; i++) {
        const f = (i + off) / rows;
        const y = horizon + (bgH - horizon) * f * f;
        bgCtx.beginPath();
        bgCtx.moveTo(0, y);
        bgCtx.lineTo(bgW, y);
        bgCtx.stroke();
    }
}

function bgLoop() {
    if (bgCtx) {
        const t = (Date.now() - bgStart) / 1000;
        if (bgMode === "dots") bgDrawDots();
        else if (bgMode === "water") bgDrawWater(t);
        else if (bgMode === "constellation") bgDrawConstellation();
        else if (bgMode === "aurora") bgDrawAurora(t);
        else if (bgMode === "warp") bgDrawWarp();
        else if (bgMode === "grid") bgDrawGrid(t);
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

if (bgCanvas) {
    bgResize();
    window.addEventListener("resize", () => { bgResize(); bgInit(bgMode); });
    loadBackground();
    bgLoop();
}
