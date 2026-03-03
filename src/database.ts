import {
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';

const RAFFLE_DOC = doc(db, 'raffles', 'current');
const CONFIG_DOC = doc(db, 'raffles', 'config');

export interface BuyerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  amountPaid: number;
}

export interface RaffleData {
  takenNumbers: Record<string, boolean>;
  buyers?: Record<string, BuyerInfo>;
}

export interface RaffleConfig {
  prizeAmount: number;    // e.g. 800000
  ticketPrice: number;    // e.g. 20000
  ticketCostForUs: number; // organizer's cost per ticket (e.g. lottery ticket cost)
  totalTickets: number;   // default 100
  drawDate: string;       // ISO "2026-06-02"
}

const DEFAULT_CONFIG: RaffleConfig = {
  prizeAmount: 800000,
  ticketPrice: 20000,
  ticketCostForUs: 0,
  totalTickets: 100,
  drawDate: '2026-06-02',
};

type ConfigCallback = (config: RaffleConfig) => void;

/** Subscribe to real-time raffle config changes */
export function subscribeToConfig(callback: ConfigCallback): () => void {
  return onSnapshot(CONFIG_DOC, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        prizeAmount: data.prizeAmount ?? DEFAULT_CONFIG.prizeAmount,
        ticketPrice: data.ticketPrice ?? DEFAULT_CONFIG.ticketPrice,
        ticketCostForUs: data.ticketCostForUs ?? DEFAULT_CONFIG.ticketCostForUs,
        totalTickets: data.totalTickets ?? DEFAULT_CONFIG.totalTickets,
        drawDate: data.drawDate ?? DEFAULT_CONFIG.drawDate,
      });
    } else {
      // Initialize config doc with defaults
      setDoc(CONFIG_DOC, DEFAULT_CONFIG);
      callback(DEFAULT_CONFIG);
    }
  });
}

type RaffleCallback = (data: RaffleData) => void;

/** Subscribe to real-time raffle data changes */
export function subscribeToRaffle(callback: RaffleCallback): () => void {
  return onSnapshot(RAFFLE_DOC, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as RaffleData);
    } else {
      // Initialize the document if it doesn't exist
      const initial: RaffleData = { takenNumbers: {} };
      setDoc(RAFFLE_DOC, initial);
      callback(initial);
    }
  });
}

/** Toggle a number's taken status (atomic field-level update).
 *  When releasing a number, also deletes the buyer info for that number. */
export async function toggleNumber(num: number): Promise<boolean> {
  const snapshot = await getDoc(RAFFLE_DOC);
  const data = (snapshot.data() as RaffleData) || { takenNumbers: {} };
  const key = num.toString().padStart(2, '0');
  const currentlyTaken = data.takenNumbers[key] === true;
  const newValue = !currentlyTaken;

  // Use updateDoc with dot-notation field path to only touch THIS number's key.
  // This avoids spreading the entire takenNumbers map and prevents race conditions.
  const update: Record<string, unknown> = { [`takenNumbers.${key}`]: newValue };

  // When releasing a number, atomically remove buyer info too
  if (!newValue) {
    update[`buyers.${key}`] = deleteField();
  }

  await updateDoc(RAFFLE_DOC, update);
  return newValue;
}

/** Save buyer info for a specific number (atomic dot-notation write) */
export async function saveBuyerInfo(num: number, buyer: BuyerInfo): Promise<void> {
  const key = num.toString().padStart(2, '0');
  await updateDoc(RAFFLE_DOC, {
    [`buyers.${key}.firstName`]: buyer.firstName,
    [`buyers.${key}.lastName`]: buyer.lastName,
    [`buyers.${key}.phone`]: buyer.phone,
    [`buyers.${key}.amountPaid`]: buyer.amountPaid,
  });
}

/** Update any raffle config fields */
export async function updateRaffleConfig(fields: Partial<RaffleConfig>): Promise<void> {
  await updateDoc(CONFIG_DOC, fields as Record<string, unknown>);
}

/** Get current taken numbers */
export async function getTakenNumbers(): Promise<Set<number>> {
  const snapshot = await getDoc(RAFFLE_DOC);
  if (!snapshot.exists()) return new Set();
  const data = snapshot.data() as RaffleData;
  const taken = new Set<number>();
  for (const [key, value] of Object.entries(data.takenNumbers)) {
    if (value) taken.add(parseInt(key, 10));
  }
  return taken;
}
