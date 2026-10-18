import {
  WorkoutRoutine,
  RoutineExerciseItem,
  ExerciseDefinition,
  TrainingProgram,
  WorkoutSessionLog,
} from '../types/workout.ts';
import {
  getAllExercises,
  saveCustomExercise,
  saveRoutine,
  saveProgram,
  getSettings,
  saveSettings,
  setActiveProgramId,
} from '../utils/storage.ts';

/**
 * Pont avec l'API PEAK (Cloudflare Worker) qui parle à Notion.
 * Le token Notion reste côté serveur : ici on ne connaît qu'une URL + une clé.
 */
const API_BASE = (import.meta as any).env?.VITE_PEAK_API || 'https://peak-api.huvioptimisation.com';
// Clé partagée avec le Worker. Elle est publique dans le bundle (comme toute clé côté
// client) : elle ne protège pas d'un attaquant décidé, elle évite juste le bruit.
const PEAK_KEY = (import.meta as any).env?.VITE_PEAK_KEY || 'c758bf5a07afb578fbe6aba9439d7be9';

// ------------------------------------------------------------------ types distants

export interface RemoteExercise {
  name: string;
  sets: number;
  reps: number;
  repsMax: number | null;
  superset: string | null;
  order: number;
  weightKg: number | null;
  hasWeight: boolean;
}

export interface RemoteWorkout {
  notionId: string;
  name: string;
  sectionLabel: string | null;
  sectionsFound: (string | null)[];
  exercises: RemoteExercise[];
}

export interface RemoteProgram {
  notionId: string;
  name: string;
  planning: { muscu: number | null; cardio: number | null; repos: number | null };
  workouts: RemoteWorkout[];
}

export interface SyncSummary {
  programName: string;
  workouts: number;
  exercises: number;
  createdExercises: number;
  warnings: string[];
}

// ------------------------------------------------------------------ utilitaires

const norm = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function slug(s: string): string {
  return norm(s).replace(/\s+/g, '-').slice(0, 40);
}

/** Retrouve l'exercice dans la banque, sinon le crée (exigence : un exercice inconnu
 *  dans Notion doit apparaître sur le site, pas être ignoré). */
function findOrCreateExercise(name: string, created: string[]): ExerciseDefinition {
  const library = getAllExercises();
  const target = norm(name);
  const hit = library.find((e) => norm(e.name) === target);
  if (hit) return hit;

  const fuzzy = library.find((e) => {
    const n = norm(e.name);
    return n.length > 3 && (n.includes(target) || target.includes(n));
  });
  if (fuzzy) return fuzzy;

  const def: ExerciseDefinition = {
    id: 'custom-' + (slug(name) || Math.random().toString(36).slice(2, 8)),
    name,
    category: 'Corps complet',
    targetMuscle: '',
    equipment: '',
    description: '',
    tips: '',
    iconKey: 'generic',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    restSeconds: 90,
    isCalisthenics: false,
  };
  saveCustomExercise(def);
  created.push(name);
  return def;
}

// ------------------------------------------------------------------ sync Notion → app

export async function fetchRemoteProgram(): Promise<{ program: RemoteProgram | null; warning?: string }> {
  const res = await fetch(API_BASE + '/program', {
    headers: { 'x-peak-key': PEAK_KEY },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'API PEAK ' + res.status);
  }
  return data;
}

/**
 * Applique le programme Notion dans le stockage local.
 * Non destructif : l'historique des séances n'est jamais touché, et les routines
 * importées sont identifiées par leur ID Notion (mise à jour, pas duplication).
 */
export async function syncProgram(): Promise<SyncSummary> {
  const { program, warning } = await fetchRemoteProgram();
  if (!program) throw new Error(warning || 'Aucun programme actif dans Notion.');

  const created: string[] = [];
  const warnings: string[] = [];
  let exerciseCount = 0;

  const workoutIds: string[] = [];

  for (const w of program.workouts) {
    const routineId = 'notion-' + w.notionId;
    workoutIds.push(routineId);

    const items: RoutineExerciseItem[] = w.exercises.map((ex) => {
      const def = findOrCreateExercise(ex.name, created);
      exerciseCount += 1;
      if (!ex.hasWeight) warnings.push(ex.name + ' : aucune charge dans Notion (0 kg)');
      return {
        exerciseId: def.id,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        weight: ex.weightKg ?? 0,
        restSeconds: 90,
        supersetGroup: ex.superset || undefined,
        notes: ex.repsMax ? 'cible ' + ex.reps + '-' + ex.repsMax + ' reps' : undefined,
      };
    });

    const routine: WorkoutRoutine = {
      id: routineId,
      name: w.name,
      description: 'Importé de Notion — séance « ' + (w.sectionLabel || '?') + ' »',
      targetMuscles: [],
      estimatedDurationMinutes: 45,
      difficulty: 'Intermédiaire',
      programId: 'notion-' + program.notionId,
      exercises: items,
      isCustom: false,
      createdAt: new Date().toISOString(),
    };
    saveRoutine(routine);
  }

  const trainingProgram: TrainingProgram = {
    id: 'notion-' + program.notionId,
    name: program.name,
    description: 'Programme actif synchronisé depuis Notion',
    frequency: program.planning.muscu ? program.planning.muscu + 'x musculation / semaine' : '',
    workoutIds,
    isCustom: false,
  };
  saveProgram(trainingProgram);
  // Le programme importé devient le programme actif : l'app doit refléter Notion.
  setActiveProgramId(trainingProgram.id);

  const settings = getSettings();
  saveSettings({
    ...settings,
    planning: program.planning,
    notionProgramId: program.notionId,
    lastSyncAt: new Date().toISOString(),
  });

  return {
    programName: program.name,
    workouts: program.workouts.length,
    exercises: exerciseCount,
    createdExercises: created.length,
    warnings,
  };
}

// ------------------------------------------------------------------ app → Notion

export interface PushResult {
  ok: boolean;
  deduped?: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

/** Envoie une séance terminée dans « Calendrier d'entrainement (Séances) ».
 *  Fire-and-forget : ne doit JAMAIS faire échouer l'enregistrement local. */
export async function pushSessionToNotion(log: WorkoutSessionLog): Promise<PushResult> {
  try {
    const setsPlanned = log.exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
    const payload = {
      sessionId: log.id,
      title: log.routineName + ' — ' + log.dateString,
      date: log.dateString,
      durationMin: Math.round((log.durationSeconds || 0) / 60),
      setsDone: log.totalSetsCompleted,
      setsPlanned,
      volumeKg: Math.round(log.totalVolumeKg || 0),
      notes: log.notes,
      exerciseList: undefined,
      exercises: (log.exercises || []).map((ex) => ({
        name: ex.exerciseName,
        sets: (ex.sets || []).map((s) => ({ weight: s.weight, reps: s.reps })),
      })),
    };
    const res = await fetch(API_BASE + '/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-peak-key': PEAK_KEY },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      console.warn('[peak-api] envoi séance échoué :', data.error || res.status);
      return { ok: false, error: data.error || 'HTTP ' + res.status };
    }
    return { ok: true, deduped: data.deduped, pageId: data.pageId, url: data.url };
  } catch (err: any) {
    console.warn('[peak-api] envoi séance impossible :', err?.message || err);
    return { ok: false, error: err?.message || 'réseau' };
  }
}
