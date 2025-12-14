
import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TeamList from './components/TeamList';
import ActivityList from './components/ActivityList';
import ResultsView from './components/ResultsView';
import DocumentsView from './components/DocumentsView';
import ProfileView from './components/ProfileView'; // Import ProfileView
import ScoreEntry from './components/ScoreEntry'; // Import ScoreEntry
import { AppData, User } from './types';
import { fetchData, loginStandardUser, checkUserPermission } from './services/api';
import { initLiff, loginLiff, LiffProfile } from './services/liff';
import { Loader2, LogIn, User as UserIcon, Lock, Globe, AlertCircle } from 'lucide-react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [liffChecking, setLiffChecking] = useState(true);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | any | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login Form State
  const [loginMethod, setLoginMethod] = useState<'line' | 'standard'>('line');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize LIFF and Session on mount
  useEffect(() => {
    const initialize = async () => {
      // 0. Always attempt to init LIFF to ensure SDK capabilities (Sharing) are ready
      // This is non-blocking for local session check, but crucial for features.
      let liffProfile: LiffProfile | null = null;
      try {
          liffProfile = await initLiff();
      } catch (e) {
          console.warn("LIFF init warning:", e);
      }

      // 1. Check Local Storage for existing session
      const savedUserStr = localStorage.getItem('comp_user');
      if (savedUserStr) {
          try {
              const savedUser = JSON.parse(savedUserStr);
              setCurrentUser(savedUser);
              setIsAuthenticated(true);
              setLiffChecking(false);
              fetchAppData();
              return; 
          } catch(e) {
              localStorage.removeItem('comp_user');
          }
      }

      // 2. If no session, use LIFF to check if user needs to login/register
      if (liffProfile) {
          setLoading(true);
          const dbUser = await checkUserPermission(liffProfile.userId);
          
          if (dbUser) {
             // Success: Found in DB
             const fullUser = { ...dbUser, pictureUrl: liffProfile.pictureUrl, displayName: liffProfile.displayName };
             setCurrentUser(fullUser);
             localStorage.setItem('comp_user', JSON.stringify(fullUser));
             setIsAuthenticated(true);
             fetchAppData();
          } else {
             // Failed: Not linked yet -> Go to Registration Flow
             console.log("LINE connected but not linked. Redirecting to register.");
             setCurrentUser({
                 userid: '',
                 username: '',
                 name: '', // Will be filled in registration
                 surname: '',
                 SchoolID: '',
                 level: 'user',
                 email: liffProfile.email || '',
                 avatarFileId: '',
                 userline_id: liffProfile.userId,
                 pictureUrl: liffProfile.pictureUrl,
                 displayName: liffProfile.displayName
             });
             setIsRegistering(true);
             fetchAppData(); // Need data for schools list in registration
          }
          setLoading(false);
      }
      
      setLiffChecking(false);
    };
    initialize();
  }, []);

  const fetchAppData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลการแข่งขันได้');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLineLogin = () => {
    loginLiff();
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
        const user = await loginStandardUser(username, password);
        if (user) {
            setCurrentUser(user);
            localStorage.setItem('comp_user', JSON.stringify(user));
            setIsAuthenticated(true);
            fetchAppData();
        } else {
            setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch (err) {
        setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleGuestAccess = () => {
      setCurrentUser({ name: 'Guest', isGuest: true } as User);
      setIsAuthenticated(true);
      fetchAppData();
  };

  const handleRegistrationComplete = (newUser: User) => {
      setCurrentUser(newUser);
      localStorage.setItem('comp_user', JSON.stringify(newUser));
      setIsRegistering(false);
      setIsAuthenticated(true);
  };

  // Skeleton Loader Component
  const SkeletonLoader = () => (
    <div className="space-y-6 p-2">
       {/* Hero Skeleton */}
       <div className="h-32 bg-gray-200 rounded-2xl animate-pulse"></div>
       
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-4">
               {/* News Skeletons */}
               <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
               <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
           </div>
           <div className="space-y-4">
               {/* Stat Skeletons */}
               <div className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
               <div className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
               <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
           </div>
       </div>
    </div>
  );

  // 1. Initial Loading (Checking LIFF) - Full Page Spinner
  if (liffChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // 2. Registration Mode (Found LINE but no User)
  if (isRegistering && data) {
      return (
        <div className="min-h-screen bg-gray-50 p-4 font-kanit">
             <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden mt-10">
                 <div className="bg-green-600 p-6 text-center text-white">
                     <h1 className="text-2xl font-bold">ลงทะเบียนสมาชิกใหม่</h1>
                     <p className="text-green-100 mt-1">กรุณากรอกข้อมูลเพื่อเชื่อมต่อกับบัญชี LINE ของคุณ</p>
                 </div>
                 <div className="p-6">
                    <ProfileView 
                        user={currentUser} 
                        data={data} 
                        onUpdateUser={handleRegistrationComplete}
                        isRegistrationMode={true} 
                    />
                 </div>
             </div>
        </div>
      )
  }

  // 3. Login Screen
  if (!isAuthenticated && !isRegistering) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4 font-kanit">
        <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-blue-600 p-6 text-center">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <TrophyIcon className="w-8 h-8 text-blue-600" />
                 </div>
                 <h1 className="text-2xl font-bold text-white">CompManager</h1>
                 <p className="text-blue-100 text-sm mt-1">ระบบจัดการการแข่งขันวิชาการ</p>
            </div>

            <div className="p-6">
                {/* Login Method Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button 
                        className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'line' ? 'border-[#06C755] text-[#06C755]' : 'border-transparent text-gray-500'}`}
                        onClick={() => setLoginMethod('line')}
                    >
                        LINE Login
                    </button>
                    <button 
                        className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'standard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                        onClick={() => setLoginMethod('standard')}
                    >
                        เข้าระบบทั่วไป
                    </button>
                </div>

                {loginMethod === 'line' ? (
                    <div className="text-center py-4">
                        <p className="text-gray-500 mb-6 text-sm">เข้าใช้งานสะดวกรวดเร็วผ่านบัญชี LINE ของคุณ</p>
                        <button 
                            onClick={handleLineLogin}
                            className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                        >
                            <span className="mr-2 font-bold">Log in with LINE</span>
                        </button>
                        <p className="text-xs text-gray-400 mt-4">
                            * หากยังไม่มีบัญชี ระบบจะพาท่านไปยังหน้าลงทะเบียนอัตโนมัติ
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleStandardLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสผ่าน (Password)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {loginError && (
                            <div className="text-red-500 text-xs text-center">{loginError}</div>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors shadow-sm disabled:opacity-70"
                        >
                            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'เข้าสู่ระบบ'}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <button 
                        onClick={handleGuestAccess}
                        className="text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center mx-auto"
                    >
                        <Globe className="w-4 h-4 mr-1" />
                        เข้าชมในฐานะบุคคลทั่วไป (Guest)
                    </button>
                </div>
            </div>
        </div>
        <div className="text-center mt-6 text-gray-400 text-xs">
            &copy; 2024 Competition Manager System
        </div>
      </div>
    );
  }

  // 4. Main App Content (Authenticated)
  const renderLoadingOrError = () => {
    if (loading) {
      return <SkeletonLoader />;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
            <div className="text-red-500 text-5xl mb-4">:(</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button 
                onClick={() => { setError(null); fetchAppData(); }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                ลองใหม่อีกครั้ง
            </button>
        </div>
      );
    }
    return null;
  };

  const PlaceholderMenu = ({ title }: { title: string }) => (
      <div className="bg-white p-6 rounded-xl border border-gray-100 text-center py-12">
          <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm">ส่วนนี้อยู่ระหว่างการพัฒนา</p>
      </div>
  );

  return (
    <HashRouter>
      <Layout userProfile={currentUser}>
        {renderLoadingOrError() || (data && (
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard data={data} user={currentUser} />} />
                <Route path="/teams" element={<TeamList data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                <Route path="/activities" element={<ActivityList data={data} />} />
                <Route path="/score" element={<ScoreEntry data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                <Route path="/results" element={<ResultsView data={data} />} />
                <Route path="/certificates" element={<DocumentsView data={data} type="certificate" />} />
                <Route path="/idcards" element={<DocumentsView data={data} type="idcard" />} />
                <Route path="/schools" element={<PlaceholderMenu title="ข้อมูลโรงเรียน" />} />
                <Route path="/settings" element={<PlaceholderMenu title="ตั้งค่าระบบ" />} />
                <Route 
                    path="/profile" 
                    element={currentUser ? <ProfileView user={currentUser} data={data} onUpdateUser={setCurrentUser} /> : <Navigate to="/dashboard" />} 
                />
            </Routes>
        ))}
      </Layout>
    </HashRouter>
  );
};

const TrophyIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export default App;

