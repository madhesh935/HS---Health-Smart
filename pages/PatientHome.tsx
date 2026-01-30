import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, StabilityReport } from '../types';
import { db } from '../db';
import { ChatBot } from '../components/ChatBot';
import { VitalScanner } from '../components/VitalScanner';
import { generateMedicalAnalysis } from '../utils/ai';

export const PatientHome: React.FC = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [view, setView] = useState<'HOME' | 'HISTORY'>('HOME');
  const [showChat, setShowChat] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [messageInputValue, setMessageInputValue] = useState('');

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);

  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // New Module State
  const [activeModule, setActiveModule] = useState<'FEVER' | 'PAIN' | 'WOUND' | 'MOBILITY' | 'RESPIRATORY' | null>(null);
  const [moduleData, setModuleData] = useState<any>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);

  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  /* Media Recorder Refs */
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);

  /* Scroll ref for patient chat */
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Load Patient & Poll for Updates */
  useEffect(() => {
    const stored = sessionStorage.getItem('activePatient');
    if (!stored) {
      navigate('/patient/login');
      return;
    }

    const initialPatient = JSON.parse(stored);

    // Initial load
    setPatient(initialPatient);

    const fetchLatestData = async () => {
      const freshData = await db.getPatientById(initialPatient.id);
      if (freshData) {
        setPatient(freshData);
        sessionStorage.setItem('activePatient', JSON.stringify(freshData));

        // Check submission
        // Check submission - Stability Check is once per day
        const today = new Date().toDateString();
        const hasDaily = freshData.reports?.some((r: any) =>
          new Date(r.timestamp).toDateString() === today &&
          (!r.reportType || r.reportType === 'STABILITY')
        );
        setHasSubmittedToday(!!hasDaily);
      }
    };

    fetchLatestData();
    const interval = setInterval(fetchLatestData, 2000); // Faster polling for chat
    return () => clearInterval(interval);
  }, [navigate]);

  /* Auto-scroll to bottom of chat */
  useEffect(() => {
    if (showMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [patient?.messages, showMessages]);

  const handleSendMessage = async () => {
    if (!messageInputValue.trim() || !patient) return;

    const newMessage: any = {
      id: Date.now().toString(),
      text: messageInputValue,
      sender: 'patient',
      timestamp: Date.now(),
      read: false
    };

    const updated = {
      ...patient,
      messages: [...(patient.messages || []), newMessage]
    };

    // Save to DB
    await db.savePatient(updated);

    // Update Session
    sessionStorage.setItem('activePatient', JSON.stringify(updated));

    // Update Local State
    setPatient(updated);

    // Reset Input
    setMessageInputValue('');
  };

  if (!patient) return null;

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecordingAudio(true);
    } catch (err) { alert('Microphone access required.'); }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      const recorder = new MediaRecorder(stream);
      videoRecorderRef.current = recorder;
      videoChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      };
      recorder.start();
      setIsRecordingVideo(true);
    } catch (err) { alert('Camera/Mic access required.'); }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  const handleStabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioBlob || !patient) return;

    setIsSubmitting(true);

    // Context helper to convert Blob to Base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    };

    // Convert media
    const audioDataUrl = audioBlob ? await blobToBase64(audioBlob) : undefined;
    const videoDataUrl = videoBlob ? await blobToBase64(videoBlob) : undefined;

    setTimeout(async () => {
      const newReport: StabilityReport = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        audioUrl: audioDataUrl,
        videoUrl: videoDataUrl,
        aiAnalysis: "AI Analysis: Patient speech rhythm is steady. Visual recovery markers appear within normal post-operative range.",
        status: 'Stable'
      };

      const updatedPatient = {
        ...patient,
        reports: [...(patient.reports || []), newReport]
      };

      await db.savePatient(updatedPatient);
      setPatient(updatedPatient);
      sessionStorage.setItem('activePatient', JSON.stringify(updatedPatient));

      setIsSubmitting(false);
      setHasSubmittedToday(true);
      alert('Clinical report submitted and saved.');
    }, 1000);
  };

  const handleScanComplete = async (data: any) => {
    // Generate RAG-based Analysis (Simulate or use new fields)
    const assessment = await generateMedicalAnalysis(data, patient.name);

    // Map new VitalSignRecord to StabilityReport format
    // Defaults for missing fields in new scanner
    const reportData = {
      bpm: data.heartRate || 0,
      spo2: data.spo2 || 0,
      stress: data.stress || 0,
      respiration: data.respiratoryRate || 0,
      hrv: data.hrv || 0,
      bp: data.bp || '120/80', // Use detected BP or default
      blinkRate: data.blinkRate || 0
    };

    // Automatically save a Vitals Report
    const newReport: StabilityReport = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      reportType: 'VITALS',
      data: reportData, // Store mapped data
      aiAnalysis: `VITAL SCAN ANALYTICS (AI-POWERED):\nHeart Rate: ${reportData.bpm} BPM | SpO2: ${reportData.spo2}% | Respiratory: ${reportData.respiration} rpm | Stress: ${Number(reportData.stress).toFixed(2)}/100\n\n${assessment}`,
      status: reportData.bpm > 100 || reportData.spo2 < 95 || (reportData.stress as number) > 70 ? 'Watch' : 'Stable'
    };

    // Update Patient
    const updatedPatient = { ...patient, reports: [...(patient.reports || []), newReport] };
    await db.savePatient(updatedPatient);
    sessionStorage.setItem('activePatient', JSON.stringify(updatedPatient));
    setPatient(updatedPatient);

    setShowScanner(false);
  };

  // ...



  const handleModuleSubmit = async () => {
    if (!activeModule || !patient) return;

    let analysis = "";
    let status: 'Stable' | 'Watch' | 'Critical' = 'Stable';
    let extendedData = { ...moduleData };

    // Simple Rule-based Analysis for demo
    if (activeModule === 'FEVER') {
      const temp = parseFloat(moduleData.temp || "98.6");
      if (temp > 100.4) { status = 'Watch'; analysis = `AI Alert: Fever detected (${temp}°F). Hydration and rest recommended.`; }
      else analysis = `Temperature Normal (${temp}°F). No fever signs.`;
    } else if (activeModule === 'PAIN') {
      const level = parseInt(moduleData.level || "0");
      if (level > 6) { status = 'Watch'; analysis = `High pain level (${level}/10) reported. Nurse notification recommended.`; }
      else analysis = `Pain managed at level ${level}/10.`;
    } else if (activeModule === 'WOUND') {
      // AI Analysis Mockup
      setIsSubmitting(true);
      const woundResult = await import('../utils/ai').then(m => m.analyzeWoundImage(moduleData.imageUrl, moduleData.notes));
      extendedData = { ...extendedData, ...woundResult };
      analysis = woundResult.analysis;
      // Check stage for status
      if (['Inflammation', 'Hemostasis'].includes(woundResult.stage)) status = 'Watch';
      setIsSubmitting(false);

    } else if (activeModule === 'MOBILITY') {
      analysis = "Mobility target 80% achieved. Good physical activity progess.";
    } else if (activeModule === 'RESPIRATORY') {
      analysis = "Breathing pattern analysis: consistent rhythm detected. Lung capacity estimate: Normal.";
    }

    const newReport: StabilityReport = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      reportType: activeModule,
      aiAnalysis: analysis,
      status: status,
      data: extendedData
    };

    const updatedPatient = { ...patient, reports: [...(patient.reports || []), newReport] };
    await db.savePatient(updatedPatient);
    sessionStorage.setItem('activePatient', JSON.stringify(updatedPatient));
    setPatient(updatedPatient);

    setActiveModule(null);
    setModuleData({});
    alert(`${activeModule} Report Logged.`);
  };

  if (!patient) return null;

  const FeatureCard = ({ icon, label, enabled, color, onClick }: { icon: React.ReactNode, label: string, enabled: boolean, color: string, onClick?: () => void }) => {
    if (!enabled) return null;
    return (
      <button
        onClick={onClick}
        className={`bg-white p-6 rounded-[2rem] shadow-xl border-4 border-transparent hover:border-${color}-500 transition-all group flex flex-col items-center text-center space-y-4 w-full`}
      >
        <div className={`w-16 h-16 bg-${color}-50 rounded-2xl flex items-center justify-center text-${color}-600 group-hover:bg-${color}-600 group-hover:text-white transition-all`}>
          {icon}
        </div>
        <h4 className="text-lg font-black text-gray-900">{label}</h4>
      </button>
    );
  };

  const statusColors = { Stable: 'bg-emerald-500', Watch: 'bg-amber-500', Critical: 'bg-rose-500' };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => view === 'HISTORY' ? setView('HOME') : navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">{patient.name}</h1>
            <p className="text-xs text-gray-500 font-black uppercase tracking-widest">{patient.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusColors[patient.status]} animate-pulse`}></div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-600">{patient.status}</span>
          </div>
          <button onClick={() => { sessionStorage.removeItem('activePatient'); navigate('/patient/login'); }} className="text-sm font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest">Logout</button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-10 max-w-5xl space-y-12">
        {view === 'HOME' ? (
          <>
            <section className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-200">
              <div className="flex flex-col md:flex-row justify-between gap-10">
                <div className="max-w-md">
                  <h2 className="text-4xl font-black tracking-tight mb-4">Daily Check</h2>
                  <p className="text-indigo-100 font-medium text-lg leading-relaxed">Submit your recovery data for clinician review.</p>

                  <button
                    onClick={() => setShowScanner(true)}
                    className="mt-8 bg-emerald-400 text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-emerald-300 hover:scale-105 transition-all flex items-center gap-3 w-fit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Run AI Vitals Scan
                  </button>

                  {hasSubmittedToday ? (
                    <div className="mt-8 p-6 bg-white/10 rounded-3xl border border-white/20 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-emerald-400 rounded-full flex items-center justify-center text-indigo-900 mb-4 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h3 className="text-xl font-black">Report Received</h3>
                      <p className="text-sm text-indigo-100 mt-2">Your report for today has been safely stored. Come back tomorrow!</p>
                    </div>
                  ) : (
                    <div className="mt-8 flex items-center gap-4">
                      <div className="p-2 rounded-full bg-indigo-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="font-black uppercase tracking-widest text-sm text-indigo-200">Awaiting Today's Input</span>
                    </div>
                  )}
                </div>

                {!hasSubmittedToday && (
                  <form onSubmit={handleStabilitySubmit} className="flex-1 bg-white/10 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 space-y-8">
                    <div className="space-y-4">
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-200 px-1">1. Voice Health Report (Required)</span>
                      <div className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center space-y-4 ${audioBlob ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/30'}`}>
                        {isRecordingAudio ? (
                          <div className="flex flex-col items-center gap-4 animate-pulse">
                            <div className="w-14 h-14 bg-rose-500 rounded-full flex items-center justify-center shadow-lg"><div className="w-4 h-4 bg-white rounded-sm"></div></div>
                            <button type="button" onClick={stopAudioRecording} className="bg-white text-rose-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase">Stop</button>
                          </div>
                        ) : audioUrl ? (
                          <div className="w-full space-y-4 text-center">
                            <audio src={audioUrl} controls className="w-full filter invert opacity-80" />
                            <button type="button" onClick={() => { setAudioBlob(null); setAudioUrl(null); }} className="text-[10px] font-black uppercase tracking-widest text-indigo-200 underline">Delete & Rerecord</button>
                          </div>
                        ) : (
                          <button type="button" onClick={startAudioRecording} className="flex flex-col items-center gap-3 group">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-xl group-hover:scale-110 transition-transform">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <span className="font-black uppercase tracking-widest text-[10px]">Start Voice Recording</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-200 px-1">2. Live Recovery Video (Optional)</span>
                      <div className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center space-y-4 min-h-[160px] ${videoBlob ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/30'}`}>
                        {isRecordingVideo ? (
                          <div className="w-full flex flex-col items-center gap-4">
                            <video ref={videoPreviewRef} autoPlay muted className="w-full aspect-video bg-black rounded-xl shadow-2xl border-2 border-rose-500" />
                            <button type="button" onClick={stopVideoRecording} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg">Stop Recording</button>
                          </div>
                        ) : videoUrl ? (
                          <div className="w-full space-y-4 text-center">
                            <video src={videoUrl} controls className="w-full aspect-video rounded-xl bg-black" />
                            <button type="button" onClick={() => { setVideoBlob(null); setVideoUrl(null); }} className="text-[10px] font-black uppercase tracking-widest text-indigo-200 underline">Remove & Record Again</button>
                          </div>
                        ) : (
                          <button type="button" onClick={startVideoRecording} className="flex flex-col items-center gap-3 group">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white border-2 border-white/20 group-hover:bg-white group-hover:text-indigo-600 transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </div>
                            <span className="font-black uppercase tracking-widest text-[10px]">Capture Live Video</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <button disabled={!audioBlob || isSubmitting} className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 ${!audioBlob || isSubmitting ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-indigo-900/40'}`}>
                      {isSubmitting ? 'Submitting to AI Hub...' : 'Finalize & Send Report'}
                    </button>
                  </form>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight px-2">Recovery Services</h3>
                <span className="px-4 py-1.5 bg-gray-200 text-gray-600 rounded-full text-xs font-black uppercase tracking-widest">Active & Available</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Enabled Medical Modules */}
                <FeatureCard label="Fever Status" enabled={patient.monitoringConfig.fever} color="rose" onClick={() => setActiveModule('FEVER')} icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
                <FeatureCard label="Wound Healing" enabled={patient.monitoringConfig.wound} color="orange" onClick={() => setActiveModule('WOUND')} icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>} />
                <FeatureCard label="Pain Relief" enabled={patient.monitoringConfig.pain} color="purple" onClick={() => setActiveModule('PAIN')} icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
                <FeatureCard label="Mobility Log" enabled={patient.monitoringConfig.mobility} color="emerald" onClick={() => setActiveModule('MOBILITY')} icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>} />
                <FeatureCard label="Respiratory" enabled={true} color="blue" onClick={() => setActiveModule('RESPIRATORY' as any)} icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>} />

                {/* Core Tools - Restored */}
                <FeatureCard
                  label="AI Chatbot" enabled={true} color="blue"
                  onClick={() => setShowChat(true)}
                  icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                />
                <FeatureCard
                  label="Messages" enabled={true} color="indigo"
                  onClick={() => setShowMessages(true)}
                  icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
                />
                <FeatureCard
                  label="History" enabled={true} color="gray"
                  onClick={() => setView('HISTORY')}
                  icon={<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Your Recovery History</h3>
                <p className="text-gray-500 font-medium">Review your previous stability checks and AI insights</p>
              </div>
              <button
                onClick={() => setView('HOME')}
                className="bg-white border-2 border-gray-100 px-6 py-3 rounded-2xl font-black text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
              >
                Return Home
              </button>
            </div>

            {(!patient.reports || patient.reports.length === 0) ? (
              <div className="bg-white p-16 rounded-[3rem] border-4 border-dashed border-gray-100 text-center">
                <p className="text-xl text-gray-400 font-black">No reports filed yet. Start your daily check today!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {[...patient.reports].reverse().map((report, idx) => (
                  <div key={report.id} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-50 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl text-white font-black text-xs uppercase tracking-widest ${report.reportType === 'FEVER' ? 'bg-rose-500' :
                          report.reportType === 'PAIN' ? 'bg-purple-500' :
                            report.reportType === 'WOUND' ? 'bg-orange-500' :
                              report.reportType === 'VITALS' ? 'bg-cyan-500' :
                                'bg-indigo-500'
                          }`}>
                          {report.reportType || 'STABILITY'}
                        </div>
                        <h4 className="text-xl font-black text-gray-900">{new Date(report.timestamp).toLocaleString()}</h4>
                      </div>
                      <div className={`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100 ${report.status === 'Watch' || report.status === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600'}`}>
                        {report.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Clinical Feedback</label>
                        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 text-blue-900 font-medium text-sm italic leading-relaxed">
                          {report.aiAnalysis}
                        </div>
                        {/* Vitals Grid for Patient History */}
                        {report.reportType === 'VITALS' && report.data && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                            <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                              <div className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Heart Rate</div>
                              <div className="text-xl font-black text-rose-600">{report.data.bpm} <span className="text-xs text-gray-400">BPM</span></div>
                            </div>
                            <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-100">
                              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-1">SpO2</div>
                              <div className="text-xl font-black text-cyan-600">{report.data.spo2}<span className="text-sm">%</span></div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                              <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Stress</div>
                              <div className="text-lg font-black text-orange-600">{Number(report.data.stress).toFixed(2)}</div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                              <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">Resp. Rate</div>
                              <div className="text-xl font-black text-purple-600">{report.data.respiration}</div>
                            </div>
                            {/* Extended Params */}

                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Blood Pressure</div>
                              <div className="text-xl font-black text-indigo-600">{report.data.bp}</div>
                            </div>
                          </div>
                        )}

                        {/* Generic fallback for other modules (Fever, Pain, etc) */}
                        {report.data && report.reportType !== 'VITALS' && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {Object.entries(report.data).map(([k, v]) => (
                              <div key={k} className="bg-gray-50 p-2 rounded-lg text-xs">
                                <span className="text-gray-400 uppercase font-bold mr-2">{k}:</span>
                                <span className="font-bold text-gray-700">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4">
                        {report.audioUrl && (
                          <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block text-center">Voice Record</label>
                            <audio src={report.audioUrl} controls className="w-full h-8" />
                          </div>
                        )}
                        {report.videoUrl && (
                          <div className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block text-center">Video Frame</label>
                            <div className="bg-gray-200 h-20 rounded-lg flex items-center justify-center text-xs text-gray-500">Video Attachment</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {showChat && patient && (
        <ChatBot patient={patient} onClose={() => setShowChat(false)} />
      )}

      {showScanner && (
        <VitalScanner patient={patient} onClose={() => setShowScanner(false)} onComplete={handleScanComplete} />
      )}

      {showMessages && patient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] border border-gray-200 animate-in fade-in zoom-in duration-200">

            {/* Header */}
            <div className="bg-indigo-600 p-5 flex justify-between items-center text-white shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Hospital Care Team</h3>
                  <p className="text-xs text-indigo-200 font-medium">Always here for you</p>
                </div>
              </div>
              <button onClick={() => setShowMessages(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Area */}
            <div className="p-6 overflow-y-auto space-y-4 bg-gray-50 flex-1">
              {!patient.messages || patient.messages.length === 0 ? (
                <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <p>Send a message to your care team.</p>
                </div>
              ) : (
                patient.messages.map((msg: any, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${msg.sender === 'patient'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'
                      }`}>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-2 text-right font-medium ${msg.sender === 'patient' ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
              <input
                type="text"
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all placeholder-gray-400"
                placeholder="Type your message..."
                value={messageInputValue}
                onChange={(e) => setMessageInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (!messageInputValue.trim()) return;
                    const newMessage: any = {
                      id: Date.now().toString(),
                      text: messageInputValue,
                      sender: 'patient',
                      timestamp: Date.now(),
                      read: false
                    };
                    const updated = { ...patient, messages: [...(patient.messages || []), newMessage] };
                    setPatient(updated);
                    db.savePatient(updated);
                    sessionStorage.setItem('activePatient', JSON.stringify(updated));
                    setMessageInputValue('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!messageInputValue.trim()) return;
                  const newMessage: any = {
                    id: Date.now().toString(),
                    text: messageInputValue,
                    sender: 'patient',
                    timestamp: Date.now(),
                    read: false
                  };
                  const updated = { ...patient, messages: [...(patient.messages || []), newMessage] };
                  setPatient(updated);
                  db.savePatient(updated);
                  sessionStorage.setItem('activePatient', JSON.stringify(updated));
                  setMessageInputValue('');
                }}
                disabled={!messageInputValue.trim()}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* NEW: Module Specific Modal */}
      {activeModule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className={`p-6 text-white flex justify-between items-center ${activeModule === 'FEVER' ? 'bg-rose-500' :
              activeModule === 'PAIN' ? 'bg-purple-500' :
                activeModule === 'WOUND' ? 'bg-orange-500' :
                  activeModule === 'RESPIRATORY' ? 'bg-blue-500' :
                    'bg-emerald-500'
              }`}>
              <h3 className="text-xl font-black tracking-tight">{activeModule === 'FEVER' ? 'Temperature Log' : activeModule === 'PAIN' ? 'Pain Assessment' : activeModule === 'WOUND' ? 'Wound Check' : activeModule === 'RESPIRATORY' ? 'Respiratory Check' : 'Mobility Activity'}</h3>
              <button onClick={() => setActiveModule(null)} className="p-2 hover:bg-white/20 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 space-y-6">
              {activeModule === 'FEVER' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Current Temperature (°F)</label>
                    <input type="number" step="0.1" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-2xl font-black text-gray-900 outline-none focus:border-rose-500" placeholder="98.6" onChange={e => setModuleData({ ...moduleData, temp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Symptoms</label>
                    <div className="flex flex-wrap gap-2">
                      {['Chills', 'Sweating', 'Headache', 'Nausea'].map(s => (
                        <button key={s} onClick={() => setModuleData({ ...moduleData, symptoms: [...(moduleData.symptoms || []), s] })} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold hover:bg-rose-100 hover:text-rose-600 transition-colors">{s}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeModule === 'PAIN' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Pain Level (1-10)</label>
                    <input type="range" min="1" max="10" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" onChange={e => setModuleData({ ...moduleData, level: e.target.value })} />
                    <div className="text-center font-black text-4xl text-purple-600 mt-2">{moduleData.level || 0}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Location</label>
                    <input type="text" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium" placeholder="e.g. Lower Back" onChange={e => setModuleData({ ...moduleData, location: e.target.value })} />
                  </div>
                </div>
              )}

              {activeModule === 'WOUND' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Wound Location</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-bold outline-none focus:border-orange-500"
                      placeholder="e.g. Left Forearm"
                      value={moduleData.location || ''}
                      onChange={e => setModuleData({ ...moduleData, location: e.target.value })}
                    />
                  </div>

                  <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative overflow-hidden ${moduleData.imageUrl ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-300 text-gray-400 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500'}`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setModuleData({ ...moduleData, imageUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {moduleData.imageUrl ? (
                      <>
                        <div className="w-full h-32 rounded-lg overflow-hidden mb-2 relative z-0">
                          <img src={moduleData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest z-0">Image Captured</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-xs font-black uppercase tracking-widest">Upload Photo</span>
                      </>
                    )}
                  </div>
                  <textarea className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-orange-500 min-h-[100px]" placeholder="Describe healing progress..." onChange={e => setModuleData({ ...moduleData, notes: e.target.value })}></textarea>

                  {isSubmitting && (
                    <div className="text-center text-orange-500 font-bold animate-pulse text-sm">AI Analyzing Wound Topology...</div>
                  )}
                </div>
              )}


              {activeModule === 'RESPIRATORY' && (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <p className="text-blue-100 mb-4">Take a deep breath and exhale slowly. We will record for 10 seconds.</p>

                  {!moduleData.audioUrl ? (
                    <button
                      onClick={async () => {
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                          const recorder = new MediaRecorder(stream);
                          let chunks: Blob[] = [];
                          recorder.ondataavailable = e => chunks.push(e.data);
                          recorder.onstop = () => {
                            const blob = new Blob(chunks, { type: 'audio/webm' });
                            setModuleData({ ...moduleData, audioUrl: URL.createObjectURL(blob), audioBlob: blob });
                            stream.getTracks().forEach(t => t.stop());
                          };
                          recorder.start();

                          // 10s Timer
                          setTimeout(() => {
                            if (recorder.state === 'recording') recorder.stop();
                          }, 10000);
                        } catch (e) { alert('Mic access needed'); }
                      }}
                      className="bg-white text-blue-600 px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
                    >
                      Start 10s Recording
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                        <p className="text-xs font-black uppercase tracking-widest mb-2">Recording Captured</p>
                        <audio src={moduleData.audioUrl} controls className="w-full h-8" />
                      </div>
                      <button onClick={() => setModuleData({})} className="text-sm font-bold underline opacity-80 hover:opacity-100">Retake</button>
                    </div>
                  )}
                </div>
              )}

              {activeModule === 'MOBILITY' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Activity Type</label>
                    <select className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-700 outline-none" onChange={e => setModuleData({ ...moduleData, activity: e.target.value })}>
                      <option>Walking (Indoors)</option>
                      <option>Walking (Outdoors)</option>
                      <option>Stretching</option>
                      <option>Physio Exercises</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Duration (Minutes)</label>
                    <input type="number" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-2xl font-black text-gray-900 outline-none focus:border-emerald-500" placeholder="15" onChange={e => setModuleData({ ...moduleData, duration: e.target.value })} />
                  </div>
                </div>
              )}

              <button onClick={handleModuleSubmit} className={`w-full py-4 rounded-xl text-white font-black uppercase tracking-widest shadow-lg transform transition-all active:scale-95 ${activeModule === 'FEVER' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' :
                activeModule === 'PAIN' ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-200' :
                  activeModule === 'WOUND' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' :
                    activeModule === 'RESPIRATORY' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-200' :
                      'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                }`}>
                Save Report
              </button>
            </div>
          </div>
        </div >
      )}
    </div >
  );
};
