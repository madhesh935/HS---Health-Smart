
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Hospital, Patient } from '../types';
import { db } from '../db';

export const Dashboard: React.FC = () => {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messageText, setMessageText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('activeHospital');
    if (!stored) {
      navigate('/login');
      return;
    }
    const h = JSON.parse(stored);
    setHospital(h);
    const allPatients = db.getPatients();
    setPatients(allPatients.filter(p => p.hospitalId === h.id));
  }, [navigate]);

  /* Scroll ref for chat */
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPatient) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedPatient?.messages]);

  const handleSendMessage = () => {
    if (!selectedPatient || !messageText.trim()) return;

    const newMessage: any = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'hospital',
      timestamp: Date.now(),
      read: false
    };

    const updatedPatient = {
      ...selectedPatient,
      messages: [...(selectedPatient.messages || []), newMessage]
    };

    db.savePatient(updatedPatient);

    // Update local state
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    setSelectedPatient(updatedPatient); // Keep modal open with updated data

    // Reset input only
    setMessageText('');
  };

  if (!hospital) return null;

  return (
    <Layout hospitalName={hospital.name}>
      <div className="space-y-8">
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold">Welcome, {hospital.name}</h2>
              <p className="mt-2 text-blue-100 opacity-90 max-w-xl">Manage your post-operative patients and monitor their recovery status in real-time.</p>
            </div>
            <button onClick={() => navigate('/create-patient')} className="bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Create Patient Dashboard
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Patient Monitoring List</h3>
          </div>
          {patients.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No patients currently enrolled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Patient Info</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Dashboard ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.mobileNumber}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-blue-600">{p.id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${p.status === 'Stable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          onClick={() => setSelectedPatient(p)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm"
                        >
                          Message
                        </button>
                        <button
                          onClick={() => navigate(`/hospital/patient/${p.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                        >
                          Open Dashboard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Message Modal - Modern Medical Theme */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in duration-200 border border-gray-200">

              {/* Header */}
              <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{selectedPatient.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${selectedPatient.status === 'Stable' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <p className="text-xs text-gray-500">{selectedPatient.status}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setSelectedPatient(null); setMessageText(''); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                {!selectedPatient.messages || selectedPatient.messages.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm">Start a conversation with {selectedPatient.name}</p>
                  </div>
                ) : (
                  selectedPatient.messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'hospital' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-sm ${msg.sender === 'hospital'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
                        }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-[10px] mt-1 text-right ${msg.sender === 'hospital' ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <input
                  type="text"
                  className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all placeholder-gray-400"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
