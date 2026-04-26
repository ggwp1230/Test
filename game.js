/* ===== Block Smash Puzzle — Yandex Games ===== */

// ── Localization ──
const LANG = {
    ru: {
        play: 'Играть',
        leaderboard: 'Таблица лидеров',
        score: 'Очки',
        best: 'Рекорд',
        gameOver: 'Игра окончена',
        restart: 'Заново',
        menu: 'Меню',
        back: 'Назад',
        newRecord: 'Новый рекорд!',
        loading: 'Загрузка...',
        controlsDesktop: 'Нажмите на фигуру, затем на поле, чтобы разместить её',
        controlsMobile: 'Перетащите фигуру на поле',
        noEntries: 'Пока нет записей',
        combo: 'Комбо',
        excellent: 'Отлично!',
        amazing: 'Великолепно!',
        authHint: 'Войдите, чтобы сохранить рекорд в таблице лидеров',
    },
    en: {
        play: 'Play',
        leaderboard: 'Leaderboard',
        score: 'Score',
        best: 'Best',
        gameOver: 'Game Over',
        restart: 'Restart',
        menu: 'Menu',
        back: 'Back',
        newRecord: 'New Record!',
        loading: 'Loading...',
        controlsDesktop: 'Click a shape, then click the grid to place it',
        controlsMobile: 'Drag a shape onto the grid',
        noEntries: 'No entries yet',
        combo: 'Combo',
        excellent: 'Excellent!',
        amazing: 'Amazing!',
        authHint: 'Sign in to save your score to the leaderboard',
    },
};

let currentLang = 'en';
function t(key) { return (LANG[currentLang] || LANG.en)[key] || LANG.en[key] || key; }

// ── Constants ──
const GRID_SIZE = 8;
const CELL_COLORS = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe',
    '#43e97b', '#fa709a', '#feb47b', '#7f5af0',
    '#2cb67d', '#e45858', '#ffc75f', '#00c9a7',
];

// ── Shape Definitions ──
const SHAPES = [
    // Singles & pairs
    [[1]],
    [[1,1]],
    [[1],[1]],
    [[1,1,1]],
    [[1],[1],[1]],
    // L-shapes
    [[1,0],[1,0],[1,1]],
    [[0,1],[0,1],[1,1]],
    [[1,1],[1,0],[1,0]],
    [[1,1],[0,1],[0,1]],
    [[1,0],[1,1]],
    [[0,1],[1,1]],
    [[1,1],[1,0]],
    [[1,1],[0,1]],
    // Squares
    [[1,1],[1,1]],
    // T-shapes
    [[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,1]],
    [[1,0],[1,1],[1,0]],
    [[0,1],[1,1],[0,1]],
    // Z-shapes
    [[1,1,0],[0,1,1]],
    [[0,1,1],[1,1,0]],
    // Longer
    [[1,1,1,1]],
    [[1],[1],[1],[1]],
    [[1,1,1],[1,0,0]],
    [[1,1,1],[0,0,1]],
    // 5-blocks
    [[1,1,1,1,1]],
    [[1],[1],[1],[1],[1]],
    // Big L
    [[1,0,0],[1,0,0],[1,1,1]],
    [[0,0,1],[0,0,1],[1,1,1]],
    [[1,1,1],[0,0,1],[0,0,1]],
    [[1,1,1],[1,0,0],[1,0,0]],
    // 3x3 square
    [[1,1,1],[1,1,1],[1,1,1]],
];

// ── Game State ──
let ysdk = null;
let player = null;
let grid = [];
let currentShapes = [];
let selectedShapeIndex = -1;
let score = 0;
let bestScore = 0;
let hoverCell = null;
let gameActive = false;
let isMobile = false;
let dragData = null;
let gamesPlayed = 0;

// ── DOM Elements ──
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const shapesPanel = document.getElementById('shapes-panel');
const comboPopup = document.getElementById('combo-popup');

