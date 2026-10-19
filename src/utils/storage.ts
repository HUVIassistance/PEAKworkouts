import {
  WorkoutRoutine,
  WorkoutSessionLog,
  PersonalRecord,
  ExerciseDefinition,
  TrainingProgram,
  DailyNutritionPlan,
} from '../types/workout.ts';
import { DEFAULT_ROUTINES, DEFAULT_PROGRAMS } from '../data/defaultRoutines.ts';
import { DEFAULT_EXERCISES } from '../data/defaultExercises.ts';

const ROUTINES_STORAGE_KEY = 'peakform_workouts_v2';
const PROGRAMS_STORAGE_KEY = 'peakform_programs_v2';
const ACTIVE_PROGRAM_KEY = 'peakform_active_program_id_v2';
const HISTORY_STORAGE_KEY = 'peakform_history_v6';
const PRS_STORAGE_KEY = 'peakform_prs_v6';
const BOUGER_LOGS_KEY = 'peakform_bouger_logs_v1';
const CUSTOM_EXERCISES_KEY = 'peakform_custom_exercises_v2';
const ACTIVE_WORKOUT_KEY = 'peakform_active_workout_v2';
const SETTINGS_KEY = 'peakform_settings_v2';
const NUTRITION_STORAGE_KEY = 'peakform_nutrition_v2';

export interface AppSettings {
  soundEnabled: boolean;
  autoStartRestTimer: boolean;
  vibrationEnabled: boolean;
  /** Prénom affiché dans l'accueil (« Bonjour, Hugo ! »). */
  firstName: string;
  /** Planning hebdomadaire (synchronisé depuis Notion). */
  planning?: { muscu: number | null; cardio: number | null; repos: number | null };
  /** ID Notion du programme actif (traçabilité du dernier sync). */
  notionProgramId?: string;
  lastSyncAt?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  autoStartRestTimer: true,
  vibrationEnabled: true,
  firstName: 'Hugo',
};

/** Ajoute ou met à jour un exercice personnalisé (banque locale). */
export function saveCustomExercise(def: ExerciseDefinition): void {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    const custom: ExerciseDefinition[] = raw ? JSON.parse(raw) : [];
    const i = custom.findIndex((c) => c.id === def.id);
    if (i >= 0) custom[i] = def;
    else custom.push(def);
    localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(custom));
  } catch {
    // Ignore
  }
}

/**
 * Supprime les exercices créés automatiquement par un import Notion qui ne sont
 * plus référencés par aucune routine (doublons d'anciens imports).
 * Ne touche JAMAIS aux exercices ajoutés à la main : seuls les ids issus de
 * l'import (`custom-notion-…`) et la liste d'ids historiques transmise sont éligibles.
 */
export function pruneImportedExercises(keepIds: string[], legacyIds: string[]): number {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    if (!raw) return 0;
    const custom: ExerciseDefinition[] = JSON.parse(raw);
    const keep = new Set(keepIds);
    const legacy = new Set(legacyIds);
    const kept = custom.filter((c) => {
      const fromImporter = c.id.startsWith('custom-notion-') || legacy.has(c.id);
      return !(fromImporter && !keep.has(c.id));
    });
    const removed = custom.length - kept.length;
    if (removed > 0) localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(kept));
    return removed;
  } catch {
    return 0;
  }
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function getAllExercises(): ExerciseDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    const custom: ExerciseDefinition[] = raw ? JSON.parse(raw) : [];
    const merged = [...DEFAULT_EXERCISES];
    custom.forEach((c) => {
      if (!merged.some((m) => m.id === c.id)) {
        merged.push(c);
      }
    });
    return merged;
  } catch {
    return DEFAULT_EXERCISES;
  }
}

export function getPrograms(): TrainingProgram[] {
  try {
    const raw = localStorage.getItem(PROGRAMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(DEFAULT_PROGRAMS));
      return DEFAULT_PROGRAMS;
    }
    const parsed = JSON.parse(raw);
    return parsed.length > 0 ? parsed : DEFAULT_PROGRAMS;
  } catch {
    return DEFAULT_PROGRAMS;
  }
}

