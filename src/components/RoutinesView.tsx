import React, { useState } from 'react';
import {
  WorkoutRoutine,
  ExerciseDefinition,
  TrainingProgram,
} from '../types/workout.ts';
import {
  Play,
  Plus,
  Sparkles,
  Clock,
  Dumbbell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Trash2,
  ArrowRight,
  FolderPlus,
  Check,
  Layers,
} from 'lucide-react';

interface RoutinesViewProps {
  routines: WorkoutRoutine[];
  programs: TrainingProgram[];
  activeProgramId: string;
  onSelectActiveProgram: (programId: string) => void;
  exercises: ExerciseDefinition[];
  onStartRoutine: (routine: WorkoutRoutine) => void;
  onCreateRoutine: (routine: WorkoutRoutine) => void;
  onDeleteRoutine: (routineId: string) => void;
  onCreateProgram: (program: TrainingProgram) => void;
  onDeleteProgram: (programId: string) => void;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  routines,
  programs,
  activeProgramId,
  onSelectActiveProgram,
  exercises,
  onStartRoutine,
  onCreateRoutine,
  onDeleteRoutine,
  onCreateProgram,
  onDeleteProgram,
}) => {
  const [viewMode, setViewMode] = useState<'active_program' | 'all_programs'>('active_program');
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // Modals
  const [showCreateWorkoutModal, setShowCreateWorkoutModal] = useState(false);
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);

  // New workout form state
  const [targetProgramId, setTargetProgramId] = useState<string>(activeProgramId);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');
  const [newRoutineDifficulty, setNewRoutineDifficulty] = useState<'Débutant' | 'Intermédiaire' | 'Avancé'>('Intermédiaire');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('Tous');
  const [exerciseConfigs, setExerciseConfigs] = useState<Record<string, {
    sets: number;
    reps: number;
    weight: number;
    restSeconds: number;
    executionMode: 'ordinaire' | 'superset';
  }>>({});

  // New program form state
  const [newProgName, setNewProgName] = useState('');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [newProgFrequency, setNewProgFrequency] = useState('3 séances par semaine (1 jour sur 2)');
  const [selectedExistingWorkoutIds, setSelectedExistingWorkoutIds] = useState<string[]>([]);

  // Inline delete confirmation states
  const [confirmDeleteWorkoutId, setConfirmDeleteWorkoutId] = useState<string | null>(null);
  const [confirmDeleteProgramId, setConfirmDeleteProgramId] = useState<string | null>(null);

  const activeProgram =
    programs.find((p) => p.id === activeProgramId) ||
    programs[0] || {
      id: 'prog-athlete-current',
      name: 'Programme calisthénie et haltères (A/B)',
      description: 'Programme en supersets alternant haut du corps, bas du corps et sangle abdominale.',
      frequency: '3 séances par semaine (1 jour sur 2)',
      workoutIds: ['seance-a-push-pull-core', 'seance-b-epaules-pecs-renfo'],
    };

  const activeProgramWorkouts = routines.filter((r) =>
    activeProgram?.workoutIds?.includes(r.id) || r.programId === activeProgram?.id
  );

  const handleCreateWorkoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;

    const routineExercises = selectedExerciseIds.map((id) => {
      const exDef = exercises.find((e) => e.id === id);
      const cfg = exerciseConfigs[id];
      return {
        exerciseId: id,
        sets: cfg ? cfg.sets : exDef ? exDef.defaultSets : 3,
        reps: cfg ? cfg.reps : exDef ? exDef.defaultReps : 10,
        weight: cfg ? cfg.weight : exDef ? exDef.defaultWeight : 0,
        restSeconds: cfg ? cfg.restSeconds : exDef ? exDef.restSeconds : 60,
        executionMode: cfg ? cfg.executionMode : 'ordinaire',
      };
    });

    const workoutId = `custom-workout-${Date.now()}`;
    const newRoutine: WorkoutRoutine = {
      id: workoutId,
      name: newRoutineName.trim(),
      description: newRoutineDesc.trim() || 'Séance personnalisée.',
      targetMuscles: ['Personnalisé'],
      estimatedDurationMinutes: Math.max(25, routineExercises.length * 8),
      difficulty: newRoutineDifficulty,
      exercises: routineExercises,
      isCustom: true,
      programId: targetProgramId,
      createdAt: new Date().toISOString(),
    };

    onCreateRoutine(newRoutine);

    // If assigned to a program, also append workoutId to that program
    const targetProg = programs.find((p) => p.id === targetProgramId);
    if (targetProg) {
      if (!targetProg.workoutIds.includes(workoutId)) {
        targetProg.workoutIds.push(workoutId);
        if (onCreateProgram) {
          onCreateProgram({ ...targetProg });
        }
      }
    }

    setShowCreateWorkoutModal(false);
    setNewRoutineName('');
    setNewRoutineDesc('');
    setSelectedExerciseIds([]);
  };

  const handleCreateProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgName.trim()) return;

    const newProgId = `custom-prog-${Date.now()}`;
    const newProg: TrainingProgram = {
      id: newProgId,
      name: newProgName.trim(),
      description: newProgDesc.trim() || 'Programme personnalisé.',
      frequency: newProgFrequency.trim() || '3 séances par semaine',
      workoutIds: [...selectedExistingWorkoutIds],
      isCustom: true,
    };

    if (onCreateProgram) {
      onCreateProgram(newProg);
    }
    onSelectActiveProgram(newProgId);
    setShowCreateProgramModal(false);
    setNewProgName('');
    setNewProgDesc('');
    setSelectedExistingWorkoutIds([]);
    setViewMode('active_program');
  };

  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExerciseIds((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((id) => id !== exerciseId);
      } else {
        if (!exerciseConfigs[exerciseId]) {
          const exDef = exercises.find((e) => e.id === exerciseId);
          setExerciseConfigs((cPrev) => ({
            ...cPrev,
            [exerciseId]: {
              sets: exDef ? exDef.defaultSets : 3,
              reps: exDef ? exDef.defaultReps : 12,
              weight: exDef ? exDef.defaultWeight : 0,
              restSeconds: exDef ? exDef.restSeconds : 60,
              executionMode: 'ordinaire',
            },
          }));
        }
        return [...prev, exerciseId];
      }
    });
  };

  const renderWorkoutCard = (routine: WorkoutRoutine) => {
    const isExpanded = expandedWorkoutId === routine.id;
    const isDeleting = confirmDeleteWorkoutId === routine.id;

    const groupedItems: { groupName: string; items: typeof routine.exercises }[] = [];
    routine.exercises.forEach((item) => {
      const groupName = item.supersetGroup || 'Exercices standards';
      const existing = groupedItems.find((g) => g.groupName === groupName);
      if (existing) {
        existing.items.push(item);
      } else {
        groupedItems.push({ groupName, items: [item] });
      }
    });

    return (
      <div
        key={routine.id}
        className="bg-[#111a2e] border border-[#233556] hover:border-slate-600 rounded-2xl overflow-hidden transition shadow-sm"
      >
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#18253d] text-slate-300 border border-[#233556]">
                {routine.difficulty}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-[#f47b20]" />
                ~{routine.estimatedDurationMinutes} min
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Dumbbell className="w-3 h-3 text-slate-400" />
                {routine.exercises.length} exercices
              </span>
              {groupedItems.some((g) => g.groupName.includes('Superset')) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f47b20]/15 text-[#f47b20]">
                  Supersets
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              {routine.name}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-1">
              {routine.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => setExpandedWorkoutId(isExpanded ? null : routine.id)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white border border-[#233556] transition flex items-center gap-1"
            >
              <span>{isExpanded ? 'Masquer' : 'Détails'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => onStartRoutine(routine)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#f47b20] hover:bg-[#e06810] text-white shadow-sm transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Démarrer</span>
            </button>

            {routine.isCustom && (
              <>
                {isDeleting ? (
                  <div className="flex items-center gap-1 bg-[#200f14] border border-rose-800 p-1 rounded-xl">
                    <span className="text-[9px] text-rose-300 font-bold px-1">Effacer ?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteRoutine(routine.id);
                        setConfirmDeleteWorkoutId(null);
                      }}
                      className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteWorkoutId(null)}
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWorkoutId(routine.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Supprimer la séance"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Exercises detail list */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-[#1c2a44] bg-[#0d1525]/80 space-y-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pt-1">
              Exercices et supersets
            </div>

            <div className="space-y-2">
              {groupedItems.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  {group.groupName !== 'Exercices standards' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#f47b20]/20 text-[#f47b20] border border-[#f47b20]/30 inline-block">
                      {group.groupName}
                    </span>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {group.items.map((item, iIdx) => {
                      const def = exercises.find((e) => e.id === item.exerciseId);
                      return (
                        <div
                          key={iIdx}
                          className="bg-[#111a2e] border border-[#233556] rounded-xl p-2 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-white block truncate">
                              {def?.name || item.exerciseId}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {def?.category || 'Exercice'} • {def?.equipment || 'Poids du corps'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-bold text-[#f47b20]">
                              {item.sets} × {item.reps}
                            </span>
                            {item.weight > 0 && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                @ {item.weight} kg
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Segmented Navigation: Active Program vs All Programs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#233556] pb-3">
        <div className="flex items-center gap-1.5 bg-[#111a2e] border border-[#233556] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('active_program')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'active_program'
                ? 'bg-[#f47b20] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Programme actif
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all_programs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'all_programs'
                ? 'bg-[#f47b20] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gérer les programmes ({programs.length})
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              setTargetProgramId(activeProgram.id);
              setShowCreateWorkoutModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-200 hover:text-white text-xs font-medium border border-[#233556] transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#f47b20]" />
            <span>Ajouter une séance</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateProgramModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-200 hover:text-white text-xs font-medium border border-[#233556] transition"
            title="Créer un nouveau programme complet"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#f47b20]" />
            <span>Nouveau programme</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: ACTIVE PROGRAM WITH DIRECT PROGRAM SWITCHER */}
      {viewMode === 'active_program' && (
        <div className="space-y-4">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 overflow-hidden w-full">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Programme actif actuellement
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                {activeProgram?.name}
              </h2>
              <p className="text-xs text-slate-300">
                {activeProgram?.description} • <strong className="text-[#f47b20] font-semibold">{activeProgram?.frequency}</strong>
              </p>
            </div>

            {/* Controls Bar - guaranteed to stay inside card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#1c2a44] w-full">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium shrink-0">Changer de programme :</span>
                <select
                  value={activeProgramId}
                  onChange={(e) => onSelectActiveProgram(e.target.value)}
                  className="bg-[#16223b] border border-[#233556] hover:border-[#f47b20] text-xs font-semibold text-white px-3 py-1.5 rounded-xl focus:outline-none transition cursor-pointer flex-1 sm:flex-none max-w-full sm:max-w-[240px] truncate"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === activeProgramId ? '✓' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTargetProgramId(activeProgram?.id || activeProgramId);
                  setShowCreateWorkoutModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#f47b20] hover:bg-[#e06810] text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une séance à ce programme</span>
              </button>
            </div>
          </div>

          {/* List of Séances inside Active Program */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-400 border-b border-[#233556] pb-1.5 flex items-center justify-between">
              <span>Séances du programme ({activeProgramWorkouts.length})</span>
              <span>Rythme : 1 séance tous les 2 jours</span>
            </div>

            {activeProgramWorkouts.length > 0 ? (
              activeProgramWorkouts.map((routine) => renderWorkoutCard(routine))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2 bg-[#111a2e] border border-[#233556] rounded-2xl p-6">
                <p>Aucune séance n'est encore configurée dans ce programme.</p>
                <button
                  type="button"
                  onClick={() => {
                    setTargetProgramId(activeProgram?.id || activeProgramId);
                    setShowCreateWorkoutModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#f47b20] text-white text-xs font-bold"
                >
                  Ajouter la première séance
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL PROGRAMS WITH DIRECT CHECKBOX SELECTION */}
      {viewMode === 'all_programs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Cochez la case pour définir le programme actif à suivre :
            </p>
            <button
              type="button"
              onClick={() => setShowCreateProgramModal(true)}
              className="text-xs font-semibold text-[#f47b20] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer un autre programme</span>
            </button>
          </div>

          <div className="space-y-3">
            {programs.map((prog) => {
              const isChecked = prog.id === activeProgramId;
              const programWorkouts = routines.filter((r) =>
                prog.workoutIds?.includes(r.id) || r.programId === prog.id
              );
              const isDeletingProg = confirmDeleteProgramId === prog.id;

              return (
                <div
                  key={prog.id}
                  className={`bg-[#111a2e] border rounded-2xl p-4 transition shadow-sm ${
                    isChecked ? 'border-[#f47b20] bg-[#142038]' : 'border-[#233556]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox / Radio toggle for Active Program */}
                      <button
                        type="button"
                        onClick={() => onSelectActiveProgram(prog.id)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                          isChecked
                            ? 'bg-[#f47b20] border-[#f47b20] text-white shadow-sm'
                            : 'border-[#233556] bg-[#0d1424] text-transparent hover:border-slate-500'
                        }`}
                        title={isChecked ? 'Programme actif' : 'Définir comme programme actif'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white">{prog.name}</h3>
                          {isChecked && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{prog.description}</p>
                        <div className="text-[11px] text-[#f47b20] font-semibold flex items-center gap-2">
                          <span>{prog.frequency}</span>
                          <span>•</span>
                          <span>{programWorkouts.length} séance{programWorkouts.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetProgramId(prog.id);
                          setShowCreateWorkoutModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] border border-[#233556] text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1"
                        title="Ajouter une séance à ce programme"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#f47b20]" />
                        <span>Ajouter une séance</span>
                      </button>

                      {!isChecked && (
                        <button
                          type="button"
                          onClick={() => onSelectActiveProgram(prog.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#0d1424] hover:bg-[#16223b] text-slate-300 hover:text-white border border-[#233556] text-xs font-semibold transition"
                        >
                          Choisir
                        </button>
                      )}

                      {prog.isCustom && (
                        <>
                          {isDeletingProg ? (
                            <div className="flex items-center gap-1 bg-[#200f14] border border-rose-800 p-1 rounded-xl">
                              <span className="text-[9px] text-rose-300 font-bold px-1">Effacer ?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onDeleteProgram) onDeleteProgram(prog.id);
                                  setConfirmDeleteProgramId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                              >
                                Oui
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteProgramId(null)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProgramId(prog.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                              title="Supprimer ce programme"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Program séances nested list */}
                  {programWorkouts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#233556]/60 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Séances incluses :
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {programWorkouts.map((w) => (
                          <div
                            key={w.id}
                            className="bg-[#0d1424] border border-[#233556] rounded-xl p-2 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-200 truncate pr-2">
                              {w.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => onStartRoutine(w)}
                              className="text-[11px] font-bold text-[#f47b20] hover:text-[#ffaa5c] flex items-center gap-1 shrink-0"
                            >
                              <span>Lancer</span>
                              <Play className="w-2.5 h-2.5 fill-current" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE WORKOUT MODAL (ADD SEANCE TO PROGRAM) */}
      {showCreateWorkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-lg w-full p-5 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-[#233556]">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#f47b20]" />
                <h3 className="font-bold text-white text-sm">
                  Ajouter une séance (workout)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWorkoutModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkoutSubmit} className="space-y-3">
              {/* Program selection */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Associer au programme
                </label>
                <select
                  value={targetProgramId}
                  onChange={(e) => setTargetProgramId(e.target.value)}
                  className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-2 text-xs text-white"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Nom de la séance
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Séance C : jambes et abdos"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f47b20]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Ex: Séance axée sur les squats et gainage"
                  value={newRoutineDesc}
                  onChange={(e) => setNewRoutineDesc(e.target.value)}
                  className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f47b20]"
                />
              </div>

              {/* Select Exercises */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Choisir les exercices ({selectedExerciseIds.length}) :
                  </label>
                  <input
                    type="text"
                    placeholder="Filtrer..."
                    value={exerciseSearchQuery}
                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                    className="bg-[#0d1424] border border-[#233556] rounded-lg px-2 py-0.5 text-[11px] text-white w-32 focus:outline-none focus:border-[#f47b20]"
                  />
                </div>

                {/* Category pills inside modal */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Triceps', 'Biceps', 'Jambes', 'Abdos'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setModalCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition ${
                        modalCategoryFilter === cat
                          ? 'bg-[#f47b20] text-white'
                          : 'bg-[#0d1424] text-slate-400 hover:text-white border border-[#233556]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 border border-[#233556] rounded-xl p-2 bg-[#0d1424]">
                  {exercises
                    .filter((ex) => {
                      const matchesCat = modalCategoryFilter === 'Tous' || ex.category === modalCategoryFilter;
                      const matchesSearch =
                        ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
                        ex.category.toLowerCase().includes(exerciseSearchQuery.toLowerCase());
                      return matchesCat && matchesSearch;
                    })
                    .map((ex) => {
                      const isSelected = selectedExerciseIds.includes(ex.id);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => toggleExerciseSelection(ex.id)}
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-[#18253d] border border-[#f47b20] text-white'
                              : 'bg-[#111a2e] text-slate-300 hover:bg-[#16223b]'
                          }`}
                        >
                          <div>
                            <span className="font-semibold block">{ex.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {ex.category} • {ex.equipment}
                            </span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                              isSelected
                                ? 'bg-[#f47b20] border-[#f47b20] text-white'
                                : 'border-[#233556]'
                            }`}
                          >
                            {isSelected && '✓'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Configure Selected Exercises (sets, reps, weight, mode) */}
              {selectedExerciseIds.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#233556]/80">
                  <span className="text-[10px] uppercase font-bold text-[#f47b20] block">
                    Personnaliser les séries & répétitions de cette séance :
                  </span>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedExerciseIds.map((exId) => {
                      const exDef = exercises.find((e) => e.id === exId);
                      const cfg = exerciseConfigs[exId] || {
                        sets: exDef ? exDef.defaultSets : 3,
                        reps: exDef ? exDef.defaultReps : 12,
                        weight: exDef ? exDef.defaultWeight : 0,
                        restSeconds: exDef ? exDef.restSeconds : 60,
                        executionMode: 'ordinaire',
                      };

                      const updateCfg = (partial: Partial<typeof cfg>) => {
                        setExerciseConfigs((prev) => ({
                          ...prev,
                          [exId]: { ...cfg, ...partial },
                        }));
                      };

                      return (
                        <div
                          key={exId}
                          className="bg-[#0d1424] border border-[#233556] rounded-xl p-2.5 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white truncate max-w-[200px]">
                              {exDef?.name || exId}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExerciseSelection(exId)}
                              className="text-[10px] text-rose-400 hover:text-rose-300"
                            >
                              Retirer
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] uppercase text-slate-400 block font-semibold">Séries</label>
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateCfg({ sets: Math.max(1, cfg.sets - 1) })}
                                  className="w-5 h-5 bg-[#16223b] text-slate-300 rounded font-bold hover:bg-[#233556]"
                                >-</button>
                                <span className="font-mono font-bold text-white w-5 text-center">{cfg.sets}</span>
                                <button
                                  type="button"
                                  onClick={() => updateCfg({ sets: cfg.sets + 1 })}
                                  className="w-5 h-5 bg-[#16223b] text-slate-300 rounded font-bold hover:bg-[#233556]"
                                >+</button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] uppercase text-slate-400 block font-semibold">Répétitions</label>
                              <div className="flex items-center gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateCfg({ reps: Math.max(1, cfg.reps - 1) })}
                                  className="w-5 h-5 bg-[#16223b] text-slate-300 rounded font-bold hover:bg-[#233556]"
                                >-</button>
                                <span className="font-mono font-bold text-white w-6 text-center">{cfg.reps}</span>
                                <button
                                  type="button"
                                  onClick={() => updateCfg({ reps: cfg.reps + 1 })}
                                  className="w-5 h-5 bg-[#16223b] text-slate-300 rounded font-bold hover:bg-[#233556]"
                                >+</button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] uppercase text-slate-400 block font-semibold">Charge cible</label>
                              <div className="flex items-center gap-1 mt-0.5">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={cfg.weight}
                                  onChange={(e) => updateCfg({ weight: parseFloat(e.target.value) || 0 })}
                                  className="w-14 bg-[#16223b] border border-[#233556] rounded px-1.5 py-0.5 text-center font-mono font-bold text-white text-xs"
                                />
                                <span className="text-[10px] text-slate-400">kg</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[#233556]/50">
                            <span className="text-[9px] uppercase text-slate-400 font-semibold">Mode :</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateCfg({ executionMode: 'ordinaire' })}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                  cfg.executionMode === 'ordinaire'
                                    ? 'bg-[#18253d] border border-[#f47b20] text-white'
                                    : 'bg-[#111a2e] text-slate-400'
                                }`}
                              >
                                Ordinaire
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCfg({ executionMode: 'superset' })}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                  cfg.executionMode === 'superset'
                                    ? 'bg-[#f47b20] text-white'
                                    : 'bg-[#111a2e] text-slate-400'
                                }`}
                              >
                                Superset
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!newRoutineName.trim() || selectedExerciseIds.length === 0}
                className="w-full py-3 rounded-xl bg-[#f47b20] hover:bg-[#e06810] text-white text-xs font-bold disabled:opacity-40 transition shadow-md"
              >
                Enregistrer la séance dans le programme
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROGRAM MODAL */}
      {showCreateProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-md w-full p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#233556]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#f47b20]" />
                <h3 className="font-bold text-white text-sm">
                  Créer un nouveau programme
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateProgramModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProgramSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Nom du programme
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Programme force calisthénie 3x"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f47b20]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Fréquence / Rythme
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 séances par semaine (1 jour sur 2)"
                  value={newProgFrequency}
                  onChange={(e) => setNewProgFrequency(e.target.value)}
                  className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f47b20]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Ex: Alternance haut du corps et bas du corps"
                  value={newProgDesc}
                  onChange={(e) => setNewProgDesc(e.target.value)}
                  className="w-full bg-[#0d1424] border border-[#233556] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f47b20]"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Inclure des séances existantes (optionnel) :
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 border border-[#233556] rounded-xl p-2 bg-[#0d1424]">
                  {routines.map((r) => {
                    const isSelected = selectedExistingWorkoutIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() =>
                          setSelectedExistingWorkoutIds((prev) =>
                            prev.includes(r.id)
                              ? prev.filter((id) => id !== r.id)
                              : [...prev, r.id]
                          )
                        }
                        className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-[#18253d] border border-[#f47b20] text-white'
                            : 'bg-[#111a2e] text-slate-300'
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">{r.name}</span>
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                            isSelected
                              ? 'bg-[#f47b20] border-[#f47b20] text-white'
                              : 'border-[#233556]'
                          }`}
                        >
                          {isSelected && '✓'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newProgName.trim()}
                className="w-full py-3 rounded-xl bg-[#f47b20] hover:bg-[#e06810] text-white text-xs font-bold disabled:opacity-40 transition shadow-md"
              >
                Créer et activer ce programme
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
