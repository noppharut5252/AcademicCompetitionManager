import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TeamList from './components/TeamList';
import ActivityList from './components/ActivityList';
import ResultsView from './components/ResultsView';
import DocumentsView from './components/DocumentsView';
import { AppData } from './types';
import { fetchData } from './services/api';
import { initLiff, loginLiff, LiffProfile } from './services/liff';
import { Loader2, LogIn } from 'lucide-react';
import { HashRouter } from 'react-router-dom';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liffLoading, setLiffLoading] = useState(true);
  const [user, setUser] = useState<LiffProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize LIFF
  useEffect(() => {
    const initialize = async () => {
      const profile = await initLiff();
      setUser(profile);
      setLiffLoading(false);
      
      if (profile) {
        // Fetch Data only if logged in
        fetchAppData();
      }
    };
    initialize();
  }, []);

  const fetchAppData = async () => {
    setLoading(true);
    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลการแข่งขันได้');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    loginLiff();
  };

  // Loading State
  if (liffLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not Logged In State
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 font-kanit">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">เข้าสู่ระบบ</h1>
            <p className="text-gray-500 mb-8">ระบบจัดการการแข่งขันวิชาการ<br/>กรุณาเข้าสู่ระบบด้วยบัญชี LINE</p>
            
            <button 
                onClick={handleLogin}
                className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors"
            >
                <span className="mr-2">Log in with LINE</span>
            </button>
        </div>
      </div>
    );
  }

  // Main App Content
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <span className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
            <div className="text-red-500 text-5xl mb-4">:(</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                ลองใหม่อีกครั้ง
            </button>
        </div>
      );
    }

    if (!data) return null;

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={data} />;
      case 'teams':
        return <TeamList data={data} />;
      case 'activities':
        return <ActivityList data={data} />;
      case 'results':
        return <ResultsView data={data} />;
      case 'certificates':
        return <DocumentsView data={data} type="certificate" />;
      case 'idcards':
        return <DocumentsView data={data} type="idcard" />;
      case 'schools':
      case 'settings':
         // For now, map extra items to a placeholder
         return (
             <div className="bg-white p-6 rounded-xl border border-gray-100 text-center py-12">
                 <h3 className="text-lg font-bold text-gray-800 mb-2">เมนูอื่นๆ</h3>
                 <div className="grid grid-cols-2 gap-4 mt-6">
                    <button onClick={() => setActiveTab('activities')} className="p-4 bg-gray-50 rounded-lg text-sm font-medium hover:bg-gray-100">รายการแข่งขัน</button>
                    <button onClick={() => setActiveTab('schools')} className="p-4 bg-gray-50 rounded-lg text-sm font-medium hover:bg-gray-100">ข้อมูลโรงเรียน</button>
                    <button onClick={() => setActiveTab('certificates')} className="p-4 bg-gray-50 rounded-lg text-sm font-medium hover:bg-gray-100">เกียรติบัตร</button>
                    <button onClick={() => setActiveTab('idcards')} className="p-4 bg-gray-50 rounded-lg text-sm font-medium hover:bg-gray-100">บัตรประจำตัว</button>
                 </div>
             </div>
         );
      default:
        return null;
    }
  };

  return (
    <HashRouter>
      <Layout activeTab={activeTab} onTabChange={setActiveTab} userProfile={user}>
        {renderContent()}
      </Layout>
    </HashRouter>
  );
};

export default App;