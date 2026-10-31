import React, { useState, useEffect, useMemo } from 'react';
import {
  ActiveExerciseItem,
  WorkoutSet,
  ExerciseDefinition,
  ExerciseExecutionMode,
  ExerciseIconKey,
  MuscleGroup,
} from '../types/workout.ts';
import { ExerciseVisual } from './ExerciseVisual.tsx';
import { soundEngine } from '../utils/audio.ts';

/** Garde l'écran allumé pendant la séance (Wake Lock API, supporté par Chrome Android). */
function useWakeLock(active: boolean) {
  React.useEffect(() => {
    let sentinel: any = null;
    let cancelled = false;
    const request = async () => {
      try {
        const nav: any = navigator;
        if (!active || !nav.wakeLock || document.visibilityState !== 'visible') return;
        sentinel = await nav.wakeLock.request('screen');
        if (cancelled && sentinel) sentinel.release();
      } catch {
        // refusé (batterie faible, onglet non visible…) : sans conséquence
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && active && !sentinel) void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      try { sentinel && sentinel.release(); } catch { /* ignore */ }
    };
  }, [active]);
}
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Flame,
  ArrowRight,
  List,
  RefreshCw,
  ExternalLink,
  X,
  AlertTriangle,
  Zap,
  Repeat,
  Layers,
} from 'lucide-react';

interface ActiveWorkoutViewProps {
  routineName: string;
  exercises: ActiveExerciseItem[];
  allExercises: ExerciseDefinition[];
  onUpdateExercises: (exercises: ActiveExerciseItem[]) => void;
  onFinishWorkout: () => void;
  onExitActiveMode: () => void;
  onCancelWorkout: () => void;
  autoStartRest: boolean;
}

