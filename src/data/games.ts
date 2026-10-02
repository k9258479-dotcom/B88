import { GameItem } from '../types';

export const GAMES_CATALOG: GameItem[] = [
  {
    id: 'game_super_ace',
    title: 'Super Ace',
    provider: 'JILI',
    category: 'slots',
    rtp: '97.6%',
    image: '/images/slot_golden_dragon_1790656596359.jpg',
    isHot: true,
    isJackpot: true,
    jackpotAmount: 8888888,
    playCount: '452.9k',
  },
  {
    id: 'game_deal_or_no_deal',
    title: 'Deal or No Deal',
    provider: 'BET88 ORIGINALS',
    category: 'arcade',
    rtp: '98.2%',
    image: '/images/deal_or_no_deal_cover.jpg',
    isHot: true,
    isJackpot: true,
    jackpotAmount: 10000000,
    playCount: '389.4k',
  },
];
