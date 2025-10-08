import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc, getDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Bell, Award, BookOpen, Save, Clock } from 'lucide-react';

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

const PROFICIENCY_DOC_ID = 'sixth_grade_proficiency';

// نسب الإتقان الافتراضية (بناءً على ملف تحليل نافس - متمكن فأعلى)
const INITIAL_PROFICIENCY = [
    { name: 'اللغة العربية (قراءة)', rate: 41.6, target: 43.0, notes: 'نحتاج لزيادة 1.4% للوصول للهدف الوطني.' },
    { name: 'الرياضيات', rate: 54.1, target: 49.0, notes: 'نسبة الإتقان ممتازة وتجاوزت الهدف الوطني المستهدف لعام 2025.' },
    { name: 'العلوم', rate: 41.3, target: 46.0, notes: 'ما زالت نسبة الإتقان أقل من الهدف الوطني وتحتاج لدعم خاص.' },
];

const ProficiencyRate = ({ userRole }) => {
    const [proficiencyData, setProficiencyData] = useState(INITIAL_PROFICIENCY);
    const [remedialPlan, setRemedialPlan] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // --- منطق جلب البيانات ---
    useEffect(() => {
        if (!db) return;
        
        const docRef = doc(db, `artifacts/${appId}/public/data/proficiency_rate`, PROFICIENCY_DOC_ID);
        
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProficiencyData(data.materials || INITIAL_PROFICIENCY);
                setRemedialPlan(data.remedialPlan || '');
            }
            setIsLoading(false);
        }).catch(error => {
            console.error("Error fetching proficiency data:", error);
            setMessage('فشل في جلب بيانات الإتقان: ' + error.message);
            setIsLoading(false);
        });
    }, [db]);
    
    // --- تحديث نسبة الإتقان (إذا احتاج المدير لتحديثها يدوياً) ---
    const handleRateChange = (name, value) => {
        const numericValue = Math.min(100, Math.max(0, parseFloat(value) || 0));
        setProficiencyData(prevData => prevData.map(mat => 
            mat.name === name ? { ...mat, rate: numericValue } : mat
        ));
    };
    
    // --- حفظ البيانات (للمدير) ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!db || userRole !== 'مدير') {
            setMessage('خطأ: لا تملك صلاحية المدير لحفظ البيانات.');
            return;
        }

        setIsSaving(true);
        setMessage('');

        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/proficiency_rate`, PROFICIENCY_DOC_ID);
            await setDoc(docRef, {
                materials: proficiencyData,
                remedialPlan: remedialPlan,
                lastUpdated: new Date().toISOString(),
                updatedBy: auth.currentUser.uid
            });

            setMessage('تم تحديث نسب الإتقان والخطط العلاجية بنجاح. (سيتم إرسال تنبيه شهري للمدير)');

        } catch (error) {
            console.error("Error saving data:", error);
            setMessage('فشل في حفظ البيانات: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="min-h-screen p-8" dir="rtl"><div className="text-center text-teal-600 font-semibold">جارٍ تحميل البيانات...</div></div>;

    // --- العرض ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="bg-teal-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <Award className="h-8 w-8 ml-3" />
                    متابعة نسبة الإتقان (الصف السادس)
                </h1>
                <p className="mt-1 text-sm">المسؤول: مدير المدرسة (توثيق نسب الإتقان والخطط العلاجية الجماعية).</p>
            </header>
            
            <div className="max-w-4xl mx-auto">
                {message && (
                    <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message}
                    </div>
                )}
                
                {/* تنبيه شهري للمدير */}
                <div className="bg-white p-4 rounded-xl shadow-lg mb-8 border-r-4 border-yellow-500">
                    <p className="text-sm font-medium text-yellow-800 flex items-center">
                        <Bell className="h-5 w-5 ml-1" />
                        تنبيه المدير الشهري
                    </p>
                    <p className="mt-1 text-gray-700">يتم إرسال تنبيه شهري لمدير المدرسة للتأكد من تحديث نسب الإتقان ومتابعة الخطط العلاجية.</p>
                </div>


                {/* لوحة عرض نسب الإتقان */}
                <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-teal-500">
                    <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2 flex items-center">
                        <Clock className="h-6 w-6 ml-2" />
                        النسب الموثقة (متمكن فأعلى)
                    </h2>
                    
                    <div className="space-y-4">
                        {proficiencyData.map(mat => {
                            const reachedTarget = mat.rate >= mat.target;
                            
                            return (
                                <div key={mat.name} className={`p-4 rounded-lg shadow-sm border ${reachedTarget ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">{mat.name}</h3>
                                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                                        <div className="text-center p-2 rounded-lg bg-white shadow-inner">
                                            <p className="font-medium">النسبة الحالية</p>
                                            <p className="font-extrabold text-2xl text-teal-700">{mat.rate}%</p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-white shadow-inner">
                                            <p className="font-medium">المستهدف الوطني</p>
                                            <p className="font-extrabold text-2xl text-gray-700">{mat.target}%</p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg text-white shadow-md" style={{ backgroundColor: reachedTarget ? '#10B981' : '#EF4444' }}>
                                            <p className="font-medium">{reachedTarget ? 'تحقق الهدف' : 'تحتاج دعم'}</p>
                                            <p className="font-extrabold text-lg">{reachedTarget ? '✓' : '✗'}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-gray-700 font-medium border-t pt-2">{mat.notes}</p>
                                    
                                    {/* حقل تحديث النسبة للمدير */}
                                    {userRole === 'مدير' && (
                                        <div className="mt-3">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">تحديث النسبة المئوية يدوياً</label>
                                            <input 
                                                type="number" 
                                                value={mat.rate} 
                                                onChange={(e) => handleRateChange(mat.name, e.target.value)}
                                                className="w-20 p-1 border border-gray-300 rounded-lg text-left text-sm"
                                                min="0" max="100"
                                            />%
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                
                {/* توثيق الخطط العلاجية الجماعية (للمدير) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
                    <h2 className="text-xl font-bold mb-4 text-yellow-700 flex items-center border-b pb-2">
                        <BookOpen className="h-6 w-6 ml-2" />
                        توثيق الخطط العلاجية الجماعية
                    </h2>
                    
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تفاصيل الخطط العلاجية الجماعية المطبقة حالياً</label>
                            <textarea
                                value={remedialPlan}
                                onChange={(e) => setRemedialPlan(e.target.value)}
                                placeholder="صف الخطط العلاجية الجماعية التي يتم تنفيذها للصف السادس للمواد التي تحتاج دعم."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                                rows="4"
                                required
                                disabled={userRole !== 'مدير'}
                            />
                        </div>
                        
                        {userRole === 'مدير' && (
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full flex items-center justify-center bg-yellow-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-yellow-700 transition duration-300 disabled:opacity-50"
                            >
                                {isSaving ? 'جارٍ الحفظ...' : 'حفظ وتحديث التوثيق'}
                                <Save className="h-5 w-5 mr-2" />
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProficiencyRate;
