import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

type AuthCallback = (user: User | null) => void;

const listeners: AuthCallback[] = [];

export function onAuthChange(callback: AuthCallback): () => void {
  listeners.push(callback);
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    listeners.forEach((cb) => cb(user));
  });
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
    unsubscribe();
  };
}

export async function login(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
