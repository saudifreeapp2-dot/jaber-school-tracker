import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Scale, Users, FileText, Send, XCircle } from 'lucide-react';

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

// قائمة الفصول الدراسية (لأغراض الإدخال)
const CLASSES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'];

// قائمة الإجراءات المتخذة (منسدلة)
const ACTIONS = [
    'توجيه وإرشاد فردي',
    'استدعاء ولي الأمر',
    'تحويل إلى المدير',
    'عقوبة انضباطية بسيطة',
    'إشراك في برنامج سلوكي',
    'إجراء آخر'
];

const BehavioralIssues = () => {
    // حالة البيانات المدخلة
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [classSelected, setClassSelected] = useState(CLASSES[0]);
    const [studentName, setStudentName] = useState('');
    const [actionTaken, setActionTaken] = useState(ACTIONS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    // حالة البيانات المعروضة (سجل المتابعة)
    const [records, setRecords] = useState([]);
    
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
            const recordData = {
                date: date,
                class: classSelected,
                studentName: studentName.trim(),
                actionTaken: actionTaken,
                userId: auth.currentUser.uid,
                timestamp: new Date().toISOString()
            };

            const recordsRef = collection(db, `artifacts/${appId}/public/data/behavioral_issues`);
            await addDoc(recordsRef, recordData);

            setMessage('تم تسجيل المشكلة السلوكية بنجاح!');
            setStudentName('');
            setActionTaken(ACTIONS[0]);

        } catch (error) {
            console.error("Error submitting behavioral record:", error);
            setMessage('فشل في حفظ البيانات: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- منطق جلب سجلات المتابعة ---
    useEffect(() => {
        if (!db) return;

        const q = query(
            collection(db, `artifacts/${appId}/public/data/behavioral_issues`),
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
    
    // --- حساب الإحصائيات الأسبوعية ---
    const weeklySummary = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklyRecords = records.filter(rec => new Date(rec.timestamp) > oneWeekAgo);
        
        const issuesByClass = weeklyRecords.reduce((acc, rec) => {
            acc[rec.class] = (acc[rec.class] || 0) + 1;
            return acc;
        }, {});

        const totalIssues = weeklyRecords.length;
        
        return { totalIssues, issuesByClass };
    }, [records]);


    // --- العرض ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="bg-teal-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <Scale className="h-8 w-8 ml-3" />
                    تسجيل المشكلات السلوكية اليومية
                </h1>
                <p className="mt-1 text-sm">المسؤول: الموجه الطلابي (يجب الإدخال اليومي قبل 11 صباحاً).</p>
            </header>

            {/* بطاقة الإدخال اليومي */}
            <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-teal-500 max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">تسجيل مشكلة سلوكية جديدة</h2>
                {message && (
                    <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* التاريخ واسم الطالب */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ المشكلة</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب</label>
                            <input 
                                type="text" 
                                value={studentName} 
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="اسم الطالب المعني"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>
                    </div>

                    {/* الصف والإجراء المتخذ */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">الصف الدراسي</label>
                            <select
                                value={classSelected}
                                onChange={(e) => setClassSelected(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white"
                                required
                            >
                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">الإجراء المتخذ</label>
                            <select
                                value={actionTaken}
                                onChange={(e) => setActionTaken(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white"
                                required
                            >
                                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !studentName.trim()}
                        className="w-full flex items-center justify-center bg-teal-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-teal-700 transition duration-300 disabled:opacity-50"
                    >
                        {isSubmitting ? 'جارٍ الحفظ...' : 'تسجيل المشكلة'}
                        <Send className="h-5 w-5 mr-2" />
                    </button>
                </form>
            </div>

            {/* تقرير موجز أسبوعي */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 flex items-center border-b pb-2">
                    <FileText className="h-6 w-6 ml-2" />
                    التقرير الأسبوعي للمشكلات السلوكية
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-teal-50 rounded-lg text-center">
                        <p className="text-sm font-medium text-teal-700">إجمالي المشكلات (آخر 7 أيام)</p>
                        <p className="text-4xl font-extrabold text-teal-600 mt-1">{weeklySummary.totalIssues}</p>
                    </div>
                    <div className="sm:col-span-2 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">المشكلات حسب الصف الدراسي (أسبوعي)</p>
                        <ul className="space-y-1">
                            {CLASSES.map(c => (
                                <li key={c} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-600">{c}</span>
                                    <span className="font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded-full">{weeklySummary.issuesByClass[c] || 0}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* جدول سجل المتابعة */}
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">السجل التاريخي (آخر 30 سجل)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصف</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اسم الطالب</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الإجراء المتخذ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {records.map((record) => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {new Date(record.date).toLocaleDateString('ar-SA')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.class}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-600">{record.studentName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.actionTaken}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {records.length === 0 && <p className="text-center py-6 text-gray-500">لا توجد سجلات مشكلات سلوكية بعد.</p>}
            </div>
        </div>
    );
};

export default BehavioralIssues;
