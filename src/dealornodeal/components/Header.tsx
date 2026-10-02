import React, { useState } from 'react';
import { Volume2, VolumeX, HelpCircle, Plus } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  balance: number;
  bet: number;
  onBetChange: (newBet: number) => void;
  onOpenRules: () => void;
  onAddFunds: (amount: number) => void;
  isGameActive: boolean;
  onClose?: () => void;
  onOpenCashier?: () => void;
}

const BET_OPTIONS = [10, 20, 50, 100, 250, 500, 1000, 2500, 5000];

export const Header: React.FC<HeaderProps> = ({
  balance,
  bet,
  onBetChange,
  onOpenRules,
  onAddFunds,
  isGameActive,
  onClose,
  onOpenCashier,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);

  const toggleSound = () => {
    const newState = soundManager.toggle();
    setSoundEnabled(newState);
  };

  const decreaseBet = () => {
    soundManager.playClick();
    const currIndex = BET_OPTIONS.indexOf(bet);
    if (currIndex > 0) {
      onBetChange(BET_OPTIONS[currIndex - 1]);
    }
  };

  const increaseBet = () => {
    soundManager.playClick();
    const currIndex = BET_OPTIONS.indexOf(bet);
    if (currIndex < BET_OPTIONS.length - 1) {
      onBetChange(BET_OPTIONS[currIndex + 1]);
    }
  };

  return (
    <>
      <header className="relative z-30 pt-2.5 px-3 flex flex-col gap-2">
        {/* Balance, Bet & Utility Bar */}
        <div className="flex items-center justify-between gap-1.5 backdrop-blur-md bg-black/60 border border-yellow-500/30 rounded-2xl p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          {/* Balance Badge with Gold Coin */}
          <div
            onClick={() => {
              if (onOpenCashier) onOpenCashier();
              else setShowAddFundsModal(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#211105] to-[#120803] border border-amber-400/50 rounded-xl px-2.5 py-1 shadow-inner cursor-pointer hover:border-amber-300 transition-colors group"
            title="Click to reload balance / deposit"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 flex items-center justify-center text-black font-black text-xs shadow-[0_0_8px_rgba(255,215,0,0.8)] border border-yellow-100 flex-shrink-0 group-hover:scale-105 transition-transform">
              ₱
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[8px] uppercase tracking-wider text-amber-300/80 font-bold flex items-center gap-1">
                Total Balance <Plus className="w-2.5 h-2.5 text-amber-400 opacity-60 group-hover:opacity-100" />
              </span>
              <span className="text-xs font-black tracking-tight text-white drop-shadow font-mono tabular-nums">
                ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Bet Indicator with Interactive +/- */}
          <div className="flex items-center bg-[#170a0c] border border-yellow-500/40 rounded-xl px-1.5 py-0.5 shadow-inner">
            <button
              onClick={decreaseBet}
              disabled={isGameActive || bet <= BET_OPTIONS[0]}
              aria-label="Decrease Bet"
              className="w-5 h-5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-yellow-400 font-black flex items-center justify-center text-xs active:scale-90 border border-yellow-500/20 shadow transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              -
            </button>
            <div className="px-2 text-center leading-tight">
              <span className="block text-[7px] uppercase tracking-wider text-zinc-400 font-bold whitespace-nowrap">Bet / Box</span>
              <span className="text-[11px] font-black text-amber-300 font-mono tabular-nums">
                ₱{bet.toLocaleString()}
              </span>
            </div>
            <button
              onClick={increaseBet}
              disabled={isGameActive || bet >= BET_OPTIONS[BET_OPTIONS.length - 1]}
              aria-label="Increase Bet"
              className="w-5 h-5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-yellow-400 font-black flex items-center justify-center text-xs active:scale-90 border border-yellow-500/20 shadow transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          {/* Utility Buttons (Audio & Rules) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                soundManager.playClick();
                onOpenRules();
              }}
              aria-label="Game Info and Rules"
              className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#2a130c] to-[#160805] border border-amber-400/40 text-amber-300 text-xs flex items-center justify-center shadow hover:border-yellow-300 active:scale-95 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={toggleSound}
              aria-label={soundEnabled ? "Mute Audio" : "Unmute Audio"}
              className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#2a130c] to-[#160805] border border-amber-400/40 text-amber-300 text-xs flex items-center justify-center shadow hover:border-yellow-300 active:scale-95 transition-all cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>
            {onClose && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                }}
                aria-label="Exit Game to Lobby"
                className="w-7 h-7 rounded-xl bg-gradient-to-b from-red-950 to-red-900 border border-red-500/50 text-red-200 text-xs flex items-center justify-center shadow hover:border-red-400 active:scale-95 transition-all cursor-pointer font-bold"
                title="Bumalik sa Lobby"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Quick Reload Balance Modal */}
      {showAddFundsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xs bg-gradient-to-b from-[#25090f] to-[#120306] border-2 border-yellow-500/50 rounded-2xl p-4 shadow-2xl text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-yellow-500/20 border border-yellow-400 flex items-center justify-center text-yellow-300 font-black mb-2">
              ₱
            </div>
            <h3 className="text-sm font-black text-amber-300 uppercase">VIP Reload Chips</h3>
            <p className="text-[11px] text-zinc-400 mt-1 mb-3">Magdagdag ng chips sa iyong vault balance.</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[50000, 100000, 250000, 500000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    soundManager.playClick();
                    onAddFunds(amt);
                    setShowAddFundsModal(false);
                  }}
                  className="py-2 px-1 bg-black/60 border border-yellow-500/30 hover:border-yellow-400 rounded-xl text-xs font-bold text-amber-200 hover:text-white transition-all"
                >
                  +₱{(amt / 1000).toLocaleString()}k
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddFundsModal(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200 uppercase font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};
