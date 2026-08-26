import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapPath {
  officeId: string;
  points: MapPoint[];
}

export interface MapFloor {
  id: string;
  label: string;
  url: string;
  width: number;
  height: number;
  entrance?: MapPoint;
  paths?: MapPath[];
}

export interface MapSettings {
  floors: MapFloor[];
}

/** Get map settings once */
export async function getMapSettings(): Promise<MapSettings> {
  const docRef = doc(db, "settings", "mapFloors");
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as MapSettings;
  return {
    floors: [
      { id: 'ground', label: 'Ground Floor', url: '', width: 800, height: 600, entrance: undefined, paths: [] },
      { id: 'second', label: '2nd Floor', url: '', width: 800, height: 600, entrance: undefined, paths: [] },
    ],
  };
}

/** Save map settings to Firestore */
export async function saveMapSettings(settings: MapSettings) {
  const docRef = doc(db, "settings", "mapFloors");
  await setDoc(docRef, settings);
}

/** Real‑time listener for map settings */
export function useMapSettingsRealtime(callback: (settings: MapSettings) => void) {
  const docRef = doc(db, "settings", "mapFloors");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as MapSettings);
    } else {
      callback({
        floors: [
          { id: 'ground', label: 'Ground Floor', url: '', width: 800, height: 600, entrance: undefined, paths: [] },
          { id: 'second', label: '2nd Floor', url: '', width: 800, height: 600, entrance: undefined, paths: [] },
        ],
      });
    }
  });
}