export function saveProgram(program: TrainingProgram): void {
  const current = getPrograms();
  const index = current.findIndex((p) => p.id === program.id);
  if (index >= 0) {
    current[index] = program;
  } else {
    current.push(program);
  }
  localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(current));
}

export function deleteProgram(programId: string): void {
  const current = getPrograms();
  const filtered = current.filter((p) => p.id !== programId);
  localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(filtered));
}

export function getActiveProgramId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_PROGRAM_KEY);
    return raw || 'prog-athlete-current';
  } catch {
    return 'prog-athlete-current';
  }
}

export function setActiveProgramId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROGRAM_KEY, id);
  } catch {
    // Ignore
  }
}

export function getRoutines(): WorkoutRoutine[] {
  try {
    const raw = localStorage.getItem(ROUTINES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(DEFAULT_ROUTINES));
      return DEFAULT_ROUTINES;
    }
    const stored: WorkoutRoutine[] = JSON.parse(raw);
    DEFAULT_ROUTINES.forEach((defR) => {
      if (!stored.some((s) => s.id === defR.id)) {
        stored.push(defR);
      }
    });
    return stored;
  } catch {
    return DEFAULT_ROUTINES;
  }
}

export function saveRoutine(routine: WorkoutRoutine): void {
  const current = getRoutines();
  const index = current.findIndex((r) => r.id === routine.id);
  if (index >= 0) {
    current[index] = routine;
  } else {
    current.unshift(routine);
  }
  localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(current));
}

export function deleteRoutine(routineId: string): void {
  const current = getRoutines();
  const filtered = current.filter((r) => r.id !== routineId);
  localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(filtered));
}

/** Date locale au format YYYY-MM-DD (PAS UTC : une séance de 23h reste le jour même).
 *  Utiliser partout où l'on date une séance, un log ou un export. */
export function localDateString(date?: Date): string {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWorkoutHistory(): WorkoutSessionLog[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      // Plus AUCUNE séance de démonstration : l'historique démarre vide.
      // (Les anciennes versions seedaient de faux logs, ce qui faisait apparaître
      // des jours « validés » dans le calendrier alors qu'aucune séance n'avait eu lieu.)
      ['peakform_history_v1', 'peakform_history_v2', 'peakform_history_v3', 'peakform_history_v4', 'peakform_history_v5'].forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      });
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function resetWorkoutHistoryToDefaults(): WorkoutSessionLog[] {
  try {
    ['peakform_history_v1', 'peakform_history_v2', 'peakform_history_v3', 'peakform_history_v4', 'peakform_history_v5'].forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
    // Historique vidé — plus aucune séance de démonstration.
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(PRS_STORAGE_KEY, JSON.stringify({}));
    return [];
  } catch {
    return [];
  }
}

