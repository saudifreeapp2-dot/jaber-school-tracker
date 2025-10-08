import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react';

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

// المعرف الثابت لوثيقة حالة الفجوة (لتسهيل الوصول للمدير)
const GAP_STATUS_DOC_ID = 'current_gap_status';

const GapAnalysis = ({ userRole }) => {
    const [gapStatus, setGapStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    
    // حالة الإدخال
    const [isPositive, setIsPositive] = useState(true);
    const [planDetails, setPlanDetails] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // --- منطق جلب حالة الفجوة ---
    useEffect(() => {
        if (!db) return;
        
        const docRef = doc(db, `artifacts/${appId}/public/data/gap_analysis`, GAP_STATUS_DOC_ID);
        
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setGapStatus(docSnap.data());
                setIsPositive(docSnap.data().isPositive);
                setPlanDetails(docSnap.data().planDetails || '');
            } else {
                setGapStatus({ isPositive: true, planDetails: 'تم إعداد خطة التحسين وجاري العمل عليها.' });
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching gap status:", error);
            setMessage('فشل في جلب حالة الفجوة: ' + error.message);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);
    
    // --- منطق حفظ التوثيق (للمدير) ---
    const handleSave = async (e) => {
        e.preventDefault();
        if (!db || userRole !== 'مدير') {
            setMessage('خطأ: لا تملك صلاحية المدير لحفظ البيانات.');
            return;
        }

        setIsSaving(true);
        setMessage('');

        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/gap_analysis`, GAP_STATUS_DOC_ID);
            await setDoc(docRef, {
                isPositive: isPositive,
                planDetails: planDetails,
                lastUpdated: new Date().toISOString(),
                updatedBy: auth.currentUser.uid
            }, { merge: true });

            setMessage('تم تحديث حالة الفجوة وخطة التحسين بنجاح.');

        } catch (error) {
            console.error("Error saving gap status:", error);
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
                    <TrendingUp className="h-8 w-8 ml-3" />
                    متابعة الفجوة وتحليل الأداء
                </h1>
                <p className="mt-1 text-sm">المسؤول: مدير المدرسة (لتوثيق الحالة الإيجابية وتحديث خطة التحسين).</p>
            </header>
            
            <div className="max-w-4xl mx-auto">
                {message && (
                    <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message}
                    </div>
                )}
                
                {/* حالة الفجوة الحالية (عرض) */}
                <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-teal-500">
                    <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2 flex items-center">
                        <CheckCircle className="h-6 w-6 ml-2" />
                        حالة الفجوة الحالية
                    </h2>
                    
                    <div className={`p-4 rounded-lg text-center ${gapStatus?.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <p className="text-4xl font-extrabold">{gapStatus?.isPositive ? 'إيجابية' : 'سلبية'}</p>
                        <p className="text-sm mt-1 font-medium">وفقاً لتقرير مشرف الإدارة المدرسية ومنصة تميز</p>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="font-semibold text-gray-700 mb-2 flex items-center">
                            <FileText className="h-5 w-5 ml-1 text-teal-600" />
                            توثيق خطة التحسين الجارية:
                        </p>
                        <p className="text-gray-600 whitespace-pre-wrap">{gapStatus?.planDetails || 'لا يوجد تفاصيل محدثة لخطة التحسين.'}</p>
                        {gapStatus?.lastUpdated && (
                            <p className="text-xs text-gray-500 mt-2">آخر تحديث: {new Date(gapStatus.lastUpdated).toLocaleDateString('ar-SA')}</p>
                        )}
                    </div>
                </div>

                
                {/* نموذج التوثيق والتحديث (للمدير فقط) */}
                {userRole === 'مدير' && (
                    <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-yellow-500">
                        <h2 className="text-xl font-bold mb-4 text-yellow-700 border-b pb-2 flex items-center">
                            <Clock className="h-6 w-6 ml-2" />
                            تحديث التوثيق (المدير)
                        </h2>
                        
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">حالة الفجوة</label>
                                <select 
                                    value={isPositive.toString()}
                                    onChange={(e) => setIsPositive(e.target.value === 'true')}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 bg-white"
                                >
                                    <option value="true">إيجابية</option>
                                    <option value="false">سلبية (يتطلب إجراء عاجل)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">تفاصيل خطة التحسين والعمل الجاري</label>
                                <textarea
                                    value={planDetails}
                                    onChange={(e) => setPlanDetails(e.target.value)}
                                    placeholder="اكتب توثيقاً موجزاً عن خطة التحسين الجاري العمل عليها..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                                    rows="4"
                                    required
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full flex items-center justify-center bg-yellow-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-yellow-700 transition duration-300 disabled:opacity-50"
                            >
                                {isSaving ? 'جارٍ الحفظ...' : 'حفظ وتحديث حالة الفجوة'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GapAnalysis;
