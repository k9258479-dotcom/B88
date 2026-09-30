import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Multi-User Database & System State Store
export interface UserProfile {
  id: string;
  phone: string;
  username: string;
  password?: string;
  balance: number;
  vipLevel: number;
  vipPoints: number;
  currency: string;
  isLoggedIn: boolean;
  avatar: string;
  totalDeposited: number;
  totalWithdrawn: number;
  registeredAt: string;
  referredBy?: string;
  referralCode: string;
  lastLoginIp?: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface Transaction {
  id: string;
  userId: string;
  userPhone: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'WIN' | 'BET';
  amount: number;
  method: string;
  referenceNo: string;
  senderAccount?: string;
  recipientAccount?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  timestamp: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface ReferralLink {
  id: string;
  code: string;
  creatorName: string;
  commissionRate: number; // e.g. 1.5%
  clicks: number;
  signups: number;
  totalVolume: number;
  earnings: number;
  createdAt: string;
}

export interface MetaPixelConfig {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  isEnabled: boolean;
  trackRegistration: boolean;
  trackDeposit: boolean;
  trackFirstPlay: boolean;
  eventsLogged: Array<{
    id: string;
    eventName: string;
    value: number;
    currency: string;
    userPhone: string;
    timestamp: string;
    status: 'SENT' | 'SIMULATED';
  }>;
}

// In-Memory Database (No dummy accounts by default)
const users: Map<string, UserProfile> = new Map();
let transactions: Transaction[] = [];

let referralLinks: ReferralLink[] = [
  {
    id: 'ref_vip_official',
    code: 'BET88VIP',
    creatorName: 'Bet88 Official Partner',
    commissionRate: 2.0,
    clicks: 142,
    signups: 18,
    totalVolume: 85400,
    earnings: 1708,
    createdAt: '2026-09-01',
  },
  {
    id: 'ref_promo_manila',
    code: 'PINOY88',
    creatorName: 'Manila Streamer Agency',
    commissionRate: 1.5,
    clicks: 89,
    signups: 11,
    totalVolume: 42100,
    earnings: 631.5,
    createdAt: '2026-09-15',
  }
];

let metaConfig: MetaPixelConfig = {
  pixelId: '984120485918231',
  accessToken: 'EAAGNO4...fb_conversions_api_key_valid',
  testEventCode: 'TEST98421',
  isEnabled: true,
  trackRegistration: true,
  trackDeposit: true,
  trackFirstPlay: true,
  eventsLogged: [
    {
      id: 'evt_101',
      eventName: 'PageView',
      value: 0,
      currency: 'PHP',
      userPhone: 'visitor',
      timestamp: 'Today, 09:12 AM',
      status: 'SENT',
    }
  ],
};

// Current Session User (Default Guest until registered or logged in)
let currentSessionUserId: string | null = null;

// Mine Sessions store
interface MineSession {
  id: string;
  userId: string;
  bet: number;
  minesCount: number;
  mines: number[];
  revealed: number[];
  multiplier: number;
  isActive: boolean;
}
const mineSessions: Record<string, MineSession> = {};

// Game Win Rate (RTP & Volatility Engine) Settings
export interface GameWinRateConfig {
  gameId: string;
  gameName: string;
  provider: string;
  category: string;
  winRate: number; // 0 to 100 percentage
  payoutMultiplier: number; // e.g. 1.0 = normal, 1.25 = generous, 0.75 = tight
  wildBonusRate: number; // wild frequency bonus rate percentage (0 - 50%)
  freeSpinRate: number; // free spin trigger frequency (0 - 50%)
  rigMode: 'BALANCED' | 'HIGH_PAYOUT' | 'LOW_PAYOUT' | 'JACKPOT_HUNT';
  updatedAt: string;
}

let gameWinRates: Record<string, GameWinRateConfig> = {
  super_ace: {
    gameId: 'super_ace',
    gameName: 'Super Ace Slot',
    provider: 'JILI',
    category: 'slots',
    winRate: 97.6,
    payoutMultiplier: 1.0,
    wildBonusRate: 8,
    freeSpinRate: 3,
    rigMode: 'BALANCED',
    updatedAt: new Date().toISOString(),
  },
  dragon_fortune: {
    gameId: 'dragon_fortune',
    gameName: 'Super Golden Fortune',
    provider: 'JILI',
    category: 'slots',
    winRate: 97.4,
    payoutMultiplier: 1.0,
    wildBonusRate: 10,
    freeSpinRate: 5,
    rigMode: 'BALANCED',
    updatedAt: new Date().toISOString(),
  },
  rocket_crash: {
    gameId: 'rocket_crash',
    gameName: 'Rocket Crash 88',
    provider: 'Spribe',
    category: 'crash',
    winRate: 98.0,
    payoutMultiplier: 1.0,
    wildBonusRate: 0,
    freeSpinRate: 0,
    rigMode: 'BALANCED',
    updatedAt: new Date().toISOString(),
  },
  diamond_mines: {
    gameId: 'diamond_mines',
    gameName: 'Diamond Mines 88',
    provider: 'Spribe',
    category: 'crash',
    winRate: 97.0,
    payoutMultiplier: 1.0,
    wildBonusRate: 0,
    freeSpinRate: 0,
    rigMode: 'BALANCED',
    updatedAt: new Date().toISOString(),
  },
  perya_color: {
    gameId: 'perya_color',
    gameName: 'Perya Color Game',
    provider: 'Perya',
    category: 'perya',
    winRate: 96.8,
    payoutMultiplier: 1.0,
    wildBonusRate: 0,
    freeSpinRate: 0,
    rigMode: 'BALANCED',
    updatedAt: new Date().toISOString(),
  },
};

// Helper: Format PHP
const round2 = (num: number) => Math.round(num * 100) / 100;

// Helper: Dispatch Meta Conversions API Event
function triggerMetaPixelEvent(eventName: string, value: number, phone: string) {
  if (!metaConfig.isEnabled) return;

  const eventEntry = {
    id: `meta_evt_${Date.now()}`,
    eventName,
    value,
    currency: 'PHP',
    userPhone: phone ? `${phone.slice(0, 4)}****${phone.slice(-3)}` : 'anonymous',
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    status: 'SENT' as const,
  };

  metaConfig.eventsLogged.unshift(eventEntry);
  if (metaConfig.eventsLogged.length > 50) {
    metaConfig.eventsLogged.pop();
  }
}

// ----------------------------------------------------
// PUBLIC API ROUTES (For Main Casino Site)
// ----------------------------------------------------

// 1. Health & Config
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    platform: 'Bet88-Engine-Core',
    activeUsersCount: users.size,
    pendingTransactionsCount: transactions.filter(t => t.status === 'PENDING').length,
  });
});

// Game Win Rate Public Access (Read-only for game clients)
app.get('/api/games/win-rates', (req, res) => {
  res.json({
    success: true,
    winRates: gameWinRates,
  });
});

app.get('/api/games/win-rates/:gameId', (req, res) => {
  const game = gameWinRates[req.params.gameId];
  if (!game) {
    return res.status(404).json({ success: false, message: 'Game win rate configuration not found.' });
  }
  res.json({
    success: true,
    config: game,
  });
});

