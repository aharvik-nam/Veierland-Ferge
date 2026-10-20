import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
//  STEG 1: Gå til https://console.firebase.google.com
//  STEG 2: Opprett prosjekt → "Veierland Ferge"
//  STEG 3: Legg til en Web-app (</> ikonet)
//  STEG 4: Kopier firebaseConfig og lim inn her:
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCkI6aY3-sIsVIofOURcU3JzINUdeZYOr4",
  authDomain:        "ferge-veierland.firebaseapp.com",
  projectId:         "ferge-veierland",
  storageBucket:     "ferge-veierland.firebasestorage.app",
  messagingSenderId: "371514441127",
  appId:             "1:371514441127:web:11daa945755cae81c08a82",
  measurementId:     "G-RXGSES6D1T",
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
