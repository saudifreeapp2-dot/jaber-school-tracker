// main.jsx (في الجذر)
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App.jsx";
// احذف السطر التالي إذا ما عندك الملف
import "./src/GlobalStyles.css";

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// ================= Firebase Config (ثابت داخل الكود) =================
const firebaseConfig = {
  apiKey: "AIzaSyCxL2aF00VVc9zxTtHER8T0nWzSb-UlZZo",
  authDomain: "planjaber.firebaseapp.com",
  projectId: "planjaber",
  storageBucket: "planjaber.firebasestorage.app",
  messagingSenderId: "139456427275",
  appId: "1:139456427275:web:96ec7defe5f1f1bef71e0e",
  measurementId: "G-DRPM6L1NHK",
};

// ================= Firebase Init =================
let firebaseApp, db;
try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);

  // Analytics (يعمل فقط على المتصفح، وليس أثناء الـ build)
  if (typeof window !== "undefined") {
    isSupported().then((ok) => {
      if (ok) getAnalytics(firebaseApp);
    });
  }

  // نجعلها متاحة عالمياً عند الحاجة
  window.__firebaseApp = firebaseApp;
  window.__db = db;
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

// ================= React Mount =================
const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// exports اختيارية لو احتجتها بصفحات أخرى
export { firebaseApp, db };
