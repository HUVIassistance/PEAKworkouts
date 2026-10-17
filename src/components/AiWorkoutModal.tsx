import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Dumbbell,
  Clock,
  Flame,
  RotateCw,
  Zap,
  Target,
} from 'lucide-react';
import { GeneratedWorkout } from '../server/workoutGenerator.ts';

interface AiWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGeneratedWorkout: (workout: GeneratedWorkout) => void;
  onSaveGeneratedRoutine: (workout: GeneratedWorkout) => void;
}

export const AiWorkoutModal: React.FC<AiWorkoutModalProps> = ({
  isOpen,
  onClose,
  onStartGeneratedWorkout,
  onSaveGeneratedRoutine,
}) => {
  const [goal, setGoal] = useState('Hypertrophie (prise de muscle)');
  const [muscleGroup, setMuscleGroup] = useState('Haut du corps (push + pull)');
  const [duration, setDuration] = useState(45);
  const [fitnessLevel, setFitnessLevel] = useState('Intermédiaire');
  const [equipment, setEquipment] = useState('Haltères, barres de traction et barres de dips');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  if (!isOpen) return null;

  const loadingMessages = [
    'Analyse de vos objectifs...',
    'Sélection des exercices au poids du corps et haltères...',
    'Calcul des charges et temps de repos...',
    'Finalisation du workout par l\'agent IA...',
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
    }, 1200);

    try {
      const response = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          muscleGroup,
          duration,
          fitnessLevel,
          equipment,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const data: GeneratedWorkout = await response.json();
      setGeneratedWorkout(data);
    } catch (err: any) {
      console.error('Error generating workout:', err);
      setErrorMsg(err.message || 'Impossible de joindre l\'agent IA.');
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-lg w-full p-5 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4 border-b border-[#233556] pb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f47b20] to-[#ff9f4d] flex items-center justify-center shadow-md shadow-[#f47b20]/30 shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#f47b20]">
                Agent IA
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300">
                Gemini 3.8
              </span>
            </div>
            <h2 className="text-base font-bold text-white">Générateur de workout IA</h2>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-3 border-[#233556] border-t-[#f47b20] animate-spin" />
              <Dumbbell className="w-6 h-6 text-[#f47b20] absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">L'agent IA prépare votre séance...</p>
              <p className="text-xs text-[#f47b20] mt-1">{loadingMessages[loadingStep]}</p>
            </div>
          </div>
        )}

        {/* Generated Workout Preview */}
        {!isLoading && generatedWorkout && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            <div className="bg-[#16223b] border border-[#f47b20]/40 rounded-xl p-3.5 space-y-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#f47b20]/20 text-[#f47b20]">
                Séance générée
              </span>
              <h3 className="text-base font-bold text-white">
                {generatedWorkout.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {generatedWorkout.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-700/60 text-xs text-slate-300">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#f47b20]" />
                  <span>~{generatedWorkout.estimatedDurationMinutes} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{generatedWorkout.difficulty}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>{generatedWorkout.exercises.length} exercices</span>
                </div>
              </div>
            </div>

            {/* Exercises list */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Exercices proposés ({generatedWorkout.exercises.length})
              </span>
              {generatedWorkout.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="bg-[#16223b]/70 border border-[#233556] rounded-xl p-2.5 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-md bg-[#233556] text-[#f47b20] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="text-xs font-bold text-white truncate">{ex.name}</h5>
                      <span className="text-[10px] font-mono font-bold text-[#f47b20] shrink-0">
                        {ex.defaultSets} × {ex.defaultReps}
                        {ex.defaultWeight > 0 ? ` @ ${ex.defaultWeight}kg` : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ex.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  onStartGeneratedWorkout(generatedWorkout);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#f47b20] hover:bg-[#e06810] text-white shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Lancer ce workout immédiatement</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSaveGeneratedRoutine(generatedWorkout);
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl font-semibold text-xs bg-[#16223b] hover:bg-[#233556] text-slate-200 border border-[#233556] transition"
              >
                Enregistrer la séance
              </button>

              <button
                type="button"
                onClick={() => setGeneratedWorkout(null)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Modifier les critères"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        {!isLoading && !generatedWorkout && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Muscle Group Focus */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Groupe musculaire ou focus
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Push + pull + core (calisthénie)',
                  'Épaules + pecs + renforcement',
                  'Haut du corps (barres et haltères)',
                  'Corps complet (full body)',
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMuscleGroup(item)}
                    className={`p-2 rounded-xl text-left text-xs font-medium transition border ${
                      muscleGroup === item
                        ? 'bg-[#f47b20] text-white border-[#f47b20]'
                        : 'bg-[#16223b] text-slate-300 border-[#233556] hover:bg-slate-800'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Équipement disponible
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full bg-[#16223b] border border-[#233556] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#f47b20]"
              >
                <option value="Haltères, barres de traction et barres de dips">Haltères, barre de traction et dips (votre matériel)</option>
                <option value="Poids du corps uniquement (calisthénie maison)">Poids du corps uniquement (calisthénie maison)</option>
                <option value="Haltères et banc uniquement">Haltères et banc uniquement</option>
                <option value="Salle de musculation complète">Salle de musculation complète</option>
              </select>
            </div>

            {/* Goal */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Objectif principal
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Hypertrophie (prise de muscle)',
                  'Force relative et gainage',
                  'Conditionnement et supersets',
                  'Perte de gras et définition',
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGoal(item)}
                    className={`p-2 rounded-xl text-xs font-medium transition border text-left ${
                      goal === item
                        ? 'bg-[#f47b20] text-white border-[#f47b20]'
                        : 'bg-[#16223b] text-slate-300 border-[#233556] hover:bg-slate-800'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider & Level */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Durée</span>
                  <span className="font-mono-numbers text-xs font-bold text-[#f47b20]">
                    {duration} min
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="75"
                  step="5"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full accent-[#f47b20] cursor-pointer"
                />
              </div>

              <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Niveau
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {['Débutant', 'Intermédiaire', 'Avancé'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFitnessLevel(lvl)}
                      className={`py-1 rounded text-[11px] font-semibold transition ${
                        fitnessLevel === lvl
                          ? 'bg-[#f47b20] text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Consignes spécifiques (optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: accent sur les bar dips et tractions en superset..."
                className="w-full bg-[#16223b] border border-[#233556] rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f47b20]"
              />
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#f47b20] to-[#ff9a47] hover:from-[#e06810] hover:to-[#f47b20] text-white shadow-md transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Générer ma séance d'entraînement</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
