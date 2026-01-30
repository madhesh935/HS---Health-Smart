import { Hospital, Patient } from './types';

const API_URL = 'http://localhost:3005/api';

export const db = {
  getHospitals: async (): Promise<Hospital[]> => {
    try {
      const res = await fetch(`${API_URL}/hospitals`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { console.error(e); return []; }
  },
  saveHospital: async (hospital: Hospital) => {
    await fetch(`${API_URL}/hospitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hospital)
    });
  },
  getHospitalById: async (id: string): Promise<Hospital | undefined> => {
    const hospitals = await db.getHospitals();
    return hospitals.find(h => h.id === id);
  },
  getPatients: async (): Promise<Patient[]> => {
    try {
      const res = await fetch(`${API_URL}/patients`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { console.error(e); return []; }
  },
  getPatientById: async (id: string): Promise<Patient | undefined> => {
    const patients = await db.getPatients();
    return patients.find(p => p.id === id);
  },
  getPatientsByMobile: async (mobile: string): Promise<Patient[]> => {
    const patients = await db.getPatients();
    return patients.filter(p => p.mobileNumber === mobile);
  },
  savePatient: async (patient: Patient) => {
    // Check if update or create
    const patients = await db.getPatients();
    const needsUpdate = patients.some(p => p.id === patient.id);

    const url = needsUpdate ? `${API_URL}/patients/${patient.id}` : `${API_URL}/patients`;
    const method = needsUpdate ? 'PUT' : 'POST';

    await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });
  },
  generatePatientId: (): string => {
    return 'PAT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
};
