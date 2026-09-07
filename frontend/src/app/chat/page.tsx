'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Bot,
  User,
  Paperclip,
  Trash2,
  Plus,
  Zap,
  Search,
  FileText,
  ListTodo,
  Code,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  ArrowDown,
  Compass,
  Terminal,
  Globe,
  FileSearch,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Conversation, Message, DocumentItem, AgentStreamEvent } from '@/types';

// CodeBlock Component with Copy Button & Language Badge
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-[#ff1a40]/30 bg-[#0a0d14] overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#121624] border-b border-[#ff1a40]/20 text-xs font-mono">
        <span className="text-[#ff1a40] font-semibold text-[11px] uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[#94a3b8] hover:text-white hover:bg-[#1a2032] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-[#ff1a40]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-[#e2e8f0] leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}

// Quick Prompt Starters for empty state
const PROMPT_STARTERS = [
  {
    icon: Globe,
    title: 'Web & Tech Research',
    prompt: 'Research the latest developments in Multi-Agent AI Architecture and summarize key findings.',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
  },
  {
    icon: FileSearch,
    title: 'Document Analysis & RAG',
    prompt: 'Analyze all indexed documents and summarize the main topics and key insights.',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
  },
  {
    icon: Terminal,
    title: 'Code Generation & Review',
    prompt: 'Write a Python FastAPI service with JWT authentication, async SQLite database, and clean route handlers.',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
  },
  {
    icon: ListTodo,
    title: 'Task Decomposition Roadmap',
    prompt: 'Create a step-by-step implementation roadmap for deploying a full-stack AI web application.',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
  },
];

function ChatPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeEvents, setActiveEvents] = useState<AgentStreamEvent[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations & docs
  useEffect(() => {
    const init = async () => {
      try {
        const [convList, docList] = await Promise.all([
          api.getConversations(),
          api.getDocuments(),
        ]);
        setConversations(convList);
        setDocuments(docList);

        if (convList.length > 0) {
          setActiveConvId(convList[0].id);
        }
      } catch (err) {
        console.error('Init error', err);
      }
    };
    init();
  }, []);

  // Handle initial query from dashboard
  useEffect(() => {
    if (initialQuery && !isStreaming) {
      setInput(initialQuery);
    }
  }, [initialQuery]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConvId) {
      api.getMessages(activeConvId).then(setMessages).catch(console.error);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  // Scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeEvents]);

  // Track scroll position to show "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isFarUp);
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation('New Multi-Agent Session');
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([]);
      setMobileSessionsOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        setActiveConvId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerChat = async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    setInput('');
    setIsStreaming(true);
    setActiveEvents([]);

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId || '',
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    await api.streamChat(
      {
        content: userText,
        conversation_id: activeConvId || undefined,
        document_ids: selectedDocIds,
      },
      (event) => {
        setActiveEvents((prev) => [...prev, event]);
      },
      (finalData) => {
        setIsStreaming(false);
        setActiveEvents([]);
        if (finalData.conversation_id && finalData.conversation_id !== activeConvId) {
          setActiveConvId(finalData.conversation_id);
          api.getConversations().then(setConversations);
        }
        // Append finalized assistant message
        const assistantMsg: Message = {
          id: `msg-${Date.now()}`,
          conversation_id: finalData.conversation_id || activeConvId || '',
          role: 'assistant',
          content: finalData.content,
          agent_name: 'GWEN Manager',
          metadata_json: {
            agents_used: finalData.agents_used,
            citations: finalData.citations,
            sources: finalData.sources,
            tasks_created: finalData.tasks_created,
          },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      },
      (err) => {
        console.error('Chat error:', err);
        setIsStreaming(false);
        setActiveEvents([]);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            conversation_id: activeConvId || '',
            role: 'assistant',
            content: `**Error running agent workflow:** ${err.message || 'Check if Ollama or backend is running.'}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerChat(input);
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      triggerChat(lastUserMsg.content);
    }
  };

  const activeTitle = conversations.find((c) => c.id === activeConvId)?.title || 'New Session';

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full gap-4 relative">
      {/* Mobile Sessions Drawer Overlay */}
      {mobileSessionsOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#ff1a40]/30">
            <span className="font-['Outfit'] font-bold text-white text-base">Chat Sessions</span>
            <button
              onClick={() => setMobileSessionsOpen(false)}
              className="p-1.5 text-[#94a3b8] hover:text-white rounded-lg bg-white/5"
            >
              ✕
            </button>
          </div>

          <button
            onClick={handleNewConversation}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl btn-ghost-primary font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 text-[#ff1a40]" />
            <span>New Chat Session</span>
          </button>

          <div className="space-y-2 mt-4 overflow-y-auto flex-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setMobileSessionsOpen(false);
                }}
                className={`p-3 rounded-xl flex items-center justify-between text-xs border ${
                  conv.id === activeConvId
                    ? 'bg-[#141823] border-[#ff1a40]/60 text-white'
                    : 'bg-[#0d1017] border-[#1e2333] text-[#94a3b8]'
                }`}
              >
                <span className="truncate">{conv.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="p-1 text-[#64748b] hover:text-[#ff1a40]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {documents.length > 0 && (
            <div className="pt-3 border-t border-[#1e2333] text-xs">
              <span className="font-mono text-[#ff1a40] mb-1.5 block">Search Documents:</span>
              <select
                className="w-full bg-[#161925] border border-[#2a3045] rounded-lg p-2 text-white text-xs"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') setSelectedDocIds(documents.map((d) => d.id));
                  else if (val) setSelectedDocIds([val]);
                  else setSelectedDocIds([]);
                }}
              >
                <option value="">Search all indexed docs</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Left Conversations Sidebar (Desktop) */}
      <div className="w-72 bg-[#07090e]/85 backdrop-blur-2xl border border-[#ff1a40]/20 rounded-2xl flex flex-col justify-between p-3.5 hidden md:flex shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div>
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl btn-ghost-primary font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-wider mb-3 transition-all shadow-[0_0_12px_rgba(255,26,64,0.2)]"
          >
            <Plus className="w-4 h-4 text-[#ff1a40]" />
            <span>New Chat Session</span>
          </button>

          <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all group ${
                    isActive
                      ? 'bg-[#141823] border border-[#ff1a40]/40 text-white shadow-[0_0_15px_rgba(255,26,64,0.15)]'
                      : 'text-[#94a3b8] hover:bg-[#11141e] hover:text-white border border-transparent hover:border-[#ff1a40]/20'
                  }`}
                >
                  <span className="font-['Space_Grotesk'] truncate max-w-[180px]">{conv.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#ff1a40] transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attached Document Filter */}
        {documents.length > 0 && (
          <div className="p-3 bg-[#0d1017]/90 rounded-xl border border-[#ff1a40]/20 text-xs">
            <span className="font-mono text-[#ff1a40] mb-1.5 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#ff1a40]" />
              Attach Notes/Docs ({documents.length})
            </span>
            <select
              className="w-full bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-lg p-1.5 text-white text-xs outline-none"
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') setSelectedDocIds(documents.map((d) => d.id));
                else if (val) setSelectedDocIds([val]);
                else setSelectedDocIds([]);
              }}
            >
              <option value="">Search all indexed docs</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Chat Flow */}
      <div className="flex-1 bg-[#07090e]/85 backdrop-blur-2xl border border-[#ff1a40]/20 rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
        {/* Mobile Top Sessions Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-[#0d1017] border-b border-[#ff1a40]/20 text-xs">
          <button
            onClick={() => setMobileSessionsOpen(true)}
            className="flex items-center gap-1.5 text-[#f8fafc] font-medium truncate max-w-[200px]"
          >
            <span className="w-2 h-2 rounded-full bg-[#ff1a40]" />
            <span className="truncate">{activeTitle}</span>
            <span className="text-[10px] text-[#ff1a40] font-mono">▼</span>
          </button>
          <button
            onClick={handleNewConversation}
            className="px-2.5 py-1 rounded-lg bg-[#ff1a40]/15 text-[#ff1a40] font-mono text-[11px] border border-[#ff1a40]/30"
          >
            + New
          </button>
        </div>

        {/* Chat Messages Stream */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6"
        >
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-auto py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff1a40]/20 to-[#cc002b]/20 border border-[#ff1a40]/40 flex items-center justify-center shadow-[0_0_25px_rgba(255,26,64,0.25)]">
                <Zap className="w-8 h-8 text-[#ff1a40]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-['Outfit'] font-bold text-2xl text-white">GWEN Multi-Agent Orchestrator</h3>
                <p className="text-xs text-[#94a3b8] font-['Space_Grotesk'] max-w-lg leading-relaxed">
                  Select a prompt starter below or submit custom instructions. The GWEN Manager automatically coordinates Research, Document RAG, Code Execution, and Task Planning agents.
                </p>
              </div>

              {/* Prompt Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left pt-2">
                {PROMPT_STARTERS.map((ps, idx) => {
                  const IconComp = ps.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => triggerChat(ps.prompt)}
                      className={`p-4 rounded-xl bg-[#0d1017]/90 border hover:border-[#ff1a40]/60 transition-all text-xs group flex flex-col justify-between space-y-2 shadow-lg hover:shadow-[0_0_15px_rgba(255,26,64,0.15)]`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${ps.color} border`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="font-['Space_Grotesk'] font-bold text-white group-hover:text-[#ff1a40] transition-colors">
                          {ps.title}
                        </span>
                      </div>
                      <p className="text-[#94a3b8] text-[11px] line-clamp-2 font-['Space_Grotesk']">
                        {ps.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} group`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff1a40] to-[#cc002b] p-[1.5px] shrink-0 mt-1 shadow-[0_0_12px_rgba(255,26,64,0.4)]">
                      <div className="w-full h-full bg-[#030407] rounded-[6px] flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#ff1a40]" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-3xl rounded-2xl p-5 text-sm space-y-3 relative ${
                      isUser
                        ? 'bg-gradient-to-r from-[#ff1a40]/20 to-[#cc002b]/15 border border-[#ff1a40]/35 text-white ml-12 shadow-[0_0_15px_rgba(255,26,64,0.15)]'
                        : 'bg-[#0d1017]/90 border border-[#ff1a40]/20 text-[#f8fafc] shadow-lg'
                    }`}
                  >
                    {!isUser && msg.metadata_json?.agents_used && msg.metadata_json.agents_used.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#1e2333]">
                        <span className="text-[10px] font-mono text-[#94a3b8] uppercase">Coordinated Agents:</span>
                        {msg.metadata_json.agents_used.map((ag) => (
                          <span
                            key={ag}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ff1a40]/10 text-[#ff1a40] border border-[#ff1a40]/30 shadow-[0_0_6px_rgba(255,26,64,0.15)]"
                          >
                            {ag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Markdown Content Render with CodeBlock */}
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-headings:font-['Outfit'] prose-headings:text-white prose-headings:font-semibold prose-a:text-[#ff1a40] prose-code:font-mono prose-code:bg-[#161925] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-[#ff1a40]/20">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <CodeBlock
                                language={match[1]}
                                value={String(children).replace(/\n$/, '')}
                              />
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Citations / Sources */}
                    {msg.metadata_json?.citations && msg.metadata_json.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#1e2333] space-y-1.5">
                        <span className="text-[11px] font-mono text-[#ff1a40] mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-[#ff1a40]" />
                          Document Page Citations:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.metadata_json.citations.map((c, i) => (
                            <div key={i} className="p-2 rounded bg-[#11141e] border border-[#ff1a40]/20 text-xs">
                              <span className="font-semibold text-white truncate block">{c.document_name}</span>
                              <span className="text-[11px] font-mono text-[#94a3b8]">Page {c.page_number}</span>
                              <p className="text-[11px] text-[#64748b] line-clamp-2 mt-1">{c.excerpt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Web Sources */}
                    {msg.metadata_json?.sources && msg.metadata_json.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#1e2333] space-y-1">
                        <span className="text-[11px] font-mono text-[#ff1a40] mb-1 flex items-center gap-1">
                          <Search className="w-3 h-3 text-[#ff1a40]" />
                          Web Research Sources:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.metadata_json.sources.map((s, i) => (
                            <a
                              key={i}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#11141e] hover:bg-[#161925] border border-[#1e2333] hover:border-[#ff1a40]/40 text-xs text-[#94a3b8] hover:text-[#ff1a40] transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-[#ff1a40]" />
                              <span className="truncate max-w-[200px]">{s.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Toolbar Actions (Copy & Regenerate) */}
                    {!isUser && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2333]/50 text-xs">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[#94a3b8] hover:text-white hover:bg-[#161925] transition-colors font-['Space_Grotesk'] text-[11px]"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#ff1a40]" />
                              <span>Copy Response</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleRegenerate}
                          disabled={isStreaming}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[#94a3b8] hover:text-[#ff1a40] hover:bg-[#161925] transition-colors font-['Space_Grotesk'] text-[11px] disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3 text-[#ff1a40]" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-[#161925] border border-[#ff1a40]/30 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-[#94a3b8]" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Real-Time Agent Execution Pipeline Visualization */}
          {isStreaming && (
            <div className="p-5 rounded-2xl bg-[#0d1017]/95 border border-[#ff1a40]/40 shadow-[0_0_25px_rgba(255,26,64,0.2)] space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ff1a40] animate-spin" />
                  <span className="font-['Outfit'] font-bold text-sm text-white">Multi-Agent Orchestration Active</span>
                </div>
                <span className="text-[10px] font-mono text-[#ff1a40] px-2 py-0.5 rounded bg-[#ff1a40]/10 border border-[#ff1a40]/30 shadow-[0_0_8px_rgba(255,26,64,0.2)]">
                  REAL-TIME PIPELINE
                </span>
              </div>

              {/* Event Log Stream */}
              <div className="space-y-1.5 pt-2">
                {activeEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-['Space_Grotesk']">
                    <ChevronRight className="w-3.5 h-3.5 text-[#ff1a40] shrink-0 mt-0.5" />
                    <div>
                      {evt.agent_name && (
                        <span className="font-bold text-[#ff1a40] font-mono mr-1.5">[{evt.agent_name}]</span>
                      )}
                      <span className="text-[#f8fafc]">{evt.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-20 right-6 p-2 rounded-full bg-[#141823] border border-[#ff1a40]/40 text-[#ff1a40] shadow-[0_0_15px_rgba(255,26,64,0.3)] hover:scale-105 transition-all z-10"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-[#030407]/90 border-t border-[#ff1a40]/20">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask GWEN a complex task or question..."
              disabled={isStreaming}
              className="w-full bg-[#0d1017] border border-[#2a3045] focus:border-[#ff1a40] focus:ring-2 focus:ring-[#ff1a40]/25 text-white rounded-xl pl-4 pr-24 py-3.5 text-sm font-['Space_Grotesk'] outline-none disabled:opacity-50 transition-all placeholder:text-[#475569]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="absolute right-2 px-4 py-2 rounded-lg btn-duo flex items-center gap-1.5 text-xs font-['Space_Grotesk'] font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Run</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-[#94a3b8]">Loading GWEN Intelligence Stream...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
