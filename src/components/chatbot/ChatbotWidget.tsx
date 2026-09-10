import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { getChatbotFaqs, resolveBotQuery, type BotActionLink } from '../../services/chatbot';
import type { ChatbotFaq } from '../../types/database';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  suggestions?: ChatbotFaq[];
  actionButtons?: BotActionLink[];
  timestamp: string;
}

export const ChatbotWidget: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [faqs, setFaqs] = useState<ChatbotFaq[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGreetingTooltip, setShowGreetingTooltip] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load FAQs on mount
  useEffect(() => {
    getChatbotFaqs().then((data) => {
      setFaqs(data);
    });
  }, []);

  // Initialize conversation with welcome greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'bot',
          text: "Hi there! 👋 Welcome to **Cloud Stack Club** at Chandigarh University. How can I assist you today? You can choose a common question below or type anything you'd like to know!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [messages.length]);

  // Intelligent auto-scroll:
  // When the bot answers, scroll smoothly to the START of the bot's response (do NOT scroll to bottom),
  // allowing the user to immediately read the answer from the top.
  // When the user asks a question or bot is typing, scroll to the bottom.
  useEffect(() => {
    if (!isOpen || messages.length <= 1) return;

    const lastMsg = messages[messages.length - 1];

    const timer = setTimeout(() => {
      if (lastMsg?.sender === 'bot' && latestMessageRef.current && messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const targetEl = latestMessageRef.current;
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top + container.scrollTop;

        container.scrollTo({
          top: Math.max(0, relativeTop - 12),
          behavior: 'smooth',
        });
      } else if (lastMsg?.sender === 'bot' && latestMessageRef.current) {
        latestMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (lastMsg?.sender === 'user' || isTyping) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setShowGreetingTooltip(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [isOpen]);

  const handleAskQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: questionText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Live database + hybrid matching resolver
      const res = await resolveBotQuery(questionText, faqs);

      setTimeout(() => {
        const botMsg: ChatMessage = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot',
          text: res.text,
          suggestions: res.suggestions,
          actionButtons: res.actionLinks,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setIsTyping(false);
        setMessages((prev) => [...prev, botMsg]);
      }, 220);
    } catch (err) {
      console.error('Error resolving bot query:', err);
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: 'Chat restarted! Ask me anything about Cloud Stack Club, leadership, recruitment, or upcoming events.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Top quick suggestions shown at the start
  const topSuggestedQuestions = faqs
    .filter((f) => f.is_active)
    .slice(0, 4);

  // Markdown-lite link & bold parser
  const renderFormattedText = (content: string) => {
    // Clean up any orphaned hand emojis immediately before links or text lines
    const sanitizedContent = content
      .replace(/(?:👉|👈|•\s*👉)\s*(\[[^\]]+\]\([^)]+\))/g, '$1')
      .replace(/(?:👉|👈)\s*/g, '');

    // Split by markdown links [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(sanitizedContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBoldText(sanitizedContent.substring(lastIndex, match.index)));
      }
      const label = match[1];
      const url = match[2];

      if (url.startsWith('/')) {
        parts.push(
          <button
            type="button"
            key={`link-${match.index}`}
            onClick={() => {
              navigate(url);
              setIsOpen(false);
            }}
            className="inline font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer p-0 m-0 bg-transparent border-none text-left align-baseline"
          >
            {label}
          </button>
        );
      } else {
        parts.push(
          <a
            key={`ext-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline font-bold text-blue-600 dark:text-sky-400 hover:underline"
          >
            {label}
          </a>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < sanitizedContent.length) {
      parts.push(renderBoldText(sanitizedContent.substring(lastIndex)));
    }

    return parts;
  };

  const renderBoldText = (str: string) => {
    const boldParts = str.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Check for route patterns like (/events) or (/join) or (/team)
      const routeRegex = /(\(\/(?:events(?:\/[a-zA-Z0-9\-]+)?|join|team|contact|gallery)\))/g;
      if (routeRegex.test(part)) {
        const subParts = part.split(routeRegex);
        return (
          <React.Fragment key={i}>
            {subParts.map((sub, sIdx) => {
              if (sub.startsWith('(/') && sub.endsWith(')')) {
                const rawRoute = sub.slice(1, -1);
                return (
                  <button
                    type="button"
                    key={`sub-${i}-${sIdx}`}
                    onClick={() => {
                      navigate(rawRoute);
                      setIsOpen(false);
                    }}
                    className="inline font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer p-0 m-0 bg-transparent border-none text-left align-baseline"
                  >
                    {rawRoute}
                  </button>
                );
              }
              return sub;
            })}
          </React.Fragment>
        );
      }

      return part;
    });
  };

  return (
    <>
      {/* Floating Action Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8 flex flex-col items-end pointer-events-auto">
        {/* Floating Greeting Pill / Tooltip */}
        <AnimatePresence>
          {!isOpen && showGreetingTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="mb-3 mr-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 max-w-[240px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Have a question about Cloud Stack Club?</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGreetingTooltip(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle FAB Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all cursor-pointer ${
            isOpen
              ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-slate-900/30'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-blue-500/40'
          }`}
          aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        >
          {isOpen ? (
            <ChevronDown className="w-6 h-6" />
          ) : (
            <>
              <Bot className="w-6 h-6" />
              {/* Online pulse indicator */}
              <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* Interactive Chat Window Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 sm:right-8 z-40 w-[92vw] sm:w-[390px] h-[540px] max-h-[82vh] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Window Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-sky-500/10 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      Claudyi
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    Chat Bot • Instant Answers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <button
                  onClick={handleClearChat}
                  title="Restart conversation"
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Minimize"
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((msg, index) => {
                const isLatest = index === messages.length - 1;
                return (
                  <div
                    key={msg.id}
                    ref={isLatest ? latestMessageRef : undefined}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15'
                        : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 shadow-xs'
                    }`}
                  >
                    {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}

                    {/* Action Link Buttons (e.g. Apply to Join Club, View Elevate-X, Browse Events) */}
                    {msg.sender === 'bot' && msg.actionButtons && msg.actionButtons.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-2">
                        {msg.actionButtons.map((btn, bIdx) => (
                          <button
                            key={`btn-${bIdx}`}
                            onClick={() => {
                              if (btn.url.startsWith('/')) {
                                navigate(btn.url);
                                setIsOpen(false);
                              } else {
                                window.open(btn.url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <span>{btn.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1 px-1">
                    {msg.timestamp}
                  </span>

                  {/* Suggestion Pills */}
                  {msg.sender === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[95%]">
                      {msg.suggestions.map((sugg) => (
                        <button
                          key={sugg.id}
                          onClick={() => handleAskQuestion(sugg.question)}
                          className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-sky-400 font-bold text-[11px] border border-blue-500/20 transition-all text-left flex items-center gap-1 cursor-pointer"
                        >
                          <HelpCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{sugg.question}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

              {/* Initial Quick Suggestion Pills */}
              {messages.length === 1 && topSuggestedQuestions.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Popular Questions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {topSuggestedQuestions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleAskQuestion(q.question)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-slate-800 dark:text-slate-200 font-bold transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="truncate">{q.question}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typing Animation */}
              {isTyping && (
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-2xl w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.3s]"></span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar & Support Footer */}
            <div className="p-3 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/80 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion(inputText);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about CSC, leads, events..."
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Not satisfied with bot answers? Kindly{' '}
                <button
                  type="button"
                  onClick={() => {
                    navigate('/contact');
                    setIsOpen(false);
                  }}
                  className="inline font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer bg-transparent border-none p-0 align-baseline"
                >
                  contact us
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
