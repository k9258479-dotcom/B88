export interface Briefcase {
  id: number; // 1 to 25
  multiplier: number; // e.g. 0.1 to 1000
  isOpen: boolean;
  revealedOrder?: number;
}

export type GamePhase =
  | 'PLAYING' // Player can select box(es) to open OR take the Banker's DEAL
  | 'GAME_OVER'; // Outcome revealed (Accepted Deal or All Boxes Opened)

// 25 Multipliers for 25 Briefcases: Exactly 6 HIGH, and the rest 0.1, 0.5, 10x
export const BASE_MULTIPLIERS: number[] = [
  // 6 High Multipliers
  50, 100, 200, 300, 500, 1000,
  // 19 Standard Multipliers (0.1, 0.5, 10x)
  0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, // 7 of 0.1x
  0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, // 7 of 0.5x
  10, 10, 10, 10, 10,                 // 5 of 10x
];

export const PAYTABLE_MULTIPLIERS: number[] = [
  0.1, 0.5, 10, 50, 100, 200, 300, 500, 1000,
];

export interface ProvablyFairData {
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}
