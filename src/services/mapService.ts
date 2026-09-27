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
  stairs: MapPoint | undefined;
  connectionPath: MapPoint[] | null;
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

const defaultFloors: MapFloor[] = [
  { id: 'ground', label: 'Ground Floor', url: '/Floor_Plan_Ground_Floor.jpg', width: 800, height: 600, stairs: undefined, connectionPath: null, entrance: undefined, paths: [] },
  { id: 'second', label: '2nd Floor', url: '/Floor_Plan_Second_Floor.jpg', width: 800, height: 600, stairs: undefined, connectionPath: null, entrance: undefined, paths: [] },
];

function normalizeFloors(floors: MapFloor[] | undefined): MapFloor[] {
  return (floors && floors.length > 0 ? floors : defaultFloors).map((floor) => {
    const fallback = defaultFloors.find((item) => item.id === floor.id);
    return {
      ...floor,
      stairs: floor.stairs,
      connectionPath: floor.connectionPath ?? null,
      url: floor.url || fallback?.url || '',
      width: floor.width || fallback?.width || 800,
      height: floor.height || fallback?.height || 600,
    };
  });
}

/** Get map settings once */
export async function getMapSettings(): Promise<MapSettings> {
  const docRef = doc(db, "settings", "mapFloors");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as MapSettings;
    return { ...data, floors: normalizeFloors(data.floors) };
  }
  return { floors: defaultFloors };
}

/** Save map settings to Firestore */
export async function saveMapSettings(settings: MapSettings) {
  const docRef = doc(db, "settings", "mapFloors");
  await setDoc(docRef, settings);
  const saved = await getDoc(docRef);
  if (!saved.exists()) {
    throw new Error('Map settings were not confirmed in Firebase.');
  }
}

/** Real‑time listener for map settings */
export function useMapSettingsRealtime(callback: (settings: MapSettings) => void) {
  const docRef = doc(db, "settings", "mapFloors");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as MapSettings;
      callback({ ...data, floors: normalizeFloors(data.floors) });
    } else {
      callback({ floors: defaultFloors });
    }
  }, (error) => {
    console.error('Map settings listener unavailable, using default maps:', error);
    callback({ floors: defaultFloors });
  });
}