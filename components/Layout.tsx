
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  hospitalName?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, hospitalName }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('activeHospital');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="bg-blue-600 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">HS - Health Smart</h1>
            <p className="text-xs text-gray-500 font-medium">Remote Monitoring System</p>
          </div>
        </div>
        
        {hospitalName && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
              Hospital: {hospitalName}
            </span>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
      
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} HS - Health Smart | AI-Based 24/7 Smart Post-Operative Remote Recovery Monitoring System
      </footer>
    </div>
  );
};