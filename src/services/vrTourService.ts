import { db } from '../firebase';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

export interface VRHotspot {
  id?: string;
  longitude: number;
  latitude: number;
  type: 'navigation' | 'office' | 'info' | 'entrance'; // ← DAGDAG
  label: string;
  description?: string;
  targetSceneId?: string;
  targetOfficeId?: string;
  color?: string;
  shape?: 'circle' | 'square' | 'diamond' | 'hexagon' | 'rounded' | 'arrow';
  size?: number;
  direction?: number;
}

export interface VRScene {
  id: string;
  url: string;
  label: string;
  description?: string;
  floorId?: string;
  hotspots: VRHotspot[];
  // Office-specific paths
  officePaths?: Record<string, { points: { lon: number; lat: number }[] }>;
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
    const saved = await getDoc(tourRef);
    const savedScenes = saved.data()?.scenes;
    if (!saved.exists() || !Array.isArray(savedScenes) || savedScenes.length < tour.scenes.length) {
      throw new Error('Virtual tour was not confirmed in Firebase.');
    }
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