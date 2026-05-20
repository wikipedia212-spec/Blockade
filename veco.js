// ===== KONSTANTE =====
const COLORS = [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#f97316",
    "#06b6d4",
    "#ec4899",
    "#84cc16",
    "#ffffff"
];

const WHITE = "#ffffff";

// Definicije 4 moći (trokutići)
const POWERS = {
    white:  { color: "#e5e7eb", symbol: "⬜" },
    add:    { color: "#22c55e", symbol: "+"  },
    remove: { color: "#ef4444", symbol: "–"  },
    fill:   { color: "#3b82f6", symbol: "★"  }
};
const POWER_KEYS = Object.keys(POWERS);

// Šansa da umjesto boje dođe trokutić
const POWER_CHANCE = 0.3;

// ===== STANJE =====
let incomingItem = null;   // { kind:"color", color } | { kind:"power", power }
let selected = null;       // ono što držimo "u ruci"
let score = 0;
let gameOver = false;

let storage = [null, null, null, null, null];

const bigSquares = [];

// ===== DOM =====
const incomingDiv = document.getElementById("incoming");
const heldDiv = document.getElementById("held");
const storageDiv = document.getElementById("storage");
const boardDiv = document.getElementById("board");
const scoreDiv = document.getElementById("score");
const overlay = document.getElementById("overlay");
const finalScoreSpan = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");

// ===== GENERIRANJE NOVOG PREDMETA =====
function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
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
            cells[i].style.background = square.cells[i] ? square.cells[i] : "#374151";
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

// boja se može staviti samo na prazno polje i samo ako se slaže s postojećom bojom
function placeColor(square, cellIndex, color) {

    if (square.cells[cellIndex]) return;

    const existing = square.cells.filter(c => c !== null);
    if (existing.length > 0 && existing[0] !== color) return;

    square.cells[cellIndex] = color;

    consume();
    checkCompleted(square);

    renderBoard();
    renderStorage();
}

// ===== MOĆI =====
function applyPower(square, cellIndex, power) {

    if (power === "white") {
        // oboji to polje u bijelo
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
        // dodaj boju koja fali u jedno prazno polje
        const existing = square.cells.filter(c => c !== null);
        if (existing.length === 0) return;

        const target = existing[0];
        const emptyIndex = square.cells.findIndex(c => c === null);
        if (emptyIndex === -1) return;

        square.cells[emptyIndex] = target;
        consume();
        checkCompleted(square);
    }

    else if (power === "fill") {
        // napuni sva prazna polja bojom kvadrata
        const existing = square.cells.filter(c => c !== null);
        if (existing.length === 0) return;

        const target = existing[0];
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

    const first = square.cells[0];
    const same = square.cells.every(c => c === first);

    if (same) {
        score += 4;
        scoreDiv.textContent = score;

        setTimeout(() => {
            square.cells = [null, null, null, null];
            renderBoard();
        }, 200);
    }
}

// ===== MOŽE LI SE PREDMET IGDJE ODIGRATI =====
function canPlaceColor(square, color) {
    const hasEmpty = square.cells.some(c => c === null);
    if (!hasEmpty) return false;
    const existing = square.cells.filter(c => c !== null);
    return existing.length === 0 || existing[0] === color;
}

function canApplyPower(square, power) {
    const hasEmpty = square.cells.some(c => c === null);
    const hasColor = square.cells.some(c => c !== null);

    if (power === "white")  return true;               // boja se može preko bilo kojeg polja
    if (power === "remove") return hasColor;            // treba obojano polje
    if (power === "add")    return hasColor && hasEmpty;
    if (power === "fill")   return hasColor && hasEmpty;
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
    storage = [null, null, null, null, null];
    bigSquares.forEach(sq => sq.cells = [null, null, null, null]);
    gameOver = false;
    overlay.classList.remove("show");

    renderBoard();
    renderStorage();
    renderHeld();
    generateNext();
}

restartBtn.onclick = restart;

// ===== START =====
createBoard();
renderStorage();
renderHeld();
generateNext();
