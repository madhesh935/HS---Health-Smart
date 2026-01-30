
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../db';

export const Login: React.FC = () => {
  const [hospitalId, setHospitalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const hospital = await db.getHospitalById(hospitalId);
    if (hospital && hospital.password === password) {
      sessionStorage.setItem('activeHospital', JSON.stringify(hospital));
      navigate('/dashboard');
    } else {
      setError('Invalid Hospital ID or Password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-10 left-10 p-3 bg-white hover:bg-gray-100 rounded-2xl transition-all shadow-sm border border-gray-100 flex items-center gap-2 font-bold text-gray-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Portals</span>
      </button>

      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hospital Portal</h2>
          <p className="text-gray-500 mt-2 font-medium">Sign in to manage patient monitoring</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Hospital ID</label>
            <input
              type="text"
              required
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-600 outline-none transition-all bg-gray-50/50 text-lg font-bold text-gray-900 placeholder:text-gray-400"
              placeholder="Unique facility ID"
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
            Login
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-bold text-gray-400">
          Not registered yet?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Create Hospital Account
          </Link>
        </p>
      </div>
    </div>
  );
};
