// src/App.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

// Firebase (Modular v10)
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  reload as reloadUser,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "firebase/firestore";

/* =======================================================
   1) Helpers: Firebase config & appId
   ======================================================= */
const getFirebaseConfig = () => {
  // 1) من نافذة الصفحة ككائن جاهز
  if (
    typeof window !== "undefined" &&
    window.__firebase_config &&
    window.__firebase_config.apiKey
  ) {
    return window.__firebase_config;
  }

  // 2) من متغيرات Vite (JSON كنص)
  const raw = import.meta?.env?.VITE_FIREBASE_CONFIG;
  if (raw) {
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn("VITE_FIREBASE_CONFIG is not valid JSON.", e);
    }
  }

  // 3) احتياطي: إعدادات مشروع planjaber
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

  // 3) احتياطي (المعرف اللي أنشأناه في Firestore)
  return "9Baaxge04Smuxnsx4o5s";
};

/* =======================================================
   2) UI Components (Inline, بدون استيراد ملفات خارجية)
   ======================================================= */
const box = {
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  direction: "rtl",
  textAlign: "right",
  minHeight: "100dvh",
  background: "#f7f7f8",
  color: "#111",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const card = {
  width: "100%",
  maxWidth: 860,
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  padding: 20,
};

function LoadingScreen({ debug = "" }) {
  return (
    <div style={box}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "3px solid #e5e7eb",
              borderTopColor: "#0ea5e9",
              display: "inline-block",
              animation: "spin 1s linear infinite",
            }}
          />
          <h3 style={{ margin: 0 }}>جارٍ التحميل وتأكيد الصلاحيات…</h3>
        </div>
        {debug ? (
          <pre
            style={{
              marginTop: 12,
              background: "#0b1220",
              color: "#dbeafe",
              borderRadius: 12,
              padding: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {String(debug)}
          </pre>
        ) : null}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

function AuthScreen({ auth, onAuthSuccess }) {
  const [email, setEmail] = useState("ahuqail@gmail.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const doLogin = async (e) => {
    e?.preventDefault?.();
    setErr("");
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      onAuthSuccess?.(cred.user?.uid);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={box}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>تسجيل الدخول</h2>
        <form onSubmit={doLogin} style={{ display: "grid", gap: 12 }}>
          <label>
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
              }}
              placeholder="name@example.com"
              required
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
              }}
              placeholder="••••••••"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "10px 14px",
              border: 0,
              borderRadius: 10,
              background: "#0ea5e9",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {busy ? "جارٍ الدخول…" : "دخول"}
          </button>
          {err ? <div style={{ color: "#b91c1c" }}>❌ {err}</div> : null}
        </form>
      </div>
    </div>
  );
}

function VerificationPrompt({ auth }) {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const sendVerify = async () => {
    setErr("");
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setSent(true);
      } else {
        setErr("الرجاء تسجيل الدخول أولًا.");
      }
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  const refresh = async () => {
    try {
      if (auth.currentUser) {
        await reloadUser(auth.currentUser);
        window.location.reload();
      }
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <div style={box}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>تأكيد البريد الإلكتروني</h2>
        <p>
          تم تسجيل الدخول لكن البريد غير مُوثّق. افتح رابط التفعيل في بريدك،
          ثم اضغط "تحديث الحالة".
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={sendVerify}
            style={{
              padding: "10px 14px",
              border: 0,
              borderRadius: 10,
              background: "#0ea5e9",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            إرسال رسالة تفعيل
          </button>
          <button
            onClick={refresh}
            style={{
              padding: "10px 14px",
              border: 0,
              borderRadius: 10,
              background: "#111827",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            تحديث الحالة
          </button>
          <button
            onClick={() => signOut(auth)}
            style={{
              padding: "10px 14px",
              border: 0,
              borderRadius: 10,
              background: "#ef4444",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            تسجيل خروج
          </button>
        </div>
        {sent ? (
          <div style={{ marginTop: 10, color: "#065f46" }}>
            ✅ تم إرسال رسالة التفعيل.
          </div>
        ) : null}
        {err ? (
          <div style={{ marginTop: 10, color: "#b91c1c" }}>❌ {err}</div>
        ) : null}
      </div>
    </div>
  );
}

function Dashboard({ auth, userRole, userId }) {
  return (
    <div style={box}>
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2 style={{ margin: 0 }}>لوحة التحكم</h2>
          <button
            onClick={() => signOut(auth)}
            style={{
              padding: "8px 12px",
              border: 0,
              borderRadius: 10,
              background: "#ef4444",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            خروج
          </button>
        </div>
        <p style={{ marginTop: 0 }}>
          مرحبًا 👋 — الدور: <b>{userRole || "—"}</b> — UID:{" "}
          <code>{userId || "—"}</code>
        </p>
        <div style={{ marginTop: 12, padding: 12, background: "#f1f5f9", borderRadius: 12 }}>
          <div>✅ تم الدخول بنجاح.</div>
          <div>يمكن لاحقًا تقييد البطاقات حسب الدور.</div>
        </div>
      </div>
    </div>
  );
}

/* =======================================================
   3) App Component
   ======================================================= */
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

  // استماع مباشر لوثيقة الدور
  const subscribeToRole = useCallback(
    (uid) => {
      if (!uid) return () => {};
      const ref = doc(
        db,
        "artifacts",
        appId,
        "users",
        uid,
        "user_profile",
        "roles"
      );
      console.log("👂 listening role:", ref.path);
      return onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserRole(data?.role || null);
          } else {
            setUserRole(null);
          }
        },
        (e) => {
          console.error("role listen error:", e);
          setRoleError(e?.message || String(e));
          setUserRole(null);
        }
      );
    },
    [db, appId]
  );

  // مراقبة حالة المستخدم + الاشتراك للدور
  useEffect(() => {
    let unSubRole = () => {};
    const unSubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setIsAuthenticated(false);
          setIsEmailVerified(false);
          setUserId(null);
          setUserRole(null);
          if (unSubRole) unSubRole();
          return;
        }

        try {
          await reloadUser(user); // لتحديث حالة التفعيل
        } catch {}

        setIsAuthenticated(true);
        setIsEmailVerified(!!user.emailVerified);
        setUserId(user.uid);

        if (unSubRole) unSubRole();
        unSubRole = subscribeToRole(user.uid);
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => {
      unSubAuth();
      if (unSubRole) unSubRole();
    };
  }, [auth, subscribeToRole]);

  // عند نجاح تسجيل/تفعيل من شاشة Auth
  const handleAuthSuccess = async () => {
    // لا شيء ضروري هنا لأن onAuthStateChanged + onSnapshot يحدّثان الحالة تلقائيًا
  };

  /* =======================================================
     4) Render logic (بدون أي تجاوز مؤقت)
     ======================================================= */
  if (!isAuthReady) return <LoadingScreen />;

  if (!isAuthenticated)
    return <AuthScreen auth={auth} onAuthSuccess={handleAuthSuccess} />;

  if (!isEmailVerified) return <VerificationPrompt auth={auth} />;

  if (userRole) return <Dashboard auth={auth} userRole={userRole} userId={userId} />;

  // مستخدم موثّق لكن لم تُقرأ وثيقة الدور بعد (أو غير موجودة)
  return <LoadingScreen debug={roleError ? `roleError: ${roleError}` : ""} />;
};

export default App;
