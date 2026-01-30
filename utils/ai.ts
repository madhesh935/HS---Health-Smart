
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY?.trim() || '';

export const generateMedicalAnalysis = async (
    vitals: { bpm: number; spo2: number; stress: string; respiration: number },
    patientName: string
): Promise<string> => {
    if (!apiKey) {
        return "AI Analysis Unavailable: API Key missing.";
    }

    const prompt = `
    Analyze the following patient vitals and provide a brief, professional clinical assessment (max 2 sentences).
    
    Patient: ${patientName}
    Vitals:
    - Heart Rate: ${vitals.bpm} bpm
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
        // OpenRouter Handling
        if (apiKey.includes('sk-or-v1')) {
            const modelsToTry = [
                "google/gemini-2.0-flash-001",
                "google/gemini-flash-1.5",
                "mistralai/mistral-7b-instruct:free"
            ];

            for (const model of modelsToTry) {
                try {
                    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": window.location.href,
                            "X-Title": "Health Smart Vitals"
                        },
                        body: JSON.stringify({
                            "model": model,
                            "messages": [
                                { "role": "system", "content": "You are a medical AI assistant. Provide concise, safe output." },
                                { "role": "user", "content": prompt }
                            ]
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return data.choices[0]?.message?.content || "Analysis inconclusive.";
                    }
                } catch (e) {
                    console.warn(`Model ${model} failed`, e);
                }
            }
            throw new Error("All OpenRouter models failed");

        } else {
            // Google SDK Handling
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        }

    } catch (error) {
        console.error("AI Generation Error:", error);
        return "AI Analysis temporarily unavailable. Vitals recorded.";
    }
};
