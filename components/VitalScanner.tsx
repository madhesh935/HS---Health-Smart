import React, { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { drawConnectors } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh';
import { healthAnalyzer } from '../utils/healthAnalyzer';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Patient, VitalSignRecord } from '../types';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export const VitalScanner: React.FC<{ onClose: () => void; onComplete?: (vitals: VitalSignRecord) => void; patient?: Patient }> = ({ onClose, onComplete, patient }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [vitals, setVitals] = useState<any>({
        heartRate: 0,
        spo2: 0,
        hrv: 0,
        stress: 0,
        respiratoryRate: 0,
        blinkRate: 0,
        bp: '---/---'
    });

    const [scanState, setScanState] = useState<'INIT' | 'SCANNING' | 'COMPLETE'>('INIT');
    const scanStateRef = useRef<'INIT' | 'SCANNING' | 'COMPLETE'>('INIT');

    const [progress, setProgress] = useState(0);
    const progressRef = useRef(0);

    // Sync refs with state to avoid stale closures in MediaPipe callbacks
    useEffect(() => {
        scanStateRef.current = scanState;
        progressRef.current = progress;
    }, [scanState, progress]);

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    // Chart Data State
    const [hrHistory, setHrHistory] = useState<number[]>(new Array(20).fill(70));

    // Finish Scan
    useEffect(() => {
        if (scanState === 'COMPLETE' && onComplete) {
            // Add a small delay to ensure final vitals are set or just send current
            setTimeout(() => {
                onComplete({
                    ...vitals,
                    timestamp: Date.now()
                });
            }, 500);
        }
    }, [scanState, onComplete, vitals]);

    // Simulation Loop for Demo Mode
    useEffect(() => {
        if (!isDemoMode || scanState !== 'SCANNING') return;

        const interval = setInterval(() => {
            setVitals((prev: any) => {
                const newStress = Math.min(100, Math.max(0, prev.stress + (Math.random() - 0.5) * 5));
                return {
                    heartRate: Math.floor(70 + Math.sin(Date.now() / 1000) * 10 + Math.random() * 5),
                    spo2: 98 + Math.floor(Math.random() * 2),
                    hrv: Math.floor(40 + Math.random() * 20),
                    stress: Math.floor(newStress),
                    respiratoryRate: 15 + Math.floor(Math.random() * 5),
                    blinkRate: 12 + Math.floor(Math.random() * 10)
                };
            });

            setHrHistory(prev => {
                const next = [...prev, Math.floor(70 + Math.sin(Date.now() / 1000) * 10)];
                if (next.length > 20) next.shift();
                return next;
            });

            setProgress(prev => {
                const step = 0.5;
                if (prev >= 100) {
                    setScanState('COMPLETE');
                    return 100;
                }
                return prev + step;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [isDemoMode, scanState]);

    // Helper to get status text based on progress
    const getScanStatusText = (progress: number) => {
        if (progress < 25) return "Locating Facial Nerves...";
        if (progress < 50) return "Mapping Vascular Network...";
        if (progress < 75) return "Analyzing Blood Flow Velocity...";
        return "Calibrating Vital Signs...";
    };

    // 1. Enumerate Devices
    useEffect(() => {
        const getDevices = async () => {
            let stream: MediaStream | null = null;
            try {
                // Must ask for permission first to get labels
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter(d => d.kind === 'videoinput');
                setVideoDevices(cameras);
                if (cameras.length > 0) {
                    // Check if we already have a selection, if not, pick first
                    setSelectedDeviceId(prev => prev || cameras[0].deviceId);
                }
            } catch (err: any) {
                console.error("Error listing devices:", err);
            } finally {
                // CRITICAL: Stop the probe stream immediately to release the camera
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            }
        };
        if (!isDemoMode) getDevices();
    }, [isDemoMode]);

    // 2. Main Camera Logic
    useEffect(() => {
        if (isDemoMode) return;
        // Proceed even if videoDevices is empty, maybe getUserMedia works anyway

        let faceMesh: FaceMesh | null = null;
        let activeStream: MediaStream | null = null;
        let animationFrameId: number;

        const startCamera = async () => {
            try {
                setCameraError(null);
                let stream: MediaStream | null = null;

                // Attempt 1: Preferred settings (User selection or 640x480)
                try {
                    const constraints = {
                        video: selectedDeviceId
                            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
                            : { width: { ideal: 640 }, height: { ideal: 480 } }
                    };
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (err) {
                    console.warn("Specific constraints failed, trying generic...", err);
                }

                // Attempt 2: Generic fallback (Any video)
                if (!stream) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    } catch (err: any) {
                        throw new Error(err.message || "Could not access any camera");
                    }
                }

                if (!stream) throw new Error("No video stream available");
                activeStream = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await new Promise((resolve) => {
                        if (videoRef.current) {
                            videoRef.current.onloadedmetadata = resolve;
                        }
                    });
                    await videoRef.current.play();
                }

                setIsCameraReady(true);
                setScanState('SCANNING');
                // Force update ref immediately in case callback fires early
                scanStateRef.current = 'SCANNING';

                // Initialize AI
                faceMesh = new FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });

                faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                faceMesh.onResults(onResults);

                // Start Processing Loop
                const processVideo = async () => {
                    if (videoRef.current && faceMesh) {
                        await faceMesh.send({ image: videoRef.current });
                    }
                    if (!activeStream?.active) return; // Stop if stream closed
                    animationFrameId = requestAnimationFrame(processVideo);
                };
                processVideo();

            } catch (err: any) {
                console.error("Camera start failed:", err);
                setCameraError(err.message || "Failed to access camera");
                setIsCameraReady(false);
            }
        };

        const onResults = (results: any) => {
            if (!canvasRef.current || !videoRef.current || !results.multiFaceLandmarks) return;

            const canvasCtx = canvasRef.current.getContext('2d');
            if (!canvasCtx) return;

            // Draw Video
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

            if (results.multiFaceLandmarks.length > 0) {
                const landmarks = results.multiFaceLandmarks[0];

                // 1. Draw Basic Mesh (Subtle Background)
                drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C020', lineWidth: 0.5 });

                if (scanStateRef.current === 'SCANNING') {
                    const time = Date.now();
                    const currentProgress = progressRef.current; // access fresh progress

                    // 2. Draw "Nerves" (Cyan/Electric - Nervous System)
                    if (currentProgress < 50) {
                        const nerveOpacity = 0.4 + Math.sin(time / 100) * 0.4;
                        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
                            color: `rgba(0, 255, 255, ${nerveOpacity})`,
                            lineWidth: 0.5
                        });
                    }

                    // 3. Draw "Blood Vessels" (Red/Pink - Circulatory System)
                    if (currentProgress > 25) {
                        const pulse = (Math.sin(time / 600) + 1) / 2;
                        const vesselOpacity = 0.3 + pulse * 0.5;
                        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
                            color: `rgba(255, 50, 50, ${vesselOpacity})`,
                            lineWidth: 1.5
                        });
                    }

                    // Scan Line Effect
                    const scanY = (Math.sin(time / 1000) + 1) / 2 * canvasRef.current.height;
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(0, scanY);
                    canvasCtx.lineTo(canvasRef.current.width, scanY);
                    canvasCtx.strokeStyle = 'rgba(0, 255, 100, 0.5)';
                    canvasCtx.lineWidth = 2;
                    canvasCtx.stroke();


                    // Analyze Signals
                    // Extract rPPG signal from the canvas (now containing the current frame)
                    const greenSignal = healthAnalyzer.extractGreenSignal(canvasRef.current, landmarks);

                    const stats = healthAnalyzer.estimateVitals(landmarks, Date.now(), greenSignal);
                    setVitals(stats);

                    // Update Charts
                    setHrHistory(prev => {
                        const next = [...prev, stats.heartRate];
                        if (next.length > 20) next.shift();
                        return next;
                    });

                    // Simulate Progress
                    setProgress(prev => {
                        if (prev >= 100) {
                            setScanState('COMPLETE');
                            return 100;
                        }
                        return prev + 0.2; // Slower for effect
                    });
                }
            }
            canvasCtx.restore();
        };

        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            if (faceMesh) {
                faceMesh.close();
            }
            cancelAnimationFrame(animationFrameId);
        };
    }, [selectedDeviceId, isDemoMode]); // Restart if device changes

    const enableDemoMode = () => {
        setCameraError(null);
        setIsDemoMode(true);
        setScanState('SCANNING');
    };

    const chartData = {
        labels: new Array(20).fill(''),
        datasets: [
            {
                label: 'Heart Rate (BPM)',
                data: hrHistory,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                tension: 0.4,
                pointRadius: 2
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
        scales: {
            y: {
                min: 50,
                max: 130,
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: { display: false }
        },
        animation: { duration: 0 }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-6xl shadow-2xl h-[90vh] flex gap-8 relative overflow-hidden">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 z-10"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="flex-1 flex flex-col items-center justify-center relative bg-black rounded-[2rem] overflow-hidden shadow-inner">
                    <video ref={videoRef} className="hidden" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" width={640} height={480} />

                    {/* Camera Select Dropdown (Only if multiple cameras) */}
                    {videoDevices.length > 1 && !isDemoMode && (
                        <div className="absolute top-4 right-4 z-40">
                            <select
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                className="bg-black/50 text-white border border-white/20 rounded-lg px-3 py-1 text-xs backdrop-blur-md outline-none"
                            >
                                {videoDevices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}


                    {/* Simulation / Demo Mode Overlay */}
                    {isDemoMode && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-50">
                            <div className="text-9xl text-cyan-500/20 blur-xl animate-pulse">Ω</div>
                        </div>
                    )}
                    {isDemoMode && (
                        <div className="absolute top-5 right-5 bg-cyan-900/80 px-3 py-1 rounded text-cyan-200 text-xs font-bold border border-cyan-500/50">
                            DEMO MODE
                        </div>
                    )}

                    {/* Camera Error / Loading Link */}
                    {!isCameraReady && !cameraError && !isDemoMode && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20">
                            <div className="w-16 h-16 border-4 border-t-blue-500 border-white/20 rounded-full animate-spin mb-4"></div>
                            <p className="font-bold text-lg">Initializing AI Vision...</p>
                            <p className="text-sm text-gray-400">Connecting to {selectedDeviceId ? 'selected device' : 'camera'}...</p>
                        </div>
                    )}

                    {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center z-30">
                            <svg className="w-16 h-16 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p className="font-bold text-lg text-white">Camera Issue Detected</p>
                            <p className="text-sm text-gray-300 mt-2 max-w-md font-mono bg-black/50 p-2 rounded">{cameraError}</p>
                            <p className="text-xs text-gray-400 mt-4">Please check if another app (Zoom/Teams) is using the camera.</p>

                            <div className="flex gap-4 mt-8">
                                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors">
                                    Refresh Page
                                </button>
                                <button onClick={enableDemoMode} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-900/50 transition-colors flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Run Simulation
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Overlay UI */}
                    {(isCameraReady || isDemoMode) && !cameraError && (
                        <>
                            <div className="absolute top-5 left-5 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl text-white font-mono text-sm border border-white/10 flex flex-col gap-1">
                                <div className="text-xs text-green-400 font-bold tracking-widest uppercase">AI BIOMETRIC SCAN</div>
                                <div>{getScanStatusText(progress)}</div>
                            </div>

                            <div className="absolute bottom-10 left-10 right-10">
                                <div className="flex justify-between text-white font-bold mb-2">
                                    <span className="text-cyan-400 font-mono">{progress < 100 ? 'ACQUIRING SIGNAL...' : 'ANALYSIS COMPLETE'}</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="w-[400px] flex flex-col gap-6 overflow-y-auto pr-2">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Vitals Dashboard</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`w-2 h-2 rounded-full ${isCameraReady || isDemoMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                            <span className="text-sm font-bold text-green-600 uppercase tracking-wider">{isCameraReady || isDemoMode ? 'Live Analysis' : 'Connecting...'}</span>
                        </div>
                    </div>

                    <div className="h-40 bg-gray-50 rounded-2xl p-4 border-2 border-gray-100">
                        <Line data={chartData} options={chartOptions as any} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 hover:scale-105 transition-transform">
                            <div className="text-red-500 text-sm font-bold uppercase">Heart Rate</div>
                            <div className="text-3xl font-black text-red-700">{vitals.heartRate} <span className="text-sm">BPM</span></div>
                        </div>

                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 hover:scale-105 transition-transform">
                            <div className="text-blue-500 text-sm font-bold uppercase">SpO2</div>
                            <div className="text-3xl font-black text-blue-700">{vitals.spo2}%</div>
                        </div>

                        <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 hover:scale-105 transition-transform">
                            <div className="text-purple-500 text-sm font-bold uppercase">Stress Lvl</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-purple-700">{Number(vitals.stress).toFixed(2)}</span>
                                <span className="text-sm text-purple-400 font-bold">/100</span>
                            </div>
                        </div>

                        {/* HRV Card Removed as per request */}

                        <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 hover:scale-105 transition-transform">
                            <div className="text-teal-500 text-sm font-bold uppercase">Resp. Rate</div>
                            <div className="text-3xl font-black text-teal-700">{vitals.respiratoryRate} <span className="text-sm">rpm</span></div>
                        </div>

                        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 hover:scale-105 transition-transform">
                            <div className="text-orange-500 text-sm font-bold uppercase">Blink Rate</div>
                            <div className="text-3xl font-black text-orange-700">{vitals.blinkRate} <span className="text-sm">/min</span></div>
                        </div>

                        <div className="col-span-2 bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:scale-105 transition-transform flex justify-between items-center">
                            <div>
                                <div className="text-gray-500 text-sm font-bold uppercase">Est. Blood Pressure</div>
                                <div className="text-3xl font-black text-gray-700">{vitals.bp || '---/---'} <span className="text-sm">mmHg</span></div>
                            </div>
                            <div className="text-[10px] text-gray-400 max-w-[150px] text-right">
                                *Experimental estimation based on rPPG signal analysis. Not a medical device.
                            </div>
                        </div>
                    </div>

                    {/* Advanced Parameters List */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest border-b pb-2">Nervous System Inference</h3>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Sympathetic Dominance</span>
                            <span className="font-bold text-gray-900">{vitals.stress > 50 ? 'High' : 'Normal'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Facial Muscle Tension</span>
                            <span className="font-bold text-gray-900">{vitals.stress > 70 ? 'Detected' : 'Relaxed'}</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
