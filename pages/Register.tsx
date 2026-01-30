
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../db';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (db.getHospitalById(hospitalId)) {
      setError('Hospital ID already exists. Please choose a unique one.');
      return;
    }

    db.saveHospital({ id: hospitalId, name, password });
    alert('Registration successful! Please login.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
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

      <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl">
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
    </div>
  );
};
