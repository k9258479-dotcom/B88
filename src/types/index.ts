export interface UserProfile {
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

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'WIN' | 'BET';
  amount: number;
  method: string;
  referenceNo: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  timestamp: string;
}

export type GameCategory = 'all' | 'slots' | 'live' | 'crash' | 'perya' | 'table' | 'fishing';

export interface GameItem {
  id: string;
  title: string;
  provider: 'JILI' | 'PG Soft' | 'Pragmatic Play' | 'Fa Chai' | 'Spribe' | 'Evolution' | 'Perya';
  category: GameCategory;
  rtp: string;
  image: string;
  isHot?: boolean;
  isJackpot?: boolean;
  jackpotAmount?: number;
  playCount: string;
  badge?: string;
}

export interface SlotSymbol {
  id: string;
  name: string;
  icon: string;
  isWild: boolean;
  isScatter: boolean;
}

export interface SlotSpinResponse {
  success: boolean;
  grid: SlotSymbol[][];
  totalWin: number;
  winningLines: Array<{
    lineId: number;
    lineName: string;
    symbolId: string;
    count: number;
    winAmount: number;
    path: number[];
  }>;
  freeSpinsWon: number;
  scatterCount: number;
  newBalance: number;
  message?: string;
}

export interface Promotion {
  id: string;
  title: string;
  tag: string;
  description: string;
  bonusRate: string;
  minDeposit: number;
  maxBonus: number;
  claimed: boolean;
}

export interface VIPTier {
  level: number;
  name: string;
  pointsReq: number;
  dailyRebate: string;
  birthdayGift: string;
  upgradeBonus: string;
}
