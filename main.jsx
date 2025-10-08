import React from 'react';
import ReactDOM from 'react-dom/client';
// هذا الملف يقوم بتهيئة بيئة React وتضمين المكون الرئيسي (App)

// يتم استخدام مكتبة React و ReactDOM
const App = () => {
  // ملاحظة: في المشروع الحقيقي على جهازك، يجب أن تقوم App.jsx باستدعاء
  // جميع شاشات التطبيق ومنطق المصادقة.
  // هذا الكود هو مجرد مؤشر نجاح مؤقت.

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-extrabold text-blue-600 mb-2">تم حل خطأ المسار</h1>
        <p className="text-gray-700">
          هذه الشاشة تؤكد أن ملف Main.jsx يعمل بنجاح.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          يرجى التأكد من أن جميع ملفات `.jsx` موجودة في مجلد `src` مع إعدادات Vite/package.json للنشر.
        </p>
      </div>
    </div>
  );
};

// يتم تفعيل تنسيق CSS العام هنا مباشرة بسبب مشكلة استيراد الملف المنفصل
const GlobalStyles = () => (
  <style>
    {`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');
      body {
        font-family: 'Tajawal', sans-serif;
        direction: rtl;
        text-align: right;
        margin: 0;
        padding: 0;
      }
      /* تنسيق عام للعناصر التفاعلية */
      .btn-primary {
        background-color: #2563EB; /* blue-600 */
        color: white;
        font-weight: bold;
        padding: 0.5rem 1rem;
        border-radius: 1rem; /* rounded-xl */
        transition: all 0.3s;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      }
      .btn-primary:hover {
        background-color: #1D4ED8; /* blue-700 */
      }
      /* تنسيق البطاقات */
      .card {
        background-color: white;
        padding: 1.5rem;
        border-radius: 1rem; /* rounded-2xl */
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border: 1px solid #F3F4F6; /* border-gray-100 */
      }
    `}
  </style>
);

const RootComponent = () => (
    <React.StrictMode>
        <GlobalStyles />
        <App />
    </React.StrictMode>
);

// تهيئة تطبيق React
ReactDOM.createRoot(document.getElementById('root')).render(<RootComponent />);