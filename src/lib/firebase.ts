import { initializeApp } from "firebase/app";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

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

const app = configured ? initializeApp(firebaseConfig) : null;

// ignoreUndefinedProperties: عشان المنتجات اللي مفيهاش قيمة (زي oldPrice أو badge)
// متتحفظش بقيمة undefined، لأن Firestore بيرفض ويرمي خطأ صامت لو لقاها.
export const db: Firestore | null = app
  ? initializeFirestore(app, { ignoreUndefinedProperties: true })
  : null;

/** تسجيل دخول الأدمن الحقيقي — بدل الباسورد المكتوب في الكود */
export const auth: Auth | null = app ? getAuth(app) : null;

/** تخزين صور المنتجات الحقيقية (رفع من جهاز الأدمن) */
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;
