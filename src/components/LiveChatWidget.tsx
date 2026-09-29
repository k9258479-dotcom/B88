import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, ShieldCheck } from 'lucide-react';
import { sounds } from '../utils/audio';

interface ChatMessage {
  id: string;
  sender: 'cs' | 'user';
  text: string;
  time: string;
}

const FAQ_PROMPTS = [
  'Paano mag-deposit sa GCash / Maya?',
  'Magkano ang minimum cashout?',
  'Paano kunin ang Welcome Bonus ₱100?',
  'Mabilis ba ang payout settlement?',
];

export const LiveChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'cs',
      text: 'Magandang araw! Welcome po sa Bet88 24/7 Live Customer Support. Paano po namin kayo matutulungan ngayon?',
      time: 'Just now',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    sounds.playClick();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: 'Just now',
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Automated CS response
    setTimeout(() => {
      let reply = 'Salamat sa pag-inquire! Ang aming payment gateway ay automated at instant crediting sa GCash at Maya.';
      const lower = text.toLowerCase();
      if (lower.includes('deposit') || lower.includes('gcash')) {
        reply = 'Pindutin lamang ang "+ PHP" button sa itaas o pumunta sa Cashier. Piliin ang GCash, i-type ang amount (min. ₱50), at i-scan ang QR code. Auto-credit po agad ito!';
      } else if (lower.includes('cashout') || lower.includes('withdraw') || lower.includes('minimum')) {
        reply = 'Ang minimum cashout ay ₱100 lamang at walang fee (0% cashout fee). Payouts are dispatched within 3-5 minutes direkta sa inyong GCash/Maya number!';
      } else if (lower.includes('bonus') || lower.includes('welcome')) {
        reply = 'Lahat ng bagong rehistradong manlalaro ay awtomatikong may libreng ₱100 Welcome Free Credit at 100% First Deposit Bonus!';
      }

      const csReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'cs',
        text: reply,
        time: 'Just now',
      };
      setMessages(prev => [...prev, csReply]);
    }, 600);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            sounds.playClick();
            setIsOpen(true);
          }}
          className="fixed bottom-5 right-5 z-40 p-3.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold text-xs"
        >
          <MessageSquare className="w-5 h-5 fill-current" />
          <span className="hidden sm:inline">24/7 Live CS</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 h-[480px]">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/50 to-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-400">BET88 LIVE AGENT</h4>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Online · Instant Response
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="p-3 overflow-y-auto flex-1 space-y-2.5 text-xs">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 px-1">{m.time}</span>
              </div>
            ))}
          </div>

          {/* Quick FAQ Chips */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto flex gap-1.5 scrollbar-none text-[11px]">
            {FAQ_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-amber-400 whitespace-nowrap hover:border-slate-700"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Magtanong dito..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="p-2 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
