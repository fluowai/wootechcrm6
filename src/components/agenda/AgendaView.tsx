import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  Clock,
  Phone,
  Video,
  Users,
  MapPin,
  X
} from 'lucide-react';
import { TaskActivity } from '../../types';

interface AgendaViewProps {
  tasks: TaskActivity[];
  onToggleTaskStatus: (id: string) => void;
  onCreateTask: (task: TaskActivity) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  onToggleTaskStatus,
  onCreateTask,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'meeting' | 'call' | 'followup' | 'visit' | 'task'>('meeting');
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;
    const newTask: TaskActivity = {
      id: `task-${Date.now()}`,
      title,
      type,
      scheduledAt: new Date().toISOString(),
      status: 'pending',
      notes,
      assignedTo: 'rep-1'
    };
    onCreateTask(newTask);
    setShowModal(false);
    setTitle('');
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon size={20} className="text-blue-600" />
            <span>Agenda & Atividades de Vendas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agendamento de reuniões, follow-ups, chamadas e compromissos vinculados aos negócios.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Agendar Atividade</span>
        </button>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
          Compromissos Pendentes ({tasks.filter((t) => t.status === 'pending').length})
        </div>

        <div className="divide-y divide-slate-100">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                task.status === 'completed' ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggleTaskStatus(task.id)}
                  className={`p-1.5 rounded-lg transition-colors mt-0.5 ${
                    task.status === 'completed' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600'
                  }`}
                >
                  <CheckCircle2 size={20} />
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                      {task.type}
                    </span>
                    <h4 className={`text-xs font-bold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {task.title}
                    </h4>
                  </div>
                  {task.notes && <p className="text-xs text-slate-600 font-medium">{task.notes}</p>}
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 shrink-0">
                <span className="font-bold block text-slate-700">Horário: 14:00</span>
                <span>Atribuído a Vendedor</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Agendar Atividade Comercial</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Título do Compromisso</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião de alinhamento com Diretor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo de Atividade</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  <option value="meeting">Reunião (Video/Presencial)</option>
                  <option value="call">Ligação de Follow-up</option>
                  <option value="followup">Acompanhamento WhatsApp</option>
                  <option value="visit">Visita Comercial</option>
                  <option value="task">Tarefa Operacional</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observações / Pauta</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