// ── Screens ──
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ── SDK Init ──
async function initGame() {
    try {
        ysdk = await YaGames.init();
        // Detect language
        const sdkLang = ysdk.environment?.i18n?.lang || 'en';
        currentLang = (sdkLang === 'ru' || sdkLang === 'be' || sdkLang === 'kk' || sdkLang === 'uk' || sdkLang === 'uz') ? 'ru' : 'en';
    } catch (e) {
        console.warn('SDK init failed, running standalone:', e);
    }

    isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
               ('ontouchstart' in window);

    await loadProgress();
    applyLocalization();
    setupCanvas();
    setupEvents();

    // Signal that game is ready
    if (ysdk) {
        ysdk.features.LoadingAPI?.ready();
    }

    showScreen('menu-screen');
}

function applyLocalization() {
    document.getElementById('loading-text').textContent = t('loading');
    document.getElementById('play-btn').textContent = t('play');
    document.getElementById('leaderboard-btn').textContent = t('leaderboard');
    document.getElementById('score-label').textContent = t('score');
    document.getElementById('best-label').textContent = t('best');
    document.getElementById('menu-best-label').textContent = t('best');
    document.getElementById('gameover-title').textContent = t('gameOver');
    document.getElementById('final-score-label').textContent = t('score');
    document.getElementById('final-best-label').textContent = t('best');
    document.getElementById('restart-btn').textContent = t('restart');
    document.getElementById('menu-btn').textContent = t('menu');
    document.getElementById('lb-title').textContent = t('leaderboard');
    document.getElementById('lb-back-btn').textContent = t('back');
    document.getElementById('controls-hint').textContent = isMobile ? t('controlsMobile') : t('controlsDesktop');
    document.getElementById('new-record').textContent = t('newRecord');
    document.getElementById('menu-best-score').textContent = bestScore;
}

// ── Progress Save/Load ──
async function loadProgress() {
    try {
        if (ysdk) {
            player = await ysdk.getPlayer({ scopes: false });
            const data = await player.getData(['bestScore']);
            if (data.bestScore) bestScore = data.bestScore;
        }
    } catch (e) {
        console.warn('Load progress error:', e);
    }
    // Fallback to localStorage
    const local = localStorage.getItem('blockblast_best');
    if (local && parseInt(local) > bestScore) bestScore = parseInt(local);
}

async function saveProgress() {
    localStorage.setItem('blockblast_best', bestScore.toString());
    try {
        if (player && player.isAuthorized()) {
            await player.setData({ bestScore });
        }
    } catch (e) {
        console.warn('Save progress error:', e);
    }
}

// ── Canvas Setup ──
let cellSize, canvasSize, gridOffset;

function setupCanvas() {
    const container = document.getElementById('game-screen');
    const maxW = Math.min(window.innerWidth - 16, 400);
    const headerH = 60;
    const shapesH = 100;
    const availH = window.innerHeight - headerH - shapesH - 40;
    canvasSize = Math.min(maxW, availH);
    cellSize = Math.floor(canvasSize / GRID_SIZE);
    canvasSize = cellSize * GRID_SIZE;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    canvas.style.width = canvasSize + 'px';
    canvas.style.height = canvasSize + 'px';
    gridOffset = 0;
}

