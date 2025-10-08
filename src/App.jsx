// src/App.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

// ✅ عدّل المسارات حسب مشروعك إن لزم
import LoadingScreen from "./components/LoadingScreen.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import VerificationPrompt from "./components/VerificationPrompt.jsx";
import Dashboard from "./components/Dashboard.jsx";

// Firebase v10 (Modular)
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  reload as reloadUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
} from "firebase/firestore";

// -----------------------------
// helpers: جلب الإعدادات و appId
// -----------------------------
const getFirebaseConfig = () => {
  // 1) من نافذة الصفحة (إن وُجد ككائن)
  if (typeof window !== "undefined" &&
      window.__firebase_config &&
      window.__firebase_config.apiKey) {
    return window.__firebase_config;
  }

  // 2) من متغيرات Vite (نص JSON)
  const raw = import.meta?.env?.VITE_FIREBASE_CONFIG;
  if (raw) {
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn("VITE_FIREBASE_CONFIG is not valid JSON.", e);
    }
  }

  // 3) fallback (يُنصح بتعديله لبيئتك)
  return {
    apiKey: "AIzaSyCxL2aF00VVc9zxTtHER8T0nWzSb-UlZZo",
    authDomain: "planjaber.firebaseapp.com",
    projectId: "planjaber",
    storageBucket: "planjaber.firebasestorage.app",
    messagingSenderId: "139456427275",
    appId: "1:139456427275:web:96ec7defe5f1f1bef71e0e",
    measurementId: "G-DRPM6L1NHK",
  };
};

const getAppId = () => {
  // 1) من Vite
  const envId = import.meta?.env?.VITE_APP_ID;
  if (envId) return envId;

  // 2) من نافذة الصفحة
  if (typeof window !== "undefined" && window.__app_id) return window.__app_id;

  // 3) fallback ثابت (عندك هذا المستخدم فعلاً)
  return "9Baaxge04Smuxnsx4o5s";
};

// -----------------------------
// التطبيق
// -----------------------------
const App = () => {
  const firebaseConfig = useMemo(getFirebaseConfig, []);
  const appId = useMemo(getAppId, []);

  // init Firebase مرة واحدة فقط
  const app = useMemo(() => {
    return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }, [firebaseConfig]);
  const auth = useMemo(() => getAuth(app), [app]);
  const db = useMemo(() => getFirestore(app), [app]);

  // حالات واجهة المستخدم
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [roleError, setRoleError] = useState(null);

  // جلب الدور من Firestore
  const fetchUserRole = useCallback(
    async (uid) => {
      try {
        setRoleError(null);
        if (!uid) {
          setUserRole(null);
          return;
        }
        const ref = doc(db, "artifacts", appId, "users", uid, "user_profile", "roles");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const role = data?.role || null;
          setUserRole(role);
          console.log("✅ role doc:", { path: ref.path, data });
        } else {
          setUserRole(null);
          console.warn("⚠️ role doc not found for:", uid, "at appId:", appId);
        }
      } catch (e) {
        console.error("❌ Failed to fetch role:", e);
        setRoleError(e?.message || String(e));
        setUserRole(null);
      }
    },
    [db, appId]
  );

  // مراقبة حالة المستخدم
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setIsAuthenticated(false);
          setIsEmailVerified(false);
          setUserId(null);
          setUserRole(null);
          setIsAuthReady(true);
          return;
        }

        // تحديث البريد في الجلسات القديمة
        try { await reloadUser(user); } catch {}

        setIsAuthenticated(true);
        setIsEmailVerified(!!user.emailVerified);
        setUserId(user.uid);

        // جلب الدور
        await fetchUserRole(user.uid);
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsub();
  }, [auth, fetchUserRole]);

  // عند نجاح تسجيل/تفعيل من شاشة Auth
  const handleAuthSuccess = async (uidFromAuth) => {
    const uid = uidFromAuth || auth.currentUser?.uid;
    if (uid) {
      await fetchUserRole(uid);
    }
  };

  // --------------------------------
  // مسارات العرض (بدون أخطاء الأقواس!)
  // --------------------------------
  if (!isAuthReady) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <AuthScreen auth={auth} db={db} onAuthSuccess={handleAuthSuccess} />;
  }

  if (!isEmailVerified) {
    return <VerificationPrompt auth={auth} />;
  }

  // إذا وُجد دور صحيح نعرض الداشبورد مباشرة
  if (userRole) {
    return <Dashboard auth={auth} userRole={userRole} userId={userId} />;
  }

  // 🔧 تجاوز مؤقت (للاختبار فقط): لو المستخدم موثّق وما انقرأ الدور
  // سنفتح له الداشبورد كـ "مشرف" حتى لا يعلّق على شاشة التحميل.
  if (isAuthenticated && isEmailVerified && !userRole) {
    console.warn("⚠️ لم يُكتشف الدور، سيتم تعيينه افتراضيًا كمشرف (اختبار مؤقت).");
    return <Dashboard auth={auth} userRole="مشرف" userId={userId} />;
  }

  // في الحالات النادرة (أثناء الجلب)
  return <LoadingScreen debug={roleError ? `roleError: ${roleError}` : ""} />;
};

export default App;
