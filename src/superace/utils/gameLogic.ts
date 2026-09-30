import { CardSymbol, GridCard, WinLine } from '../types/game';

export const MULTIPLIERS = [1, 2, 3, 5] as const;
export const FREE_MULTIPLIERS = [2, 4, 6, 10] as const;

export const SYMBOL_PAYOUTS: Record<CardSymbol, { [count: number]: number }> = {
  A: { 3: 0.5, 4: 1.5, 5: 3.5 },
  K: { 3: 0.4, 4: 1.0, 5: 2.5 },
  Q: { 3: 0.3, 4: 0.8, 5: 2.0 },
  J: { 3: 0.2, 4: 0.5, 5: 1.5 },
  SPADE: { 3: 0.1, 4: 0.3, 5: 0.8 },
  WILD: { 3: 0.5, 4: 1.5, 5: 3.5 },
  SCATTER: { 3: 2.0, 4: 5.0, 5: 10.0 },
};

// Generate an individual card symbol with weighted odds
export function getRandomSymbol(colIndex: number): { symbol: CardSymbol; isGolden: boolean } {
  const rand = Math.random();
  let symbol: CardSymbol = 'J';

  if (rand < 0.03) {
    symbol = 'SCATTER';
  } else if (rand < 0.08) {
    symbol = 'WILD';
  } else if (rand < 0.28) {
    symbol = 'SPADE';
  } else if (rand < 0.50) {
    symbol = 'J';
  } else if (rand < 0.70) {
    symbol = 'Q';
  } else if (rand < 0.88) {
    symbol = 'K';
  } else {
    symbol = 'A';
  }

  // Golden cards appear only on reels 2, 3, 4 (0-indexed 1, 2, 3) and cannot be Scatter or Wild
  let isGolden = false;
  if (colIndex >= 1 && colIndex <= 3 && symbol !== 'SCATTER' && symbol !== 'WILD') {
    isGolden = Math.random() < 0.25;
  }

  return { symbol, isGolden };
}

// Generate the initial grid matching the screenshot
export function getInitialGrid(): GridCard[][] {
  const grid: GridCard[][] = [];

  // Reel 1: All A
  grid.push([
    { id: 'c0-r0', symbol: 'A', isGolden: false },
    { id: 'c0-r1', symbol: 'A', isGolden: false },
    { id: 'c0-r2', symbol: 'A', isGolden: false },
    { id: 'c0-r3', symbol: 'A', isGolden: false },
  ]);

  // Reel 2: Top is Golden K, rest are normal K
  grid.push([
    { id: 'c1-r0', symbol: 'K', isGolden: true },
    { id: 'c1-r1', symbol: 'K', isGolden: false },
    { id: 'c1-r2', symbol: 'K', isGolden: false },
    { id: 'c1-r3', symbol: 'K', isGolden: false },
  ]);

  // Reel 3: Top is Golden Q, rest are normal Q
  grid.push([
    { id: 'c2-r0', symbol: 'Q', isGolden: true },
    { id: 'c2-r1', symbol: 'Q', isGolden: false },
    { id: 'c2-r2', symbol: 'Q', isGolden: false },
    { id: 'c2-r3', symbol: 'Q', isGolden: false },
  ]);

  // Reel 4: All J
  grid.push([
    { id: 'c3-r0', symbol: 'J', isGolden: false },
    { id: 'c3-r1', symbol: 'J', isGolden: false },
    { id: 'c3-r2', symbol: 'J', isGolden: false },
    { id: 'c3-r3', symbol: 'J', isGolden: false },
  ]);

  // Reel 5: All SPADE cards
  grid.push([
    { id: 'c4-r0', symbol: 'SPADE', isGolden: false },
    { id: 'c4-r1', symbol: 'SPADE', isGolden: false },
    { id: 'c4-r2', symbol: 'SPADE', isGolden: false },
    { id: 'c4-r3', symbol: 'SPADE', isGolden: false },
  ]);

  return grid;
}

