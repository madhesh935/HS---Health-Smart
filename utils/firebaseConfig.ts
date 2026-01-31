import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAONzD6ZaP2l8Kw9W3kfgffUis-ASLoTPE",
    authDomain: "hs-health-smart.firebaseapp.com",
    projectId: "hs-health-smart",
    storageBucket: "hs-health-smart.firebasestorage.app",
    messagingSenderId: "172952820196",
    appId: "1:172952820196:web:ac02e9899448647dd54ff1",
    measurementId: "G-39TSEPCVDR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
