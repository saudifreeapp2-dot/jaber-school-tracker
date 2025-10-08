import React from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App.jsx";
import "./src/GlobalStyles.css";

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCxL2aF00VVc9zxTtHER8T0nWzSb-UlZZo",
  authDomain: "planjaber.firebaseapp.com",
  projectId: "planjaber",
  storageBucket: "planjaber.firebasestorage.app",
  messagingSenderId: "139456427275",
  appId: "1:139456427275:web:96ec7defe5f1f1bef71e0e",
  measurementId: "G-DRPM6L1NHK",
};

// تعيين القيم عالمياً للملفات القديمة
window.__app_id = "jaber-school";
window.__firebase_config = firebaseConfig;

let firebaseApp, db;
try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  if (typeof window !== "undefined") {
    isSupported().then((ok) => {
      if (ok) getAnalytics(firebaseApp);
    });
  }
  window.__firebaseApp = firebaseApp;
  window.__db = db;
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export { firebaseApp, db };
