
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Hospital, Patient } from '../types';
import { db } from '../db';

export const HospitalPatientDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('activeHospital');
    if (!stored) { navigate('/login'); return; }
    setHospital(JSON.parse(stored));

    if (id) {
      const p = db.getPatientById(id);
      if (p) setPatient(p);
      else navigate('/dashboard');
    }
  }, [id, navigate]);

  if (!hospital || !patient) return null;

  return (
    <Layout hospitalName={hospital.name}>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">{patient.name}</h2>
            <p className="text-gray-500 font-medium">Dashboard ID: {patient.id} • Registered {new Date(patient.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-1 text-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Risk Status</h4>
            <div className={`text-xl font-black uppercase px-4 py-2 rounded-xl inline-block ${patient.status === 'Stable' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {patient.status}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Active Modules</h4>
            <div className="flex flex-wrap gap-3">
              {Object.entries(patient.monitoringConfig).map(([key, value]) => (
                value && key !== 'dailyStabilityCheck' && (
                  <span key={key} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-black uppercase tracking-tight border border-blue-100">
                    {key}
                  </span>
                )
              ))}
              <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-black uppercase tracking-tight border border-indigo-100">
                Stability Check
              </span>
            </div>
          </div>
        </div>

        <section className="space-y-6">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight px-2">Clinical Stability Reports</h3>

          {(!patient.reports || patient.reports.length === 0) ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 text-center">
              <p className="text-gray-400 font-bold">No stability reports submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[...patient.reports].reverse().map((report, idx) => (
                <div key={report.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Entry #{patient.reports.length - idx}</span>
                      <h4 className="text-xl font-black text-gray-900 mt-1">{new Date(report.timestamp).toLocaleString()}</h4>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">AI Verified</div>
                  </div>

                  <div className="space-y-4">
                    {/* Vitals Report Layout */}
                    {report.reportType === 'VITALS' && report.data && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                          <div className="text-xs font-black uppercase tracking-widest text-rose-400 mb-1">Heart Rate</div>
                          <div className="text-2xl font-black text-rose-600">{report.data.bpm} <span className="text-sm text-gray-400">BPM</span></div>
                        </div>
                        <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-100">
                          <div className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-1">SpO2</div>
                          <div className="text-2xl font-black text-cyan-600">{report.data.spo2}<span className="text-lg">%</span></div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                          <div className="text-xs font-black uppercase tracking-widest text-orange-400 mb-1">Stress</div>
                          <div className="text-xl font-black text-orange-600">{report.data.stress}</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                          <div className="text-xs font-black uppercase tracking-widest text-purple-400 mb-1">Resp. Rate</div>
                          <div className="text-2xl font-black text-purple-600">{report.data.respiration}</div>
                        </div>

                        {/* Extended Params */}
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                          <div className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">HRV (SDNN)</div>
                          <div className="text-2xl font-black text-emerald-600">{report.data.hrv}<span className="text-sm text-gray-400">ms</span></div>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                          <div className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Blood Pressure</div>
                          <div className="text-2xl font-black text-indigo-600">{report.data.bp}</div>
                        </div>
                        <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100">
                          <div className="text-xs font-black uppercase tracking-widest text-pink-400 mb-1">Hemoglobin</div>
                          <div className="text-2xl font-black text-pink-600">{report.data.hemoglobin}<span className="text-sm text-gray-400">g/dL</span></div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                          <div className="text-xs font-black uppercase tracking-widest text-red-400 mb-1">Skin Temp</div>
                          <div className="text-2xl font-black text-red-600">{report.data.temperature}<span className="text-sm text-gray-400">°F</span></div>
                        </div>
                      </div>
                    )}

                    {/* Standard Stability Report with Audio/Video */}
                    {(!report.reportType || report.reportType === 'STABILITY') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Voice Note Log</p>
                          {report.audioUrl ? (
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <audio src={report.audioUrl} controls className="w-full" />
                            </div>
                          ) : <p className="text-gray-400 italic">No voice recording</p>}
                        </div>
                        <div className="space-y-4">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Visual Stability Evidence</p>
                          {report.videoUrl ? (
                            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner relative group">
                              <video src={report.videoUrl} controls className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-300 font-bold">
                              No visual update provided
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 pt-2">AI Clinical Insight</p>
                    <div className={`p-6 rounded-2xl border text-sm leading-relaxed font-medium ${report.status === 'Watch' ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-blue-50/50 border-blue-100 text-blue-900'}`}>
                      {report.aiAnalysis}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};
