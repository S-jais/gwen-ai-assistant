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
} from 'lucide-react';
import { api } from '@/lib/api';
import { Conversation, Message, DocumentItem, AgentStreamEvent } from '@/types';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeEvents]);

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation('New Multi-Agent Session');
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([]);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
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

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full gap-4">
      {/* Left Conversations Sidebar */}
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
            <span className="font-mono text-[#ff1a40] block mb-1.5 flex items-center gap-1">
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
      <div className="flex-1 bg-[#07090e]/85 backdrop-blur-2xl border border-[#ff1a40]/20 rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto my-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff1a40]/20 to-[#cc002b]/20 border border-[#ff1a40]/40 flex items-center justify-center shadow-[0_0_25px_rgba(255,26,64,0.25)]">
                <Zap className="w-7 h-7 text-[#ff1a40]" />
              </div>
              <h3 className="font-['Outfit'] font-bold text-xl text-white">GWEN Multi-Agent Session</h3>
              <p className="text-xs text-[#94a3b8] font-['Space_Grotesk'] leading-relaxed">
                Give GWEN a complex task. The Manager Agent will analyze requirements and automatically dispatch the Document, Research, Planner, and Coding agents.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff1a40] to-[#cc002b] p-[1.5px] shrink-0 mt-1 shadow-[0_0_12px_rgba(255,26,64,0.4)]">
                      <div className="w-full h-full bg-[#030407] rounded-[6px] flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#ff1a40]" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-3xl rounded-2xl p-5 text-sm space-y-3 ${
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

                    <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-headings:font-['Outfit'] prose-headings:text-white prose-headings:font-semibold prose-a:text-[#ff1a40] prose-code:font-mono prose-code:bg-[#161925] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-[#ff1a40]/20">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Citations / Sources */}
                    {msg.metadata_json?.citations && msg.metadata_json.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#1e2333] space-y-1.5">
                        <span className="text-[11px] font-mono text-[#ff1a40] block flex items-center gap-1">
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
                        <span className="text-[11px] font-mono text-[#ff1a40] block flex items-center gap-1">
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
