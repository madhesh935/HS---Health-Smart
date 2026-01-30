
import { Hospital, Patient } from './types';

const HOSPITALS_KEY = 'smart_postop_hospitals';
const PATIENTS_KEY = 'smart_postop_patients';

export const db = {
  getHospitals: (): Hospital[] => {
    const data = localStorage.getItem(HOSPITALS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveHospital: (hospital: Hospital) => {
    const hospitals = db.getHospitals();
    hospitals.push(hospital);
    localStorage.setItem(HOSPITALS_KEY, JSON.stringify(hospitals));
  },
  getHospitalById: (id: string): Hospital | undefined => {
    return db.getHospitals().find(h => h.id === id);
  },
  getPatients: (): Patient[] => {
    const data = localStorage.getItem(PATIENTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  getPatientById: (id: string): Patient | undefined => {
    return db.getPatients().find(p => p.id === id);
  },
  getPatientsByMobile: (mobile: string): Patient[] => {
    return db.getPatients().filter(p => p.mobileNumber === mobile);
  },
  savePatient: (patient: Patient) => {
    const patients = db.getPatients();
    const existingIndex = patients.findIndex(p => p.id === patient.id);
    if (existingIndex >= 0) {
      patients[existingIndex] = patient;
    } else {
      if (!patient.reports) patient.reports = [];
      patients.push(patient);
    }
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  },
  generatePatientId: (): string => {
    return 'PAT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
};
