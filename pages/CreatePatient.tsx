
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Hospital, Patient, MonitoringConfig } from '../types';
import { db } from '../db';
import { sendOTP } from '../utils/sms';

type Step = 'FORM' | 'OTP' | 'CHECK' | 'CONFIG';



export const CreatePatient: React.FC = () => {
  const navigate = useNavigate();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [step, setStep] = useState<Step>('FORM');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    disabilityStatus: 'None',
    reasonForMonitoring: '',
    mobileNumber: '',
    preferredLanguage: 'English' as 'English'
  });

  // OTP State
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  // Check State
  const [existingPatients, setExistingPatients] = useState<Patient[]>([]);

  // Config State
  const [config, setConfig] = useState<MonitoringConfig>({
    fever: false,
    wound: false,
    pain: false,
    respiratory: false,
    mobility: false,
    swelling: false,
    dailyStabilityCheck: true
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('activeHospital');
    if (!stored) {
      navigate('/login');
      return;
    }
    setHospital(JSON.parse(stored));
  }, [navigate]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData.name || !patientData.age || !patientData.mobileNumber) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSendingOtp(true);
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);

    // Send Real SMS
    await sendOTP(patientData.mobileNumber, mockOtp);

    setIsSendingOtp(false);
    setStep('OTP');
  };

  const handleVerifyOtp = () => {
    setIsVerifying(true);
    setTimeout(async () => {
      setIsVerifying(false);
      if (otp.trim() === generatedOtp.trim()) {
        const existing = await db.getPatientsByMobile(patientData.mobileNumber);
        if (existing.length > 0) {
          setExistingPatients(existing);
          setStep('CHECK');
        } else {
          setStep('CONFIG');
        }
      } else {
        alert('Invalid OTP. Please enter the correct code.');
      }
    }, 1000);
  };

  const finalizePatientCreation = async (useExistingId?: string) => {
    if (!hospital) return;
    setIsSaving(true);

    try {
      const patientId = useExistingId || db.generatePatientId();

      // Added missing 'reports' property to match the Patient interface
      const newPatient: Patient = {
        id: patientId,
        name: patientData.name,
        age: parseInt(patientData.age),
        disabilityStatus: patientData.disabilityStatus,
        medicalConditions: 'Not Specified', // Default as the section was removed
        reasonForMonitoring: patientData.reasonForMonitoring,
        mobileNumber: patientData.mobileNumber,
        preferredLanguage: patientData.preferredLanguage,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        monitoringConfig: config,
        status: 'Stable',
        createdAt: Date.now(),
        reports: []
      };

      await db.savePatient(newPatient);
      alert(`Success! Patient Dashboard ID: ${patientId} has been successfully generated.`);
      navigate('/dashboard');
    } catch (error) {
      console.error("Failed to save patient:", error);
      alert("Failed to save patient data. Please checks your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!hospital) return null;

  return (
    <Layout hospitalName={hospital.name}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-5 mb-10">
          <button
            onClick={() => step === 'FORM' ? navigate('/dashboard') : setStep('FORM')}
            className="p-3 bg-white hover:bg-gray-100 rounded-2xl transition-all shadow-sm border border-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Patient Enrollment</h2>
            <p className="text-gray-500 font-medium">Register and configure recovery monitoring</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-12 px-6 relative">
          <div className="absolute top-5 left-12 right-12 h-1 bg-gray-100 -z-10 rounded-full"></div>
          {['Basic Info', 'OTP Verify', 'ID Check', 'Monitoring'].map((label, idx) => {
            const stepsArr: Step[] = ['FORM', 'OTP', 'CHECK', 'CONFIG'];
            const activeIdx = stepsArr.indexOf(step);
            const isDone = idx < activeIdx;
            const isActive = idx === activeIdx;

            return (
              <div key={label} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${isActive ? 'bg-blue-600 text-white ring-8 ring-blue-50 shadow-xl' :
                  isDone ? 'bg-emerald-500 text-white' : 'bg-white border-4 border-gray-100 text-gray-300'
                  }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest mt-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-gray-50 overflow-hidden min-h-[500px] flex flex-col">
          {step === 'FORM' && (
            <form onSubmit={handleFormSubmit} className="p-12 space-y-10 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Patient Full Name *</label>
                  <input
                    type="text" required
                    value={patientData.name}
                    onChange={e => setPatientData({ ...patientData, name: e.target.value })}
                    className="w-full px-6 py-5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all text-xl bg-gray-50/50 text-gray-900 font-bold placeholder:text-gray-400"
                    placeholder="e.g. Michael Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Age (Years) *</label>
                  <input
                    type="number" required
                    value={patientData.age}
                    onChange={e => setPatientData({ ...patientData, age: e.target.value })}
                    className="w-full px-6 py-5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all text-xl bg-gray-50/50 text-gray-900 font-bold placeholder:text-gray-400"
                    placeholder="00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Interface Language *</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['English'].map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setPatientData({ ...patientData, preferredLanguage: lang as any })}
                        className={`py-5 rounded-2xl border-2 font-black transition-all text-lg ${patientData.preferredLanguage === lang
                          ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                          : 'border-gray-100 text-gray-500 bg-gray-50/50 hover:bg-white'
                          }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Mobile Contact Number *</label>
                  <input
                    type="tel" required
                    value={patientData.mobileNumber}
                    onChange={e => setPatientData({ ...patientData, mobileNumber: e.target.value })}
                    className="w-full px-6 py-5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all text-xl font-mono bg-gray-50/50 text-gray-900 font-bold placeholder:text-gray-400"
                    placeholder="99999 99999"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Reason for Monitoring *</label>
                  <input
                    type="text" required
                    value={patientData.reasonForMonitoring}
                    onChange={e => setPatientData({ ...patientData, reasonForMonitoring: e.target.value })}
                    className="w-full px-6 py-5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all text-lg bg-gray-50/50 text-gray-900 font-bold placeholder:text-gray-400"
                    placeholder="e.g. Post Hip Replacement Surgery"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-wider">Disability Profile</label>
                  <input
                    type="text"
                    value={patientData.disabilityStatus === 'None' ? '' : patientData.disabilityStatus}
                    onChange={e => setPatientData({ ...patientData, disabilityStatus: e.target.value || 'None' })}
                    className="w-full px-6 py-5 rounded-2xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all text-xl bg-gray-50/50 text-gray-900 font-bold placeholder:text-gray-400"
                    placeholder="e.g. Visual Impairment, None"
                  />
                </div>
              </div>

              <div className="pt-10">
                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className={`w-full bg-blue-600 text-white font-black py-6 rounded-3xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-4 text-xl ${isSendingOtp ? 'opacity-75 cursor-wait' : ''}`}
                >
                  {isSendingOtp ? (
                    <>
                      <div className="w-6 h-6 border-4 border-blue-300 border-t-white rounded-full animate-spin"></div>
                      <span>Sending SMS...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Details & Send OTP</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'OTP' && (
            <div className="p-20 text-center flex-1 flex flex-col justify-center">
              <div className="bg-blue-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-10 text-blue-600 shadow-inner relative">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin opacity-20"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">OTP Verification</h3>
              <p className="text-gray-500 text-lg mb-12 max-w-md mx-auto">
                A 6-digit verification code was sent to
                <span className="block text-gray-900 font-black mt-1">{patientData.mobileNumber}</span>
              </p>

              <div className="max-w-md mx-auto w-full space-y-10">
                <div className="relative group">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    className="w-full text-center text-6xl font-black tracking-[0.6em] py-8 rounded-[2rem] border-4 border-gray-100 focus:border-blue-600 bg-gray-50 outline-none transition-all shadow-inner placeholder:text-gray-200 text-gray-900"
                    placeholder="000000"
                  />

                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || isVerifying}
                  className={`w-full font-black py-6 rounded-3xl transition-all shadow-2xl flex items-center justify-center gap-4 text-xl ${isVerifying ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                    }`}
                >
                  {isVerifying ? (
                    <span className="flex items-center gap-3">
                      <div className="w-6 h-6 border-4 border-gray-300 border-t-white rounded-full animate-spin"></div>
                      Verifying...
                    </span>
                  ) : 'Verify Code'}
                </button>

                <button
                  onClick={() => setStep('FORM')}
                  className="text-base font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                  Re-enter Mobile Number
                </button>
              </div>
            </div>
          )}

          {step === 'CHECK' && (
            <div className="p-12 space-y-10 flex-1">
              <div className="bg-amber-50 border-4 border-amber-100 p-10 rounded-[3rem] flex items-start gap-8 shadow-sm">
                <div className="bg-white p-5 rounded-3xl shadow-lg text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-amber-900 leading-tight">Patient Account Exists</h3>
                  <p className="text-amber-700 mt-3 text-lg font-medium opacity-90">This mobile number is already registered in the system. Would you like to link this hospital visit to their existing profile?</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black text-gray-500 uppercase tracking-widest px-2">Active Patient Accounts</label>
                {existingPatients.map(p => (
                  <div key={p.id} className="p-8 border-4 border-gray-50 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 hover:border-blue-600 hover:bg-blue-50/20 transition-all group cursor-default">
                    <div>
                      <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-tighter mb-3 font-mono group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">{p.id}</div>
                      <div className="text-2xl font-black text-gray-900 tracking-tight">{p.hospitalName}</div>
                      <div className="text-base text-gray-500 font-semibold mt-1">Enrollment Date: {new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button
                      onClick={() => finalizePatientCreation(p.id)}
                      className="bg-white text-gray-900 border-2 border-gray-100 font-black px-8 py-4 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm group-hover:shadow-lg text-lg"
                    >
                      Sync with this ID
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t-2 border-gray-50 flex flex-col items-center">
                <p className="text-gray-400 font-bold mb-6 italic">Alternatively, you can create a fresh dashboard ID specifically for this facility</p>
                <button
                  onClick={() => setStep('CONFIG')}
                  className="w-full bg-gray-900 text-white font-black py-6 rounded-3xl hover:bg-black transition-all shadow-2xl text-xl"
                >
                  Generate New Unique Patient ID
                </button>
              </div>
            </div>
          )}

          {step === 'CONFIG' && (
            <div className="p-12 space-y-12 flex-1">
              <div className="text-center">
                <h3 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Monitoring Suite</h3>
                <p className="text-gray-500 text-lg font-medium">Toggle the smart monitoring modules required for this patient's recovery</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'fever', label: 'Fever Alerts', desc: 'Real-time temperature anomaly detection', color: 'bg-rose-500' },
                  { id: 'wound', label: 'Wound Care', desc: 'Visual infection & healing tracking', color: 'bg-orange-500' },
                  { id: 'pain', label: 'Pain Analytics', desc: 'Intensity & localized stress mapping', color: 'bg-indigo-500' },
                  { id: 'respiratory', label: 'Respiration', desc: 'Breathing rhythm & SpO2 monitoring', color: 'bg-cyan-500' },
                  { id: 'mobility', label: 'Mobility Pulse', desc: 'Post-op activity & movement goals', color: 'bg-emerald-500' },
                  { id: 'swelling', label: 'Inflammation', desc: 'Localized swelling & edema checks', color: 'bg-blue-500' }
                ].map(mod => {
                  const isActive = config[mod.id as keyof MonitoringConfig];
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setConfig({ ...config, [mod.id]: !isActive })}
                      className={`flex items-start text-left gap-6 p-7 rounded-[2rem] border-4 transition-all duration-300 group ${isActive
                        ? 'border-blue-600 bg-blue-50/50 shadow-2xl ring-8 ring-blue-50'
                        : 'border-gray-50 bg-white hover:border-gray-200'
                        }`}
                    >
                      <div className={`mt-1 w-8 h-8 rounded-xl flex items-center justify-center border-4 transition-all ${isActive ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg' : 'border-gray-100 text-transparent'
                        }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <span className="block font-black text-gray-900 text-xl leading-tight group-hover:text-blue-700 transition-colors">{mod.label}</span>
                        <span className="text-sm text-gray-500 font-semibold mt-1 block">{mod.desc}</span>
                      </div>
                    </button>
                  );
                })}

                <div className="md:col-span-2 p-10 rounded-[2.5rem] border-4 border-emerald-100 bg-emerald-50/50 flex items-center gap-8 shadow-inner">
                  <div className="p-5 bg-white rounded-3xl shadow-xl text-emerald-600 scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block font-black text-emerald-900 text-2xl tracking-tight">Daily Stability Assurance</span>
                    <span className="text-base text-emerald-700 font-bold italic opacity-80 mt-1 block">AI-driven Video & Voice bio-verification is mandatory for patient safety.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => finalizePatientCreation()}
                disabled={isSaving}
                className={`w-full bg-blue-600 text-white font-black py-7 px-10 rounded-[2rem] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-300 text-2xl uppercase tracking-widest flex justify-center items-center gap-4 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isSaving ? (
                  <>
                    <div className="w-6 h-6 border-4 border-blue-300 border-t-white rounded-full animate-spin"></div>
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <span>Launch Monitoring Dashboard</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
