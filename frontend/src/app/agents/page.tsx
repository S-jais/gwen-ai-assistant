'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Zap,
  FileText,
  Search,
  ListTodo,
  Code,
  Wrench,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AgentInfo } from '@/types';

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getAgentTheme = (name: string) => {
    switch (name) {
      case 'Manager Agent':
        return {
          icon: Zap,
          border: 'border-[#ff1a40]/50',
          badge: 'bg-[#ff1a40]/15 text-[#ff1a40] border-[#ff1a40]/40',
          glow: 'shadow-[0_0_25px_rgba(255,26,64,0.2)]',
          iconColor: 'text-[#ff1a40]',
        };
      case 'Document Agent':
        return {
          icon: FileText,
          border: 'border-[#ff1a40]/40',
          badge: 'bg-[#ff1a40]/15 text-[#ff1a40] border-[#ff1a40]/35',
          glow: 'shadow-[0_0_20px_rgba(255,26,64,0.15)]',
          iconColor: 'text-[#ff1a40]',
        };
      case 'Research Agent':
        return {
          icon: Search,
          border: 'border-[#ff1a40]/50',
          badge: 'bg-[#ff1a40]/20 text-[#ff1a40] border-[#ff1a40]/45',
          glow: 'shadow-[0_0_25px_rgba(255,26,64,0.22)]',
          iconColor: 'text-[#ff1a40]',
        };
      case 'Planner Agent':
        return {
          icon: ListTodo,
          border: 'border-[#ff1a40]/40',
          badge: 'bg-[#ff1a40]/15 text-[#ff1a40] border-[#ff1a40]/35',
          glow: 'shadow-[0_0_20px_rgba(255,26,64,0.15)]',
          iconColor: 'text-[#ff1a40]',
        };
      case 'Coding Agent':
        return {
          icon: Code,
          border: 'border-[#ff1a40]/40',
          badge: 'bg-[#ff1a40]/15 text-[#ff1a40] border-[#ff1a40]/35',
          glow: 'shadow-[0_0_20px_rgba(255,26,64,0.15)]',
          iconColor: 'text-[#ff1a40]',
        };
      default:
        return {
          icon: Bot,
          border: 'border-[#ff1a40]/30',
          badge: 'bg-[#161925] text-white',
          glow: '',
          iconColor: 'text-white',
        };
    }
  };

  const handleTestAgent = (agentName: string) => {
    let prompt = '';
    if (agentName === 'Document Agent') {
      prompt = 'Explain normalization and ACID properties from my uploaded DBMS notes.';
    } else if (agentName === 'Research Agent') {
      prompt = 'Research top resources and tutorials for building local multi-agent AI systems.';
    } else if (agentName === 'Planner Agent') {
      prompt = 'Create a 10-day structured study plan for preparing for a database systems exam.';
    } else if (agentName === 'Coding Agent') {
      prompt = 'Write a Python FastAPI service with ChromaDB vector search and rate limiting.';
    } else {
      prompt = 'Help me prepare for my upcoming exam by researching topics and making a study plan.';
    }
    router.push(`/chat?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-['Outfit'] font-extrabold text-white tracking-tight">
            Specialized <span className="glow-text-duo">AI Agents</span>
          </h1>
          <p className="text-sm font-['Space_Grotesk'] text-[#94a3b8] mt-1">
            Modular, capability-restricted local agents orchestrated by GWEN Manager.
          </p>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const theme = getAgentTheme(agent.name);
          const Icon = theme.icon;
          return (
            <div
              key={agent.name}
              className={`bg-[#0d1017]/85 backdrop-blur-xl rounded-2xl p-6 border ${theme.border} ${theme.glow} flex flex-col justify-between space-y-5 transition-all duration-300 hover:border-[#ff1a40]/70`}
            >
              <div className="space-y-4">
                {/* Agent Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#161925] border border-[#ff1a40]/30 shadow-[0_0_12px_rgba(255,26,64,0.2)]">
                      <Icon className={`w-5 h-5 ${theme.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-['Outfit'] font-bold text-white text-base">{agent.name}</h3>
                      <span className="text-xs font-mono text-[#94a3b8]">{agent.role}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${theme.badge} shadow-[0_0_8px_rgba(255,26,64,0.2)]`}>
                    {agent.status}
                  </span>
                </div>

                <p className="text-xs font-['Space_Grotesk'] text-[#cbd5e1] leading-relaxed">
                  {agent.description}
                </p>

                {/* Capabilities */}
                <div className="space-y-1.5 pt-2 border-t border-[#1e2333]">
                  <span className="text-[11px] font-mono text-[#94a3b8] block">Key Capabilities:</span>
                  <div className="space-y-1">
                    {agent.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-[#94a3b8]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#ff1a40] shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permitted Tools */}
                <div className="space-y-1.5 pt-2 border-t border-[#1e2333]">
                  <span className="text-[11px] font-mono text-[#ff1a40] block flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-[#ff1a40]" />
                    Permitted Tools:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tools.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161925] text-white/90 border border-[#ff1a40]/25"
                      >
                        {t}()
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleTestAgent(agent.name)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#161925] hover:bg-[#ff1a40]/20 border border-[#ff1a40]/30 hover:border-[#ff1a40] text-xs font-['Space_Grotesk'] font-semibold text-white flex items-center justify-center gap-2 transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(255,26,64,0.3)]"
              >
                <span>Trigger {agent.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#ff1a40] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
