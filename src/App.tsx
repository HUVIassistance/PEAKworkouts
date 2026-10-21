import React, { useState, useEffect } from 'react';
import {
  WorkoutRoutine,
  WorkoutSessionLog,
  ActiveExerciseItem,
  ExerciseDefinition,
  PersonalRecord,
  WorkoutSet,
  TrainingProgram,
} from './types/workout.ts';
import {
  getRoutines,
  saveRoutine,
  deleteRoutine,
  getPrograms,
  saveProgram,
  deleteProgram,
  getActiveProgramId,
  setActiveProgramId,
  getWorkoutHistory,
  saveWorkoutLog,
  deleteWorkoutLog,
  getPersonalRecords,
  getAllExercises,
  saveActiveWorkoutState,
  getActiveWorkoutState,
  getSettings,
  getLastWeightForExercise,
  getNutritionPlan,
  localDateString,
  trainingDateString,
} from './utils/storage.ts';
import { HomeView } from './components/HomeView.tsx';
import { RoutinesView } from './components/RoutinesView.tsx';
import { ProgressionView } from './components/ProgressionView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { NutritionView } from './components/NutritionView.tsx';
import { ExerciseLibraryView } from './components/ExerciseLibraryView.tsx';
import { ActiveWorkoutView } from './components/ActiveWorkoutView.tsx';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal.tsx';
import { BrandMark } from './components/BrandMark.tsx';
import {
  Home,
  Dumbbell,
  TrendingUp,
  BookOpen,
  Sparkles,
  Flame,
  Play,
  Utensils,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { soundEngine } from './utils/audio.ts';
import { syncProgram, pushSessionToNotion, promoteSessionToNotion, flushPendingSessions } from './services/peakApi.ts';

type NavigationTab = 'home' | 'workouts' | 'nutrition' | 'progression' | 'history' | 'exercises';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => getRoutines());
  const [programs, setPrograms] = useState<TrainingProgram[]>(() => getPrograms());
  const [activeProgramIdState, setActiveProgramIdState] = useState<string>(() => getActiveProgramId());
  const [exercises, setExercises] = useState<ExerciseDefinition[]>(() => getAllExercises());
  const [history, setHistory] = useState<WorkoutSessionLog[]>(() => getWorkoutHistory());
  const [personalRecords, setPersonalRecords] = useState<Record<string, PersonalRecord>>(() => getPersonalRecords());

  // Active workout state
  const [isActiveWorkoutOpen, setIsActiveWorkoutOpen] = useState(false);
  const [activeRoutineName, setActiveRoutineName] = useState<string>('');
  const [activeRoutineId, setActiveRoutineId] = useState<string>('');
  const [activeExercises, setActiveExercises] = useState<ActiveExerciseItem[]>([]);
  const [activeSessionStartTime, setActiveSessionStartTime] = useState<number>(0);
  // Jour auquel la séance est rattachée : figé au LANCEMENT (pas à la fin),
  // pour qu'une séance finie après minuit reste sur la journée d'origine.
  const [activeSessionDate, setActiveSessionDate] = useState<string>('');

  // Modals
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Synchronisation Notion
  const [syncState, setSyncState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [syncMsg, setSyncMsg] = useState('');

  // Détection du mode « site pour ordinateur » de Chrome sur mobile
  const [desktopMode, setDesktopMode] = useState(false);
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (isMobile && window.innerWidth >= 720) setDesktopMode(true);
  }, []);

  const handleSyncNotion = async () => {
    if (syncState === 'busy') return;
    setSyncState('busy');
    setSyncMsg('Synchronisation…');
    try {
      const summary = await syncProgram();
      setRoutines(getRoutines());
      setPrograms(getPrograms());
      setExercises(getAllExercises());
      setActiveProgramIdState(getActiveProgramId());
      setSyncState('ok');
      setSyncMsg(
        summary.programName +
          ' — ' +
          summary.workouts +
          ' workouts, ' +
          summary.exercises +
          ' exercices' +
          (summary.createdExercises ? ' (' + summary.createdExercises + ' ajoutés)' : '') +
          (summary.removedExercises ? ' · ' + summary.removedExercises + ' doublon(s) retiré(s)' : '')
      );
      setTimeout(() => setSyncState('idle'), 8000);
    } catch (err: any) {
      setSyncState('err');
      setSyncMsg(err?.message || 'Synchronisation impossible');
      setTimeout(() => setSyncState('idle'), 8000);
    }
  };

  // Load initial data
  useEffect(() => {
    setRoutines(getRoutines());
    setPrograms(getPrograms());
    setActiveProgramIdState(getActiveProgramId());
    setExercises(getAllExercises());
    setHistory(getWorkoutHistory());
    setPersonalRecords(getPersonalRecords());

    // Séances qui n'avaient pas pu partir (réseau coupé en salle) : on rejoue.
    void flushPendingSessions();

    const savedActive = getActiveWorkoutState();
    if (savedActive && savedActive.exercises && savedActive.exercises.length > 0) {
      setActiveRoutineName(savedActive.routineName || 'Séance en cours');
      setActiveRoutineId(savedActive.routineId || '');
      setActiveExercises(savedActive.exercises);
      setActiveSessionStartTime(savedActive.startTime || Date.now());
      setActiveSessionDate(savedActive.sessionDate || trainingDateString(new Date(savedActive.startTime || Date.now())));
    }

    const settings = getSettings();
    soundEngine.enabled = settings.soundEnabled;
  }, []);

  // Save active workout progress to localStorage
  useEffect(() => {
    if (activeExercises.length > 0) {
      saveActiveWorkoutState({
        routineName: activeRoutineName,
        routineId: activeRoutineId,
        exercises: activeExercises,
        startTime: activeSessionStartTime,
        sessionDate: activeSessionDate,
      });
    } else {
      saveActiveWorkoutState(null);
    }
  }, [activeExercises, activeRoutineName, activeRoutineId, activeSessionStartTime, activeSessionDate]);

  // Handle active program change
  const handleSelectActiveProgram = (programId: string) => {
    setActiveProgramIdState(programId);
    setActiveProgramId(programId);
  };

  const handleCreateProgram = (newProg: TrainingProgram) => {
    saveProgram(newProg);
    setPrograms(getPrograms());
  };

  const handleDeleteProgram = (programId: string) => {
    deleteProgram(programId);
    setPrograms(getPrograms());
  };

  // Launch a workout routine (auto-inheriting the user's last used weight for each exercise)
  const handleStartRoutine = (routine: WorkoutRoutine, dateStr?: string) => {
    const launchedAt = Date.now();
    setActiveSessionDate(dateStr || trainingDateString(new Date(launchedAt)));
    setActiveSessionStartTime(launchedAt);
    const exerciseItems: ActiveExerciseItem[] = routine.exercises.map((item, idx) => {
      const def = exercises.find((e) => e.id === item.exerciseId);
      const exName = def?.name || 'Exercice';

      // Check if user has a previously recorded weight for this exercise
      const lastWeight = getLastWeightForExercise(exName, item.exerciseId);
      const initialWeight =
        lastWeight !== null && lastWeight !== undefined
          ? lastWeight
          : item.weight || def?.defaultWeight || 0;

      const sets: WorkoutSet[] = Array.from({ length: item.sets }, (_, sIdx) => ({
        id: `set-${idx}-${sIdx}-${Date.now()}`,
        setNumber: sIdx + 1,
        targetReps: item.reps,
        // Charge prescrite pour CETTE série si Notion en donne une par série
        weight: item.weights?.[sIdx] ?? initialWeight,
        reps: item.reps,
        completed: false,
      }));

      return {
        id: `active-ex-${idx}-${Date.now()}`,
        exerciseId: item.exerciseId,
        name: exName,
        category: def?.category || 'Pectoraux',
        targetMuscle: def?.targetMuscle || 'Muscle cible',
        description: def?.description || '',
        tips: def?.tips || '',
        iconKey: def?.iconKey || 'generic',
        restSeconds: item.restSeconds || def?.restSeconds || 60,
        sets,
        supersetGroup: item.supersetGroup,
        executionMode: item.executionMode || (item.supersetGroup ? 'superset' : 'ordinaire'),
      };
    });

    setActiveRoutineName(routine.name);
    setActiveRoutineId(routine.id);
    setActiveExercises(exerciseItems);
    setIsActiveWorkoutOpen(true);
  };

  // Launch single exercise workout from library
  const handleStartSingleExercise = (exDef: ExerciseDefinition) => {
    const singleLaunchedAt = Date.now();
    setActiveSessionDate(trainingDateString(new Date(singleLaunchedAt)));
    setActiveSessionStartTime(singleLaunchedAt);
    const lastWeight = getLastWeightForExercise(exDef.name, exDef.id);
    const initialWeight =
      lastWeight !== null && lastWeight !== undefined ? lastWeight : exDef.defaultWeight;

    const sets: WorkoutSet[] = Array.from({ length: exDef.defaultSets }, (_, sIdx) => ({
      id: `set-single-${sIdx}-${Date.now()}`,
      setNumber: sIdx + 1,
      targetReps: exDef.defaultReps,
      weight: initialWeight,
      reps: exDef.defaultReps,
      completed: false,
    }));

    const activeItem: ActiveExerciseItem = {
      id: `active-single-${Date.now()}`,
      exerciseId: exDef.id,
      name: exDef.name,
      category: exDef.category,
      targetMuscle: exDef.targetMuscle,
      description: exDef.description,
      tips: exDef.tips,
      iconKey: exDef.iconKey,
      restSeconds: exDef.restSeconds,
      sets,
      executionMode: 'ordinaire',
    };

    setActiveRoutineName(`Session : ${exDef.name}`);
    setActiveExercises([activeItem]);
    setIsActiveWorkoutOpen(true);
  };

  const handleCreateRoutine = (newRoutine: WorkoutRoutine) => {
    saveRoutine(newRoutine);
    setRoutines(getRoutines());
  };

  const handleDeleteRoutine = (routineId: string) => {
    deleteRoutine(routineId);
    setRoutines(getRoutines());
  };

  const handleTriggerFinishWorkout = () => {
    setIsSummaryModalOpen(true);
  };

  // Cancel workout without saving
  const handleCancelWorkout = () => {
    setActiveExercises([]);
    setActiveRoutineName('');
    saveActiveWorkoutState(null);
    setIsActiveWorkoutOpen(false);
  };

  const handleSaveCompletedWorkoutSession = (
    notes: string,
    feeling: '🔥 Top' | '💪 Bon' | '😐 Moyen' | '🥵 Difficile',
    promoteToProgram = false
  ) => {
    const now = Date.now();
    const durationSeconds = Math.max(10, Math.floor((now - activeSessionStartTime) / 1000));

    let totalVolume = 0;
    let totalSets = 0;

    const completedExercises = activeExercises.map((ex) => {
      const loggedSets = ex.sets.map((s) => {
        if (s.completed) {
          totalSets++;
          totalVolume += s.weight * s.reps;
        }
        return {
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
        };
      });
      return {
        exerciseName: ex.name,
        category: ex.category,
        sets: loggedSets,
      };
    });

    const newLog: WorkoutSessionLog = {
      id: `log-${now}`,
      routineId: activeRoutineId || undefined,
      routineName: activeRoutineName,
      startTime: activeSessionStartTime,
      endTime: now,
      durationSeconds,
      exercises: completedExercises,
      totalVolumeKg: totalVolume,
      totalSetsCompleted: totalSets,
      dateString: activeSessionDate || trainingDateString(new Date(activeSessionStartTime || now)),
      notes: notes.trim() || undefined,
      feeling,
    };

    saveWorkoutLog(newLog);

    // Miroir Notion : fire-and-forget, ne bloque jamais la fin de séance.
    void pushSessionToNotion(newLog);

    // Promotion de la séance en prescription (bouton explicite uniquement).
    if (promoteToProgram) {
      setSyncState('busy');
      setSyncMsg('Mise à jour du programme Notion…');
      void promoteSessionToNotion(newLog).then((r) => {
        if (r.ok) {
          setSyncState('ok');
          setSyncMsg(
            'Programme Notion mis à jour — ' +
              r.updated.length +
              ' exercice(s)' +
              (r.skipped.length ? ' · ' + r.skipped.length + ' ignoré(s)' : '')
          );
        } else {
          setSyncState('err');
          setSyncMsg('Programme non mis à jour : ' + (r.error || 'erreur inconnue'));
        }
        setTimeout(() => setSyncState('idle'), 10000);
      });
    }

    setHistory(getWorkoutHistory());
    setPersonalRecords(getPersonalRecords());

    setActiveExercises([]);
    setActiveRoutineName('');
    setActiveRoutineId('');
    setActiveSessionDate('');
    saveActiveWorkoutState(null);

    setIsSummaryModalOpen(false);
    setIsActiveWorkoutOpen(false);
    setCurrentTab('history');
  };

  const handleDeleteLog = (id: string) => {
    deleteWorkoutLog(id);
    setHistory(getWorkoutHistory());
    setPersonalRecords(getPersonalRecords());
  };

  const handleImportLogs = (logs: WorkoutSessionLog[]) => {
    localStorage.setItem('peakform_history_v2', JSON.stringify(logs));
    setHistory(logs);
    setPersonalRecords(getPersonalRecords());
  };

  const activeCompletedSetsCount = activeExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const activeTotalSetsCount = activeExercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0
  );

  const currentActiveProgram =
    programs.find((p) => p.id === activeProgramIdState) || programs[0];

  return (
    <div className="min-h-screen bg-[#0b101d] text-slate-100 flex flex-col font-sans selection:bg-[#f47b20] selection:text-white">
      {/* Mode « site pour ordinateur » : Chrome rend la page à ~980 px puis la
          dézoome -> tout paraît minuscule et le double-tap zoome sans arrêt. */}
      {desktopMode && (
        <div className="bg-[#f47b20] text-white text-[13px] font-semibold px-4 py-2 text-center">
          Mode bureau détecté : dans Chrome, menu ⋮ → décoche « Site pour ordinateur », puis rouvre l'app.
        </div>
      )}
      {/* If Active Workout Window is open, show the dedicated screen */}
      {isActiveWorkoutOpen && activeExercises.length > 0 ? (
        <ActiveWorkoutView
          routineName={activeRoutineName}
          exercises={activeExercises}
          allExercises={exercises}
          onUpdateExercises={setActiveExercises}
          onFinishWorkout={handleTriggerFinishWorkout}
          onExitActiveMode={() => setIsActiveWorkoutOpen(false)}
          onCancelWorkout={handleCancelWorkout}
          autoStartRest={true}
        />
      ) : (
        <>
          {/* Main App Navigation Header */}
          <header className="sticky top-0 z-30 bg-[#111a2e]/95 backdrop-blur-md border-b border-[#233556] px-4 py-2.5 shadow-md">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              {/* Brand Logo & Name */}
              <div
                onClick={() => setCurrentTab('home')}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f47b20] to-[#ff9a47] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <BrandMark size={19} />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-baseline gap-1.5 whitespace-nowrap">
                    <span>PEAK form</span>
                    <span className="hidden sm:inline text-[11px] font-medium text-[#f47b20] uppercase tracking-wider">
                      Workouts
                    </span>
                  </h1>
                </div>
              </div>

              {/* Active workout pill if session is ongoing */}
              {activeExercises.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsActiveWorkoutOpen(true)}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition text-xs font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    Séance en cours ({activeCompletedSetsCount}/{activeTotalSetsCount})
                  </span>
                  <Play className="w-3 h-3 fill-current" />
                </button>
              )}

              {/* Quick actions : sync Notion + agent IA */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncNotion}
                  disabled={syncState === 'busy'}
                  title="Importer le programme actif depuis Notion"
                  className={`flex items-center justify-center gap-1.5 p-2.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] border text-xs font-semibold transition disabled:opacity-60 ${
                    syncState === 'err'
                      ? 'border-rose-500/60 text-rose-300'
                      : syncState === 'ok'
                      ? 'border-emerald-500/60 text-emerald-300'
                      : 'border-[#233556] text-slate-200 hover:text-white hover:border-[#f47b20]'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${syncState === 'busy' ? 'animate-spin text-[#f47b20]' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{syncState === 'busy' ? 'Sync…' : 'Synchroniser'}</span>
                </button>
              </div>
            </div>

            {syncState !== 'idle' && syncMsg && (
              <div className="max-w-5xl mx-auto mt-1.5">
                <p
                  className={`text-[11px] font-medium truncate ${
                    syncState === 'err' ? 'text-rose-300' : syncState === 'ok' ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {syncMsg}
                </p>
              </div>
            )}

            {/* Navigation Tabs Bar with Accueil, Workouts, Nutrition, Suivi, Historique, Bibliothèque */}
            <div className="max-w-5xl mx-auto mt-2.5 flex items-center justify-start gap-1 sm:gap-1.5 border-t border-[#1e2a42] pt-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setCurrentTab('home')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  currentTab === 'home'
                    ? 'bg-[#f47b20] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#16223b]'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Accueil</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('workouts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  currentTab === 'workouts'
                    ? 'bg-[#f47b20] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#16223b]'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Mes workouts</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('nutrition')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  currentTab === 'nutrition'
                    ? 'bg-[#f47b20] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#16223b]'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Nutrition</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('progression')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  currentTab === 'progression'
                    ? 'bg-[#f47b20] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#16223b]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Suivi et progression</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  currentTab === 'history'
                    ? 'bg-[#f47b20] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#16223b]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Historique</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('exercises')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  currentTab === 'exercises'
                    ? 'bg-[#f47b20] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#16223b]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Bibliothèque</span>
              </button>
            </div>
          </header>

          {/* Main Body Content */}
          <main className="max-w-5xl w-full mx-auto px-4 py-5 flex-1">
            {currentTab === 'home' && (
              <HomeView
                activeProgram={currentActiveProgram}
                routines={routines}
                history={history}
                nutritionPlan={getNutritionPlan()}
                personalRecords={personalRecords}
                onStartRoutine={handleStartRoutine}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onRefreshHistory={() => {
                  setHistory(getWorkoutHistory());
                  setPersonalRecords(getPersonalRecords());
                }}
              />
            )}

            {currentTab === 'workouts' && (
              <RoutinesView
                routines={routines}
                programs={programs}
                activeProgramId={activeProgramIdState}
                onSelectActiveProgram={handleSelectActiveProgram}
                exercises={exercises}
                onStartRoutine={handleStartRoutine}
                onCreateRoutine={handleCreateRoutine}
                onDeleteRoutine={handleDeleteRoutine}
                onCreateProgram={handleCreateProgram}
                onDeleteProgram={handleDeleteProgram}
              />
            )}

            {currentTab === 'nutrition' && <NutritionView />}

            {currentTab === 'progression' && (
              <ProgressionView
                history={history}
                personalRecords={personalRecords}
              />
            )}

            {currentTab === 'history' && (
              <HistoryView
                history={history}
                onDeleteLog={handleDeleteLog}
                onImportLogs={handleImportLogs}
              />
            )}

            {currentTab === 'exercises' && (
              <ExerciseLibraryView
                exercises={exercises}
                onStartSingleExerciseWorkout={handleStartSingleExercise}
              />
            )}
          </main>

          {/* Discreet Footer */}
          <footer className="border-t border-[#1e2a42] py-4 px-4 text-center text-xs text-slate-500 bg-[#080d17]">
            <p className="font-medium">
              PEAK form • Workouts, nutrition et suivi de performance
            </p>
          </footer>
        </>
      )}

      {/* AI Workout Generator Modal (désactivé : voir worker/README.md) */}

      {/* Workout Completion Summary Modal */}
      <WorkoutSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        onSave={handleSaveCompletedWorkoutSession}
        onSaveAndPromote={(notes, feeling) => handleSaveCompletedWorkoutSession(notes, feeling, true)}
        routineName={activeRoutineName}
        durationSeconds={Math.max(10, Math.floor((Date.now() - activeSessionStartTime) / 1000))}
        exercises={activeExercises}
        personalRecords={personalRecords}
      />
    </div>
  );
}
