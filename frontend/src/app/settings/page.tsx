'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Cpu,
  Shield,
  HardDrive,
  Database,
  Trash2,
  Plus,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { SystemStatus, MemoryItem } from '@/types';

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:7b-instruct');
  const [provider, setProvider] = useState('ollama');
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchSettings = async () => {
    try {
      const [sysStatus, mems] = await Promise.all([
        api.getSystemStatus(),
        api.getMemories(),
      ]);
      setStatus(sysStatus);
      setMemories(mems);
      if (sysStatus.active_provider) setProvider(sysStatus.active_provider);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateConfig({
        provider,
        model: selectedModel,
        ollama_base_url: 'http://localhost:11434',
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      fetchSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.trim()) return;
    try {
      const created = await api.createMemory(newMemory.trim(), 'preference', 3);
      setMemories([created, ...memories]);
      setNewMemory('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories(memories.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-['Outfit'] font-extrabold text-white tracking-tight">
          System <span className="glow-text-duo">Settings & GPU Monitor</span>
        </h1>
        <p className="text-sm font-['Space_Grotesk'] text-[#94a3b8] mt-1">
          Hardware acceleration, local models, privacy configuration, and persistent memory.
        </p>
      </div>

      {/* Hardware Monitor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* GPU */}
        <div className="p-5 rounded-2xl bg-[#0d1017]/85 backdrop-blur-xl border border-[#ff1a40]/30 shadow-[0_0_25px_rgba(255,26,64,0.18)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#ff1a40]" />
              <h3 className="font-['Outfit'] font-bold text-white text-sm">GPU VRAM Acceleration</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff1a40]/15 text-[#ff1a40] border border-[#ff1a40]/35 shadow-[0_0_8px_rgba(255,26,64,0.2)]">
              {status?.gpu_available ? 'CUDA 13.3 READY' : 'READY'}
            </span>
          </div>
          <div>
            <span className="text-xl font-bold font-['Outfit'] text-white">
              {status?.gpu_name || 'NVIDIA GeForce RTX 4060 Laptop GPU'}
            </span>
            <p className="text-xs font-mono text-[#94a3b8] mt-1">
              Dedicated VRAM: ~8,188 MiB (8 GB)
            </p>
          </div>
        </div>

        {/* RAM */}
        <div className="p-5 rounded-2xl bg-[#0d1017]/85 backdrop-blur-xl border border-[#ff1a40]/20 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#ff1a40]" />
              <h3 className="font-['Outfit'] font-bold text-white text-sm">System Memory</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff1a40]/15 text-[#ff1a40] border border-[#ff1a40]/35">
              DDR5
            </span>
          </div>
          <div>
            <span className="text-xl font-bold font-['Outfit'] text-white">
              {status?.ram_total_gb ? `${status.ram_total_gb} GB RAM` : '24 GB RAM'}
            </span>
            <p className="text-xs font-mono text-[#94a3b8] mt-1">
              Available Free RAM: {status?.ram_free_gb ? `${status.ram_free_gb} GB` : '12+ GB'}
            </p>
          </div>
        </div>

        {/* Local-First & Cost */}
        <div className="p-5 rounded-2xl bg-[#0d1017]/85 backdrop-blur-xl border border-[#ff1a40]/20 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#ff1a40]" />
              <h3 className="font-['Outfit'] font-bold text-white text-sm">Privacy & Cost</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff1a40]/15 text-[#ff1a40] border border-[#ff1a40]/35 shadow-[0_0_8px_rgba(255,26,64,0.15)]">
              ₹0 COST
            </span>
          </div>
          <div>
            <span className="text-xl font-bold font-['Outfit'] text-white">100% Local-First</span>
            <p className="text-xs font-mono text-[#94a3b8] mt-1">
              All documents & vectors stay on your laptop.
            </p>
          </div>
        </div>
      </div>

      {/* Model Provider Configuration */}
      <div className="bg-[#0d1017]/85 backdrop-blur-xl rounded-2xl p-6 border border-[#ff1a40]/20 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <h2 className="text-lg font-['Outfit'] font-bold text-white">Model & Inference Configuration</h2>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-[#94a3b8] mb-1">Active LLM Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-xl p-3 text-xs text-white outline-none"
            >
              <option value="ollama">Ollama (Local GPU Accelerated - Recommended)</option>
              <option value="openai">OpenAI Compatible API (Custom)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#94a3b8] mb-1">Local Model Selection</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-xl p-3 text-xs text-white outline-none"
            >
              <option value="qwen2.5:7b-instruct">qwen2.5:7b-instruct (Recommended ~4.7GB VRAM)</option>
              <option value="qwen2.5:7b">qwen2.5:7b</option>
              <option value="llama3.1:8b">llama3.1:8b (~4.9GB VRAM)</option>
              <option value="mistral:7b">mistral:7b</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs font-mono text-[#ff1a40] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settings saved successfully!
              </span>
            ) : <span />}

            <button type="submit" className="px-6 py-2.5 rounded-xl btn-duo text-xs font-bold uppercase shadow-[0_0_15px_rgba(255,26,64,0.3)]">
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* Long-Term Memory Manager */}
      <div className="bg-[#0d1017]/85 backdrop-blur-xl rounded-2xl p-6 border border-[#ff1a40]/20 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-['Outfit'] font-bold text-white">Long-Term Memory Management</h2>
            <p className="text-xs font-['Space_Grotesk'] text-[#94a3b8]">
              Personal preferences, habits, and study constraints remembered by GWEN across sessions.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddMemory} className="flex gap-2">
          <input
            type="text"
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Add new preference (e.g. 'I prefer studying database normalization in the evenings')..."
            className="flex-1 bg-[#161925] border border-[#2a3045] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#ff1a40]"
          />
          <button type="submit" className="px-4 py-2.5 rounded-xl btn-duo text-xs font-bold uppercase shadow-[0_0_12px_rgba(255,26,64,0.25)]">
            Add Memory
          </button>
        </form>

        <div className="space-y-2">
          {memories.length === 0 ? (
            <p className="text-xs text-[#94a3b8] py-4 text-center">No long-term memories saved.</p>
          ) : (
            memories.map((mem) => (
              <div
                key={mem.id}
                className="p-3 rounded-xl bg-[#11141e] border border-[#1e2333] hover:border-[#ff1a40]/30 flex items-center justify-between gap-3 text-xs transition-all"
              >
                <div className="space-y-0.5">
                  <p className="text-white font-['Space_Grotesk']">{mem.content}</p>
                  <span className="text-[10px] font-mono text-[#ff1a40]">Category: {mem.category}</span>
                </div>
                <button
                  onClick={() => handleDeleteMemory(mem.id)}
                  className="p-1.5 rounded-lg hover:bg-[#1e2333] text-[#64748b] hover:text-[#ff1a40] transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