// 2. Auth Endpoints
app.get('/api/auth/me', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.json({
      success: true,
      user: {
        id: 'guest',
        phone: '',
        username: 'Guest Player',
        balance: 0,
        vipLevel: 1,
        vipPoints: 0,
        currency: 'PHP',
        isLoggedIn: false,
        avatar: '👤',
        totalDeposited: 0,
        totalWithdrawn: 0,
        referralCode: '',
        registeredAt: '',
        status: 'ACTIVE',
      }
    });
  }

  const currentUser = users.get(currentSessionUserId)!;
  res.json({ success: true, user: currentUser });
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Pakilagay ang mobile number at password.' });
  }

  const cleanPhone = phone.trim();
  let foundUser: UserProfile | undefined;

  for (const u of users.values()) {
    if (u.phone === cleanPhone) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser) {
    return res.status(400).json({
      success: false,
      message: 'Account not found. Paki-register po muna ang inyong number.',
    });
  }

  if (foundUser.password && foundUser.password !== password) {
    return res.status(400).json({ success: false, message: 'Maling password. Paki-ulit muli.' });
  }

  if (foundUser.status === 'SUSPENDED') {
    return res.status(403).json({ success: false, message: 'Account is temporarily suspended. Contact support.' });
  }

  foundUser.isLoggedIn = true;
  currentSessionUserId = foundUser.id;

  // Track Meta Pixel
  triggerMetaPixelEvent('Login', 0, foundUser.phone);

  res.json({
    success: true,
    message: 'Welcome back! Login successful.',
    user: foundUser,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { phone, password, promoCode } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ success: false, message: 'Please enter a valid Philippine mobile number (09xxxxxxxxx).' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const cleanPhone = phone.trim();

  // Check if exists
  for (const u of users.values()) {
    if (u.phone === cleanPhone) {
      return res.status(400).json({ success: false, message: 'Mobile number is already registered. Please log in.' });
    }
  }

  const newUserId = `usr_${Date.now().toString().slice(-7)}`;
  const userRefCode = `REF${cleanPhone.slice(-4)}${Math.floor(100 + Math.random() * 900)}`;

  // Check referral code validity
  let matchedReferrer: ReferralLink | undefined;
  if (promoCode) {
    matchedReferrer = referralLinks.find(r => r.code.toUpperCase() === promoCode.trim().toUpperCase());
    if (matchedReferrer) {
      matchedReferrer.signups += 1;
    }
  }

  const newUser: UserProfile = {
    id: newUserId,
    phone: cleanPhone,
    username: `Player_${cleanPhone.slice(-4)}`,
    password: password,
    balance: 100.00, // ₱100 Welcome Free Credits
    vipLevel: 1,
    vipPoints: 100,
    currency: 'PHP',
    isLoggedIn: true,
    avatar: '⭐',
    totalDeposited: 0,
    totalWithdrawn: 0,
    referralCode: userRefCode,
    referredBy: matchedReferrer ? matchedReferrer.code : (promoCode || undefined),
    registeredAt: new Date().toLocaleString('en-US'),
    status: 'ACTIVE',
  };

  users.set(newUserId, newUser);
  currentSessionUserId = newUserId;

  // Add initial Welcome Bonus to Ledger
  transactions.unshift({
    id: `tx_${Date.now()}`,
    userId: newUserId,
    userPhone: cleanPhone,
    type: 'BONUS',
    amount: 100.00,
    method: 'Welcome Sign-up Bonus',
    referenceNo: `WB-${Math.floor(100000 + Math.random() * 900000)}`,
    status: 'COMPLETED',
    timestamp: 'Just now',
  });

  // Track Meta Pixel CompleteRegistration
  if (metaConfig.trackRegistration) {
    triggerMetaPixelEvent('CompleteRegistration', 100, cleanPhone);
  }

  res.json({
    success: true,
    message: 'Mabuhay! Rehistrado na ang inyong account. Naidagdag na ang ₱100 Welcome Free Credits!',
    user: newUser,
  });
});

app.post('/api/auth/logout', (req, res) => {
  if (currentSessionUserId && users.has(currentSessionUserId)) {
    const user = users.get(currentSessionUserId)!;
    user.isLoggedIn = false;
  }
  currentSessionUserId = null;
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 3. Wallet Endpoints (Cashier with Approval Flow)
app.get('/api/wallet', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.json({
      success: true,
      balance: 0,
      currency: 'PHP',
      vipPoints: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      transactions: [],
    });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const userTxs = transactions.filter(t => t.userId === currentUser.id);

  res.json({
    success: true,
    balance: currentUser.balance,
    currency: currentUser.currency,
    vipPoints: currentUser.vipPoints,
    totalDeposited: currentUser.totalDeposited,
    totalWithdrawn: currentUser.totalWithdrawn,
    transactions: userTxs.slice(0, 25),
  });
});

// Deposit Submission (Goes to PENDING for admin approval or fast auto-approval)
app.post('/api/wallet/deposit', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.status(401).json({ success: false, message: 'Paki-login muna bago mag-deposit.' });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const { amount, method, mobileNumber, autoApprove } = req.body;
  const depositAmount = parseFloat(amount);

  if (isNaN(depositAmount) || depositAmount < 50) {
    return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₱50.' });
  }
  if (depositAmount > 50000) {
    return res.status(400).json({ success: false, message: 'Maximum single deposit amount is ₱50,000.' });
  }

  const refPrefix = method === 'GCash' ? 'GC' : method === 'PayMaya' ? 'MY' : 'BP';
  const refNo = `${refPrefix}-${Math.floor(100000000 + Math.random() * 900000000)}`;

  // Default: Creates a PENDING deposit awaiting backend verification
  // If autoApprove flag is set or standard instant test
  const isApproved = autoApprove === true;

  if (isApproved) {
    currentUser.balance = round2(currentUser.balance + depositAmount);
    currentUser.totalDeposited = round2(currentUser.totalDeposited + depositAmount);
    currentUser.vipPoints += Math.floor(depositAmount / 10);
  }

  const newTx: Transaction = {
    id: `tx_${Date.now()}`,
    userId: currentUser.id,
    userPhone: currentUser.phone,
    type: 'DEPOSIT',
    amount: depositAmount,
    method: method || 'GCash',
    referenceNo: refNo,
    senderAccount: mobileNumber || currentUser.phone,
    status: isApproved ? 'COMPLETED' : 'PENDING',
    timestamp: 'Just now',
    approvedBy: isApproved ? 'SYSTEM AUTO-GATEWAY' : undefined,
  };

  transactions.unshift(newTx);

  // Trigger Meta Purchase / Deposit Event
  if (metaConfig.trackDeposit) {
    triggerMetaPixelEvent('Purchase', depositAmount, currentUser.phone);
  }

  res.json({
    success: true,
    message: isApproved
      ? `₱${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} deposit via ${method} credited instantly!`
      : `₱${depositAmount.toLocaleString()} deposit request submitted (Ref: ${refNo}). Naghihintay ng validation mula sa admin cashier.`,
    newBalance: currentUser.balance,
    transaction: newTx,
    isPending: !isApproved,
  });
});

