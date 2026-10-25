import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const TIMETABLE = doc(db, 'vf', 'timetable');
const NOTICES   = doc(db, 'vf', 'notices');

// ── READ ──────────────────────────────────────────────────────

export async function syncTimetable(): Promise<void> {
  try {
    const snap = await getDoc(TIMETABLE);
    // Er rutetidene slettet i admin-panelet, må den lagrede kopien også bort, ellers overstyrer den fortsatt
    if (snap.exists()) localStorage.setItem('vf_timetable', JSON.stringify(snap.data()));
    else localStorage.removeItem('vf_timetable');
  } catch {
    // offline — localStorage-cache brukes
  }
}

export async function syncNotices(): Promise<void> {
  try {
    const snap = await getDoc(NOTICES);
    if (snap.exists()) {
      const data = snap.data();
      localStorage.setItem('vf_notices', JSON.stringify(data.notices ?? []));
    }
  } catch {
    // offline — localStorage-cache brukes
  }
}

// Lytter på live-oppdateringer (valgfritt — for sanntid i appen)
export function listenTimetable(onChange: () => void): () => void {
  return onSnapshot(TIMETABLE, snap => {
    if (snap.exists()) localStorage.setItem('vf_timetable', JSON.stringify(snap.data()));
    else localStorage.removeItem('vf_timetable');
    onChange();
  }, () => { /* offline */ });
}

// ── WRITE (brukes fra admin) ───────────────────────────────────

export async function saveTimetable(data: object): Promise<void> {
  await setDoc(TIMETABLE, data);
  localStorage.setItem('vf_timetable', JSON.stringify(data));
}

export async function saveNotices(notices: object[]): Promise<void> {
  await setDoc(NOTICES, { notices });
  localStorage.setItem('vf_notices', JSON.stringify(notices));
}
