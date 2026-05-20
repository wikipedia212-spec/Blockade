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

// Koliko pravih boja je aktivno na 1. nivou (svaki nivo +1)
const START_COLORS = 9;

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

// Definicije 4 moći (trokutići)
const POWERS = {
    white:  { color: "#e5e7eb", symbol: "⬜" },
    add:    { color: "#22c55e", symbol: "+"  },
    remove: { color: "#ef4444", symbol: "–"  },
    fill:   { color: "#3b82f6", symbol: "★"  }
};
const POWER_KEYS = Object.keys(POWERS);

// Šansa da umjesto boje dođe trokutić
const POWER_CHANCE = 0.15;

// ===== STANJE =====
let incomingItem = null;   // { kind:"color", color } | { kind:"power", power }
let selected = null;       // ono što držimo "u ruci"
let score = 0;
let gameOver = false;

let level = 1;
let completedThisLevel = 0;
let activeColors = [];     // prave boje aktivne na ovom nivou + bijeli džoker

let storage = [null, null, null, null, null];

const bigSquares = [];

// ===== DOM =====
const incomingDiv = document.getElementById("incoming");
const heldDiv = document.getElementById("held");
const storageDiv = document.getElementById("storage");
const boardDiv = document.getElementById("board");
const scoreDiv = document.getElementById("score");
const levelSpan = document.getElementById("level");
const progressSpan = document.getElementById("progress");
const targetSpan = document.getElementById("target");
const overlay = document.getElementById("overlay");
const finalScoreSpan = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");

// ===== NIVOI =====
// Nivo 1 traži 10 popunjenih kvadratića, svaki sljedeći +1.
function targetForLevel(lvl) {
    return 9 + lvl;
}

// Aktivne boje za trenutni nivo = prvih (START_COLORS + nivo-1) pravih boja + džoker.
function rebuildActiveColors() {
    const count = Math.min(START_COLORS + (level - 1), ALL_COLORS.length);
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

    if (Math.random() < POWER_CHANCE) {
        const power = POWER_KEYS[Math.floor(Math.random() * POWER_KEYS.length)];
        incomingItem = { kind: "power", power: power };
    } else {
        incomingItem = { kind: "color", color: randomColor() };
    }

    renderIncoming();
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

// ===== RENDERIRANJE =====
function renderIncoming() {

    incomingDiv.innerHTML = "";

    if (!incomingItem) return;

    const el = makeVisual(incomingItem, 70);

    el.onclick = () => {
        if (gameOver) return;
        // uzmemo samo ako ruka prazna (da ne izgubimo ono što već držimo)
        if (selected) return;

        selected = incomingItem;
        generateNext();
        renderHeld();
        checkGameOver();
    };

    incomingDiv.appendChild(el);
}

function renderHeld() {

    heldDiv.innerHTML = "";

    if (!selected) return;

    heldDiv.appendChild(makeVisual(selected, 50));
}

function renderStorage() {

    storageDiv.innerHTML = "";

    storage.forEach((item, index) => {

        const slot = document.createElement("div");
        slot.className = "slot";

        if (item) {
            slot.appendChild(makeVisual(item, 38));
        }

        slot.onclick = () => {
            if (gameOver) return;
            const slotItem = storage[index];

            if (selected && !slotItem) {
                // odloži u prazno
                storage[index] = selected;
                selected = null;
            } else if (selected && slotItem) {
                // zamijeni ono u ruci s onim u spremištu
                storage[index] = selected;
                selected = slotItem;
            } else if (!selected && slotItem) {
                // uzmi iz spremišta
                selected = slotItem;
                storage[index] = null;
            }

            renderStorage();
            renderHeld();
            checkGameOver();
        };

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
            cell.onclick = () => applyToCell(square, j);
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
            cells[i].innerHTML = (c === WHITE) ? jokerSvg() : "";
        }
    });
}

