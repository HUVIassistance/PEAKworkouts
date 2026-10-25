/** Cycle d'entraînement + série active : logique PARTAGÉE.
 *  Un seul calcul pour l'accueil et la page Progression — sinon les deux écrans
 *  affichent des chiffres différents (bug « 7 jours » vs « 1 jour »). */
import { localDateString, trainingDateString } from './storage.ts';

export type DayType = 'workout' | 'bouger' | 'repos';

export interface Planning {
  muscu: number;
  cardio: number;
  repos?: number;
}

const toDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const daysBetween = (a: string, b: string): number =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);

export const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Motif du cycle : alternance muscu / cardio, repos en fin de cycle. */
export function buildTrainingCycle(planning: Planning): DayType[] {
  const out: DayType[] = [];
  let m = Math.max(0, planning.muscu ?? 3);
  let c = Math.max(0, planning.cardio ?? 3);
  let next: 'workout' | 'bouger' = 'workout';

  while (m > 0 || c > 0) {
    if (next === 'workout' && m > 0) {
      out.push('workout');
      m -= 1;
      next = 'bouger';
    } else if (next === 'bouger' && c > 0) {
      out.push('bouger');
      c -= 1;
      next = 'workout';
    } else if (m > 0) {
      out.push('workout');
      m -= 1;
    } else {
      out.push('bouger');
      c -= 1;
    }
  }
  while (out.length < 7) out.push('repos');
  return out.slice(0, 7);
}

/** Résolveur de type de jour, ancré sur la dernière séance de MUSCULATION. */
export function makeCycleResolver(workoutDateStrings: string[], planning: Planning) {
  const workoutDates = Array.from(new Set(workoutDateStrings.filter(Boolean))).sort();
  const lastWorkout = workoutDates.length ? workoutDates[workoutDates.length - 1] : trainingDateString();
  const cycle = buildTrainingCycle(planning);

  const typeFor = (dateStr: string): DayType => {
    const pos = ((daysBetween(lastWorkout, dateStr) % cycle.length) + cycle.length) % cycle.length;
    return cycle[pos];
  };

  return { lastWorkout, cycle, typeFor };
}

/** Série active : jours de sport consécutifs.
 *  - séance ou jour de sport marqué « fait » -> +1
 *  - repos prévu ou cardio non fait -> neutre (ni compté, ni cassant)
 *  - séance de musculation prévue et non faite -> la série s'arrête */
export function computeStreak(
  activeDates: Iterable<string>,
  todayStr: string,
  typeFor: (d: string) => DayType
): number {
  const active = new Set(activeDates);
  if (!active.size) return 0;

  const cursor = new Date(todayStr + 'T12:00:00');
  if (!active.has(todayStr)) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  for (let guard = 0; guard < 400; guard += 1) {
    const ds = localDateString(cursor);
    const type = typeFor(ds);
    if (active.has(ds)) {
      streak += 1;
    } else if (type === 'repos' || type === 'bouger') {
      // neutre
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ------------------------------------------------------------------ paliers

export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 180, 365];

export const isMilestone = (streak: number): boolean => STREAK_MILESTONES.includes(streak);

export const nextMilestone = (streak: number): number => {
  const next = STREAK_MILESTONES.find((m) => m > streak);
  return next ?? Math.ceil((streak + 1) / 90) * 90;
};

/** Une phrase par palier — court, factuel, sans folklore. */
export const MILESTONE_NOTES: Record<number, string> = {
  7: 'Une semaine : le cerveau commence à associer l’effort à une récompense. C’est là que l’habitude prend racine.',
  14: 'Deux semaines : le comportement demande déjà moins d’effort de décision — il devient plus automatique qu’intentionnel.',
  21: 'Trois semaines : la répétition s’installe. Les jours « sans » deviennent l’exception plutôt que la règle.',
  30: 'Un mois : la littérature sur l’automatisation (Lally, 2010) situe l’ancrage autour de 66 jours en moyenne. Tu es à mi-chemin.',
  60: 'Deux mois : l’effort coûte moins. Le corps et l’agenda anticipent la séance avant même que tu y penses.',
  90: 'Trois mois : l’habitude est devenue une part de ton identité — c’est ce qui la rend stable dans le temps.',
  180: 'Six mois : la régularité n’est plus une décision, c’est un réflexe. Rare, et ça se voit sur les charges.',
  365: 'Un an. La régularité a changé ce que ton corps considère comme normal.',
};
