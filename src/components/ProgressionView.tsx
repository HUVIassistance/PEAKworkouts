import React, { useState } from 'react';
import {
  WorkoutSessionLog,
  PersonalRecord,
  MuscleGroup,
} from '../types/workout.ts';
import {
  TrendingUp,
  Trophy,
  Flame,
  Calendar,
  Clock,
  Dumbbell,
  CheckCircle,
  BarChart2,
  PieChart,
  Percent,
  ArrowUpRight,
} from 'lucide-react';

interface ProgressionViewProps {
  history: WorkoutSessionLog[];
  personalRecords: Record<string, PersonalRecord>;
}

export const ProgressionView: React.FC<ProgressionViewProps> = ({
  history,
  personalRecords,
}) => {
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'all' | 'month' | 'week'>('all');

  const totalWorkouts = history.length;
  const totalVolumeKg = history.reduce((acc, h) => acc + h.totalVolumeKg, 0);
  const totalSeconds = history.reduce((acc, h) => acc + h.durationSeconds, 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  // Time calculations
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay() || 7;
  startOfWeek.setDate(startOfWeek.getDate() - day + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const workoutsThisWeek = history.filter((h) => new Date(h.startTime) >= startOfWeek).length;
  const workoutsLastWeek = history.filter(
    (h) => new Date(h.startTime) >= startOfLastWeek && new Date(h.startTime) < startOfWeek
  ).length;
  const workoutsThisMonth = history.filter((h) => new Date(h.startTime) >= startOfMonth).length;

  // Streak calculation
  const calculateStreak = (): number => {
    if (history.length === 0) return 0;
    const sortedDates = Array.from(new Set(history.map((h) => h.dateString))).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0;
    }

    let streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const prev = new Date(sortedDates[i + 1]);
      const diffDays = Math.round((current.getTime() - prev.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Calculate percentage weight increase per exercise
  // Comparison between earliest logged weight and highest/latest weight
  const exerciseProgressions: {
    name: string;
    initialWeight: number;
    currentMaxWeight: number;
    percentIncrease: number;
    totalSetsDone: number;
  }[] = [];

  const exerciseHistories: Record<string, { weights: number[]; setsCount: number }> = {};
  [...history].reverse().forEach((session) => {
    session.exercises.forEach((ex) => {
      if (!exerciseHistories[ex.exerciseName]) {
        exerciseHistories[ex.exerciseName] = { weights: [], setsCount: 0 };
      }
      ex.sets.forEach((s) => {
        if (s.completed && s.weight > 0) {
          exerciseHistories[ex.exerciseName].weights.push(s.weight);
        }
        if (s.completed) {
          exerciseHistories[ex.exerciseName].setsCount++;
        }
      });
    });
  });

  Object.entries(exerciseHistories).forEach(([name, data]) => {
    if (data.weights.length > 0) {
      const initial = data.weights[0];
      const max = Math.max(...data.weights);
      const pr = personalRecords[name];
      const actualMax = pr ? Math.max(pr.maxWeight, max) : max;
      const percent = initial > 0 ? ((actualMax - initial) / initial) * 100 : 0;

      exerciseProgressions.push({
        name,
        initialWeight: initial,
        currentMaxWeight: actualMax,
        percentIncrease: Math.round(percent * 10) / 10,
        totalSetsDone: data.setsCount,
      });
    }
  });

  exerciseProgressions.sort((a, b) => b.percentIncrease - a.percentIncrease);

  // Muscle group breakdown
  const muscleCounts: Record<string, number> = {};
  history.forEach((session) => {
    session.exercises.forEach((ex) => {
      const cat = ex.category || 'Corps complet';
      const completedSets = ex.sets.filter((s) => s.completed).length;
      muscleCounts[cat] = (muscleCounts[cat] || 0) + completedSets;
    });
  });

  const totalLoggedSets = Object.values(muscleCounts).reduce((a, b) => a + b, 0) || 1;

  // Recent volume progression chart data
  const recentSessions = [...history].reverse().slice(-8);
  const maxVolume = Math.max(1000, ...recentSessions.map((s) => s.totalVolumeKg));

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Overview Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#111a2e] border border-[#233556] rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#f47b20] to-[#ff9f4d] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Série active
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono-numbers text-xl font-bold text-white">{streak}</span>
              <span className="text-[11px] text-slate-400">jours consécutifs</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111a2e] border border-[#233556] rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#16223b] border border-[#233556] flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Total séances
            </span>
            <span className="font-mono-numbers text-xl font-bold text-white">{totalWorkouts}</span>
          </div>
        </div>

        <div className="bg-[#111a2e] border border-[#233556] rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#16223b] border border-[#233556] flex items-center justify-center text-[#38bdf8] shrink-0">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Volume cumulé
            </span>
            <span className="font-mono-numbers text-xl font-bold text-white">
              {(totalVolumeKg / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-400">tonnes</span>
            </span>
          </div>
        </div>

        <div className="bg-[#111a2e] border border-[#233556] rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#16223b] border border-[#233556] flex items-center justify-center text-purple-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Temps d'effort
            </span>
            <span className="font-mono-numbers text-xl font-bold text-white">
              {totalHours} <span className="text-xs font-normal text-slate-400">heures</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: FREQUENCY & PERIOD ANALYSIS */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#233556] pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#f47b20]" />
            <h3 className="font-bold text-white text-sm">
              Fréquence d'entraînement par période
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {workoutsThisWeek >= 3 ? '🎯 Objectif 3x/semaine atteint' : `${workoutsThisWeek}/3 séances`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Cette semaine */}
          <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Cette semaine
            </span>
            <div className="font-mono-numbers text-2xl font-black text-white">
              {workoutsThisWeek} <span className="text-xs text-slate-400 font-normal">séances</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Semaine précédente : {workoutsLastWeek} séance{workoutsLastWeek > 1 ? 's' : ''}
            </span>
          </div>

          {/* Ce mois-ci */}
          <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Ce mois-ci
            </span>
            <div className="font-mono-numbers text-2xl font-black text-[#f47b20]">
              {workoutsThisMonth} <span className="text-xs text-slate-400 font-normal">séances</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Régularité : ~{(workoutsThisMonth / Math.max(1, (now.getDate() / 7))).toFixed(1)} / sem.
            </span>
          </div>

          {/* Moyenne hebdomadaire */}
          <div className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Moyenne générale
            </span>
            <div className="font-mono-numbers text-2xl font-black text-emerald-400">
              {totalWorkouts > 0 ? (totalWorkouts / Math.max(1, Math.ceil(totalWorkouts / 3))).toFixed(1) : 0}
              <span className="text-xs text-slate-400 font-normal"> / sem.</span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Rythme optimal 1 jour sur 2
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PERCENTAGE WEIGHT PROGRESSION (AUGMENTATION DES CHARGES EN %) */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#233556] pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#f47b20]" />
            <h3 className="font-bold text-white text-sm">
              Augmentation des charges (% de progression)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Comparé à votre premier enregistrement
          </span>
        </div>

        {exerciseProgressions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {exerciseProgressions.map((prog, idx) => (
              <div
                key={idx}
                className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white truncate">
                    {prog.name}
                  </h4>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                    <span>Départ: {prog.initialWeight}kg</span>
                    <span>→</span>
                    <span className="text-slate-200 font-bold">Actuel: {prog.currentMaxWeight}kg</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>+{prog.percentIncrease}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {prog.totalSetsDone} séries loguées
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Enregistrez plusieurs séances avec des charges pour voir vos pourcentages de progression.
          </div>
        )}
      </div>

      {/* SECTION 3: VOLUME EVOLUTION CHART */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#233556] pb-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#f47b20]" />
            <h3 className="font-bold text-white text-sm">
              Évolution du volume de travail par séance (kg soulevés)
            </h3>
          </div>
          <span className="text-xs font-mono text-[#f47b20]">
            Moyenne : {totalWorkouts > 0 ? Math.round(totalVolumeKg / totalWorkouts) : 0} kg/séance
          </span>
        </div>

        {recentSessions.length > 0 ? (
          <div className="pt-2">
            <div className="h-36 flex items-end gap-2 sm:gap-4 px-1">
              {recentSessions.map((session, sIdx) => {
                const heightPercent = Math.max(12, Math.round((session.totalVolumeKg / maxVolume) * 100));
                return (
                  <div key={sIdx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="font-mono text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {session.totalVolumeKg}kg
                    </span>
                    <div
                      className="w-full bg-[#18253d] group-hover:bg-[#f47b20] border border-[#233556] group-hover:border-[#f47b20] rounded-t-lg transition-all duration-200 relative"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[50px]">
                      {session.dateString.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Le graphique apparaîtra dès votre première séance terminée.
          </div>
        )}
      </div>

      {/* SECTION 4: MUSCLE GROUP DISTRIBUTION */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#233556] pb-2">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#f47b20]" />
            <h3 className="font-bold text-white text-sm">
              Répartition du volume par groupe musculaire
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Basé sur les séries complétées
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Object.entries(muscleCounts).map(([muscle, count]) => {
            const pct = Math.round((count / totalLoggedSets) * 100);
            return (
              <div
                key={muscle}
                className="bg-[#0d1424] border border-[#233556] rounded-xl p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{muscle}</span>
                  <span className="font-mono text-[#f47b20] font-bold">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#16223b] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#e06810] to-[#f47b20] rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">
                  {count} série{count > 1 ? 's' : ''} effectuées
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: PERSONAL RECORDS (PR) TABLE */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#233556] pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              Tableau des records personnels (PRs)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {Object.keys(personalRecords).length} records établis
          </span>
        </div>

        {Object.keys(personalRecords).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(personalRecords).map((pr, idx) => (
              <div
                key={idx}
                className="bg-[#0d1424] border border-[#233556] rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-xs text-white">{pr.exerciseName}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Établi le {pr.achievedDate}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-black text-amber-400">
                    {pr.maxWeight} kg
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {pr.maxRepsAtMaxWeight} reps max
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Aucun record personnel détecté pour le moment.
          </div>
        )}
      </div>
    </div>
  );
};
