// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// إعدادات مشروعك (ثابتة داخل الكود)
export const firebaseConfig = {
  apiKey: "AIzaSyCxL2aF00VVc9zxTtHER8T0nWzSb-UlZZo",
  authDomain: "planjaber.firebaseapp.com",
  projectId: "planjaber",
  storageBucket: "planjaber.firebasestorage.app",
  messagingSenderId: "139456427275",
  appId: "1:139456427275:web:96ec7defe5f1f1bef71e0e",
  measurementId: "G-DRPM6L1NHK",
};

// تهيئة Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Analytics على المتصفح فقط
if (typeof window !== "undefined") {
  isSupported().then((ok) => {
    if (ok) getAnalytics(app);
  });
}

// ✅ نوفر المتغيرات عالمياً ليتوافق مع أي كود قديم يعتمد عليها
window.__firebase_config = firebaseConfig;
window.__app_id = "jaber-school";
window.__firebaseApp = app;
window.__db = db;
