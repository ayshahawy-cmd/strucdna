import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, ChevronUp } from 'lucide-react';
import { runAnalystChecklist } from '../services/aiService';
import { EvidenceBundle } from '../types';

interface FollowUpPanelProps {
  bundle: EvidenceBundle;
}

interface ChatSource {
  title: string;
  url: string;
  date: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  parsed?: {
    text: string;
    sources: ChatSource[];
    followUp: string | null;
  };
}

const FollowUpPanel: React.FC<FollowUpPanelProps> = ({ bundle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const parseResponse = (text: string) => {
    const sourcesMatch = text.match(/<!--SOURCES:(.*?)-->/s);
    let sources: ChatSource[] = [];
    if (sourcesMatch) {
      try {
        sources = JSON.parse(sourcesMatch[1]);
      } catch (e) {
        console.error('Failed to parse sources JSON', e);
      }
    }
    const followupMatch = text.match(/<!--FOLLOWUP:(.*?)-->/);
    const followUp = followupMatch ? followupMatch[1].trim() : null;
    let cleanText = text.replace(/<!--.*?-->/gs, '').trim();
    return { text: cleanText, sources, followUp };
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || query;
    if (!textToSend.trim() || isLoading) return;
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: textToSend }]);
    setIsLoading(true);
    try {
      const rawText = await runAnalystChecklist(bundle, textToSend, messages);
      const parsed = parseResponse(rawText || '');
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: rawText || '', parsed },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Error connecting to synthesis agent.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] bg-surface hover:bg-surface-2 text-text px-5 py-3 rounded-full shadow-2xl border border-border flex items-center gap-2 transition-all group"
      >
        <MessageSquare className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium">Ask a follow-up ›</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[340px] h-[500px] bg-[#222222] border border-[#3A3A3A] rounded-xl flex flex-col animate-in slide-in-from-bottom-4 duration-200 font-sans shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2F2F2F] bg-[#1E1E1E] rounded-t-xl">
        <div className="text-[12px] font-semibold text-[#F0EDE8]">
          Follow-up
        </div>
        <div className="text-[11px] font-mono text-[#8A8A8A] truncate max-w-[150px]">
          {bundle.evidence_window}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[#8A8A8A] hover:text-[#E85D4A]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#222222]">
        {messages.slice(-6).map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[10px] font-mono text-[#8A8A8A] mb-1 uppercase">
              {m.role === 'user' ? 'YOU' : 'ANALYST'}
            </div>
            <div
              className={`max-w-[90%] rounded-lg p-3 text-[13px] leading-[1.6] ${m.role === 'user' ? 'bg-[#2A2A2A] text-[#F0EDE8]' : 'text-[#E8E8E8]'}`}
            >
              {m.parsed ? (
                <div>
                  <div className="whitespace-pre-wrap">{m.parsed.text}</div>
                  {m.parsed.sources.length > 0 && (
                    <div className="mt-2 pl-2 border-l-2 border-[#3A3A3A]">
                      {m.parsed.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-[#8A8A8A] truncate"
                        >
                          {s.title}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.parsed.followUp && (
                    <button
                      onClick={() => handleSend(m.parsed!.followUp!)}
                      className="mt-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-full px-3 py-1 text-[11px] text-[#8A8A8A] hover:border-[#F0EDE8] hover:text-[#F0EDE8] transition-colors"
                    >
                      {m.parsed.followUp}
                    </button>
                  )}
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-[#8A8A8A]" />
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#2F2F2F] bg-[#1E1E1E] rounded-b-xl flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question..."
          className="flex-1 bg-[#1C1C1C] border border-[#3A3A3A] rounded-md px-3 py-2 text-[13px] text-[#E8E8E8] focus:border-[#F0EDE8] outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading}
          className="bg-[#F0EDE8] text-[#1C1C1C] rounded-md px-3 py-2 text-[13px] font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default FollowUpPanel;
