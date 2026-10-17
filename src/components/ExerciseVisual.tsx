import React, { useState } from 'react';
import { ExerciseIconKey, MuscleGroup } from '../types/workout.ts';
import { Play, Pause, Info, Sparkles } from 'lucide-react';

interface ExerciseVisualProps {
  iconKey?: ExerciseIconKey | string;
  exerciseName: string;
  category: MuscleGroup | string;
  targetMuscle: string;
  secondaryMuscles?: string[];
  className?: string;
  compact?: boolean;
}

export const ExerciseVisual: React.FC<ExerciseVisualProps> = ({
  iconKey = 'generic',
  exerciseName,
  category,
  targetMuscle,
  secondaryMuscles = [],
  className = '',
  compact = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);

  // Render dedicated vector illustration for the specific movement
  const renderGraphic = () => {
    const key = (iconKey || '').toLowerCase();

    if (key.includes('bench') || key.includes('couché')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          {/* Bench frame */}
          <rect x="35" y="80" width="130" height="8" rx="3" fill="#233556" />
          <line x1="50" y1="88" x2="50" y2="110" stroke="#233556" strokeWidth="6" strokeLinecap="round" />
          <line x1="150" y1="88" x2="150" y2="110" stroke="#233556" strokeWidth="6" strokeLinecap="round" />
          {/* Athlete body lying */}
          <ellipse cx="60" cy="74" rx="10" ry="7" fill="#64748b" /> {/* Head */}
          <path d="M 70 76 Q 105 74 135 77" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" fill="none" /> {/* Torso */}
          {/* Target muscle highlight: CHEST */}
          <path d="M 85 70 Q 98 67 110 70" stroke="url(#glowOrange)" strokeWidth="6" strokeLinecap="round" fill="none" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
          {/* Legs bent down */}
          <path d="M 135 77 L 150 90 L 155 108" stroke="#475569" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Arms holding bar - animated up and down if enabled */}
          <g className={isAnimating ? 'animate-bounce duration-1000' : ''}>
            {/* Barbell */}
            <line x1="60" y1="46" x2="140" y2="46" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
            {/* Weights */}
            <rect x="62" y="32" width="6" height="28" rx="2" fill="#f47b20" />
            <rect x="132" y="32" width="6" height="28" rx="2" fill="#f47b20" />
            {/* Arms */}
            <path d="M 92 72 L 85 52 L 88 47" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M 108 72 L 115 52 L 112 47" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      );
    }

    if (key.includes('squat') || key.includes('leg') || key.includes('presse')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          {/* Floor ground line */}
          <line x1="30" y1="112" x2="170" y2="112" stroke="#233556" strokeWidth="3" strokeDasharray="6 4" />
          {/* Squatting athlete */}
          <circle cx="95" cy="35" r="9" fill="#64748b" /> {/* Head */}
          {/* Torso angle */}
          <path d="M 95 44 L 88 72" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" fill="none" />
          {/* Barbell across shoulders */}
          <g className={isAnimating ? 'animate-bounce duration-1000' : ''}>
            <line x1="50" y1="46" x2="140" y2="46" stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round" />
            <rect x="54" y="30" width="8" height="32" rx="2" fill="#f47b20" />
            <rect x="128" y="30" width="8" height="32" rx="2" fill="#f47b20" />
            {/* Hands gripping bar */}
            <circle cx="75" cy="46" r="4" fill="#cbd5e1" />
            <circle cx="115" cy="46" r="4" fill="#cbd5e1" />
          </g>
          {/* Target muscle highlight: QUADS & GLUTES */}
          <path d="M 88 72 L 115 76" stroke="url(#glowOrange)" strokeWidth="12" strokeLinecap="round" fill="none" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
          {/* Lower leg down to heel */}
          <path d="M 115 76 L 108 108" stroke="#475569" strokeWidth="9" strokeLinecap="round" fill="none" />
          <line x1="104" y1="110" x2="120" y2="110" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" /> {/* Foot */}
        </svg>
      );
    }

    if (key.includes('deadlift') || key.includes('soulevé')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          <line x1="30" y1="110" x2="170" y2="110" stroke="#233556" strokeWidth="3" />
          {/* Lifter standing with deadlift */}
          <circle cx="100" cy="24" r="8" fill="#64748b" />
          {/* Posterior chain highlighted: Back, glutes, hamstrings */}
          <path d="M 100 32 L 95 62" stroke="url(#glowOrange)" strokeWidth="11" strokeLinecap="round" fill="none" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
          <path d="M 95 62 L 97 85 L 98 108" stroke="#cbd5e1" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Barbell held at hip/thigh height */}
          <g className={isAnimating ? 'animate-bounce duration-1000' : ''}>
            <line x1="55" y1="72" x2="145" y2="72" stroke="#f1f5f9" strokeWidth="4" strokeLinecap="round" />
            <circle cx="60" cy="72" r="16" fill="#f47b20" />
            <circle cx="60" cy="72" r="8" fill="#111a2e" />
            <circle cx="140" cy="72" r="16" fill="#f47b20" />
            <circle cx="140" cy="72" r="8" fill="#111a2e" />
            {/* Arms extending down to bar */}
            <path d="M 100 36 L 90 70" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M 100 36 L 110 70" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      );
    }

    if (key.includes('pullup') || key.includes('traction')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          {/* Pullup bar at top */}
          <line x1="30" y1="20" x2="170" y2="20" stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
          <line x1="45" y1="10" x2="45" y2="20" stroke="#475569" strokeWidth="4" />
          <line x1="155" y1="10" x2="155" y2="20" stroke="#475569" strokeWidth="4" />
          {/* Athlete hanging */}
          <g className={isAnimating ? 'animate-bounce duration-1000' : ''}>
            {/* Hands on bar */}
            <circle cx="75" cy="20" r="4" fill="#cbd5e1" />
            <circle cx="125" cy="20" r="4" fill="#cbd5e1" />
            {/* Arms pulling */}
            <path d="M 75 20 L 88 38 L 94 48" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M 125 20 L 112 38 L 106 48" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
            {/* Head */}
            <circle cx="100" cy="35" r="8" fill="#64748b" />
            {/* Back (Lats) in V-taper highlighted */}
            <path d="M 94 46 L 100 78 L 106 46 Z" fill="url(#glowOrange)" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
            {/* Legs hanging */}
            <path d="M 100 78 L 97 108" stroke="#475569" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M 100 78 L 104 106" stroke="#475569" strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      );
    }

    if (key.includes('row') || key.includes('tirage')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          <line x1="30" y1="110" x2="170" y2="110" stroke="#233556" strokeWidth="3" />
          {/* Bent over row pose */}
          <circle cx="130" cy="40" r="8" fill="#64748b" />
          {/* Torso at 45 degree angle */}
          <path d="M 125 46 L 85 68" stroke="url(#glowOrange)" strokeWidth="12" strokeLinecap="round" fill="none" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
          {/* Legs bent */}
          <path d="M 85 68 L 92 88 L 86 108" stroke="#475569" strokeWidth="8" strokeLinecap="round" fill="none" />
          {/* Barbell rowing motion */}
          <g className={isAnimating ? 'animate-bounce duration-1000' : ''}>
            <line x1="90" y1="72" x2="135" y2="72" stroke="#f1f5f9" strokeWidth="4" strokeLinecap="round" />
            <rect x="92" y="62" width="6" height="20" rx="2" fill="#f47b20" />
            <rect x="130" y="62" width="6" height="20" rx="2" fill="#f47b20" />
            {/* Arms pulling elbows high */}
            <path d="M 115 52 L 120 62 L 115 72" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      );
    }

    if (key.includes('shoulder') || key.includes('militaire') || key.includes('élévation')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          <line x1="40" y1="112" x2="160" y2="112" stroke="#233556" strokeWidth="3" />
          {/* Standing athlete */}
          <circle cx="100" cy="42" r="8" fill="#64748b" />
          <path d="M 100 50 L 100 85" stroke="#94a3b8" strokeWidth="11" strokeLinecap="round" fill="none" />
          {/* Target muscle: SHOULDERS */}
          <circle cx="88" cy="54" r="7" fill="url(#glowOrange)" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
          <circle cx="112" cy="54" r="7" fill="url(#glowOrange)" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
          {/* Barbell overhead */}
          <g className={isAnimating ? 'animate-bounce duration-1000' : ''}>
            <line x1="50" y1="20" x2="150" y2="20" stroke="#f1f5f9" strokeWidth="4" strokeLinecap="round" />
            <rect x="52" y="8" width="6" height="24" rx="2" fill="#f47b20" />
            <rect x="142" y="8" width="6" height="24" rx="2" fill="#f47b20" />
            {/* Arms extended upward */}
            <path d="M 88 54 L 84 32 L 80 20" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M 112 54 L 116 32 L 120 20" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
          {/* Legs standing */}
          <path d="M 96 85 L 93 110" stroke="#475569" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M 104 85 L 107 110" stroke="#475569" strokeWidth="7" strokeLinecap="round" fill="none" />
        </svg>
      );
    }

    if (key.includes('curl') || key.includes('biceps')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          <circle cx="95" cy="30" r="8" fill="#64748b" />
          <path d="M 95 38 L 95 80" stroke="#94a3b8" strokeWidth="11" strokeLinecap="round" fill="none" />
          {/* Arm and Biceps peak */}
          <path d="M 95 45 L 98 62" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="104" cy="55" r="7" fill="url(#glowOrange)" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
          {/* Forearm and dumbbell flexing */}
          <g className={isAnimating ? 'animate-pulse duration-1000' : ''}>
            <path d="M 98 62 L 112 48" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none" />
            {/* Dumbbell */}
            <circle cx="115" cy="46" r="6" fill="#f47b20" />
            <line x1="110" y1="46" x2="120" y2="46" stroke="#f1f5f9" strokeWidth="3" />
          </g>
          {/* Legs standing */}
          <path d="M 92 80 L 88 110" stroke="#475569" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M 98 80 L 102 110" stroke="#475569" strokeWidth="7" strokeLinecap="round" fill="none" />
        </svg>
      );
    }

    if (key.includes('dip') || key.includes('triceps')) {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
          <defs>
            <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f47b20" />
              <stop offset="100%" stopColor="#ff9a47" />
            </linearGradient>
          </defs>
          {/* Parallel dip bars */}
          <line x1="45" y1="65" x2="155" y2="65" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
          <line x1="60" y1="65" x2="60" y2="110" stroke="#233556" strokeWidth="6" strokeLinecap="round" />
          <line x1="140" y1="65" x2="140" y2="110" stroke="#233556" strokeWidth="6" strokeLinecap="round" />
          {/* Athlete dipping */}
          <g className={isAnimating ? 'animate-bounce duration-1000' : ''}>
            <circle cx="100" cy="35" r="8" fill="#64748b" />
            <path d="M 100 43 L 102 75" stroke="#94a3b8" strokeWidth="11" strokeLinecap="round" fill="none" />
            {/* Triceps highlighted */}
            <path d="M 92 50 L 85 64" stroke="url(#glowOrange)" strokeWidth="6" strokeLinecap="round" fill="none" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
            <path d="M 108 50 L 115 64" stroke="url(#glowOrange)" strokeWidth="6" strokeLinecap="round" fill="none" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
            {/* Hands on bar */}
            <circle cx="85" cy="65" r="4" fill="#cbd5e1" />
            <circle cx="115" cy="65" r="4" fill="#cbd5e1" />
            {/* Legs bent backward */}
            <path d="M 102 75 L 112 88 L 108 102" stroke="#475569" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </svg>
      );
    }

    // Default / Generic athletic diagram
    return (
      <svg viewBox="0 0 200 120" className="w-full h-full text-slate-300">
        <defs>
          <linearGradient id="glowOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f47b20" />
            <stop offset="100%" stopColor="#ff9a47" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="30" r="12" fill="#64748b" />
        <path d="M 100 42 L 100 80" stroke="url(#glowOrange)" strokeWidth="14" strokeLinecap="round" fill="none" className="filter drop-shadow-[0_0_8px_rgba(244,123,32,0.8)]" />
        <line x1="70" y1="58" x2="130" y2="58" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
        <path d="M 92 80 L 80 110" stroke="#475569" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M 108 80 L 120 110" stroke="#475569" strokeWidth="8" strokeLinecap="round" fill="none" />
        <circle cx="70" cy="58" r="8" fill="#f47b20" />
        <circle cx="130" cy="58" r="8" fill="#f47b20" />
      </svg>
    );
  };

  return (
    <div
      className={`relative rounded-2xl bg-[#0f172a]/90 border border-[#233556] overflow-hidden flex flex-col items-center justify-between p-3 select-none ${className}`}
    >
      {/* Top badges */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f47b20]/20 text-[#f47b20] border border-[#f47b20]/30">
            {category}
          </span>
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
            {targetMuscle}
          </span>
        </div>

        {!compact && (
          <button
            type="button"
            onClick={() => setIsAnimating(!isAnimating)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-[#1e293b]/70 hover:bg-[#1e293b] border border-slate-700/60 transition"
            title={isAnimating ? 'Mettre en pause l\'animation' : 'Animer le mouvement'}
          >
            {isAnimating ? <Pause className="w-3 h-3 text-[#f47b20]" /> : <Play className="w-3 h-3 text-slate-300" />}
            <span className="hidden sm:inline">{isAnimating ? 'Animé' : 'Pause'}</span>
          </button>
        )}
      </div>

      {/* SVG Graphic Canvas */}
      <div className="w-full flex-1 max-h-[140px] my-1 flex items-center justify-center">
        {renderGraphic()}
      </div>

      {/* Muscle Focus Indicator footer */}
      <div className="w-full flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-1.5 px-1">
        <div className="flex items-center gap-1 text-slate-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#f47b20] inline-block shadow-[0_0_6px_#f47b20]" />
          <span>Cible: <strong className="text-white font-semibold">{targetMuscle}</strong></span>
        </div>
        {secondaryMuscles.length > 0 && (
          <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
            + {secondaryMuscles.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
};
