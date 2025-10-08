import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle, FileText, Scale } from 'lucide-react';

// --- الثوابت والمتغيرات العالمية (يتم توفيرها من بيئة التشغيل) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

// يتم تهيئة Firebase
let db;
if (firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
}

// قائمة الملاحظات والأدوار المسؤولة
const NOTES_CONFIG = [
    { id: 'absenteeism_records', title: '1. تثبيت الغياب', responsible: 'وكيل شؤون الطلاب', icon: Clock, collection: 'absenteeism_records', key: 'absenceRate' },
    { id: 'attendance_100', title: '2. حضور 100%', responsible: 'وكيل شؤون الطلاب & المدير', icon: CheckCircle, collection: 'attendance_100', key: 'approvalRate' },
    { id: 'behavioral_issues', title: '3. المشكلات السلوكية', responsible: 'الموجه الطلابي', icon: Scale, collection: 'behavioral_issues', key: 'issueRate' },
    { id: 'gap_analysis', title: '4. الفجوة', responsible: 'مدير المدرسة', icon: TrendingUp, collection: 'gap_analysis', key: 'isPositive' },
    { id: 'school_results', title: '5. نتائج المدرسة', responsible: 'مدير المدرسة', icon: BarChart3, collection: 'school_results', key: 'progressRate' },
    { id: 'improvement_plan', title: '6. خطة التحسين', responsible: 'مدير المدرسة', icon: AlertTriangle, collection: 'improvement_plan', key: 'overallProgress' },
    { id: 'proficiency_rate', title: '7. نسبة الإتقان', responsible: 'مدير المدرسة', icon: Award, collection: 'proficiency_rate', key: 'targetAchievement' },
    { id: 'reports_tracking', title: '8. البلاغات', responsible: 'مدير المدرسة', icon: FileText, collection: 'reports_tracking', key: 'completionRate' },
];

/**
 * دالة وهمية للحصول على أحدث حالة لكل ملاحظة
 * (في التطبيق الحقيقي، هذه الدالة ستحتاج إلى جلب وتحليل البيانات من Firestore لكل شاشة)
 */
const fetchSummaryData = async () => {
    if (!db) return {};

    const summaries = {};

    // 1. تثبيت الغياب
    const absenteeismQuery = query(collection(db, `artifacts/${appId}/public/data/absenteeism_records`), orderBy('timestamp', 'desc'), limit(30));
    const absenteeismSnapshot = await getDocs(absenteeismQuery);
    if (!absenteeismSnapshot.empty) {
        const records = absenteeismSnapshot.docs.map(doc => doc.data());
        // حساب إجمالي نسبة إنجاز التأكيد (كمثال)
        const totalConfirmed = records.filter(r => r.isConfirmed).length;
        const totalRecords = records.length;
        const completion = totalRecords > 0 ? (totalConfirmed / totalRecords) * 100 : 0;
        summaries['absenteeism_records'] = { rate: completion.toFixed(1), unit: '% إنجاز الرصد', status: completion >= 90 ? 'High' : 'Low' };
    }

    // 2. حضور 100%
    const attendanceQuery = query(collection(db, `artifacts/${appId}/public/data/attendance_100`), orderBy('requestedAt', 'desc'));
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const approvedCount = attendanceSnapshot.docs.filter(doc => doc.data().status === 'Approved').length;
    summaries['attendance_100'] = { rate: approvedCount, unit: 'يوم معتمد', status: approvedCount > 0 ? 'High' : 'Low' };

    // 3. المشكلات السلوكية
    const behaviorQuery = query(collection(db, `artifacts/${appId}/public/data/behavioral_issues`), orderBy('timestamp', 'desc'));
    const behaviorSnapshot = await getDocs(behaviorQuery);
    const last7DaysCount = behaviorSnapshot.docs.filter(doc => new Date(doc.data().timestamp) > new Date(new Date().setDate(new Date().getDate() - 7))).length;
    summaries['behavioral_issues'] = { rate: last7DaysCount, unit: 'مشكلة (أسبوع)', status: last7DaysCount < 5 ? 'High' : 'Low' };

    // 4. الفجوة (نفترض 100% إنجاز إذا كانت إيجابية)
    const gapDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/gap_analysis`, 'current_gap_status'));
    const isPositive = gapDoc.exists() && gapDoc.data().isPositive;
    summaries['gap_analysis'] = { rate: isPositive ? 100 : 0, unit: '% حالة إيجابية', status: isPositive ? 'High' : 'Low', note: isPositive ? 'إيجابية' : 'سلبية' };

    // 5. نتائج المدرسة (متوسط التحسن لجميع المواد)
    const resultsDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/school_results`, 'sixth_grade_results'));
    let avgProgress = 0;
    if (resultsDoc.exists() && resultsDoc.data().materials) {
        const materials = resultsDoc.data().materials;
        const totalProgress = materials.reduce((sum, mat) => {
            if (mat.preTest === 0) return sum + (mat.postTest > 0 ? 1 : 0);
            return sum + (mat.postTest - mat.preTest) / mat.preTest;
        }, 0);
        avgProgress = (totalProgress / materials.length) * 100;
    }
    summaries['school_results'] = { rate: avgProgress.toFixed(1), unit: '% متوسط تحسن', status: avgProgress >= 10 ? 'High' : 'Low' };

    // 6. خطة التحسين
    const planDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/improvement_plan`, 'improvement_plan_tasks'));
    let overallProgress = 0;
    if (planDoc.exists() && planDoc.data().tasks) {
        const tasks = planDoc.data().tasks;
        const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
        overallProgress = (totalProgress / (tasks.length * 100)) * 100;
    }
    summaries['improvement_plan'] = { rate: overallProgress.toFixed(1), unit: '% إنجاز كلي', status: overallProgress >= 70 ? 'High' : 'Low' };

    // 7. نسبة الإتقان (متوسط تحقيق المستهدف)
    const proficiencyDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/proficiency_rate`, 'sixth_grade_proficiency'));
    let targetAchievedCount = 0;
    if (proficiencyDoc.exists() && proficiencyDoc.data().materials) {
        const materials = proficiencyDoc.data().materials;
        targetAchievedCount = materials.filter(mat => mat.rate >= mat.target).length;
    }
    summaries['proficiency_rate'] = { rate: targetAchievedCount, unit: 'مادة حققت الهدف', status: targetAchievedCount >= 2 ? 'High' : 'Low' };

    // 8. البلاغات
    const reportsQuery = query(collection(db, `artifacts/${appId}/public/data/reports_tracking`), orderBy('timestamp', 'desc'), limit(4));
    const reportsSnapshot = await getDocs(reportsQuery);
    const reportRecords = reportsSnapshot.docs.map(doc => doc.data());
    const totalRaised = reportRecords.reduce((sum, r) => sum + r.raisedCount, 0);
    const totalClosed = reportRecords.reduce((sum, r) => sum + r.closedCount, 0);
    const completionRate = totalRaised > 0 ? (totalClosed / totalRaised) * 100 : 0;
    summaries['reports_tracking'] = { rate: completionRate.toFixed(1), unit: '% إغلاق (آخر شهر)', status: completionRate >= 80 ? 'High' : 'Low' };

    return summaries;
};


