const board = document.getElementById("board");

let currentTurn = 'white';
let selectedPiece = null;
let chainCapturePiece = null;

function createBoard() {
    for (let i = 0; i < 8; i++) {
        const row = document.createElement("div");
        row.classList.add("row");
        for (let j = 0; j < 8; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.classList.add((i + j) % 2 === 0 ? "white" : "black");
            cell.dataset.i = i;
            cell.dataset.j = j;

            if (i < 3 && (i + j) % 2 !== 0) {
                addPiece(cell, "black", i, j);
            } else if (i > 4 && (i + j) % 2 !== 0) {
                addPiece(cell, "white", i, j);
            }
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

function addPiece(cell, color, row, col) {
    const piece = document.createElement("div");
    piece.classList.add("piece", color);
    piece.dataset.color = color;
    piece.dataset.col = col;
    piece.dataset.row = row;
    cell.appendChild(piece);
}

function getCell(row, col) {
    return board.querySelector(`.cell[data-i="${row}"][data-j="${col}"]`);
}

function getPieceAt(row, col) {
    const cell = getCell(row, col);
    if (!cell) return null;
    const piece = cell.querySelector('.piece:not(.captured)');
    return piece;
}

function getValidMoves(piece) {
    const row = parseInt(piece.dataset.row);
    const col = parseInt(piece.dataset.col);
    const color = piece.dataset.color;
    const direction = color === 'white' ? -1 : 1;
    const moves = [];

    const forwardMoves = [
        { dr: direction, dc: -1 },
        { dr: direction, dc: 1 }
    ];

    for (const move of forwardMoves) {
        const newRow = row + move.dr;
        const newCol = col + move.dc;

        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            if (!getPieceAt(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol, type: 'move' });
            }
        }
    }

    const allDirections = [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 }
    ];

    for (const move of allDirections) {
        const midRow = row + move.dr;
        const midCol = col + move.dc;

        if (midRow >= 0 && midRow < 8 && midCol >= 0 && midCol < 8) {
            const midPiece = getPieceAt(midRow, midCol);

            if (midPiece && midPiece.dataset.color !== color) {
                const jumpRow = midRow + move.dr;
                const jumpCol = midCol + move.dc;

                if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
                    if (!getPieceAt(jumpRow, jumpCol)) {
                        moves.push({
                            row: jumpRow,
                            col: jumpCol,
                            type: 'capture',
                            capturedRow: midRow,
                            capturedCol: midCol
                        });
                    }
                }
            }
        }
    }

    return moves;
}

function canAnyPieceCapture(color) {
    const pieces = document.querySelectorAll(`.piece.${color}:not(.captured)`);
    for (const piece of pieces) {
        const moves = getValidMoves(piece);
        if (moves.some(m => m.type === 'capture')) {
            return true;
        }
    }
    return false;
}

function selectPiece(piece) {
    clearSelection();

    if (piece.dataset.color !== currentTurn) return;

    if (chainCapturePiece && piece !== chainCapturePiece) return;

    const mustCapture = canAnyPieceCapture(currentTurn);
    const moves = getValidMoves(piece);

    const availableMoves = mustCapture
        ? moves.filter(m => m.type === 'capture')
        : moves;

    if (availableMoves.length === 0 && mustCapture) return;

    selectedPiece = piece;
    piece.classList.add('selected');

    for (const move of availableMoves) {
        const cell = getCell(move.row, move.col);
        cell.classList.add('valid-move');
        cell.dataset.moveType = move.type;
        if (move.type === 'capture') {
            cell.dataset.capturedRow = move.capturedRow;
            cell.dataset.capturedCol = move.capturedCol;
        }
    }
}

function clearSelection() {
    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
        selectedPiece = null;
    }

    document.querySelectorAll('.valid-move').forEach(cell => {
        cell.classList.remove('valid-move');
        delete cell.dataset.moveType;
        delete cell.dataset.capturedRow;
        delete cell.dataset.capturedCol;
    });
}

function movePiece(targetCell) {
    const targetRow = parseInt(targetCell.dataset.i);
    const targetCol = parseInt(targetCell.dataset.j);
    const startRow = parseInt(selectedPiece.dataset.row);
    const startCol = parseInt(selectedPiece.dataset.col);
    const wasCapture = targetCell.dataset.moveType === 'capture';

    const cellWidth = targetCell.offsetWidth;
    const cellHeight = targetCell.offsetHeight;

    const deltaCol = targetCol - startCol;
    const deltaRow = targetRow - startRow;

    selectedPiece.style.setProperty('--ml', `${deltaCol * cellWidth}px`);
    selectedPiece.style.setProperty('--mb', `${-deltaRow * cellHeight}px`);

    if (wasCapture) {
        const capturedRow = parseInt(targetCell.dataset.capturedRow);
        const capturedCol = parseInt(targetCell.dataset.capturedCol);
        const capturedPiece = getPieceAt(capturedRow, capturedCol);

        if (capturedPiece) {
            capturePiece(capturedPiece);
        }
    }

    const movingPiece = selectedPiece;

    setTimeout(() => {
        movingPiece.style.setProperty('--ml', '0');
        movingPiece.style.setProperty('--mb', '0');
        movingPiece.dataset.row = targetRow;
        movingPiece.dataset.col = targetCol;
        targetCell.appendChild(movingPiece);

        clearSelection();

        if (checkVictory()) return;

        if (wasCapture) {
            const moreMoves = getValidMoves(movingPiece).filter(m => m.type === 'capture');
            if (moreMoves.length > 0) {
                chainCapturePiece = movingPiece;
                selectPiece(movingPiece);
                return;
            }
        }

        chainCapturePiece = null;
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
    }, 300);
}

function capturePiece(piece) {
    const explosion = document.createElement('img');
    explosion.src = './media/explosion-gif.gif';
    explosion.classList.add('explosion');

    piece.parentElement.appendChild(explosion);
    piece.remove();

    setTimeout(() => explosion.remove(), 800);
}

function checkVictory() {
    const whitePieces = document.querySelectorAll('.piece.white').length;
    const blackPieces = document.querySelectorAll('.piece.black').length;

    if (whitePieces === 0) {
        showVictory('black');
        return true;
    } else if (blackPieces === 0) {
        showVictory('white');
        return true;
    }

    return false;
}

function showVictory(winner) {
    const overlay = document.createElement('div');
    overlay.classList.add('victory-overlay');

    const message = document.createElement('div');
    message.classList.add('victory-message');

    const title = document.createElement('h1');
    title.textContent = winner === 'white' ? 'Победили белые!' : 'Победили чёрные!';

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Игра окончена';

    message.appendChild(title);
    message.appendChild(subtitle);
    overlay.appendChild(message);
    document.body.appendChild(overlay);
}

board.addEventListener('click', (e) => {
    const piece = e.target.closest('.piece');
    const cell = e.target.closest('.cell');

    if (piece) {
        if (piece.dataset.color === currentTurn) {
            selectPiece(piece);
        }
        return;
    }

    if (cell && cell.classList.contains('valid-move') && selectedPiece) {
        movePiece(cell);
    }
});

createBoard();

