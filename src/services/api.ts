import { UserProfile, Transaction, Promotion, VIPTier, SlotSpinResponse } from '../types';

export const api = {
  // User & Auth
  async getCurrentUser(): Promise<{ success: boolean; user: UserProfile }> {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      return await res.json();
    } catch {
      return {
        success: true,
        user: {
          id: 'usr_default',
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
        }
      };
    }
  },

  async login(phone: string, password: string): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || 'Login error' };
    }
  },

  async register(phone: string, password: string): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || 'Registration error' };
    }
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      return await res.json();
    } catch {
      return { success: true };
    }
  },

  // Wallet
  async getWallet(): Promise<{ success: boolean; balance: number; currency: string; transactions: Transaction[] }> {
    try {
      const res = await fetch('/api/wallet');
      return await res.json();
    } catch {
      return { success: true, balance: 5880, currency: 'PHP', transactions: [] };
    }
  },

  async deposit(amount: number, method: string, mobileNumber: string): Promise<{ success: boolean; message: string; newBalance?: number; transaction?: Transaction }> {
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, mobileNumber }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || 'Deposit failed' };
    }
  },

  async withdraw(amount: number, method: string, accountNumber: string, accountName: string): Promise<{ success: boolean; message: string; newBalance?: number; transaction?: Transaction }> {
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, accountNumber, accountName }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || 'Withdrawal failed' };
    }
  },

  // Game: Super Golden Fortune Slot
  async spinSlot(bet: number): Promise<SlotSpinResponse> {
    try {
      const res = await fetch('/api/games/slot/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });
      return await res.json();
    } catch (err: unknown) {
      return {
        success: false,
        grid: [],
        totalWin: 0,
        winningLines: [],
        freeSpinsWon: 0,
        scatterCount: 0,
        newBalance: 0,
        message: (err as Error).message || 'Spin failed'
      };
    }
  },

  // Game: Perya Color Game
  async rollColorGame(bets: Record<string, number>): Promise<{
    success: boolean;
    dice: string[];
    totalBet: number;
    totalWin: number;
    netProfit: number;
    matchDetails: Record<string, { matches: number; win: number }>;
    newBalance: number;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/games/color-game/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets }),
      });
      return await res.json();
    } catch (err: unknown) {
      return {
        success: false,
        dice: ['yellow', 'white', 'pink'],
        totalBet: 0,
        totalWin: 0,
        netProfit: 0,
        matchDetails: {},
        newBalance: 0,
        message: (err as Error).message
      };
    }
  },

  // Game: Diamond Mines
  async startMines(bet: number, minesCount: number): Promise<{
    success: boolean;
    sessionId?: string;
    minesCount?: number;
    bet?: number;
    nextMultiplier?: number;
    newBalance?: number;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/games/mines/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, minesCount }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message };
    }
  },

  async revealMineTile(sessionId: string, tileIndex: number): Promise<{
    success: boolean;
    hitMine?: boolean;
    tileIndex?: number;
    diamondsFound?: number;
    multiplier?: number;
    currentCashout?: number;
    nextMultiplier?: number;
    allMines?: number[];
    gameOver?: boolean;
    wonMax?: boolean;
    newBalance?: number;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/games/mines/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, tileIndex }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message };
    }
  },

  async cashoutMines(sessionId: string): Promise<{
    success: boolean;
    winAmount?: number;
    multiplier?: number;
    allMines?: number[];
    newBalance?: number;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/games/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message };
    }
  },

  // Game: Crash Rocket
  async placeCrashBet(bet: number): Promise<{ success: boolean; newBalance?: number; message?: string }> {
    try {
      const res = await fetch('/api/games/crash/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message };
    }
  },

  async cashoutCrash(bet: number, multiplier: number): Promise<{ success: boolean; winAmount?: number; newBalance?: number; message?: string }> {
    try {
      const res = await fetch('/api/games/crash/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, multiplier }),
      });
      return await res.json();
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message };
    }
  },

  // Promotions & VIP
  async getPromotions(): Promise<{ success: boolean; promotions: Promotion[] }> {
    try {
      const res = await fetch('/api/promotions');
      return await res.json();
    } catch {
      return { success: true, promotions: [] };
    }
  },

  async getVipInfo(): Promise<{ success: boolean; currentLevel: number; points: number; nextLevelPoints: number; levels: VIPTier[] }> {
    try {
      const res = await fetch('/api/vip');
      return await res.json();
    } catch {
      return { success: true, currentLevel: 2, points: 1450, nextLevelPoints: 3000, levels: [] };
    }
  }
};
