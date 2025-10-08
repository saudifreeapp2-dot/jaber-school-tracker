import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc, query, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { BarChart3, Edit3, Save, MessageSquare } from 'lucide-react';

// --- الثوابت والمتغيرات العالمية (يتم توفيرها من بيئة التشغيل) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

// يتم تهيئة Firebase
let db, auth;
if (firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
}

const TARGET_MATERIALS = ['اللغة العربية', 'الرياضيات', 'العلوم'];
const RESULTS_DOC_ID = 'sixth_grade_results';

const SchoolResults = ({ userRole }) => {
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // حالة الملاحظات الشهرية
    const [monthlyNote, setMonthlyNote] = useState('');
    const [lastNote, setLastNote] = useState('');

    // --- منطق جلب البيانات ---
    useEffect(() => {
        if (!db) return;

        const docRef = doc(db, `artifacts/${appId}/public/data/school_results`, RESULTS_DOC_ID);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setResults(data.materials || TARGET_MATERIALS.map(name => ({ name, preTest: 0, postTest: 0 })));
                setLastNote(data.monthlyNote || 'لا توجد ملاحظات شهرية مسجلة بعد.');
            } else {
                 // إذا لم توجد بيانات، نستخدم الهيكل الافتراضي
                setResults(TARGET_MATERIALS.map(name => ({ name, preTest: 0, postTest: 0 })));
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching results:", error);
            setMessage('فشل في جلب نتائج المدرسة.');
            setIsLoading(false);
        });

        // جلب آخر ملاحظة شهرية
        const noteQuery = query(
            collection(db, `artifacts/${appId}/public/data/monthly_notes`),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsubscribeNote = onSnapshot(noteQuery, (snapshot) => {
            if (!snapshot.empty) {
                setLastNote(snapshot.docs[0].data().note);
            }
        });

        return () => {
            unsubscribe();
            unsubscribeNote();
        };
    }, [db]);
    
    // --- تحديث بيانات الاختبارات ---
    const handleResultChange = (name, field, value) => {
        setResults(prevResults => prevResults.map(mat => 
            mat.name === name ? { ...mat, [field]: parseFloat(value) || 0 } : mat
        ));
    };
    
    // --- حفظ البيانات (للمدير) ---
    const handleSaveResults = async (e) => {
        e.preventDefault();
        if (!db || userRole !== 'مدير') {
            setMessage('خطأ: لا تملك صلاحية المدير لحفظ البيانات.');
            return;
        }

        setIsSaving(true);
        setMessage('');

        try {
            const resultsRef = doc(db, `artifacts/${appId}/public/data/school_results`, RESULTS_DOC_ID);
            
            // 1. حفظ النتائج
            await setDoc(resultsRef, {
                materials: results,
                lastUpdated: new Date().toISOString(),
                updatedBy: auth.currentUser.uid
            }, { merge: true });
            
            // 2. حفظ الملاحظة الشهرية الجديدة (إذا وجدت)
            if (monthlyNote.trim()) {
                const noteRef = collection(db, `artifacts/${appId}/public/data/monthly_notes`);
                await addDoc(noteRef, {
                    note: monthlyNote.trim(),
                    timestamp: new Date().toISOString(),
                    userId: auth.currentUser.uid
                });
                setMonthlyNote('');
                setMessage('تم تحديث النتائج والملاحظة الشهرية بنجاح. (تم إرسال تنبيه للمدير بالبريد)');
            } else {
                setMessage('تم تحديث النتائج بنجاح.');
            }

        } catch (error) {
            console.error("Error saving results:", error);
            setMessage('فشل في حفظ البيانات: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const calculateProgress = (pre, post) => {
        if (pre === 0) return post > 0 ? 100 : 0;
        return (((post - pre) / pre) * 100).toFixed(1);
    };

    if (isLoading) return <div className="min-h-screen p-8" dir="rtl"><div className="text-center text-teal-600 font-semibold">جارٍ تحميل البيانات...</div></div>;

    // --- العرض ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="bg-teal-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <BarChart3 className="h-8 w-8 ml-3" />
                    متابعة نتائج الصف السادس (نافس)
                </h1>
                <p className="mt-1 text-sm">المسؤول: مدير المدرسة (متابعة شهرية لمتوسط درجات الاختبارات القبلية والبعدية).</p>
            </header>
            
            <div className="max-w-4xl mx-auto">
                {message && (
                    <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message}
                    </div>
                )}
                
                {/* منطقة الإدخال والتحديث (للمدير فقط) */}
                {userRole === 'مدير' && (
                    <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-yellow-500">
                        <h2 className="text-xl font-bold mb-4 text-yellow-700 border-b pb-2 flex items-center">
                            <Edit3 className="h-6 w-6 ml-2" />
                            تحديث متوسط نتائج الصف السادس
                        </h2>
                        
                        <form onSubmit={handleSaveResults} className="space-y-6">
                            {results.map(mat => (
                                <div key={mat.name} className="bg-gray-50 p-4 rounded-lg border">
                                    <h3 className="font-bold text-lg text-teal-700 mb-3">{mat.name}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">متوسط الاختبار القبلي</label>
                                            <input 
                                                type="number" 
                                                value={mat.preTest} 
                                                onChange={(e) => handleResultChange(mat.name, 'preTest', e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                                                min="0" max="100"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">متوسط الاختبار البعدي</label>
                                            <input 
                                                type="number" 
                                                value={mat.postTest} 
                                                onChange={(e) => handleResultChange(mat.name, 'postTest', e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                                                min="0" max="100"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {/* الملاحظة الشهرية */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <MessageSquare className="h-5 w-5 ml-1 text-teal-600" />
                                    الملاحظات الشهرية للإرسال (تنبيه للمدير)
                                </label>
                                <textarea
                                    value={monthlyNote}
                                    onChange={(e) => setMonthlyNote(e.target.value)}
                                    placeholder="اكتب ملاحظاتك الشهرية هنا (اختياري للإرسال)"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                                    rows="2"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full flex items-center justify-center bg-yellow-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-yellow-700 transition duration-300 disabled:opacity-50"
                            >
                                {isSaving ? 'جارٍ الحفظ...' : 'حفظ النتائج وإرسال التنبيه'}
                                <Save className="h-5 w-5 mr-2" />
                            </button>
                        </form>
                    </div>
                )}

                {/* لوحة عرض النتائج والمقارنة (للجميع) */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border-t-4 border-teal-500">
                    <h2 className="text-xl font-bold mb-4 text-teal-700 flex items-center border-b pb-2">
                        <BarChart3 className="h-6 w-6 ml-2" />
                        تقرير مقارنة التحسن في الصف السادس
                    </h2>
                    
                    <div className="space-y-4">
                        {results.map(mat => {
                            const progress = calculateProgress(mat.preTest, mat.postTest);
                            const isPositive = progress > 0;
                            
                            return (
                                <div key={mat.name} className={`p-4 rounded-lg shadow-sm border ${isPositive ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">{mat.name}</h3>
                                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                                        <div className="text-center p-2 rounded-lg bg-white shadow-inner">
                                            <p className="font-medium">القبلي</p>
                                            <p className="font-extrabold text-lg text-teal-700">{mat.preTest}%</p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-white shadow-inner">
                                            <p className="font-medium">البعدي</p>
                                            <p className="font-extrabold text-lg text-teal-700">{mat.postTest}%</p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg text-white shadow-md" style={{ backgroundColor: isPositive ? '#10B981' : '#EF4444' }}>
                                            <p className="font-medium">التحسن</p>
                                            <p className="font-extrabold text-lg">{progress}%</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* آخر الملاحظات الشهرية */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-gray-300">
                    <h2 className="text-xl font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
                        <MessageSquare className="h-6 w-6 ml-2" />
                        آخر ملاحظة شهرية مسجلة
                    </h2>
                    <p className="text-gray-600 whitespace-pre-wrap">{lastNote}</p>
                </div>
            </div>
        </div>
    );
};

export default SchoolResults;