interface WorkoutStep {
  stepId: string;
  exerciseIndex: number;
  setIndex: number;
  exerciseName: string;
  category: MuscleGroup;
  targetMuscle: string;
  description: string;
  tips: string;
  iconKey: ExerciseIconKey;
  setNumber: number;
  totalSetsOfExercise: number;
  targetReps: number;
  mode: ExerciseExecutionMode;
  supersetGroup?: string;
  partnerExerciseName?: string;
  recommendedRestSeconds: number;
  isLastInSupersetRound: boolean;
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  routineName,
  exercises,
  allExercises,
  onUpdateExercises,
  onFinishWorkout,
  onExitActiveMode,
  onCancelWorkout,
  autoStartRest = true,
}) => {
  // Écran allumé pendant toute la séance (le téléphone ne se verrouille plus).
  useWakeLock(true);

  // Global session timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isElapsedRunning, setIsElapsedRunning] = useState(true);

  // Rest countdown mode
  const [isRestMode, setIsRestMode] = useState(false);
  // Le chrono continue de tourner, mais l'écran de repos est masqué pour
  // laisser éditer une série (retour possible via la pastille flottante).
  const [restHidden, setRestHidden] = useState(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restTotalDuration, setRestTotalDuration] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals
  const [showOverview, setShowOverview] = useState(false);
  const [showReplacerModal, setShowReplacerModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Build the intelligent execution steps (Alternating supersets, sequential straight sets, drop sets)
  const steps: WorkoutStep[] = useMemo(() => {
    const list: WorkoutStep[] = [];
    let i = 0;

    while (i < exercises.length) {
      const currentEx = exercises[i];
      const sGroup = currentEx.supersetGroup;
      const mode: ExerciseExecutionMode = currentEx.executionMode || (sGroup ? 'superset' : 'ordinaire');

      // Check if this exercise is part of a multi-exercise superset group
      if (mode === 'superset' && sGroup) {
        // Collect all consecutive exercises belonging to this superset group
        const groupExercises: { ex: ActiveExerciseItem; originalIndex: number }[] = [];
        let j = i;
        while (j < exercises.length && exercises[j].supersetGroup === sGroup) {
          groupExercises.push({ ex: exercises[j], originalIndex: j });
          j++;
        }

        if (groupExercises.length > 1) {
          // Superset alterné : Ex1 S1 -> Ex2 S1 -> Ex1 S2 -> Ex2 S2…
          // Si les membres n'ont pas le même nombre de séries (ex. 3 vs 4), on
          // alterne sur le PLUS PETIT commun, sinon le surplus sort en séries
          // collées à la fin (le fameux « seated -> seated »).
          const maxSets = Math.max(...groupExercises.map((g) => g.ex.sets.length));
          const rounds = Math.min(...groupExercises.map((g) => g.ex.sets.length));

          const pushStep = (gItem: { ex: ActiveExerciseItem; originalIndex: number }, s: number, inSuperset: boolean) => {
            const gIdx = groupExercises.findIndex((g) => g.originalIndex === gItem.originalIndex);
            const isLastInRound = gIdx === groupExercises.length - 1;
            const partner = groupExercises.find((_, pIdx) => pIdx !== gIdx)?.ex.name;
            const restSec = inSuperset ? (isLastInRound ? gItem.ex.restSeconds || 75 : 30) : gItem.ex.restSeconds || 75;

            list.push({
              stepId: inSuperset ? `step-ss-${gItem.originalIndex}-${s}` : `step-ex-${gItem.originalIndex}-${s}`,
              exerciseIndex: gItem.originalIndex,
              setIndex: s,
              exerciseName: gItem.ex.name,
              category: gItem.ex.category,
              targetMuscle: gItem.ex.targetMuscle,
              description: gItem.ex.description,
              tips: gItem.ex.tips,
              iconKey: gItem.ex.iconKey,
              setNumber: s + 1,
              totalSetsOfExercise: gItem.ex.sets.length,
              targetReps: gItem.ex.sets[s]?.targetReps ?? gItem.ex.sets[0]?.targetReps ?? 0,
              mode: inSuperset ? 'superset' : 'ordinaire',
              supersetGroup: inSuperset ? sGroup : undefined,
              partnerExerciseName: inSuperset ? partner : undefined,
              recommendedRestSeconds: restSec,
              isLastInSupersetRound: inSuperset ? isLastInRound : true,
            });
          };

          // 1) Les tours réellement alternés (durée = série la plus courte du groupe)
          for (let s = 0; s < rounds; s++) {
            groupExercises.forEach((gItem) => pushStep(gItem, s, true));
          }

          // 2) Le surplus éventuel, hors superset et à la suite (série de rappel)
          for (let s = rounds; s < maxSets; s++) {
            groupExercises.forEach((gItem) => {
              if (s < gItem.ex.sets.length) pushStep(gItem, s, false);
            });
          }

          i = j;
          continue;
        }
      }

      // Drop set mode or single exercise
      const isDropSet = mode === 'drop_set';
      for (let s = 0; s < currentEx.sets.length; s++) {
        // In drop sets, transition to next drop is immediate (0s or 5s max)
        const restSec = isDropSet && s < currentEx.sets.length - 1 ? 5 : currentEx.restSeconds || 60;

        list.push({
          stepId: `step-std-${i}-${s}`,
          exerciseIndex: i,
          setIndex: s,
          exerciseName: currentEx.name,
          category: currentEx.category,
          targetMuscle: currentEx.targetMuscle,
          description: currentEx.description,
          tips: currentEx.tips,
          iconKey: currentEx.iconKey,
          setNumber: s + 1,
          totalSetsOfExercise: currentEx.sets.length,
          targetReps: currentEx.sets[s]?.targetReps ?? currentEx.sets[0]?.targetReps ?? 0,
          mode: isDropSet ? 'drop_set' : 'ordinaire',
          supersetGroup: sGroup,
          recommendedRestSeconds: restSec,
          isLastInSupersetRound: s === currentEx.sets.length - 1,
        });
      }
      i++;
    }

    return list;
  }, [exercises]);

  // Current step pointer in the workout
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // If steps change or pointer is out of bounds, adjust safely
  const safeStepIndex = Math.min(currentStepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeStepIndex] || steps[0];

  const currentExercise = exercises[currentStep?.exerciseIndex ?? 0] || exercises[0];
  const activeSet = currentExercise?.sets[currentStep?.setIndex ?? 0] || currentExercise?.sets[0];

  // Global elapsed timer interval
  useEffect(() => {
    let interval: any = null;
    if (isElapsedRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isElapsedRunning]);

  // Rest timer countdown
  useEffect(() => {
    if (!isRestMode) return;
    if (restSecondsLeft <= 0) {
      // Le repos est fini : on passe VRAIMENT à l'étape suivante…
      soundEngine.playRestComplete();
      setIsRestMode(false);
      if (restHidden) {
        // …sauf si Hugo était en train d'éditer une série : on ne le déplace pas.
        setRestHidden(false);
      } else {
        advanceToNextStep();
      }
      return;
    }
    const timer = setTimeout(() => {
      if (restSecondsLeft <= 11) {
        soundEngine.playTick(restSecondsLeft <= 6 ? 880 : 700);
      }
      setRestSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [isRestMode, restSecondsLeft, restHidden]);

  // Advance to next step in the schedule
  const advanceToNextStep = () => {
    setIsRestMode(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onFinishWorkout();
    }
  };

  // Determine what is coming next after current step
  const getNextStepInfo = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      let sub = `Série ${nextStep.setNumber} sur ${nextStep.totalSetsOfExercise}`;
      if (nextStep.mode === 'superset') {
        sub = `${nextStep.supersetGroup || 'Superset'} • Série ${nextStep.setNumber}`;
      } else if (nextStep.mode === 'drop_set') {
        sub = `Dégressif (Drop ${nextStep.setNumber}) sans repos`;
      }

      return {
        type: 'step',
        title: nextStep.exerciseName,
        subtitle: sub,
        prescription: `${nextStep.totalSetsOfExercise}x${nextStep.targetReps}`,
        isDrop: nextStep.mode === 'drop_set',
      };
    }
    return {
      type: 'finish',
      title: 'Dernière série de la séance !',
      subtitle: 'Prêt pour le bilan final',
      prescription: '',
      isDrop: false,
    };
  };

  // Weight auto-propagation: when user updates weight on an exercise, propagate to uncompleted sets
  const propagateWeightToUpcomingSets = (newWeight: number) => {
    const updated = [...exercises];
    const targetEx = updated[currentStep.exerciseIndex];
    const currentIsCompleted = !!targetEx.sets[currentStep.setIndex]?.completed;
    targetEx.sets.forEach((s, idx) => {
      if (idx === currentStep.setIndex && currentIsCompleted) {
        // Série déjà validée : on CORRIGE cette série, sans toucher aux autres.
        s.weight = newWeight;
      } else if (idx > currentStep.setIndex && !s.completed) {
        // Série à venir : on prépare la suite, comme avant.
        s.weight = newWeight;
      }
    });
    onUpdateExercises(updated);
  };

  // Validate the current focused set
  const handleCompleteCurrentSet = () => {
    const updated = [...exercises];
    const targetSet = updated[currentStep.exerciseIndex].sets[currentStep.setIndex];
    targetSet.completed = true;
    targetSet.completedAt = Date.now();

    // Propagate the used weight to remaining sets of this exercise
    const currentWeight = targetSet.weight;
    updated[currentStep.exerciseIndex].sets.forEach((s, idx) => {
      if (idx > currentStep.setIndex && !s.completed) {
        s.weight = currentWeight;
      }
    });

    onUpdateExercises(updated);
    soundEngine.playSetCompletedSound();

    if (autoStartRest) {
      const duration = currentStep.recommendedRestSeconds || 60;
      setRestTotalDuration(duration);
      setRestSecondsLeft(duration);
      setIsRestMode(true);
      setRestHidden(false);
    } else {
      advanceToNextStep();
    }
  };

  // Switch execution mode on current exercise
  const handleChangeExerciseMode = (newMode: ExerciseExecutionMode) => {
    const updated = [...exercises];
    updated[currentStep.exerciseIndex].executionMode = newMode;
    if (newMode === 'superset' && !updated[currentStep.exerciseIndex].supersetGroup) {
      updated[currentStep.exerciseIndex].supersetGroup = 'Superset 1';
    }
    onUpdateExercises(updated);
  };

  // Adjust weight by 0.5 kg increments
  const handleUpdateWeight = (delta: number) => {
    const newWeight = Math.max(0, Math.round(((activeSet?.weight ?? 0) + delta) * 10) / 10);
    propagateWeightToUpcomingSets(newWeight);
  };

  const handleManualWeightChange = (val: number) => {
    const newWeight = Math.max(0, Math.round(val * 10) / 10);
    propagateWeightToUpcomingSets(newWeight);
  };

  const handleUpdateReps = (delta: number) => {
    const updated = [...exercises];
    const s = updated[currentStep.exerciseIndex].sets[currentStep.setIndex];
    s.reps = Math.max(1, s.reps + delta);
    onUpdateExercises(updated);
  };

  /** Ajoute une série à l'exercice courant (le nombre prescrit n'est qu'un départ). */
  const handleAddSet = () => {
    const idx = currentStep.exerciseIndex;
    const updated = [...exercises];
    const ex = { ...updated[idx] };
    const last = ex.sets[ex.sets.length - 1];
    ex.sets = [
      ...ex.sets,
      {
        id: `set-extra-${idx}-${Date.now()}`,
        setNumber: ex.sets.length + 1,
        targetReps: last?.targetReps ?? 10,
        weight: last?.weight ?? 0,
        reps: last?.reps ?? last?.targetReps ?? 10,
        completed: false,
      },
    ];
    updated[idx] = ex;
    onUpdateExercises(updated);
  };

  /** Retire la dernière série, seulement si elle n'a pas été validée. */
  const handleRemoveLastSet = () => {
    const idx = currentStep.exerciseIndex;
    const updated = [...exercises];
    const ex = { ...updated[idx] };
    if (ex.sets.length <= 1) return;
    if (ex.sets[ex.sets.length - 1].completed) return;
    ex.sets = ex.sets.slice(0, -1);
    updated[idx] = ex;
    onUpdateExercises(updated);
  };

  const handleManualRepsChange = (val: number) => {
    const updated = [...exercises];
    updated[currentStep.exerciseIndex].sets[currentStep.setIndex].reps = Math.max(1, val);
    onUpdateExercises(updated);
  };

  const handleReplaceExercise = (newExDef: ExerciseDefinition) => {
    const updated = [...exercises];
    const current = updated[currentStep.exerciseIndex];

    updated[currentStep.exerciseIndex] = {
      ...current,
      exerciseId: newExDef.id,
      name: newExDef.name,
      category: newExDef.category,
      targetMuscle: newExDef.targetMuscle,
      description: newExDef.description,
      tips: newExDef.tips,
      iconKey: newExDef.iconKey,
      restSeconds: newExDef.restSeconds,
      sets: current.sets.map((s) => ({
        ...s,
        targetReps: newExDef.defaultReps,
        reps: newExDef.defaultReps,
        weight: newExDef.defaultWeight,
      })),
    };

    onUpdateExercises(updated);
    setShowReplacerModal(false);
  };

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalStepsCount = steps.length;
  const completedStepsCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const percentDone = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;
  const nextInfo = getNextStepInfo();

  // Search URL for Google to see technique of exercise
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    currentStep?.exerciseName + ' exercice musculation'
  )}`;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col justify-between pb-8">
      {/* HIGHLY PROMINENT TOP CHRONOMETER & PROGRESS BAR */}
      <header className="sticky top-0 z-40 bg-[#111a2e] border-b-2 border-[#233556] shadow-2xl">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
          {/* Top row: session name, prominent timer, actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="p-2 rounded-xl bg-[#16223b] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 transition border border-[#233556] hover:border-rose-800 shrink-0"
                title="Quitter et annuler la séance"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-[#f47b20] font-black uppercase tracking-wider block truncate max-w-[38vw]">
                  {routineName}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  Séance en direct
                </span>
              </div>
            </div>

            {/* VERY PROMINENT CHRONOMETER BADGE */}
            <div className="flex items-center gap-1.5 bg-[#0a0f1d] border-2 border-[#f47b20]/60 rounded-2xl px-2 py-1 sm:px-4 sm:py-1.5 shadow-[0_0_15px_rgba(244,123,32,0.2)] shrink-0">
              <button
                type="button"
                onClick={() => setIsElapsedRunning(!isElapsedRunning)}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#f47b20] hover:bg-[#e06810] text-white flex items-center justify-center transition shadow-sm shrink-0"
                title={isElapsedRunning ? 'Mettre en pause' : 'Reprendre'}
              >
                {isElapsedRunning ? (
                  <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                ) : (
                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <div className="flex items-baseline gap-1">
                <span className="font-mono-numbers text-base sm:text-2xl font-black text-white tracking-tight sm:tracking-wider">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Secondary actions: Overview, sound, finish (2e ligne sur mobile) */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end sm:justify-start pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => setShowOverview(true)}
                className="p-2 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white transition border border-[#233556]"
                title="Aperçu des séries et supersets"
              >
                <List className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  soundEngine.enabled = next;
                }}
                className="p-2 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white transition border border-[#233556]"
                title={soundEnabled ? 'Désactiver les sons' : 'Activer les sons'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#f47b20]" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>

              {/* La croix est redondante : la flèche de retour gère l'annulation. */}

              <button
                type="button"
                onClick={onFinishWorkout}
                className="px-3 py-2 rounded-xl bg-[#16223b] hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-[#233556]"
              >
                Terminer
              </button>
            </div>
          </div>

          {/* LARGE, CLEAR, EYE-CATCHING PROGRESSION BAR */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-sm font-bold gap-2">
              <span className="text-white flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f47b20] animate-pulse shrink-0" />
                <span className="truncate">
                  Étape <span className="text-[#f47b20] font-black font-mono">{currentStepIndex + 1}</span> / {totalStepsCount}
                  <span className="text-slate-400 font-medium"> · {completedStepsCount} validée{completedStepsCount > 1 ? 's' : ''}</span>
                </span>
              </span>
              <span className="font-mono text-base text-[#f47b20] font-black bg-[#0a0f1d] px-2.5 py-0.5 rounded-lg border border-[#233556] shrink-0">
                {percentDone}%
              </span>
            </div>

            {/* Glowing progress bar */}
            <div className="w-full h-3.5 bg-[#0a0f1d] rounded-full overflow-hidden border border-[#233556] p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#e06810] via-[#f47b20] to-[#ffaa5c] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(244,123,32,0.8)]"
                style={{ width: `${percentDone}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Focus Area */}
      <main className="max-w-xl w-full mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        {/* Chrono de repos toujours visible, même en train d'éditer une série */}
        {isRestMode && restHidden && (
          <button
            type="button"
            onClick={() => setRestHidden(false)}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#f47b20] text-white shadow-xl shadow-[#f47b20]/30"
          >
            <Flame className="w-4 h-4" />
            <span className="font-mono-numbers font-black text-base">{formatTime(restSecondsLeft)}</span>
            <span className="text-[11px] font-semibold opacity-90">retour au repos</span>
          </button>
        )}

        {/* PHASE 1: REST COUNTDOWN MODE */}
        {isRestMode && !restHidden ? (
          <div className="bg-[#111a2e] border-2 border-[#f47b20] rounded-3xl p-6 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f47b20]/20 border border-[#f47b20]/40 text-[#f47b20] text-xs font-bold uppercase tracking-wider">
              <Flame className="w-4 h-4" />
              <span>
                {currentStep?.mode === 'superset'
                  ? currentStep.isLastInSupersetRound
                    ? 'Repos de fin de superset'
                    : 'Transition superset'
                  : 'Temps de repos'}
              </span>
            </div>

            {/* Big Countdown Timer */}
            <div className="py-2">
              <div className="font-mono-numbers text-7xl sm:text-8xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(244,123,32,0.3)]">
                {formatTime(restSecondsLeft)}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                {currentStep?.mode === 'superset' && !currentStep.isLastInSupersetRound
                  ? 'Enchaînez sans attendre sur le deuxième exercice du superset'
                  : 'Respirez profondément et préparez-vous pour l\'effort suivant'}
              </p>
            </div>

            {/* What's Coming Next Box */}
            <div className="bg-[#0a0f1d] border border-[#233556] rounded-2xl p-4 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                À suivre immédiatement :
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-white truncate">{nextInfo.title}</h4>
                  <p className="text-xs text-[#f47b20] font-medium">
                    {nextInfo.subtitle}
                    {nextInfo.prescription ? ` · ${nextInfo.prescription}` : ''}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
            </div>

            {/* Rest controls */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRestSecondsLeft((prev) => prev + 15)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#16223b] hover:bg-[#233556] text-slate-300 border border-[#233556] transition"
              >
                +15s
              </button>
              <button
                type="button"
                onClick={() => setRestSecondsLeft((prev) => prev + 30)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#16223b] hover:bg-[#233556] text-slate-300 border border-[#233556] transition"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={advanceToNextStep}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#f47b20] hover:bg-[#e06810] text-white shadow-lg shadow-[#f47b20]/30 transition flex items-center justify-center gap-2"
              >
                <span>Je suis prêt / Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          /* PHASE 2: FOCUSED ACTIVE SET CARD (Alternating supersets, 0.5kg increments) */
          <div className="space-y-4">
            {/* Exercise Header & Superset Grouping Badge */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {currentStep?.mode === 'superset' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#f47b20] text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Repeat className="w-3 h-3" />
                    <span>{currentStep.supersetGroup || 'Superset'} (Alterné)</span>
                  </span>
                )}

                {currentStep?.mode === 'drop_set' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Zap className="w-3 h-3" />
                    <span>Drop Set (Dégressif)</span>
                  </span>
                )}

                {currentStep?.mode === 'ordinaire' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#16223b] text-slate-300 border border-[#233556] uppercase">
                    Ordinaire
                  </span>
                )}

                <span className="text-xs text-slate-400 font-mono">
                  Étape {currentStepIndex + 1}/{steps.length}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentStep?.exerciseName}
              </h2>

              <p className="text-xs text-slate-400">
                {currentStep?.targetMuscle} • Repos suggéré : {currentStep?.recommendedRestSeconds}s
                {currentStep?.partnerExerciseName && (
                  <span className="text-slate-300 font-medium block mt-0.5">
                    Couplé avec : <strong className="text-[#f47b20]">{currentStep.partnerExerciseName}</strong>
                  </span>
                )}
              </p>
            </div>

            {/* Set Ribbon for this exercise */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {currentExercise.sets.map((set, sIdx) => {
                const isCurrent = sIdx === currentStep.setIndex;
                const isDone = set.completed;

                return (
                  <div
                    key={set.id}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-[#f47b20] text-white border-[#f47b20] shadow-md'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-[#111a2e] text-slate-400 border-[#233556]'
                    }`}
                  >
                    <span>Série {set.setNumber}</span>
                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                );
              })}

              {/* Le nombre de séries prescrit par Notion n'est qu'un point de départ :
                  tu peux en ajouter (ou retirer la dernière, si non validée) en séance. */}
              <button
                type="button"
                onClick={handleAddSet}
                title="Ajouter une série à cet exercice"
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#16223b] hover:bg-[#233556] text-[#f47b20] border border-[#233556] hover:border-[#f47b20] transition"
              >
                + Série
              </button>
              {currentExercise.sets.length > 1 && !currentExercise.sets[currentExercise.sets.length - 1].completed && (
                <button
                  type="button"
                  onClick={handleRemoveLastSet}
                  title="Retirer la dernière série"
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-[#16223b] hover:bg-[#233556] text-slate-400 border border-[#233556] transition"
                >
                  −
                </button>
              )}
            </div>

            {/* Current Set Focused Input Card */}
            <div className="bg-[#111a2e] border border-[#233556] rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#233556] pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#f47b20] whitespace-nowrap">
                    Série {currentStep?.setNumber || 1}/{currentStep?.totalSetsOfExercise}
                  </span>

                  {/* Mode switcher trigger */}
                  <select
                    value={currentStep?.mode || 'ordinaire'}
                    onChange={(e) => handleChangeExerciseMode(e.target.value as any)}
                    className="text-[10px] bg-[#0a0f1d] border border-[#233556] rounded-lg px-2 py-0.5 text-slate-300 focus:outline-none"
                  >
                    <option value="superset">Superset (Alterné)</option>
                    <option value="ordinaire">Ordinaire</option>
                    <option value="drop_set">Drop Set (Dégressif)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReplacerModal(true)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-[#f47b20]" />
                  <span>Remplacer</span>
                </button>
              </div>

              {/* Weight & Reps Dual Tactile Controls (0.5 kg increments) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Weight Control with strict 0.5 kg steps */}
                <div className="bg-[#0a0f1d] border border-[#233556] rounded-2xl p-3 text-center space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Charge (kg)
                    </span>
                    <span className="text-[9px] text-[#f47b20] font-mono">pas de 0.5kg</span>
                  </div>

                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateWeight(-0.5)}
                      className="w-9 h-9 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center border border-[#233556] transition"
                      title="-0.5 kg"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={activeSet?.weight ?? 0}
                      onChange={(e) => handleManualWeightChange(parseFloat(e.target.value) || 0)}
                      className="w-16 font-mono-numbers text-xl font-black text-center bg-transparent border-0 text-white focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdateWeight(0.5)}
                      className="w-9 h-9 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center border border-[#233556] transition"
                      title="+0.5 kg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 0.5 kg and quick chips */}
                  <div className="flex items-center justify-center gap-1 pt-0.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleUpdateWeight(-1)}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#16223b] text-slate-400 hover:text-white border border-[#233556]"
                    >
                      -1kg
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateWeight(-0.5)}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#16223b] text-[#f47b20] hover:text-white border border-[#233556]"
                    >
                      -0.5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateWeight(0.5)}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#16223b] text-[#f47b20] hover:text-white border border-[#233556]"
                    >
                      +0.5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateWeight(1)}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#16223b] text-slate-400 hover:text-white border border-[#233556]"
                    >
                      +1kg
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateWeight(2.5)}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#16223b] text-slate-400 hover:text-white border border-[#233556]"
                    >
                      +2.5kg
                    </button>
                  </div>
                </div>

                {/* Reps Control */}
                <div className="bg-[#0a0f1d] border border-[#233556] rounded-2xl p-3 text-center space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block text-left">
                    Répétitions
                  </span>

                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateReps(-1)}
                      className="w-9 h-9 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center border border-[#233556] transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={activeSet?.reps ?? 10}
                      onChange={(e) => handleManualRepsChange(parseInt(e.target.value, 10) || 1)}
                      className="w-14 font-mono-numbers text-xl font-black text-center bg-transparent border-0 text-white focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdateReps(1)}
                      className="w-9 h-9 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white font-bold text-sm flex items-center justify-center border border-[#233556] transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 block pt-0.5 font-medium">
                    Cible : {activeSet?.targetReps || 10} reps
                  </span>
                </div>
              </div>

              {/* Primary Validation Button */}
              <button
                type="button"
                onClick={handleCompleteCurrentSet}
                className="w-full py-4 px-4 rounded-2xl font-black text-sm bg-gradient-to-r from-[#f47b20] to-[#ff9f4d] hover:from-[#e06810] hover:to-[#f47b20] text-white shadow-xl shadow-[#f47b20]/25 transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Valider la série {currentStep?.setNumber}</span>
              </button>
            </div>

            {/* Exercise Visual & Execution Advice */}
            <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-3 flex items-start gap-3 text-xs">
              <ExerciseVisual
                iconKey={currentStep?.iconKey}
                exerciseName={currentStep?.exerciseName}
                category={currentStep?.category}
                targetMuscle={currentStep?.targetMuscle}
                compact
                className="w-24 h-20 shrink-0"
              />
              <div className="space-y-1">
                <span className="font-semibold text-slate-300 text-[11px] block">
                  Conseil d'exécution
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {currentStep?.description}
                </p>
                {currentStep?.tips && (
                  <p className="text-[10px] text-[#f47b20] italic">
                    💡 {currentStep.tips}
                  </p>
                )}
              </div>
            </div>

            {/* NAVIGATION FOOTER WITH "VOIR EN LIGNE" LINK */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#111a2e] border border-[#233556] text-slate-300 disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>

              {/* "Voir en ligne" Direct Google Search Link */}
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a0f1d] border border-[#233556] hover:border-[#f47b20] text-xs text-[#f47b20] hover:text-[#ffaa5c] font-bold transition shadow-sm"
                title={`Rechercher l'exécution de ${currentStep?.exerciseName} sur Google`}
              >
                <span>Voir en ligne</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                disabled={currentStepIndex === steps.length - 1}
                onClick={() => setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#111a2e] border border-[#233556] text-slate-300 disabled:opacity-40 transition flex items-center gap-1"
              >
                <span>Suivant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* OVERVIEW DRAWER */}
      {showOverview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-md w-full p-5 shadow-2xl relative max-h-[85vh] flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#233556]">
              <h3 className="text-sm font-bold text-white">Vue d'ensemble des séries et étapes</h3>
              <button
                type="button"
                onClick={() => setShowOverview(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {steps.map((st, stIdx) => {
                const isCurrent = stIdx === currentStepIndex;
                const setObj = exercises[st.exerciseIndex]?.sets[st.setIndex];
                const isDone = setObj?.completed;

                return (
                  <div
                    key={st.stepId}
                    onClick={() => {
                      // Le chrono de repos NE s'arrête PAS : on masque juste
                      // l'écran de repos le temps d'éditer la série.
                      if (isRestMode) setRestHidden(true);
                      setCurrentStepIndex(stIdx);
                      setShowOverview(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                      isCurrent
                        ? 'bg-[#18253d] border-[#f47b20]'
                        : isDone
                        ? 'bg-[#0d1424] border-emerald-500/30 text-emerald-300'
                        : 'bg-[#0d1424] border-[#233556] hover:bg-[#16223b]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{st.exerciseName}</span>
                        {st.mode === 'superset' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#f47b20]/20 text-[#f47b20]">
                            {st.supersetGroup || 'SS'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Série {st.setNumber}/{st.totalSetsOfExercise} • {setObj?.weight || 0}kg × {setObj?.reps || 10}
                      </span>
                    </div>

                    {isDone ? (
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">#{stIdx + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CANCEL WORKOUT MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111a2e] border-2 border-rose-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Annuler la séance ?</h3>
                <p className="text-xs text-slate-400">
                  Cette action va interrompre le workout sans enregistrer vos séries dans l'historique.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 min-w-0 py-3 px-3 rounded-xl bg-[#16223b] hover:bg-[#233556] text-xs font-semibold text-slate-300 border border-[#233556] transition"
              >
                Continuer la séance
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  onCancelWorkout();
                }}
                className="flex-1 min-w-0 py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md transition"
              >
                Oui, abandonner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXERCISE REPLACER MODAL */}
      {showReplacerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl max-w-md w-full p-5 shadow-2xl relative space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#233556]">
              <h3 className="text-sm font-bold text-white">
                Remplacer {currentStep?.exerciseName}
              </h3>
              <button
                type="button"
                onClick={() => setShowReplacerModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Choisissez un exercice alternatif pour cibler le même groupe musculaire :
            </p>

            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
              {allExercises
                .filter(
                  (ex) =>
                    ex.category === currentExercise.category &&
                    ex.id !== currentExercise.exerciseId
                )
                .map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleReplaceExercise(ex)}
                    className="w-full text-left p-2.5 rounded-xl bg-[#0a0f1d] hover:bg-[#16223b] border border-[#233556] hover:border-[#f47b20] transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{ex.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {ex.equipment} • {ex.targetMuscle}
                      </span>
                    </div>
                    <span className="text-xs text-[#f47b20] font-semibold">Choisir</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
