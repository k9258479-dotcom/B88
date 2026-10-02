import React from 'react';
import { X, Sparkles, Trophy } from 'lucide-react';

interface RemainingPrizesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bet: number;
  eliminatedMultipliers: Set<number>;
}

const STANDARD_TIER = [0.1, 0.5, 10];
const HIGH_TIER = [50, 100, 200, 300, 500, 1000];

export const RemainingPrizesDrawer: React.FC<RemainingPrizesDrawerProps> = ({
  isOpen,
  onClose,
  bet,
  eliminatedMultipliers,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-gradient-to-b from-[#24080d] via-[#140306] to-[#080102] border-2 border-yellow-500/50 rounded-2xl shadow-2xl p-4 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-yellow-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black text-gold-gradient uppercase tracking-wide">
                Paytable Multipliers
              </h2>
              <p className="text-[10px] text-zinc-400">
                6 na Matataas na Premyo • 19 na Regular Boxes (0.1x, 0.5x, 10x)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-yellow-400 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Column Board */}
        <div className="flex-1 overflow-y-auto py-3 grid grid-cols-2 gap-3 font-mono text-xs">
          {/* Standard Tier Column */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase text-zinc-400 pb-1 border-b border-zinc-800 text-center">
              Regular Boxes (19 pcs)
            </div>
            {STANDARD_TIER.map((mul) => {
              const amount = Math.round(bet * mul);
              return (
                <div
                  key={mul}
                  className="p-2 rounded-xl bg-zinc-900/90 border border-yellow-500/30 text-amber-300 font-bold shadow-sm flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{mul}x</span>
                    <span className="text-emerald-400">₱{amount.toLocaleString()}</span>
                  </div>
                  <span className="text-[9px] text-zinc-400 font-sans">
                    {mul === 0.1
                      ? '7 boxes sa grid'
                      : mul === 0.5
                      ? '7 boxes sa grid'
                      : '5 boxes sa grid'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 6 High Multipliers Column */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-amber-400 pb-1 border-b border-zinc-800 text-center flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-400" /> 6 na Matataas (Jackpot)
            </div>
            {HIGH_TIER.map((mul) => {
              const isOut = eliminatedMultipliers.has(mul);
              const amount = Math.round(bet * mul);
              const isGrand = mul === 1000;
              return (
                <div
                  key={mul}
                  className={`p-1.5 rounded-lg border flex items-center justify-between text-[11px] transition-all ${
                    isOut
                      ? 'bg-zinc-950/80 border-rose-900/30 text-zinc-600 line-through opacity-50'
                      : isGrand
                      ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border-yellow-400 text-yellow-300 font-black shadow-[0_0_10px_rgba(255,215,0,0.4)] animate-pulse'
                      : 'bg-amber-950/40 border-amber-500/50 text-amber-200 font-black shadow-sm'
                  }`}
                >
                  <span>{mul}x</span>
                  <span>₱{amount >= 1000 ? `${(amount / 1000).toLocaleString()}k` : amount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 border-t border-yellow-500/20 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black uppercase text-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            Bumalik sa Laro (Resume)
          </button>
        </div>
      </div>
    </div>
  );
};