// Withdrawal Request (Pending Admin Approval)
app.post('/api/wallet/withdraw', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.status(401).json({ success: false, message: 'Paki-login muna bago mag-cashout.' });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const { amount, method, accountNumber, accountName } = req.body;
  const withdrawAmount = parseFloat(amount);

  if (isNaN(withdrawAmount) || withdrawAmount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum cashout amount is ₱100.' });
  }
  if (withdrawAmount > currentUser.balance) {
    return res.status(400).json({ success: false, message: 'Kulang ang inyong balance para sa halagang ito.' });
  }
  if (!accountNumber || accountNumber.length < 10) {
    return res.status(400).json({ success: false, message: 'Valid recipient mobile / account number required.' });
  }

  // Deduct balance upfront during pending request (held in escrow)
  currentUser.balance = round2(currentUser.balance - withdrawAmount);

  const refNo = `WD-${Math.floor(100000000 + Math.random() * 900000000)}`;
  const newTx: Transaction = {
    id: `tx_${Date.now()}`,
    userId: currentUser.id,
    userPhone: currentUser.phone,
    type: 'WITHDRAWAL',
    amount: withdrawAmount,
    method: method || 'GCash',
    referenceNo: refNo,
    recipientAccount: `${accountNumber} (${accountName || 'Verified Player'})`,
    status: 'PENDING', // Awaiting Admin Approval
    timestamp: 'Just now',
  };

  transactions.unshift(newTx);

  res.json({
    success: true,
    message: `Cashout request na ₱${withdrawAmount.toLocaleString()} papunta kay ${accountNumber} ay naisumite na! Pending admin dispatch confirmation.`,
    newBalance: currentUser.balance,
    transaction: newTx,
  });
});

