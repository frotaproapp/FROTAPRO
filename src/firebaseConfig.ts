
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

// Helper to safely get environment variables across different runtimes (Vite, Node, etc.)
const getEnv = (key: string): string => {
  try {
    // Check Vite's import.meta.env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || '';
    }
  } catch (e) {}
  
  try {
    // Check standard process.env
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch (e) {}
  
  return '';
};

// Configurações do Firebase (usando helper seguro para variáveis Vercel/Vite/Process)
const firebaseConfig = {
  apiKey: getEnv('VITE_API_KEY'),
  authDomain: getEnv('VITE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_PROJECT_ID'),
  storageBucket: getEnv('VITE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_APP_ID'),
  measurementId: getEnv('VITE_MEASUREMENT_ID'),
};

// Inicializa o app (Singleton Pattern para evitar inicialização duplicada)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicializa compat app para Auth
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporta os serviços
export const db = getFirestore(app); 
export const database = getDatabase(app); 
export const auth = firebase.auth(); // Compat Auth instance

export default app;
