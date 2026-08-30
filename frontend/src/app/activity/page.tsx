'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  Wrench,
  Bot,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AgentInfo } from '@/types';

export default function ActivityPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  useEffect(() => {
    api.getAgents().then(setAgents).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-['Outfit'] font-extrabold text-white tracking-tight">
          Live Agent <span className="glow-text-duo">Execution Stream</span>
        </h1>
        <p className="text-sm font-['Space_Grotesk'] text-[#94a3b8] mt-1">
          Real-time event traces, sub-agent dispatches, and tool invocations.
        </p>
      </div>

      {/* Execution Stream Timeline */}
      <div className="bg-[#0d1017]/85 backdrop-blur-xl rounded-2xl p-6 border border-[#ff1a40]/20 space-y-6 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between pb-4 border-b border-[#1e2333]">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#ff1a40]" />
            <h2 className="text-base font-['Outfit'] font-bold text-white">Agent Execution Traces</h2>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-mono text-[#ff1a40]">
            <span className="w-2 h-2 rounded-full bg-[#ff1a40] animate-ping" />
            LIVE SSE EVENT STREAM
          </span>
        </div>

        <div className="space-y-4">
          {[
            {
              time: '21:30:12',
              agent: 'Manager Agent',
              color: 'text-[#ff1a40]',
              action: 'Task received & intent classified: Study preparation pipeline',
              status: 'COMPLETED',
            },
            {
              time: '21:30:14',
              agent: 'Document Agent',
              color: 'text-[#ff1a40]',
              action: 'search_documents("DBMS normalization ACID")',
              status: 'COMPLETED',
            },
            {
              time: '21:30:17',
              agent: 'Research Agent',
              color: 'text-[#ff1a40]',
              action: 'web_search("database management systems study resources 2026")',
              status: 'COMPLETED',
            },
            {
              time: '21:30:21',
              agent: 'Planner Agent',
              color: 'text-[#ff1a40]',
              action: 'Formulated 10-day preparation schedule & populated task database',
              status: 'COMPLETED',
            },
            {
              time: '21:30:25',
              agent: 'Manager Agent',
              color: 'text-[#ff1a40]',
              action: 'Verified outputs, generated final synthesis and citations',
              status: 'COMPLETED',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-3.5 rounded-xl bg-[#11141e] border border-[#1e2333] hover:border-[#ff1a40]/40 transition-all"
            >
              <span className="text-xs font-mono text-[#64748b] shrink-0 mt-0.5">{item.time}</span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold font-mono ${item.color}`}>[{item.agent}]</span>
                  <span className="text-xs text-white font-['Space_Grotesk']">{item.action}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff1a40]/15 text-[#ff1a40] border border-[#ff1a40]/30 shadow-[0_0_6px_rgba(255,26,64,0.15)]">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
