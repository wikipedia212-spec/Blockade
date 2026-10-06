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

// Dual-boja: kockica s dvije boje na sebi, paše u kvadratić koji traži JEDNU od te dvije.
// Predstavljena kao string "dual:#boja1:#boja2" da ostane obična vrijednost polja/predmeta.
function makeDualColor(c1, c2) { return "dual:" + c1 + ":" + c2; }
function isDualColor(c) { return typeof c === "string" && c.slice(0, 5) === "dual:"; }
function dualParts(c) { return c.slice(5).split(":"); }

// Parovi boja koji se otključavaju jedan po jedan svakim nivoom (susjedne boje u ALL_COLORS)
const DUAL_PAIRS = [];
for (let i = 0; i < ALL_COLORS.length - 1; i++) {
    DUAL_PAIRS.push([ALL_COLORS[i], ALL_COLORS[i + 1]]);
}
let activeDualColors = [];   // dual parovi otključani do trenutnog nivoa

// Postavke težine: koliko je boja aktivno na 1. nivou + šansa za moći/dual-boje
const DIFFICULTIES = {
    easy:   { startColors: 6,  powerChance: 0.05,  dualChance: 0.03,  label: "Easy" },
    normal: { startColors: 9,  powerChance: 0.035, dualChance: 0.02,  label: "Normal" },
    hard:   { startColors: 12, powerChance: 0.02,  dualChance: 0.012, label: "Hard" }
};
let difficulty = "normal";
let startColors = DIFFICULTIES.normal.startColors;
let powerChance = DIFFICULTIES.normal.powerChance;
let dualChance = DIFFICULTIES.normal.dualChance;
let cellTheme = "patterns";   // uzorak na kvadratićima: "plain" | "patterns"
let showNumbers = true;       // prikaz brojeva na bojama (pomoć za daltoniste)
let musicOn = true;           // sviranje pozadinske glazbe
let gameMode = "classic";     // oblik polja: "classic" (kvadrati) | "time" (blitz)
// deklarirano ovdje (rano) jer updateBgButtons() može biti pozvan iz setPremiumUnlocked()
// još tijekom početnog učitavanja, prije nego skripta dođe do sekcije pozadinske animacije
let bgMode = "dots";          // dots | water | constellation | warp | fireflies | ripples | topo | matrix | aurora | nebula | underwater | city | none

// Oznake za džokera (kozmetika: koji skin je aktivan)
let cosmeticJoker = "crown";   // "crown" | "star" | "diamond" | "bolt" | "christmas" | "halloween" | "valentine" | "easter"

// Plaćeni skinovi imaju vlastitu animaciju (CSS klasa "anim-*" na joker-mark SVG-u); besplatna kruna je statična.
const JOKER_SKINS = {
    // kruna, okrenuta naopačke (rotacija 180°) - originalni, besplatni skin
    crown: '<svg class="joker-mark" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<g transform="rotate(180 50 50)" fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">' +
            '<path d="M16 72 L11 22 L33 56 L50 10 L67 56 L89 22 L84 72 Q50 82 16 72 Z"/>' +
            '<circle cx="11" cy="16" r="5"/>' +
            '<circle cx="50" cy="4" r="5"/>' +
            '<circle cx="89" cy="16" r="5"/>' +
        '</g>' +
    '</svg>',
    star: '<svg class="joker-mark anim-twinkle" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M50,5 L60.6,35.4 L92.8,36.1 L67.1,55.6 L76.5,86.4 L50,68 L23.5,86.4 L32.9,55.6 L7.2,36.1 L39.4,35.4 Z" ' +
        'fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>',
    diamond: '<svg class="joker-mark anim-shimmer" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M50,5 L90,50 L50,95 L10,50 Z" ' +
        'fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>',
    bolt: '<svg class="joker-mark anim-flicker" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M58,5 L22,58 L46,58 L38,95 L82,38 L54,38 Z" ' +
        'fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>',
    // božićno drvce (ostaje fiksno) + snijeg koji pada preko njega
    christmas: '<svg class="joker-mark anim-sway" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M50,8 L68,35 L58,35 L74,58 L62,58 L80,85 L20,85 L38,58 L26,58 L42,35 L32,35 Z M42,85 L58,85 L58,95 L42,95 Z" ' +
        'fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<g class="joker-snow">' +
            '<circle class="snowdot" cx="8" cy="0" r="3" style="animation-delay:0s"/>' +
            '<circle class="snowdot" cx="30" cy="0" r="2.2" style="animation-delay:0.7s"/>' +
            '<circle class="snowdot" cx="52" cy="0" r="3" style="animation-delay:1.4s"/>' +
            '<circle class="snowdot" cx="74" cy="0" r="2.4" style="animation-delay:2.1s"/>' +
            '<circle class="snowdot" cx="92" cy="0" r="2.8" style="animation-delay:2.8s"/>' +
        '</g>' +
    '</svg>',
    // duh koji se pojavljuje i nestaje, s ljutim očima
    halloween: '<svg class="joker-mark anim-ghostly" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M50,8 C72,8 88,26 88,50 L88,85 L76,72 L64,85 L50,72 L36,85 L24,72 L12,85 L12,50 C12,26 28,8 50,8 Z" ' +
        'fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="M26,38 L42,46 M74,38 L58,46" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M36,64 Q50,56 64,64" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>' +
    '</svg>',
    // srce (Valentinovo)
    valentine: '<svg class="joker-mark anim-heartbeat" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M50,88 C20,62 5,42 5,26 C5,11 18,3 30,3 C40,3 48,9 50,19 C52,9 60,3 70,3 C82,3 95,11 95,26 C95,42 80,62 50,88 Z" ' +
        'fill="none" stroke="#1f2937" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>',
    // jaje iz kojeg periodički izlazi pilić
    easter: '<svg class="joker-mark" viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">' +
        '<g class="joker-chick">' +
            '<circle cx="50" cy="35" r="13" fill="#fde047" stroke="#1f2937" stroke-width="4"/>' +
            '<path d="M36,34 L26,37 L36,40 Z" fill="#f97316"/>' +
            '<circle cx="45" cy="30" r="2" fill="#1f2937"/>' +
            '<circle cx="57" cy="30" r="2" fill="#1f2937"/>' +
        '</g>' +
        '<path d="M50,15 C68,15 82,45 82,65 C82,85 68,95 50,95 C32,95 18,85 18,65 C18,45 32,15 50,15 Z" ' +
        'fill="#fff" stroke="#1f2937" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M30,19 L38,27 L30,33 L40,41" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>'
};

