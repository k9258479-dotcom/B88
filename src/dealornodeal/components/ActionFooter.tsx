import React from 'react';
import { GamePhase } from '../types/game';
import { Sparkles } from 'lucide-react';

interface ActionFooterProps {
  phase: GamePhase;
  totalWon: number;
  topRemainingPrize: number;
  bet: number;
  gameId: string;
  onClaim: () => void;
  onOpenBox: () => void; // Open selected box(es) or 1 box directly
  onRestart: () => void;
  onOpenProvablyFair: () => void;
  onTogglePrizesDrawer: () => void;
  isOpeningBatch?: boolean;
  selectedCount?: number;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({
  phase,
  totalWon,
  topRemainingPrize,
  bet,
  gameId,
  onClaim,
  onOpenBox,
  onRestart,
  onOpenProvablyFair,
  onTogglePrizesDrawer,
  isOpeningBatch = false,
  selectedCount = 0,
}) => {
  return (
    <footer className="relative z-30 bg-gradient-to-t from-black via-[#160508]/95 to-transparent pt-2 pb-5 px-3.5 flex flex-col gap-2 border-t border-amber-500/30">
      {/* Simple Decision Controls: Claim & Open Box */}
      <div className="grid grid-cols-2 gap-3" data-purpose="decision-controls">
        {phase === 'PLAYING' && (
          <>
            {/* CLAIM BUTTON */}
            <button
              onClick={onClaim}
              disabled={isOpeningBatch}
              className="btn-3d-deal rounded-2xl py-3.5 px-3 text-center flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              <span className="text-white text-lg font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
                Claim
              </span>
            </button>

            {/* OPEN BOX BUTTON */}
            <button
              onClick={onOpenBox}
              disabled={isOpeningBatch}
              className="btn-3d-nodeal rounded-2xl py-3.5 px-3 text-center flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              <span className="text-white text-lg font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
                Open Box
              </span>
            </button>
          </>
        )}

        {phase === 'GAME_OVER' && (
          <button
            onClick={onRestart}
            className="col-span-2 btn-3d-deal rounded-2xl py-3.5 text-center flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-lg"
          >
            <span className="text-white text-lg font-black tracking-wider uppercase drop-shadow font-sans">
              Play Again
            </span>
          </button>
        )}
      </div>

      {/* Auxiliary bar: Live Board link & System info */}
      <div className="flex items-center justify-between text-[8px] text-zinc-400/90 px-1 pt-0.5">
        <span className="font-mono">Game ID: {gameId}</span>

        <button
          onClick={onTogglePrizesDrawer}
          className="text-amber-300 hover:text-yellow-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Paytable Board
        </button>

        <button
          onClick={onOpenProvablyFair}
          className="text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Provably Fair • RTP 97.45%
        </button>
      </div>
    </footer>
  );
};
