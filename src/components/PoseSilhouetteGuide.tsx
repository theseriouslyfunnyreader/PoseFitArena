import React from 'react';
import { ExerciseId } from '../types';

interface PoseSilhouetteGuideProps {
  exerciseId: ExerciseId;
  orientation: 'front' | 'side';
  stage?: string;
  className?: string;
}

export const PoseSilhouetteGuide: React.FC<PoseSilhouetteGuideProps> = ({
  exerciseId,
  orientation,
  className = '',
}) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl ${className}`}
    >
      <div className="flex items-center justify-between w-full px-1 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Form Guide
        </span>
        <span
          className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
            orientation === 'side'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {orientation === 'side' ? 'TURN SIDEWAYS' : 'FACING CAMERA'}
        </span>
      </div>

      {/* SVG Silhouette Diagram */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-emerald-400 stroke-current fill-none stroke-[3] stroke-linecap-round stroke-linejoin-round drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
        >
          {/* Ground indicator line */}
          <line x1="10" y1="92" x2="90" y2="92" stroke="#475569" strokeWidth="2" strokeDasharray="3 3" />

          {/* SQUATS: Front / Slight angled squat figure */}
          {exerciseId === 'squats' && (
            <g>
              <circle cx="50" cy="22" r="7" className="fill-emerald-400/20 stroke-emerald-400" />
              <line x1="50" y1="29" x2="50" y2="52" />
              {/* Arms out for balance */}
              <polyline points="28,40 50,34 72,40" />
              {/* Squat bent knees */}
              <polyline points="50,52 32,66 30,92" />
              <polyline points="50,52 68,66 70,92" />
            </g>
          )}

          {/* PUSH-UPS: Sideways horizontal body with bent elbows */}
          {exerciseId === 'pushups' && (
            <g>
              {/* Head */}
              <circle cx="24" cy="62" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              {/* Back / Body line from neck to heels */}
              <line x1="28" y1="65" x2="84" y2="78" />
              {/* Bent arms */}
              <polyline points="38,67 44,78 36,88" />
              {/* Feet contact point */}
              <line x1="84" y1="78" x2="88" y2="90" />
            </g>
          )}

          {/* PLANK HOLD: Completely straight sideways horizontal plank */}
          {exerciseId === 'plank_hold' && (
            <g>
              {/* Head */}
              <circle cx="22" cy="56" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              {/* Completely straight spine/leg line */}
              <line x1="26" y1="58" x2="86" y2="72" strokeWidth="4" className="stroke-emerald-300" />
              {/* Forearm or extended arm on ground */}
              <polyline points="36,60 38,76 46,76" />
              {/* Toes on ground */}
              <line x1="86" y1="72" x2="88" y2="90" />
            </g>
          )}

          {/* LUNGES: Sideways deep front 90 deg and back leg extended */}
          {exerciseId === 'lunges' && (
            <g>
              <circle cx="50" cy="18" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              {/* Upright Torso */}
              <line x1="50" y1="24" x2="50" y2="52" />
              {/* Front Leg at 90 degrees */}
              <polyline points="50,52 34,54 34,88" />
              {/* Back Leg lunging down */}
              <polyline points="50,52 68,68 84,86" />
            </g>
          )}

          {/* JUMPING JACKS: Star pose with wide arms & wide legs */}
          {exerciseId === 'jumping_jacks' && (
            <g>
              <circle cx="50" cy="18" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              <line x1="50" y1="24" x2="50" y2="56" />
              {/* High V arms */}
              <polyline points="20,16 50,32 80,16" />
              {/* Wide inverted V legs */}
              <polyline points="22,90 50,56 78,90" />
            </g>
          )}

          {/* BURPEES: Dynamic squat thrust silhouette */}
          {exerciseId === 'burpees' && (
            <g>
              <circle cx="30" cy="46" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              <line x1="34" y1="50" x2="72" y2="65" />
              <polyline points="42,54 44,72 40,88" />
              <polyline points="72,65 60,78 78,88" />
            </g>
          )}

          {/* TRICEP DIPS: Seated arm extension profile */}
          {exerciseId === 'tricep_dips' && (
            <g>
              <circle cx="45" cy="28" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              <line x1="45" y1="34" x2="45" y2="58" />
              {/* Bent arms behind */}
              <polyline points="45,40 58,54 58,72" />
              {/* Legs forward */}
              <polyline points="45,58 32,60 28,88" />
            </g>
          )}

          {/* HIGH KNEES: Running stance with one knee at 90 deg high */}
          {exerciseId === 'high_knees' && (
            <g>
              <circle cx="50" cy="18" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              <line x1="50" y1="24" x2="50" y2="52" />
              {/* High Knee lifted */}
              <polyline points="50,52 32,50 32,74" />
              {/* Standing Leg */}
              <line x1="50" y1="52" x2="62" y2="90" />
            </g>
          )}

          {/* BICYCLE CRUNCHES: Reclined with crossed opposite elbow-knee */}
          {exerciseId === 'bicycle_crunches' && (
            <g>
              <circle cx="26" cy="62" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              {/* Torso reclined */}
              <line x1="28" y1="66" x2="56" y2="78" />
              {/* Opposite elbow to knee meeting */}
              <polyline points="34,68 46,62 50,70" />
              <polyline points="56,78 48,64 68,58" />
              {/* Extended opposite leg */}
              <line x1="56" y1="78" x2="86" y2="72" />
            </g>
          )}

          {/* SHOULDER PRESSES: Upright stance with barbell/dumbbell press */}
          {exerciseId === 'shoulder_presses' && (
            <g>
              <circle cx="50" cy="22" r="6" className="fill-emerald-400/20 stroke-emerald-400" />
              <line x1="50" y1="28" x2="50" y2="60" />
              {/* Overhead arms */}
              <polyline points="28,14 36,28 50,30 64,28 72,14" />
              {/* Standing straight legs */}
              <line x1="46" y1="60" x2="42" y2="90" />
              <line x1="54" y1="60" x2="58" y2="90" />
            </g>
          )}
        </svg>
      </div>

      <div className="text-[10px] text-slate-300 font-medium text-center mt-1 max-w-[120px] leading-tight">
        {orientation === 'side' ? 'Stand side-on to webcam' : 'Face directly towards camera'}
      </div>
    </div>
  );
};

