import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Code2,
  Play,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Send,
  User,
  Bot,
  Github,
  Cpu,
  MoreVertical,
  Terminal,
  Package,
  History
} from 'lucide-react';
import Markdown from 'react-markdown';
import { AIProvider } from '../../services/storage';
import { AIService, Message } from '../../services/ai';
import { cn } from '../../lib/utils';
import { useRuntimeSession } from '../../state/runtimeSession';

interface WorkspaceProps {
  onOpenSettings: () => void;
}

const providers: AIProvider[] = ['gemini', 'openai', 'anthropic'];

export const Workspace: React.FC<WorkspaceProps> = ({ onOpenSettings }) => {
  const [chatHeight, setChatHeight] = useState(300);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'ForgePad initialized. Ready to build, package, and ship. What are we working on today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { activeProvider, providerNotice, setProviderNotice, providerHealth, setActiveProvider, preferences } = useRuntimeSession();
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'terminal'>('editor');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    setProviderNotice(`Default provider: ${preferences.defaultProvider}`);
  }, [preferences.defaultProvider, setProviderNotice]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setProviderNotice(`Sending with ${activeProvider}`);

    try {
      const response = await AIService.getInstance().sendMessage([...messages, userMsg], {
        provider: activeProvider,
        onProviderSwitch: ({ to, from, reason }) => {
          setProviderNotice(`Fallback ${from} → ${to} (${reason})`);
        },
      });

      setProviderNotice(response.fallbackUsed ? `Responded via fallback: ${response.provider}` : `Responded via ${response.provider}`);
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || 'No response' }]);
    } catch (error: any) {
      setProviderNotice('Provider error');
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startDragging = () => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', stopDragging);
  };

  const handleDragging = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
      setChatHeight(newHeight);
    }
  };

  const stopDragging = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleDragging);
    document.removeEventListener('mouseup', stopDragging);
  };

  return (
    <div className="flex flex-col h-screen bg-forge-bg overflow-hidden">
      <header className="h-14 border-bottom border-forge-border flex items-center justify-between px-4 glass z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display font-bold text-lg tracking-tight">ForgePad</h1>
          <div className="h-4 w-[1px] bg-forge-border mx-2" />
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">{activeProvider}</span>
          </div>
          <span className="text-xs text-forge-muted">{providerNotice}</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeProvider}
            onChange={(e) => setActiveProvider(e.target.value as AIProvider)}
            className="text-xs bg-forge-card border border-forge-border rounded-lg px-2 py-1"
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-forge-muted">
            <Github className="w-5 h-5" />
          </button>
          <button onClick={onOpenSettings} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-forge-muted">
            <Settings className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-forge-muted">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 p-2 bg-forge-card/50 border-b border-forge-border">
          <button onClick={() => setActiveTab('editor')} className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === 'editor' ? "bg-white/10 text-white" : "text-forge-muted hover:text-white")}>
            <Code2 className="w-4 h-4" />Editor
          </button>
          <button onClick={() => setActiveTab('preview')} className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === 'preview' ? "bg-white/10 text-white" : "text-forge-muted hover:text-white")}>
            <Play className="w-4 h-4" />Preview
          </button>
          <button onClick={() => setActiveTab('terminal')} className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === 'terminal' ? "bg-white/10 text-white" : "text-forge-muted hover:text-white")}>
            <Terminal className="w-4 h-4" />Terminal
          </button>
          <span className="ml-auto text-xs text-forge-muted">Health: {providerHealth[activeProvider]}</span>
        </div>

        <div className="flex-1 bg-forge-bg relative overflow-hidden">
          {activeTab === 'editor' && <div className="absolute inset-0 p-8 text-forge-muted">Editor viewport</div>}
          {activeTab === 'preview' && <div className="absolute inset-0 bg-white flex items-center justify-center"><div className="text-black text-center"><h1 className="text-2xl font-bold mb-2">ForgePad Preview</h1><p className="text-gray-500">Your app is running on port 3000</p></div></div>}
          {activeTab === 'terminal' && <div className="absolute inset-0 bg-black p-4 font-mono text-sm text-emerald-500 overflow-auto"><div>$ npm run build</div></div>}
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button className="w-12 h-12 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"><Package className="w-6 h-6" /></button>
        </div>
      </main>

      <motion.div className="glass border-t border-forge-border flex flex-col z-30" animate={{ height: isChatCollapsed ? 48 : chatHeight }} transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
        <div className="h-12 flex items-center justify-between px-4 drag-handle shrink-0 select-none" onMouseDown={startDragging}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Agent Chat ({activeProvider})</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsChatCollapsed(!isChatCollapsed)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">{isChatCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"><History className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", msg.role === 'user' ? "bg-blue-500" : "bg-forge-card border border-forge-border")}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-500" />}
              </div>
              <div className={cn("p-3 rounded-2xl text-sm leading-relaxed", msg.role === 'user' ? "bg-blue-500 text-white" : "bg-forge-card border border-forge-border text-forge-text")}>
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-forge-bg/50 border-t border-forge-border shrink-0">
          <div className="relative">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Ask the agent to build something..." className="w-full bg-forge-card border border-forge-border rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
            <button onClick={handleSendMessage} disabled={!input.trim() || isTyping} className="absolute right-2 top-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
