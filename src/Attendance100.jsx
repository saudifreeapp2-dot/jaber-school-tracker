import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, addDoc, query, orderBy, onSnapshot, updateDoc, where, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CheckCircle, Clock, AlertTriangle, Send, XCircle } from 'lucide-react';

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

const Attendance100 = ({ userRole }) => {
    // حالة البيانات المدخلة
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    // حالة البيانات المعروضة (سجل المتابعة)
    const [records, setRecords] = useState([]);
    
    // --- منطق إرسال طلب التأكيد (للوكيل) ---
    const handleRequest = async (e) => {
        e.preventDefault();
        if (!db || !auth.currentUser) {
            setMessage('خطأ: لم يتم تسجيل الدخول إلى قاعدة البيانات.');
            return;
        }

        // تحقق من عدم وجود طلب لنفس اليوم
        const existingRecord = records.find(rec => rec.date === date && (rec.status === 'Pending' || rec.status === 'Approved'));
        if (existingRecord) {
            setMessage('تنبيه: يوجد طلب معلق أو تمت الموافقة عليه لهذا التاريخ بالفعل.');
            return;
        }
        
        setIsSubmitting(true);
        setMessage('');

        try {
            const recordsRef = collection(db, `artifacts/${appId}/public/data/attendance_100`);
            await addDoc(recordsRef, {
                date: date,
                requesterId: auth.currentUser.uid,
                status: 'Pending', // معلق في انتظار موافقة المدير
                requestedAt: new Date().toISOString()
            });

            // هنا يتم إرسال إشعار للمدير (نحتاج نظام إشعارات حقيقي، لكن سنكتفي برسالة توضيحية)
            setMessage('تم إرسال طلب تأكيد حضور 100% بنجاح! سيتم إرسال إشعار للمدير للموافقة.');

        } catch (error) {
            console.error("Error submitting 100% request:", error);
            setMessage('فشل في حفظ البيانات: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- منطق الموافقة (للمدير) ---
    const handleApproval = async (recordId, status) => {
        if (!db || userRole !== 'مدير') {
            setMessage('خطأ: لا تملك صلاحية المدير للموافقة.');
            return;
        }

        try {
            const recordRef = doc(db, `artifacts/${appId}/public/data/attendance_100`, recordId);
            await updateDoc(recordRef, {
                status: status,
                approverId: auth.currentUser.uid,
                approvedAt: new Date().toISOString()
            });
            setMessage(`تم ${status === 'Approved' ? 'الموافقة على' : 'رفض'} الطلب بنجاح!`);
        } catch (error) {
            console.error("Error updating approval status:", error);
            setMessage('فشل تحديث الحالة: ' + error.message);
        }
    };


    // --- منطق جلب سجلات المتابعة ---
    useEffect(() => {
        if (!db) return;

        const q = query(
            collection(db, `artifacts/${appId}/public/data/attendance_100`),
            orderBy('requestedAt', 'desc'),
            // لا نضع حد Limit هنا لعرض السجل الكامل
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
    
    // --- حساب عدد أيام الـ 100% المعتمدة ---
    const approvedCount = useMemo(() => {
        return records.filter(rec => rec.status === 'Approved').length;
    }, [records]);


    // --- العرض ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="bg-teal-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <CheckCircle className="h-8 w-8 ml-3" />
                    تأكيد رصد حضور 100%
                </h1>
                <p className="mt-1 text-sm">الإجراء يتطلب تأكيداً من الوكيل وموافقة من المدير.</p>
            </header>
            
            {/* بطاقة الإدخال (للوكيل) */}
            {(userRole === 'وكيل' || userRole === 'مدير') && (
                <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-teal-500 max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">طلب توثيق حضور 100%</h2>
                    {message && (
                        <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                            {message}
                        </div>
                    )}
                    
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ اليوم الذي تم رصد 100% فيه</label>
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-left"
                                    required
                                />
                            </div>
                            <div className="flex-1 flex items-end">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center bg-teal-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-teal-700 transition duration-300 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال طلب التوثيق للمدير'}
                                    <Send className="h-5 w-5 mr-2" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}


            {/* تقرير موجز ونسبة الإنجاز */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 flex items-center border-b pb-2">
                    <Clock className="h-6 w-6 ml-2" />
                    ملخص أيام الحضور 100%
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-teal-50 rounded-lg text-center">
                        <p className="text-sm font-medium text-teal-700">إجمالي الأيام المعتمدة</p>
                        <p className="text-4xl font-extrabold text-teal-600 mt-1">{approvedCount}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                        <p className="text-sm font-medium text-yellow-700">طلبات قيد الانتظار</p>
                        <p className="text-4xl font-extrabold text-yellow-600 mt-1">{records.filter(rec => rec.status === 'Pending').length}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                        <p className="text-sm font-medium text-red-700">طلبات مرفوضة</p>
                        <p className="text-4xl font-extrabold text-red-600 mt-1">{records.filter(rec => rec.status === 'Rejected').length}</p>
                    </div>
                </div>
            </div>


            {/* جدول سجل المتابعة */}
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">سجل التوثيق التاريخي</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حالة التوثيق</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاريخ الطلب</th>
                                {userRole === 'مدير' && (
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">إجراء المدير</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {records.map((record) => (
                                <tr key={record.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {new Date(record.date).toLocaleDateString('ar-SA')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        {record.status === 'Approved' && <span className="text-green-600 flex items-center"><CheckCircle className="h-4 w-4 ml-1"/> معتمد</span>}
                                        {record.status === 'Pending' && <span className="text-yellow-600 flex items-center"><Clock className="h-4 w-4 ml-1"/> قيد الانتظار</span>}
                                        {record.status === 'Rejected' && <span className="text-red-600 flex items-center"><XCircle className="h-4 w-4 ml-1"/> مرفوض</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(record.requestedAt).toLocaleDateString('ar-SA')}
                                    </td>
                                    {userRole === 'مدير' && record.status === 'Pending' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 space-x-reverse">
                                            <button 
                                                onClick={() => handleApproval(record.id, 'Approved')}
                                                className="text-green-600 hover:text-green-900 font-bold bg-green-100 px-3 py-1 rounded-full text-xs"
                                            >
                                                موافقة
                                            </button>
                                            <button 
                                                onClick={() => handleApproval(record.id, 'Rejected')}
                                                className="text-red-600 hover:text-red-900 font-bold bg-red-100 px-3 py-1 rounded-full text-xs"
                                            >
                                                رفض
                                            </button>
                                        </td>
                                    )}
                                    {userRole === 'مدير' && record.status !== 'Pending' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">تم الإجراء</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {records.length === 0 && <p className="text-center py-6 text-gray-500">لا توجد سجلات توثيق حضور 100% بعد.</p>}
            </div>
        </div>
    );
};

export default Attendance100;
