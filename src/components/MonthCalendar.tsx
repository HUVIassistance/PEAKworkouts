import React from 'react';
import { ChevronLeft, ChevronRight, X, Dumbbell, Footprints, Moon, Check } from 'lucide-react';

export interface MonthDayInfo {
  type: 'workout' | 'bouger' | 'repos';
  done: boolean;
  label?: string;
}

interface MonthCalendarProps {
  month: Date;
  todayStr: string;
  onMonthChange: (d: Date) => void;
  onClose: () => void;
  onSelectDay: (dateStr: string) => void;
  infoFor: (dateStr: string) => MonthDayInfo;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function MonthCalendar({ month, todayStr, onMonthChange, onClose, onSelectDay, infoFor }: MonthCalendarProps) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(new Date(year, m, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => onMonthChange(new Date(year, m + delta, 1));

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111a2e] border border-[#233556] rounded-3xl p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête + navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="w-9 h-9 rounded-xl bg-[#16223b] border border-[#233556] text-slate-300 flex items-center justify-center"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-white capitalize">
            {MONTHS[m]} {year}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shift(1)}
              className="w-9 h-9 rounded-xl bg-[#16223b] border border-[#233556] text-slate-300 flex items-center justify-center"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#16223b] border border-[#233556] text-slate-400 flex items-center justify-center"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-slate-500 text-center">
              {d}
            </span>
          ))}
        </div>

        {/* Grille du mois */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={`e${i}`} />;
            const info = infoFor(dateStr);
            const isToday = dateStr === todayStr;
            const dayNum = Number(dateStr.slice(-2));

            const Icon = info.done ? Check : info.type === 'workout' ? Dumbbell : info.type === 'bouger' ? Footprints : Moon;
            const tone = info.done
              ? 'text-emerald-400'
              : info.type === 'workout'
              ? 'text-[#f47b20]'
              : info.type === 'bouger'
              ? 'text-[#4fa3b8]'
              : 'text-slate-600';

            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => onSelectDay(dateStr)}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5 transition ${
                  isToday
                    ? 'border-[#f47b20] bg-[#f47b20]/10'
                    : info.done
                    ? 'border-emerald-800/60 bg-emerald-950/30'
                    : 'border-[#233556] bg-[#0f172a]'
                }`}
              >
                <span className={`text-[12px] font-bold leading-none ${isToday ? 'text-white' : 'text-slate-300'}`}>
                  {dayNum}
                </span>
                <Icon className={`w-3 h-3 ${tone}`} />
              </button>
            );
          })}
        </div>

        {/* Légende */}
        <div className="flex items-center justify-center gap-3 pt-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" /> fait
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3 text-[#f47b20]" /> muscu
          </span>
          <span className="flex items-center gap-1">
            <Footprints className="w-3 h-3 text-[#4fa3b8]" /> cardio
          </span>
          <span className="flex items-center gap-1">
            <Moon className="w-3 h-3 text-slate-600" /> repos
          </span>
        </div>
        <p className="text-[10px] text-slate-500 text-center pt-2">Touche un jour pour le marquer ou lancer la séance.</p>
      </div>
    </div>
  );
}

export default MonthCalendar;