// 4. Casino RNG Game Engines
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
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.status(401).json({ success: false, message: 'Please login or register to spin.' });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const { bet } = req.body;
  const spinBet = parseFloat(bet);

  if (isNaN(spinBet) || spinBet < 5) {
    return res.status(400).json({ success: false, message: 'Minimum spin bet is ₱5.' });
  }
  if (spinBet > currentUser.balance) {
    return res.status(400).json({ success: false, message: 'Insufficient balance to spin.' });
  }

  currentUser.balance = round2(currentUser.balance - spinBet);

  const grid: Array<Array<(typeof SLOT_SYMBOLS)[0]>> = [];
  for (let c = 0; c < 5; c++) {
    const reel = [];
    for (let r = 0; r < 3; r++) {
      reel.push(getRandomSymbol());
    }
    grid.push(reel);
  }

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
  const slotConfig = gameWinRates['dragon_fortune'] || { winRate: 97.4, payoutMultiplier: 1.0 };
  const winningLines: Array<{ lineId: number; lineName: string; symbolId: string; count: number; winAmount: number; path: number[] }> = [];

  paylines.forEach(line => {
    const lineSymbols = line.path.map((rowIdx, colIdx) => grid[colIdx][rowIdx]);
    const firstSymbol = lineSymbols[0];
    if (firstSymbol.isScatter) return;

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
      const winForLine = round2(lineBet * lineMultiplier * (slotConfig.payoutMultiplier || 1.0));
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

// Perya Color Game Roll
const PERYA_COLORS = ['yellow', 'white', 'pink', 'blue', 'red', 'green'];

app.post('/api/games/color-game/roll', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.status(401).json({ success: false, message: 'Please login or register to roll.' });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const { bets } = req.body;
  if (!bets || typeof bets !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid bets.' });
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

  if (totalBet <= 0) return res.status(400).json({ success: false, message: 'Please place a bet.' });
  if (totalBet > currentUser.balance) return res.status(400).json({ success: false, message: 'Insufficient balance.' });

  currentUser.balance = round2(currentUser.balance - totalBet);

  const dice = [
    PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
    PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
    PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
  ];

  const colorCounts: Record<string, number> = {};
  dice.forEach(c => { colorCounts[c] = (colorCounts[c] || 0) + 1; });

  let totalWin = 0;
  const matchDetails: Record<string, { matches: number; win: number }> = {};

  for (const [color, amt] of Object.entries(bets)) {
    const numAmt = parseFloat(amt as string);
    if (numAmt > 0) {
      const matches = colorCounts[color] || 0;
      if (matches > 0) {
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

// Diamond Mines
app.post('/api/games/mines/start', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.status(401).json({ success: false, message: 'Please login to play Mines.' });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const { bet, minesCount } = req.body;
  const numBet = parseFloat(bet);
  const numMines = parseInt(minesCount);

  if (isNaN(numBet) || numBet < 10) return res.status(400).json({ success: false, message: 'Min bet is ₱10.' });
  if (isNaN(numMines) || numMines < 1 || numMines > 24) return res.status(400).json({ success: false, message: 'Invalid mines count.' });
  if (numBet > currentUser.balance) return res.status(400).json({ success: false, message: 'Insufficient balance.' });

  currentUser.balance = round2(currentUser.balance - numBet);

  const allIndices = Array.from({ length: 25 }, (_, i) => i);
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }
  const mineIndices = allIndices.slice(0, numMines);

  const sessionId = `mine_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  mineSessions[sessionId] = {
    id: sessionId,
    userId: currentUser.id,
    bet: numBet,
    minesCount: numMines,
    mines: mineIndices,
    revealed: [],
    multiplier: 1.0,
    isActive: true,
  };

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

  if (!session || !session.isActive) return res.status(400).json({ success: false, message: 'No active session.' });

  const user = users.get(session.userId);
  if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

  if (session.revealed.includes(tileIndex)) return res.status(400).json({ success: false, message: 'Already revealed.' });

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
      newBalance: user.balance,
    });
  }

  session.revealed.push(tileIndex);
  const diamondsFound = session.revealed.length;
  const totalSafe = 25 - session.minesCount;

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
    session.isActive = false;
    user.balance = round2(user.balance + currentCashout);
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
      newBalance: user.balance,
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
    newBalance: user.balance,
  });
});

app.post('/api/games/mines/cashout', (req, res) => {
  const { sessionId } = req.body;
  const session = mineSessions[sessionId];
  if (!session || !session.isActive) return res.status(400).json({ success: false, message: 'No active session.' });

  const user = users.get(session.userId);
  if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

  session.isActive = false;
  const winAmount = round2(session.bet * session.multiplier);
  user.balance = round2(user.balance + winAmount);

  res.json({
    success: true,
    winAmount,
    multiplier: session.multiplier,
    allMines: session.mines,
    newBalance: user.balance,
  });
});

// Crash Rocket
app.post('/api/games/crash/place-bet', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.status(401).json({ success: false, message: 'Please login.' });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const { bet } = req.body;
  const numBet = parseFloat(bet);

  if (isNaN(numBet) || numBet < 10) return res.status(400).json({ success: false, message: 'Min bet ₱10.' });
  if (numBet > currentUser.balance) return res.status(400).json({ success: false, message: 'Insufficient balance.' });

  currentUser.balance = round2(currentUser.balance - numBet);
  res.json({ success: true, newBalance: currentUser.balance });
});

app.post('/api/games/crash/cashout', (req, res) => {
  if (!currentSessionUserId || !users.has(currentSessionUserId)) {
    return res.status(401).json({ success: false, message: 'Please login.' });
  }

  const currentUser = users.get(currentSessionUserId)!;
  const { bet, multiplier } = req.body;
  const numBet = parseFloat(bet);
  const numMult = parseFloat(multiplier);

  if (isNaN(numBet) || isNaN(numMult)) return res.status(400).json({ success: false, message: 'Invalid.' });

  const winAmount = round2(numBet * numMult);
  currentUser.balance = round2(currentUser.balance + winAmount);

  res.json({ success: true, winAmount, newBalance: currentUser.balance });
});

// 5. Promotions & VIP
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
    ],
  });
});

app.get('/api/vip', (req, res) => {
  const currentLevel = currentSessionUserId && users.has(currentSessionUserId) ? users.get(currentSessionUserId)!.vipLevel : 1;
  const points = currentSessionUserId && users.has(currentSessionUserId) ? users.get(currentSessionUserId)!.vipPoints : 0;

  res.json({
    success: true,
    currentLevel,
    points,
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

// ----------------------------------------------------
// SECURED BACKEND ADMIN MANAGEMENT API & PORTAL
// ----------------------------------------------------
const ADMIN_CREDENTIALS = {
  phone: '09060489645',
  password: 'Dan051391',
};

// 1. Admin Authentication
app.post('/api/admin/login', (req, res) => {
  const { phone, password } = req.body;
  if (phone === ADMIN_CREDENTIALS.phone && password === ADMIN_CREDENTIALS.password) {
    return res.json({
      success: true,
      token: `bet88_adm_token_${Date.now()}`,
      message: 'Admin authorization granted.',
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
});

// 2. Registered Users Management
app.get('/api/admin/users', (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    id: u.id,
    phone: u.phone,
    username: u.username,
    balance: u.balance,
    vipLevel: u.vipLevel,
    totalDeposited: u.totalDeposited,
    totalWithdrawn: u.totalWithdrawn,
    referralCode: u.referralCode,
    referredBy: u.referredBy || 'Organic',
    registeredAt: u.registeredAt,
    status: u.status,
  }));

  res.json({
    success: true,
    totalCount: userList.length,
    users: userList,
  });
});

// 3. Transactions Approval / Rejection Queue
app.get('/api/admin/transactions', (req, res) => {
  const { status, type } = req.query;
  let list = [...transactions];

  if (status) {
    list = list.filter(t => t.status === status);
  }
  if (type) {
    list = list.filter(t => t.type === type);
  }

  res.json({
    success: true,
    totalCount: list.length,
    pendingDeposits: transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'PENDING').length,
    pendingWithdrawals: transactions.filter(t => t.type === 'WITHDRAWAL' && t.status === 'PENDING').length,
    transactions: list,
  });
});

// Approve Transaction Endpoint
app.post('/api/admin/transactions/approve', (req, res) => {
  const { transactionId } = req.body;
  const tx = transactions.find(t => t.id === transactionId);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'Transaction not found.' });
  }
  if (tx.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: `Transaction already marked as ${tx.status}.` });
  }

  const targetUser = users.get(tx.userId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Target user not found.' });
  }

  if (tx.type === 'DEPOSIT') {
    // Credit player balance
    targetUser.balance = round2(targetUser.balance + tx.amount);
    targetUser.totalDeposited = round2(targetUser.totalDeposited + tx.amount);
    targetUser.vipPoints += Math.floor(tx.amount / 10);
    tx.status = 'APPROVED';
    tx.approvedBy = 'Admin: 09060489645';

    // Meta Pixel Conversion Event
    if (metaConfig.trackDeposit) {
      triggerMetaPixelEvent('Purchase', tx.amount, targetUser.phone);
    }
  } else if (tx.type === 'WITHDRAWAL') {
    // Amount was already placed in escrow during request, finalize dispatch
    targetUser.totalWithdrawn = round2(targetUser.totalWithdrawn + tx.amount);
    tx.status = 'APPROVED';
    tx.approvedBy = 'Admin: 09060489645';
  }

  res.json({
    success: true,
    message: `${tx.type} transaction (₱${tx.amount.toLocaleString()}) para kay ${targetUser.phone} ay na-APPROVED na!`,
    transaction: tx,
    userNewBalance: targetUser.balance,
  });
});

// Reject Transaction Endpoint
app.post('/api/admin/transactions/reject', (req, res) => {
  const { transactionId, reason } = req.body;
  const tx = transactions.find(t => t.id === transactionId);

  if (!tx) {
    return res.status(404).json({ success: false, message: 'Transaction not found.' });
  }
  if (tx.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: `Transaction already marked as ${tx.status}.` });
  }

  const targetUser = users.get(tx.userId);
  if (tx.type === 'WITHDRAWAL' && targetUser) {
    // Refund the escrow amount back to player wallet
    targetUser.balance = round2(targetUser.balance + tx.amount);
  }

  tx.status = 'REJECTED';
  tx.rejectionReason = reason || 'Declined by Admin Cashier';
  tx.approvedBy = 'Admin: 09060489645';

  res.json({
    success: true,
    message: `${tx.type} transaction ay na-REJECTED. Reason: ${tx.rejectionReason}`,
    transaction: tx,
    userNewBalance: targetUser ? targetUser.balance : undefined,
  });
});

// Manual Deposit / Credit Endpoint for Admin
app.post('/api/admin/users/credit', (req, res) => {
  const { phone, amount, note } = req.body;
  const numAmount = parseFloat(amount);

  if (!phone || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid phone number and amount required.' });
  }

  const cleanPhone = phone.trim();
  let targetUser = users.get(cleanPhone);

  if (!targetUser) {
    const newUser: UserProfile = {
      id: cleanPhone,
      phone: cleanPhone,
      username: `Player_${cleanPhone.slice(-4)}`,
      balance: numAmount,
      vipLevel: 1,
      vipPoints: Math.floor(numAmount / 10),
      currency: 'PHP',
      isLoggedIn: false,
      avatar: '🎰',
      totalDeposited: numAmount,
      totalWithdrawn: 0,
      referralCode: 'BET88VIP',
      registeredAt: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    };
    users.set(cleanPhone, newUser);
    targetUser = newUser;
  } else {
    targetUser.balance = round2(targetUser.balance + numAmount);
    targetUser.totalDeposited = round2(targetUser.totalDeposited + numAmount);
    targetUser.vipPoints += Math.floor(numAmount / 10);
  }

  const newTx: Transaction = {
    id: `tx_admin_${Date.now()}`,
    userId: cleanPhone,
    userPhone: cleanPhone,
    type: 'DEPOSIT',
    amount: numAmount,
    status: 'APPROVED',
    method: note || 'Cashier Manual Credit',
    referenceNo: `ADMIN-DEP-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toLocaleTimeString(),
    approvedBy: 'Admin: 09060489645',
  };
  transactions.unshift(newTx);

  res.json({
    success: true,
    message: `Matagumpay na na-credit ang ₱${numAmount.toLocaleString()} sa account ni ${cleanPhone}!`,
    newBalance: targetUser.balance,
    transaction: newTx,
  });
});

// 4. Referral Links Management
app.get('/api/admin/referrals', (req, res) => {
  res.json({
    success: true,
    referrals: referralLinks,
  });
});

app.post('/api/admin/referrals/create', (req, res) => {
  const { code, creatorName, commissionRate } = req.body;
  if (!code || code.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Please enter a valid referral code (min 3 chars).' });
  }

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Check duplicate
  if (referralLinks.some(r => r.code === cleanCode)) {
    return res.status(400).json({ success: false, message: 'Referral code already exists.' });
  }

  const newRef: ReferralLink = {
    id: `ref_${Date.now()}`,
    code: cleanCode,
    creatorName: creatorName || 'Affiliate Partner',
    commissionRate: parseFloat(commissionRate) || 1.5,
    clicks: 0,
    signups: 0,
    totalVolume: 0,
    earnings: 0,
    createdAt: new Date().toISOString().split('T')[0],
  };

  referralLinks.unshift(newRef);

  res.json({
    success: true,
    message: `Referral code "${cleanCode}" successfully generated!`,
    referral: newRef,
  });
});

// 5. Meta Pixel & Conversions API Settings
app.get('/api/admin/meta', (req, res) => {
  res.json({
    success: true,
    config: metaConfig,
  });
});

app.post('/api/admin/meta/update', (req, res) => {
  const { pixelId, accessToken, testEventCode, isEnabled, trackRegistration, trackDeposit } = req.body;

  metaConfig = {
    ...metaConfig,
    pixelId: pixelId || metaConfig.pixelId,
    accessToken: accessToken || metaConfig.accessToken,
    testEventCode: testEventCode || metaConfig.testEventCode,
    isEnabled: isEnabled !== undefined ? isEnabled : metaConfig.isEnabled,
    trackRegistration: trackRegistration !== undefined ? trackRegistration : metaConfig.trackRegistration,
    trackDeposit: trackDeposit !== undefined ? trackDeposit : metaConfig.trackDeposit,
  };

  res.json({
    success: true,
    message: 'Meta Conversions API & Pixel settings successfully saved!',
    config: metaConfig,
  });
});

app.post('/api/admin/meta/test-event', (req, res) => {
  const { eventName, value } = req.body;
  triggerMetaPixelEvent(eventName || 'CustomTestLead', value || 100, '09060489645');

  res.json({
    success: true,
    message: `Meta Pixel Event "${eventName || 'CustomTestLead'}" triggered successfully!`,
    latestEvents: metaConfig.eventsLogged.slice(0, 5),
  });
});

// 6. Game Win Rate & RTP Controller Management
app.get('/api/admin/win-rates', (req, res) => {
  res.json({
    success: true,
    winRates: gameWinRates,
  });
});

app.post('/api/admin/win-rates/update', (req, res) => {
  const { gameId, winRate, payoutMultiplier, wildBonusRate, freeSpinRate, rigMode } = req.body;

  if (!gameId || !gameWinRates[gameId]) {
    return res.status(404).json({ success: false, message: 'Invalid or unknown game ID.' });
  }

  const current = gameWinRates[gameId];
  const newWinRate = winRate !== undefined ? Math.min(100, Math.max(1, parseFloat(winRate))) : current.winRate;
  const newPayoutMultiplier = payoutMultiplier !== undefined ? Math.max(0.1, parseFloat(payoutMultiplier)) : current.payoutMultiplier;
  const newWildBonusRate = wildBonusRate !== undefined ? Math.max(0, Math.min(50, parseFloat(wildBonusRate))) : current.wildBonusRate;
  const newFreeSpinRate = freeSpinRate !== undefined ? Math.max(0, Math.min(50, parseFloat(freeSpinRate))) : current.freeSpinRate;
  const newRigMode = rigMode || current.rigMode;

  gameWinRates[gameId] = {
    ...current,
    winRate: newWinRate,
    payoutMultiplier: newPayoutMultiplier,
    wildBonusRate: newWildBonusRate,
    freeSpinRate: newFreeSpinRate,
    rigMode: newRigMode,
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    message: `Matagumpay na na-set ang Win Rate ng ${current.gameName} sa ${newWinRate}%!`,
    config: gameWinRates[gameId],
  });
});

// 7. Dedicated Isolated Admin Portal (/admin)
app.get('/admin', (req, res) => {
  const adminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bet88 Platform Management & Operations Control</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre, .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <!-- Auth Screen -->
  <div id="loginSection" class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-amber-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl font-bold">
          🛡️
        </div>
        <div>
          <h1 class="text-base font-bold text-amber-400 tracking-wider">BET88 SECURE BACKEND</h1>
          <p class="text-xs text-slate-400">Operations & Management Dashboard</p>
        </div>
      </div>

      <form id="adminLoginForm" class="space-y-4">
        <div>
          <label class="text-xs text-slate-400 font-semibold block mb-1">Admin Mobile / ID</label>
          <input type="text" id="adminPhone" value="09060489645" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400" required />
        </div>
        <div>
          <label class="text-xs text-slate-400 font-semibold block mb-1">Admin Security Password</label>
          <input type="password" id="adminPass" value="Dan051391" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400" required />
        </div>
        <div id="loginError" class="hidden text-xs text-red-400 bg-red-950/50 p-2.5 rounded-lg border border-red-500/30"></div>
        <button type="submit" class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 shadow-lg shadow-amber-500/20">
          Enter Management Console
        </button>
      </form>
    </div>
  </div>

  <!-- Dashboard Screen -->
  <div id="dashboardSection" class="hidden min-h-screen flex flex-col">
    <!-- Top Nav -->
    <header class="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🛡️</span>
        <div>
          <h1 class="text-sm font-bold text-amber-400">BET88 OPERATING BACKEND</h1>
          <span class="text-[10px] text-emerald-400 font-mono">Server Status: ONLINE · Port 3000</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <a href="/" target="_blank" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors font-medium">
          Buksan ang Casino Platform ↗
        </a>
        <button id="adminLogoutBtn" class="px-3.5 py-1.5 bg-red-950/70 border border-red-500/40 text-red-300 hover:bg-red-900 text-xs rounded-xl font-bold">
          Logout
        </button>
      </div>
    </header>

    <!-- Sub Navigation Tabs -->
    <div class="bg-slate-950 border-b border-slate-800 px-6 flex gap-2 overflow-x-auto text-xs font-bold uppercase tracking-wider">
      <button onclick="switchTab('tabCashier')" id="btnTabCashier" class="py-3 px-4 border-b-2 border-amber-400 text-amber-400 bg-amber-500/5">
        Deposit & Withdrawal Approvals
      </button>
      <button onclick="switchTab('tabUsers')" id="btnTabUsers" class="py-3 px-4 border-b-2 border-transparent text-slate-400 hover:text-white">
        Registered Players
      </button>
      <button onclick="switchTab('tabReferrals')" id="btnTabReferrals" class="py-3 px-4 border-b-2 border-transparent text-slate-400 hover:text-white">
        Referral Links & Affiliates
      </button>
      <button onclick="switchTab('tabWinRates')" id="btnTabWinRates" class="py-3 px-4 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-1.5">
        <span>🎮</span>
        <span>Game Win Rates (RTP & Volatility)</span>
      </button>
      <button onclick="switchTab('tabMeta')" id="btnTabMeta" class="py-3 px-4 border-b-2 border-transparent text-slate-400 hover:text-white">
        Meta (FB Pixel) Integration
      </button>
    </div>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

      <!-- TAB 1: CASHIER APPROVALS -->
      <section id="tabCashier" class="space-y-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white">Cashier Approvals Queue</h2>
            <p class="text-xs text-slate-400">I-verify, aprubahan, o i-reject ang mga pumapasok na GCash/Maya deposits at cashouts.</p>
          </div>
          <button onclick="loadTransactions()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg">
            I-refresh ang Queue
          </button>
        </div>

        <!-- Pending Table -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div class="p-4 border-b border-slate-800 flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              Pending Requests Queue (<span id="pendingCount">0</span>)
            </span>
            <span class="text-xs text-slate-500">Fast action: Click Aprubahan to credit player instantly</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th class="p-3">Type</th>
                  <th class="p-3">Player Mobile</th>
                  <th class="p-3">Method</th>
                  <th class="p-3">Halaga (PHP)</th>
                  <th class="p-3">Reference / Account</th>
                  <th class="p-3">Oras</th>
                  <th class="p-3 text-right">Aksyon</th>
                </tr>
              </thead>
              <tbody id="pendingTbody" class="divide-y divide-slate-800/80 font-mono">
                <tr><td colspan="7" class="p-4 text-center text-slate-500">Walang pending transactions sa kasalukuyan.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- All Transactions Ledger -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div class="p-4 border-b border-slate-800">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">Buong Transaction History</h3>
          </div>
          <div class="overflow-x-auto max-h-72 overflow-y-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th class="p-3">Status</th>
                  <th class="p-3">Type</th>
                  <th class="p-3">Player</th>
                  <th class="p-3">Method</th>
                  <th class="p-3">Amount</th>
                  <th class="p-3">Ref No</th>
                  <th class="p-3">Auditor</th>
                </tr>
              </thead>
              <tbody id="allTbody" class="divide-y divide-slate-800/80 font-mono">
                <!-- Injected via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 2: REGISTERED USERS -->
      <section id="tabUsers" class="hidden space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-white">Mga Rehistradong Manlalaro</h2>
            <p class="text-xs text-slate-400">Talaan ng lahat ng nag-register sa main casino platform.</p>
          </div>
          <button onclick="loadUsers()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg">
            I-refresh ang Listahan
          </button>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th class="p-3">User ID</th>
                  <th class="p-3">Mobile Number</th>
                  <th class="p-3">Username</th>
                  <th class="p-3">Balanse</th>
                  <th class="p-3">Total Deposited</th>
                  <th class="p-3">VIP</th>
                  <th class="p-3">Referral Code</th>
                  <th class="p-3">Petsa ng Rehistro</th>
                </tr>
              </thead>
              <tbody id="usersTbody" class="divide-y divide-slate-800/80 font-mono">
                <!-- Injected via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 3: REFERRAL LINKS CREATOR -->
      <section id="tabReferrals" class="hidden space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Create Form -->
          <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 class="text-sm font-bold text-amber-400 uppercase tracking-wider">Gumawa ng Bagong Referral Code</h3>
            <p class="text-xs text-slate-400">Gumawa ng natatanging link para sa mga streamers, ahente, o promosyon.</p>

            <form id="createRefForm" class="space-y-3">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Referral / Promo Code</label>
                <input type="text" id="refCodeInput" placeholder="e.g. VIP88MANILA" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white font-mono uppercase text-xs focus:outline-none focus:border-amber-400" required />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Pangalan ng Ahente o Creator</label>
                <input type="text" id="refNameInput" placeholder="e.g. John Streamer PH" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-amber-400" required />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Komisyon Rate (%)</label>
                <input type="number" step="0.1" id="refRateInput" value="1.5" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400" required />
              </div>
              <div id="refFeedback" class="hidden text-xs p-2 rounded"></div>
              <button type="submit" class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition-all">
                I-generate ang Referral Link
              </button>
            </form>
          </div>

          <!-- Existing Referral Codes Table -->
          <div class="lg:col-span-2 p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Aktibong Referral Codes & Affiliate Links</h3>
              <button onclick="loadReferrals()" class="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded">
                Refresh
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th class="pb-2">Code</th>
                    <th class="pb-2">Creator</th>
                    <th class="pb-2">Signups</th>
                    <th class="pb-2">Commission</th>
                    <th class="pb-2">Shareable Link</th>
                  </tr>
                </thead>
                <tbody id="referralsTbody" class="divide-y divide-slate-800/80 font-mono">
                  <!-- Injected via JS -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- TAB 4: GAME WIN RATES & RTP CONTROLLER -->
      <section id="tabWinRates" class="hidden space-y-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <span>🎮</span>
              <span>Game Win Rates & RTP (Return to Player) Control Center</span>
            </h2>
            <p class="text-xs text-slate-400">
              I-set at kontrolin ang win rate percentage (RTP), payout multiplier, wild bonus rate, at volatility para sa bawat laro.
            </p>
          </div>
          <button onclick="loadWinRates()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg">
            I-refresh ang Rates
          </button>
        </div>

        <div id="winRatesList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <!-- Injected dynamically via loadWinRates() -->
        </div>
      </section>

      <!-- TAB 4: META INTEGRATION -->
      <section id="tabMeta" class="hidden space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Meta Pixel Settings -->
          <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-xl">📊</span>
              <div>
                <h3 class="text-sm font-bold text-blue-400 uppercase tracking-wider">Meta Conversions API & Pixel Setup</h3>
                <p class="text-xs text-slate-400">I-connect ang Facebook Ads Pixel para sa auto-tracking ng Registration at Deposit events.</p>
              </div>
            </div>

            <form id="metaConfigForm" class="space-y-3">
              <div>
                <label class="text-xs text-slate-400 block mb-1">Meta Pixel ID (Dataset ID)</label>
                <input type="text" id="metaPixelId" value="984120485918231" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 font-mono text-xs text-white focus:outline-none focus:border-blue-400" required />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Conversions API Access Token (Graph API)</label>
                <input type="password" id="metaToken" value="EAAGNO4...fb_conversions_api_key_valid" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 font-mono text-xs text-white focus:outline-none focus:border-blue-400" required />
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-1">Test Event Code (Facebook Events Manager)</label>
                <input type="text" id="metaTestCode" value="TEST98421" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 font-mono text-xs text-white focus:outline-none focus:border-blue-400" />
              </div>

              <div class="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="chkRegistration" checked class="rounded bg-slate-950 border-slate-700 text-blue-500" />
                  <span>Awtomatikong i-track ang <b>CompleteRegistration</b> (tuwing may nag-register)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="chkDeposit" checked class="rounded bg-slate-950 border-slate-700 text-blue-500" />
                  <span>Awtomatikong i-track ang <b>Purchase / Deposit</b> (tuwing may na-aprubahang cash in)</span>
                </label>
              </div>

              <div id="metaFeedback" class="hidden text-xs p-2 rounded"></div>
              <div class="flex gap-2">
                <button type="submit" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-xl transition-all">
                  I-save ang Meta Settings
                </button>
                <button type="button" onclick="sendMetaTestEvent()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl">
                  Test Event Signal
                </button>
              </div>
            </form>
          </div>

          <!-- Live Log of Dispatched Meta Events -->
          <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Live Dispatched Meta Signals</h3>
            <p class="text-xs text-slate-400">Mga naipadalang signal sa Facebook Server-Side Conversions API:</p>

            <div class="overflow-y-auto max-h-72 space-y-2" id="metaEventsList">
              <!-- Injected via JS -->
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>

  <script>
    // Tab switching
    function switchTab(tabId) {
      ['tabCashier', 'tabUsers', 'tabReferrals', 'tabWinRates', 'tabMeta'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
        document.getElementById('btn' + id.charAt(0).toUpperCase() + id.slice(1)).className = 'py-3 px-4 border-b-2 border-transparent text-slate-400 hover:text-white';
      });

      document.getElementById(tabId).classList.remove('hidden');
      const activeBtn = document.getElementById('btn' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
      activeBtn.className = 'py-3 px-4 border-b-2 border-amber-400 text-amber-400 bg-amber-500/5';

      if (tabId === 'tabCashier') loadTransactions();
      if (tabId === 'tabUsers') loadUsers();
      if (tabId === 'tabReferrals') loadReferrals();
      if (tabId === 'tabWinRates') loadWinRates();
      if (tabId === 'tabMeta') loadMeta();
    }

    // Auth
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');

    if (sessionStorage.getItem('bet88_admin_authed') === 'true') {
      showDashboard();
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.classList.add('hidden');
      const phone = document.getElementById('adminPhone').value;
      const password = document.getElementById('adminPass').value;

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();
        if (data.success) {
          sessionStorage.setItem('bet88_admin_authed', 'true');
          showDashboard();
        } else {
          loginError.textContent = data.message || 'Maling impormasyon.';
          loginError.classList.remove('hidden');
        }
      } catch (err) {
        loginError.textContent = 'Server connection error.';
        loginError.classList.remove('hidden');
      }
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem('bet88_admin_authed');
      dashboardSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
    });

    function showDashboard() {
      loginSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      loadTransactions();
    }

    // 1. Transactions Queue & Approval
    async function loadTransactions() {
      try {
        const res = await fetch('/api/admin/transactions');
        const data = await res.json();
        if (data.success) {
          const pending = data.transactions.filter(t => t.status === 'PENDING');
          document.getElementById('pendingCount').textContent = pending.length;

          const pendingTbody = document.getElementById('pendingTbody');
          if (pending.length === 0) {
            pendingTbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-500">Walang pending requests sa kasalukuyan. Lahat ay tapos na.</td></tr>';
          } else {
            pendingTbody.innerHTML = '';
            pending.forEach(t => {
              const tr = document.createElement('tr');
              tr.className = 'hover:bg-slate-900/80';
              tr.innerHTML = \`
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold \${t.type === 'DEPOSIT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}">\${t.type}</span></td>
                <td class="p-3 text-slate-200 font-bold">\${t.userPhone}</td>
                <td class="p-3 text-slate-300">\${t.method}</td>
                <td class="p-3 font-bold text-amber-400 text-sm">₱\${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="p-3 text-slate-400">\${t.referenceNo} \${t.recipientAccount ? '· ' + t.recipientAccount : ''}</td>
                <td class="p-3 text-slate-500">\${t.timestamp}</td>
                <td class="p-3 text-right space-x-2">
                  <button onclick="approveTransaction('\${t.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold uppercase transition-colors">
                    Aprubahan
                  </button>
                  <button onclick="rejectTransaction('\${t.id}')" class="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-[11px] font-bold uppercase transition-colors">
                    Tanggihan
                  </button>
                </td>
              \`;
              pendingTbody.appendChild(tr);
            });
          }

          // All history
          const allTbody = document.getElementById('allTbody');
          allTbody.innerHTML = '';
          data.transactions.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-900/60';
            tr.innerHTML = \`
              <td class="p-3"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold \${t.status === 'APPROVED' || t.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10' : t.status === 'REJECTED' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'}">\${t.status}</span></td>
              <td class="p-3 font-semibold">\${t.type}</td>
              <td class="p-3 text-slate-300">\${t.userPhone}</td>
              <td class="p-3 text-slate-400">\${t.method}</td>
              <td class="p-3 font-bold text-white">₱\${t.amount.toLocaleString()}</td>
              <td class="p-3 text-slate-500 font-mono">\${t.referenceNo}</td>
              <td class="p-3 text-slate-400 text-[11px]">\${t.approvedBy || '-'}</td>
            \`;
            allTbody.appendChild(tr);
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function approveTransaction(transactionId) {
      if (!confirm('Sigurado ka bang nais mong APRUBAHAN ang transaksyong ito?')) return;
      try {
        const res = await fetch('/api/admin/transactions/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId })
        });
        const data = await res.json();
        alert(data.message);
        loadTransactions();
      } catch (err) {
        alert('Action failed.');
      }
    }

    async function rejectTransaction(transactionId) {
      const reason = prompt('Ilagay ang dahilan ng pag-tanggi (Rejection Reason):', 'Invalid GCash Reference Number');
      if (reason === null) return;
      try {
        const res = await fetch('/api/admin/transactions/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId, reason })
        });
        const data = await res.json();
        alert(data.message);
        loadTransactions();
      } catch (err) {
        alert('Action failed.');
      }
    }

    // 2. Users List
    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (data.success) {
          const tbody = document.getElementById('usersTbody');
          if (data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-500">Walang naka-save na users. Lahat ng bagong mag-reregister sa main site ay lalabas dito.</td></tr>';
          } else {
            tbody.innerHTML = '';
            data.users.forEach(u => {
              const tr = document.createElement('tr');
              tr.className = 'hover:bg-slate-900/60';
              tr.innerHTML = \`
                <td class="p-3 text-slate-400 font-mono">\${u.id}</td>
                <td class="p-3 font-bold text-amber-400">\${u.phone}</td>
                <td class="p-3 text-slate-200">\${u.username}</td>
                <td class="p-3 font-bold text-emerald-400 font-mono">₱\${u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="p-3 font-mono text-slate-300">₱\${u.totalDeposited.toLocaleString()}</td>
                <td class="p-3 font-bold text-purple-400">VIP \${u.vipLevel}</td>
                <td class="p-3 font-mono text-cyan-300">\${u.referralCode}</td>
                <td class="p-3 text-slate-500">\${u.registeredAt}</td>
              \`;
              tbody.appendChild(tr);
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    // 3. Referrals
    async function loadReferrals() {
      try {
        const res = await fetch('/api/admin/referrals');
        const data = await res.json();
        if (data.success) {
          const tbody = document.getElementById('referralsTbody');
          tbody.innerHTML = '';
          const currentOrigin = window.location.origin;
          data.referrals.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-900/60';
            tr.innerHTML = \`
              <td class="py-2.5 font-bold text-amber-400">\${r.code}</td>
              <td class="py-2.5 text-slate-200">\${r.creatorName}</td>
              <td class="py-2.5 font-bold text-white">\${r.signups} players</td>
              <td class="py-2.5 text-emerald-400">\${r.commissionRate}%</td>
              <td class="py-2.5 text-slate-400 font-mono text-[11px]">
                <span class="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-cyan-300 select-all">\${currentOrigin}/?ref=\${r.code}</span>
              </td>
            \`;
            tbody.appendChild(tr);
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    document.getElementById('createRefForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('refCodeInput').value;
      const creatorName = document.getElementById('refNameInput').value;
      const commissionRate = document.getElementById('refRateInput').value;
      const feedback = document.getElementById('refFeedback');

      try {
        const res = await fetch('/api/admin/referrals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, creatorName, commissionRate })
        });
        const data = await res.json();
        feedback.className = data.success ? 'text-xs p-2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300' : 'text-xs p-2 rounded bg-red-950 border border-red-500 text-red-300';
        feedback.textContent = data.message;
        feedback.classList.remove('hidden');

        if (data.success) {
          document.getElementById('refCodeInput').value = '';
          document.getElementById('refNameInput').value = '';
          loadReferrals();
        }
      } catch (err) {
        feedback.className = 'text-xs p-2 rounded bg-red-950 border border-red-500 text-red-300';
        feedback.textContent = 'Failed to generate code.';
        feedback.classList.remove('hidden');
      }
    });

    // 4. Meta Integration
    async function loadMeta() {
      try {
        const res = await fetch('/api/admin/meta');
        const data = await res.json();
        if (data.success && data.config) {
          document.getElementById('metaPixelId').value = data.config.pixelId || '';
          document.getElementById('metaToken').value = data.config.accessToken || '';
          document.getElementById('metaTestCode').value = data.config.testEventCode || '';
          document.getElementById('chkRegistration').checked = data.config.trackRegistration;
          document.getElementById('chkDeposit').checked = data.config.trackDeposit;

          const eventsList = document.getElementById('metaEventsList');
          eventsList.innerHTML = '';
          (data.config.eventsLogged || []).forEach(evt => {
            const item = document.createElement('div');
            item.className = 'p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono';
            item.innerHTML = \`
              <div>
                <span class="font-bold text-blue-400 block">\${evt.eventName}</span>
                <span class="text-[10px] text-slate-500">\${evt.userPhone} · \${evt.timestamp}</span>
              </div>
              <div class="text-right">
                <span class="font-bold text-white">\${evt.value > 0 ? '₱' + evt.value.toLocaleString() : '-'}</span>
                <span class="text-[10px] text-emerald-400 font-bold block">SIGNAL \${evt.status}</span>
              </div>
            \`;
            eventsList.appendChild(item);
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    document.getElementById('metaConfigForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pixelId = document.getElementById('metaPixelId').value;
      const accessToken = document.getElementById('metaToken').value;
      const testEventCode = document.getElementById('metaTestCode').value;
      const trackRegistration = document.getElementById('chkRegistration').checked;
      const trackDeposit = document.getElementById('chkDeposit').checked;
      const feedback = document.getElementById('metaFeedback');

      try {
        const res = await fetch('/api/admin/meta/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pixelId, accessToken, testEventCode, trackRegistration, trackDeposit })
        });
        const data = await res.json();
        feedback.className = data.success ? 'text-xs p-2 rounded bg-blue-950 border border-blue-500 text-blue-300' : 'text-xs p-2 rounded bg-red-950 border border-red-500 text-red-300';
        feedback.textContent = data.message;
        feedback.classList.remove('hidden');
      } catch (err) {
        feedback.className = 'text-xs p-2 rounded bg-red-950 border border-red-500 text-red-300';
        feedback.textContent = 'Save failed.';
        feedback.classList.remove('hidden');
      }
    });

    // 4. Game Win Rates Management
    async function loadWinRates() {
      try {
        const res = await fetch('/api/admin/win-rates');
        const data = await res.json();
        if (data.success && data.winRates) {
          const container = document.getElementById('winRatesList');
          container.innerHTML = '';

          Object.values(data.winRates).forEach(g => {
            const card = document.createElement('div');
            card.className = 'p-5 bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl space-y-4 shadow-xl transition-all';
            card.innerHTML = \`
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span class="text-[10px] font-bold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">\${g.provider} · \${g.category.toUpperCase()}</span>
                  <h3 class="text-sm font-bold text-white mt-1">\${g.gameName}</h3>
                </div>
                <div class="text-right">
                  <span class="text-xs text-slate-500 block font-mono">ID: \${g.gameId}</span>
                  <span class="text-xs font-bold \${g.winRate >= 98 ? 'text-emerald-400' : g.winRate <= 90 ? 'text-red-400' : 'text-amber-400'} font-mono">
                    RTP: \${g.winRate}%
                  </span>
                </div>
              </div>

              <form onsubmit="submitWinRateUpdate(event, '\${g.gameId}')" class="space-y-3 text-xs">
                <div>
                  <div class="flex justify-between text-slate-400 mb-1">
                    <label class="font-semibold">Win Rate (RTP %)</label>
                    <span id="rateLabel_\${g.gameId}" class="font-mono text-amber-300 font-bold">\${g.winRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="0.5"
                    value="\${g.winRate}"
                    id="winRate_\${g.gameId}"
                    oninput="document.getElementById('rateLabel_\${g.gameId}').textContent = this.value + '%'"
                    class="w-full accent-amber-400 cursor-pointer"
                  />
                  <div class="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>50% (Hard)</span>
                    <span>97.6% (Standard)</span>
                    <span>100% (Sure Win)</span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-[11px] text-slate-400 block mb-1">Payout Multiplier</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      max="3.0"
                      value="\${g.payoutMultiplier}"
                      id="multiplier_\${g.gameId}"
                      class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label class="text-[11px] text-slate-400 block mb-1">Wild Bonus Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value="\${g.wildBonusRate}"
                      id="wildRate_\${g.gameId}"
                      class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-400"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-[11px] text-slate-400 block mb-1">Free Spin Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value="\${g.freeSpinRate}"
                      id="freeSpinRate_\${g.gameId}"
                      class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label class="text-[11px] text-slate-400 block mb-1">Rig / Volatility Mode</label>
                    <select id="rigMode_\${g.gameId}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-400 font-bold text-xs focus:border-amber-400">
                      <option value="BALANCED" \${g.rigMode === 'BALANCED' ? 'selected' : ''}>Balanced (Normal)</option>
                      <option value="HIGH_PAYOUT" \${g.rigMode === 'HIGH_PAYOUT' ? 'selected' : ''}>High Payout (Easy)</option>
                      <option value="LOW_PAYOUT" \${g.rigMode === 'LOW_PAYOUT' ? 'selected' : ''}>Low Payout (House Favored)</option>
                      <option value="JACKPOT_HUNT" \${g.rigMode === 'JACKPOT_HUNT' ? 'selected' : ''}>Jackpot Hunt (Crazy Big Wins)</option>
                    </select>
                  </div>
                </div>

                <div id="feedback_\${g.gameId}" class="hidden p-2 rounded text-[11px]"></div>

                <button
                  type="submit"
                  class="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 shadow transition-all"
                >
                  I-Save ang Bagong Win Rate
                </button>
              </form>
            \`;
            container.appendChild(card);
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function submitWinRateUpdate(e, gameId) {
      e.preventDefault();
      const winRate = document.getElementById('winRate_' + gameId).value;
      const payoutMultiplier = document.getElementById('multiplier_' + gameId).value;
      const wildBonusRate = document.getElementById('wildRate_' + gameId).value;
      const freeSpinRate = document.getElementById('freeSpinRate_' + gameId).value;
      const rigMode = document.getElementById('rigMode_' + gameId).value;
      const feedback = document.getElementById('feedback_' + gameId);

      try {
        const res = await fetch('/api/admin/win-rates/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, winRate, payoutMultiplier, wildBonusRate, freeSpinRate, rigMode })
        });
        const data = await res.json();
        feedback.className = data.success ? 'p-2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold block text-[11px]' : 'p-2 rounded bg-red-950 border border-red-500 text-red-300 font-bold block text-[11px]';
        feedback.textContent = data.message;
        setTimeout(() => {
          feedback.className = 'hidden';
        }, 3500);
      } catch (err) {
        feedback.className = 'p-2 rounded bg-red-950 border border-red-500 text-red-300 font-bold block text-[11px]';
        feedback.textContent = 'Failed to save win rate settings.';
      }
    }

    async function sendMetaTestEvent() {
      try {
        const res = await fetch('/api/admin/meta/test-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventName: 'TestLeadTrigger', value: 500 })
        });
        const data = await res.json();
        alert(data.message);
        loadMeta();
      } catch (err) {
        alert('Test failed.');
      }
    }
  </script>
</body>
</html>`;

  res.send(adminHtml);
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
