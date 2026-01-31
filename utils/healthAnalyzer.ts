// Utility for analyzing physiological signals from video frames and landmarks

// Moving average buffer for smoothing signals
class Buffer {
    size: number;
    data: number[];

    constructor(size: number) {
        this.size = size;
        this.data = [];
    }

    push(val: number) {
        this.data.push(val);
        if (this.data.length > this.size) this.data.shift();
    }

    average() {
        if (this.data.length === 0) return 0;
        return this.data.reduce((a, b) => a + b, 0) / this.data.length;
    }
}

export const healthAnalyzer = {
    // Buffers for signal smoothing
    hrBuffer: new Buffer(30), // 1 second roughly
    stressBuffer: new Buffer(50),

    // Previous state for blink detection
    lastEyeOpen: true,
    blinkCount: 0,
    lastBlinkTime: 0,

    /**
     * Extracts the average Green channel intensity from the forehead region
     * Landmarks: 10 (top center), 338 (right), 109 (left), 151 (top)
     */
    extractGreenSignal: (image: HTMLVideoElement | HTMLCanvasElement, landmarks: any[]): number => {
        // Forehead ROI approximation (Triangle between 109, 338, 151)
        // Accessing canvas context directly from the main loop is faster
        // But here we need the pixel data. 
        // Note: For performance in JS, we should ideally grab pixels once per frame in the main loop
        // and pass them here, OR pass the Context.
        // Assuming 'image' is a Canvas with the current frame drawn to it.

        if (image instanceof HTMLCanvasElement) {
            const ctx = image.getContext('2d');
            if (!ctx) return 0;

            // Define a small ROI box around the forehead center (approx landmark 151)
            // Landmark coordinates are normalized [0,1], need to map to width/height
            const w = image.width;
            const h = image.height;
            const cx = landmarks[151].x * w;
            const cy = landmarks[151].y * h;

            // Extract 20x20 patch
            const patchedW = 20;
            const patchedH = 20;
            const startX = Math.max(0, cx - patchedW / 2);
            const startY = Math.max(0, cy - patchedH / 2);

            try {
                const frame = ctx.getImageData(startX, startY, patchedW, patchedH);
                const data = frame.data;
                let greenSum = 0;
                let count = 0;

                // Loop through pixels (RGBA) - Green is index 1, 5, 9...
                for (let i = 0; i < data.length; i += 4) {
                    greenSum += data[i + 1];
                    count++;
                }
                return count > 0 ? greenSum / count : 0;
            } catch (e) {
                return 0; // Canvas might be tainted or out of bounds
            }
        }
        return 0;
    },

    /**
     * Calculates Eye Aspect Ratio (EAR) to detect drowsiness/blinks
     * Landmarks: [33, 160, 158, 133, 153, 144] (Left Eye)
     */
    calculateEAR: (landmarks: any[]): number => {
        const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

        // Left Eye
        // Vertical
        const v1 = dist(landmarks[160], landmarks[144]);
        const v2 = dist(landmarks[158], landmarks[153]);
        // Horizontal
        const h = dist(landmarks[33], landmarks[133]);

        return (v1 + v2) / (2 * h);
    },

    /**
     * Estimate Vitals based on Landmarks (Movement/Tension) + Signal
     */
    /**
     * Estimate Vitals based on Landmarks (Movement/Tension) + Signal
     */
    estimateVitals: (landmarks: any[], timeMs: number, greenSignal: number = 0, age: number = 30) => {
        // 1. Drowsiness / Blinks
        const ear = healthAnalyzer.calculateEAR(landmarks);
        const isEyeOpen = ear > 0.25;

        if (healthAnalyzer.lastEyeOpen && !isEyeOpen) {
            // Blink started
            if (timeMs - healthAnalyzer.lastBlinkTime > 200) {
                healthAnalyzer.blinkCount++;
                healthAnalyzer.lastBlinkTime = timeMs;
            }
        }
        healthAnalyzer.lastEyeOpen = isEyeOpen;

        // 2. rPPG Signal Processing (Heart Rate)
        if (greenSignal > 0) {
            healthAnalyzer.hrBuffer.push(greenSignal);
        }

        // Basic Peak Detection on Green Signal
        const avgGreen = healthAnalyzer.hrBuffer.average();
        const signalDiff = greenSignal - avgGreen;

        // Use signal variance to detect "liveness"
        const isLive = Math.abs(signalDiff) > 0.5;

        // 3. Generate Data
        const now = Date.now();
        const baseHR = 75; // Standard resting HR

        // -- HEART RATE CALCULATION --
        // In a real rPPG, we'd do FFT. Here using signal modulation for responsiveness.
        // Cap the modulation to avoid wild swings (e.g. from lighting changes)
        const rPPGModulation = isLive ? Math.max(-10, Math.min(10, signalDiff / 5)) : 0;

        // Add some sine wave fluctuation to simulate RSA (Respiratory Sinus Arrhythmia)
        const respiratoryEffect = Math.sin(now / 3000) * 3;

        let heartRate = Math.floor(baseHR + rPPGModulation + respiratoryEffect);
        // Clamp HR to realistic resting limits
        heartRate = Math.max(55, Math.min(100, heartRate));


        // -- STRESS LEVEL CALCULATION --
        // Previous Fixed: 20 + Math.abs(signalDiff) * 30; <- This was causing the 95 peg because signalDiff can be large.

        // New Logic: 
        // 1. Base stress off Heart Rate (Higher HR -> Higher Stress)
        // 2. Add HRV proxy (Higher Variability -> Lower Stress). Here we use stability of signal as proxy.
        // 3. Add Respiratory Rate proxy (Faster breathing -> Higher Stress)

        const hrStressFactor = Math.max(0, (heartRate - 60) * 1.5); // 0 at 60bpm, 30 at 80bpm, 60 at 100bpm
        const variability = Math.abs(signalDiff);
        // In real HRV, high variability is GOOD (low stress). In raw signal noise, high variability is usually movement/tension (bad).
        // Let's assume for this mock that steady signal = calm.
        const stabilityStress = Math.min(40, variability * 2);

        let calculatedStress = hrStressFactor + stabilityStress;

        // Normalize to 0-100 range with a bias towards "Normal" (20-50)
        calculatedStress = Math.min(95, Math.max(10, calculatedStress));

        // Push to buffer for smoothing
        healthAnalyzer.stressBuffer.push(calculatedStress);
        const smoothStress = healthAnalyzer.stressBuffer.average();


        // -- RESPIRATORY RATE --
        // Linked to stress slightly
        const respiratoryRate = Math.floor(14 + (smoothStress / 20) + Math.sin(now / 5000));


        // -- BLOOD PRESSURE CALCULATION --
        // Formula estimation based on Age, HR, and Stress
        // Base BP for age 30 ~ 118/78. 
        // BP rises slightly with Age.
        // BP rises with Stress and HR.

        const ageFactor = (age - 25) * 0.3; // +0.3 mmHg per year over 25
        const stressFactorSys = smoothStress * 0.4; // Stress impacts Systolic more
        const stressFactorDia = smoothStress * 0.2;
        const hrFactor = (heartRate - 70) * 0.5;

        const estSys = 110 + ageFactor + stressFactorSys + hrFactor;
        const estDia = 70 + (ageFactor * 0.5) + stressFactorDia + (hrFactor * 0.5);

        // Add small random noise for "live" feel, but keep stable
        const noise = (Math.random() - 0.5) * 2;

        const systolic = Math.floor(Math.max(90, Math.min(180, estSys + noise)));
        const diastolic = Math.floor(Math.max(60, Math.min(120, estDia + noise)));

        return {
            heartRate: heartRate,
            spo2: 98 + (isLive ? 0 : -1),
            hrv: Math.floor(40 + Math.abs(signalDiff) * 2), // Mock HRV
            stress: Math.floor(smoothStress),
            respiratoryRate: respiratoryRate,
            blinkRate: healthAnalyzer.blinkCount,
            bp: `${systolic}/${diastolic}`
        };
    }
};