// ── Drawing ──
function drawGrid() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw cells
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const x = c * cellSize;
            const y = r * cellSize;

            if (grid[r][c]) {
                ctx.fillStyle = grid[r][c];
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(x + 1, y + 1, cellSize - 2, 3);
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(x + 1, y + cellSize - 4, cellSize - 2, 3);
            } else {
                // Empty cell
                const isAlt = (Math.floor(r / 2) + Math.floor(c / 2)) % 2 === 0;
                ctx.fillStyle = isAlt ? '#1a2345' : '#1e2a4a';
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            }
        }
    }

    // Draw hover preview
    if (hoverCell && selectedShapeIndex >= 0 && currentShapes[selectedShapeIndex]) {
        const shape = currentShapes[selectedShapeIndex];
        const canPlace = canPlaceShape(shape.pattern, hoverCell.r, hoverCell.c);
        for (let sr = 0; sr < shape.pattern.length; sr++) {
            for (let sc = 0; sc < shape.pattern[sr].length; sc++) {
                if (!shape.pattern[sr][sc]) continue;
                const gr = hoverCell.r + sr;
                const gc = hoverCell.c + sc;
                if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) continue;
                const x = gc * cellSize;
                const y = gr * cellSize;
                ctx.fillStyle = canPlace ? 'rgba(102, 126, 234, 0.4)' : 'rgba(231, 76, 60, 0.3)';
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            }
        }
    }
}

// ── Shape Panel ──
function renderShapes() {
    shapesPanel.innerHTML = '';
    currentShapes.forEach((shapeData, idx) => {
        const holder = document.createElement('div');
        holder.className = 'shape-holder' + (shapeData.used ? ' used' : '') + (idx === selectedShapeIndex ? ' selected' : '');
        holder.setAttribute('data-index', idx);

        const sc = document.createElement('canvas');
        const pattern = shapeData.pattern;
        const rows = pattern.length;
        const cols = Math.max(...pattern.map(r => r.length));
        const miniSize = Math.min(18, Math.floor(60 / Math.max(rows, cols)));
        sc.width = cols * miniSize;
        sc.height = rows * miniSize;
        const sctx = sc.getContext('2d');

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < pattern[r].length; c++) {
                if (!pattern[r][c]) continue;
                sctx.fillStyle = shapeData.color;
                sctx.fillRect(c * miniSize + 1, r * miniSize + 1, miniSize - 2, miniSize - 2);
                sctx.fillStyle = 'rgba(255,255,255,0.2)';
                sctx.fillRect(c * miniSize + 1, r * miniSize + 1, miniSize - 2, 2);
            }
        }

        holder.appendChild(sc);
        shapesPanel.appendChild(holder);
    });
}

// ── Game Logic ──
function initGrid() {
    grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        grid.push(new Array(GRID_SIZE).fill(null));
    }
}

function generateShapes() {
    currentShapes = [];
    // Difficulty: more complex shapes as score increases
    const maxIdx = Math.min(SHAPES.length, 15 + Math.floor(score / 500) * 3);
    for (let i = 0; i < 3; i++) {
        const idx = Math.floor(Math.random() * maxIdx);
        currentShapes.push({
            pattern: SHAPES[idx],
            color: CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)],
            used: false,
        });
    }
    selectedShapeIndex = -1;
    renderShapes();
}

function canPlaceShape(pattern, startR, startC) {
    for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < pattern[r].length; c++) {
            if (!pattern[r][c]) continue;
            const gr = startR + r;
            const gc = startC + c;
            if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
            if (grid[gr][gc]) return false;
        }
    }
    return true;
}

function placeShape(shape, startR, startC) {
    for (let r = 0; r < shape.pattern.length; r++) {
        for (let c = 0; c < shape.pattern[r].length; c++) {
            if (!shape.pattern[r][c]) continue;
            grid[startR + r][startC + c] = shape.color;
        }
    }
    // Count blocks placed
    let blocks = 0;
    for (let r = 0; r < shape.pattern.length; r++)
        for (let c = 0; c < shape.pattern[r].length; c++)
            if (shape.pattern[r][c]) blocks++;
    score += blocks;
}

