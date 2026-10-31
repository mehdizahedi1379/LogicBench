import React, { useState } from 'react';
import { Sparkles, X, Loader2, Copy, Check, Terminal } from 'lucide-react';
import { askGeminiAssistant } from '../lib/geminiAssistant';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialPrompt: string;
  systemInstruction?: string;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  title,
  initialPrompt,
  systemInstruction,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const text = await askGeminiAssistant(prompt, systemInstruction);
      setResponse(text);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate AI response. Check GEMINI_API_KEY in secrets.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-subtle rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
        <div className="p-4 border-b border-subtle flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">{title}</h3>
              <p className="text-[11px] text-secondary">Powered by Gemini 2.5 Flash via secure server-side proxy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
              Prompt &amp; Request Context
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-canvas border border-subtle rounded-lg p-3 font-mono text-xs text-primary focus:outline-none focus:border-cyan-500 resize-none code-ltr"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={loading || !prompt.trim()}
              onClick={() => handleGenerate()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 disabled:opacity-40 inline-flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? 'Analyzing with Gemini...' : 'Run Gemini Analysis'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs leading-relaxed">
              <strong>API Error / Missing Secret:</strong> {error}
            </div>
          )}

          {response && (
            <div className="space-y-2 pt-2 border-t border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Gemini Response
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-canvas border border-subtle font-sans text-xs text-primary leading-relaxed whitespace-pre-wrap select-text">
                {response}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-subtle bg-surface/50 flex items-center justify-between text-[11px] text-muted">
          <span>LogicBench Gemini Integration</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-subtle text-secondary hover:text-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
