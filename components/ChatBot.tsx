import React, { useState, useEffect, useRef } from 'react';

import { Patient, AIChatMessage } from '../types';

interface ChatBotProps {
    patient: Patient;
    onClose: () => void;
    onSave: (messages: AIChatMessage[]) => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ patient, onClose, onSave }) => {
    // Load initial messages from patient history or start fresh
    const [messages, setMessages] = useState<AIChatMessage[]>(() => {
        if (patient.aiChatHistory && patient.aiChatHistory.length > 0) {
            return patient.aiChatHistory;
        }
        return [{
            id: 'welcome',
            role: 'model',
            text: `Hello ${patient.name}. I am your AI recovery assistant. I know you are recovering from ${patient.medicalConditions}. How are you feeling today?`
        }];
    });

    // Save whenever messages change (debounce slightly optimization optional, but direct is fine for now)
    useEffect(() => {
        if (messages.length > 0) {
            onSave(messages);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);
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


    const handleClear = () => {
        if (window.confirm("Are you sure you want to clear the chat history?")) {
            const initialMessage: AIChatMessage = {
                id: 'welcome',
                role: 'model',
                text: `Hello ${patient.name}. I am your AI recovery assistant. I know you are recovering from ${patient.medicalConditions}. How are you feeling today?`
            };
            setMessages([initialMessage]);
            onSave([initialMessage]);
        }
    };

    // ... (rest of old logic removed) ...

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' }); // or webm
                const audioUrl = URL.createObjectURL(audioBlob);

                // Convert to Base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    await sendMessage(undefined, base64Audio, audioUrl);
                };
                reader.readAsDataURL(audioBlob);

                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Microphone access is required to send voice notes.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const sendMessage = async (text?: string, audioBase64?: string, audioBlobUrl?: string) => {
        if ((!text && !audioBase64) || isLoading) return;

        const newMessage: AIChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text || "🎤 Voice Note",
            audioUrl: audioBlobUrl // Store URL for local playback
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const { chatWithAI } = await import('../utils/ai');

            // ... (System Prompt logic remains same)
            const systemPrompt = `You are a helpful, empathetic post-operative recovery assistant. 
                    Patient Name: ${patient.name}
                    Condition: ${patient.medicalConditions}
                    Status: ${patient.status}
                    Your goal is to provide supportive, non-medical advice for recovery. 
                    - Always encourage the patient interactively.
                    - If they mention severe pain, fever over 101F, or bleeding, advise them to contact their doctor immediately.
                    - When recommending a doctor's visit for non-critical issues, always suggest doing so "at your convenience" to avoid causing unnecessary alarm.
                    - Keep responses concise (under 3 sentences) unless asked for details.
                    - Do not provide diagnosis or prescription changes.`;

            // Filter history (exclude audio messages from text history for now to save tokens, or include placeholder)
            const validHistory = messages
                .filter(m => m.id !== 'welcome' && !m.id.startsWith('error'))
                .map(m => ({
                    role: m.role,
                    text: m.text // Note: History won't include audio data re-upload
                }));

            const responseText = await chatWithAI(systemPrompt, validHistory, text || "", audioBase64);

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: responseText
            }]);
        } catch (error) {
            console.error('Error calling AI:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: `Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        sendMessage(input);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] border border-gray-200">

                {/* Header ... (same) */}
                <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                    {/* ... Same Header content ... */}
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleClear}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-indigo-100 hover:text-white"
                            title="Clear Chat"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-bl-none'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                                {msg.audioUrl && (
                                    <audio src={msg.audioUrl} controls className="h-10 rounded-lg shadow-sm w-48" />
                                )}
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
                    <button
                        type="button"
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse scale-110' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title="Hold to Record"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isRecording ? "Recording..." : "Type or hold mic to record..."}
                        className="flex-1 bg-gray-50 border-transparent focus:bg-white border focus:border-indigo-200 outline-none px-4 py-3 rounded-xl text-gray-700 transition-all placeholder-gray-400"
                        disabled={isLoading || isRecording}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading || isRecording}
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
