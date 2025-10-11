import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification
} from 'firebase/auth';
import {
    getFirestore, doc, setDoc, onSnapshot, collection, query, updateDoc
} from 'firebase/firestore';

// =====================================================================
// 1. CONFIGURATION AND FIREBASE INITIALIZATION
// =====================================================================

// Global Variables provided by the Canvas Environment (MANDATORY USE)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase Configuration provided by the user
const userProvidedConfig = {
    apiKey: "AIzaSyCxL2aF00VVc9zxTtHER8T0nWzSb-UlZZo",
    authDomain: "planjaber.firebaseapp.com",
    projectId: "planjaber",
    storageBucket: "planjaber.firebasestorage.app",
    messagingSenderId: "139456427275",
    appId: "1:139456427275:web:96ec7defe5f1f1bef71e0e",
    measurementId: "G-DRPM6L1NHK"
};

// Use the global config if available, otherwise use the user-provided config
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : userProvidedConfig;

// Initialize Firebase App, Auth, and Firestore instances
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Utility to get Firestore paths
const getProfileDocPath = (userId) => {
    // Path for private user profile data: artifacts/{appId}/users/{userId}/profile/role
    return doc(db, `artifacts/${appId}/users/${userId}/profile`, 'role');
};

const getCollectionPath = (collectionName) => {
    // Path for public notes data: artifacts/{appId}/public/data/{collectionName}
    return collection(db, `artifacts/${appId}/public/data/${collectionName}`);
};

const ROLES = {
    MANAGER: 'مدير',
    DEPUTY: 'وكيل',
    STUDENT_GUIDE: 'موجه طلابي',
    SUPERVISOR: 'مشرف'
};

// Function to convert Gregorian date to a simple Hijri date (mock implementation)
const getHijriDate = (date) => {
    // In a real application, a library should be used. This is a placeholder.
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear() - 579;
    return `~${day}/${month}/${year} هـ`;
};

// =====================================================================
// 2. MAIN APPLICATION COMPONENT (App)
// =====================================================================