// Generate a brand new random grid
export function generateRandomGrid(): GridCard[][] {
  const grid: GridCard[][] = [];
  for (let c = 0; c < 5; c++) {
    const col: GridCard[] = [];
    for (let r = 0; r < 4; r++) {
      const { symbol, isGolden } = getRandomSymbol(c);
      col.push({
        id: `c${c}-r${r}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        symbol,
        isGolden,
      });
    }
    grid.push(col);
  }
  return grid;
}

// Find winning ways in the grid (1024 ways: matching symbols on reels 1 -> 2 -> 3...)
export function evaluateWins(grid: GridCard[][], bet: number, multiplier: number): {
  winLines: WinLine[];
  winningCells: Set<string>;
  totalPayout: number;
} {
  const winLines: WinLine[] = [];
  const winningCells = new Set<string>();
  let totalPayout = 0;

  const targetSymbols: CardSymbol[] = ['A', 'K', 'Q', 'J', 'SPADE'];

  for (const sym of targetSymbols) {
    const matchingCols: { col: number; row: number; cardId: string }[][] = [];

    for (let c = 0; c < 5; c++) {
      const matchesInCol: { col: number; row: number; cardId: string }[] = [];
      for (let r = 0; r < 4; r++) {
        const card = grid[c][r];
        if (card.symbol === sym || card.symbol === 'WILD') {
          matchesInCol.push({ col: c, row: r, cardId: card.id });
        }
      }
      if (matchesInCol.length > 0) {
        matchingCols.push(matchesInCol);
      } else {
        break; // Ways must be consecutive from reel 1
      }
    }

    const count = matchingCols.length;
    if (count >= 3) {
      // Calculate ways: product of matching symbol counts on each reel
      let ways = 1;
      const participatingCells: { col: number; row: number }[] = [];
      matchingCols.forEach(colMatches => {
        ways *= colMatches.length;
        colMatches.forEach(cell => {
          participatingCells.push({ col: cell.col, row: cell.row });
          winningCells.add(`${cell.col}-${cell.row}`);
        });
      });

      const basePayout = SYMBOL_PAYOUTS[sym][count] || 0;
      const linePayout = basePayout * bet * ways * multiplier;

      totalPayout += linePayout;
      winLines.push({
        symbol: sym,
        count,
        payout: linePayout,
        multiplier,
        cells: participatingCells,
      });
    }
  }

  // Also check for Scatters (3 or more anywhere on grid)
  let scatterCount = 0;
  const scatterCells: { col: number; row: number }[] = [];
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 4; r++) {
      if (grid[c][r].symbol === 'SCATTER') {
        scatterCount++;
        scatterCells.push({ col: c, row: r });
      }
    }
  }

  if (scatterCount >= 3) {
    const scatterPayout = (SYMBOL_PAYOUTS.SCATTER[Math.min(scatterCount, 5)] || 2.0) * bet;
    totalPayout += scatterPayout;
    scatterCells.forEach(cell => winningCells.add(`${cell.col}-${cell.row}`));
    winLines.push({
      symbol: 'SCATTER',
      count: scatterCount,
      payout: scatterPayout,
      multiplier,
      cells: scatterCells,
    });
  }

  return { winLines, winningCells, totalPayout };
}

// Cascade the grid:
// 1. Winning golden cards turn into WILD cards!
// 2. Other winning cards vanish
// 3. Remaining cards drop down, new cards spawn at top
export function cascadeGrid(
  currentGrid: GridCard[][],
  winningCellCoords: Set<string>
): { nextGrid: GridCard[][]; goldenWildsCreated: number } {
  const nextGrid: GridCard[][] = [];
  let goldenWildsCreated = 0;

  for (let c = 0; c < 5; c++) {
    const currentCol = currentGrid[c];
    const survivingCards: GridCard[] = [];

    for (let r = 0; r < 4; r++) {
      const card = currentCol[r];
      const isWinner = winningCellCoords.has(`${c}-${r}`);

      if (isWinner) {
        if (card.isGolden) {
          // Golden Card transforms into Wild!
          goldenWildsCreated++;
          survivingCards.push({
            id: `wild-${c}-${r}-${Date.now()}`,
            symbol: 'WILD',
            isGolden: false,
            isTransformingWild: true,
          });
        }
        // Non-golden winner disappears
      } else {
        survivingCards.push({ ...card, isWinning: false });
      }
    }

    // Fill top with new cards until length is 4
    const needed = 4 - survivingCards.length;
    const newCards: GridCard[] = [];
    for (let i = 0; i < needed; i++) {
      const { symbol, isGolden } = getRandomSymbol(c);
      newCards.push({
        id: `spawn-${c}-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        symbol,
        isGolden,
        isNew: true,
      });
    }

    // Combine: new cards at top, surviving cards below
    nextGrid.push([...newCards, ...survivingCards]);
  }

  return { nextGrid, goldenWildsCreated };
}
