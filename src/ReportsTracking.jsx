import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Bell, FileText, Send, CheckCircle, XCircle, Clock } from 'lucide-react';

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

const ReportsTracking = ({ userRole }) => {
    // حالة البيانات المدخلة
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [raisedCount, setRaisedCount] = useState('');
    const [closedCount, setClosedCount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    // حالة البيانات المعروضة (سجل المتابعة)
    const [records, setRecords] = useState([]);
    
    // --- منطق إرسال البيانات ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || userRole !== 'مدير') {
            setMessage('خطأ: لا تملك صلاحية المدير لحفظ البيانات.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const raised = parseInt(raisedCount) || 0;
            const closed = parseInt(closedCount) || 0;
            
            if (raised < closed) {
                 setMessage('تنبيه: عدد البلاغات المغلقة لا يمكن أن يكون أكبر من المرفوعة.');
                 setIsSubmitting(false);
                 return;
            }

            const recordData = {
                date: date,
                raisedCount: raised,
                closedCount: closed,
                openCount: raised - closed,
                completionRate: raised > 0 ? (closed / raised) * 100 : 0,
                userId: auth.currentUser.uid,
                timestamp: new Date().toISOString()
            };

            const recordsRef = collection(db, `artifacts/${appId}/public/data/reports_tracking`);
            await addDoc(recordsRef, recordData);

            setMessage('تم تسجيل حالة البلاغات بنجاح!');
            setRaisedCount('');
            setClosedCount('');

        } catch (error) {
            console.error("Error submitting report record:", error);
            setMessage('فشل في حفظ البيانات: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- منطق جلب سجلات المتابعة ---
    useEffect(() => {
        if (!db) return;

        const q = query(
            collection(db, `artifacts/${appId}/public/data/reports_tracking`),
            orderBy('timestamp', 'desc'),
            limit(30) // عرض آخر 30 سجل
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRecords = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRecords(fetchedRecords);
        }, (error) => {
            console.error("Error fetching records:", error);
            setMessage('فشل في جلب سجلات المتابعة.');
        });

        return () => unsubscribe();
    }, [db]);
    
    // --- حساب الإنجاز الشهري ---
    const monthlySummary = useMemo(() => {
        if (records.length === 0) return { raised: 0, closed: 0, completion: 0 };
        
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        const monthlyRecords = records.filter(rec => rec.timestamp >= startOfMonth);
        
        const totalRaised = monthlyRecords.reduce((sum, rec) => sum + rec.raisedCount, 0);
        const totalClosed = monthlyRecords.reduce((sum, rec) => sum + rec.closedCount, 0);

        const completion = totalRaised > 0 ? (totalClosed / totalRaised) * 100 : 0;
        
        return { raised: totalRaised, closed: totalClosed, completion: completion.toFixed(1) };
    }, [records]);


    // --- العرض ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="bg-teal-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <FileText className="h-8 w-8 ml-3" />
                    متابعة البلاغات والإنجاز
                </h1>
                <p className="mt-1 text-sm">المسؤول: مدير المدرسة (توثيق أسبوعي لعدد البلاغات المرفوعة والمغلقة).</p>
            </header>

            {/* بطاقة الإدخال الأسبوعي (للمدير) */}
            {userRole === 'مدير' && (
                <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-teal-500 max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">تسجيل حالة البلاغات الأسبوعية</h2>
                    
                    {/* تنبيه الإدخال الأسبوعي */}
                    <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg mb-4 flex items-center">
                        <Bell className="h-5 w-5 ml-2" />
                        <p className="text-sm font-medium">يتم إرسال إشعار للمدير كل يوم خميس لإدخال حالة البلاغات.</p>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                            {message}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* التاريخ والأعداد */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الرصد</label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">عدد البلاغات المرفوعة (خلال الأسبوع)</label>
                                <input
                                    type="number"
                                    value={raisedCount}
                                    onChange={(e) => setRaisedCount(e.target.value)}
                                    placeholder="المرفوعة"
                                    min="0"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">عدد البلاغات المغلقة (خلال الأسبوع)</label>
                                <input
                                    type="number"
                                    value={closedCount}
                                    onChange={(e) => setClosedCount(e.target.value)}
                                    placeholder="المغلقة"
                                    min="0"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                                    required
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center bg-teal-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-teal-700 transition duration-300 disabled:opacity-50"
                        >
                            {isSubmitting ? 'جارٍ الحفظ...' : 'تسجيل إحصائيات البلاغات'}
                            <Send className="h-5 w-5 mr-2" />
                        </button>
                    </form>
                </div>
            )}

            {/* تقرير موجز شهري */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 flex items-center border-b pb-2">
                    <BarChart3 className="h-6 w-6 ml-2" />
                    تقرير الإنجاز الشهري للبلاغات
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-teal-50 rounded-lg text-center">
                        <p className="text-sm font-medium text-teal-700">إجمالي المرفوع (شهرياً)</p>
                        <p className="text-4xl font-extrabold text-teal-600 mt-1">{monthlySummary.raised}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-sm font-medium text-green-700">إجمالي المغلق (شهرياً)</p>
                        <p className="text-4xl font-extrabold text-green-600 mt-1">{monthlySummary.closed}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <p className="text-sm font-medium text-blue-700">نسبة الإنجاز (المغلق/المرفوع)</p>
                        <p className="text-4xl font-extrabold text-blue-600 mt-1">{monthlySummary.completion}%</p>
                    </div>
                </div>
            </div>

            {/* جدول سجل المتابعة */}
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">السجل التاريخي للبلاغات</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مرفوعة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مغلقة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مفتوحة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نسبة الإنجاز</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {records.map((record) => (
                                <tr key={record.id} className={record.completionRate === 100 ? 'bg-green-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {new Date(record.date).toLocaleDateString('ar-SA')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.raisedCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{record.closedCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{record.openCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                        {record.completionRate.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {records.length === 0 && <p className="text-center py-6 text-gray-500">لا توجد سجلات بلاغات بعد.</p>}
            </div>
        </div>
    );
};

export default ReportsTracking;
