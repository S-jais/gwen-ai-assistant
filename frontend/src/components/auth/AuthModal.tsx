'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Zap,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    isSetupCompleted,
    closeAuthModal,
    login,
    register,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const isSetupMode = !isSetupCompleted;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSetupMode || mode === 'register') {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030407]/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0a0d14]/95 border border-[#ff1a40]/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(255,26,64,0.25)] overflow-hidden">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff1a40] to-transparent" />

        {/* Close Button (disabled in initial setup mode) */}
        {isSetupCompleted && (
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-[#64748b] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff1a40] via-[#ff4d6d] to-[#cc002b] p-[2px] shadow-[0_0_25px_rgba(255,26,64,0.5)] mb-3">
            <div className="w-full h-full bg-[#030407] rounded-[14px] flex items-center justify-center">
              <Zap className="w-7 h-7 text-[#ff1a40]" />
            </div>
          </div>
          <h2 className="text-2xl font-black font-['Outfit'] tracking-wider text-white">
            {isSetupMode ? 'SYSTEM INITIALIZATION' : mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
          </h2>
          <p className="text-xs text-[#94a3b8] font-['Space_Grotesk'] mt-1">
            {isSetupMode
              ? 'First-time setup: Create your Master Administrator Account'
              : mode === 'login'
              ? 'Authenticate to access your isolated multi-agent workspace'
              : 'Register a new isolated user environment'}
          </p>
        </div>

        {/* First-Time Setup Banner */}
        {isSetupMode && (
          <div className="mb-4 p-3 rounded-xl bg-[#ff1a40]/10 border border-[#ff1a40]/30 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#ff1a40] shrink-0" />
            <span className="text-xs text-white/90 font-medium">
              You are initializing GWEN. The first account created is automatically assigned <strong className="text-[#ff1a40]">SuperAdmin</strong> privileges.
            </span>
          </div>
        )}

        {/* Mode Switcher Tabs (when setup is complete) */}
        {!isSetupMode && (
          <div className="flex bg-[#07090e] p-1 rounded-xl border border-white/5 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[rgba(255,26,64,0.3)] to-[rgba(204,0,43,0.15)] text-white border border-[#ff1a40]/40 shadow-[0_0_12px_rgba(255,26,64,0.2)]'
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-[rgba(255,26,64,0.3)] to-[rgba(204,0,43,0.15)] text-white border border-[#ff1a40]/40 shadow-[0_0_12px_rgba(255,26,64,0.2)]'
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              New Account
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#94a3b8] uppercase mb-1">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-[#64748b]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-[#030407] border border-[#ff1a40]/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#ff1a40] focus:ring-1 focus:ring-[#ff1a40] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#94a3b8] uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#64748b]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#030407] border border-[#ff1a40]/20 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#ff1a40] focus:ring-1 focus:ring-[#ff1a40] transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#64748b] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl font-['Space_Grotesk'] font-bold text-sm text-white bg-gradient-to-r from-[#ff1a40] via-[#ff4d6d] to-[#cc002b] shadow-[0_0_25px_rgba(255,26,64,0.4)] hover:shadow-[0_0_35px_rgba(255,26,64,0.7)] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>
                  {isSetupMode ? 'Initialize Master Admin' : mode === 'login' ? 'Authenticate' : 'Create Isolated Account'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
