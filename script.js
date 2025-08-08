// 游戏配置
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 30;

// 游戏状态
let gameBoard = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let linesCleared = 0;
let gameRunning = false;
let gameSpeed = 1000;
let lastDropTime = 0;
let isPaused = false;

// 重力动画相关
let gravityAnimationSpeed = 100; // 重力动画间隔（毫秒）
let lastGravityTime = 0;
let isGravityAnimating = false;

// 连击系统
let comboCount = 0;
let isChainClearing = false;

// Canvas 元素
let gameCanvas, gameCtx, nextCanvas, nextCtx;

// 俄罗斯方块形状定义
const PIECES = [
    // I 形状
    {
        shape: [
            [1, 1, 1, 1]
        ],
        color: '#00f5ff'
    },
    // O 形状
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffff00'
    },
    // T 形状
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: '#800080'
    },
    // S 形状
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: '#00ff00'
    },
    // Z 形状
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: '#ff0000'
    },
    // J 形状
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        color: '#0000ff'
    },
    // L 形状
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        color: '#ff8c00'
    }
];

// 初始化游戏
function initGame() {
    gameCanvas = document.getElementById('gameCanvas');
    gameCtx = gameCanvas.getContext('2d');
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas.getContext('2d');
    
    // 初始化游戏面板
    gameBoard = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    
    // 设置键盘事件监听
    document.addEventListener('keydown', handleKeyPress);
    
    // 开始游戏
    startGame();
}

// 创建新的方块
function createPiece() {
    const pieceType = Math.floor(Math.random() * PIECES.length);
    const piece = JSON.parse(JSON.stringify(PIECES[pieceType]));
    
    return {
        shape: piece.shape,
        color: piece.color,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };
}

// 旋转方块
function rotatePiece(piece) {
    const rotated = {
        ...piece,
        shape: piece.shape[0].map((_, i) => 
            piece.shape.map(row => row[i]).reverse()
        )
    };
    return rotated;
}

// 检查方块是否可以放置
function isValidPosition(piece, dx = 0, dy = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + dx;
                const newY = piece.y + y + dy;
                
                if (newX < 0 || newX >= BOARD_WIDTH || 
                    newY >= BOARD_HEIGHT || 
                    (newY >= 0 && gameBoard[newY][newX])) {
                    return false;
                }
            }
        }
    }
    return true;
}

// 将方块固定到游戏面板
function placePiece(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0) {
                    gameBoard[boardY][boardX] = piece.color;
                }
            }
        }
    }
}

// 重力系统 - 让所有方块下落（带动画）
function applyGravity(onComplete = null) {
    if (isGravityAnimating) return false;
    
    let hasChanges = false;
    
    // 从底部往上检查每一行，只进行一次下落
    for (let y = BOARD_HEIGHT - 2; y >= 0; y--) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (gameBoard[y][x] && !gameBoard[y + 1][x]) {
                // 方块可以下落
                gameBoard[y + 1][x] = gameBoard[y][x];
                gameBoard[y][x] = 0;
                hasChanges = true;
            }
        }
    }
    
    if (hasChanges) {
        isGravityAnimating = true;
        lastGravityTime = Date.now();
        
        // 添加视觉反馈
        gameCanvas.classList.add('gravity-active');
        updateGravityStatus('下落中');
        
        // 设置延迟后继续应用重力
        setTimeout(() => {
            isGravityAnimating = false;
            // 递归调用，继续应用重力直到稳定
            if (applyGravity(onComplete)) {
                // 如果还有变化，继续动画
                return;
            } else {
                // 重力结束，移除视觉反馈
                gameCanvas.classList.remove('gravity-active');
                updateGravityStatus('稳定');
                // 重力完成后执行回调
                if (onComplete) {
                    onComplete();
                }
            }
        }, gravityAnimationSpeed);
    } else {
        // 没有变化，重力已稳定
        if (onComplete) {
            onComplete();
        }
    }
    
    return hasChanges;
}

// 立即应用重力（无动画，用于游戏开始等场景）
function applyGravityInstant() {
    let hasChanges = true;
    
    while (hasChanges) {
        hasChanges = false;
        
        // 从底部往上检查每一行
        for (let y = BOARD_HEIGHT - 2; y >= 0; y--) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (gameBoard[y][x] && !gameBoard[y + 1][x]) {
                    // 方块可以下落
                    gameBoard[y + 1][x] = gameBoard[y][x];
                    gameBoard[y][x] = 0;
                    hasChanges = true;
                }
            }
        }
    }
}

