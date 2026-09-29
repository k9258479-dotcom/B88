import { UserProfile, Transaction, Promotion, VIPTier, SlotSpinResponse } from '../types';

export const api = {
  // User & Auth
  async getCurrentUser(): Promise<{ success: boolean; user: UserProfile }> {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) throw new Error('Not JSON');
      return await res.json();
    } catch {
      return {
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
      if (!res.ok) throw new Error('Failed');
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) throw new Error('Not JSON');
      return await res.json();
    } catch {
      return { success: true, balance: 0, currency: 'PHP', transactions: [] };
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
      if (!res.ok) throw new Error('Failed');
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) throw new Error('Not JSON');
      return await res.json();
    } catch {
      return {
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
          }
        ]
      };
    }
  },

  async getVipInfo(): Promise<{ success: boolean; currentLevel: number; points: number; nextLevelPoints: number; levels: VIPTier[] }> {
    try {
      const res = await fetch('/api/vip');
      if (!res.ok) throw new Error('Failed');
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) throw new Error('Not JSON');
      return await res.json();
    } catch {
      return {
        success: true,
        currentLevel: 1,
        points: 0,
        nextLevelPoints: 1000,
        levels: [
          { level: 1, name: 'Bronze Explorer', pointsReq: 0, dailyRebate: '0.6%', birthdayGift: '₱288', upgradeBonus: '₱88' },
          { level: 2, name: 'Silver High Roller', pointsReq: 1000, dailyRebate: '0.8%', birthdayGift: '₱588', upgradeBonus: '₱288' },
          { level: 3, name: 'Gold VIP Champion', pointsReq: 5000, dailyRebate: '1.0%', birthdayGift: '₱1,288', upgradeBonus: '₱888' },
          { level: 4, name: 'Platinum Grandmaster', pointsReq: 25000, dailyRebate: '1.2%', birthdayGift: '₱3,888', upgradeBonus: '₱2,888' },
          { level: 5, name: 'Diamond Royal King', pointsReq: 100000, dailyRebate: '1.5%', birthdayGift: '₱8,888', upgradeBonus: '₱8,888' },
        ]
      };
    }
  }
};
