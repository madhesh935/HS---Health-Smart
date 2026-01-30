
export interface StabilityReport {
  id: string;
  timestamp: number;
  reportType?: 'STABILITY' | 'VITALS' | 'FEVER' | 'PAIN' | 'WOUND' | 'MOBILITY'; // specific type
  audioUrl?: string;
  videoUrl?: string;
  aiAnalysis: string;
  status: PatientStatus;
  data?: any; // Flexible payload for specific modules (e.g., { temp: 102 } or { painLevel: 8 })
}

export interface Hospital {
  id: string; // Hospital ID provided by user
  name: string;
  password: string;
}

export type PatientStatus = 'Stable' | 'Watch' | 'Critical';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'hospital' | 'patient';
  timestamp: number;
  read: boolean;
}

export interface Patient {
  id: string; // Generated Dashboard ID
  name: string;
  age: number;
  disabilityStatus: string;
  medicalConditions: string;
  reasonForMonitoring: string;
  mobileNumber: string;
  preferredLanguage: 'English' | 'Tamil';
  hospitalId: string;
  hospitalName: string;
  monitoringConfig: MonitoringConfig;
  status: PatientStatus;
  createdAt: number;
  reports: StabilityReport[]; // History of submissions
  messages?: ChatMessage[]; // Two-way chat history
}

export interface MonitoringConfig {
  fever: boolean;
  wound: boolean;
  pain: boolean;
  respiratory: boolean;
  mobility: boolean;
  swelling: boolean;
  dailyStabilityCheck: true; // Always enabled
}

export interface AppState {
  currentHospital: Hospital | null;
}

export interface VitalSignRecord {
  heartRate: number;
  spo2: number;
  hrv: number;
  stress: number;
  respiratoryRate: number;
  blinkRate: number;
  timestamp: number;
}
