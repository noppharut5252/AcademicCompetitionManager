import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TeamList from './components/TeamList';
import ActivityList from './components/ActivityList';
import ResultsView from './components/ResultsView';
import DocumentsView from './components/DocumentsView';
import { AppData } from './types';
import { fetchData } from './services/api';
import { Loader2 } from 'lucide-react';
import { HashRouter } from 'react-router-dom';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchData();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError('ไม่สามารถโหลดข้อมูลการแข่งขันได้ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500 font-medium">กำลังโหลดข้อมูล... (Loading)</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
            <div className="text-center">
                <div className="text-red-500 text-5xl mb-4">:(</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
                <p className="text-gray-500">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    ลองใหม่อีกครั้ง
                </button>
            </div>
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
        return (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <SchoolIllustration />
                <h3 className="mt-4 text-lg font-medium text-gray-900">ข้อมูลโรงเรียน (Schools)</h3>
                <p className="text-gray-500">รายชื่อโรงเรียนที่เข้าร่วม {data.schools.length} แห่ง</p>
                <div className="mt-6 text-left max-w-2xl mx-auto">
                    <ul className="divide-y divide-gray-100">
                        {data.schools.slice(0, 5).map(school => (
                            <li key={school.SchoolID} className="py-3 flex justify-between">
                                <span>{school.SchoolName}</span>
                                <span className="text-gray-400 text-sm">{school.SchoolCluster}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
      default:
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="text-center">
                    <p className="text-gray-500 font-medium">ส่วนงาน "{activeTab}" กำลังพัฒนา</p>
                </div>
            </div>
        );
    }
  };

  return (
    <HashRouter>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </HashRouter>
  );
};

const SchoolIllustration = () => (
    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export default App;