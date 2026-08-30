'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Upload,
  FileText,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DocumentItem, DocumentChunk } from '@/types';
import { formatBytes, formatDate } from '@/lib/utils';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDocs = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents', err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMsg(null);
    try {
      const uploaded = await api.uploadDocument(files[0]);
      setDocuments([uploaded, ...documents]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await api.deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
      setSearchResults([]);
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await api.queryDocuments(searchQuery.trim(), 5);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-['Outfit'] font-extrabold text-white tracking-tight">
          Document Vault & <span className="glow-text-duo">Local Knowledge Base</span>
        </h1>
        <p className="text-sm font-['Space_Grotesk'] text-[#94a3b8] mt-1">
          Upload PDF lecture notes, textbooks, and documentation for local semantic search and citations.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="p-8 bg-[#0d1017]/85 backdrop-blur-xl rounded-2xl border-2 border-dashed border-[#ff1a40]/30 hover:border-[#ff1a40] transition-all text-center relative group shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
        <input
          type="file"
          accept=".pdf,.txt,.md,.docx"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff1a40]/25 to-[#cc002b]/20 border border-[#ff1a40]/40 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,26,64,0.25)]">
            <Upload className="w-6 h-6 text-[#ff1a40]" />
          </div>
          <div>
            <h3 className="text-base font-['Outfit'] font-bold text-white">
              {uploading ? 'Processing & Vectorizing Document...' : 'Drop files here or click to upload'}
            </h3>
            <p className="text-xs text-[#94a3b8] font-mono mt-1">Supports PDF, DOCX, TXT, Markdown (Max 50MB)</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#ff1a40]/10 border border-[#ff1a40]/35 flex items-center gap-3 text-xs text-[#ff1a40]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Two Column Layout: Document List & Semantic Search Query Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uploaded Documents List */}
        <div className="bg-[#0d1017]/85 backdrop-blur-xl rounded-2xl p-6 border border-[#ff1a40]/20 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#ff1a40]" />
              <h2 className="text-base font-['Outfit'] font-bold text-white">Indexed Files ({documents.length})</h2>
            </div>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-[#94a3b8] py-8 text-center">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-[#11141e] border border-[#1e2333] hover:border-[#ff1a40]/30 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#07090e] border border-[#ff1a40]/20">
                      <FileText className="w-4 h-4 text-[#ff1a40]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white truncate max-w-[220px]">
                        {doc.original_name}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#94a3b8]">
                        <span>{formatBytes(doc.file_size)}</span>
                        <span>•</span>
                        <span className="text-[#ff1a40]">{doc.num_chunks} chunks</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff1a40]/15 text-[#ff1a40] border border-[#ff1a40]/30 shadow-[0_0_6px_rgba(255,26,64,0.15)]">
                      {doc.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 rounded-lg hover:bg-[#1e2333] text-[#64748b] hover:text-[#ff1a40] transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Semantic Vector Search Inspector */}
        <div className="bg-[#0d1017]/85 backdrop-blur-xl rounded-2xl p-6 border border-[#ff1a40]/20 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#ff1a40]" />
            <h2 className="text-base font-['Outfit'] font-bold text-white">Semantic RAG Chunk Query Tester</h2>
          </div>

          <form onSubmit={handleSemanticSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts (e.g. 'normalization BCNF', 'ACID transactions')..."
              className="flex-1 bg-[#161925] border border-[#2a3045] focus:border-[#ff1a40] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2.5 rounded-xl btn-duo text-xs font-bold uppercase disabled:opacity-40 shadow-[0_0_12px_rgba(255,26,64,0.25)]"
            >
              {isSearching ? 'Searching...' : 'Retrieve'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono text-[#94a3b8] block">Top Retrieved Chunks:</span>
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {searchResults.map((chunk, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#11141e] border border-[#ff1a40]/20 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#ff1a40] font-semibold">{chunk.document_name}</span>
                      <span className="text-[#94a3b8]">Page {chunk.page_number || 1}</span>
                    </div>
                    <p className="text-xs text-[#cbd5e1] font-['Space_Grotesk'] leading-relaxed">
                      {chunk.content}
                    </p>
                    {chunk.score && (
                      <span className="inline-block text-[10px] font-mono text-[#ff1a40]">
                        Similarity: {((1 - chunk.score) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
