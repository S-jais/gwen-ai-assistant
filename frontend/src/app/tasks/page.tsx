'use client';

import React, { useEffect, useState } from 'react';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Filter,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { TaskItem } from '@/types';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDeadline, setNewDeadline] = useState('');
  const [newDayNumber, setNewDayNumber] = useState<number | undefined>(undefined);

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks(
        statusFilter === 'all' ? undefined : statusFilter,
        priorityFilter === 'all' ? undefined : priorityFilter
      );
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  const handleToggleStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(task.id, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.createTask({
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        deadline: newDeadline || undefined,
        day_number: newDayNumber || undefined,
        status: 'pending',
        agent_source: 'User Manual',
      });
      setTasks([created, ...tasks]);
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewDeadline('');
      setNewDayNumber(undefined);
    } catch (err) {
      console.error(err);
    }
  };

  // Group tasks by day number if study schedule exists
  const groupedTasks: { [key: string]: TaskItem[] } = {};
  tasks.forEach((t) => {
    const groupKey = t.day_number ? `Day ${t.day_number}` : 'General Action Items';
    if (!groupedTasks[groupKey]) groupedTasks[groupKey] = [];
    groupedTasks[groupKey].push(t);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-['Outfit'] font-extrabold text-white tracking-tight">
            Strategic <span className="glow-text-duo">Task Planner</span>
          </h1>
          <p className="text-sm font-['Space_Grotesk'] text-[#94a3b8] mt-1">
            Automated milestones, study plans, and actionable task management.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-duo flex items-center gap-2 text-xs font-['Space_Grotesk'] font-bold uppercase tracking-wider self-start sm:self-auto shadow-[0_0_15px_rgba(255,26,64,0.3)]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Task</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-[#0d1017]/85 backdrop-blur-xl rounded-xl border border-[#ff1a40]/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 text-xs font-mono text-[#94a3b8]">
          <Filter className="w-3.5 h-3.5 text-[#ff1a40]" />
          <span>Status:</span>
        </div>
        {['all', 'pending', 'completed'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
              statusFilter === st
                ? 'bg-[#ff1a40]/20 text-[#ff1a40] border border-[#ff1a40]/45 shadow-[0_0_8px_rgba(255,26,64,0.2)]'
                : 'text-[#94a3b8] hover:text-white bg-[#11141e] border border-transparent hover:border-[#ff1a40]/20'
            }`}
          >
            {st}
          </button>
        ))}

        <div className="h-4 w-[1px] bg-[#1e2333] mx-2 hidden sm:block" />

        <div className="flex items-center gap-2 text-xs font-mono text-[#94a3b8]">
          <span>Priority:</span>
        </div>
        {['all', 'urgent', 'high', 'medium', 'low'].map((pr) => (
          <button
            key={pr}
            onClick={() => setPriorityFilter(pr)}
            className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
              priorityFilter === pr
                ? 'bg-[#ff1a40]/20 text-[#ff1a40] border border-[#ff1a40]/45 shadow-[0_0_8px_rgba(255,26,64,0.2)]'
                : 'text-[#94a3b8] hover:text-white bg-[#11141e] border border-transparent hover:border-[#ff1a40]/20'
            }`}
          >
            {pr}
          </button>
        ))}
      </div>

      {/* Task List / Grouped View */}
      {Object.keys(groupedTasks).length === 0 ? (
        <div className="text-center py-16 bg-[#0d1017]/80 backdrop-blur-xl rounded-2xl border border-dashed border-[#ff1a40]/20">
          <ListTodo className="w-10 h-10 text-[#475569] mx-auto mb-3" />
          <h3 className="text-base font-medium text-white">No tasks found</h3>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-sm mx-auto">
            You can create a task manually or ask GWEN in Chat to formulate a 10-day preparation schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupTitle, groupItems]) => (
            <div key={groupTitle} className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#ff1a40]" />
                <h3 className="font-['Outfit'] font-bold text-base text-white">{groupTitle}</h3>
                <span className="text-[11px] font-mono text-[#ff1a40] bg-[#ff1a40]/10 border border-[#ff1a40]/25 px-2 py-0.5 rounded">
                  {groupItems.length} items
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {groupItems.map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all backdrop-blur-md ${
                        isDone
                          ? 'bg-[#090b10]/90 border-[#1e2333] opacity-60'
                          : 'bg-[#0d1017]/85 border-[#ff1a40]/20 hover:border-[#ff1a40]/45 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleStatus(task)}
                          className="mt-0.5 text-[#94a3b8] hover:text-[#ff1a40] transition-colors"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-[#ff1a40]" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#64748b]" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <h4
                            className={`text-sm font-semibold ${
                              isDone ? 'line-through text-[#64748b]' : 'text-white'
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-[#94a3b8] font-['Space_Grotesk'] whitespace-pre-line">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                            {task.deadline && (
                              <span className="flex items-center gap-1 font-mono text-[#ff1a40]">
                                <Clock className="w-3 h-3" />
                                {task.deadline}
                              </span>
                            )}
                            <span className="font-mono text-[#475569]">•</span>
                            <span className="text-[#64748b]">Source: {task.agent_source}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border bg-[#ff1a40]/15 border-[#ff1a40]/35 text-[#ff1a40] shadow-[0_0_6px_rgba(255,26,64,0.15)]`}
                        >
                          {task.priority}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 rounded-lg hover:bg-[#1f2434] text-[#64748b] hover:text-[#ff1a40] transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0d1017] border border-[#ff1a40]/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
            <h3 className="text-lg font-['Outfit'] font-bold text-white">Create New Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono text-[#94a3b8] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Study Database Normalization 1NF to BCNF"
                  className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-lg p-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#94a3b8] mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Sub-tasks, specific formulas or book chapters..."
                  className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-lg p-2.5 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#94a3b8] mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-lg p-2.5 text-xs text-white outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#94a3b8] mb-1">Deadline</label>
                  <input
                    type="text"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    placeholder="e.g. Day 1"
                    className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-lg p-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#94a3b8] mb-1">Day Number</label>
                  <input
                    type="number"
                    value={newDayNumber || ''}
                    onChange={(e) => setNewDayNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="1-10"
                    className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-lg p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2333]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#161925] text-xs font-semibold text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg btn-duo text-xs font-bold uppercase shadow-[0_0_15px_rgba(255,26,64,0.3)]">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
