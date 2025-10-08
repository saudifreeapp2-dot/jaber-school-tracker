// main.jsx (في الجذر)
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App.jsx";
import "./src/GlobalStyles.css";

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 1) نقرأ من بيئة Vite
const appId = import.meta.env?.VITE_APP_ID;
const firebaseConfigRaw = import.meta.env?.VITE_FIREBASE_CONFIG;

// 2) إن ما وصلت القيم من البيئة، نستخدم Fallback (عدّلها لقيمك)
const FALLBACK_CONFIG = {
  apiKey: "AIzaSyCxL2aF00VVc9zxTtHER8T0nWzSb-UlZZo",
  authDomain: "planjaber.firebaseapp.com",
  projectId: "planjaber",
  storageBucket: "planjaber.firebasestorage.app",
  messagingSenderId: "139456427275",
  appId: "1:139456427275:web:96ec7defe5f1f1bef71e0e",
  measurementId: "G-DRPM6L1NHK",
};
const FALLBACK_APP_ID = "jaber-school";

// 3) نحاول تفكيك JSON القادم من البيئة
let firebaseConfig = null;
try {
  if (firebaseConfigRaw && typeof firebaseConfigRaw === "string") {
    firebaseConfig = JSON.parse(firebaseConfigRaw);
  }
} catch (e) {
  console.error("Failed to parse VITE_FIREBASE_CONFIG JSON:", e);
}

// 4) اختيار النهائي: البيئة > fallback
const finalAppId = appId || FALLBACK_APP_ID;
const finalConfig = firebaseConfig || FALLBACK_CONFIG;

// نشرها عالميًا لو في ملفات تعتمد عليها
window.__app_id = finalAppId;
window.__firebase_config = finalConfig;

// 5) تهيئة Firebase
let firebaseApp = null;
let db = null;
try {
  firebaseApp = initializeApp(finalConfig);
  db = getFirestore(firebaseApp);
  window.__firebaseApp = firebaseApp;
  window.__db = db;
} catch (e) {
  console.error("Firebase init failed:", e);
}

// واجهة تنبيه إن كانت القيم ناقصة (بعد fallback المفروض تمشي)
const rootEl = document.getElementById("root");
const MissingConfig = () => (
  <div style={{ fontFamily: "system-ui, Tahoma", padding: 24, lineHeight: 1.8 }}>
    <h2 style={{ marginTop: 0 }}>خطأ في الإعدادات</h2>
    <p>لا توجد إعدادات Firebase صالحة.</p>
    <p>تأكد من ضبط المتغيرات في Netlify ثم احذف Fallback من <b>main.jsx</b>.</p>
    <ul>
      <li><code>VITE_APP_ID</code> = jaber-school</li>
      <li><code>VITE_FIREBASE_CONFIG</code> = JSON كامل في سطر واحد</li>
    </ul>
  </div>
);

const hasValidConfig = !!finalConfig?.apiKey && !!finalConfig?.projectId;
createRoot(rootEl).render(
  <React.StrictMode>
    {hasValidConfig ? <App /> : <MissingConfig />}
  </React.StrictMode>
);

export { firebaseApp, db };
