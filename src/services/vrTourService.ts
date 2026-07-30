import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export interface VRHotspot {
  id?: string;
  longitude: number;   // -180 to 180
  latitude: number;    // -90 to 90
  type: 'navigation' | 'office' | 'info';
  label: string;
  description?: string;
  targetSceneId?: string;
  targetOfficeId?: string;
  color?: string;
  shape?: string;
}

export interface VRScene {
  id: string;
  url: string;
  label: string;
  description?: string;
  hotspots: VRHotspot[];
}

export interface VRTour {
  id: string;
  name: string;
  description: string;
  scenes: VRScene[];
}

const VR_TOUR_DOC_ID = 'buildingTour';

export async function saveBuildingTour(tour: VRTour): Promise<void> {
  try {
    const tourRef = doc(db, 'vrTours', VR_TOUR_DOC_ID);
    await setDoc(tourRef, { ...tour, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.error('Error saving VR tour:', error);
    throw error;
  }
}

export function useBuildingTourRealtime(onData: (data: VRTour | null) => void): () => void {
  const tourRef = doc(db, 'vrTours', VR_TOUR_DOC_ID);
  return onSnapshot(tourRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onData({ id: docSnap.id, ...data } as VRTour);
    } else {
      onData(null);
    }
  }, (error) => {
    console.error('VR Tour listener error:', error);
    onData(null);
  });
}