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

// ---------- Types ----------
export interface ServiceRequirement {
  requirement: string;
  source: string;
}

export interface ServiceStep {
  step: number;
  action: string;
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
  vrSceneId?: string; // ✅ NEW: linked 360 scene ID
}

// ---------- Offices Collection ----------
const officesRef = collection(db, "offices");

// Real-time listener para sa lahat ng offices at services nila
export function useOfficesRealtime(
  callback: (offices: (Office & { services: Service[] })[]) => void
) {
  return onSnapshot(query(officesRef, orderBy("name")), async (snapshot) => {
    const offices = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const officeData = docSnap.data() as Office;
        const servicesSnap = await getDocs(collection(docSnap.ref, "services"));
        const services = servicesSnap.docs.map((s) => ({
          id: s.id,
          ...s.data(),
        })) as Service[];
        return { id: docSnap.id, ...officeData, services };
      })
    );
    callback(offices);
  });
}

// One-time fetch
export async function fetchOffices(): Promise<(Office & { services: Service[] })[]> {
  const snapshot = await getDocs(officesRef);
  const offices = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const officeData = docSnap.data() as Office;
      const servicesSnap = await getDocs(collection(docSnap.ref, "services"));
      const services = servicesSnap.docs.map((s) => ({ id: s.id, ...s.data() }) as Service);
      return { id: docSnap.id, ...officeData, services };
    })
  );
  return offices;
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