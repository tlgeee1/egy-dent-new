import { initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

/** ⚙️ إعدادات Firebase — مشروع egy-dent-store */
const firebaseConfig = {
  apiKey: "AIzaSyAIa2DzWIpc1CRXLjiYjVnYv-P0EskDXcg",
  authDomain: "egy-dent-store.firebaseapp.com",
  databaseURL: "https://egy-dent-store-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "egy-dent-store",
  storageBucket: "egy-dent-store.firebasestorage.app",
  messagingSenderId: "829834524174",
  appId: "1:829834524174:web:2362fb9d9d69cb44776e5f",
  measurementId: "G-C0FRN9599K",
};

/**
 * لو الكود لسه متحطش — الموقع يشتغل محلي على المتصفح (وضع العرض).
 * أول ما الكود يتحط — كل المنتجات والطلبات تتزامن لايف على كل الأجهزة.
 */
const configured = !firebaseConfig.apiKey.startsWith("PASTE");

export const firebaseReady = configured;
export const db: Firestore | null = configured ? getFirestore(initializeApp(firebaseConfig)) : null;