function checkAndClearLines() {
    const rowsToClear = [];
    const colsToClear = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r].every(cell => cell !== null)) rowsToClear.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r++) {
            if (!grid[r][c]) { full = false; break; }
        }
        if (full) colsToClear.push(c);
    }

    const totalLines = rowsToClear.length + colsToClear.length;
    if (totalLines === 0) return 0;

    // Animate cleared cells with flash
    const cellsToClear = new Set();
    rowsToClear.forEach(r => {
        for (let c = 0; c < GRID_SIZE; c++) cellsToClear.add(`${r},${c}`);
    });
    colsToClear.forEach(c => {
        for (let r = 0; r < GRID_SIZE; r++) cellsToClear.add(`${r},${c}`);
    });

    // Flash animation
    flashCells(cellsToClear);

    // Clear
    cellsToClear.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = null;
    });

    // Score bonus
    const bonus = totalLines * GRID_SIZE * 10;
    const comboBonus = totalLines > 1 ? totalLines * 20 : 0;
    score += bonus + comboBonus;

    return totalLines;
}

function flashCells(cellsSet) {
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        cellsSet.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            const x = c * cellSize;
            const y = r * cellSize;
            ctx.fillStyle = flashCount % 2 === 0 ? '#fff' : grid[r][c];
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        });
        flashCount++;
        if (flashCount >= 4) clearInterval(flashInterval);
    }, 60);
}

function showCombo(lines) {
    let text;
    if (lines >= 4) text = t('amazing') + ' x' + lines;
    else if (lines >= 2) text = t('combo') + ' x' + lines;
    else text = t('excellent');

    comboPopup.textContent = text;
    comboPopup.classList.remove('show');
    void comboPopup.offsetWidth;
    comboPopup.classList.add('show');
    setTimeout(() => comboPopup.classList.remove('show'), 900);
}

function canAnyShapeBePlaced() {
    for (const shape of currentShapes) {
        if (shape.used) continue;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (canPlaceShape(shape.pattern, r, c)) return true;
            }
        }
    }
    return false;
}

function allShapesUsed() {
    return currentShapes.every(s => s.used);
}

function updateScoreDisplay() {
    document.getElementById('current-score').textContent = score;
    document.getElementById('best-score').textContent = bestScore;
}

// ── Game Flow ──
function startGame() {
    initGrid();
    score = 0;
    gamesPlayed++;
    generateShapes();
    updateScoreDisplay();
    showScreen('game-screen');
    gameActive = true;
    drawGrid();

    if (ysdk) {
        ysdk.features.GameplayAPI?.start();
    }
}

async function endGame() {
    gameActive = false;

    if (ysdk) {
        ysdk.features.GameplayAPI?.stop();
    }

    let isNewRecord = false;
    if (score > bestScore) {
        bestScore = score;
        isNewRecord = true;
        await saveProgress();
    }

    // Submit to leaderboard
    try {
        if (ysdk && player && player.isAuthorized()) {
            await ysdk.leaderboards.setScore('score', score);
        }
    } catch (e) {
        console.warn('Leaderboard submit error:', e);
    }

    // Show interstitial ad every 2 games
    if (ysdk && gamesPlayed % 2 === 0) {
        try {
            await new Promise((resolve) => {
                ysdk.adv.showFullscreenAdv({
                    callbacks: {
                        onClose: () => resolve(),
                        onError: () => resolve(),
                    }
                });
            });
        } catch (e) { /* ignore */ }
    }

    document.getElementById('final-score-value').textContent = score;
    document.getElementById('final-best-value').textContent = bestScore;
    document.getElementById('new-record').style.display = isNewRecord ? 'block' : 'none';
    document.getElementById('menu-best-score').textContent = bestScore;
    showScreen('gameover-screen');
}

