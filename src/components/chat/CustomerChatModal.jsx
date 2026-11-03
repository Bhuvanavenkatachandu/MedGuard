import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '../../api/chatApi';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  X,
  Phone,
  MapPin,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const CUSTOMER_PROMPTS = [
  'Do you have Paracetamol in stock?',
  'What is your return policy?',
  'Do you offer home delivery?',
  'What are your store hours?',
];

export const CustomerChatModal = ({ pharmacy, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && pharmacy) {
      // Initialize greeting
      setSessionId(null);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          message: `Hello! I am the AI Assistant for **${pharmacy.name}**.\n\nI can answer questions regarding our store policies, delivery timings, and whether specific medications are in stock.\n\nHow can I help you today?`,
        },
      ]);
    }
  }, [isOpen, pharmacy]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen || !pharmacy) return null;

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage('');
    setError(null);

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      message: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await chatApi.sendMessage({
        message: text,
        session_id: sessionId,
        pharmacy_id: pharmacy.id,
      });

      const asstMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        message: response.message,
      };
      setMessages((prev) => [...prev, asstMsg]);

      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.response?.data?.detail || 'Unable to connect with the pharmacy assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl h-[600px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">{pharmacy.name}</h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Store Assistant
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                {pharmacy.address && (
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    {pharmacy.address}
                  </span>
                )}
                {pharmacy.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    {pharmacy.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || idx}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                    isUser
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2">Checking with store records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap gap-1.5">
            {CUSTOMER_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 rounded-lg text-[11px] transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-4 mb-2 p-2.5 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80">
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
              placeholder="Ask about medicine stock or store policies..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerChatModal;
