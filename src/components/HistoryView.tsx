import React, { useState } from 'react';
import { WorkoutSessionLog } from '../types/workout.ts';
import { localDateString } from '../utils/storage.ts';
import {
  Calendar,
  Clock,
  Dumbbell,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  Upload,
  Search,
  Flame,
  Trophy,
} from 'lucide-react';

interface HistoryViewProps {
  history: WorkoutSessionLog[];
  onDeleteLog: (id: string) => void;
  onImportLogs: (logs: WorkoutSessionLog[]) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onDeleteLog,
  onImportLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(
    history.length > 0 ? history[0].id : null
  );
  // Inline confirmation state without window.confirm (which is blocked by sandboxed iframes)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredHistory = history.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.routineName.toLowerCase().includes(q) ||
      log.dateString.includes(q) ||
      (log.feeling && log.feeling.toLowerCase().includes(q))
    );
  });

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    return `${mins} min`;
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `peakform-historique-${localDateString()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportLogs(parsed);
        }
      } catch (err) {
        console.error('Erreur import JSON:', err);
      }
    };
    reader.readAsText(file);
  };

  const executeDelete = (id: string) => {
    onDeleteLog(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Banner and Actions */}
      <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#f47b20]" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Journal des séances ({history.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Historique complet de vos entraînements enregistrés et performances.
          </p>
        </div>

        {/* Search & Export/Import Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une séance..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#0d1424] border border-[#233556] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f47b20] w-44"
            />
          </div>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white border border-[#233556] text-xs font-medium transition"
            title="Exporter l'historique en JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#f47b20]" />
            <span className="hidden sm:inline">Exporter</span>
          </button>

          <label
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#16223b] hover:bg-[#233556] text-slate-300 hover:text-white border border-[#233556] text-xs font-medium transition cursor-pointer"
            title="Restaurer un fichier JSON"
          >
            <Upload className="w-3.5 h-3.5 text-[#f47b20]" />
            <span className="hidden sm:inline">Importer</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-2.5">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isDeleting = confirmDeleteId === log.id;

            return (
              <div
                key={log.id}
                className="bg-[#111a2e] border border-[#233556] rounded-2xl overflow-hidden transition shadow-sm hover:border-slate-600"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-[#f47b20] font-bold">
                        {log.dateString}
                      </span>
                      {log.feeling && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16223b] border border-[#233556] text-slate-200">
                          {log.feeling}
                        </span>
                      )}
                      {log.newPrs && log.newPrs.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                          <Trophy className="w-2.5 h-2.5" />
                          <span>{log.newPrs.length} PR</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white">{log.routineName}</h3>
                    {log.notes && (
                      <p className="text-xs text-slate-400 italic line-clamp-1">
                        "{log.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                    <div className="text-right">
                      <div className="font-mono-numbers text-xs font-bold text-[#f47b20]">
                        {log.totalVolumeKg} kg
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDuration(log.durationSeconds)} • {log.totalSetsCompleted} séries
                      </div>
                    </div>

                    {/* Inline Delete Confirmation to avoid iframe window.confirm issues */}
                    {isDeleting ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 bg-[#200f14] border border-rose-800 p-1 rounded-xl"
                      >
                        <span className="text-[10px] text-rose-300 font-bold px-1">
                          Supprimer ?
                        </span>
                        <button
                          type="button"
                          onClick={() => executeDelete(log.id)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(log.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                        title="Supprimer la séance"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-[#1c2a44] bg-[#0d1424] space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block pt-1">
                      Détail des exercices et séries
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {log.exercises.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="bg-[#111a2e] border border-[#233556] rounded-xl p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-white truncate max-w-[170px]">
                              {ex.exerciseName}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-medium">
                              {ex.category}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {ex.sets.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-medium ${
                                  s.completed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                S{s.setNumber}: {s.weight}kg × {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-[#111a2e] border border-[#233556] rounded-2xl p-8 text-center text-xs text-slate-400 space-y-1">
            <p>Aucune séance enregistrée dans le journal.</p>
            <p className="text-slate-500">
              Lancez un workout pour commencer à archiver vos séances quotidiennes !
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
