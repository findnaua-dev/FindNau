import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { OFFICES } from "../app/data/mockData";

// ---------- Types ----------
export interface ServiceRequirement {
  requirement: string;
  source: string;
}

export interface ServiceStep {
  step: number;
  action: string;
  clientStep?: string;
  fee: string;
  processingTime: string;
  personResponsible: string;
}

export interface Service {
  id?: string;
  name: string;
  nameFilipino: string;
  info: string;
  infoFilipino: string;
  typeOfTransaction: string;
  typeOfTransactionFil: string;
  whoMayAvail: string;
  whoMayAvailFil: string;
  requirements: ServiceRequirement[];
  requirementsFilipino: ServiceRequirement[];
  steps: ServiceStep[];
  stepsFilipino: ServiceStep[];
  processingTime: string;
  fee: string;
}

export interface Office {
  id?: string;
  name: string;
  nameFilipino: string;
  shortName: string;
  floor: string;
  floorId?: string;
  description: string;
  descriptionFilipino: string;
  iconBg: string;
  vrTour: boolean;
  mapX: number;
  mapY: number;
  vrSceneId?: string;
  // Schedule fields (optional)
  operatingDays?: string;   // e.g., "Monday – Friday"
  operatingHours?: string;  // e.g., "8:00 AM – 5:00 PM"
  lunchBreak?: string;      // e.g., "12:00 PM – 1:00 PM"
  // Booking fields
  bookingEnabled?: boolean;          // master switch
  maxVisitorsPerSlot?: number;       // e.g., 1
  slotDurationMinutes?: number;      // e.g., 30
  bookingStartTime?: string;         // "08:00"
  bookingEndTime?: string;           // "17:00"
}

// ---------- Offices Collection ----------
const officesRef = collection(db, "offices");

// Real-time listener para sa lahat ng offices at services nila
export function useOfficesRealtime(
  callback: (offices: (Office & { services: Service[] })[]) => void
) {
  const officeData = new Map<string, Office>();
  const serviceData = new Map<string, Service[]>();
  const serviceUnsubscribers = new Map<string, () => void>();

  const emit = () => {
    const offices = Array.from(officeData.entries()).map(([id, office]) => ({
      id,
      ...office,
      services: serviceData.get(id) || [],
    }));
    callback(offices.length > 0
      ? offices
      : (OFFICES as unknown as (Office & { services: Service[] })[]));
  };

  const unsubscribeOffices = onSnapshot(query(officesRef, orderBy("name")), (snapshot) => {
    const activeIds = new Set(snapshot.docs.map((docSnap) => docSnap.id));

    for (const [id, unsubscribe] of serviceUnsubscribers) {
      if (!activeIds.has(id)) {
        unsubscribe();
        serviceUnsubscribers.delete(id);
        serviceData.delete(id);
        officeData.delete(id);
      }
    }

    snapshot.docs.forEach((docSnap) => {
      const id = docSnap.id;
      officeData.set(id, docSnap.data() as Office);

      if (!serviceUnsubscribers.has(id)) {
        const unsubscribeServices = onSnapshot(collection(docSnap.ref, "services"), (servicesSnapshot) => {
          serviceData.set(id, servicesSnapshot.docs.map((serviceDoc) => ({
            id: serviceDoc.id,
            ...serviceDoc.data(),
          })) as Service[]);
          emit();
        }, (error) => {
          console.error(`Firestore services unavailable for office ${id}:`, error);
          serviceData.set(id, []);
          emit();
        });
        serviceUnsubscribers.set(id, unsubscribeServices);
      }
    });

    emit();
  }, (error) => {
    console.error('Firestore offices listener unavailable, using fallback data:', error);
    callback(OFFICES as unknown as (Office & { services: Service[] })[]);
  });

  return () => {
    unsubscribeOffices();
    serviceUnsubscribers.forEach((unsubscribe) => unsubscribe());
    serviceUnsubscribers.clear();
  };
}

// One-time fetch
export async function fetchOffices(): Promise<(Office & { services: Service[] })[]> {
  try {
    const snapshot = await getDocs(officesRef);
    const offices = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const officeData = docSnap.data() as Office;
        const servicesSnap = await getDocs(collection(docSnap.ref, "services"));
        const services = servicesSnap.docs.map((s) => ({ id: s.id, ...s.data() }) as Service);
        return { id: docSnap.id, ...officeData, services };
      })
    );
    return offices.length > 0 ? offices : (OFFICES as unknown as (Office & { services: Service[] })[]);
  } catch (error) {
    console.error('Firestore offices unavailable, using fallback data:', error);
    return OFFICES as unknown as (Office & { services: Service[] })[];
  }
}

// Office CRUD
export async function addOffice(office: Office) {
  const docRef = await addDoc(officesRef, { ...office, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateOffice(id: string, data: Partial<Office>) {
  await updateDoc(doc(db, "offices", id), data);
}

export async function deleteOffice(id: string) {
  const servicesSnap = await getDocs(collection(db, "offices", id, "services"));
  const batch = writeBatch(db);
  servicesSnap.docs.forEach((sDoc) => batch.delete(sDoc.ref));
  batch.delete(doc(db, "offices", id));
  await batch.commit();
}

// Service CRUD (subcollection)
export async function addService(officeId: string, service: Service) {
  const servicesRef = collection(db, "offices", officeId, "services");
  const docRef = await addDoc(servicesRef, service);
  return docRef.id;
}

export async function updateService(officeId: string, serviceId: string, data: Partial<Service>) {
  await updateDoc(doc(db, "offices", officeId, "services", serviceId), data);
}

export async function deleteService(officeId: string, serviceId: string) {
  await deleteDoc(doc(db, "offices", officeId, "services", serviceId));
}

// Seed: ilipat ang mock data sa Firestore
export async function seedInitialData(officesData: (Office & { services: Service[] })[]) {
  for (const office of officesData) {
    const { services, ...officeFields } = office;
    const officeRef = await addDoc(officesRef, officeFields);
    const servicesRef = collection(officeRef, "services");
    for (const service of services) {
      await addDoc(servicesRef, service);
    }
  }
}