
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { sendOTP } from '../utils/sms';

export const PatientLogin: React.FC = () => {
  const [patientId, setPatientId] = useState('');
  const [step, setStep] = useState<'ID' | 'OTP'>('ID');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [maskedMobile, setMaskedMobile] = useState('');
  const navigate = useNavigate();

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Verification delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const patient = await db.getPatientById(patientId.trim().toUpperCase());

      if (patient) {
        const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(mockOtp);

        // Mask mobile number
        const mobile = patient.mobileNumber || 'XXXXXXXXXX';
        const masked = mobile.length > 4 ? '*'.repeat(mobile.length - 4) + mobile.slice(-4) : mobile;
        setMaskedMobile(masked);

        // Send OTP via SMS
        await sendOTP(patient.mobileNumber, mockOtp);

        setIsLoading(false);
        setStep('OTP');
      } else {
        setIsLoading(false);
        alert('Invalid Patient Dashboard ID. Please check and try again.');
      }
    } catch (e: any) {
      console.error(e);
      setIsLoading(false);
      alert(`Login Error: ${e.message || 'Connection failed'}`);
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(async () => {
      setIsLoading(false);
      if (otp.trim() === generatedOtp) {
        const patient = await db.getPatientById(patientId.trim().toUpperCase());

        // OPTIMIZATION: Prevent "Quota Exceeded" by NOT storing report history in Session Storage
        // The PatientHome component fetches fresh data from DB anyway.
        if (patient) {
          const safeSessionData = { ...patient, reports: [] };
          try {
            sessionStorage.clear(); // Clear old data to free space
            sessionStorage.setItem('activePatient', JSON.stringify(safeSessionData));
            navigate('/patient/home');
          } catch (storageError) {
            console.error("Session Storage Full", storageError);
            alert("Login successful, but browser storage is full. Some offline features may be limited.");
            navigate('/patient/home');
          }
        }
      } else {
        alert('Invalid OTP. Access Denied.');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-10 left-10 p-3 bg-white hover:bg-gray-100 rounded-2xl transition-all shadow-sm border border-gray-100 flex items-center gap-2 font-bold text-gray-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Home</span>
      </button>

      <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-lg border border-gray-100">
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Patient Access</h2>
          <p className="text-gray-500 mt-3 font-medium">Enter your credentials to view your recovery data</p>
        </div>

        {step === 'ID' ? (
          <form onSubmit={handleIdSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-4 uppercase tracking-widest">Dashboard ID</label>
              <input
                type="text"
                required
                autoFocus
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                disabled={isLoading}
                className="w-full px-6 py-5 rounded-2xl border-4 border-gray-200 focus:border-indigo-600 outline-none transition-all text-2xl font-mono uppercase bg-gray-50/50 text-gray-900 placeholder:text-gray-400 disabled:opacity-50"
                placeholder="PAT-XXXXXX"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 text-xl flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying ID...</span>
                </div>
              ) : 'Verify Patient ID'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase tracking-widest text-sm"
            >
              Cancel Access Request
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpVerify} className="space-y-8 text-center">
            <div className="bg-indigo-50 p-4 rounded-2xl mb-8">
              <p className="text-indigo-900 font-medium">A security code was sent to</p>
              <p className="text-indigo-600 font-black text-xl tracking-widest mt-1">{maskedMobile}</p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-center text-5xl font-black tracking-[0.5em] py-8 rounded-[2rem] border-4 border-gray-200 focus:border-indigo-600 outline-none bg-gray-50/50 text-gray-900 placeholder:text-gray-400"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-black py-6 rounded-3xl transition-all shadow-xl text-xl flex items-center justify-center gap-4 ${isLoading ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                }`}
            >
              {isLoading ? 'Verifying...' : 'Authorize Login'}
            </button>
            <button
              type="button"
              onClick={() => setStep('ID')}
              className="w-full text-gray-400 font-bold hover:text-indigo-600 transition-colors uppercase tracking-widest text-sm"
            >
              Re-enter Dashboard ID
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
