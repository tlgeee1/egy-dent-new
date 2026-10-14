import { initializeApp } from "firebase/app";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig";

export { firebaseConfig };

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
