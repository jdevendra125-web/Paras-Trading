import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Sparkles, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { parseAIInput } from '../../lib/ai';
import { getCustomers, getMasterItems } from '../../lib/storage';
import type { Customer, MasterItem, AIParseResult } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onResult: (result: AIParseResult) => void;
}

export function AIAssistantModal({ open, onClose, onResult }: Props) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      getCustomers().then(setCustomers);
      getMasterItems().then(setItems);
      setText('');
      setError('');
      setIsListening(false);
    }
  }, [open]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (e.error !== 'no-speech') setError('Microphone error: ' + e.error);
      };
      recognition.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setText(transcript);
      };
      
      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError('');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        // Recognition might already be started
      }
    }
  };

  const handleProcess = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const result = await parseAIInput(text, customers, items);
      if (result.type === 'invoice' && (!result.invoiceData?.items || result.invoiceData.items.length === 0)) {
        throw new Error("Couldn't find any items in your request. Please be specific, e.g. '10 bags of sugar at 500'.");
      }
      if (result.type === 'receipt' && (!result.receiptData?.amount || result.receiptData.amount <= 0)) {
        throw new Error("Couldn't find a valid amount in your request. Please be specific, e.g. 'received 5000 from Devendra'.");
      }
      onResult(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to understand request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="✨ Local AI Assistant">
      <div className="flex flex-col min-h-[300px]">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-content-primary/[0.02] rounded-xl border border-content-primary/[0.04] mb-4">
            <div className="w-16 h-16 rounded-full bg-accent-blue/10 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-accent-blue" />
            </div>
            <h3 className="text-base font-bold text-content-primary mb-1">Local Business Assistant</h3>
            <p className="text-xs text-content-secondary max-w-[280px]">
              Type or speak to prepare bills or pass receipts:<br/>
              <span className="opacity-75 italic text-[11px]">"Invoice to John: 5 bags sugar @ 500"</span><br/>
              <span className="opacity-75 italic text-[11px]">"Pass receipt of 5000 from Alice via GPay today"</span>
            </p>
          </div>
          
          {error && (
            <div className="bg-neon-red/10 p-3 rounded-lg mb-4 flex gap-2 items-start text-neon-red border border-neon-red/20">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-tight">{error}</p>
            </div>
          )}

          <div className="relative flex items-center bg-bg-secondary border border-content-primary/10 rounded-2xl p-1 focus-within:border-accent-blue/50 focus-within:ring-1 focus-within:ring-accent-blue/50 transition-all">
            <button 
              onClick={toggleListen}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${isListening ? 'bg-neon-red text-white animate-pulse' : 'text-slate-400 hover:text-content-primary hover:bg-content-primary/5'}`}
              title="Speak"
            >
              <Mic size={18} />
            </button>
            
            <input
              type="text"
              className="flex-1 bg-transparent border-none px-3 text-sm text-content-primary placeholder-slate-500 focus:outline-none"
              placeholder="Type your message..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleProcess()}
              disabled={loading || isListening}
            />
            
            <button 
              onClick={handleProcess}
              disabled={loading || !text.trim()}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${text.trim() && !loading ? 'bg-accent-blue text-white' : 'text-slate-500 bg-content-primary/5 cursor-not-allowed'}`}
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[9px] text-content-muted uppercase tracking-wider font-bold">100% Offline & Private</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