function jokerSvg() {
    return JOKER_SKINS[cosmeticJoker] || JOKER_SKINS.crown;
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
let leaderboard = [];      // [{name, score, level, difficulty, mode}] - endless (Classic)
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
const hsListDiv = document.getElementById("hsList");
const allScreens = [screenMain, screenSettings, screenHighscore, screenPause, screenLegend, overlay];

// ===== NIVOI =====
// Nivo 1 traži 10 popunjenih kvadratića, svaki sljedeći +1.
function targetForLevel(lvl) {
    return 9 + lvl;
}

// Aktivne boje za trenutni nivo = prvih (startColors + nivo-1) pravih boja + džoker.
function rebuildActiveColors() {
    const count = Math.min(startColors + (level - 1), ALL_COLORS.length);
    activeColors = ALL_COLORS.slice(0, count).concat([WHITE]);

    // jedna nova dual-boja otključa se svakim nivoom (od 2. nivoa nadalje)
    const dualCount = Math.min(Math.max(level - 1, 0), DUAL_PAIRS.length);
    activeDualColors = DUAL_PAIRS.slice(0, dualCount);
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

    if (tutorialMode) {
        tutorialStep++;
        showTutorialStep();
        return;
    }

    if (Math.random() < powerChance) {
        const power = POWER_KEYS[Math.floor(Math.random() * POWER_KEYS.length)];
        incomingItem = { kind: "power", power: power };
    } else if (activeDualColors.length > 0 && Math.random() < dualChance) {
        const pair = activeDualColors[Math.floor(Math.random() * activeDualColors.length)];
        incomingItem = { kind: "color", color: makeDualColor(pair[0], pair[1]) };
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

function dualNumberLabel(color, size) {
    const parts = dualParts(color);
    const span = document.createElement("span");
    span.className = "color-num dual-num";
    span.textContent = colorNumber(parts[0]) + "/" + colorNumber(parts[1]);
    span.style.fontSize = (size * 0.3) + "px";
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

// Svaki uzorak vraća SAMO unutarnji SVG markup (bez omota) da se može ponovno
// iskoristiti i za dual-boje (dvije polovice, svaka sa svojim uzorkom).
const PATTERNS = [
    // cvijet / četverolist
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><circle cx='13' cy='6' r='5'/><circle cx='13' cy='20' r='5'/><circle cx='6' cy='13' r='5'/><circle cx='20' cy='13' r='5'/></g>",
    // koncentrični krugovi
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><circle cx='13' cy='13' r='3.5'/><circle cx='13' cy='13' r='8.5'/></g>",
    // valoviti potezi
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M1 8 C 7 1, 12 15, 18 8 S 25 1, 30 8'/><path d='M1 19 C 7 12, 12 26, 18 19 S 25 12, 30 19'/></g>",
    // vrtuljak (latice)
    (s) => "<g fill='" + s + "'><path d='M13 13 Q 12 3 19 4 Q 14 7 13 13'/><path d='M13 13 Q 23 12 22 19 Q 19 14 13 13'/><path d='M13 13 Q 14 23 7 22 Q 12 19 13 13'/><path d='M13 13 Q 3 14 4 7 Q 7 12 13 13'/></g>",
    // zvijezda
    (s) => "<path d='M13 2 L15.5 10.5 L24 13 L15.5 15.5 L13 24 L10.5 15.5 L2 13 L10.5 10.5 Z' fill='" + s + "'/>",
    // latica / oko
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M13 4 C 21 8, 21 18, 13 22 C 5 18, 5 8, 13 4 Z'/><circle cx='13' cy='13' r='1.6' fill='" + s + "'/></g>",
    // riblje ljuske (lukovi)
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='1.8'><path d='M0 0 A 13 13 0 0 1 26 0'/><path d='M0 26 A 13 13 0 0 1 26 26'/><path d='M-13 13 A 13 13 0 0 1 13 13'/><path d='M13 13 A 13 13 0 0 1 39 13'/></g>",
    // spirala
    (s) => "<path d='M13 13 Q 13 8 18 8 Q 23 8 23 14 Q 23 22 14 22 Q 4 22 4 11' fill='none' stroke='" + s + "' stroke-width='2'/>",
    // isprepletene petlje (beskonačno)
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><circle cx='8' cy='13' r='5'/><circle cx='18' cy='13' r='5'/></g>",
    // kapljica / vrtlog
    (s) => "<path d='M13 3 C 13 3 21 11 21 16 A 8 8 0 0 1 5 16 C 5 11 13 3 13 3 Z' fill='none' stroke='" + s + "' stroke-width='2'/>",
    // mreža lukova (val)
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M0 20 Q 6.5 8 13 20 T 26 20'/><path d='M0 9 Q 6.5 -3 13 9 T 26 9'/></g>",
    // trolist
    (s) => "<g fill='" + s + "'><circle cx='13' cy='7' r='4'/><circle cx='8' cy='17' r='4'/><circle cx='18' cy='17' r='4'/></g>",
    // romb sa zrakama
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M13 3 L23 13 L13 23 L3 13 Z'/><path d='M13 8 L18 13 L13 18 L8 13 Z'/></g>",
    // polukrugovi
    (s) => "<g fill='none' stroke='" + s + "' stroke-width='2'><path d='M4 4 A 9 9 0 0 1 22 4'/><path d='M4 22 A 9 9 0 0 0 22 22'/></g>"
];

// Alternativni "kozmetički" paketi uzoraka (zaseban izgled, ignoriraju nijansu boje - fiksan stil).
// Svaki paket ima više motiva (kao i klasični) da ne bude samo jedan ponavljajući uzorak.
const PATTERN_THEMES = {
    classic: PATTERNS,
    neon: [
        (s) => "<g fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'><circle cx='13' cy='13' r='9'/><circle cx='13' cy='13' r='4.5'/></g>",
        (s) => "<path d='M13 2 L16 10 L24 13 L16 16 L13 24 L10 16 L2 13 L10 10 Z' fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'/>",
        (s) => "<g fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'><path d='M2 13 L24 13'/><path d='M13 2 L13 24'/></g>",
        (s) => "<path d='M13 3 L23 22 L3 22 Z' fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'/>",
        (s) => "<polygon points='13,2 22,7.5 22,18.5 13,24 4,18.5 4,7.5' fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'/>",
        (s) => "<path d='M4 4 L13 13 L7 13 L22 22' fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'/>",
        (s) => "<rect x='7' y='7' width='12' height='12' transform='rotate(45 13 13)' fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'/>",
        (s) => "<path d='M13 13 Q13 8 18 8 Q23 8 23 14 Q23 22 14 22 Q4 22 4 11' fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'/>",
        (s) => "<path d='M1 13 Q7 6 13 13 T25 13' fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'/>",
        (s) => "<g fill='none' stroke='#fff' stroke-width='1.3' opacity='0.85'><circle cx='13' cy='13' r='8'/><circle cx='13' cy='13' r='1.5' fill='#fff'/></g>"
    ],
    galaxy: [
        (s) => "<g fill='#fff' opacity='0.85'><circle cx='6' cy='6' r='1.3'/><circle cx='19' cy='9' r='0.9'/><circle cx='11' cy='16' r='1.6'/><circle cx='21' cy='21' r='1'/><circle cx='4' cy='20' r='0.9'/><circle cx='16' cy='3' r='0.8'/></g>",
        (s) => "<path d='M17 4 A9 9 0 1 0 17 22 A7 7 0 1 1 17 4 Z' fill='#fff' opacity='0.8'/>",
        (s) => "<g fill='none' stroke='#fff' opacity='0.8' stroke-width='1.2'><circle cx='13' cy='13' r='5' fill='#fff'/><ellipse cx='13' cy='13' rx='11' ry='3'/></g>",
        (s) => "<g fill='#fff' opacity='0.8' stroke='#fff' stroke-width='1.3' stroke-linecap='round'><path d='M4 4 L14 14' fill='none'/><circle cx='16' cy='16' r='2' stroke='none'/></g>",
        (s) => "<g stroke='#fff' stroke-width='0.8' opacity='0.7' fill='#fff'><circle cx='5' cy='6' r='1.2'/><circle cx='15' cy='4' r='1.2'/><circle cx='21' cy='14' r='1.2'/><circle cx='10' cy='20' r='1.2'/><path d='M5 6 L15 4 L21 14 L10 20 Z' fill='none'/></g>",
        (s) => "<path d='M13 1 L15 11 L25 13 L15 15 L13 25 L11 15 L1 13 L11 11 Z' fill='#fff' opacity='0.75'/>",
        (s) => "<g fill='#fff' opacity='0.8'><circle cx='3' cy='13' r='1'/><circle cx='9' cy='5' r='0.8'/><circle cx='17' cy='9' r='1.3'/><circle cx='23' cy='19' r='0.9'/><circle cx='13' cy='23' r='1'/></g>",
        (s) => "<path d='M13 13 Q17 9 21 13 Q23 17 18 19 Q11 21 8 15 Q6 9 13 6' fill='none' stroke='#fff' stroke-width='1.2' opacity='0.7'/>"
    ],
    wood: [
        (s) => "<g fill='none' stroke='#78350f' stroke-width='1.5' opacity='0.5'><path d='M0 6 Q13 2 26 6'/><path d='M0 14 Q13 10 26 14'/><path d='M0 22 Q13 18 26 22'/></g>",
        (s) => "<g fill='none' stroke='#78350f' stroke-width='1.3' opacity='0.5'><ellipse cx='13' cy='13' rx='4' ry='3'/><ellipse cx='13' cy='13' rx='7' ry='5'/></g>",
        (s) => "<g fill='none' stroke='#78350f' stroke-width='1.3' opacity='0.5'><path d='M-2 4 Q13 10 28 4'/><path d='M-2 14 Q13 20 28 14'/><path d='M-2 24 Q13 30 28 24'/></g>",
        (s) => "<g fill='none' stroke='#78350f' stroke-width='1.3' opacity='0.5'><path d='M6 0 Q2 13 6 26'/><path d='M14 0 Q10 13 14 26'/><path d='M22 0 Q18 13 22 26'/></g>",
        (s) => "<g fill='none' stroke='#78350f' stroke-width='1' opacity='0.4'><path d='M0 8 L26 8 M0 18 L26 18 M8 0 L8 26 M18 0 L18 26'/></g>",
        (s) => "<g fill='none' stroke='#78350f' stroke-width='1.2' opacity='0.5'><path d='M0 4 Q13 1 26 4'/><path d='M0 9 Q13 6 26 9'/><path d='M0 14 Q13 11 26 14'/><path d='M0 19 Q13 16 26 19'/><path d='M0 24 Q13 21 26 24'/></g>",
        (s) => "<g fill='none' stroke='#78350f' stroke-width='1.3' opacity='0.5'><path d='M0 6 Q13 3 26 6'/><path d='M0 20 Q13 17 26 20'/><ellipse cx='13' cy='13' rx='4' ry='3'/></g>"
    ],
    pixel: [
        (s) => "<g fill='#fff' opacity='0.45'><rect x='2' y='2' width='6' height='6'/><rect x='16' y='2' width='6' height='6'/><rect x='9' y='9' width='6' height='6'/><rect x='2' y='16' width='6' height='6'/><rect x='16' y='16' width='6' height='6'/></g>",
        (s) => "<g fill='#fff' opacity='0.45'><rect x='0' y='0' width='6' height='6'/><rect x='20' y='0' width='6' height='6'/><rect x='0' y='20' width='6' height='6'/><rect x='20' y='20' width='6' height='6'/></g>",
        (s) => "<g fill='#fff' opacity='0.45'><rect x='10' y='3' width='6' height='6'/><rect x='10' y='17' width='6' height='6'/><rect x='3' y='10' width='6' height='6'/><rect x='17' y='10' width='6' height='6'/></g>",
        (s) => "<rect x='8' y='8' width='10' height='10' fill='#fff' opacity='0.4'/>",
        (s) => "<g fill='#fff' opacity='0.45'><rect x='2' y='18' width='6' height='6'/><rect x='8' y='12' width='6' height='6'/><rect x='14' y='6' width='6' height='6'/><rect x='20' y='0' width='6' height='6'/></g>",
        (s) => "<g fill='#fff' opacity='0.45'><rect x='6' y='6' width='4' height='4'/><rect x='16' y='6' width='4' height='4'/><rect x='2' y='10' width='4' height='4'/><rect x='10' y='10' width='4' height='4'/><rect x='20' y='10' width='4' height='4'/><rect x='6' y='14' width='4' height='4'/><rect x='16' y='14' width='4' height='4'/><rect x='10' y='18' width='4' height='4'/></g>",
        (s) => "<g fill='#fff' opacity='0.4'><rect x='2' y='2' width='3' height='3'/><rect x='14' y='4' width='3' height='3'/><rect x='21' y='12' width='3' height='3'/><rect x='6' y='16' width='3' height='3'/><rect x='17' y='20' width='3' height='3'/></g>"
    ],
    // praznični paketi (plaćeni)
    christmas: [
        (s) => "<g stroke='#fff' stroke-width='1.3' opacity='0.8' fill='none'><path d='M13 2 L13 24 M2 13 L24 13 M5 5 L21 21 M21 5 L5 21'/></g>",
        (s) => "<g stroke='#dc2626' stroke-width='3' opacity='0.5'><path d='M0 6 L6 0 M6 16 L16 6 M16 26 L26 16'/></g>",
        (s) => "<g fill='none' stroke='#16a34a' stroke-width='1.5' opacity='0.6'><path d='M13 4 C18 8 18 14 13 18 C8 14 8 8 13 4 Z'/><circle cx='13' cy='21' r='2.2' fill='#dc2626' stroke='none'/></g>",
        (s) => "<path d='M13 4 C9 4 7 9 7 14 L5 19 L21 19 L19 14 C19 9 17 4 13 4 Z M10 20 Q13 24 16 20' fill='none' stroke='#eab308' stroke-width='1.5' opacity='0.6'/>",
        (s) => "<g fill='none' stroke='#dc2626' stroke-width='1.5' opacity='0.6'><rect x='5' y='10' width='16' height='12'/><path d='M5 14 L21 14 M13 10 L13 22'/></g>",
        (s) => "<path d='M13 3 L15.5 10.5 L23 13 L15.5 15.5 L13 23 L10.5 15.5 L3 13 L10.5 10.5 Z' fill='#eab308' opacity='0.6'/>",
        (s) => "<path d='M9 2 L17 2 L17 14 Q22 14 22 19 Q22 24 16 24 Q10 24 10 18 L9 2 Z' fill='none' stroke='#dc2626' stroke-width='1.5' opacity='0.6'/>",
        (s) => "<g fill='none' stroke='#16a34a' stroke-width='1.5' opacity='0.6'><circle cx='13' cy='15' r='8'/><path d='M13 3 L13 7 M10 3 L16 3'/></g>"
    ],
    halloween: [
        (s) => "<g fill='#f97316' opacity='0.6'><path d='M13 10 C10 6 4 6 2 10 C6 11 9 13 10 16 C7 16 4 18 3 21 C7 21 10 19 13 16 C16 19 19 21 23 21 C22 18 19 16 16 16 C17 13 20 11 24 10 C22 6 16 6 13 10 Z'/></g>",
        (s) => "<g opacity='0.55'><ellipse cx='13' cy='15' rx='10' ry='8' fill='#f97316'/><path d='M8 13 L11 16 L8 16 Z M18 13 L15 16 L18 16 Z M9 20 Q13 23 17 20' fill='none' stroke='#1f2937' stroke-width='1.3'/></g>",
        (s) => "<g fill='none' stroke='#1f2937' stroke-width='1.3' opacity='0.6'><circle cx='13' cy='13' r='3' fill='#1f2937'/><path d='M13 10 L8 4 M13 10 L18 4 M13 16 L8 22 M13 16 L18 22 M10 13 L3 9 M10 13 L3 17 M16 13 L23 9 M16 13 L23 17'/></g>",
        (s) => "<g fill='none' stroke='#9ca3af' stroke-width='0.8' opacity='0.5'><path d='M13 2 L13 24 M2 13 L24 13 M5 5 L21 21 M21 5 L5 21'/><circle cx='13' cy='13' r='4'/><circle cx='13' cy='13' r='8'/></g>",
        (s) => "<path d='M7 24 L7 12 Q7 5 13 5 Q19 5 19 12 L19 24 Z M10 11 L16 11 M13 8 L13 14' fill='none' stroke='#9ca3af' stroke-width='1.5' opacity='0.5'/>",
        (s) => "<path d='M13 3 L20 14 L6 14 Z M6 14 L20 14 L17 19 L9 19 Z M9 19 L17 19 L14 24 L12 24 Z' fill='#f97316' opacity='0.5'/>",
        (s) => "<path d='M19 5 A7 7 0 1 0 19 19 A5.5 5.5 0 1 1 19 5 Z' fill='#9ca3af' opacity='0.5'/>",
        (s) => "<path d='M6 22 L6 14 Q6 9 13 9 Q20 9 20 14 L20 22 L17 19 L15 22 L13 19 L11 22 L9 19 Z M6 14 L3 10 L8 11 Z M20 14 L23 10 L18 11 Z' fill='#1f2937' opacity='0.55'/>"
    ],
    valentine: [
        (s) => "<g fill='#fff' opacity='0.55'><path d='M8 7 C6 5 3 6 3 9 C3 12 8 15 8 15 C8 15 13 12 13 9 C13 6 10 5 8 7 Z'/><path d='M20 16 C18 14 15 15 15 18 C15 20 20 23 20 23 C20 23 25 20 25 18 C25 15 22 14 20 16 Z'/></g>",
        (s) => "<g fill='none' stroke='#ec4899' stroke-width='1.5' opacity='0.6'><path d='M2 24 L22 4 M22 4 L15 4 M22 4 L22 11'/><circle cx='5' cy='21' r='2.5'/></g>",
        (s) => "<g fill='none' stroke='#ec4899' stroke-width='1.3' opacity='0.6'><path d='M13 6 C9 6 8 10 11 11 C7 12 7 17 13 17 C19 17 19 12 15 11 C18 10 17 6 13 6 Z'/><path d='M13 17 L13 24 M13 20 L9 22 M13 20 L17 22'/></g>",
        (s) => "<g fill='none' stroke='#ec4899' stroke-width='1.3' opacity='0.6'><rect x='4' y='8' width='18' height='13'/><path d='M4 8 L13 16 L22 8'/></g>",
        (s) => "<path d='M13 13 C9 9 3 10 3 14 C3 18 9 17 13 13 C17 17 23 18 23 14 C23 10 17 9 13 13 Z' fill='none' stroke='#ec4899' stroke-width='1.3' opacity='0.6'/>",
        (s) => "<g fill='#ec4899' opacity='0.5'><path d='M9 8 C7 6 3 7 3 10 C3 13 9 16 9 16 C9 16 15 13 15 10 C15 7 11 6 9 8 Z'/><path d='M19 14 C17 12 13 13 13 16 C13 19 19 22 19 22 C19 22 25 19 25 16 C25 13 21 12 19 14 Z'/></g>",
        (s) => "<path d='M13 10 C9 8 5 10 5 13 C5 15 8 15 10 14 C8 16 6 18 7 20 C9 18 11 17 13 18 C15 17 17 18 19 20 C20 18 18 16 16 14 C18 15 21 15 21 13 C21 10 17 8 13 10 Z' fill='#ec4899' opacity='0.55'/>"
    ],
    easter: [
        (s) => "<g fill='#fff' opacity='0.5'><ellipse cx='7' cy='8' rx='3' ry='4'/><ellipse cx='20' cy='18' rx='2.5' ry='3.5'/><ellipse cx='17' cy='6' rx='2' ry='2.8'/></g>",
        (s) => "<g fill='none' stroke='#fff' stroke-width='1.5' opacity='0.6'><ellipse cx='9' cy='8' rx='3' ry='8' transform='rotate(-15 9 8)'/><ellipse cx='17' cy='8' rx='3' ry='8' transform='rotate(15 17 8)'/></g>",
        (s) => "<g fill='#fff' opacity='0.5'><circle cx='13' cy='8' r='3'/><circle cx='19' cy='13' r='3'/><circle cx='13' cy='18' r='3'/><circle cx='7' cy='13' r='3'/><circle cx='13' cy='13' r='2.5' fill='#fde047'/></g>",
        (s) => "<g fill='#fde047' opacity='0.6'><circle cx='13' cy='13' r='6'/><path d='M8 12 L3 13 L8 15 Z' fill='#f97316'/></g>",
        (s) => "<g fill='none' stroke='#92400e' stroke-width='1.3' opacity='0.5'><path d='M4 12 L22 12 L19 22 L7 22 Z'/><path d='M8 12 Q13 4 18 12'/></g>",
        (s) => "<g fill='none' stroke='#f97316' stroke-width='1.3' opacity='0.5'><path d='M13 10 L9 24 L17 24 Z'/><path d='M13 10 L13 4 M10 8 L8 3 M16 8 L18 3'/></g>",
        (s) => "<g fill='#fff' opacity='0.55'><path d='M13 13 C10 6 2 6 3 12 C4 17 10 15 13 13 Z'/><path d='M13 13 C16 6 24 6 23 12 C22 17 16 15 13 13 Z'/><path d='M13 13 L13 22'/></g>",
        (s) => "<g fill='none' stroke='#fff' stroke-width='1.5' opacity='0.6'><ellipse cx='13' cy='14' rx='8' ry='10'/><path d='M9 8 L13 13 L10 16 L14 20'/></g>"
    ]
};

// Koji paketi se smatraju "plaćenim" - pretpostavljeno zaključani dok se ne klikne Unlock
const PREMIUM_PATTERNS = ["neon", "galaxy", "wood", "pixel", "christmas", "halloween", "valentine", "easter"];
const PREMIUM_JOKERS = ["star", "diamond", "bolt", "christmas", "halloween", "valentine", "easter"];
let cosmeticPattern = "classic";   // kozmetika: koji paket uzoraka se koristi

function patternForColor(color) {
    const arr = PATTERN_THEMES[cosmeticPattern] || PATTERNS;
    const idx = ALL_COLORS.indexOf(color);
    return arr[(idx >= 0 ? idx : 0) % arr.length];
}

// nijansa uzorka: tamnija na svijetlim bojama, svjetlija na tamnima
function patternShade(color) {
    return isLightColor(color) ? shade(color, -0.16) : shade(color, 0.22);
}

// Pozadina dual-boje: dijagonalno podijeljena (kao boja1/boja2), svaka polovica
// ispunjena SVG <pattern>-om s uzorkom i nijansom TE boje, spojeno u jednu sliku.
function dualPatternBg(colorA, colorB) {
    const innerA = patternForColor(colorA)(patternShade(colorA));
    const innerB = patternForColor(colorB)(patternShade(colorB));

    const svg =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
        "<defs>" +
        "<pattern id='pA' patternUnits='objectBoundingBox' width='0.26' height='0.26' viewBox='0 0 26 26'>" +
        "<rect width='26' height='26' fill='" + colorA + "'/>" + innerA + "</pattern>" +
        "<pattern id='pB' patternUnits='objectBoundingBox' width='0.26' height='0.26' viewBox='0 0 26 26'>" +
        "<rect width='26' height='26' fill='" + colorB + "'/>" + innerB + "</pattern>" +
        "<clipPath id='cTL'><polygon points='0,0 100,0 0,100'/></clipPath>" +
        "<clipPath id='cBR'><polygon points='100,0 100,100 0,100'/></clipPath>" +
        "</defs>" +
        "<rect width='100' height='100' fill='url(#pA)' clip-path='url(#cTL)'/>" +
        "<rect width='100' height='100' fill='url(#pB)' clip-path='url(#cBR)'/>" +
        "</svg>";

    return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
}

// Oboji element + uzorak specifičan za tu boju (u malo drugačijoj nijansi)
function applyCellPattern(el, color) {
    if (isDualColor(color)) {
        const parts = dualParts(color);
        el.style.backgroundColor = parts[0];
        el.style.backgroundPosition = "0 0";
        if (cellTheme === "plain") {
            el.style.backgroundSize = "";
            el.style.backgroundImage = "linear-gradient(135deg, " + parts[0] + " 0%, " + parts[0] + " 49%, " + parts[1] + " 51%, " + parts[1] + " 100%)";
        } else {
            el.style.backgroundSize = "100% 100%";
            el.style.backgroundImage = dualPatternBg(parts[0], parts[1]);
        }
        return;
    }

    el.style.backgroundColor = color;
    el.style.backgroundPosition = "0 0";

    if (cellTheme === "plain" || color === WHITE) {
        el.style.backgroundImage = "none";
        el.style.backgroundSize = "";
        return;
    }

    const inner = patternForColor(color)(patternShade(color));
    const out = tileBg(inner);
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
        } else if (isDualColor(item.color)) {
            if (showNumbers) {
                el.classList.add("has-num");
                el.appendChild(dualNumberLabel(item.color, size));
            }
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
function createBoard() {
    boardDiv.innerHTML = "";
    bigSquares.length = 0;

    for (let i = 0; i < 10; i++) {

        const square = { cells: new Array(4).fill(null) };
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

    if (c === WHITE) {
        cell.innerHTML = jokerSvg();
    } else if (isDualColor(c)) {
        if (showNumbers) {
            const parts = dualParts(c);
            cell.innerHTML =
                '<span class="color-num dual-num" style="font-size:18px">' +
                colorNumber(parts[0]) + "/" + colorNumber(parts[1]) + '</span>';
        } else {
            cell.innerHTML = "";
        }
    } else if (showNumbers) {
        const txt = isLightColor(c) ? "#111" : "#fff";
        const fs = 22;
        cell.innerHTML =
            '<span class="color-num" style="color:' + txt + ";font-size:" + fs + 'px">' +
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
// Prva konkretna boja ili dual-boja postavljena u kvadratić određuje što on prima:
// - konkretna boja  -> kvadratić prima SAMO tu boju (+ bijelu, + dual koji je sadrži)
// - dual-boja       -> kvadratić se "otvara" i prima OBJE njene boje (+ bijelu, + drugi dual koji dijeli jednu od njih)
// dok je kvadratić prazan (sve null/bijelo), skup nije određen -> prima bilo što.
function squareColorSet(square) {
    for (let i = 0; i < square.cells.length; i++) {
        const c = square.cells[i];
        if (c === null || c === WHITE) continue;
        if (isDualColor(c)) return dualParts(c);
        return [c];
    }
    return null;
}

// "Prava" boja za prikaz (bljesak, puls, moći) - prva boja iz dopuštenog skupa.
function squareRealColor(square) {
    const set = squareColorSet(square);
    return set ? set[0] : null;
}

// Odgovara li vrijednost polja dopuštenom skupu boja kvadratića (za provjeru dovršenosti)
function colorMatchesSet(c, set) {
    if (c === WHITE) return true;
    if (set === null) return true;   // ništa još nije određeno
    if (isDualColor(c)) return dualParts(c).some(p => set.indexOf(p) !== -1);
    return set.indexOf(c) !== -1;
}

// Može li se boja staviti u kvadratić prema trenutno dopuštenom skupu boja.
function colorFitsSquare(square, color) {
    if (color === WHITE) return true;
    const set = squareColorSet(square);
    if (set === null) return true;
    if (isDualColor(color)) return dualParts(color).some(p => set.indexOf(p) !== -1);
    return set.indexOf(color) !== -1;
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

// Boje iz popunjenog polja se prvo rastrknu (eksplozija), pa tek onda odlete u kutiju
function flyColorsToCollector(points) {
    const box = collectorBox.getBoundingClientRect();
    const targetX = box.left + box.width / 2;
    const targetY = box.top + box.height / 2;
    const scale = currentBoardScale();
    const SIZE = 30 * scale;

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

        // Faza 1: rastrkaj se (eksplozija) u nasumičnom smjeru
        const angle = Math.random() * Math.PI * 2;
        const dist = (22 + Math.random() * 28) * scale;
        const scatterX = Math.cos(angle) * dist;
        const scatterY = Math.sin(angle) * dist;
        const scatterRotate = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 60);

        const scatterAnim = tile.animate(
            [
                { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
                { transform: `translate(${scatterX}px, ${scatterY}px) scale(1.15) rotate(${scatterRotate}deg)`, opacity: 1 }
            ],
            { duration: 200, easing: "ease-out", delay: i * 40, fill: "forwards" }
        );

        scatterAnim.onfinish = () => {
            // Faza 2: iz rastrkane pozicije odleti u spremište
            const dx = targetX - (p.x + scatterX);
            const dy = targetY - (p.y + scatterY);

            const flyAnim = tile.animate(
                [
                    { transform: `translate(${scatterX}px, ${scatterY}px) scale(1.15) rotate(${scatterRotate}deg)`, opacity: 1 },
                    { transform: `translate(${scatterX + dx}px, ${scatterY + dy}px) scale(0.25) rotate(${scatterRotate + 720}deg)`, opacity: 0.5 }
                ],
                { duration: 550, easing: "cubic-bezier(0.5, 0, 0.75, 1)", fill: "forwards" }
            );

            flyAnim.onfinish = () => {
                tile.remove();
                pulse(collectorBox);
            };
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

// Animiraj outline velikog kvadrata u zadanoj boji: 3 pulsa (slabo, jače, najjače)
function flashSquare(square, color) {
    const el = square.element;
    if (!el) return;
    el.style.setProperty("--flash-color", color);
    el.classList.remove("completed-flash");
    void el.offsetWidth;   // reflow da se animacija restarta
    el.classList.add("completed-flash");
    setTimeout(() => el.classList.remove("completed-flash"), 600);
}

function hexToRgbString(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return "255,255,255";
    return parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16);
}

// Faktor kojim je kvadrat trenutno prikazan naspram svoje prirodne veličine (120px)
// (fullscreen na mobitelu skalira cijeli .game preko transform: scale, pa svi
// efekti u fiksnim pikselima moraju pratiti tu skalu da izgledaju isto na svakom ekranu)
function currentBoardScale() {
    const sample = document.querySelector(".big-square");
    if (!sample) return 1;
    const w = sample.getBoundingClientRect().width;
    if (!w) return 1;
    return Math.min(Math.max(w / 120, 0.35), 1.3);
}

// Puls u boji koji se širi IZVAN kvadrata, sve dalje kako combo raste - uvijek centriran na kvadrat koji ga je napravio
function spawnComboPulse(square, color, combo) {
    const el = square.element;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const n = combo || 1;
    const spread = Math.min(40 + (n - 1) * 35, 260) * currentBoardScale();

    const pulse = document.createElement("div");
    pulse.className = "combo-pulse";
    pulse.style.left = cx + "px";
    pulse.style.top = cy + "px";
    pulse.style.width = rect.width + "px";
    pulse.style.height = rect.height + "px";
    pulse.style.setProperty("--pulse-rgb", hexToRgbString(color));
    pulse.style.setProperty("--pulse-spread", spread + "px");
    document.body.appendChild(pulse);

    let removed = false;
    const done = () => { if (!removed) { removed = true; pulse.remove(); } };
    pulse.addEventListener("animationend", done);
    setTimeout(done, 800);
}

// Specijalni bljesak preko cijelog ekrana kad se polje popuni samim džokerima
const JOKER_BOOM_WORDS = ["BOOM", "BAM", "POW", "WHAM"];
function showJokerBonus() {
    const wrap = document.createElement("div");
    wrap.className = "joker-bonus";
    const text = document.createElement("div");
    text.className = "joker-text";
    const word = JOKER_BOOM_WORDS[Math.floor(Math.random() * JOKER_BOOM_WORDS.length)];
    text.textContent = word + "  +100";
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

    // tijekom tutoriala se ništa ne boduje niti zatvara - samo se isprobava mehanika
    if (tutorialMode) return;

    const full = square.cells.every(c => c !== null);
    if (!full) return;

    // popunjen je ako su sva polja ista prava boja ili bijeli džoker
    const colorSet = squareColorSet(square);
    const real = colorSet ? colorSet[0] : null;
    const same = square.cells.every(c => colorMatchesSet(c, colorSet));

    if (same) {
        // animiraj outline velikog kvadrata u boji koja je skupljena
        flashSquare(square, real || WHITE);

        // combo: bonus se udvostručuje (x2 +4, x3 +8, x4 +16, x5 +32, ...)
        completedThisDrop = true;
        combo++;

        // puls u boji koji se širi izvan kvadrata - sve veći kako combo raste, centriran na ovaj kvadrat
        spawnComboPulse(square, real || WHITE, combo);

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
        const points = [];
        for (let i = 0; i < square.cells.length; i++) {
            const cr = cells[i].getBoundingClientRect();
            points.push({ x: cr.left + cr.width / 2, y: cr.top + cr.height / 2, color: square.cells[i] });
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
            const modeLabel = e.mode === "classic" ? "Classic" : "";
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
    dualChance = DIFFICULTIES[d].dualChance;
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

// ===== KOZMETIKA (uzorak-tema, džoker skin, okvir kvadrata) =====
function setCosmeticPattern(p, save) {
    if (!PATTERN_THEMES[p]) p = "classic";
    if (PREMIUM_PATTERNS.indexOf(p) !== -1 && !premiumUnlocked) return;   // zaključano dok se ne otključa
    cosmeticPattern = p;
    if (save) {
        try { localStorage.setItem("blockade_cosmetic_pattern", p); } catch (e) {}
    }
    updateCosmeticButtons();
    renderBoard();
    renderStorage();
    renderIncoming();
}

function loadCosmeticPattern() {
    let p = "classic";
    try { p = localStorage.getItem("blockade_cosmetic_pattern") || "classic"; } catch (e) {}
    cosmeticPattern = PATTERN_THEMES[p] ? p : "classic";
}

function setCosmeticJoker(j, save) {
    if (!JOKER_SKINS[j]) j = "crown";
    if (PREMIUM_JOKERS.indexOf(j) !== -1 && !premiumUnlocked) return;   // zaključano dok se ne otključa
    cosmeticJoker = j;
    if (save) {
        try { localStorage.setItem("blockade_cosmetic_joker", j); } catch (e) {}
    }
    updateCosmeticButtons();
    renderBoard();
    renderStorage();
    renderIncoming();
}

function loadCosmeticJoker() {
    let j = "crown";
    try { j = localStorage.getItem("blockade_cosmetic_joker") || "crown"; } catch (e) {}
    cosmeticJoker = JOKER_SKINS[j] ? j : "crown";
}

const FRAME_SKINS = ["default", "gold", "neon", "wood", "rainbow", "christmas", "halloween", "valentine", "easter"];
const PREMIUM_FRAMES = ["gold", "neon", "wood", "rainbow", "christmas", "halloween", "valentine", "easter"];
let cosmeticFrame = "default";   // okvir velikog kvadrata

function applyCosmeticFrame() {
    FRAME_SKINS.forEach(f => boardDiv.classList.toggle("frame-" + f, f !== "default" && f === cosmeticFrame));
}

function setCosmeticFrame(f, save) {
    if (FRAME_SKINS.indexOf(f) === -1) f = "default";
    if (PREMIUM_FRAMES.indexOf(f) !== -1 && !premiumUnlocked) return;   // zaključano dok se ne otključa
    cosmeticFrame = f;
    applyCosmeticFrame();
    if (save) {
        try { localStorage.setItem("blockade_cosmetic_frame", f); } catch (e) {}
    }
    updateCosmeticButtons();
}

function loadCosmeticFrame() {
    let f = "default";
    try { f = localStorage.getItem("blockade_cosmetic_frame") || "default"; } catch (e) {}
    cosmeticFrame = FRAME_SKINS.indexOf(f) !== -1 ? f : "default";
    applyCosmeticFrame();
}

// ===== PREMIUM UNLOCK (demo - bez stvarne naplate, za probu kako bi izgledalo) =====
let premiumUnlocked = false;

function setPremiumUnlocked(on, save) {
    premiumUnlocked = !!on;
    document.body.classList.toggle("premium-unlocked", premiumUnlocked);
    if (save) {
        try { localStorage.setItem("blockade_premium", premiumUnlocked ? "1" : "0"); } catch (e) {}
    }
    updateCosmeticButtons();
    updateBgButtons();
}

function loadPremiumUnlocked() {
    let v = false;
    try { v = localStorage.getItem("blockade_premium") === "1"; } catch (e) {}
    setPremiumUnlocked(v, false);
}

function updateCosmeticButtons() {
    document.querySelectorAll(".cosmetic-btn").forEach(btn => {
        const isPremium = btn.classList.contains("premium");
        btn.classList.toggle("locked", isPremium && !premiumUnlocked);
        if (btn.dataset.pattern) btn.classList.toggle("active", btn.dataset.pattern === cosmeticPattern);
        if (btn.dataset.joker) btn.classList.toggle("active", btn.dataset.joker === cosmeticJoker);
        if (btn.dataset.frame) btn.classList.toggle("active", btn.dataset.frame === cosmeticFrame);
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
    if (mode !== "classic" && mode !== "time") mode = "classic";
    gameMode = mode;
    boardDiv.classList.toggle("time-race", mode === "time");
    if (raceHud) raceHud.hidden = !isTimeRace();
    createBoard();   // ponovo izgradi ploču
    if (save) {
        try { localStorage.setItem("blockade_mode", mode); } catch (e) {}
    }
    updateModeButtons();
}

// samo postavi mod (bez ponovne izgradnje) — ploču gradi START nakon ovoga
function loadGameMode() {
    let m = "classic";
    try { m = localStorage.getItem("blockade_mode") || "classic"; } catch (e) {}
    gameMode = (m === "time") ? m : "classic";
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
    // sakrij uputu tutoriala dok je otvoren neki drugi ekran (pauza i sl.) da ne "probije" kroz njega
    if (tutorialHud && screen) tutorialHud.hidden = true;
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
    // vrati uputu tutoriala ako je tutorial u tijeku
    if (tutorialHud && tutorialMode) tutorialHud.hidden = false;
    if (isTimeRace() && !gameOver) resumeRaceTimer();
}

// ===== INTERAKTIVNI TUTORIAL (igra se na pravoj ploči, skriptirane kockice) =====
let tutorialMode = false;
let tutorialStep = 0;

const tutorialHud = document.getElementById("tutorialHud");
const tutorialHudText = document.getElementById("tutorialHudText");
const btnTutHudSkip = document.getElementById("btnTutHudSkip");

// Svaki korak daje TOČNO određenu kockicu (ne nasumičnu) + uputu što s njom napraviti.
// Tutorial prelazi na sljedeći korak čim se ta kockica uspješno postavi (vidi generateNext).
const TUTORIAL_STEPS = [
    { item: () => ({ kind: "color", color: ALL_COLORS[2] }),
      text: "This is a normal color. Drag it anywhere onto the board — it drops into the first free field of a square." },
    { item: () => ({ kind: "color", color: ALL_COLORS[4] }),
      text: "A new color. A square only accepts ONE color until it clears — try dropping this one into a DIFFERENT, empty square." },
    { item: () => ({ kind: "color", color: WHITE }),
      text: "The white piece is a joker — it matches ANY color. Drag it into a square that already has a color in it." },
    { item: () => ({ kind: "color", color: makeDualColor(ALL_COLORS[0], ALL_COLORS[1]) }),
      text: "This piece has TWO colors on it. Drop it into an EMPTY square to unlock that square for BOTH of its colors, not just one." },
    { item: () => ({ kind: "power", power: "white" }),
      text: "The droplet power turns an already-placed field into a joker. Drag it onto a field that already has a color." },
    { item: () => ({ kind: "power", power: "add" }),
      text: "The + power adds the missing color into one empty field. Drag it onto a square that already has a color, but isn't full yet." },
    { item: () => ({ kind: "power", power: "remove" }),
      text: "The – power removes the color from a field. Drag it onto any filled field." },
    { item: () => ({ kind: "power", power: "fill" }),
      text: "The ★ power instantly fills ALL empty fields of a square with the same color. Drag it onto a square that already has a color, but isn't full yet." }
];

function showTutorialStep() {
    if (tutorialStep >= TUTORIAL_STEPS.length) {
        endTutorial();
        return;
    }
    incomingItem = TUTORIAL_STEPS[tutorialStep].item();
    renderIncoming();
    if (tutorialHudText) tutorialHudText.textContent = TUTORIAL_STEPS[tutorialStep].text;
    if (tutorialHud) tutorialHud.hidden = false;
}

// Kraj tutoriala (odrađen do kraja ILI preskočen) -> stvarna igra kreće ispočetka.
function endTutorial() {
    tutorialMode = false;
    if (tutorialHud) tutorialHud.hidden = true;
    startGame();
}

function startInteractiveTutorial() {
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

    tutorialMode = true;
    tutorialStep = 0;

    updateHud();
    renderBoard();
    renderStorage();
    if (typeof loadBackground === "function") loadBackground();
    stopRaceTimer();
    if (raceTimeSpan) raceTimeSpan.textContent = "00:00.0";

    closeToGame();
    showTutorialStep();
}

if (btnTutHudSkip) btnTutHudSkip.onclick = endTutorial;

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

document.getElementById("btnStart").onclick = startInteractiveTutorial;
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
    btn.onclick = () => {
        if (btn.classList.contains("locked")) return;   // zaključano - prvo Unlock
        setBackground(btn.dataset.bg, true);
    };
});

document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.onclick = () => setCellTheme(btn.dataset.theme, true);
});

document.querySelectorAll(".cosmetic-btn").forEach(btn => {
    btn.onclick = () => {
        if (btn.classList.contains("locked")) return;   // zaključano - prvo Unlock
        if (btn.dataset.pattern) setCosmeticPattern(btn.dataset.pattern, true);
        else if (btn.dataset.joker) setCosmeticJoker(btn.dataset.joker, true);
        else if (btn.dataset.frame) setCosmeticFrame(btn.dataset.frame, true);
    };
});

const btnUnlockPremium = document.getElementById("btnUnlockPremium");
if (btnUnlockPremium) {
    btnUnlockPremium.onclick = () => {
        // DEMO: ovdje bi išla stvarna Google Play Billing transakcija - trenutno samo otključa odmah za probu
        setPremiumUnlocked(true, true);
    };
}

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
        // na dodiru: pomakni malo dolje da gumbi za glazbu ne prekrivaju gornji red
        const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        const shiftX = 0;
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
document.getElementById("btnPauseRestart").onclick = startInteractiveTutorial;
document.getElementById("btnPauseMain").onclick = () => openScreen(screenMain);

restartBtn.onclick = startInteractiveTutorial;
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
loadPremiumUnlocked();
loadCosmeticPattern();
loadCosmeticJoker();
loadCosmeticFrame();
updateCosmeticButtons();
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
const BG_MODES = ["dots", "water", "constellation", "warp", "fireflies", "ripples", "topo", "matrix", "none", "aurora", "nebula", "underwater", "city"];
// redoslijed kroz koji pozadina rotira na svaki novi nivo (samo besplatne - plaćene se biraju ručno)
const BG_CYCLE = ["dots", "water", "constellation", "warp", "fireflies", "ripples", "topo", "matrix"];
// plaćene (ekskluzivne) pozadine - zaključane dok se ne klikne Unlock
const PREMIUM_BACKGROUNDS = ["aurora", "nebula", "underwater", "city"];

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
    else if (mode === "nebula") bgMakeNebula();
    else if (mode === "underwater") bgMakeUnderwater();
    else if (mode === "city") bgMakeCity();
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

// ===== EKSKLUZIVNE (plaćene) POZADINE =====

// aurora: valovite svjetlosne vrpce koje se preljevaju preko gornjeg dijela ekrana
function bgDrawAurora(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    const colors = ["34,197,94", "59,130,246", "168,85,247", "34,211,238"];
    for (let i = 0; i < 4; i++) {
        const baseY = bgH * (0.18 + i * 0.09);
        const amp = 50 + i * 22;
        const freq = 0.0014 + i * 0.0004;
        const phase = t * (0.15 + i * 0.05) + i * 2;
        const color = colors[i % colors.length];

        const grad = bgCtx.createLinearGradient(0, baseY - amp, 0, baseY + amp);
        grad.addColorStop(0, "rgba(" + color + ",0)");
        grad.addColorStop(0.5, "rgba(" + color + ",0.22)");
        grad.addColorStop(1, "rgba(" + color + ",0)");

        bgCtx.fillStyle = grad;
        bgCtx.beginPath();
        bgCtx.moveTo(0, baseY - amp);
        for (let x = 0; x <= bgW; x += 24) {
            const y = baseY + amp * Math.sin(x * freq + phase) * Math.sin(x * 0.0007 + t * 0.12);
            bgCtx.lineTo(x, y);
        }
        bgCtx.lineTo(bgW, baseY + amp);
        bgCtx.lineTo(bgW, baseY - amp * 2.4);
        bgCtx.lineTo(0, baseY - amp * 2.4);
        bgCtx.closePath();
        bgCtx.fill();
    }
}

// nebula/svemir: lebdeći obojeni oblaci (radijalni gradijenti) + zvijezde koje trepere
let bgNebulaClouds = [];
let bgNebulaStars = [];
function bgMakeNebula() {
    bgNebulaClouds = [];
    const cloudCount = 5;
    for (let i = 0; i < cloudCount; i++) {
        bgNebulaClouds.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            r: 120 + Math.random() * 180,
            hue: Math.random() * 360,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15
        });
    }
    const starCount = Math.max(60, Math.round((bgW * bgH) / 9000));
    bgNebulaStars = [];
    for (let i = 0; i < starCount; i++) {
        bgNebulaStars.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH,
            r: Math.random() * 1.4 + 0.4,
            phase: Math.random() * Math.PI * 2,
            freq: 0.5 + Math.random() * 1.5
        });
    }
}

function bgDrawNebula(t) {
    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, bgW, bgH);

    for (const c of bgNebulaClouds) {
        c.x += c.vx;
        c.y += c.vy;
        if (c.x < -c.r) c.x = bgW + c.r; else if (c.x > bgW + c.r) c.x = -c.r;
        if (c.y < -c.r) c.y = bgH + c.r; else if (c.y > bgH + c.r) c.y = -c.r;

        const grad = bgCtx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        grad.addColorStop(0, "hsla(" + c.hue + ",80%,60%,0.16)");
        grad.addColorStop(1, "hsla(" + c.hue + ",80%,60%,0)");
        bgCtx.fillStyle = grad;
        bgCtx.beginPath();
        bgCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        bgCtx.fill();
    }

    for (const s of bgNebulaStars) {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * s.freq + s.phase));
        bgCtx.fillStyle = "rgba(255,255,255," + alpha + ")";
        bgCtx.beginPath();
        bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgCtx.fill();
    }
}

// podvodni svijet: mjehurići koji lebde prema vrhu + svjetlosne zrake
let bgBubbles = [];
function bgMakeUnderwater() {
    const count = Math.max(25, Math.round((bgW * bgH) / 25000));
    bgBubbles = [];
    for (let i = 0; i < count; i++) {
        bgBubbles.push({
            x: Math.random() * bgW,
            y: Math.random() * bgH + bgH,
            r: 2 + Math.random() * 6,
            speed: 0.4 + Math.random() * 1.2,
            wob: Math.random() * Math.PI * 2
        });
    }
}

function bgDrawUnderwater(t) {
    bgCtx.fillStyle = "#001824";
    bgCtx.fillRect(0, 0, bgW, bgH);

    bgCtx.fillStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i < 5; i++) {
        const x = (i / 5) * bgW + Math.sin(t * 0.1 + i) * 40;
        bgCtx.beginPath();
        bgCtx.moveTo(x - 30, 0);
        bgCtx.lineTo(x + 30, 0);
        bgCtx.lineTo(x + 90, bgH);
        bgCtx.lineTo(x - 90, bgH);
        bgCtx.closePath();
        bgCtx.fill();
    }

    bgCtx.strokeStyle = "rgba(255,255,255,0.4)";
    for (const b of bgBubbles) {
        b.y -= b.speed;
        b.x += Math.sin(t + b.wob) * 0.3;
        if (b.y < -10) { b.y = bgH + 10; b.x = Math.random() * bgW; }
        bgCtx.beginPath();
        bgCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        bgCtx.stroke();
    }
}

// grad noću: mjesec + oblaci + dva sloja zgrada (daleke maglovite + bliske s prozorima) + bandere.
// Prozori se polako, nasumično pale/gase tijekom vremena (ne samo titraju jačinom).
let bgCityBuildings = [];
let bgCityFar = [];
let bgCityClouds = [];
let bgStreetLamps = [];
let bgMoon = { x: 0, y: 0 };

function bgMakeCity() {
    bgMoon = { x: bgW * 0.82, y: bgH * 0.16 };

    // oblaci koji sporo plove preko neba
    bgCityClouds = [];
    const cloudCount = 4;
    for (let i = 0; i < cloudCount; i++) {
        bgCityClouds.push({
            x: Math.random() * bgW,
            y: bgH * (0.08 + Math.random() * 0.22),
            scale: 0.7 + Math.random() * 1.1,
            vx: 0.04 + Math.random() * 0.08
        });
    }

    // daleki, maglovit sloj - manje, gušće zgrade u pozadini
    bgCityFar = [];
    let fx = 0;
    while (fx < bgW) {
        const fw = 18 + Math.random() * 32;
        const fh = 40 + Math.random() * (bgH * 0.32);
        bgCityFar.push({
            x: fx, w: fw, h: fh,
            litX: 0.2 + Math.random() * 0.6,
            litY: 0.2 + Math.random() * 0.6,
            seed: Math.random() * 10
        });
        fx += fw + 1;
    }

    // bliski, glavni sloj - veće zgrade s prozorima
    bgCityBuildings = [];
    let x = 0;
    while (x < bgW) {
        const w = 40 + Math.random() * 60;
        const h = 80 + Math.random() * (bgH * 0.5);
        const cols = Math.max(2, Math.floor(w / 14));
        const rows = Math.max(3, Math.floor(h / 18));
        const windows = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() < 0.6) {
                    windows.push({
                        r: r, c: c,
                        on: Math.random() < 0.7,
                        phase: Math.random() * Math.PI * 2,
                        nextToggle: 8 + Math.random() * 40
                    });
                }
            }
        }
        bgCityBuildings.push({ x: x, w: w, h: h, cols: cols, rows: rows, windows: windows });
        x += w + 2;
    }

    // bandere na ulici, jednako razmaknute
    bgStreetLamps = [];
    const lampSpacing = 140;
    for (let lx = lampSpacing / 2; lx < bgW; lx += lampSpacing) {
        bgStreetLamps.push({ x: lx, phase: Math.random() * Math.PI * 2 });
    }
}

