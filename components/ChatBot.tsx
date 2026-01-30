import React, { useState, useEffect, useRef } from 'react';

import { Patient } from '../types';

interface ChatBotProps {
    patient: Patient;
    onClose: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ patient, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'model',
            text: `Hello ${patient.name}. I am your AI recovery assistant. I know you are recovering from ${patient.medicalConditions}. How are you feeling today?`
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // Check if API key is missing
    useEffect(() => {
        if (!apiKey) {
            setMessages(prev => [...prev, {
                id: 'error-key',
                role: 'model',
                text: "⚠️ System Configuration Missing: GEMINI_API_KEY is not set. Please add your API Key to the .env.local file to enable the AI assistant."
            }]);
        }
    }, []);



    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Import the helper dynamically or assume it's imported at top
            const { chatWithAI } = await import('../utils/ai');

            const systemPrompt = `You are a helpful, empathetic post-operative recovery assistant. 
                    Patient Name: ${patient.name}
                    Condition: ${patient.medicalConditions}
                    Status: ${patient.status}
                    Your goal is to provide supportive, non-medical advice for recovery. 
                    - Always encourage the patient interactively.
                    - If they mention severe pain, fever over 101F, or bleeding, advise them to contact their doctor immediately.
                    - Keep responses concise (under 3 sentences) unless asked for details.
                    - Do not provide diagnosis or prescription changes.`;

            // Filter out the welcome message and local-only errors from history
            const validHistory = messages
                .filter(m => m.id !== 'welcome' && !m.id.startsWith('error'))
                .map(m => ({
                    role: m.role,
                    text: m.text
                }));

            const responseText = await chatWithAI(systemPrompt, validHistory, input);

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: responseText
            }]);
        } catch (error) {
            console.error('Error calling AI:', error);
            const keySnippet = apiKey ? `${apiKey.substring(0, 8)}...` : 'None';
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: `Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] border border-gray-200">

                {/* Header */}
                <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Recovery Assistant</h3>
                            <p className="text-indigo-200 text-xs">AI-Powered Support</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-bl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-2 items-center">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your recovery..."
                        className="flex-1 bg-gray-50 border-transparent focus:bg-white border focus:border-indigo-200 outline-none px-4 py-3 rounded-xl text-gray-700 transition-all placeholder-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="bg-indigo-600 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>

            </div>
        </div>
    );
};
