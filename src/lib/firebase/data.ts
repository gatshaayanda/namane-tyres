"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export const REQUEST_STATUSES = ["New", "Accepted", "In Progress", "Ready / Awaiting Customer", "Complete", "Cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type AssistanceRequest = {
  id: string; createdAt: string; name: string; phone: string; vehicle: string; problem: string; notes: string; locationText: string;
  latitude?: number; longitude?: number; locationAccuracy?: number; status: RequestStatus;
};

export type TyreInventoryItem = {
  id: string; size: string; brand: string; condition: "New" | "Used" | "Retreaded" | "Other";
  quantity: number; price: string; available: boolean; notes: string;
};

const requestsCollection = collection(db, "assistanceRequests");
const inventoryCollection = collection(db, "tyreInventory");

export async function createAssistanceRequest(data: Omit<AssistanceRequest, "id">) {
  return (await addDoc(requestsCollection, data)).id;
}
export async function getAssistanceRequests(): Promise<AssistanceRequest[]> {
  const snapshot = await getDocs(requestsCollection);
  return snapshot.docs.map(item => ({ id: item.id, ...(item.data() as Omit<AssistanceRequest, "id">) }));
}
export async function updateAssistanceStatus(id: string, status: RequestStatus) {
  await updateDoc(doc(db, "assistanceRequests", id), { status });
}
export async function getTyreInventory(): Promise<TyreInventoryItem[]> {
  const snapshot = await getDocs(inventoryCollection);
  return snapshot.docs.map(item => ({ id: item.id, ...(item.data() as Omit<TyreInventoryItem, "id">) }));
}
export async function saveTyreInventoryItem(item: TyreInventoryItem) {
  await setDoc(doc(db, "tyreInventory", item.id), item);
}
export async function deleteTyreInventoryItem(id: string) {
  await deleteDoc(doc(db, "tyreInventory", id));
}
