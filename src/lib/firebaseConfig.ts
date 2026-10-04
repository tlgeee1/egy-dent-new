/** ⚙️ إعدادات Firebase — مشروع egy-dent-store
 *  ملف خفيف بالبيانات بس، من غير أي مكتبات Firebase حقيقية،
 *  عشان يصلح يتستخدم من المتصفح (src/lib/firebase.ts) ومن السيرفر (api/chat.ts) مع بعض
 *  من غير ما السيرفر يسحب معاه مكتبات متصفح زي firebase/auth أو firebase/storage. */
export const firebaseConfig = {
  apiKey: "AIzaSyAIa2DzWIpc1CRXLjiYjVnYv-P0EskDXcg",
  authDomain: "egy-dent-store.firebaseapp.com",
  databaseURL: "https://egy-dent-store-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "egy-dent-store",
  storageBucket: "egy-dent-store.firebasestorage.app",
  messagingSenderId: "829834524174",
  appId: "1:829834524174:web:2362fb9d9d69cb44776e5f",
  measurementId: "G-C0FRN9599K",
};
