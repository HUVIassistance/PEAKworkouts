import React, { useState } from 'react';
import { ExerciseDefinition, MuscleGroup } from '../types/workout.ts';
import { ExerciseVisual } from './ExerciseVisual.tsx';
import {
  Search,
  Dumbbell,
  Clock,
  X,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';

interface ExerciseLibraryViewProps {
  exercises: ExerciseDefinition[];
  onStartSingleExerciseWorkout: (exercise: ExerciseDefinition) => void;
}

export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({
  exercises,
  onStartSingleExerciseWorkout,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [calisthenicsOnly, setCalisthenicsOnly] = useState(false);
  const [inspectExercise, setInspectExercise] = useState<ExerciseDefinition | null>(null);

  const categories = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Triceps', 'Biceps', 'Jambes', 'Abdos'];

  const filtered = exercises.filter((ex) => {
    const matchesCategory =
      selectedCategory === 'Tous' || ex.category === selectedCategory;
    const matchesCalisthenics = !calisthenicsOnly || !!ex.isCalisthenics;
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.targetMuscle.toLowerCase().includes(search.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesCalisthenics && matchesSearch;
  });

  const getCategoryCount = (cat: string) => {
    if (cat === 'Tous') return exercises.length;
    return exercises.filter((e) => e.category === cat).length;
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (push-ups, dips, tractions, pike, curls...)"
            className="w-full bg-[#111a2e] border border-[#233556] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#f47b20] transition"
          />
        </div>

        {/* Calisthenics toggle */}
        <button
          type="button"
          onClick={() => setCalisthenicsOnly(!calisthenicsOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 self-start sm:self-auto ${
            calisthenicsOnly
              ? 'bg-[#f47b20] text-white border-[#f47b20]'
              : 'bg-[#111a2e] text-slate-400 hover:text-white border-[#233556]'
          }`}
        >
          <span>Poids du corps & calisthénie ({exercises.filter((e) => e.isCalisthenics).length})</span>
        </button>
      </div>

      {/* Explanatory banner on indicative defaults vs workout custom values */}
      <div className="bg-[#111a2e]/80 border border-[#233556] rounded-xl p-2.5 flex items-center gap-2 text-xs text-slate-300">
        <Info className="w-4 h-4 text-[#f47b20] shrink-0" />
        <p className="text-[11px] text-slate-300">
          <strong>Repères indicatifs :</strong> les séries et répétitions affichées ci-dessous sont des valeurs de référence suggérées. Chaque séance (workout) configure ses propres cibles, que vous pouvez ajuster librement lors de l'entraînement.
        </p>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === cat
                ? 'bg-[#18253d] text-white border border-[#f47b20]'
                : 'bg-[#111a2e] text-slate-400 hover:text-white border border-[#233556]'
            }`}
          >
            <span>{cat}</span>
            <span className="text-[10px] opacity-75 font-mono">
              ({getCategoryCount(cat)})
            </span>
          </button>
        ))}
      </div>

      {/* Grid of Exercises */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            onClick={() => setInspectExercise(ex)}
            className="bg-[#111a2e] border border-[#233556] hover:border-slate-600 rounded-xl p-3.5 shadow-md hover:shadow-lg transition cursor-pointer flex flex-col justify-between space-y-2.5 group"
          >
            <ExerciseVisual
              iconKey={ex.iconKey}
              exerciseName={ex.name}
              category={ex.category}
              targetMuscle={ex.targetMuscle}
              compact
              className="h-24"
            />

            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <h4 className="text-xs font-bold text-white group-hover:text-[#f47b20] transition truncate">
                  {ex.name}
                </h4>
                {ex.isCalisthenics && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded">
                    Calisthénie
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {ex.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
              <span className="truncate max-w-[130px] font-medium text-slate-300">
                {ex.equipment}
              </span>
              <span className="font-mono text-[#f47b20] font-semibold text-[10px]" title="Repères indicatifs suggérés">
                Suggéré : {ex.defaultSets}×{ex.defaultReps}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Inspection Modal */}
      {inspectExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-md w-full p-5 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
            <button
              type="button"
              onClick={() => setInspectExercise(null)}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f47b20]/20 text-[#f47b20] border border-[#f47b20]/30">
                  {inspectExercise.category}
                </span>
                <span className="text-xs text-slate-400">
                  {inspectExercise.equipment}
                </span>
                {inspectExercise.isCalisthenics && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Poids du corps
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white">{inspectExercise.name}</h3>
            </div>

            <ExerciseVisual
              iconKey={inspectExercise.iconKey}
              exerciseName={inspectExercise.name}
              category={inspectExercise.category}
              targetMuscle={inspectExercise.targetMuscle}
              secondaryMuscles={inspectExercise.secondaryMuscles}
              className="h-36"
            />

            <div className="bg-[#16223b] border border-[#233556] rounded-xl p-3 space-y-2 text-xs">
              <div>
                <span className="font-semibold text-slate-300 uppercase tracking-wide text-[10px] block">
                  Description et posture
                </span>
                <p className="text-slate-300 mt-0.5 leading-relaxed text-[11px]">
                  {inspectExercise.description}
                </p>
              </div>

              {inspectExercise.tips && (
                <div className="bg-[#111a2e] border-l-2 border-[#f47b20] p-2 rounded-r-lg">
                  <span className="font-bold text-[#f47b20] text-[10px] block">
                    Conseil d'exécution
                  </span>
                  <p className="text-slate-300 text-[11px] mt-0.5">{inspectExercise.tips}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Repères indicatifs suggérés :
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Séries</span>
                  <span className="font-mono font-bold text-sm text-white">{inspectExercise.defaultSets}</span>
                </div>
                <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Répétitions</span>
                  <span className="font-mono font-bold text-sm text-white">{inspectExercise.defaultReps}</span>
                </div>
                <div className="bg-[#16223b] border border-[#233556] rounded-xl p-2">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block">Repos</span>
                  <span className="font-mono font-bold text-sm text-[#f47b20]">{inspectExercise.restSeconds}s</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic text-center pt-0.5">
                Note : ces valeurs sont personnalisables pour chaque workout (séance).
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onStartSingleExerciseWorkout(inspectExercise);
                  setInspectExercise(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-[#f47b20] hover:bg-[#e06810] text-white shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>Démarrer un entraînement avec cet exercice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
