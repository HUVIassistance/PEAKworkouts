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
} from '../utils/storage.ts';

interface HomeViewProps {
  activeProgram: TrainingProgram;
  routines: WorkoutRoutine[];
  history: WorkoutSessionLog[];
  nutritionPlan: DailyNutritionPlan;
  personalRecords: Record<string, PersonalRecord>;
  onStartRoutine: (routine: WorkoutRoutine) => void;
  onNavigateTab: (tab: 'workouts' | 'nutrition' | 'progression' | 'history' | 'exercises') => void;
  onOpenAiGenerator: () => void;
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
  onOpenAiGenerator,
  onRefreshHistory,
}) => {
  const [bougerDates, setBougerDates] = useState<string[]>([]);

  useEffect(() => {
    setBougerDates(getBougerCompletedDates());
  }, []);

  const now = new Date();
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const monthNames = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  // Accurate local date representation
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dayNum = String(now.getDate()).padStart(2, '0');
  const todayDateStr = `${year}-${month}-${dayNum}`;

  const formattedDate = `${dayNames[now.getDay()]} ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // Workouts belonging to active program
  const seanceA = routines.find((r) => r.id === 'seance-a-push-pull-core') || routines[0];
  const seanceB = routines.find((r) => r.id === 'seance-b-epaules-pecs-renfo') || routines[1] || routines[0];

  // Specific planned athlete schedule aligned on user's exact cycle:
  // 14 oct: Séance B (Mercredi)
  // 15 oct: Bouger (Jeudi)
  // 16 oct: Séance A (Vendredi)
  // 17 oct: Bouger (Samedi)
  // 18 oct: Séance B (Dimanche)
  // 19 oct: Repos (Lundi)
  // 20 oct: Bouger (Mardi)
  // 21 oct: Séance A (Mercredi)
  const plannedCycle: Record<string, {
    type: 'workout' | 'bouger' | 'repos';
    title: string;
    subtitle: string;
    routine?: WorkoutRoutine;
  }> = {
    '2026-10-12': { type: 'repos', title: 'Repos', subtitle: 'Récupération' },
    '2026-10-13': { type: 'bouger', title: 'Bouger', subtitle: 'Cardio / sport' },
    '2026-10-14': { type: 'workout', title: 'Séance B', subtitle: 'Épaules + pecs + renforcement', routine: seanceB },
    '2026-10-15': { type: 'bouger', title: 'Bouger', subtitle: 'Cardio / sport', routine: undefined },
    '2026-10-16': { type: 'workout', title: 'Séance A', subtitle: 'Push + pull + core', routine: seanceA },
    '2026-10-17': { type: 'bouger', title: 'Bouger', subtitle: 'Cardio, sport ou endurance', routine: undefined },
    '2026-10-18': { type: 'workout', title: 'Séance B', subtitle: 'Épaules + pecs + renforcement', routine: seanceB },
    '2026-10-19': { type: 'repos', title: 'Repos', subtitle: 'Récupération complète', routine: undefined },
    '2026-10-20': { type: 'bouger', title: 'Bouger', subtitle: 'Cardio / sport', routine: undefined },
    '2026-10-21': { type: 'workout', title: 'Séance A', subtitle: 'Push + pull + core', routine: seanceA },
    '2026-10-22': { type: 'bouger', title: 'Bouger', subtitle: 'Cardio / sport', routine: undefined },
    '2026-10-23': { type: 'workout', title: 'Séance B', subtitle: 'Épaules + pecs + renforcement', routine: seanceB },
  };

  // Determine today's plan
  const todayPlan = plannedCycle[todayDateStr] || {
    type: now.getDay() === 1 ? 'repos' : now.getDay() % 2 === 0 ? 'workout' : 'bouger',
    title: now.getDay() === 1 ? 'Repos' : now.getDay() % 2 === 0 ? 'Séance B' : 'Bouger',
    subtitle: now.getDay() === 1 ? 'Récupération' : now.getDay() % 2 === 0 ? 'Musculation' : 'Cardio / sport',
    routine: seanceB,
  };

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
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1 = Lun, 7 = Dim
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - currentDayOfWeek + 1);

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

    const planInfo = plannedCycle[dateStr] || {
      type: i === 6 ? 'repos' : i % 2 === 0 ? 'workout' : 'bouger',
      title: i === 6 ? 'Repos' : i % 2 === 0 ? 'Séance' : 'Bouger',
      subtitle: i === 6 ? 'Récupération' : i % 2 === 0 ? 'Musculation' : 'Cardio',
    };

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

  // Streak calculation
  const calculateStreak = (): number => {
    if (history.length === 0) return 0;
    const sortedDates = Array.from(new Set(history.map((h) => h.dateString))).sort().reverse();
    const today = todayDateStr;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const cur = new Date(sortedDates[i]);
      const prev = new Date(sortedDates[i + 1]);
      const diff = Math.round((cur.getTime() - prev.getTime()) / (1000 * 3600 * 24));
      if (diff === 1) streak++;
      else break;
    }
    return streak;
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
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#f47b20] font-mono">
                {formattedDate}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-medium">{activeProgram.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bonjour, {getSettings().firstName} !
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Rythme 3x par semaine : 1 jour Musculation alterné avec 1 jour « Bouger », 7e jour Repos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAiGenerator}
              className="px-3.5 py-2 rounded-2xl bg-[#16223b] hover:bg-[#233556] border border-[#233556] hover:border-[#f47b20] text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#f47b20]" />
              <span>Générer une séance IA</span>
            </button>
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
                onClick={() => onStartRoutine(seanceB)}
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
                onClick={() => onStartRoutine(seanceA)}
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
                    onClick={() => onStartRoutine(seanceB)}
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
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#f47b20] text-white">
                      Séance du jour
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
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
                    onClick={() => onStartRoutine(todayPlan.routine || seanceA)}
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
            <div
              key={idx}
              className={`rounded-2xl p-2 sm:p-2.5 text-center flex flex-col justify-between min-h-[100px] border transition ${
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

              <div className="my-1">
                {day.hasCompleted ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold mx-auto">
                    ✓
                  </span>
                ) : day.planType === 'workout' ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f47b20]/20 text-[#f47b20] font-bold block truncate">
                    {day.planTitle}
                  </span>
                ) : day.planType === 'bouger' ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-bold block truncate">
                    Bouger
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold block truncate">
                    Repos
                  </span>
                )}
              </div>

              {day.isToday && (
                <span className="text-[8px] font-black uppercase text-[#f47b20] tracking-wider block">
                  Aujourd'hui
                </span>
              )}
            </div>
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
            onClick={() => {
              resetWorkoutHistoryToDefaults();
              if (onRefreshHistory) onRefreshHistory();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-[#0d1424] hover:bg-[#16223b] border border-[#233556] text-[10px] font-semibold text-slate-400 hover:text-white transition flex items-center gap-1"
            title="Synchroniser strictement avec vos séances réelles des 14 et 16 octobre"
          >
            <RotateCcw className="w-3 h-3 text-[#f47b20]" />
            <span>Séances réelles (14 & 16 oct)</span>
          </button>

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
    </div>
  );
};
