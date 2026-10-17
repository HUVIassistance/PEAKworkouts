import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Plus, SkipForward, Flame } from 'lucide-react';
import { soundEngine } from '../utils/audio.ts';

interface WorkoutTimerProps {
  elapsedSeconds: number;
  isElapsedRunning: boolean;
  onToggleElapsed: () => void;
  onResetElapsed: () => void;

  restSecondsLeft: number;
  restTotalDuration: number;
  isRestActive: boolean;
  onStartRest: (duration: number) => void;
  onAdjustRest: (secondsDelta: number) => void;
  onSkipRest: () => void;

  soundEnabled: boolean;
  onToggleSound: () => void;
  compact?: boolean;
}

export const WorkoutTimer: React.FC<WorkoutTimerProps> = ({
  elapsedSeconds,
  isElapsedRunning,
  onToggleElapsed,
  onResetElapsed,
  restSecondsLeft,
  restTotalDuration,
  isRestActive,
  onStartRest,
  onAdjustRest,
  onSkipRest,
  soundEnabled,
  onToggleSound,
  compact = false,
}) => {
  const lastTickSecond = useRef<number | null>(null);

  // Audio countdown trigger on 3, 2, 1 and completion
  useEffect(() => {
    if (!isRestActive) return;

    if (restSecondsLeft !== lastTickSecond.current) {
      lastTickSecond.current = restSecondsLeft;

      if (restSecondsLeft === 3 || restSecondsLeft === 2 || restSecondsLeft === 1) {
        soundEngine.playTick(restSecondsLeft === 1 ? 880 : 700);
      } else if (restSecondsLeft === 0) {
        soundEngine.playRestComplete();
      }
    }
  }, [restSecondsLeft, isRestActive]);

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const restPercent = restTotalDuration > 0
    ? Math.max(0, Math.min(100, ((restTotalDuration - restSecondsLeft) / restTotalDuration) * 100))
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-[#111a2e]/95 border border-[#233556] rounded-xl px-3 py-1.5 shadow-lg backdrop-blur">
        {/* Elapsed Timer */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleElapsed}
            className="p-1 rounded-md bg-[#1e2a42] text-slate-300 hover:text-white hover:bg-[#283858] transition"
          >
            {isElapsedRunning ? <Pause className="w-3.5 h-3.5 text-[#f47b20]" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Chrono</span>
            <span className="font-mono-numbers text-xs font-bold text-white tracking-wide">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-slate-700/60" />

        {/* Rest Timer */}
        <div className="flex items-center gap-2">
          {isRestActive ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-[#f47b20] font-bold animate-pulse">Repos</span>
                <span className="font-mono-numbers text-xs font-black text-[#f47b20]">
                  {formatTime(restSecondsLeft)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAdjustRest(15)}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1e2a42] text-slate-300 hover:bg-[#f47b20] hover:text-white transition"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={onSkipRest}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Passer le repos"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onStartRest(60)}
              className="text-[11px] font-semibold text-[#f47b20] bg-[#f47b20]/15 hover:bg-[#f47b20]/25 border border-[#f47b20]/30 px-2 py-1 rounded-lg transition"
            >
              + Repos (60s)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-xl relative overflow-hidden">
      {isRestActive && (
        <div className="absolute inset-0 bg-radial from-[#f47b20]/10 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Left: Global Workout Chronometer */}
        <div className="flex flex-col justify-center space-y-1 bg-[#0d1424] border border-[#233556] rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isElapsedRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              Temps d'entraînement
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleSound}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={soundEnabled ? 'Désactiver les sons' : 'Activer les alertes sonores'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[#f47b20]" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onResetElapsed}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Réinitialiser le chrono"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-mono-numbers text-3xl sm:text-4xl font-extrabold text-white tracking-wider">
              {formatTime(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={onToggleElapsed}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-md ${
                isElapsedRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-[#f47b20] hover:bg-[#e06810] text-white'
              }`}
            >
              {isElapsedRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Reprendre
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Rest Timer */}
        <div className={`flex flex-col justify-center rounded-xl p-3 border transition-all ${
          isRestActive
            ? 'bg-[#152033] border-[#f47b20] shadow-[0_0_15px_rgba(244,123,32,0.2)]'
            : 'bg-[#0d1424] border-[#233556]'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 text-slate-400">
              <Flame className={`w-3.5 h-3.5 ${isRestActive ? 'text-[#f47b20] animate-bounce' : 'text-slate-500'}`} />
              <span className={isRestActive ? 'text-white' : ''}>Chronomètre de repos</span>
            </span>

            {isRestActive && (
              <span className="text-[10px] font-semibold text-[#f47b20] bg-[#f47b20]/15 px-2 py-0.5 rounded-full border border-[#f47b20]/30 animate-pulse">
                Récupération
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono-numbers text-3xl sm:text-4xl font-black tracking-tight flex items-baseline gap-1">
              <span className={isRestActive ? 'text-[#f47b20]' : 'text-slate-400'}>
                {formatTime(restSecondsLeft)}
              </span>
              {isRestActive && (
                <span className="text-xs text-slate-400 font-medium">/ {formatTime(restTotalDuration)}</span>
              )}
            </div>

            {/* Quick buttons */}
            {isRestActive ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onAdjustRest(15)}
                  className="px-2 py-1.5 rounded-lg text-xs font-bold bg-[#1e2a42] hover:bg-[#f47b20] text-white transition flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> 15s
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustRest(30)}
                  className="px-2 py-1.5 rounded-lg text-xs font-bold bg-[#1e2a42] hover:bg-[#f47b20] text-white transition flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> 30s
                </button>
                <button
                  type="button"
                  onClick={onSkipRest}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Passer le repos"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onStartRest(45)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#16223b] hover:bg-[#f47b20] text-slate-200 hover:text-white transition"
                >
                  45s
                </button>
                <button
                  type="button"
                  onClick={() => onStartRest(60)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#16223b] hover:bg-[#f47b20] text-slate-200 hover:text-white transition"
                >
                  60s
                </button>
                <button
                  type="button"
                  onClick={() => onStartRest(90)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#f47b20]/20 hover:bg-[#f47b20] text-[#f47b20] hover:text-white border border-[#f47b20]/40 transition"
                >
                  90s
                </button>
              </div>
            )}
          </div>

          {isRestActive && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f47b20] to-[#ff9f4d] transition-all duration-300 ease-linear shadow-[0_0_8px_#f47b20]"
                style={{ width: `${100 - restPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
