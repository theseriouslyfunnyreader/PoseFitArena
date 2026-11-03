import React from 'react';
import { Award, Zap, Flame, RotateCcw, ArrowRight } from 'lucide-react';
import { WorkoutSessionRecord } from '../types';
import { EXERCISES } from '../utils/exercises';

interface SessionSummaryModalProps {
  record: WorkoutSessionRecord;
  onPlayAgain: () => void;
  onReturnMenu: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  record,
  onPlayAgain,
  onReturnMenu,
}) => {
  const exercise = EXERCISES[record.exerciseId];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
          <Award className="w-8 h-8 text-emerald-400" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-1">Workout Complete!</h2>
        <p className="text-sm text-slate-400 mb-6">
          {exercise?.name || 'Exercise'} • {record.mode === 'challenge30' ? '30s Challenge' : 'Free Play'}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center">
            <span className="text-3xl font-black font-mono text-emerald-400">{record.reps}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
              Reps Logged
            </span>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center">
            <span className="text-3xl font-black font-mono text-amber-400">+{record.points}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
              Points Earned
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/50 flex items-center justify-center gap-2 col-span-2">
            <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
            <span className="text-sm font-bold text-orange-300">
              Active Streak Multiplier: {record.multiplier}x
            </span>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col w-full gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            onClick={onReturnMenu}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

