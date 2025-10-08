// main.jsx (في الجذر)
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App.jsx";
// احذف السطر التالي إذا ما عندك الملف
import "./src/GlobalStyles.css";

// 🔗 مجرد استيراد يضمن تهيئة Firebase وضبط المتغيرات العالمية
import "./src/firebase.js";

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