export function getBougerCompletedDates(): string[] {
  try {
    const raw = localStorage.getItem(BOUGER_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleBougerCompletedDate(dateStr: string): boolean {
  try {
    const list = getBougerCompletedDates();
    let isCompleted = false;
    let nextList: string[];
    if (list.includes(dateStr)) {
      nextList = list.filter((d) => d !== dateStr);
      isCompleted = false;
    } else {
      nextList = [...list, dateStr];
      isCompleted = true;
    }
    localStorage.setItem(BOUGER_LOGS_KEY, JSON.stringify(nextList));
    return isCompleted;
  } catch {
    return false;
  }
}

export function saveWorkoutLog(log: WorkoutSessionLog): void {
  const history = getWorkoutHistory();
  history.unshift(log);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));

  updatePRsFromSession(log);
}

export function deleteWorkoutLog(logId: string): void {
  const history = getWorkoutHistory().filter((h) => h.id !== logId);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export function getLastWeightForExercise(exerciseName: string, exerciseId?: string): number | null {
  const history = getWorkoutHistory();
  const searchName = exerciseName.toLowerCase().trim();
  for (const session of history) {
    const foundEx = session.exercises.find((e) => {
      const eName = e.exerciseName.toLowerCase().trim();
      return eName === searchName || (exerciseId && eName.includes(exerciseId.toLowerCase()));
    });
    if (foundEx) {
      const completedSets = foundEx.sets.filter((s) => s.completed && s.weight !== undefined && s.weight > 0);
      if (completedSets.length > 0) {
        return completedSets[completedSets.length - 1].weight;
      }
    }
  }
  return null;
}

export function getPersonalRecords(): Record<string, PersonalRecord> {
  try {
    const raw = localStorage.getItem(PRS_STORAGE_KEY);
    if (!raw) {
      const initialPRs = calculatePRsFromHistory(getWorkoutHistory());
      localStorage.setItem(PRS_STORAGE_KEY, JSON.stringify(initialPRs));
      return initialPRs;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function updatePRsFromSession(log: WorkoutSessionLog): void {
  const prs = getPersonalRecords();
  for (const ex of log.exercises) {
    for (const set of ex.sets) {
      if (set.completed && set.weight > 0) {
        const existing = prs[ex.exerciseName];
        if (!existing) {
          prs[ex.exerciseName] = {
            exerciseName: ex.exerciseName,
            maxWeight: set.weight,
            maxRepsAtMaxWeight: set.reps,
            achievedDate: log.dateString,
            initialWeight: set.weight,
          };
        } else if (set.weight > existing.maxWeight) {
          prs[ex.exerciseName] = {
            ...existing,
            maxWeight: set.weight,
            maxRepsAtMaxWeight: set.reps,
            achievedDate: log.dateString,
            initialWeight: existing.initialWeight || existing.maxWeight,
          };
        }
      }
    }
  }
  localStorage.setItem(PRS_STORAGE_KEY, JSON.stringify(prs));
}

function calculatePRsFromHistory(history: WorkoutSessionLog[]): Record<string, PersonalRecord> {
  const prs: Record<string, PersonalRecord> = {};
  for (const session of [...history].reverse()) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.completed && set.weight > 0) {
          const current = prs[ex.exerciseName];
          if (!current) {
            prs[ex.exerciseName] = {
              exerciseName: ex.exerciseName,
              maxWeight: set.weight,
              maxRepsAtMaxWeight: set.reps,
              achievedDate: session.dateString,
              initialWeight: set.weight,
            };
          } else if (set.weight > current.maxWeight) {
            prs[ex.exerciseName] = {
              ...current,
              maxWeight: set.weight,
              maxRepsAtMaxWeight: set.reps,
              achievedDate: session.dateString,
            };
          }
        }
      }
    }
  }
  return prs;
}

export function saveActiveWorkoutState(data: any): void {
  try {
    if (data === null) {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    } else {
      localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(data));
    }
  } catch {
    // Ignore
  }
}