// 检查并清除满行（只清除，不应用重力）
function checkAndClearLines() {
    let linesRemoved = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (gameBoard[y].every(cell => cell !== 0)) {
            // 清除这一行
            gameBoard.splice(y, 1);
            gameBoard.unshift(Array(BOARD_WIDTH).fill(0));
            linesRemoved++;
            y++; // 重新检查这一行
        }
    }
    
    if (linesRemoved > 0) {
        // 如果是连锁消除，增加连击数
        if (isChainClearing) {
            comboCount++;
            updateComboDisplay();
        }
        
        // 计算分数（连击有奖励）
        let baseScore = [0, 100, 300, 500, 800][linesRemoved] * level;
        if (comboCount > 1) {
            baseScore *= (1 + (comboCount - 1) * 0.5); // 连击奖励
        }
        
        score += Math.floor(baseScore);
        linesCleared += linesRemoved;
        
        // 更新等级
        level = Math.floor(linesCleared / 10) + 1;
        gameSpeed = Math.max(50, 1000 - (level - 1) * 50);
        
        updateUI();
    }
    
    return linesRemoved > 0;
}

// 应用重力并检查连锁消除
function applyGravityAndCheckLines() {
    isChainClearing = true;
    
    applyGravity(() => {
        // 重力动画完成后，检查是否有新的完整行可以消除
        if (checkAndClearLines()) {
            // 如果有消除行，延迟后再次应用重力和检查
            setTimeout(() => {
                applyGravityAndCheckLines();
            }, 300); // 给玩家时间看到消除效果
        } else {
            // 连锁结束
            isChainClearing = false;
            if (comboCount > 1) {
                // 显示连击完成的提示
                setTimeout(() => {
                    resetCombo();
                }, 1000);
            } else {
                resetCombo();
            }
        }
    });
}

// 兼容旧的函数名，用于方块固定后的处理
function clearLines() {
    // 重置连击计数器（新的方块固定）
    resetCombo();
    
    // 首先检查并清除满行
    const hasCleared = checkAndClearLines();
    
    if (hasCleared) {
        // 如果有消除行，设置连击计数并延迟后应用重力和连锁检查
        comboCount = 1;
        updateComboDisplay();
        setTimeout(() => {
            applyGravityAndCheckLines();
        }, 200);
    } else {
        // 没有消除行，直接应用重力
        setTimeout(() => {
            applyGravityAndCheckLines();
        }, 50);
    }
}

// 移动方块
function movePiece(dx, dy) {
    if (!currentPiece) return false;
    
    if (isValidPosition(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

// 硬降 - 方块直接落到底部
function hardDrop() {
    if (!currentPiece || isGravityAnimating) return;
    
    while (movePiece(0, 1)) {
        score += 2; // 硬降奖励分数
    }
    
    placePiece(currentPiece);
    clearLines();
    spawnNewPiece();
}

// 生成新方块
function spawnNewPiece() {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();
    
    if (!isValidPosition(currentPiece)) {
        gameOver();
        return;
    }
    
    drawNextPiece();
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// 处理键盘输入
function handleKeyPress(event) {
    if (!gameRunning || isPaused) {
        if (event.key === 'p' || event.key === 'P') {
            togglePause();
        }
        return;
    }
    
    // 在重力动画期间，限制某些操作
    if (isGravityAnimating) {
        if (event.key === 'p' || event.key === 'P') {
            togglePause();
        }
        return;
    }
    
    switch(event.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (movePiece(0, 1)) {
                score += 1; // 软降奖励分数
            }
            break;
        case 'ArrowUp':
            const rotated = rotatePiece(currentPiece);
            if (isValidPosition(rotated)) {
                currentPiece = rotated;
            }
            break;
        case ' ':
            event.preventDefault();
            hardDrop();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
}

// 暂停/继续游戏
function togglePause() {
    isPaused = !isPaused;
    if (!isPaused && gameRunning) {
        gameLoop();
    }
}

// 绘制单个方块
function drawCell(ctx, x, y, color, size = CELL_SIZE) {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size, size);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * size, y * size, size, size);
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size, y * size, size / 4, size);
    ctx.fillRect(x * size, y * size, size, size / 4);
}

// 绘制游戏面板
function drawBoard() {
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // 绘制网格
    gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    gameCtx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
        gameCtx.beginPath();
        gameCtx.moveTo(x * CELL_SIZE, 0);
        gameCtx.lineTo(x * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
        gameCtx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
        gameCtx.beginPath();
        gameCtx.moveTo(0, y * CELL_SIZE);
        gameCtx.lineTo(BOARD_WIDTH * CELL_SIZE, y * CELL_SIZE);
        gameCtx.stroke();
    }
    
    // 绘制已固定的方块
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (gameBoard[y][x]) {
                drawCell(gameCtx, x, y, gameBoard[y][x]);
            }
        }
    }
    
    // 绘制当前方块
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    drawCell(gameCtx, currentPiece.x + x, currentPiece.y + y, currentPiece.color);
                }
            }
        }
        
        // 绘制方块阴影（预示落点）
        let shadowY = currentPiece.y;
        while (isValidPosition(currentPiece, 0, shadowY - currentPiece.y + 1)) {
            shadowY++;
        }
        
        if (shadowY > currentPiece.y) {
            gameCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let y = 0; y < currentPiece.shape.length; y++) {
                for (let x = 0; x < currentPiece.shape[y].length; x++) {
                    if (currentPiece.shape[y][x]) {
                        gameCtx.fillRect(
                            (currentPiece.x + x) * CELL_SIZE,
                            (shadowY + y) * CELL_SIZE,
                            CELL_SIZE,
                            CELL_SIZE
                        );
                    }
                }
            }
        }
    }
}