const ReportsDashboard = () => {
    const [data, setData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setIsLoading(true);
        fetchSummaryData()
            .then(summary => {
                setData(summary);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Failed to fetch all summaries:", error);
                setMessage('حدث خطأ أثناء جلب التقارير المجمعة.');
                setIsLoading(false);
            });
    }, []);

    // تحديد حالة اللون
    const getStatusColor = (status) => {
        if (status === 'High') return 'bg-green-100 text-green-700 border-green-500';
        if (status === 'Low') return 'bg-red-100 text-red-700 border-red-500';
        return 'bg-yellow-100 text-yellow-700 border-yellow-500';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
            <header className="app-header mb-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="app-header-title">
                        <BarChart3 className="h-10 w-10 ml-3" />
                        لوحة تقارير الإنجاز المجمعة
                    </h1>
                    <p className="mt-2 text-gray-200">ملخص لنسب الإنجاز والمؤشرات الرئيسية للملاحظات الثمانية.</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {isLoading && (
                    <div className="text-center p-8 text-teal-600 font-semibold">جارٍ تجميع البيانات من جميع الملاحظات...</div>
                )}
                
                {message && (
                    <div className="alert-error p-3 mb-4">{message}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {NOTES_CONFIG.map((note) => {
                        const summary = data[note.id];
                        const statusClass = summary ? getStatusColor(summary.status) : 'bg-gray-100 text-gray-500 border-gray-400';
                        const Icon = note.icon;
                        
                        return (
                            <div key={note.id} className="app-card border-t-4 shadow-xl">
                                <div className="flex justify-between items-start mb-3 border-b pb-2">
                                    <h3 className="text-xl font-bold text-dark-teal">{note.title}</h3>
                                    <Icon className="h-6 w-6 text-teal" />
                                </div>
                                
                                <p className="text-gray-600 text-sm mb-4">
                                    المسؤولون: <span className="font-semibold text-teal">{note.responsible}</span>
                                </p>
                                
                                <div className={`p-3 rounded-lg text-center font-medium ${statusClass}`}>
                                    <p className="text-sm font-semibold">{summary ? note.title.split('. ')[1] : 'انتظر...'}</p>
                                    <p className="text-5xl font-extrabold mt-1">
                                        {summary ? summary.rate : '--'}
                                    </p>
                                    <p className="text-sm mt-1">{summary ? summary.unit : 'لا توجد بيانات'}</p>
                                </div>
                                
                                {summary?.note && (
                                    <p className="mt-3 text-xs text-gray-600 border-t pt-2">
                                        ملاحظة: <span className="font-semibold">{summary.note}</span>
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default ReportsDashboard;
