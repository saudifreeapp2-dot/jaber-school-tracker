// main.jsx (في الجذر)
import React from "react";
import { createRoot } from "react-dom/client";

// واجهتك الرئيسية داخل src
import App from "./src/App.jsx";
// إن كان لديك ملف أنماط عام داخل src فعّل السطر التالي (أو احذفه إن ما عندك الملف)
import "./src/GlobalStyles.css";

// ====== قراءة متغيرات البيئة من Vite ======
// ضع في Netlify:
// VITE_APP_ID = jaber-school
// VITE_FIREBASE_CONFIG = (JSON الكامل لإعدادات Firebase في سطر واحد)
const appId = import.meta.env.VITE_APP_ID;
const firebaseConfigRaw = import.meta.env.VITE_FIREBASE_CONFIG;

// نحاول فك JSON بأمان
let firebaseConfig = null;
try {
  if (firebaseConfigRaw && typeof firebaseConfigRaw === "string") {
    firebaseConfig = JSON.parse(firebaseConfigRaw);
  }
} catch (e) {
  console.error("Failed to parse VITE_FIREBASE_CONFIG. Make sure it's valid JSON.", e);
}

// نجعل القيم متاحة عالمياً لو كان فيه كود قديم يعتمد على متغيرات عامة:
window.__app_id = appId;
window.__firebase_config = firebaseConfig;

// ====== تهيئة Firebase (اختياري لكن عملي) ======
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

let firebaseApp = null;
let db = null;

if (firebaseConfig) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);

    // نعرضها عالمياً إذا احتجتها في ملفات أخرى بسرعة
    window.__firebaseApp = firebaseApp;
    window.__db = db;
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
}

// ====== تركيب React ======
const rootEl = document.getElementById("root");

// إذا كانت الإعدادات ناقصة، نعرض رسالة ودية بدل ما ينهار التطبيق
const MissingConfig = () => (
  <div style={{ fontFamily: "system-ui, Tahoma", padding: 24, lineHeight: 1.8 }}>
    <h2 style={{ marginTop: 0 }}>خطأ في الإعدادات</h2>
    <p>لا توجد إعدادات Firebase صالحة.</p>
    <p>
      رجاءً أضف المتغيرات الآتية في Netlify &rarr; <b>Environment variables</b> ثم أعد النشر:
    </p>
    <ul>
      <li><code>VITE_APP_ID</code> = <code>jaber-school</code> (أو الاسم الذي تريده)</li>
      <li>
        <code>VITE_FIREBASE_CONFIG</code> = كائن JSON كامل لإعدادات Firebase (في سطر واحد)
      </li>
    </ul>
    <p style={{ direction: "ltr", background: "#f6f8fa", padding: "8px 12px", borderRadius: 8 }}>
      {"{\"apiKey\":\"...\",\"authDomain\":\"...\",\"projectId\":\"...\",\"storageBucket\":\"...\",\"messagingSenderId\":\"...\",\"appId\":\"...\"}"}
    </p>
  </div>
);

createRoot(rootEl).render(
  <React.StrictMode>
    {firebaseConfig ? <App /> : <MissingConfig />}
  </React.StrictMode>
);

export { firebaseApp, db };