// 绘制下一个方块
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const offsetX = Math.floor((nextCanvas.width / 20 - nextPiece.shape[0].length) / 2);
        const offsetY = Math.floor((nextCanvas.height / 20 - nextPiece.shape.length) / 2);
        
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    drawCell(nextCtx, offsetX + x, offsetY + y, nextPiece.color, 20);
                }
            }
        }
    }
}

// 更新UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = linesCleared;
}

// 更新重力状态显示
function updateGravityStatus(status) {
    const gravityText = document.getElementById('gravityText');
    const gravityStatus = document.getElementById('gravityStatus');
    
    // 只有在没有连击时才更新重力状态文本
    if (comboCount === 0) {
        gravityText.textContent = status;
        gravityText.style.color = '#4ecdc4';
    }
    
    if (status === '下落中') {
        gravityText.classList.add('falling');
        if (comboCount === 0) {
            gravityStatus.classList.add('active');
        }
    } else {
        gravityText.classList.remove('falling');
        if (comboCount === 0) {
            gravityStatus.classList.remove('active');
        }
    }
}

// 更新连击显示
function updateComboDisplay() {
    const gravityText = document.getElementById('gravityText');
    const gravityStatus = document.getElementById('gravityStatus');
    
    if (comboCount > 1) {
        gravityText.textContent = `连击 x${comboCount}`;
        gravityText.style.color = '#ffa500';
        gravityStatus.classList.add('active');
    } else if (comboCount === 1) {
        gravityText.textContent = `连击 x${comboCount}`;
        gravityText.style.color = '#ffa500';
        gravityStatus.classList.remove('active');
    }
}

// 重置连击
function resetCombo() {
    comboCount = 0;
    const gravityText = document.getElementById('gravityText');
    const gravityStatus = document.getElementById('gravityStatus');
    
    // 恢复重力显示
    gravityText.textContent = '稳定';
    gravityText.style.color = '#4ecdc4';
    gravityStatus.classList.remove('active');
}

// 游戏主循环
function gameLoop() {
    if (!gameRunning || isPaused) return;
    
    const currentTime = Date.now();
    
    // 只有在没有重力动画时才处理方块下落
    if (!isGravityAnimating && currentTime - lastDropTime > gameSpeed) {
        if (!movePiece(0, 1)) {
            placePiece(currentPiece);
            clearLines();
            spawnNewPiece();
        }
        lastDropTime = currentTime;
    }
    
    drawBoard();
    
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// 开始游戏
function startGame() {
    gameBoard = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    level = 1;
    linesCleared = 0;
    gameSpeed = 1000;
    gameRunning = true;
    isPaused = false;
    lastDropTime = Date.now();
    isGravityAnimating = false;
    comboCount = 0;
    isChainClearing = false;
    
    document.getElementById('gameOver').classList.add('hidden');
    
    // 初始化状态显示
    updateGravityStatus('稳定');
    resetCombo();
    
    nextPiece = createPiece();
    spawnNewPiece();
    updateUI();
    
    gameLoop();
}

// 页面加载完成后初始化游戏
window.addEventListener('load', initGame);