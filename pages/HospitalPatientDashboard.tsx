
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
      db.getPatientById(id).then(p => {
        if (p) setPatient(p);
        else navigate('/dashboard');
      });
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
                <ReportCard key={report.id} report={report} patient={patient} idx={patient.reports!.length - idx} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

const ReportCard = ({ report, patient, idx }: { report: any, patient: Patient, idx: number }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const sendReply = async () => {
    if (!replyText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: `[RE: ${report.reportType || 'Report'} #${idx}] ${replyText}`,
      sender: 'hospital',
      timestamp: Date.now(),
      read: false
    };

    const updatedPatient = {
      ...patient,
      messages: [...(patient.messages || []), newMessage]
    };

    await db.savePatient(updatedPatient);
    // We ideally should update local state too, but for now DB save ensures persistence on reload. 
    // A full re-fetch would be better but this is a sub-component.

    setReplySent(true);
    setIsReplying(false);
    setReplyText('');
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Entry #{idx}</span>
          <h4 className="text-xl font-black text-gray-900 mt-1">{new Date(report.timestamp).toLocaleString()}</h4>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">AI Verified</div>
      </div>

      <div className="space-y-4">
        {/* Wound Report Layout */}
        {report.reportType === 'WOUND' && report.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="text-xs font-black uppercase tracking-widest text-gray-400">Wound Capture</h5>
                {report.data.imageUrl ? (
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-md relative group">
                    <img src={report.data.imageUrl} alt="Wound" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest">
                      View High-Res
                    </div>
                  </div>
                ) : (
                  <div className="h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 font-bold">No Image Uploaded</div>
                )}
              </div>
              <div className="space-y-4">
                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-400 block mb-1">Target Location</label>
                    <div className="text-lg font-black text-gray-900">{report.data.location || 'Unspecified'}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-400 block mb-1">Heal Stage (AI)</label>
                    <div className="text-xl font-black text-orange-600">{report.data.stage || 'Analyzing...'}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-400 block mb-1">Confidence</label>
                    <div className="text-sm font-bold text-gray-600">{report.data.confidence ? (report.data.confidence * 100).toFixed(1) + '%' : 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 italic border border-gray-100">
              <span className="font-bold not-italic text-gray-400 uppercase text-xs mr-2">Patient Notes:</span>
              "{report.data.notes || 'No notes provided.'}"
            </div>
          </div>
        )}

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
              <div className="text-xl font-black text-orange-600">{Number(report.data.stress).toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
              <div className="text-xs font-black uppercase tracking-widest text-purple-400 mb-1">Resp. Rate</div>
              <div className="text-2xl font-black text-purple-600">{report.data.respiration}</div>
            </div>

            {/* Extended Params */}
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <div className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Blood Pressure</div>
              <div className="text-2xl font-black text-indigo-600">{report.data.bp}</div>
            </div>
            {report.data.blinkRate && (
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <div className="text-xs font-black uppercase tracking-widest text-orange-400 mb-1">Blink Rate</div>
                <div className="text-2xl font-black text-orange-600">{report.data.blinkRate}<span className="text-sm text-gray-400">/min</span></div>
              </div>
            )}
          </div>
        )}

        {/* Standard Stability Report OR Fever Report with Video */}
        {(!report.reportType || report.reportType === 'STABILITY' || report.reportType === 'FEVER' || report.audioUrl || report.videoUrl) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {/* Fever Data if applicable */}
              {report.reportType === 'FEVER' && report.data && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-4">
                  <div className="text-xs font-black uppercase tracking-widest text-rose-400 mb-1">Recorded Temp</div>
                  <div className="text-3xl font-black text-rose-600">{report.data.temp}°F</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {report.data.symptoms?.map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-white text-rose-500 rounded text-xs font-bold border border-rose-100">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Audio Context</p>
              {report.audioUrl ? (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <audio src={report.audioUrl} controls className="w-full" />
                </div>
              ) : <p className="text-gray-400 italic">No voice recording</p>}
            </div>
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Visual Evidence</p>
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

        {/* Reply Section */}
        <div className="pt-4 border-t border-gray-100 mt-4">
          {replySent ? (
            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Reply Sent Successfully
            </div>
          ) : isReplying ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 min-h-[100px]"
                placeholder="Type your response to the patient..."
              />
              <div className="flex gap-3">
                <button onClick={sendReply} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Send Reply</button>
                <button onClick={() => setIsReplying(false)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setIsReplying(true)} className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              Reply to Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
