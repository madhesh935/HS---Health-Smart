import { Hospital, Patient } from './types';
import { db as firestore } from './utils/firebaseConfig';
import { collection, getDocs, doc, setDoc, getDoc, query, where } from 'firebase/firestore';

export const db = {
  getHospitals: async (): Promise<Hospital[]> => {
    try {
      const snapshot = await getDocs(collection(firestore, 'hospitals'));
      return snapshot.docs.map(d => d.data() as Hospital);
    } catch (e) {
      console.error("Error fetching hospitals:", e);
      return [];
    }
  },
  saveHospital: async (hospital: Hospital) => {
    try {
      const safeData = JSON.parse(JSON.stringify(hospital));
      await setDoc(doc(firestore, 'hospitals', hospital.id), safeData);
    } catch (e) {
      console.error("Error saving hospital:", e);
      throw e; // Bubble up error
    }
  },
  getHospitalById: async (id: string): Promise<Hospital | undefined> => {
    try {
      const snap = await getDoc(doc(firestore, 'hospitals', id));
      if (snap.exists()) return snap.data() as Hospital;
      return undefined;
    } catch (e) {
      console.error("Error fetching hospital by ID:", e);
      throw e;
    }
  },
  getPatients: async (): Promise<Patient[]> => {
    try {
      const snapshot = await getDocs(collection(firestore, 'patients'));
      return snapshot.docs.map(d => d.data() as Patient);
    } catch (e) {
      console.error("Error fetching patients:", e);
      throw e;
    }
  },
  getPatientById: async (id: string): Promise<Patient | undefined> => {
    try {
      const snap = await getDoc(doc(firestore, 'patients', id));
      if (snap.exists()) return snap.data() as Patient;
      return undefined;
    } catch (e) {
      console.error("Error fetching patient by ID:", e);
      throw e;
    }
  },
  getPatientsByMobile: async (mobile: string): Promise<Patient[]> => {
    try {
      const q = query(collection(firestore, 'patients'), where("mobileNumber", "==", mobile));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as Patient);
    } catch (e) {
      console.error("Error fetching patients by mobile:", e);
      throw e;
    }
  },
  savePatient: async (patient: Patient) => {
    try {
      const safeData = JSON.parse(JSON.stringify(patient));
      await setDoc(doc(firestore, 'patients', patient.id), safeData);
    } catch (e) {
      console.error("Error saving patient:", e);
      throw e;
    }
  },
  generatePatientId: (): string => {
    // Generate a random ID, but ensuring uniqueness is better handled by Firestore auto-id if possible.
    // Sticking to current format for compatibility.
    return 'PAT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
};
