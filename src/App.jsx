// src/App.jsx

// 1) نضمن تحميل وتهيئة Firebase والمتغيرات العالمية قبل كل شيء
import "./firebase"; // يضبط window.__firebase_config و window.__app_id

import React, { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  reload, // لإعادة تحميل حالة المستخدم والتحقق من تفعيل البريد
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// أيقونات
import {
  LayoutDashboard,
  UserPlus,
  Send,
  AlertTriangle,
  Scale,
  BarChart3,
  TrendingUp,
  Bell,
  MailCheck,
} from "lucide-react";

/* ================================
   قراءة القيم من المتغيرات العالمية
   ================================ */

// نقرأ appId من window أو نعطي قيمة افتراضية
const appId =
  typeof window !== "undefined" && window.__app_id
    ? window.__app_id
    : "jaber-school";

// نقرأ firebaseConfig كـ "كائن" جاهز وليس JSON-string
const firebaseConfig =
  typeof window !== "undefined" &&
  window.__firebase_config &&
  typeof window.__firebase_config === "object" &&
  window.__firebase_config.apiKey
    ? window.__firebase_config
    : null;

/* ================================
   ثوابت الأدوار
   ================================ */
const ROLES = {
  مدير: "مدير",
  وكيل: "وكيل",
  موجه_طلابي: "موجه طلابي",
  مشرف: "مشرف",
};

/* ================================
   مكوّنات مساعدة
   ================================ */

// شاشة تحميل
const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-700">
    <svg
      className="animate-spin h-10 w-10 text-teal-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <p className="mt-4 text-lg">جارٍ التحميل وتأكيد الصلاحيات...</p>
  </div>
);