// ===== KLIK NA POLJE =====
function applyToCell(square, cellIndex) {

    if (gameOver) return;
    if (!selected) return;

    if (selected.kind === "color") {
        placeColor(square, cellIndex, selected.color);
    } else {
        applyPower(square, cellIndex, selected.power);
    }
}

function consume() {
    selected = null;
    renderHeld();
}

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

// boja se može staviti samo na prazno polje i samo ako paše (ili je bijeli džoker)
function placeColor(square, cellIndex, color) {

    if (square.cells[cellIndex]) return;
    if (!colorFitsSquare(square, color)) return;

    square.cells[cellIndex] = color;

    consume();
    checkCompleted(square);

    renderBoard();
    renderStorage();
}

// ===== MOĆI =====
function applyPower(square, cellIndex, power) {

    if (power === "white") {
        // pretvori već popunjeno polje u bijeli džoker
        if (!square.cells[cellIndex]) return;
        square.cells[cellIndex] = WHITE;
        consume();
        checkCompleted(square);
    }

    else if (power === "remove") {
        // ukloni boju iz tog polja
        if (!square.cells[cellIndex]) return;
        square.cells[cellIndex] = null;
        consume();
    }

    else if (power === "add") {
        // dodaj pravu boju kvadratića u jedno prazno polje
        const target = squareRealColor(square);
        if (target === null) return;

        const emptyIndex = square.cells.findIndex(c => c === null);
        if (emptyIndex === -1) return;

        square.cells[emptyIndex] = target;
        consume();
        checkCompleted(square);
    }

    else if (power === "fill") {
        // napuni sva prazna polja pravom bojom kvadratića
        const target = squareRealColor(square);
        if (target === null) return;

        for (let i = 0; i < 4; i++) {
            if (square.cells[i] === null) square.cells[i] = target;
        }
        consume();
        checkCompleted(square);
    }

    renderBoard();
    renderStorage();
}

// ===== PROVJERA POPUNJENOSTI =====
function checkCompleted(square) {

    const full = square.cells.every(c => c !== null);
    if (!full) return;

    // popunjen je ako su sva polja ista prava boja ili bijeli džoker
    const real = squareRealColor(square);
    const same = square.cells.every(c => c === WHITE || c === real);

    if (same) {
        score += 4;
        scoreDiv.textContent = score;

        completedThisLevel++;
        if (completedThisLevel >= targetForLevel(level)) {
            level++;
            completedThisLevel = 0;
            rebuildActiveColors();
        }
        updateHud();

        setTimeout(() => {
            square.cells = [null, null, null, null];
            renderBoard();
        }, 200);
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
    if (item.kind === "color") {
        return bigSquares.some(sq => canPlaceColor(sq, item.color));
    }
    return bigSquares.some(sq => canApplyPower(sq, item.power));
}

// ===== GAME OVER =====
// Zaglavljen si tek kad su ruka I svih 5 mjesta puni, a ništa se ne može odigrati.
function checkGameOver() {
    if (gameOver) return;

    const storageFull = storage.every(s => s !== null);
    const handOccupied = selected !== null;
    if (!handOccupied || !storageFull) return;

    const buffer = [selected, ...storage];
    if (buffer.some(canPlaceItem)) return;

    gameOver = true;
    showGameOver();
}

function showGameOver() {
    finalScoreSpan.textContent = score;
    overlay.classList.add("show");
}

function restart() {
    selected = null;
    score = 0;
    scoreDiv.textContent = "0";
    level = 1;
    completedThisLevel = 0;
    rebuildActiveColors();
    storage = [null, null, null, null, null];
    bigSquares.forEach(sq => sq.cells = [null, null, null, null]);
    gameOver = false;
    overlay.classList.remove("show");

    updateHud();
    renderBoard();
    renderStorage();
    renderHeld();
    generateNext();
}

restartBtn.onclick = restart;

// ===== START =====
rebuildActiveColors();
updateHud();
createBoard();
renderStorage();
renderHeld();
generateNext();
