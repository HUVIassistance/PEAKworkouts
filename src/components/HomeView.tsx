import React, { useState, useEffect } from 'react';
import {
  WorkoutRoutine,
  WorkoutSessionLog,
  TrainingProgram,
  DailyNutritionPlan,
  PersonalRecord,
} from '../types/workout.ts';
import {
  Flame,
  Calendar,
  Play,
  CheckCircle2,
  X,
  Dumbbell,
  Clock,
  Sparkles,
  ArrowRight,
  Utensils,
  Trophy,
  Activity,
  Heart,
  ChevronRight,
  Footprints,
  Moon,
  Bike,
  RotateCcw,
} from 'lucide-react';
import {
  getBougerCompletedDates,
  toggleBougerCompletedDate,
  resetWorkoutHistoryToDefaults,
  getSettings,
  localDateString,
  trainingDateString,
} from '../utils/storage.ts';

interface HomeViewProps {
  activeProgram: TrainingProgram;
  routines: WorkoutRoutine[];
  history: WorkoutSessionLog[];
  nutritionPlan: DailyNutritionPlan;
  personalRecords: Record<string, PersonalRecord>;
  onStartRoutine: (routine: WorkoutRoutine, dateStr?: string) => void;
  onNavigateTab: (tab: 'workouts' | 'nutrition' | 'progression' | 'history' | 'exercises') => void;
  onRefreshHistory?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  activeProgram,
  routines,
  history,
  nutritionPlan,
  personalRecords,
  onStartRoutine,
  onNavigateTab,
  onRefreshHistory,
}) => {
  const [bougerDates, setBougerDates] = useState<string[]>([]);
  const [daySheet, setDaySheet] = useState<string | null>(null);

  useEffect(() => {
    setBougerDates(getBougerCompletedDates());
  }, []);

  const now = new Date();
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const monthNames = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  // Jour d'entraînement : bascule à 4 h du matin (une séance à 00 h 30 reste
  // rattachée à la veille), pour coller à un usage nocturne.
  const todayDateStr = trainingDateString(now);
  const todayRef = new Date(todayDateStr + 'T12:00:00');

  const formattedDate = `${dayNames[todayRef.getDay()]} ${todayRef.getDate()} ${monthNames[todayRef.getMonth()]} ${todayRef.getFullYear()}`;

  // Workouts belonging to active program (IDs Notion ou par défaut)
  const programRoutines = routines.filter((r) => r.programId === activeProgram.id);
  const seanceA = programRoutines[0] || routines[0];
  const seanceB = programRoutines[1] || routines[1] || routines[0];


  // --- Cycle d'entraînement -----------------------------------------------------
  // Le rythme n'est PAS calé sur les jours de la semaine : c'est un cycle glissant
  // (muscu → bouger → muscu → … → repos) ancré sur la DERNIÈRE activité réelle.
  // Invariant garanti : le lendemain d'une séance de musculation n'est jamais une
  // séance de musculation.
  const settingsNow = getSettings();
  const planMuscu = settingsNow.planning?.muscu ?? 3;
  const planCardio = settingsNow.planning?.cardio ?? 3;

  const toDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const daysBetween = (a: string, b: string) =>
    Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);

  const activityDates = Array.from(
    new Set([...history.map((h) => h.dateString), ...bougerDates])
  ).sort();
  const lastActivity = activityDates.length ? activityDates[activityDates.length - 1] : todayDateStr;
  const lastWasWorkout = history.some((h) => h.dateString === lastActivity);
  const anchorType: 'workout' | 'bouger' = lastWasWorkout ? 'workout' : 'bouger';

  // Cycle complet : alternance à partir du type de l'ancre, repos en fin de cycle.
  const cycle: ('workout' | 'bouger' | 'repos')[] = (() => {
    const out: ('workout' | 'bouger' | 'repos')[] = [];
    let m = planMuscu;
    let c = planCardio;
    let next: 'workout' | 'bouger' = anchorType;
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
  })();

  const cycleTypeFor = (dateStr: string): 'workout' | 'bouger' | 'repos' => {
    const pos = ((daysBetween(lastActivity, dateStr) % cycle.length) + cycle.length) % cycle.length;
    return cycle[pos];
  };

  /** Routine attribuée à un jour de musculation (rotation dans le programme actif). */
  const routineForDate = (dateStr: string) => {
    const list = programRoutines.length ? programRoutines : routines;
    if (!list.length) return undefined;
    const n = daysBetween(lastActivity, dateStr);
    let count = 0;
    for (let k = 0; k <= n; k += 1) {
      const d = new Date(toDate(lastActivity).getTime() + k * 86400000);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (cycleTypeFor(ds) === 'workout') count += 1;
    }
    return list[(count - 1 + list.length * 10) % list.length];
  };

  const planForDate = (dateStr: string) => {
    const type = cycleTypeFor(dateStr);
    if (type === 'workout') {
      const r = routineForDate(dateStr);
      return { type, title: 'Musculation', subtitle: r?.name || 'Séance', routine: r };
    }
    if (type === 'bouger') {
      return { type, title: 'Bouger', subtitle: 'Cardio / sport', routine: undefined };
    }
    return { type, title: 'Repos', subtitle: 'Récupération', routine: undefined };
  };

  const todayPlan = planForDate(todayDateStr);

  // Check if today has a workout logged
  const todayWorkoutSession = history.find((h) => h.dateString === todayDateStr);
  const isTodayBougerDone = bougerDates.includes(todayDateStr);

  const handleToggleTodayBouger = () => {
    const isNowDone = toggleBougerCompletedDate(todayDateStr);
    if (isNowDone) {
      setBougerDates((prev) => [...prev, todayDateStr]);
    } else {
      setBougerDates((prev) => prev.filter((d) => d !== todayDateStr));
    }
  };

  // Calendar for current week (Lun 12 oct to Dim 18 oct)
  const currentDayOfWeek = todayRef.getDay() === 0 ? 7 : todayRef.getDay(); // 1 = Lun, 7 = Dim
  const mondayDate = new Date(todayRef);
  mondayDate.setDate(todayRef.getDate() - currentDayOfWeek + 1);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    const dYear = d.getFullYear();
    const dMonth = String(d.getMonth() + 1).padStart(2, '0');
    const dDay = String(d.getDate()).padStart(2, '0');
    const dateStr = `${dYear}-${dMonth}-${dDay}`;
    const isToday = dateStr === todayDateStr;

    // Check if a workout log exists for this date in history
    const completedLog = history.find((h) => h.dateString === dateStr);
    const completedBouger = bougerDates.includes(dateStr);

    const planInfo = planForDate(dateStr);

    return {
      dayShort: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
      dateNumber: d.getDate(),
      dateStr,
      isToday,
      planType: planInfo.type,
      planTitle: planInfo.title,
      planSubtitle: planInfo.subtitle,
      hasCompleted: !!completedLog || completedBouger,
      completedWorkoutName: completedLog?.routineName || (completedBouger ? 'Bouger validé' : undefined),
    };
  });

  // Streak : jours consécutifs SANS journée manquée.
  //  - séance enregistrée ou jour marqué « fait » -> +1
  //  - repos PRÉVU au programme -> +1 aussi : il fait partie de la série
  //    (sinon 18 + repos 19 + 20 n'affichait que 2 au lieu de 3)
  //  - journée active non faite -> la série s'arrête
  //  - « rien fait aujourd'hui » ne casse rien : on part d'hier
  const calculateStreak = (): number => {
    const active = new Set([...history.map((h) => h.dateString), ...bougerDates]);
    if (!active.size) return 0;
    const cursor = new Date(todayDateStr + 'T12:00:00');
    if (!active.has(todayDateStr)) cursor.setDate(cursor.getDate() - 1);

    // On collecte les jours consécutifs (du plus récent au plus ancien), puis on
    // retire les repos en fin de série : un repos ne compte que s'il est encadré
    // par de l'activité (sinon une seule séance afficherait déjà « 2 »).
    const run: { ds: string; isRest: boolean }[] = [];
    for (let guard = 0; guard < 400; guard += 1) {
      const ds = localDateString(cursor);
      if (active.has(ds)) {
        run.push({ ds, isRest: false });
      } else if (cycleTypeFor(ds) === 'repos') {
        run.push({ ds, isRest: true });
      } else {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    let n = run.length;
    while (n > 0 && run[n - 1].isRest) n -= 1;
    return n;
  };

  const streak = calculateStreak();

  // Nutrition snapshot
  const totalCalories = nutritionPlan.meals.reduce(
    (acc, m) => acc + m.foods.reduce((fAcc, f) => fAcc + f.calories, 0),
    0
  );
  const totalProtein = nutritionPlan.meals.reduce(
    (acc, m) => acc + m.foods.reduce((fAcc, f) => fAcc + f.proteinGrams, 0),
    0
  );

  // Top PR
  const prList = Object.values(personalRecords);
  const topPR = prList.length > 0 ? prList[0] : null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#111a2e] to-[#16233d] border border-[#233556] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#f47b20] font-mono whitespace-nowrap">
                {formattedDate}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-medium min-w-0">{activeProgram.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bonjour, {getSettings().firstName} !
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              {(() => {
                const p = getSettings().planning;
                if (p && (p.muscu || p.cardio || p.repos)) {
                  const bits: string[] = [];
                  if (p.muscu) bits.push(p.muscu + 'x musculation');
                  if (p.cardio) bits.push(p.cardio + 'x cardio');
                  if (p.repos) bits.push(p.repos + ' jour' + (p.repos > 1 ? 's' : '') + ' de repos');
                  return 'Rythme hebdo : ' + bits.join(' · ') + '.';
                }
                return 'Rythme 3x par semaine : 1 jour Musculation alterné avec 1 jour « Bouger », 7e jour Repos.';
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* SÉANCE DU JOUR / STATUT HERO */}
      {/* CASE 1: TODAY IS A 'BOUGER' DAY */}
      {todayPlan.type === 'bouger' && (
        <div className={`bg-[#111a2e] border-2 rounded-3xl p-5 shadow-xl transition space-y-4 ${
          isTodayBougerDone ? 'border-emerald-500/70' : 'border-teal-500/60'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-teal-400" />
                  <span>Aujourd'hui : Journée active</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {todayDateStr}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Bouger : Cardio, sport ou endurance</span>
                {isTodayBougerDone && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 inline" />
                )}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Pas de musculation lourde au programme aujourd'hui. L'objectif est d'oxygéner le corps, stimuler la circulation sanguine et entretenir le cardio pour accélérer votre récupération active.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={handleToggleTodayBouger}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isTodayBougerDone
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/30'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isTodayBougerDone ? '✓ Bouger accompli aujourd\'hui' : 'Marquer comme accompli'}</span>
              </button>

              <button
                type="button"
                onClick={() => onStartRoutine(seanceB, todayDateStr)}
                className="px-3 py-2 rounded-2xl bg-[#0d1424] hover:bg-[#16223b] border border-[#233556] text-[11px] font-semibold text-slate-400 hover:text-white transition flex items-center justify-center gap-1"
                title="Faire la Séance B en avance si vous préférez soulever de la fonte"
              >
                <span>Ou faire Séance B en avance</span>
                <ArrowRight className="w-3 h-3 text-[#f47b20]" />
              </button>
            </div>
          </div>

          {/* Activity ideas pills */}
          <div className="pt-2 border-t border-[#233556]/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
              Suggestions pour votre journée « Bouger » :
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-2.5 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block">Marche active</span>
                  <span className="text-[10px] text-slate-400">8 000 - 10 000 pas</span>
                </div>
              </div>

              <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-2.5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block">Course / Footing</span>
                  <span className="text-[10px] text-slate-400">20-30 min d'endurance</span>
                </div>
              </div>

              <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-2.5 flex items-center gap-2">
                <Bike className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block">Vélo / Sport</span>
                  <span className="text-[10px] text-slate-400">Cardio modéré</span>
                </div>
              </div>

              <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-2.5 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block">Mobilité / Yoga</span>
                  <span className="text-[10px] text-slate-400">Étirements calisthénie</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: TODAY IS A 'REPOS' DAY */}
      {todayPlan.type === 'repos' && (
        <div className="bg-[#111a2e] border-2 border-indigo-500/60 rounded-3xl p-5 shadow-xl transition space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>Aujourd'hui : Jour de repos</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {todayDateStr}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Repos & Récupération complète
              </h2>

              <p className="text-xs text-slate-300 max-w-xl">
                C'est pendant le repos que vos muscles se reconstruisent et s'adaptent. Accordez-vous une journée sans effort intense : hydratez-vous, soignez vos apports en protéines et visez 8 heures de sommeil.
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => onStartRoutine(seanceA, todayDateStr)}
                className="px-3.5 py-2 rounded-2xl bg-[#0d1424] hover:bg-[#16223b] border border-[#233556] text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                <span>Lancer Séance A quand même</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f47b20]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASE 3: TODAY IS A 'WORKOUT' DAY */}
      {todayPlan.type === 'workout' && (
        <>
          {todayWorkoutSession ? (
            // Sub-case: Today's workout already completed!
            <div className="bg-[#111a2e] border-2 border-emerald-500/60 rounded-3xl p-5 shadow-xl transition space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                      <span>Séance du jour validée</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {todayDateStr}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {todayWorkoutSession.routineName}
                  </h2>

                  <p className="text-xs text-slate-300">
                    Bravo pour votre intensité aujourd'hui ! Demain, place à une journée <strong>« Bouger »</strong> pour stimuler votre récupération active.
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-xs text-slate-400 font-mono">
                    <span className="text-emerald-400 font-bold">
                      ✓ {todayWorkoutSession.totalSetsCompleted} séries réalisées
                    </span>
                    <span>•</span>
                    <span>{Math.floor(todayWorkoutSession.durationSeconds / 60)} min d'effort</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">{todayWorkoutSession.feeling || '🔥 Top'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => onStartRoutine(seanceB, todayDateStr)}
                    className="px-4 py-2.5 rounded-2xl bg-[#16223b] hover:bg-[#233556] border border-[#233556] hover:border-[#f47b20] text-xs font-bold text-white transition flex items-center gap-1.5"
                  >
                    <span>Autre séance en avance</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#f47b20]" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Sub-case: Workout to do today
            <div className="bg-[#111a2e] border-2 border-[#f47b20] rounded-3xl p-5 shadow-xl transition relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#f47b20] text-white whitespace-nowrap">
                      Séance du jour
                    </span>
                    <span className="text-xs text-slate-400 font-mono truncate min-w-0">
                      {activeProgram.name}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-[#f47b20] transition">
                    {todayPlan.routine?.name || seanceA.name}
                  </h2>

                  <p className="text-xs text-slate-300 line-clamp-2 max-w-xl">
                    {todayPlan.routine?.description || seanceA.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-[#f47b20]" />
                      ~{todayPlan.routine?.estimatedDurationMinutes || 45} min
                    </span>
                    <span className="flex items-center gap-1 text-slate-200">
                      <Dumbbell className="w-3.5 h-3.5 text-slate-400" />
                      {todayPlan.routine?.exercises.length || 6} exercices en supersets
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => onStartRoutine(todayPlan.routine || seanceA, todayDateStr)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#f47b20] to-[#ff9f4d] hover:from-[#e06810] hover:to-[#f47b20] text-white font-black text-sm shadow-lg shadow-[#f47b20]/25 transition flex items-center justify-center gap-2 group-hover:scale-105 transform duration-150"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Lancer le workout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* CALENDRIER HEBDOMADAIRE (RYTHME : WORKOUT / BOUGER / REPOS) */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-3xl p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#233556] pb-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#f47b20]" />
            <h3 className="font-bold text-white text-sm">
              Rythme hebdomadaire (Séances & Jours « Bouger »)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            3 paires (Workout + Bouger) + 7e jour Repos
          </span>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((day, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => setDaySheet(day.dateStr)}
              className={`rounded-2xl p-1.5 sm:p-2.5 text-center flex flex-col justify-between min-h-[84px] sm:min-h-[100px] border transition active:scale-95 ${
                day.isToday
                  ? 'bg-[#18253d] border-[#f47b20] shadow-md ring-1 ring-[#f47b20]'
                  : day.hasCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-[#0d1424] border-[#233556]'
              }`}
            >
              <div>
                <span className={`text-[10px] font-bold uppercase block ${day.isToday ? 'text-[#f47b20]' : 'text-slate-400'}`}>
                  {day.dayShort}
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white block mt-0.5">
                  {day.dateNumber}
                </span>
              </div>

              <div className="my-1 flex items-center justify-center">
                {day.hasCompleted ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold">
                    ✓
                  </span>
                ) : day.planType === 'workout' ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#f47b20]/20 text-[#f47b20]">
                    <Dumbbell className="w-3 h-3" />
                  </span>
                ) : day.planType === 'bouger' ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-teal-500/20 text-teal-300">
                    <Footprints className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300">
                    <Moon className="w-3 h-3" />
                  </span>
                )}
              </div>

              {day.isToday && (
                <span className="text-[8px] font-black uppercase text-[#f47b20] tracking-tight block">
                  AUJ.
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* QUICK STATS & RECOVERY COMFORT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Streak card */}
        <div
          onClick={() => onNavigateTab('progression')}
          className="bg-[#111a2e] border border-[#233556] hover:border-slate-600 rounded-2xl p-4 shadow-sm cursor-pointer transition flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Série active
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-white">{streak}</span>
              <span className="text-xs text-slate-400">jours consécutifs</span>
            </div>
            <span className="text-[11px] text-[#f47b20] font-semibold block">
              Discipline exemplaire !
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f47b20] to-[#ff9f4d] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Nutrition snapshot card */}
        <div
          onClick={() => onNavigateTab('nutrition')}
          className="bg-[#111a2e] border border-[#233556] hover:border-slate-600 rounded-2xl p-4 shadow-sm cursor-pointer transition flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Nutrition du jour
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black text-white">{totalCalories}</span>
              <span className="text-xs text-slate-400">/ {nutritionPlan.targetCalories} kcal</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold block">
              {totalProtein}g protéines enregistrées
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#16223b] border border-[#233556] flex items-center justify-center text-emerald-400 shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        {/* PR snapshot card */}
        <div
          onClick={() => onNavigateTab('progression')}
          className="bg-[#111a2e] border border-[#233556] hover:border-slate-600 rounded-2xl p-4 shadow-sm cursor-pointer transition flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Dernier record
            </span>
            <div className="font-mono text-lg font-black text-amber-400 truncate max-w-[150px]">
              {topPR ? `${topPR.maxWeight} kg` : '20 kg'}
            </div>
            <span className="text-[11px] text-slate-300 font-medium truncate max-w-[150px] block">
              {topPR ? topPR.exerciseName : 'Romanian deadlift (RDL)'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#16223b] border border-[#233556] flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ATHLETE RECOVERY & SYNC BUTTON */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Footprints className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Principe des journées « Bouger »</h4>
            <p className="text-[11px] text-slate-400">
              Entre deux séances de musculation, 30 à 45 min de cardio modéré, marche active ou sport stimulent la synthèse protéique et l'élimination des toxines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('workouts')}
            className="px-3 py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] border border-[#233556] text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1"
          >
            <span>Voir mes workouts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feuille du jour : marquer une journée faite, ou lancer la séance prévue */}
      {daySheet && (() => {
        const sheetDay = weekDays.find((d) => d.dateStr === daySheet);
        const isDone = !!sheetDay?.hasCompleted;
        const isWorkoutDay = sheetDay?.planType === 'workout';
        const routine = isWorkoutDay ? routineForDate(daySheet) : undefined;
        const [y, m, d] = daySheet.split('-');
        const label = `${d}/${m}/${y}`;
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3" onClick={() => setDaySheet(null)}>
            <div className="w-full max-w-md bg-[#111a2e] border border-[#233556] rounded-3xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white">{label}</h3>
                  <p className="text-xs text-slate-400">
                    {isWorkoutDay ? 'Séance de musculation prévue' : sheetDay?.planType === 'bouger' ? 'Journée « Bouger »' : 'Jour de repos'}
                    {routine ? ` · ${routine.name}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => setDaySheet(null)} className="p-2 rounded-xl bg-[#16223b] border border-[#233556] text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nowDone = toggleBougerCompletedDate(daySheet);
                  setBougerDates((prev) => (nowDone ? [...prev, daySheet] : prev.filter((x) => x !== daySheet)));
                  setDaySheet(null);
                }}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                  isDone ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40' : 'bg-[#f47b20] hover:bg-[#e06810] text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isDone ? 'Retirer la marque « fait »' : 'Marquer comme fait'}
              </button>

              {routine && (
                <button
                  type="button"
                  onClick={() => {
                    setDaySheet(null);
                    onStartRoutine(routine, daySheet || todayDateStr);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-[#16223b] hover:bg-[#233556] border border-[#233556] text-white flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-[#f47b20]" />
                  Lancer cette séance
                </button>
              )}

              <p className="text-[11px] text-slate-500 text-center">
                Marquer une journée fait avancer ta série de jours consécutifs.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