export function getActiveWorkoutState(): any {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Nutrition storage
export const DEFAULT_NUTRITION_PLAN: DailyNutritionPlan = {
  targetCalories: 2450,
  targetProtein: 160,
  targetCarbs: 260,
  targetFat: 75,
  meals: [
    {
      id: 'meal-1',
      mealType: 'Petit-déjeuner',
      foods: [
        { id: 'f-1', name: 'Flocons d\'avoine', portion: '80g', calories: 295, proteinGrams: 11, carbsGrams: 48, fatGrams: 5 },
        { id: 'f-2', name: 'Oeufs entiers (3)', portion: '150g', calories: 215, proteinGrams: 18, carbsGrams: 1, fatGrams: 15 },
        { id: 'f-3', name: 'Banane', portion: '1 pièce (110g)', calories: 98, proteinGrams: 1, carbsGrams: 23, fatGrams: 0 },
      ],
    },
    {
      id: 'meal-2',
      mealType: 'Déjeuner',
      foods: [
        { id: 'f-4', name: 'Blanc de poulet grillé', portion: '180g', calories: 290, proteinGrams: 55, carbsGrams: 0, fatGrams: 6 },
        { id: 'f-5', name: 'Riz basmati cuit', portion: '200g', calories: 260, proteinGrams: 6, carbsGrams: 56, fatGrams: 1 },
        { id: 'f-6', name: 'Brocolis et haricots verts', portion: '150g', calories: 45, proteinGrams: 3, carbsGrams: 7, fatGrams: 0 },
        { id: 'f-7', name: 'Huile d\'olive vierge', portion: '1 c. à soupe (10g)', calories: 90, proteinGrams: 0, carbsGrams: 0, fatGrams: 10 },
      ],
    },
    {
      id: 'meal-3',
      mealType: 'Collation / Pré-workout',
      foods: [
        { id: 'f-8', name: 'Shaker de Whey Isolate', portion: '30g', calories: 120, proteinGrams: 25, carbsGrams: 2, fatGrams: 1 },
        { id: 'f-9', name: 'Amandes ou noix', portion: '30g', calories: 180, proteinGrams: 6, carbsGrams: 3, fatGrams: 16 },
      ],
    },
    {
      id: 'meal-4',
      mealType: 'Dîner',
      foods: [
        { id: 'f-10', name: 'Pavé de saumon ou boeuf 5%', portion: '150g', calories: 310, proteinGrams: 34, carbsGrams: 0, fatGrams: 19 },
        { id: 'f-11', name: 'Patates douces rôties', portion: '200g', calories: 172, proteinGrams: 3, carbsGrams: 40, fatGrams: 0 },
        { id: 'f-12', name: 'Salade verte et avocat', portion: '1/2 avocat', calories: 140, proteinGrams: 2, carbsGrams: 5, fatGrams: 13 },
      ],
    },
  ],
};

export function getNutritionPlan(): DailyNutritionPlan {
  try {
    const raw = localStorage.getItem(NUTRITION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_NUTRITION_PLAN;
  } catch {
    return DEFAULT_NUTRITION_PLAN;
  }
}

export function saveNutritionPlan(plan: DailyNutritionPlan): void {
  try {
    localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Ignore
  }
}

function generateInitialWorkoutLogs(): WorkoutSessionLog[] {
  // Wipe any legacy dummy storage keys
  try {
    localStorage.removeItem('peakform_history_v2');
    localStorage.removeItem('peakform_history_v3');
    localStorage.removeItem('peakform_prs_v2');
    localStorage.removeItem('peakform_prs_v3');
  } catch {
    // Ignore
  }

  // Real athlete logs:
  // 1. Mercredi 14 octobre 2026 : Séance B
  // 2. Vendredi 16 octobre 2026 : Séance A
  const t14 = new Date('2026-10-14T17:30:00Z').getTime();
  const t16 = new Date('2026-10-16T18:00:00Z').getTime();

  return [
    {
      id: 'real-log-2026-10-16',
      routineName: 'Séance A : push + pull + core',
      startTime: t16 - 45 * 60 * 1000,
      endTime: t16,
      durationSeconds: 2700,
      totalVolumeKg: 1008,
      totalSetsCompleted: 19,
      dateString: '2026-10-16',
      feeling: '🔥 Top',
      notes: 'Excellentes sensations sur les supersets push-ups et goblet squats.',
      exercises: [
        {
          exerciseName: 'Push-ups',
          category: 'Pectoraux',
          sets: [
            { setNumber: 1, weight: 0, reps: 15, completed: true },
            { setNumber: 2, weight: 0, reps: 14, completed: true },
            { setNumber: 3, weight: 0, reps: 12, completed: true },
          ],
        },
        {
          exerciseName: 'Goblet squats',
          category: 'Jambes',
          sets: [
            { setNumber: 1, weight: 16, reps: 12, completed: true },
            { setNumber: 2, weight: 16, reps: 12, completed: true },
            { setNumber: 3, weight: 16, reps: 12, completed: true },
          ],
        },
        {
          exerciseName: 'Bar dips',
          category: 'Triceps',
          sets: [
            { setNumber: 1, weight: 0, reps: 8, completed: true },
            { setNumber: 2, weight: 0, reps: 8, completed: true },
            { setNumber: 3, weight: 0, reps: 8, completed: true },
          ],
        },
        {
          exerciseName: 'Seated band rows',
          category: 'Dos',
          sets: [
            { setNumber: 1, weight: 0, reps: 12, completed: true },
            { setNumber: 2, weight: 0, reps: 12, completed: true },
            { setNumber: 3, weight: 0, reps: 12, completed: true },
            { setNumber: 4, weight: 0, reps: 12, completed: true },
          ],
        },
        {
          exerciseName: 'Dumbbell curls',
          category: 'Biceps',
          sets: [
            { setNumber: 1, weight: 12, reps: 12, completed: true },
            { setNumber: 2, weight: 12, reps: 12, completed: true },
            { setNumber: 3, weight: 12, reps: 12, completed: true },
          ],
        },
        {
          exerciseName: 'Deadbugs',
          category: 'Abdos',
          sets: [
            { setNumber: 1, weight: 0, reps: 12, completed: true },
            { setNumber: 2, weight: 0, reps: 12, completed: true },
            { setNumber: 3, weight: 0, reps: 12, completed: true },
          ],
        },
      ],
    },
    {
      id: 'real-log-2026-10-14',
      routineName: 'Séance B : épaules + pecs + renforcement',
      startTime: t14 - 45 * 60 * 1000,
      endTime: t14,
      durationSeconds: 2700,
      totalVolumeKg: 3408,
      totalSetsCompleted: 21,
      dateString: '2026-10-14',
      feeling: '💪 Bon',
      notes: 'Séance productive, bonne forme sur les haltères et le renfo.',
      exercises: [
        {
          exerciseName: 'Incline chest press',
          category: 'Pectoraux',
          sets: [
            { setNumber: 1, weight: 18, reps: 12, completed: true },
            { setNumber: 2, weight: 18, reps: 12, completed: true },
            { setNumber: 3, weight: 18, reps: 12, completed: true },
          ],
        },
        {
          exerciseName: 'Dumbbell rows',
          category: 'Dos',
          sets: [
            { setNumber: 1, weight: 18, reps: 12, completed: true },
            { setNumber: 2, weight: 18, reps: 12, completed: true },
            { setNumber: 3, weight: 18, reps: 12, completed: true },
          ],
        },
        {
          exerciseName: 'Shoulder press',
          category: 'Épaules',
          sets: [
            { setNumber: 1, weight: 14, reps: 10, completed: true },
            { setNumber: 2, weight: 14, reps: 9, completed: true },
            { setNumber: 3, weight: 14, reps: 8, completed: true },
          ],
        },
        {
          exerciseName: 'Lateral raises',
          category: 'Épaules',
          sets: [
            { setNumber: 1, weight: 8, reps: 15, completed: true },
            { setNumber: 2, weight: 8, reps: 15, completed: true },
            { setNumber: 3, weight: 8, reps: 15, completed: true },
          ],
        },
        {
          exerciseName: 'Romanian deadlift (RDL)',
          category: 'Jambes',
          sets: [
            { setNumber: 1, weight: 20, reps: 15, completed: true },
            { setNumber: 2, weight: 20, reps: 15, completed: true },
            { setNumber: 3, weight: 20, reps: 15, completed: true },
          ],
        },
        {
          exerciseName: 'Hip thrust / Glute bridge',
          category: 'Jambes',
          sets: [
            { setNumber: 1, weight: 12, reps: 12, completed: true },
            { setNumber: 2, weight: 12, reps: 12, completed: true },
            { setNumber: 3, weight: 12, reps: 12, completed: true },
          ],
        },
        {
          exerciseName: 'Bird dog',
          category: 'Abdos',
          sets: [
            { setNumber: 1, weight: 0, reps: 10, completed: true },
            { setNumber: 2, weight: 0, reps: 10, completed: true },
            { setNumber: 3, weight: 0, reps: 10, completed: true },
          ],
        },
      ],
    },
  ];
}
