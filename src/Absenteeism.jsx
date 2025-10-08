import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, query, orderBy, onSnapshot, where, limit, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Calendar, UserCheck, AlertTriangle, Send, XCircle, BarChart2 } from 'lucide-react';

// --- الثوابت والمتغيرات العالمية (يتم توفيرها من بيئة التشغيل) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

// يتم تهيئة Firebase (يجب أن يتم تسجيل الدخول في App.jsx أولاً)
let db, auth;
if (firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
}

// دالة تحويل التاريخ الميلادي إلى هجري (تبسيط)
const toHijri = (date) => {
    try {
        const d = new Date(date);
        return d.toLocaleDateString('ar-SA-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return 'غير محدد';
    }
};

const Absenteeism = () => {
    // حالة البيانات المدخلة
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10)); // تاريخ اليوم
    const [totalStudents, setTotalStudents] = useState(555); // العدد الثابت للطلاب
    const [absentStudents, setAbsentStudents] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [hasTechnicalIssue, setHasTechnicalIssue] = useState(false);
    const [issueDetails, setIssueDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    // حالة البيانات المعروضة (سجل المتابعة)
    const [records, setRecords] = useState([]);
    
    // حالة الغياب المرتفع
    const highAbsenceThreshold = totalStudents * 0.05; // 5%

    // --- منطق إرسال البيانات ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !auth.currentUser) {
            setMessage('خطأ: لم يتم تسجيل الدخول إلى قاعدة البيانات.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const parsedAbsent = parseInt(absentStudents);
            if (isNaN(parsedAbsent) || parsedAbsent < 0 || parsedAbsent > totalStudents) {
                setMessage('الرجاء إدخال عدد صحيح وصالح للطلاب الغائبين.');
                setIsSubmitting(false);
                return;
            }
            
            const recordData = {
                date: date,
                hijriDate: toHijri(date),
                totalStudents: totalStudents,
                absentStudents: parsedAbsent,
                absenceRate: (parsedAbsent / totalStudents) * 100,
                isConfirmed: true,
                hasTechnicalIssue: hasTechnicalIssue,
                issueDetails: hasTechnicalIssue ? issueDetails : null,
                userId: auth.currentUser.uid,
                timestamp: new Date().toISOString()
            };

            const recordsRef = collection(db, `artifacts/${appId}/public/data/absenteeism_records`);
            await addDoc(recordsRef, recordData);

            setMessage('تم تأكيد رصد الغياب بنجاح! سيتم إرسال إشعار للمتابعة.');
            setIsConfirmed(true);
            setAbsentStudents('');
            setHasTechnicalIssue(false);
            setIssueDetails('');

        } catch (error) {
            console.error("Error submitting attendance record:", error);
            setMessage('فشل في حفظ البيانات: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- منطق جلب سجلات المتابعة ---
    useEffect(() => {
        if (!db) return;

        const q = query(
            collection(db, `artifacts/${appId}/public/data/absenteeism_records`),
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
    
    // --- حساب نسبة الإنجاز ---
    const monthlyCompletionRate = useMemo(() => {
        if (records.length === 0) return 0;
        
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const workingDaysSoFar = Array.from({ length: today.getDate() }, (_, i) => i + 1)
            .filter(day => {
                const d = new Date(today.getFullYear(), today.getMonth(), day);
                const dayOfWeek = d.getDay();
                // نفترض أن أيام العمل من الأحد (0) إلى الخميس (4)
                return dayOfWeek !== 5 && dayOfWeek !== 6; 
            })
            .length;

        const confirmedDays = records.filter(rec => {
            const recDate = new Date(rec.date);
            return recDate >= startOfMonth && rec.isConfirmed;
        }).length;

        // نسبة الإنجاز هي عدد الأيام التي تم تأكيدها مقسومة على أيام العمل حتى اليوم
        return workingDaysSoFar > 0 ? ((confirmedDays / workingDaysSoFar) * 100).toFixed(0) : 0;
    }, [records]);


    // --- العرض ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="bg-teal-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <UserCheck className="h-8 w-8 ml-3" />
                    متابعة رصد الغياب اليومي
                </h1>
                <p className="mt-1 text-sm">المسؤول: وكيل شؤون الطلاب (يتطلب التأكيد اليومي قبل 10 صباحاً).</p>
            </header>

            {/* بطاقة الإدخال اليومي */}
            <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-yellow-500 max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">نموذج تأكيد رصد الغياب في "نور"</h2>
                {message && (
                    <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* التاريخ الهجري والميلادي */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ الميلادي</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-teal-500 focus:border-teal-500 text-left"
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ الهجري</label>
                            <p className="w-full p-3 border border-gray-300 rounded-lg bg-gray-200 text-gray-700 text-center font-semibold">{toHijri(date)}</p>
                        </div>
                    </div>

                    {/* عدد الطلاب الغائبين */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">عدد الطلاب الغائبين اليوم (من {totalStudents} طالب)</label>
                        <input
                            type="number"
                            value={absentStudents}
                            onChange={(e) => setAbsentStudents(e.target.value)}
                            placeholder="أدخل عدد الغياب المرصود في نور"
                            min="0"
                            max={totalStudents}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                            required
                        />
                    </div>
                    
                    {/* أيقونة الخلل */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                            id="technical-issue"
                            type="checkbox"
                            checked={hasTechnicalIssue}
                            onChange={(e) => setHasTechnicalIssue(e.target.checked)}
                            className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <label htmlFor="technical-issue" className="text-sm font-medium text-gray-700 flex items-center">
                            <XCircle className="h-5 w-5 ml-1 text-red-500" />
                            يوجد خلل تقني في نظام "نور"
                        </label>
                    </div>

                    {hasTechnicalIssue && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تفاصيل الخلل</label>
                            <textarea
                                value={issueDetails}
                                onChange={(e) => setIssueDetails(e.target.value)}
                                placeholder="صف تفاصيل الخلل التقني الذي منع رصد الغياب كاملاً أو تسبب في مشكلة"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                rows="2"
                                required
                            />
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center bg-teal-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-teal-700 transition duration-300 disabled:opacity-50"
                    >
                        {isSubmitting ? 'جارٍ الحفظ...' : 'تأكيد رصد الغياب لليوم'}
                        <Send className="h-5 w-5 mr-2" />
                    </button>
                </form>
            </div>

            {/* تقرير موجز ونسبة الإنجاز */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 flex items-center border-b pb-2">
                    <BarChart2 className="h-6 w-6 ml-2" />
                    ملخص المتابعة
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-teal-50 rounded-lg">
                        <p className="text-sm font-medium text-teal-700">نسبة الإنجاز الشهرية (تأكيد الرصد)</p>
                        <p className="text-3xl font-extrabold text-teal-600 mt-1">{monthlyCompletionRate}%</p>
                    </div>
                    <div className={`p-4 rounded-lg ${records.some(r => r.absentStudents > highAbsenceThreshold) ? 'bg-red-100' : 'bg-green-100'}`}>
                        <p className="text-sm font-medium text-gray-700">تنبيه الغياب المرتفع (5% من {totalStudents})</p>
                        <p className={`text-3xl font-extrabold ${records.some(r => r.absentStudents > highAbsenceThreshold) ? 'text-red-600' : 'text-green-600'} mt-1`}>
                            {records.some(r => r.absentStudents > highAbsenceThreshold) ? 'يوجد غياب مرتفع' : 'النسبة ضمن الحد'}
                        </p>
                    </div>
                </div>
            </div>

            {/* جدول سجل المتابعة */}
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">السجل التاريخي (آخر 30 يوماً)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ (م/هـ)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الغياب</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نسبة الغياب</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حالة الرصد</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">خلل تقني</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {records.map((record) => (
                                <tr key={record.id} className={record.absentStudents > highAbsenceThreshold ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {record.date} ({record.hijriDate})
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.absentStudents} طالب
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${record.absenceRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                        {record.absenceRate.toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {record.isConfirmed ? <span className="text-green-600">تم التأكيد</span> : <span className="text-red-600">لم يؤكد</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {record.hasTechnicalIssue ? <span className="text-red-600 font-medium" title={record.issueDetails}>نعم <AlertTriangle className="inline h-4 w-4 mr-1" /></span> : 'لا'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {records.length === 0 && <p className="text-center py-6 text-gray-500">لا توجد سجلات متابعة بعد.</p>}
            </div>
        </div>
    );
};

export default Absenteeism;