// شاشة انتظار التحقق من البريد
const VerificationPrompt = ({ auth }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "يرجى التحقق من بريدك الإلكتروني والضغط على رابط التفعيل لإكمال التسجيل."
  );

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    setMessage("جارٍ إعادة إرسال البريد...");
    try {
      await sendEmailVerification(user);
      setMessage("تم إعادة إرسال بريد التحقق بنجاح. تحقق من صندوق الوارد أو المهملات.");
    } catch (error) {
      console.error("Error resending verification email:", error);
      setMessage("فشل إعادة إرسال البريد. حاول مرة أخرى لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    setMessage("جارٍ تحديث حالة التحقق...");
    try {
      await reload(user);
      const updatedUser = auth.currentUser;
      if (updatedUser?.emailVerified) {
        window.location.reload();
      } else {
        setMessage("لم يتم التحقق بعد. تأكد من النقر على الرابط في بريدك، ثم انقر على تحديث.");
      }
    } catch (error) {
      console.error("Error reloading user:", error);
      setMessage("فشل تحديث الحالة. قد تحتاج لتسجيل الخروج والدخول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-yellow-50" dir="rtl">
      <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-yellow-500">
        <h2 className="text-2xl font-bold text-center mb-4 text-yellow-800 flex items-center justify-center">
          <MailCheck className="h-6 w-6 ml-2" />
          تحقق من بريدك الإلكتروني
        </h2>
        <p className="text-center text-gray-600 mb-6 text-base">{message}</p>
        <div className="space-y-4">
          <button
            onClick={handleReload}
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition duration-300 disabled:opacity-50"
          >
            تم التحقق؟ انقر للتحديث
          </button>
          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition duration-300 disabled:opacity-50"
          >
            إعادة إرسال بريد التحقق
          </button>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition duration-300"
          >
            تسجيل الخروج
          </button>
        </div>
        <p className="mt-4 text-xs text-gray-500 text-center">
          <span className="font-semibold">البريد الإلكتروني:</span> {auth.currentUser?.email}
        </p>
      </div>
    </div>
  );
};

// شاشة المصادقة
const AuthScreen = ({ auth, db, onAuthSuccess }) => {
  const [view, setView] = useState("login"); // 'login' or 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuthenticate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (view === "register") {
        if (!selectedRole) {
          setError("الرجاء اختيار الدور أولاً.");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);

        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_profile/roles`);
        await setDoc(userProfileRef, {
          role: selectedRole,
          email: email,
          registeredAt: new Date().toISOString(),
        });

        onAuthSuccess(user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onAuthSuccess(user);
      }
    } catch (err) {
      console.error("Auth Error:", err);
      let errorMessage = "حدث خطأ غير معروف.";
      if (err.code === "auth/email-already-in-use") errorMessage = "البريد الإلكتروني مُسجل بالفعل.";
      else if (err.code === "auth/invalid-email") errorMessage = "تنسيق البريد الإلكتروني غير صحيح.";
      else if (err.code === "auth/weak-password") errorMessage = "كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل.";
      else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential")
        errorMessage = "بيانات الدخول غير صحيحة.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isRegisterView = view === "register";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100" dir="rtl">
      <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-lg border-t-8 border-teal-600">
        <h1 className="text-4xl font-extrabold text-center mb-2 text-teal-800">
          مدرسة جابر بن عبدالله الابتدائية
        </h1>
        <p className="text-center text-xl text-gray-600 font-medium border-b pb-4 mb-6">
          نظام متابعة ومعالجة ملاحظات مشرف الإدارة المدرسية
        </p>

        <h2 className="text-3xl font-bold text-center mb-6 text-teال-800 flex items-center justify-center">
          {isRegisterView ? <UserPlus className="h-7 w-7 ml-2" /> : <LayoutDashboard className="h-7 w-7 ml-2" />}
          {isRegisterView ? "تسجيل حساب جديد" : "تسجيل الدخول"}
        </h2>
        <p className="text-center text-gray-600 mb-8">
          {isRegisterView ? "الرجاء إدخال بياناتك واختيار دورك." : "مرحبًا بك! يرجى تسجيل الدخول للمتابعة."}
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleAuthenticate} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
          />

          {isRegisterView && (
            <>
              <p className="text-gray-700 font-semibold mt-6">اختر دورك (يُسجل لمرة واحدة فقط):</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Object.values(ROLES).map((role) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`p-3 rounded-lg text-sm font-semibold transition duration-300 ${
                      selectedRole === role
                        ? "bg-teal-600 text-white shadow-md shadow-teal-300"
                        : "bg-gray-100 text-gray-700 hover:bg-teal-50 hover:border-teal-400 border border-gray-200"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || (isRegisterView && !selectedRole)}
            className="w-full bg-teal-700 text-white py-3 rounded-xl text-xl font-bold hover:bg-teal-800 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 ml-3 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                جارٍ {isRegisterView ? "التسجيل..." : "الدخول..."}
              </>
            ) : isRegisterView ? (
              "تسجيل الحساب وإرسال بريد التحقق"
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          {isRegisterView ? "هل لديك حساب بالفعل؟ " : "ليس لديك حساب؟ "}
          <button
            type="button"
            onClick={() => {
              setView(isRegisterView ? "login" : "register");
              setError("");
              setSelectedRole(null);
            }}
            className="text-teal-600 font-semibold hover:text-teal-800"
          >
            {isRegisterView ? "تسجيل الدخول" : "تسجيل جديد"}
          </button>
        </p>
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">معرف التطبيق: {appId}</p>
    </div>
  );
};

// لوحة التحكم
const Dashboard = ({ auth, userRole, userId }) => {
  const handleSignOut = async () => {
    if (auth) await signOut(auth);
  };

  const cards = [
    { title: "عدم تثبيت الغياب", description: "متابعة يومية لإدخال الغياب من وكيل شؤون الطلاب.", href: "#absenteeism", icon: Send, roles: [ROLES.وكيل, ROLES.مدير] },
    { title: "رصد حضور 100%", description: "توثيق الحالات التي يتم فيها تسجيل حضور 100% وإشعار المدير.", href: "#100-attendance", icon: AlertTriangle, roles: [ROLES.وكيل, ROLES.مدير] },
    { title: "المشكلات السلوكية", description: "متابعة يومية لعدد المشكلات السلوكية والإجراءات المتخذة.", href: "#behavioral-issues", icon: Scale, roles: [ROLES.موجه_طلابي, ROLES.مدير] },
    { title: "الفجوة", description: "عرض إيجابية الفجوة وخطط التحسين الجارية.", href: "#gap", icon: LayoutDashboard, roles: [ROLES.مدير] },
    { title: "نتائج المدرسة", description: "متابعة تحسن نتائج اختبارات نافس للصف السادس.", href: "#school-results", icon: BarChart3, roles: [ROLES.مدير] },
    { title: "خطة التحسين", description: "متابعة نسبة إنجاز المهام في خطة التهيئة والانطلاق.", href: "#improvement-plan", icon: TrendingUp, roles: [ROLES.مدير] },
    { title: "نسبة الإتقان", description: "متابعة نسبة الطلاب المتقنين والخطط العلاجية الجماعية.", href: "#proficiency-rate", icon: Bell, roles: [ROLES.مدير] },
    { title: "البلاغات", description: "تسجيل وتتبع البلاغات المرفوعة (مفتوحة/مغلقة).", href: "#reports", icon: Send, roles: [ROLES.مدير] },
  ];

  const filteredCards = cards;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-teal-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">نظام متابعة ملاحظات جابر بن عبدالله</h1>
          <div className="text-left text-sm flex items-center space-x-4 space-x-reverse">
            <div className="hidden sm:block">
              <p className="font-semibold">مرحباً بك، {userRole}</p>
              <p className="text-gray-200 truncate max-w-[200px]" title={userId}>
                معرف المستخدم: <span className="font-mono">{(userId || "").substring(0, 8)}...</span>
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-1 px-3 rounded-full transition duration-200"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-r-4 border-teal-500">
          <h2 className="text-xl font-bold text-teal-800">الأدوار والمسؤوليات:</h2>
          <p className="text-gray-600 mt-2">
            يمكنك الوصول إلى مهام المتابعة الخاصة بك من خلال البطاقات أدناه. دورك الحالي هو:{" "}
            <span className="font-extrabold text-teal-600">{userRole}</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card, index) => (
            <a
              key={index}
              href={card.href}
              className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-teal-600 hover:shadow-2xl hover:border-b-4 transition duration-300 flex flex-col items-start space-y-3"
            >
              <card.icon className="h-8 w-8 text-teal-600" />
              <h3 className="text-xl font-bold text-gray-800">{card.title}</h3>
              <p className="text-gray-500 text-sm">{card.description}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
};

/* ================================
   المكوّن الرئيسي
   ================================ */
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [error, setError] = useState(null);

  // 1) تهيئة Firebase
  useEffect(() => {
    if (!firebaseConfig) {
      setError("Firebase configuration is missing.");
      setIsAuthReady(true);
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthenticated(true);
          setIsEmailVerified(user.emailVerified);
        } else {
          setUserId(null);
          setIsAuthenticated(false);
          setIsEmailVerified(false);
          setUserRole(null);
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setError("فشل تهيئة Firebase. يرجى التحقق من الإعدادات.");
      setIsAuthReady(true);
    }
  }, []);

  // 2) جلب دور المستخدم
  useEffect(() => {
    if (!db || !userId || !isEmailVerified) {
      setUserRole(null);
      return;
    }

    const checkUserRole = async () => {
      try {
        const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/user_profile/roles`);
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
        } else {
          console.warn("User verified, but role not found in Firestore.");
          setUserRole(null);
        }
      } catch (e) {
        console.error("Error fetching user role:", e);
        setUserRole(null);
      }
    };

    checkUserRole();
  }, [db, userId, isEmailVerified]);

  const handleAuthSuccess = useCallback((user) => {
    setUserId(user.uid);
    setIsAuthenticated(true);
    setIsEmailVerified(user.emailVerified);
  }, []);

  // عرض مشروط
  if (error) {
    return (
      <div className="p-10 text-center bg-red-50 text-red-800 rounded-lg m-4" dir="rtl">
        خطأ في النظام: {error}
      </div>
    );
  }

  if (!isAuthReady) return <LoadingScreen />;

  if (!isAuthenticated && auth && db) {
    return <AuthScreen auth={auth} db={db} onAuthSuccess={handleAuthSuccess} />;
  }

  if (isAuthenticated && !isEmailVerified && auth) {
    return <VerificationPrompt auth={auth} />;
  }

  if (userRole) {
    return <Dashboard auth={auth} userRole={userRole} userId={userId} />;
  }

  if (isAuthenticated && isEmailVerified && !userRole) return <LoadingScreen />;

  return <LoadingScreen />;
};

export default App;
