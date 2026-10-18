import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle, Clock, Dumbbell, Flame, Sparkles, X } from 'lucide-react';
import { ActiveExerciseItem } from '../types/workout.ts';
import { soundEngine } from '../utils/audio.ts';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string, feeling: '🔥 Top' | '💪 Bon' | '😐 Moyen' | '🥵 Difficile') => void;
  /** Enregistre la séance ET réécrit la prescription Notion avec le réalisé. */
  onSaveAndPromote?: (notes: string, feeling: '🔥 Top' | '💪 Bon' | '😐 Moyen' | '🥵 Difficile') => void;
  routineName: string;
  durationSeconds: number;
  exercises: ActiveExerciseItem[];
  personalRecords: Record<string, { maxWeight: number }>;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndPromote,
  routineName,
  durationSeconds,
  exercises,
  personalRecords,
}) => {
  const [notes, setNotes] = useState('');
  const [feeling, setFeeling] = useState<'🔥 Top' | '💪 Bon' | '😐 Moyen' | '🥵 Difficile'>('🔥 Top');

  useEffect(() => {
    if (isOpen) {
      soundEngine.playVictoryFanfare();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f47b20', '#111a2e', '#ff9f4d', '#3b82f6', '#10b981'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let totalVolume = 0;
  let totalSetsCompleted = 0;
  let totalSetsPlanned = 0;
  const newPrs: { name: string; weight: number }[] = [];

  exercises.forEach((ex) => {
    ex.sets.forEach((set) => {
      totalSetsPlanned++;
      if (set.completed) {
        totalSetsCompleted++;
        totalVolume += set.weight * set.reps;
        const currentPr = personalRecords[ex.name]?.maxWeight || 0;
        if (set.weight > currentPr && set.weight > 0) {
          if (!newPrs.some((p) => p.name === ex.name)) {
            newPrs.push({ name: ex.name, weight: set.weight });
          }
        }
      }
    });
  });

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111a2e] border border-[#f47b20] rounded-2xl max-w-md w-full p-5 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 mb-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-[#f47b20] to-[#ff9f4d] flex items-center justify-center shadow-md shadow-[#f47b20]/30 mb-2">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Séance terminée !</h2>
          <p className="text-xs text-slate-300">{routineName}</p>
        </div>

        {/* PR Alert if any */}
        {newPrs.length > 0 && (
          <div className="mb-3 bg-gradient-to-r from-amber-500/20 via-[#f47b20]/20 to-amber-500/20 border border-amber-500/40 rounded-xl p-2.5 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-300 block">Nouveau record personnel !</span>
              <span className="text-slate-200">
                {newPrs.map((p) => `${p.name} (${p.weight} kg)`).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2.5 text-center">
            <Clock className="w-3.5 h-3.5 text-[#f47b20] mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Durée</span>
            <span className="font-mono-numbers text-sm font-bold text-white">
              {formatDuration(durationSeconds)}
            </span>
          </div>

          <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2.5 text-center">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Volume</span>
            <span className="font-mono-numbers text-sm font-bold text-white">
              {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)} t` : `${totalVolume} kg`}
            </span>
          </div>

          <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2.5 text-center">
            <CheckCircle className="w-3.5 h-3.5 text-[#38bdf8] mx-auto mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Séries</span>
            <span className="font-mono-numbers text-sm font-bold text-white">
              {totalSetsCompleted}/{totalSetsPlanned}
            </span>
          </div>
        </div>

        {/* Feeling selector */}
        <div className="mb-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            Ressenti et intensité
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['🔥 Top', '💪 Bon', '😐 Moyen', '🥵 Difficile'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFeeling(opt)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition border ${
                  feeling === opt
                    ? 'bg-[#f47b20] text-white border-[#f47b20]'
                    : 'bg-[#16223b] text-slate-300 border-[#233556] hover:bg-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Notes et sensations (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Bonnes sensations aux barres de dips..."
            rows={2}
            className="w-full bg-[#16223b] border border-[#233556] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f47b20]"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Continuer
          </button>
          <button
            type="button"
            onClick={() => onSave(notes, feeling)}
            className="flex-1 py-2 rounded-xl font-bold text-xs bg-[#f47b20] hover:bg-[#e06810] text-white shadow-md transition flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Enregistrer et clôturer
          </button>
        </div>

        {onSaveAndPromote && (
          <button
            type="button"
            onClick={() => onSaveAndPromote(notes, feeling)}
            className="w-full py-2 rounded-xl font-semibold text-[11px] bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white border border-[#233556] hover:border-[#f47b20] transition flex items-center justify-center gap-1.5"
            title="Réécrit la prescription du workout Notion avec les séries et charges réellement faites"
          >
            Enregistrer + mettre à jour le programme Notion
          </button>
        )}
      </div>
    </div>
  );
};