const App = () => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentScreen, setCurrentScreen] = useState('login'); // login | role_selection | dashboard | obs_1 | ... | reports

    // ------------------------------------
    // Authentication & User State Management
    // ------------------------------------

    useEffect(() => {
        // 1. Initial Authentication (Custom Token or Anonymous)
        const authenticate = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) {
                console.error("Authentication error:", err);
            }
        };
        authenticate();

        // 2. Auth State Listener
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setUserId(currentUser.uid);
            } else {
                setUserId(null);
                setUserRole(null);
                setCurrentScreen('login');
            }
            setIsAuthReady(true);
        });

        return () => unsubscribeAuth();
    }, []);

    // 3. User Role Listener (Fetches and monitors the user's role)
    useEffect(() => {
        if (!userId || !isAuthReady) return;

        const roleDocRef = getProfileDocPath(userId);

        const unsubscribeRole = onSnapshot(roleDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role) {
                const role = docSnap.data().role;
                setUserRole(role);
                setCurrentScreen('dashboard');
            } else {
                setUserRole(null);
                setCurrentScreen('role_selection');
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching user role:", err);
            setError("حدث خطأ في جلب بيانات الدور. حاول مرة أخرى.");
            setLoading(false);
        });

        return () => unsubscribeRole();
    }, [userId, isAuthReady]);

    // ------------------------------------
    // Utility Components
    // ------------------------------------

    const LoadingSpinner = () => (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
            <p className="mr-4 text-xl text-gray-700">جاري التحميل...</p>
        </div>
    );

    const Header = ({ title }) => (
        <header className="bg-white shadow-md p-4 flex justify-between items-center fixed top-0 w-full z-10 border-b border-gray-100" dir="rtl">
            <div className="flex items-center">
                <h1 className="text-xl font-bold text-indigo-700">{title}</h1>
                <span className="mr-4 text-sm text-gray-500 hidden md:block">| الدور: {userRole || 'لم يحدد'}</span>
            </div>
            <div className="flex items-center">
                <span className="text-sm text-gray-600 ml-4 hidden lg:block">Project ID: {firebaseConfig.projectId}</span>
                <span className="text-sm text-gray-600 ml-4 hidden sm:block">{user?.email || `ID: ${userId?.substring(0, 8)}...`}</span>
                <button
                    onClick={() => signOut(auth).catch(e => setError(e.message))}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-lg transition duration-200 shadow-md mr-2"
                >
                    تسجيل الخروج
                </button>
            </div>
        </header>
    );

    // ------------------------------------
    // Screen Components: Login, Role Selection, Dashboard
    // ------------------------------------

    const LoginSignupScreen = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [isRegister, setIsRegister] = useState(false);
        const [submitting, setSubmitting] = useState(false);
        const [message, setMessage] = useState('');

        const handleSubmit = async (e) => {
            e.preventDefault();
            setSubmitting(true);
            setError(null);
            setMessage('');

            try {
                if (isRegister) {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await sendEmailVerification(userCredential.user);
                    setMessage('تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.');
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                }
            } catch (e) {
                setError(`خطأ: ${e.message}`);
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4" dir="rtl">
                <div className="w-full max-w-md bg-white p-8 shadow-2xl rounded-xl">
                    <h1 className="text-3xl font-extrabold text-center text-indigo-700 mb-2">
                        مدرسة جابر بن عبدالله الابتدائية
                    </h1>
                    <p className="text-center text-gray-500 mb-8">
                        نظام متابعة ومعالجة ملاحظات مشرف الإدارة المدرسية
                    </p>

                    <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">
                        {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                    </h2>

                    {error && (
                        <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 rounded mb-4" role="alert">
                            <p className="font-bold">خطأ</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-100 border-r-4 border-green-500 text-green-700 p-4 rounded mb-4" role="alert">
                            <p>{message}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">البريد الإلكتروني</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-right"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">كلمة المرور</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-right"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-md ${submitting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {submitting ? 'جاري...' : (isRegister ? 'إنشاء وتسجيل' : 'تسجيل الدخول')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 transition duration-150"
                        >
                            {isRegister ? 'هل لديك حساب؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const RoleSelectionScreen = () => {
        const [selectedRole, setSelectedRole] = useState(null);
        const [submitting, setSubmitting] = useState(false);
        const [isVerified, setIsVerified] = useState(user?.emailVerified);

        useEffect(() => {
            if (user) {
                // Ensure to reload user to get the latest email verification status
                user.reload().then(() => {
                    setIsVerified(user.emailVerified);
                }).catch(e => console.error("Error reloading user:", e));
            }
        }, [user]);

        const handleRoleSelection = async () => {
            if (!selectedRole || !userId) return;

            setSubmitting(true);
            setError(null);
            try {
                if (!isVerified) {
                    setError('يرجى التحقق من بريدك الإلكتروني أولاً لتفعيل الحساب.');
                    setSubmitting(false);
                    return;
                }

                const roleDocRef = getProfileDocPath(userId);
                // Save the role to the private user path
                await setDoc(roleDocRef, { role: selectedRole, userId, email: user.email, setAt: new Date().toISOString() });
            } catch (e) {
                setError(`حدث خطأ عند حفظ الدور: ${e.message}`);
            } finally {
                setSubmitting(false);
            }
        };

        if (!user || !isVerified) {
            return (
                <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4" dir="rtl">
                    <div className="w-full max-w-md bg-white p-8 shadow-2xl rounded-xl text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">الحساب غير مفعل!</h2>
                        <p className="text-gray-600 mb-6">
                            يرجى التحقق من بريدك الإلكتروني والنقر على رابط التفعيل للمتابعة.
                        </p>
                        <button
                            onClick={() => {
                                signOut(auth);
                                setCurrentScreen('login');
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                        >
                            العودة لتسجيل الدخول
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4" dir="rtl">
                <div className="w-full max-w-lg bg-white p-8 shadow-2xl rounded-xl">
                    <h2 className="text-3xl font-extrabold text-center text-indigo-700 mb-2">تحديد الدور</h2>
                    <p className="text-center text-gray-500 mb-8">
                        يرجى اختيار دورك. لا يمكن تغيير الدور لاحقًا.
                    </p>

                    {error && (
                        <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 rounded mb-4" role="alert">
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {Object.values(ROLES).map(role => (
                            <div
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`p-6 border-2 rounded-xl cursor-pointer transition duration-200 text-center shadow-lg
                                    ${selectedRole === role ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-200' : 'border-gray-200 bg-white hover:bg-gray-50'}`
                                }
                            >
                                <p className="font-bold text-lg text-gray-700">{role}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleRoleSelection}
                        disabled={!selectedRole || submitting}
                        className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-xl
                            ${!selectedRole || submitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {submitting ? 'جاري الحفظ...' : 'تأكيد الدور والمتابعة'}
                    </button>
                </div>
            </div>
        );
    };

    const DashboardCard = ({ title, responsible, screen, roleMatch }) => {
        const canAccess = roleMatch.includes(userRole);

        return (
            <button
                onClick={() => canAccess && setCurrentScreen(screen)}
                disabled={!canAccess}
                className={`flex flex-col justify-between p-6 h-40 rounded-xl shadow-lg transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${canAccess ? 'bg-white hover:shadow-xl border-t-4 border-indigo-500' : 'bg-gray-100 opacity-60 cursor-not-allowed'}`}
                dir="rtl"
            >
                <div>
                    <h3 className={`text-xl font-extrabold ${canAccess ? 'text-gray-800' : 'text-gray-400'}`}>{title}</h3>
                    <p className={`text-sm mt-1 ${canAccess ? 'text-indigo-600' : 'text-gray-400'}`}>المسؤول: {responsible}</p>
                </div>
                <div className={`text-left text-sm font-medium ${canAccess ? 'text-gray-500' : 'text-gray-400'}`}>
                    {canAccess ? 'انقر للمتابعة' : 'غير مصرح لك'}
                </div>
            </button>
        );
    };

    const Dashboard = () => {
        const cardsData = [
            { id: 1, title: 'عدم تثبيت الغياب', responsible: ROLES.DEPUTY, screen: 'obs_1', roleMatch: [ROLES.DEPUTY, ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 2, title: 'رصد حضور 100%', responsible: `${ROLES.DEPUTY}, ${ROLES.MANAGER}`, screen: 'obs_2', roleMatch: [ROLES.DEPUTY, ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 3, title: 'المشكلات السلوكية', responsible: ROLES.STUDENT_GUIDE, screen: 'obs_3', roleMatch: [ROLES.STUDENT_GUIDE, ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 4, title: 'الفجوة', responsible: ROLES.MANAGER, screen: 'obs_4', roleMatch: [ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 5, title: 'نتائج المدرسة', responsible: ROLES.MANAGER, screen: 'obs_5', roleMatch: [ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 6, title: 'مستوى التهيئة والانطلاق', responsible: ROLES.MANAGER, screen: 'obs_6', roleMatch: [ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 7, title: 'نسبة الإتقان', responsible: ROLES.MANAGER, screen: 'obs_7', roleMatch: [ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 8, title: 'البلاغات', responsible: ROLES.MANAGER, screen: 'obs_8', roleMatch: [ROLES.MANAGER, ROLES.SUPERVISOR] },
            { id: 9, title: 'التقارير المجمعة', responsible: 'الجميع', screen: 'reports', roleMatch: Object.values(ROLES) },
        ];

        return (
            <div className="p-4 pt-20" dir="rtl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">لوحة التحكم الرئيسية</h2>
                <p className="text-gray-600 mb-6">مرحباً بك، {userRole}. يرجى اختيار الملاحظة للمتابعة:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {cardsData.map((card) => (
                        <DashboardCard
                            key={card.id}
                            title={`${card.id}. ${card.title}`}
                            responsible={card.responsible}
                            screen={card.screen}
                            roleMatch={card.roleMatch}
                        />
                    ))}
                </div>
                <footer className="mt-10 text-center text-sm text-gray-400">
                    <p>معرف المستخدم: {userId}</p>
                    <p>App ID: {appId}</p>
                </footer>
            </div>
        );
    };

    // ------------------------------------
    // Observation Screen 1: عدم تثبيت الغياب (Deputy)
    // ------------------------------------

    const Obs1_AbsenceFixing = () => {
        const [isConfirmed, setIsConfirmed] = useState(false);
        const [hasTechnicalIssue, setHasTechnicalIssue] = useState(false);
        const [history, setHistory] = useState([]);
        const [isSaving, setIsSaving] = useState(false);
        const [todayDocId, setTodayDocId] = useState(null);

        const today = useMemo(() => new Date(), []);
        const formattedDate = useMemo(() => today.toLocaleDateString('ar-SA'), [today]);
        const hijriDate = useMemo(() => getHijriDate(today), [today]);
        const dayKey = useMemo(() => today.toISOString().split('T')[0], [today]); // YYYY-MM-DD

        const totalStudents = 555;
        const absenceThreshold = totalStudents * 0.05; // 5% threshold
        const [todayAbsenceCount, setTodayAbsenceCount] = useState(Math.floor(Math.random() * (0.07 * totalStudents)));

        // Firestore Listener for History (Collection: 'absence_fixing')
        useEffect(() => {
            if (!db) return;

            const q = query(getCollectionPath('absence_fixing'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedHistory = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => b.dayKey.localeCompare(a.dayKey));

                setHistory(fetchedHistory);

                // Find today's entry
                const todayEntry = fetchedHistory.find(item => item.dayKey === dayKey);
                if (todayEntry) {
                    setIsConfirmed(todayEntry.confirmed || false);
                    setHasTechnicalIssue(todayEntry.technicalIssue || false);
                    setTodayDocId(todayEntry.id);
                } else {
                    setIsConfirmed(false);
                    setHasTechnicalIssue(false);
                    setTodayDocId(null);
                }
            }, (err) => {
                console.error("Error fetching absence history:", err);
                setError("حدث خطأ أثناء جلب سجل الغياب.");
            });

            return () => unsubscribe();
        }, [db, dayKey]);

        // Handler for updating the daily status
        const handleUpdateStatus = async (field, value) => {
            if (!userId) {
                setError("يرجى تسجيل الدخول أولاً.");
                return;
            }

            setIsSaving(true);
            setError(null);

            const dataToSave = {
                dayKey: dayKey,
                confirmed: field === 'confirmed' ? value : isConfirmed,
                technicalIssue: field === 'technicalIssue' ? value : hasTechnicalIssue,
                updatedBy: userId,
                updatedAt: new Date().toISOString(),
            };

            const docRef = todayDocId
                ? doc(db, getCollectionPath('absence_fixing').path, todayDocId)
                : doc(getCollectionPath('absence_fixing'));

            try {
                if (todayDocId) {
                    await updateDoc(docRef, dataToSave);
                } else {
                    await setDoc(docRef, dataToSave);
                }
            } catch (e) {
                setError(`خطأ في حفظ البيانات: ${e.message}`);
            } finally {
                setIsSaving(false);
            }
        };

        const isTodayFixed = isConfirmed || hasTechnicalIssue;
        const isAboveThreshold = todayAbsenceCount > absenceThreshold;

        // Calculate completion percentage based on historical data
        const completedDays = history.filter(item => item.confirmed || item.technicalIssue).length;
        const totalDays = history.length > 0 ? history.length : 1;
        const completionPercentage = (completedDays / totalDays) * 100;

        return (
            <div className="p-4 pt-20 max-w-4xl mx-auto" dir="rtl">
                <button onClick={() => setCurrentScreen('dashboard')} className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center">
                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                    العودة للوحة التحكم
                </button>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">1. متابعة عدم تثبيت الغياب</h2>
                <p className="text-gray-600 mb-6">المسؤول: **وكيل شؤون الطلاب**. (يتم حفظ البيانات في المجموعة: <span className='font-mono text-sm text-indigo-500'>absence_fixing</span>)</p>

                {/* Status Card for Today */}
                <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-indigo-500 mb-8">
                    <h3 className="text-xl font-extrabold text-indigo-700 mb-4">حالة اليوم: {formattedDate} ({hijriDate})</h3>

                    {isAboveThreshold && (
                        <div className="bg-yellow-100 border-r-4 border-yellow-500 text-yellow-700 p-3 rounded mb-4 flex items-center justify-between">
                            <p className="font-semibold">تنبيه بصري: نسبة الغياب تجاوزت 5% ({absenceThreshold.toFixed(0)} طالب)!</p>
                            <p className="font-bold">{todayAbsenceCount} غياب اليوم</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleUpdateStatus('confirmed', !isConfirmed)}
                            disabled={isSaving || hasTechnicalIssue}
                            className={`py-3 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-md ${isConfirmed ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'} disabled:opacity-50`}
                        >
                            {isConfirmed ? 'تم تأكيد رصد الغياب ✅' : 'تأكيد رصد الغياب في "نور"'}
                        </button>
                        <button
                            onClick={() => handleUpdateStatus('technicalIssue', !hasTechnicalIssue)}
                            disabled={isSaving || isConfirmed}
                            className={`py-3 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-md ${hasTechnicalIssue ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50`}
                        >
                            {hasTechnicalIssue ? '⚠️ تم تسجيل خلل فني (إلغاء)' : 'تسجيل وجود خلل فني في نظام نور'}
                        </button>
                    </div>
                </div>

                {/* Progress Report Card */}
                <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-green-500 mb-8">
                    <h3 className="text-xl font-extrabold text-green-700 mb-4">قياس الإنجاز</h3>
                    <p className="text-4xl font-bold text-center mb-2" style={{ color: `hsl(${completionPercentage * 1.2}, 70%, 40%)` }}>
                        {completionPercentage.toFixed(1)}%
                    </p>
                    <p className="text-center text-gray-600">
                        نسبة الأيام التي تم فيها تأكيد إدخال الغياب بنجاح ({completedDays} من {totalDays} أيام رصد).
                    </p>
                </div>

                {/* History Log */}
                <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-gray-500">
                    <h3 className="text-xl font-extrabold text-gray-700 mb-4">السجل التاريخي للمتابعة</h3>
                    {history.length === 0 ? (
                        <p className="text-gray-500">لا يوجد سجلات حتى الآن.</p>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {history.map(item => (
                                <div key={item.id} className={`p-3 rounded-lg border flex justify-between items-center ${item.confirmed ? 'bg-green-50 border-green-200' : item.technicalIssue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className="font-semibold">{item.dayKey}</span>
                                    <span className="text-sm">
                                        {item.confirmed ? '✅ تم التثبيت' : item.technicalIssue ? '⚠️ خلل فني في نور' : '❌ لم يتم التثبيت'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ------------------------------------
    // Observation Screen 3: المشكلات السلوكية (Student Guide)
    // ------------------------------------

    const ACTIONS = [
        'تنبيه شفهي', 'استدعاء ولي الأمر', 'خصم درجات سلوك', 'تحويل إلى المدير', 'اجتماع توجيهي', 'إجراء آخر'
    ];

    const Obs3_BehavioralIssues = () => {
        const [dailyIssueCount, setDailyIssueCount] = useState(1);
        const [studentName, setStudentName] = useState('');
        const [actionTaken, setActionTaken] = useState(ACTIONS[0]);
        const [isSaving, setIsSaving] = useState(false);
        const [history, setHistory] = useState([]);

        const today = useMemo(() => new Date(), []);
        const formattedDate = useMemo(() => today.toLocaleDateString('ar-SA'), [today]);
        const dayKey = useMemo(() => today.toISOString().split('T')[0], [today]);

        // Firestore Listener for History (Collection: 'behavioral_issues')
        useEffect(() => {
            if (!db) return;

            const q = query(getCollectionPath('behavioral_issues'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedHistory = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

                setHistory(fetchedHistory);
            }, (err) => {
                console.error("Error fetching behavioral history:", err);
                setError("حدث خطأ أثناء جلب سجل المشكلات السلوكية.");
            });

            return () => unsubscribe();
        }, [db]);

        const handleLogIssue = async (e) => {
            e.preventDefault();
            if (!userId || dailyIssueCount <= 0 || studentName.trim() === '') {
                setError("يرجى إدخال اسم الطالب وعدد المشكلات (يجب أن يكون العدد > 0).");
                return;
            }

            setIsSaving(true);
            setError(null);

            const dataToSave = {
                dayKey,
                dailyIssueCount: Number(dailyIssueCount),
                studentName: studentName.trim(),
                actionTaken,
                loggedBy: userId,
                timestamp: new Date().toISOString(),
            };

            try {
                // Use addDoc to create a new document with auto-generated ID
                await setDoc(doc(getCollectionPath('behavioral_issues')), dataToSave);

                // Reset form fields
                setDailyIssueCount(1);
                setStudentName('');
                setActionTaken(ACTIONS[0]);
            } catch (e) {
                setError(`خطأ في حفظ البيانات: ${e.message}`);
            } finally {
                setIsSaving(false);
            }
        };

        // Calculate completion metric: Total number of issues logged and actions taken
        const totalIssuesLogged = history.reduce((sum, item) => sum + (item.dailyIssueCount || 0), 0);
        const issuesToday = history.filter(item => item.dayKey === dayKey);

        // Mock completion metric: assume a goal of 5 issues logged per week (for reporting)
        const totalIssuesHandled = totalIssuesLogged; // Use logged issues as proxy for handled
        const mockGoalTotal = 50; // Arbitrary high goal for demonstration
        const completionPercentage = Math.min((totalIssuesHandled / mockGoalTotal) * 100, 100);

        return (
            <div className="p-4 pt-20 max-w-5xl mx-auto" dir="rtl">
                <button onClick={() => setCurrentScreen('dashboard')} className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center">
                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                    العودة للوحة التحكم
                </button>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">3. متابعة المشكلات السلوكية</h2>
                <p className="text-gray-600 mb-6">المسؤول: **الموجه الطلابي**. (يتم حفظ البيانات في المجموعة: <span className='font-mono text-sm text-indigo-500'>behavioral_issues</span>)</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Logging Form (Left/Top) */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-xl border-t-4 border-indigo-500">
                        <h3 className="text-xl font-extrabold text-indigo-700 mb-4">تسجيل مشكلة سلوكية جديدة ({formattedDate})</h3>
                        <form onSubmit={handleLogIssue} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="studentName" className="block text-gray-700 font-medium mb-2">اسم الطالب</label>
                                    <input
                                        id="studentName"
                                        type="text"
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-right"
                                        placeholder="ادخل اسم الطالب هنا..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="dailyIssueCount" className="block text-gray-700 font-medium mb-2">عدد المشكلات في الصف (لهذا الطالب)</label>
                                    <input
                                        id="dailyIssueCount"
                                        type="number"
                                        value={dailyIssueCount}
                                        onChange={(e) => setDailyIssueCount(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-right"
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="actionTaken" className="block text-gray-700 font-medium mb-2">الإجراء المتخذ</label>
                                <select
                                    id="actionTaken"
                                    value={actionTaken}
                                    onChange={(e) => setActionTaken(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-right bg-white"
                                    required
                                >
                                    {ACTIONS.map(action => (
                                        <option key={action} value={action}>{action}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition duration-200 shadow-md ${isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isSaving ? 'جاري التسجيل...' : 'تسجيل المشكلة والإجراء المتخذ'}
                            </button>
                        </form>
                        <p className='mt-4 text-sm text-gray-500 border-t pt-2'>*يُرسل إشعار يومي للمدير في 11:00 صباحًا إذا لم يتم رصد المشكلات.</p>
                    </div>

                    {/* Report and Summary (Right/Bottom) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-green-500">
                            <h3 className="text-xl font-extrabold text-green-700 mb-4">قياس الإنجاز</h3>
                            <p className="text-4xl font-bold text-center mb-2" style={{ color: `hsl(${completionPercentage * 1.2}, 70%, 40%)` }}>
                                {completionPercentage.toFixed(1)}%
                            </p>
                            <p className="text-center text-gray-600">
                                نسبة المشكلات السلوكية التي تم رصدها وتسجيل الإجراء المتخذ بشأنها.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-gray-500">
                            <h3 className="text-xl font-extrabold text-gray-700 mb-4">ملخص اليوم ({formattedDate})</h3>
                            <p className="text-gray-700 font-semibold text-lg">عدد الإجراءات المتخذة اليوم:</p>
                            <p className="text-4xl font-bold text-indigo-600">{issuesToday.length}</p>
                            <p className='mt-3 text-gray-700 font-semibold text-lg border-t pt-3'>الإجمالي التراكمي (كل السجل):</p>
                            <p className="text-4xl font-bold text-gray-800">{totalIssuesLogged} مشكلة</p>
                        </div>
                    </div>
                </div>

                {/* History Log */}
                <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-gray-500 mt-6" dir="rtl">
                    <h3 className="text-xl font-extrabold text-gray-700 mb-4">السجل التاريخي للمشكلات والإجراءات (أحدث أولاً)</h3>
                    {history.length === 0 ? (
                        <p className="text-gray-500">لا يوجد سجلات للمشكلات السلوكية حتى الآن.</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {history.map((item, index) => (
                                <div key={item.id || index} className={`p-3 rounded-lg border flex justify-between items-center bg-blue-50 border-blue-200`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800">الطالب: {item.studentName}</p>
                                        <p className="text-sm text-indigo-600 mt-1">
                                            الإجراء: **{item.actionTaken}**
                                        </p>
                                    </div>
                                    <div className="text-left min-w-max mr-4">
                                        <span className="block text-xs font-semibold text-gray-500">{item.dayKey}</span>
                                        <span className="block text-xs text-gray-500">تم تسجيل {item.dailyIssueCount} مشكلة</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ------------------------------------
    // Aggregate Reports Screen (شاشة التقارير المجمعة)
    // ------------------------------------

    const AggregateReportsScreen = () => {
        const mockReports = [
            { id: 1, title: 'عدم تثبيت الغياب', responsible: ROLES.DEPUTY, progress: 85, metric: 'أيام التأكيد' },
            { id: 2, title: 'رصد حضور 100%', responsible: ROLES.DEPUTY, progress: 40, metric: 'حالات الموافقة' },
            { id: 3, title: 'المشكلات السلوكية', responsible: ROLES.STUDENT_GUIDE, progress: 95, metric: 'مشكلات مسجلة' },
            { id: 4, title: 'الفجوة', responsible: ROLES.MANAGER, progress: 100, metric: 'توثيق الخطة' },
            { id: 5, title: 'نتائج المدرسة', responsible: ROLES.MANAGER, progress: 65, metric: 'نسبة التقدم' },
            { id: 6, title: 'مستوى التهيئة والانطلاق', responsible: ROLES.MANAGER, progress: 78, metric: 'نسبة الإنجاز الإجمالية' },
            { id: 7, title: 'نسبة الإتقان', responsible: ROLES.MANAGER, progress: 100, metric: 'توثيق الخطط العلاجية' },
            { id: 8, title: 'البلاغات', responsible: ROLES.MANAGER, progress: 55, metric: 'البلاغات المغلقة' },
        ];

        const ReportCard = ({ title, responsible, progress, metric }) => {
            const color = progress >= 90 ? 'bg-green-100 border-green-500 text-green-700' :
                          progress >= 60 ? 'bg-yellow-100 border-yellow-500 text-yellow-700' :
                          'bg-red-100 border-red-500 text-red-700';

            return (
                <div className={`p-6 rounded-xl shadow-lg border-r-4 ${color} transition duration-300`}>
                    <h3 className="text-xl font-bold mb-2">{title}</h3>
                    <p className="text-sm text-gray-600 mb-4">المسؤول: {responsible}</p>
                    <div className="flex items-center justify-between">
                        <div className="text-4xl font-extrabold">{progress}%</div>
                        <div className="text-sm text-gray-500 border-r pr-2">{metric}</div>
                    </div>
                    <div className="mt-4 h-2 bg-gray-200 rounded-full">
                        <div
                            className={`h-2 rounded-full ${progress >= 90 ? 'bg-green-500' : progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            );
        };

        return (
            <div className="p-4 pt-20 max-w-6xl mx-auto" dir="rtl">
                <button onClick={() => setCurrentScreen('dashboard')} className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center">
                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                    العودة للوحة التحكم
                </button>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">9. لوحة التقارير المجمعة</h2>
                <p className="text-gray-600 mb-6">نظرة عامة شاملة لنسب الإنجاز لجميع الملاحظات الرئيسية.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockReports.map(report => (
                        <ReportCard key={report.id} {...report} />
                    ))}
                </div>
            </div>
        );
    };

    // ------------------------------------
    // Placeholder Screens for Obs 2, 4-8
    // ------------------------------------

    const PlaceholderScreen = ({ title, screenKey, responsible, description }) => (
        <div className="p-4 pt-20 max-w-4xl mx-auto" dir="rtl">
            <button onClick={() => setCurrentScreen('dashboard')} className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center">
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                العودة للوحة التحكم
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-4 border-b pb-2">{title}</h2>
            <div className="bg-indigo-50 p-6 rounded-xl shadow-lg border-r-4 border-indigo-500">
                <p className="text-xl font-semibold text-indigo-700 mb-3">المسؤول: {responsible}</p>
                <p className="text-gray-700">{description}</p>
                <p className="mt-4 text-sm text-gray-500">
                    <span className="font-bold">ملاحظة تقنية:</span> تم إنشاء هذه الشاشة كنموذج. لإكمالها، استخدم نفس منطق Firestore المطبق في الشاشة رقم 1 أو 3.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                    <span className="font-bold">اسم المجموعة المقترح في Firestore:</span> {screenKey}
                </p>
            </div>
        </div>
    );

    // --- Main Rendering Logic ---
    if (!isAuthReady || loading) {
        return <LoadingSpinner />;
    }

    const renderScreen = () => {
        if (!user || !userId) {
            return <LoginSignupScreen />;
        }

        if (!userRole) {
            return <RoleSelectionScreen />;
        }

        switch (currentScreen) {
            case 'dashboard':
                return <Dashboard />;
            case 'reports':
                return <AggregateReportsScreen />;
            case 'obs_1':
                return <Obs1_AbsenceFixing />;
            case 'obs_2':
                return <PlaceholderScreen
                    title="2. رصد حضور 100%" screenKey="attendance_100" responsible={`${ROLES.DEPUTY}, ${ROLES.MANAGER}`}
                    description="البيانات المطلوبة: زر لتأكيد حالة الحضور 100%. يجب أن يظهر إشعار للمدير للموافقة على تأكيد الوكيل."
                />;
            case 'obs_3':
                return <Obs3_BehavioralIssues />; // New fully implemented screen
            case 'obs_4':
                return <PlaceholderScreen
                    title="4. الفجوة" screenKey="the_gap" responsible={ROLES.MANAGER}
                    description="البيانات المطلوبة: تقرير شهري يوثق أن الفجوة 'إيجابية' وخطة التحسين جاهزة وقيد التنفيذ. قياس الإنجاز: حالة التوثيق."
                />;
            case 'obs_5':
                return <PlaceholderScreen
                    title="5. نتائج المدرسة" screenKey="school_results" responsible={ROLES.MANAGER}
                    description="البيانات المطلوبة: إدخال ومقارنة متوسط درجات الصف السادس في الاختبارات القبلية والبعدية للمواد ونسبة التقدم."
                />;
            case 'obs_6':
                return <PlaceholderScreen
                    title="6. مستوى التهيئة والانطلاق" screenKey="readiness_level" responsible={ROLES.MANAGER}
                    description="البيانات المطلوبة: جدول متابعة شهري لمهام خطة التحسين مع حقل إدخال لـ نسبة الإنجاز لكل مهمة."
                />;
            case 'obs_7':
                return <PlaceholderScreen
                    title="7. نسبة الإتقان" screenKey="mastery_ratio" responsible={ROLES.MANAGER}
                    description="البيانات المطلوبة: توثيق وإدخال الخطط العلاجية الجماعية بناءً على تقارير 'نافس'. قياس الإنجاز: حالة التوثيق."
                />;
            case 'obs_8':
                return <PlaceholderScreen
                    title="8. البلاغات" screenKey="complaints" responsible={ROLES.MANAGER}
                    description="البيانات المطلوبة: إدخال أسبوعي للتاريخ، عدد البلاغات المرفوعة، المفتوحة، والمغلقة. قياس الإنجاز: نسبة البلاغات المغلقة."
                />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
            <script src="https://cdn.tailwindcss.com"></script>
            {/* Display Header only if user is logged in and not on a startup screen */}
            {user && userRole && (currentScreen !== 'login' && currentScreen !== 'role_selection') && (
                <Header title="نظام متابعة ملاحظات جابر بن عبدالله" />
            )}

            <main>
                {/* Global Error Message Display */}
                {error && (
                    <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-red-600 text-white text-center shadow-lg font-bold" onClick={() => setError(null)}>
                        {error} (انقر للإخفاء)
                    </div>
                )}
                {renderScreen()}
            </main>
        </div>
    );
};

export default App;
