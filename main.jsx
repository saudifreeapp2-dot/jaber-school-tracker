// main.jsx (في الجذر)
import React from "react";
import { createRoot } from "react-dom/client";

// استورد التطبيق الفعلي من داخل src
import App from "./src/App.jsx";

// (اختياري) إن كان لديك ملف تنسيقات عام داخل src
// فعّل السطر التالي إذا كان موجودًا بالفعل:
import "./src/GlobalStyles.css";

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
