import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// In-Memory Database / State for Platform Backend
interface UserProfile {
  id: string;
  phone: string;
  username: string;
  balance: number;
  vipLevel: number;
  vipPoints: number;
  currency: string;
  isLoggedIn: boolean;
  avatar: string;
  totalDeposited: number;
  totalWithdrawn: number;
}

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'WIN' | 'BET';
  amount: number;
  method: string;
  referenceNo: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  timestamp: string;
}

let currentUser: UserProfile = {
  id: 'usr_8829471',
  phone: '09060489645',
  username: 'PinoyPlayer88',
  balance: 5880.00,
  vipLevel: 2,
  vipPoints: 1450,
  currency: 'PHP',
  isLoggedIn: true,
  avatar: '🐉',
  totalDeposited: 12500,
  totalWithdrawn: 6800,
};

let transactions: Transaction[] = [
  {
    id: 'tx_101',
    type: 'DEPOSIT',
    amount: 1000.00,
    method: 'GCash',
    referenceNo: 'GC-901847192',
    status: 'COMPLETED',
    timestamp: 'Today, 02:40 PM',
  },
  {
    id: 'tx_102',
    type: 'WIN',
    amount: 3450.00,
    method: 'Super Golden Fortune',
    referenceNo: 'SL-782194',
    status: 'COMPLETED',
    timestamp: 'Today, 03:15 PM',
  },
  {
    id: 'tx_103',
    type: 'BONUS',
    amount: 188.00,
    method: 'VIP Silver Rebate',
    referenceNo: 'BN-448102',
    status: 'COMPLETED',
    timestamp: 'Yesterday, 11:00 AM',
  }
];

// Active Mine Sessions store
interface MineSession {
  id: string;
  bet: number;
  minesCount: number;
  mines: number[];
  revealed: number[];
  multiplier: number;
  isActive: boolean;
}
const mineSessions: Record<string, MineSession> = {};

// Helper: Format PHP
const round2 = (num: number) => Math.round(num * 100) / 100;

// API Routes

// 1. Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString(), platform: 'Bet88-Engine' });
});

// 2. Auth Endpoints
app.get('/api/auth/me', (req, res) => {
  res.json({ success: true, user: currentUser });
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Mobile number and password are required.' });
  }

  // Update current session user
  currentUser = {
    ...currentUser,
    phone: phone.startsWith('09') ? phone : `09${phone.slice(-9)}`,
    username: `User_${phone.slice(-4)}`,
    isLoggedIn: true,
  };

  res.json({
    success: true,
    message: 'Welcome back! Login successful.',
    user: currentUser,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { phone, password, promoCode } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Please enter a valid Philippine mobile number (e.g. 0917xxxxxxx).' });
  }

  currentUser = {
    id: `usr_${Date.now().toString().slice(-7)}`,
    phone: phone,
    username: `Player_${phone.slice(-4)}`,
    balance: 100.00, // Welcome free credits
    vipLevel: 1,
    vipPoints: 100,
    currency: 'PHP',
    isLoggedIn: true,
    avatar: '⭐',
    totalDeposited: 0,
    totalWithdrawn: 0,
  };

  transactions.unshift({
    id: `tx_${Date.now()}`,
    type: 'BONUS',
    amount: 100.00,
    method: 'Welcome Sign-up Bonus',
    referenceNo: `WB-${Math.floor(100000 + Math.random() * 900000)}`,
    status: 'COMPLETED',
    timestamp: 'Just now',
  });

  res.json({
    success: true,
    message: 'Account registered successfully! ₱100 Welcome Free Credit added.',
    user: currentUser,
  });
});

