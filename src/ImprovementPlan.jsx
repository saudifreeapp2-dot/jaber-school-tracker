import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Target, CheckCircle, Clock, Save, Bell } from 'lucide-react';

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

// المهام الافتراضية (مستمدة من ملف بناء خطة التحسين)
const INITIAL_TASKS = [
    { id: 1, element: 'الشراكات المجتمعية', action: 'البحث عن أولياء أمور لعقد شراكات', responsible: 'لجنة التميز', targetDate: 'إلى الأسبوع العاشر', progress: 0 },
    { id: 2, element: 'استراتيجيات التدريس', action: 'دعم البيئة الصفية التفاعلية في المواد المستهدفة', responsible: 'لجنة التميز، معلمي المواد', targetDate: 'إلى الأسبوع السادس عشر', progress: 0 },
    { id: 3, element: 'تهيئة الساحة المدرسية', action: 'تحديد المسؤول عن إنشاء مظلات ورفع خطاب لإدارة التعليم', responsible: 'مدير المدرسة', targetDate: 'الأسبوع الرابع', progress: 0 },
    { id: 4, element: 'نواتج التعلم (عربي)', action: 'تحديد نقاط الضعف والقوة (اختبارات تشخيصية)', responsible: 'معلمي اللغة العربية', targetDate: 'الأسبوع الرابع', progress: 0 },
    { id: 5, element: 'نواتج التعلم (رياضيات)', action: 'تحديد نقاط الضعف القوة (اختبار تشخيصي)', responsible: 'معلمي الرياضيات', targetDate: 'الأسبوع الخامس', progress: 0 },
    { id: 6, element: 'نواتج التعلم (علوم)', action: 'تنفيذ برامج علاجية للطلاب متدني التحصيل', responsible: 'معلمي العلوم، لجنة التحصيل', targetDate: 'إلى الأسبوع العاشر', progress: 0 },
];

const PLAN_DOC_ID = 'improvement_plan_tasks';

const ImprovementPlan = ({ userRole }) => {
    const [tasks, setTasks] = useState(INITIAL_TASKS);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // --- منطق جلب المهام ---
    useEffect(() => {
        if (!db) return;
        
        const docRef = doc(db, `artifacts/${appId}/public/data/improvement_plan`, PLAN_DOC_ID);
        
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists() && docSnap.data().tasks) {
                setTasks(docSnap.data().tasks);
            }
            setIsLoading(false);
        }).catch(error => {
            console.error("Error fetching tasks:", error);
            setMessage('فشل في جلب المهام: ' + error.message);
            setIsLoading(false);
        });
    }, [db]);
    
    // --- تحديث نسبة الإنجاز ---
    const handleProgressChange = (id, value) => {
        const numericValue = Math.min(100, Math.max(0, parseInt(value) || 0));
        setTasks(prevTasks => prevTasks.map(task => 
            task.id === id ? { ...task, progress: numericValue } : task
        ));
    };
    
    // --- حفظ المهام (للمدير) ---
    const handleSaveTasks = async (e) => {
        e.preventDefault();
        if (!db || userRole !== 'مدير') {
            setMessage('خطأ: لا تملك صلاحية المدير لحفظ البيانات.');
            return;
        }

        setIsSaving(true);
        setMessage('');

        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/improvement_plan`, PLAN_DOC_ID);
            await setDoc(docRef, {
                tasks: tasks,
                lastUpdated: new Date().toISOString(),
                updatedBy: auth.currentUser.uid
            });

            setMessage('تم تحديث المهام ونسب الإنجاز بنجاح.');

        } catch (error) {
            console.error("Error saving tasks:", error);
            setMessage('فشل في حفظ البيانات: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- حساب الإنجاز الكلي ---
    const overallProgress = useMemo(() => {
        if (tasks.length === 0) return 0;
        const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
        return (totalProgress / (tasks.length * 100) * 100).toFixed(1);
    }, [tasks]);

    // --- العرض ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="bg-teal-600 text-white p-6 rounded-xl shadow-lg mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <Target className="h-8 w-8 ml-3" />
                    متابعة خطة التحسين والانطلاق
                </h1>
                <p className="mt-1 text-sm">المسؤول: مدير المدرسة (متابعة أسبوعية لنسبة إنجاز المهام).</p>
            </header>
            
            <div className="max-w-6xl mx-auto">
                {message && (
                    <div className={`p-3 rounded-lg text-white mb-4 ${message.includes('بنجاح') ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message}
                    </div>
                )}

                {/* ملخص الإنجاز الكلي والتنبيه الأسبوعي */}
                <div className="bg-white p-6 rounded-xl shadow-2xl mb-8 border-t-4 border-teal-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-4 bg-teal-50 rounded-lg">
                            <p className="text-sm font-medium text-teal-700">الإنجاز الكلي للخطة</p>
                            <p className="text-5xl font-extrabold text-teal-600 mt-1">{overallProgress}%</p>
                            <p className="text-xs text-gray-500 mt-2">معدل الإنجاز لجميع المهام المسجلة.</p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg border-r-4 border-yellow-500">
                            <p className="text-sm font-medium text-yellow-800 flex items-center">
                                <Bell className="h-5 w-5 ml-1" />
                                تنبيه المدير الأسبوعي (كل أحد 7:00 صباحاً)
                            </p>
                            <p className="mt-2 text-gray-700 font-semibold">
                                *مطلوب لهذا الأسبوع*: تحديث نسب الإنجاز لجميع المهام التي كان من المقرر الانتهاء منها أو متابعتها.
                            </p>
                        </div>
                    </div>
                </div>

                {/* جدول المهام وتحديث الإنجاز */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-teal-700 border-b pb-2">جدول مهام خطة التحسين</h2>
                    
                    <form onSubmit={handleSaveTasks}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المهام (العنصر/الإجراء)</th>
                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المسؤول</th>
                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموعد المستهدف</th>
                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">نسبة الإنجاز (0-100%)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tasks.map((task) => (
                                        <tr key={task.id} className={task.progress === 100 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                                            <td className="px-3 py-4 text-sm font-medium text-gray-900 max-w-xs">
                                                <p className="font-semibold">{task.element}</p>
                                                <p className="text-xs text-gray-500 mt-1">{task.action}</p>
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">{task.responsible}</td>
                                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{task.targetDate}</td>
                                            <td className="px-3 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2 space-x-reverse max-w-xs">
                                                    {userRole === 'مدير' ? (
                                                        <input
                                                            type="number"
                                                            value={task.progress}
                                                            onChange={(e) => handleProgressChange(task.id, e.target.value)}
                                                            min="0"
                                                            max="100"
                                                            className={`w-16 p-2 border rounded-lg text-center ${task.progress === 100 ? 'border-green-500 bg-green-100 text-green-700' : 'border-gray-300'}`}
                                                        />
                                                    ) : (
                                                        <span className={`w-16 p-2 rounded-lg text-center font-bold ${task.progress === 100 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                            {task.progress}%
                                                        </span>
                                                    )}
                                                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                                                        <div 
                                                            style={{ width: `${task.progress}%` }} 
                                                            className={`h-2 rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-green-500' : 'bg-teal-500'}`}
                                                        ></div>
                                                    </div>
                                                    {task.progress === 100 && <CheckCircle className="h-5 w-5 text-green-600 ml-1" />}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {userRole === 'مدير' && (
                            <div className="mt-6 text-center">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition duration-300 disabled:opacity-50 flex items-center mx-auto"
                                >
                                    {isSaving ? 'جارٍ الحفظ...' : 'حفظ التحديثات'}
                                    <Save className="h-5 w-5 mr-2" />
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ImprovementPlan;