function bgDrawCloudShape(x, y, scale) {
    bgCtx.beginPath();
    bgCtx.ellipse(x, y, 40 * scale, 14 * scale, 0, 0, Math.PI * 2);
    bgCtx.ellipse(x - 26 * scale, y + 4 * scale, 24 * scale, 11 * scale, 0, 0, Math.PI * 2);
    bgCtx.ellipse(x + 28 * scale, y + 3 * scale, 26 * scale, 12 * scale, 0, 0, Math.PI * 2);
    bgCtx.fill();
}

function bgDrawCity(t) {
    bgCtx.fillStyle = "#05070d";
    bgCtx.fillRect(0, 0, bgW, bgH);

    // mjesec + blagi sjaj
    const moonGlow = bgCtx.createRadialGradient(bgMoon.x, bgMoon.y, 0, bgMoon.x, bgMoon.y, 78);
    moonGlow.addColorStop(0, "rgba(250,250,230,0.22)");
    moonGlow.addColorStop(1, "rgba(250,250,230,0)");
    bgCtx.fillStyle = moonGlow;
    bgCtx.beginPath();
    bgCtx.arc(bgMoon.x, bgMoon.y, 78, 0, Math.PI * 2);
    bgCtx.fill();

    bgCtx.fillStyle = "#f5f3e7";
    bgCtx.beginPath();
    bgCtx.arc(bgMoon.x, bgMoon.y, 26, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.fillStyle = "rgba(200,200,180,0.35)";
    bgCtx.beginPath();
    bgCtx.arc(bgMoon.x - 8, bgMoon.y - 5, 5, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.beginPath();
    bgCtx.arc(bgMoon.x + 7, bgMoon.y + 8, 3.5, 0, Math.PI * 2);
    bgCtx.fill();

    // oblaci koji sporo plove preko neba
    bgCtx.fillStyle = "rgba(200,200,215,0.16)";
    for (const c of bgCityClouds) {
        c.x += c.vx;
        if (c.x > bgW + 90) c.x = -90;
        bgDrawCloudShape(c.x, c.y, c.scale);
    }

    // daleki sloj: maglovita, plavičasta silueta + tek pokoje udaljeno svjetlo koje rijetko trepne
    for (const b of bgCityFar) {
        const top = bgH - b.h;
        bgCtx.fillStyle = "rgba(30, 41, 59, 0.6)";
        bgCtx.fillRect(b.x, top, b.w, b.h);

        if (Math.floor(t * 0.5 + b.seed) % 6 === 0) {
            bgCtx.fillStyle = "rgba(251, 191, 36, 0.4)";
            bgCtx.fillRect(b.x + b.w * b.litX, top + b.h * b.litY, 2, 2);
        }
    }

    // bliski sloj: glavne zgrade, prozori se polako i nasumično pale/gase + blago titraju kad su upaljeni
    for (const b of bgCityBuildings) {
        const top = bgH - b.h;
        bgCtx.fillStyle = "#0f1420";
        bgCtx.fillRect(b.x, top, b.w, b.h);

        const cw = b.w / b.cols, ch = b.h / b.rows;
        for (const win of b.windows) {
            if (t > win.nextToggle) {
                win.on = !win.on;
                win.nextToggle = t + 8 + Math.random() * 40;
            }
            if (!win.on) continue;
            const twinkle = 0.85 + 0.15 * Math.sin(t * 2 + win.phase);
            bgCtx.fillStyle = "rgba(251,191,36," + (0.78 * twinkle) + ")";
            bgCtx.fillRect(b.x + win.c * cw + 2, top + win.r * ch + 2, cw - 4, ch - 4);
        }
    }

    // bandere - stup + ruka + žarulja sa sjajem, u prvom planu
    for (const lamp of bgStreetLamps) {
        const poleTop = bgH - 70;
        bgCtx.strokeStyle = "rgba(15,15,20,0.9)";
        bgCtx.lineWidth = 3;
        bgCtx.beginPath();
        bgCtx.moveTo(lamp.x, bgH);
        bgCtx.lineTo(lamp.x, poleTop);
        bgCtx.lineTo(lamp.x + 10, poleTop - 6);
        bgCtx.stroke();

        const lightX = lamp.x + 10, lightY = poleTop - 6;
        const glowPulse = 0.85 + 0.15 * Math.sin(t * 1.2 + lamp.phase);

        const lampGlow = bgCtx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 26);
        lampGlow.addColorStop(0, "rgba(251,191,36," + (0.35 * glowPulse) + ")");
        lampGlow.addColorStop(1, "rgba(251,191,36,0)");
        bgCtx.fillStyle = lampGlow;
        bgCtx.beginPath();
        bgCtx.arc(lightX, lightY, 26, 0, Math.PI * 2);
        bgCtx.fill();

        bgCtx.fillStyle = "rgba(251,191,36," + (0.9 * glowPulse) + ")";
        bgCtx.beginPath();
        bgCtx.arc(lightX, lightY, 3.5, 0, Math.PI * 2);
        bgCtx.fill();
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
        else if (bgMode === "aurora") bgDrawAurora(t);
        else if (bgMode === "nebula") bgDrawNebula(t);
        else if (bgMode === "underwater") bgDrawUnderwater(t);
        else if (bgMode === "city") bgDrawCity(t);
        else bgCtx.clearRect(0, 0, bgW, bgH);
    }
    requestAnimationFrame(bgLoop);
}

function updateBgButtons() {
    document.querySelectorAll(".bg-btn").forEach(b => {
        const isPremium = b.classList.contains("premium");
        b.classList.toggle("locked", isPremium && !premiumUnlocked);
        b.classList.toggle("active", b.dataset.bg === bgMode);
    });
}

function setBackground(mode, save) {
    if (BG_MODES.indexOf(mode) === -1) mode = "dots";
    if (PREMIUM_BACKGROUNDS.indexOf(mode) !== -1 && !premiumUnlocked) return;   // zaključano dok se ne otključa
    bgMode = mode;
    if (bgCtx) {
        bgCtx.clearRect(0, 0, bgW, bgH);
        bgInit(mode);
    }
    // crna podloga za sve pozadine (uključujući Plain), radi dosljednosti
    document.body.style.background = "#000";
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
