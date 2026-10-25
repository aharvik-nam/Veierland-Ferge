import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

// Meldinger fra admin-panelet (public/admin.html) ligger i Firestore vf/notices.
// Rutetidene ligger ikke i Firestore; de kommer fra appens kode via /timetable.json.

const NOTICES = doc(db, 'vf', 'notices');

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