function handlePlacement(gridR, gridC) {
    if (!gameActive || selectedShapeIndex < 0) return;
    const shape = currentShapes[selectedShapeIndex];
    if (!shape || shape.used) return;

    // Center the shape on the clicked cell
    const shapeRows = shape.pattern.length;
    const shapeCols = Math.max(...shape.pattern.map(r => r.length));
    const startR = gridR - Math.floor(shapeRows / 2);
    const startC = gridC - Math.floor(shapeCols / 2);

    if (!canPlaceShape(shape.pattern, startR, startC)) return;

    placeShape(shape, startR, startC);
    shape.used = true;
    selectedShapeIndex = -1;
    hoverCell = null;

    const lines = checkAndClearLines();
    if (lines > 0) showCombo(lines);

    updateScoreDisplay();
    drawGrid();
    renderShapes();

    if (allShapesUsed()) {
        generateShapes();
    }

    if (!canAnyShapeBePlaced()) {
        setTimeout(() => endGame(), 500);
    }
}

// ── Leaderboard ──
async function showLeaderboard() {
    const list = document.getElementById('lb-list');
    list.innerHTML = '<div style="color:#888;padding:20px">' + t('loading') + '</div>';
    showScreen('leaderboard-screen');

    try {
        if (!ysdk) throw new Error('No SDK');

        const entries = await ysdk.leaderboards.getEntries('score', {
            quantityTop: 10,
            includeUser: true,
            quantityAround: 3,
        });

        list.innerHTML = '';
        if (!entries.entries.length) {
            list.innerHTML = '<div style="color:#888;padding:20px">' + t('noEntries') + '</div>';
            return;
        }

        entries.entries.forEach((entry) => {
            const div = document.createElement('div');
            div.className = 'lb-entry' + (entry.player.uniqueID === (player?.getUniqueID?.() || '') ? ' me' : '');
            div.innerHTML = `
                <span class="lb-rank">${entry.rank}</span>
                <img class="lb-avatar" src="${entry.player.getAvatarSrc?.('small') || ''}" onerror="this.style.display='none'">
                <span class="lb-name">${entry.player.publicName || 'Player'}</span>
                <span class="lb-score">${entry.score}</span>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        list.innerHTML = '<div style="color:#888;padding:20px">' + t('noEntries') + '</div>';
    }
}

// ── Events ──
function setupEvents() {
    // Button clicks
    document.getElementById('play-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('menu-btn').addEventListener('click', () => showScreen('menu-screen'));
    document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('lb-back-btn').addEventListener('click', () => showScreen('menu-screen'));

    // Shape selection (click)
    shapesPanel.addEventListener('click', (e) => {
        const holder = e.target.closest('.shape-holder');
        if (!holder) return;
        const idx = parseInt(holder.getAttribute('data-index'));
        if (currentShapes[idx].used) return;
        selectedShapeIndex = selectedShapeIndex === idx ? -1 : idx;
        renderShapes();
        drawGrid();
    });

    // Canvas click for placement (desktop)
    canvas.addEventListener('click', (e) => {
        if (isMobile) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const c = Math.floor(x / cellSize);
        const r = Math.floor(y / cellSize);
        handlePlacement(r, c);
    });

    // Canvas hover for preview (desktop)
    canvas.addEventListener('mousemove', (e) => {
        if (isMobile || selectedShapeIndex < 0) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const c = Math.floor(x / cellSize);
        const r = Math.floor(y / cellSize);

        const shape = currentShapes[selectedShapeIndex];
        if (!shape) return;
        const shapeRows = shape.pattern.length;
        const shapeCols = Math.max(...shape.pattern.map(row => row.length));

        hoverCell = {
            r: r - Math.floor(shapeRows / 2),
            c: c - Math.floor(shapeCols / 2),
        };
        drawGrid();
    });

    canvas.addEventListener('mouseleave', () => {
        hoverCell = null;
        drawGrid();
    });

    // ── Touch Drag & Drop (mobile) ──
    setupTouchDrag();

    // ── Sound pause on visibility change (requirement 1.3) ──
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && ysdk && gameActive) {
            ysdk.features.GameplayAPI?.stop();
        } else if (!document.hidden && ysdk && gameActive) {
            ysdk.features.GameplayAPI?.start();
        }
    });

    // Prevent context menu and selection (requirement 1.6.1.8 / 1.6.2.7)
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    // Resize
    window.addEventListener('resize', () => {
        setupCanvas();
        if (gameActive) {
            drawGrid();
            renderShapes();
        }
    });
}

function setupTouchDrag() {
    let dragShape = null;
    let dragIndex = -1;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragGhost = null;

    shapesPanel.addEventListener('touchstart', (e) => {
        const holder = e.target.closest('.shape-holder');
        if (!holder) return;
        const idx = parseInt(holder.getAttribute('data-index'));
        if (currentShapes[idx].used) return;

        e.preventDefault();
        dragIndex = idx;
        dragShape = currentShapes[idx];
        selectedShapeIndex = idx;
        renderShapes();

        const touch = e.touches[0];
        const rect = holder.getBoundingClientRect();
        dragOffsetX = touch.clientX - rect.left - rect.width / 2;
        dragOffsetY = touch.clientY - rect.top - rect.height / 2;

        // Create drag ghost
        dragGhost = document.createElement('div');
        dragGhost.style.cssText = 'position:fixed;pointer-events:none;z-index:200;opacity:0.8;transform:translate(-50%,-120%)';
        const gc = document.createElement('canvas');
        const pattern = dragShape.pattern;
        const rows = pattern.length;
        const cols = Math.max(...pattern.map(r => r.length));
        const sz = Math.min(cellSize, 30);
        gc.width = cols * sz;
        gc.height = rows * sz;
        const gctx = gc.getContext('2d');
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < pattern[r].length; c++) {
                if (!pattern[r][c]) continue;
                gctx.fillStyle = dragShape.color;
                gctx.fillRect(c * sz + 1, r * sz + 1, sz - 2, sz - 2);
            }
        }
        dragGhost.appendChild(gc);
        document.body.appendChild(dragGhost);
        dragGhost.style.left = touch.clientX + 'px';
        dragGhost.style.top = touch.clientY + 'px';
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!dragShape) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (dragGhost) {
            dragGhost.style.left = touch.clientX + 'px';
            dragGhost.style.top = touch.clientY + 'px';
        }

        // Show hover preview on grid
        const canvasRect = canvas.getBoundingClientRect();
        const x = touch.clientX - canvasRect.left;
        const y = touch.clientY - canvasRect.top - cellSize * 2; // Offset up so finger doesn't cover

        const c = Math.floor(x / cellSize);
        const r = Math.floor(y / cellSize);
        const shapeRows = dragShape.pattern.length;
        const shapeCols = Math.max(...dragShape.pattern.map(row => row.length));

        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            hoverCell = {
                r: r - Math.floor(shapeRows / 2),
                c: c - Math.floor(shapeCols / 2),
            };
        } else {
            hoverCell = null;
        }
        drawGrid();
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!dragShape) return;

        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
        }

        if (hoverCell && selectedShapeIndex >= 0) {
            const shape = currentShapes[selectedShapeIndex];
            const shapeRows = shape.pattern.length;
            const shapeCols = Math.max(...shape.pattern.map(row => row.length));

            // Try to place at hover position
            if (canPlaceShape(shape.pattern, hoverCell.r, hoverCell.c)) {
                placeShape(shape, hoverCell.r, hoverCell.c);
                shape.used = true;
                selectedShapeIndex = -1;
                hoverCell = null;

                const lines = checkAndClearLines();
                if (lines > 0) showCombo(lines);

                updateScoreDisplay();
                drawGrid();
                renderShapes();

                if (allShapesUsed()) {
                    generateShapes();
                }

                if (!canAnyShapeBePlaced()) {
                    setTimeout(() => endGame(), 500);
                }
            }
        }

        dragShape = null;
        dragIndex = -1;
        hoverCell = null;
        selectedShapeIndex = -1;
        renderShapes();
        drawGrid();
    });
}

// ── Prevent scrolling (requirement 1.10.2) ──
document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.body.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

// ── Start ──
initGame();
