import React from 'react';
import { X, HelpCircle, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { PAYTABLE_MULTIPLIERS } from '../types/game';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBet: number;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, currentBet }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gradient-to-b from-[#24080d] via-[#150407] to-[#0a0103] border-2 border-yellow-500/50 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.35)] p-5 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-yellow-500/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gold-gradient tracking-wide uppercase">Golden Vault Rules</h2>
              <p className="text-[11px] text-amber-200/80 font-medium">VIP Deal or No Deal Casino Mechanics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-yellow-500/30 hover:border-yellow-400 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-xs leading-relaxed text-zinc-300">
          {/* Objective */}
          <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-3.5 space-y-1.5">
            <h3 className="font-bold text-amber-300 flex items-center gap-1.5 text-sm uppercase">
              <Trophy className="w-4 h-4 text-amber-400" /> Paano Maglaro (How to Play)
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-zinc-300 pl-1">
              <li><strong className="text-amber-200">Itakda ang Bet / Box:</strong> Gamitin ang +/- sa itaas upang piliin ang halaga ng iyong taya kada isang box.</li>
              <li><strong className="text-amber-200">Pumili ng Maleta:</strong> I-click ang kahit anong box (#1 hanggang #25) sa grid. Maaari kang pumili ng isa o higit pa.</li>
              <li><strong className="text-amber-200">Open Box:</strong> Pindutin ang <strong>Open Box</strong> upang buksan ang mga napili. Agad mong mapapanalunan ang <code>Bet × Multiplier</code> (hal. ₱1,000 × 0.8x = ₱800, o ₱1,000 × 10x = ₱10,000).</li>
              <li><strong className="text-amber-200">Claim:</strong> Pindutin ang <strong>Claim</strong> anumang oras upang kolektahin ang iyong kabuuang napanalunan at magsimula ng bagong board.</li>
            </ol>
          </div>

          {/* Paytable Grid */}
          <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-amber-300 flex items-center gap-1.5 text-sm uppercase">
                <Sparkles className="w-4 h-4 text-amber-400" /> Paytable (25 Multipliers)
              </h3>
              <span className="text-[10px] text-amber-400/90 font-mono">Current Bet: ₱{currentBet.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
              {PAYTABLE_MULTIPLIERS.map((mul) => {
                const prize = currentBet * mul;
                const isGrand = mul === 1000;
                return (
                  <div
                    key={mul}
                    className={`p-1.5 rounded-lg border ${
                      isGrand
                        ? 'bg-amber-500/20 border-yellow-400 text-yellow-300 font-black shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                        : mul >= 50
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 font-bold'
                        : 'bg-zinc-900/60 border-zinc-700/50 text-zinc-300'
                    }`}
                  >
                    <div className="font-bold">{mul}x</div>
                    <div className="text-[8px] text-zinc-400">₱{prize >= 1000 ? `${(prize / 1000).toFixed(0)}k` : prize}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RTP & Fair Play */}
          <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-3.5 space-y-1">
            <h3 className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Provably Fair & RTP
            </h3>
            <p className="text-zinc-400 text-[11px]">
              Lahat ng 25 maleta ay may nakatagong halaga na itinalaga gamit ang cryptographic SHA-256 hash bago ka magsimula.
              Ang Return to Player (RTP) ay <strong className="text-amber-300">97.45%</strong>. Ang Banker formula ay dynamic at patas.
            </p>
          </div>
        </div>

        {/* Footer Button */}
        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black uppercase tracking-wider text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all"
          >
            Naiintindihan Ko (Got It)
          </button>
        </div>
      </div>
    </div>
  );
};
