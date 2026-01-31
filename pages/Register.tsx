
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../db';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addToLog = (msg: string) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugLog([]);
    addToLog('Starting registration process...');

    try {
      // Check for duplicates first
      addToLog(`Checking for duplicate ID: ${hospitalId}...`);
      const existing = await db.getHospitalById(hospitalId);
      if (existing) {
        const msg = 'Hospital ID already exists. Please choose a unique one.';
        setError(msg);
        addToLog(msg);
        return;
      }

      addToLog('ID is unique. Saving to Firestore...');
      await db.saveHospital({ id: hospitalId, name, password });
      addToLog('Save successful!');
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || JSON.stringify(err);
      setError('Registration failed: ' + errMsg);
      addToLog(`ERROR: ${errMsg}`);
      if (errMsg.includes('permission')) {
        addToLog('CRITICAL: Firebase Storage is locked. Go to Firebase Console -> Firestore Database -> Rules and allow read/write.');
      } else if (errMsg.includes('found')) {
        addToLog('CRITICAL: Database might not be created. Go to Firebase Console -> Build -> Firestore Database -> Create Database.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/login')}
        className="absolute top-10 left-10 p-3 bg-white hover:bg-gray-100 rounded-2xl transition-all shadow-sm border border-gray-100 flex items-center gap-2 font-bold text-gray-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Login</span>
      </button>

      <div className="flex flex-col gap-6 w-full max-w-md">
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Register Hospital</h2>
            <p className="text-gray-500 mt-2 font-medium">Create an account for your healthcare facility</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl break-words">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Hospital Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-600 outline-none transition-all bg-gray-50/50 text-lg font-bold text-gray-900 placeholder:text-gray-400"
                placeholder="e.g. City General Hospital"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Unique Hospital ID</label>
              <input
                type="text"
                required
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-600 outline-none transition-all bg-gray-50/50 text-lg font-bold text-gray-900 placeholder:text-gray-400"
                placeholder="Choose a unique ID"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-600 outline-none transition-all bg-gray-50/50 text-lg font-bold text-gray-900 placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-black py-4 px-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-lg"
            >
              Register
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-bold text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>

        {/* Debug Log Area */}
        {debugLog.length > 0 && (
          <div className="bg-black text-green-400 p-4 rounded-xl font-mono text-xs w-full overflow-hidden">
            <div className="font-bold text-white mb-2 uppercase tracking-widest border-b border-gray-700 pb-2">Diagnostic Log</div>
            {debugLog.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        )}
      </div>
    </div>
  );
};
