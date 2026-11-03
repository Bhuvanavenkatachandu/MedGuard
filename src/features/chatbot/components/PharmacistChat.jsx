import React, { useState, useEffect, useRef } from 'react';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
import { chatApi } from '../services/chatApi';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Sparkles,
  Zap,
  BookOpen,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'Do we have Paracetamol 500mg in stock?',
  'What is our store policy on medicine returns?',
  'Check available inventory for Amoxicillin',
  'What are our delivery hours and conditions?',
];

export const PharmacistChat = () => {
  const { pharmacy } = usePharmacy();
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, [pharmacy]);

  useEffect(() => {
    if (currentSessionId) {
      fetchSessionDetail(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await chatApi.getSessions(pharmacy?.id);
      setSessions(data || []);
      if (data && data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchSessionDetail = async (sessionId) => {
    try {
      setError(null);
      const data = await chatApi.getSessionDetail(sessionId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load session history:', err);
      setError('Could not load conversation history.');
    }
  };

  const handleStartNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setError(null);
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage('');
    setError(null);

    // Optimistic user message append
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await chatApi.sendMessage({
        message: text,
        session_id: currentSessionId,
        pharmacy_id: pharmacy?.id,
      });

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        message: response.message,
        metadata: {
          sources: response.sources,
          tools_used: response.tools_used,
          cached: response.cached,
          model_used: response.model_used,
        },
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If this was a new session, update currentSessionId and refresh session list
      if (!currentSessionId && response.session_id) {
        setCurrentSessionId(response.session_id);
        fetchSessions();
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.response?.data?.detail || 'Failed to communicate with AI Assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;

    try {
      await chatApi.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        handleStartNewChat();
      }
      fetchSessions();
    } catch (err) {
      console.error('Delete session error:', err);
    }
  };

  const toggleSourceExpand = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col md:flex-row gap-4">
      {/* Sessions Sidebar */}
      <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shrink-0 overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Bot className="w-4 h-4" />
            </span>
            <span className="font-semibold text-white text-sm">Conversations</span>
          </div>

          <button
            onClick={handleStartNewChat}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-xs rounded-xl shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading ? (
            <div className="p-4 text-center text-xs text-slate-500">Loading history...</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-6 h-6 mx-auto text-slate-600" />
              <p>No previous conversations.</p>
            </div>
          ) : (
            sessions.map((sess) => (
              <div
                key={sess.id}
                onClick={() => setCurrentSessionId(sess.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-xs transition group ${
                  currentSessionId === sess.id
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{sess.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(e, sess.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Pane */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
        {/* Chat Pane Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">
                  {pharmacy?.name || 'Pharmacy Assistant'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Gemma 4 IT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Trained on store policies, SOPs, and live inventory
              </p>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-base">How can I assist you today?</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Ask questions about live medicine stock, customer return policies, expiry procedures, or standard operating procedures.
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="w-full space-y-2 pt-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const sources = msg.metadata?.sources || [];
              const tools = msg.metadata?.tools_used || [];
              const isCached = msg.metadata?.cached;

              return (
                <div
                  key={msg.id || idx}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] md:max-w-[75%] space-y-2`}>
                    <div
                      className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.message}
                    </div>

                    {/* Metadata & Tool Badges (for Assistant messages) */}
                    {!isUser && (tools.length > 0 || sources.length > 0 || isCached) && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pl-1">
                        {isCached && (
                          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                            <Zap className="w-3 h-3" />
                            Semantic Cache Hit
                          </span>
                        )}

                        {tools.map((tool, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-mono"
                          >
                            <Package className="w-3 h-3 text-emerald-400" />
                            {tool}
                          </span>
                        ))}

                        {sources.length > 0 && (
                          <button
                            onClick={() => toggleSourceExpand(msg.id || idx)}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                          >
                            <BookOpen className="w-3 h-3" />
                            {sources.length} Verified Sources
                            {expandedSources[msg.id || idx] ? (
                              <ChevronUp className="w-3 h-3 ml-0.5" />
                            ) : (
                              <ChevronDown className="w-3 h-3 ml-0.5" />
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Collapsible Sources Drawer */}
                    {!isUser && expandedSources[msg.id || idx] && sources.length > 0 && (
                      <div className="p-3 bg-slate-950/80 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                        <span className="font-semibold text-emerald-400 text-[11px] block">
                          Retrieved Knowledge Chunks:
                        </span>
                        {sources.map((src, sIdx) => (
                          <div key={sIdx} className="text-slate-400 border-l-2 border-emerald-500 pl-2">
                            <span className="text-slate-200 font-medium">[{src.category}] {src.title}</span>
                            <span className="text-slate-500 text-[10px] ml-2">(Score: {src.score})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-mono text-[11px]">Consulting knowledge base & inventory...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about store policies, SOPs, or check medicine stock..."
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PharmacistChat;
