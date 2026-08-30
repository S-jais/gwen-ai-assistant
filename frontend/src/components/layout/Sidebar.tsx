'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquareCode,
  Bot,
  ListTodo,
  FolderArchive,
  Activity,
  Settings,
  Cpu,
  Zap,
  User as UserIcon,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { SystemStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { name: 'Command Center', href: '/', icon: LayoutDashboard },
  { name: 'Agent Chat', href: '/chat', icon: MessageSquareCode },
  { name: 'Agents Directory', href: '/agents', icon: Bot },
  { name: 'Task Planner', href: '/tasks', icon: ListTodo },
  { name: 'Document Vault', href: '/documents', icon: FolderArchive },
  { name: 'Live Activity', href: '/activity', icon: Activity },
  { name: 'Settings & GPU', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout, openAuthModal } = useAuth();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const s = await api.getSystemStatus();
        setStatus(s);
      } catch (e) {
        // Backend offline or starting
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#07090e]/90 backdrop-blur-xl border-b border-[#ff1a40]/20 flex items-center justify-between px-4 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ff1a40] flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <span className="font-['Outfit'] font-black text-lg text-white">GWEN</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-[#94a3b8] hover:text-white rounded-lg hover:bg-white/5"
        >
          {isMobileOpen ? <X className="w-6 h-6 text-[#ff1a40]" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop for Mobile Drawer */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`w-64 h-screen bg-[#07090e]/95 backdrop-blur-2xl border-r border-[#ff1a40]/15 flex flex-col justify-between p-4 z-50 fixed left-0 top-0 shadow-[4px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="flex items-center justify-between px-2 py-3 mb-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff1a40] via-[#ff4d6d] to-[#cc002b] p-[2px] shadow-[0_0_20px_rgba(255,26,64,0.45)] group-hover:shadow-[0_0_30px_rgba(255,26,64,0.7)] transition-all">
                <div className="w-full h-full bg-[#030407] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#ff1a40] group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-['Outfit'] font-black text-xl tracking-wider text-white">GWEN</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#ff1a40]/20 text-[#ff1a40] border border-[#ff1a40]/40 shadow-[0_0_8px_rgba(255,26,64,0.3)]">v1.0</span>
                </div>
                <span className="text-[11px] font-['Space_Grotesk'] text-[#94a3b8] tracking-tight">Multi-Agent AI</span>
              </div>
            </Link>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden text-[#64748b] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-[rgba(255,26,64,0.22)] to-[rgba(204,0,43,0.1)] text-white border border-[#ff1a40]/40 shadow-[0_0_20px_rgba(255,26,64,0.2)]'
                      : 'text-[#94a3b8] hover:text-white hover:bg-[#11141e]/80 border border-transparent hover:border-[#ff1a40]/20'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#ff1a40]' : 'text-[#64748b] group-hover:text-[#ff1a40]'
                    }`}
                  />
                  <span className="font-['Space_Grotesk']">{item.name}</span>
                  {isActive && (
                    <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#ff1a40] shadow-[0_0_10px_#ff1a40]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User Profile & Hardware Status */}
        <div className="space-y-3">
          {/* User Authentication Card */}
          <div className="bg-[#0d1017]/90 rounded-xl p-3 border border-[#ff1a40]/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff1a40]/40 to-[#cc002b]/20 border border-[#ff1a40]/40 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-[#ff1a40]" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate max-w-[90px]">{user.username}</span>
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase ${
                        user.role === 'admin'
                          ? 'bg-[#ff1a40]/30 text-[#ff1a40] border border-[#ff1a40]/50'
                          : 'bg-white/10 text-white/70'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#94a3b8] block">Session Active</span>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-[#ff1a40] hover:bg-[#ff1a40]/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="w-full py-2 px-3 rounded-lg bg-[#ff1a40]/15 hover:bg-[#ff1a40]/25 border border-[#ff1a40]/30 text-[#ff1a40] text-xs font-semibold font-['Space_Grotesk'] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,26,64,0.15)]"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Sign In / Setup</span>
              </button>
            )}
          </div>

          {/* System Hardware Status Badge */}
          <div className="bg-[#0d1017]/90 rounded-xl p-3.5 border border-[#ff1a40]/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#ff1a40]" />
                <span className="text-[11px] font-mono text-[#94a3b8] uppercase">RTX 4060 GPU</span>
              </div>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${status?.gpu_available ? 'bg-[#ff1a40] shadow-[0_0_8px_#ff1a40]' : 'bg-[#ff1a40]/70'}`} />
                <span className="text-[10px] font-mono text-white/80">
                  {status?.gpu_available ? 'ACTIVE' : 'READY'}
                </span>
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono text-[#94a3b8]">
              <div className="flex justify-between">
                <span>Provider:</span>
                <span className="text-[#ff1a40] font-semibold uppercase">{status?.active_provider || 'OLLAMA'}</span>
              </div>
              <div className="flex justify-between">
                <span>Local Model:</span>
                <span className="text-white truncate max-w-[110px]" title="qwen2.5:7b-instruct">qwen2.5:7b</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
