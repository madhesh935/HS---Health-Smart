import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY?.trim() || '';

// Helper to determine provider
const isOpenRouter = (key: string) => key.includes('sk-or-v1');

export const chatWithAI = async (
    systemPrompt: string,
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    audioBase64?: string
): Promise<string> => {
    if (!apiKey) throw new Error("API Key missing");

    // OpenRouter Logic (Text Only Fallback if audio present)
    if (isOpenRouter(apiKey)) {
        if (audioBase64) return "Voice notes are only supported with Google Gemini direct integration.";

        const modelsToTry = [
            "google/gemini-2.0-flash-001",
            "google/gemini-flash-1.5",
            "mistralai/mistral-7b-instruct:free"
        ];
        // ... (rest of OpenRouter logic same as before)
        for (const model of modelsToTry) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": window.location.href,
                        "X-Title": "Health Smart"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            { "role": "system", "content": systemPrompt },
                            ...history.map(m => ({
                                "role": m.role === 'model' ? 'assistant' : 'user',
                                "content": m.text
                            })),
                            { "role": "user", "content": newMessage }
                        ]
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.choices[0]?.message?.content || "No response.";
                }
            } catch (e) {
                console.warn(`Model ${model} failed`, e);
            }
        }
        throw new Error("All AI models failed to respond.");
    }

    // Google AI Studio Logic (Supports Multimodal)
    else {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use flash for speed/multimodal

            // Construct history including system prompt as first user message (shim)
            const chatHistory = [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood. I'm ready to help." }] },
                ...history.map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }))
            ];

            const chat = model.startChat({ history: chatHistory });

            // Send Message with Audio if present
            let result;
            if (audioBase64) {
                // Clean base64 if it has prefix
                const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");

                result = await chat.sendMessage([
                    newMessage || "Please analyze this audio message.",  // Ensure text part exists
                    {
                        inlineData: {
                            mimeType: "audio/mp3", // Assuming MP3/WebM conversion or generic handling
                            data: cleanBase64
                        }
                    }
                ]);
            } else {
                result = await chat.sendMessage(newMessage);
            }

            const response = await result.response;
            return response.text();
        } catch (e) {
            console.error("Google AI Error:", e);
            throw new Error("Google AI Failed");
        }
    }
};

export const generateMedicalAnalysis = async (
    vitals: { bpm: number; spo2: number; stress: string; respiration: number },
    patientName: string
): Promise<string> => {
    if (!apiKey) return "AI Analysis Unavailable: API Key missing.";

    const prompt = `
    Analyze the following patient vitals and provide a brief, professional clinical assessment (max 2 sentences).
    
    Patient: ${patientName}
    Vitals:
    - Heart Rate: ${vitals.bpm} ppm
    - SpO2: ${vitals.spo2}%
    - Respiration: ${vitals.respiration} /min
    - Stress Level: ${vitals.stress}

    Context (Medical Guidelines):
    - Normal HR: 60-100 bpm. >100 is Tachycardia.
    - Normal SpO2: >95%. <90% is critical.
    - Normal Respiration: 12-20.
    - High stress can elevate HR.

    Output format: "Assessment: [Analysis]"
    `;

    try {
        return await chatWithAI("You are a medical AI assistant. Provide concise, safe output.", [], prompt);
    } catch (error) {
        console.error("AI Analysis Error:", error);
        return "AI Analysis temporarily unavailable.";
    }
};

export const analyzeWoundImage = async (imageUrl: string, notes: string): Promise<{ stage: string; analysis: string; confidence: number }> => {
    // Simulating AI Analysis for Demo
    // In production, this would send the image (base64) to GPT-4 Vision or Gemini Pro Vision

    return new Promise((resolve) => {
        setTimeout(() => {
            const stages = [
                { stage: "Hemostasis", analysis: "Wound is fresh. Blood clotting initiated. Keep clean and dry." },
                { stage: "Inflammation", analysis: "Signs of inflammation detected (Redness). Immune response active. Monitor for infection." },
                { stage: "Proliferation", analysis: "Granulation tissue forming. Wound edges contracting. Healing progressing well." },
                { stage: "Maturation", analysis: "Wound fully closed. Scar tissue remodeling. Keep moisturized." }
            ];

            // Randomly select for demo, or based on keywords in notes
            const randomStage = stages[Math.floor(Math.random() * stages.length)];

            resolve({
                stage: randomStage.stage,
                analysis: `AI VISUAL ANALYSIS: ${randomStage.analysis} Confidence: ${(85 + Math.random() * 10).toFixed(1)}%`,
                confidence: 0.9
            });
        }, 2000);
    });
};

export const analyzeBreathAudio = async (audioBlob: Blob): Promise<{ analysis: string; rate: number; quality: string }> => {
    // Simulating Audio Analysis (FFT/Spectrogram analysis mock)
    return new Promise((resolve) => {
        setTimeout(() => {
            const qualities = [
                { type: "Clear", text: "Breath sounds are clear. No wheezing or crackles detected." },
                { type: "Mild Wheeze", text: "Slight high-pitched sound detected during exhalation. Monitor closely." },
                { type: "Clear", text: "Vesicular breath sounds normal. Good airflow." }
            ];
            const result = qualities[Math.floor(Math.random() * qualities.length)];
            const rate = Math.floor(Math.random() * (20 - 12 + 1) + 12);

            resolve({
                analysis: `AI AUDIO ANALYSIS: ${result.text} Estimated Rate: ${rate} breaths/min.`,
                rate: rate,
                quality: result.type
            });
        }, 2500);
    });
};