app.post('/api/auth/logout', (req, res) => {
  currentUser.isLoggedIn = false;
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 3. Wallet Endpoints (Simulated GCash / Maya)
app.get('/api/wallet', (req, res) => {
  res.json({
    success: true,
    balance: currentUser.balance,
    currency: currentUser.currency,
    vipPoints: currentUser.vipPoints,
    totalDeposited: currentUser.totalDeposited,
    totalWithdrawn: currentUser.totalWithdrawn,
    transactions: transactions.slice(0, 20),
  });
});

app.post('/api/wallet/deposit', (req, res) => {
  const { amount, method, mobileNumber } = req.body;
  const depositAmount = parseFloat(amount);

  if (isNaN(depositAmount) || depositAmount < 50) {
    return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₱50.' });
  }
  if (depositAmount > 50000) {
    return res.status(400).json({ success: false, message: 'Maximum single deposit amount is ₱50,000.' });
  }

  currentUser.balance = round2(currentUser.balance + depositAmount);
  currentUser.totalDeposited = round2(currentUser.totalDeposited + depositAmount);
  currentUser.vipPoints += Math.floor(depositAmount / 10);

  const refPrefix = method === 'GCash' ? 'GC' : method === 'PayMaya' ? 'MY' : 'BP';
  const newTx: Transaction = {
    id: `tx_${Date.now()}`,
    type: 'DEPOSIT',
    amount: depositAmount,
    method: method || 'GCash',
    referenceNo: `${refPrefix}-${Math.floor(100000000 + Math.random() * 900000000)}`,
    status: 'COMPLETED',
    timestamp: 'Just now',
  };

  transactions.unshift(newTx);

  res.json({
    success: true,
    message: `₱${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} deposit via ${method} credited instantly!`,
    newBalance: currentUser.balance,
    transaction: newTx,
  });
});

app.post('/api/wallet/withdraw', (req, res) => {
  const { amount, method, accountNumber, accountName } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (isNaN(withdrawAmount) || withdrawAmount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum cashout amount is ₱100.' });
  }
  if (withdrawAmount > currentUser.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
  }
  if (!accountNumber || accountNumber.length < 10) {
    return res.status(400).json({ success: false, message: 'Valid recipient mobile / account number required.' });
  }

  currentUser.balance = round2(currentUser.balance - withdrawAmount);
  currentUser.totalWithdrawn = round2(currentUser.totalWithdrawn + withdrawAmount);

  const newTx: Transaction = {
    id: `tx_${Date.now()}`,
    type: 'WITHDRAWAL',
    amount: withdrawAmount,
    method: method || 'GCash',
    referenceNo: `WD-${Math.floor(100000000 + Math.random() * 900000000)}`,
    status: 'COMPLETED',
    timestamp: 'Just now',
  };

  transactions.unshift(newTx);

  res.json({
    success: true,
    message: `Withdrawal request of ₱${withdrawAmount.toLocaleString()} to ${accountNumber} processed successfully!`,
    newBalance: currentUser.balance,
    transaction: newTx,
  });
});

// 4. Interactive Games RNG Engine

// A. Slot Machine RNG Spin (5 reels x 3 rows)
const SLOT_SYMBOLS = [
  { id: 'DRAGON', name: 'Golden Dragon', multiplier5: 100, multiplier4: 25, multiplier3: 10, icon: '🐲', isWild: false, isScatter: false, weight: 8 },
  { id: 'INGOT', name: 'Gold Ingot', multiplier5: 50, multiplier4: 15, multiplier3: 5, icon: '🪙', isWild: false, isScatter: false, weight: 12 },
  { id: 'LANTERN', name: 'Red Lantern', multiplier5: 30, multiplier4: 10, multiplier3: 3, icon: '🏮', isWild: false, isScatter: false, weight: 16 },
  { id: 'KOI', name: 'Lucky Koi', multiplier5: 20, multiplier4: 8, multiplier3: 2, icon: '🐟', isWild: false, isScatter: false, weight: 20 },
  { id: 'WILD', name: 'Wild Jade', multiplier5: 150, multiplier4: 30, multiplier3: 15, icon: '💎', isWild: true, isScatter: false, weight: 6 },
  { id: 'SCATTER', name: 'Free Spin Scatter', multiplier5: 50, multiplier4: 20, multiplier3: 5, icon: '⚡', isWild: false, isScatter: true, weight: 7 },
  { id: 'A', name: 'Ace', multiplier5: 12, multiplier4: 4, multiplier3: 1.5, icon: '🎴', isWild: false, isScatter: false, weight: 26 },
  { id: 'K', name: 'King', multiplier5: 10, multiplier4: 3, multiplier3: 1.2, icon: '👑', isWild: false, isScatter: false, weight: 28 },
  { id: 'Q', name: 'Queen', multiplier5: 8, multiplier4: 2.5, multiplier3: 1.0, icon: '🪭', isWild: false, isScatter: false, weight: 30 },
];

function getRandomSymbol() {
  const totalWeight = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const s of SLOT_SYMBOLS) {
    if (random < s.weight) return s;
    random -= s.weight;
  }
  return SLOT_SYMBOLS[0];
}

app.post('/api/games/slot/spin', (req, res) => {
  const { bet } = req.body;
  const spinBet = parseFloat(bet);

  if (isNaN(spinBet) || spinBet < 5) {
    return res.status(400).json({ success: false, message: 'Minimum spin bet is ₱5.' });
  }
  if (spinBet > currentUser.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance to spin. Please deposit.' });
  }

  // Deduct bet
  currentUser.balance = round2(currentUser.balance - spinBet);

  // Generate 5 reels x 3 rows grid
  // Grid format: array of 5 reels, each reel has 3 symbols
  const grid: Array<Array<(typeof SLOT_SYMBOLS)[0]>> = [];
  for (let c = 0; c < 5; c++) {
    const reel = [];
    for (let r = 0; r < 3; r++) {
      reel.push(getRandomSymbol());
    }
    grid.push(reel);
  }

  // Evaluate Paylines (9 classic lines)
  // Payline patterns: row indices across columns 0 to 4
  const paylines = [
    { id: 1, name: 'Middle Line', path: [1, 1, 1, 1, 1] },
    { id: 2, name: 'Top Line', path: [0, 0, 0, 0, 0] },
    { id: 3, name: 'Bottom Line', path: [2, 2, 2, 2, 2] },
    { id: 4, name: 'V Shape', path: [0, 1, 2, 1, 0] },
    { id: 5, name: 'Inverted V', path: [2, 1, 0, 1, 2] },
    { id: 6, name: 'ZigZag Top', path: [0, 0, 1, 2, 2] },
    { id: 7, name: 'ZigZag Bottom', path: [2, 2, 1, 0, 0] },
    { id: 8, name: 'Step Up', path: [1, 0, 0, 0, 1] },
    { id: 9, name: 'Step Down', path: [1, 2, 2, 2, 1] },
  ];

  let totalWin = 0;
  const winningLines: Array<{ lineId: number; lineName: string; symbolId: string; count: number; winAmount: number; path: number[] }> = [];

  paylines.forEach(line => {
    const lineSymbols = line.path.map((rowIdx, colIdx) => grid[colIdx][rowIdx]);
    // Check from left to right for matches
    const firstSymbol = lineSymbols[0];
    if (firstSymbol.isScatter) return; // Scatters pay anywhere

    let matchCount = 1;
    let targetSymbol = firstSymbol.isWild ? null : firstSymbol;

    for (let i = 1; i < lineSymbols.length; i++) {
      const current = lineSymbols[i];
      if (current.isWild) {
        matchCount++;
      } else if (!targetSymbol) {
        targetSymbol = current;
        matchCount++;
      } else if (current.id === targetSymbol.id) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3) {
      const scoringSymbol = targetSymbol || SLOT_SYMBOLS[0];
      let lineMultiplier = 0;
      if (matchCount === 5) lineMultiplier = scoringSymbol.multiplier5;
      else if (matchCount === 4) lineMultiplier = scoringSymbol.multiplier4;
      else if (matchCount === 3) lineMultiplier = scoringSymbol.multiplier3;

      const lineBet = spinBet / 9;
      const winForLine = round2(lineBet * lineMultiplier);
      totalWin += winForLine;

      winningLines.push({
        lineId: line.id,
        lineName: line.name,
        symbolId: scoringSymbol.id,
        count: matchCount,
        winAmount: winForLine,
        path: line.path,
      });
    }
  });

  // Check Scatters anywhere on the 5x3 screen
  let scatterCount = 0;
  grid.forEach(col => col.forEach(sym => {
    if (sym.isScatter) scatterCount++;
  }));

  let freeSpinsWon = 0;
  if (scatterCount >= 3) {
    freeSpinsWon = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 25;
    const scatterBonus = round2(spinBet * (scatterCount === 3 ? 5 : scatterCount === 4 ? 20 : 50));
    totalWin += scatterBonus;
  }

  totalWin = round2(totalWin);
  if (totalWin > 0) {
    currentUser.balance = round2(currentUser.balance + totalWin);
  }

  res.json({
    success: true,
    grid: grid.map(col => col.map(s => ({ id: s.id, name: s.name, icon: s.icon, isWild: s.isWild, isScatter: s.isScatter }))),
    totalWin,
    winningLines,
    freeSpinsWon,
    scatterCount,
    newBalance: currentUser.balance,
  });
});

// B. Perya Color Game Roll (Philippine Fiesta Carnival Classic)
// 6 Colors: Yellow, White, Pink, Blue, Red, Green
const PERYA_COLORS = ['yellow', 'white', 'pink', 'blue', 'red', 'green'];

app.post('/api/games/color-game/roll', (req, res) => {
  const { bets } = req.body; // { yellow: 50, red: 100, ... }
  if (!bets || typeof bets !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid bets object.' });
  }

  let totalBet = 0;
  for (const [color, amt] of Object.entries(bets)) {
    const numAmt = parseFloat(amt as string);
    if (!isNaN(numAmt) && numAmt > 0) {
      if (!PERYA_COLORS.includes(color)) {
        return res.status(400).json({ success: false, message: `Invalid color: ${color}` });
      }
      totalBet += numAmt;
    }
  }

  if (totalBet <= 0) {
    return res.status(400).json({ success: false, message: 'Please place at least one bet.' });
  }
  if (totalBet > currentUser.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance for total bet amount.' });
  }

  // Deduct bet
  currentUser.balance = round2(currentUser.balance - totalBet);

  // Roll 3 dice
  const dice = [
    PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
    PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
    PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
  ];

  // Count occurrences
  const colorCounts: Record<string, number> = {};
  dice.forEach(c => {
    colorCounts[c] = (colorCounts[c] || 0) + 1;
  });

  // Calculate winnings:
  // If matched 1 dice: Return bet + 1x bet
  // If matched 2 dice: Return bet + 2x bet
  // If matched 3 dice: Return bet + 3x bet (Triple Jackpot!)
  let totalWin = 0;
  const matchDetails: Record<string, { matches: number; win: number }> = {};

  for (const [color, amt] of Object.entries(bets)) {
    const numAmt = parseFloat(amt as string);
    if (numAmt > 0) {
      const matches = colorCounts[color] || 0;
      if (matches > 0) {
        // Return bet + matches * bet
        const colorWin = round2(numAmt + (matches * numAmt));
        totalWin += colorWin;
        matchDetails[color] = { matches, win: colorWin };
      } else {
        matchDetails[color] = { matches: 0, win: 0 };
      }
    }
  }

  totalWin = round2(totalWin);
  if (totalWin > 0) {
    currentUser.balance = round2(currentUser.balance + totalWin);
  }

  res.json({
    success: true,
    dice,
    totalBet,
    totalWin,
    netProfit: round2(totalWin - totalBet),
    matchDetails,
    newBalance: currentUser.balance,
  });
});

// C. Diamond Mines Game (5x5 grid = 25 tiles)
app.post('/api/games/mines/start', (req, res) => {
  const { bet, minesCount } = req.body;
  const numBet = parseFloat(bet);
  const numMines = parseInt(minesCount);

  if (isNaN(numBet) || numBet < 10) {
    return res.status(400).json({ success: false, message: 'Minimum Mines bet is ₱10.' });
  }
  if (isNaN(numMines) || numMines < 1 || numMines > 24) {
    return res.status(400).json({ success: false, message: 'Mines count must be between 1 and 24.' });
  }
  if (numBet > currentUser.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance.' });
  }

  currentUser.balance = round2(currentUser.balance - numBet);

  // Generate unique mine positions 0-24
  const allIndices = Array.from({ length: 25 }, (_, i) => i);
  // Shuffle
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }
  const mineIndices = allIndices.slice(0, numMines);

  const sessionId = `mine_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  mineSessions[sessionId] = {
    id: sessionId,
    bet: numBet,
    minesCount: numMines,
    mines: mineIndices,
    revealed: [],
    multiplier: 1.0,
    isActive: true,
  };

  // First step multiplier formula
  const safeSpots = 25 - numMines;
  const firstMultiplier = round2(0.97 * (25 / safeSpots));

  res.json({
    success: true,
    sessionId,
    minesCount: numMines,
    bet: numBet,
    nextMultiplier: Math.max(1.05, firstMultiplier),
    newBalance: currentUser.balance,
  });
});

app.post('/api/games/mines/reveal', (req, res) => {
  const { sessionId, tileIndex } = req.body;
  const session = mineSessions[sessionId];

  if (!session || !session.isActive) {
    return res.status(400).json({ success: false, message: 'No active mine game found.' });
  }
  if (tileIndex < 0 || tileIndex > 24) {
    return res.status(400).json({ success: false, message: 'Invalid tile index.' });
  }
  if (session.revealed.includes(tileIndex)) {
    return res.status(400).json({ success: false, message: 'Tile already revealed.' });
  }

  // Hit a mine?
  if (session.mines.includes(tileIndex)) {
    session.isActive = false;
    return res.json({
      success: true,
      hitMine: true,
      tileIndex,
      allMines: session.mines,
      multiplier: 0,
      winAmount: 0,
      gameOver: true,
      newBalance: currentUser.balance,
    });
  }

  // Revealed a diamond!
  session.revealed.push(tileIndex);
  const diamondsFound = session.revealed.length;
  const totalSafe = 25 - session.minesCount;

  // Calculate fair progressive multiplier with 3% house edge
  let mult = 1;
  for (let k = 0; k < diamondsFound; k++) {
    mult *= (25 - k) / (totalSafe - k);
  }
  session.multiplier = round2(0.97 * mult);

  const isMaxDiamonds = diamondsFound === totalSafe;
  let nextMultiplier = session.multiplier;
  if (!isMaxDiamonds) {
    let nextMult = 1;
    for (let k = 0; k < diamondsFound + 1; k++) {
      nextMult *= (25 - k) / (totalSafe - k);
    }
    nextMultiplier = round2(0.97 * nextMult);
  }

  const currentCashout = round2(session.bet * session.multiplier);

  if (isMaxDiamonds) {
    // Auto cash out max win
    session.isActive = false;
    currentUser.balance = round2(currentUser.balance + currentCashout);
    return res.json({
      success: true,
      hitMine: false,
      tileIndex,
      diamondsFound,
      multiplier: session.multiplier,
      currentCashout,
      nextMultiplier: 0,
      allMines: session.mines,
      gameOver: true,
      wonMax: true,
      newBalance: currentUser.balance,
    });
  }

  res.json({
    success: true,
    hitMine: false,
    tileIndex,
    diamondsFound,
    multiplier: session.multiplier,
    currentCashout,
    nextMultiplier,
    gameOver: false,
    newBalance: currentUser.balance,
  });
});

app.post('/api/games/mines/cashout', (req, res) => {
  const { sessionId } = req.body;
  const session = mineSessions[sessionId];

  if (!session || !session.isActive) {
    return res.status(400).json({ success: false, message: 'No active mine game to cash out.' });
  }

  if (session.revealed.length === 0) {
    return res.status(400).json({ success: false, message: 'Pick at least one diamond before cashing out!' });
  }

  session.isActive = false;
  const winAmount = round2(session.bet * session.multiplier);
  currentUser.balance = round2(currentUser.balance + winAmount);

  res.json({
    success: true,
    winAmount,
    multiplier: session.multiplier,
    allMines: session.mines,
    newBalance: currentUser.balance,
  });
});

// D. Rocket Crash Game endpoint (multiplier outcome)
app.post('/api/games/crash/cashout', (req, res) => {
  const { bet, multiplier } = req.body;
  const numBet = parseFloat(bet);
  const numMult = parseFloat(multiplier);

  if (isNaN(numBet) || numBet <= 0 || isNaN(numMult) || numMult < 1) {
    return res.status(400).json({ success: false, message: 'Invalid crash cashout parameters.' });
  }

  const winAmount = round2(numBet * numMult);
  currentUser.balance = round2(currentUser.balance + winAmount);

  res.json({
    success: true,
    winAmount,
    newBalance: currentUser.balance,
  });
});

app.post('/api/games/crash/place-bet', (req, res) => {
  const { bet } = req.body;
  const numBet = parseFloat(bet);

  if (isNaN(numBet) || numBet < 10) {
    return res.status(400).json({ success: false, message: 'Minimum bet is ₱10.' });
  }
  if (numBet > currentUser.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance.' });
  }

  currentUser.balance = round2(currentUser.balance - numBet);
  res.json({ success: true, newBalance: currentUser.balance });
});

// 5. Promotions & VIP List
app.get('/api/promotions', (req, res) => {
  res.json({
    success: true,
    promotions: [
      {
        id: 'promo_welcome_100',
        title: '100% First Deposit Match',
        tag: 'HOT PROMO',
        description: 'Double your first GCash/Maya deposit up to ₱5,000! Turn over 15x on any Slot or Crash game.',
        bonusRate: '100%',
        minDeposit: 100,
        maxBonus: 5000,
        claimed: false,
      },
      {
        id: 'promo_daily_rebate',
        title: '1.2% Unlimited Daily Rebate',
        tag: 'DAILY CASH',
        description: 'Get automated daily rebate on every valid wager with no turnover requirement and no max cap.',
        bonusRate: '1.2%',
        minDeposit: 0,
        maxBonus: 999999,
        claimed: true,
      },
      {
        id: 'promo_weekend_reload',
        title: '50% Weekend Booster Bonus',
        tag: 'WEEKEND SPECIAL',
        description: 'Every Saturday and Sunday, reload your wallet and get 50% extra credits instantly.',
        bonusRate: '50%',
        minDeposit: 200,
        maxBonus: 3000,
        claimed: false,
      },
      {
        id: 'promo_vip_perya',
        title: 'Fiesta Perya Lucky Draw',
        tag: 'EXCLUSIVE',
        description: 'Every ₱1,000 total turnover grants 1 Lucky Spin token to win real gadgets, GCash credits and gold.',
        bonusRate: 'FREE TICKET',
        minDeposit: 500,
        maxBonus: 10000,
        claimed: false,
      },
    ],
  });
});

app.get('/api/vip', (req, res) => {
  res.json({
    success: true,
    currentLevel: currentUser.vipLevel,
    points: currentUser.vipPoints,
    nextLevelPoints: 3000,
    levels: [
      { level: 1, name: 'Bronze Explorer', pointsReq: 0, dailyRebate: '0.6%', birthdayGift: '₱288', upgradeBonus: '₱88' },
      { level: 2, name: 'Silver High Roller', pointsReq: 1000, dailyRebate: '0.8%', birthdayGift: '₱588', upgradeBonus: '₱288' },
      { level: 3, name: 'Gold VIP Champion', pointsReq: 5000, dailyRebate: '1.0%', birthdayGift: '₱1,288', upgradeBonus: '₱888' },
      { level: 4, name: 'Platinum Grandmaster', pointsReq: 25000, dailyRebate: '1.2%', birthdayGift: '₱3,888', upgradeBonus: '₱2,888' },
      { level: 5, name: 'Diamond Royal King', pointsReq: 100000, dailyRebate: '1.5%', birthdayGift: '₱8,888', upgradeBonus: '₱8,888' },
    ],
  });
});

// Vite & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bet88 Fullstack Platform server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
