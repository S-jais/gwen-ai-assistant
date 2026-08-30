'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  ArrowRight,
  Bot,
  FileText,
  ListTodo,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  Code,
  ShieldCheck,
  Cpu,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AgentInfo, TaskItem, DocumentItem, SystemStatus } from '@/types';
import GwenVirtualFace from '@/components/face/GwenVirtualFace';

export default function DashboardPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [agentsRes, tasksRes, docsRes, statusRes] = await Promise.allSettled([
          api.getAgents(),
          api.getTasks('pending'),
          api.getDocuments(),
          api.getSystemStatus(),
        ]);
        if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value);
        if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.slice(0, 5));
        if (docsRes.status === 'fulfilled') setDocuments(docsRes.value.slice(0, 4));
        if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handleLaunchChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(prompt)}`);
  };

  const handleQuickPrompt = (quickText: string) => {
    router.push(`/chat?q=${encodeURIComponent(quickText)}`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Interactive Virtual AI Face Section (GWEN Core Avatar) */}
      <GwenVirtualFace onPromptSelect={handleQuickPrompt} />

      {/* Quick Mission Dispatch Bar */}
      <div className="p-6 rounded-2xl bg-[#0d1017]/85 backdrop-blur-xl border border-[#ff1a40]/30 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
        <form onSubmit={handleLaunchChat} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#ff1a40] uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Direct Command Interface
            </span>
            <span className="text-[11px] font-mono text-[#94a3b8]">Press Enter to launch Multi-Agent workflow</span>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Give GWEN a mission (e.g. 'Read my DBMS notes, research topics & build a 10-day study plan')..."
              className="w-full bg-[#030407]/90 border border-[#2a3045] focus:border-[#ff1a40] focus:ring-2 focus:ring-[#ff1a40]/25 text-white rounded-xl pl-5 pr-32 py-4 text-sm font-['Space_Grotesk'] outline-none transition-all placeholder:text-[#475569] shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-2 px-5 py-2.5 rounded-lg btn-duo flex items-center gap-2 text-xs font-['Space_Grotesk'] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(255,26,64,0.3)]"
            >
              <span>Execute</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Agents Status Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#ff1a40]" />
            <h2 className="text-xl font-['Outfit'] font-bold text-white">Active Specialized Agents</h2>
          </div>
          <Link href="/agents" className="text-xs font-mono text-[#ff1a40] hover:underline flex items-center gap-1">
            <span>View All Agents</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              name: 'Manager Agent',
              role: 'Orchestration Engine',
              color: 'border-[#ff1a40]/40 text-[#ff1a40]',
              icon: Zap,
              desc: 'Intent routing & decomposition',
            },
            {
              name: 'Document Agent',
              role: 'Notes & RAG Specialist',
              color: 'border-[#ff1a40]/40 text-[#ff1a40]',
              icon: FileText,
              desc: 'PDF/DOCX citation extraction',
            },
            {
              name: 'Research Agent',
              role: 'Web & Search Specialist',
              color: 'border-[#ff1a40]/40 text-[#ff1a40]',
              icon: Search,
              desc: 'DuckDuckGo & source finder',
            },
            {
              name: 'Planner Agent',
              role: 'Strategic Roadmaps',
              color: 'border-[#ff1a40]/40 text-[#ff1a40]',
              icon: ListTodo,
              desc: 'Multi-day task generation',
            },
            {
              name: 'Coding Agent',
              role: 'Code & Static Analysis',
              color: 'border-[#ff1a40]/40 text-[#ff1a40]',
              icon: Code,
              desc: 'Safe algorithms & syntax validation',
            },
          ].map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.name}
                className="bg-[#0d1017]/85 hover:bg-[#141823] border border-[#ff1a40]/20 hover:border-[#ff1a40]/50 rounded-xl p-4 transition-all duration-300 relative group backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_25px_rgba(255,26,64,0.15)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-[#161925] border border-[#ff1a40]/20">
                    <Icon className={`w-4 h-4 ${agent.color}`} />
                  </div>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ff1a40] shadow-[0_0_8px_#ff1a40]" />
                    <span className="text-[10px] font-mono text-[#94a3b8]">READY</span>
                  </span>
                </div>
                <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">{agent.name}</h3>
                <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">{agent.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: Today's Tasks & Document Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks Card */}
        <div className="bg-[#0d1017]/85 rounded-2xl p-6 border border-[#ff1a40]/20 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-[#ff1a40]" />
              <h2 className="text-lg font-['Outfit'] font-bold text-white">Upcoming Tasks & Milestones</h2>
            </div>
            <Link href="/tasks" className="text-xs font-mono text-[#ff1a40] hover:underline flex items-center gap-1">
              <span>Open Planner</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[#1e2333] rounded-xl">
              <p className="text-sm text-[#94a3b8]">No pending tasks.</p>
              <p className="text-xs text-[#475569] mt-1">Ask GWEN to build a study schedule or create a task.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#11141e] border border-[#1e2333] hover:border-[#ff1a40]/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#64748b] hover:text-[#ff1a40] cursor-pointer transition-colors" />
                    <div>
                      <h4 className="text-sm font-medium text-white line-clamp-1">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#94a3b8]">
                        {task.deadline && (
                          <span className="flex items-center gap-1 font-mono text-[#ff1a40]">
                            <Clock className="w-3 h-3" />
                            {task.deadline}
                          </span>
                        )}
                        <span className="font-mono text-[#475569]">•</span>
                        <span className="text-[#64748b]">via {task.agent_source}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border bg-[#ff1a40]/15 border-[#ff1a40]/35 text-[#ff1a40] shadow-[0_0_8px_rgba(255,26,64,0.15)]`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Knowledge & Documents Card */}
        <div className="bg-[#0d1017]/85 rounded-2xl p-6 border border-[#ff1a40]/20 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#ff1a40]" />
              <h2 className="text-lg font-['Outfit'] font-bold text-white">Document Vault & RAG Index</h2>
            </div>
            <Link href="/documents" className="text-xs font-mono text-[#ff1a40] hover:underline flex items-center gap-1">
              <span>Manage Vault</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[#1e2333] rounded-xl">
              <p className="text-sm text-[#94a3b8]">No notes or documents uploaded yet.</p>
              <Link
                href="/documents"
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-[#ff1a40]/10 border border-[#ff1a40]/35 text-xs font-mono text-[#ff1a40] hover:bg-[#ff1a40]/20 shadow-[0_0_10px_rgba(255,26,64,0.2)]"
              >
                <span>Upload PDF / Notes</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#11141e] border border-[#1e2333] hover:border-[#ff1a40]/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#07090e] border border-[#ff1a40]/20">
                      <FileText className="w-4 h-4 text-[#ff1a40]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white line-clamp-1">{doc.original_name}</h4>
                      <span className="text-[11px] font-mono text-[#94a3b8]">
                        {doc.num_chunks} vector chunks indexed
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff1a40]/15 text-[#ff1a40] border border-[#ff1a40]/30 shadow-[0_0_6px_rgba(255,26,64,0.15)]">
                    {doc.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
