
import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TeamList from './components/TeamList';
import ActivityList from './components/ActivityList';
import ResultsView from './components/ResultsView';
import DocumentsView from './components/DocumentsView';
import ProfileView from './components/ProfileView'; 
import ScoreEntry from './components/ScoreEntry'; 
import VerifyCertificate from './components/VerifyCertificate'; 
import VenuesView from './components/VenuesView'; 
import JudgesView from './components/JudgesView'; 
import AnnouncementManager from './components/AnnouncementManager'; 
import { AppData, User } from './types';
import { fetchData, loginStandardUser, checkUserPermission, verifyAndLinkLine } from './services/api';
import { initLiff, loginLiff, LiffProfile } from './services/liff';
import { Loader2, LogIn, User as UserIcon, Lock, Globe, AlertCircle, Sparkles, Link as LinkIcon, UserPlus } from 'lucide-react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [liffChecking, setLiffChecking] = useState(true);
  const [loadingText, setLoadingText] = useState('กำลังเริ่มต้นระบบ...');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | any | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Linking Account State
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [pendingLiffProfile, setPendingLiffProfile] = useState<LiffProfile | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);

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
      setLoadingText('กำลังเชื่อมต่อ LINE Service...');
      // 0. Always attempt to init LIFF to ensure SDK capabilities (Sharing) are ready
      let liffProfile: LiffProfile | null = null;
      try {
          liffProfile = await initLiff();
      } catch (e) {
          console.warn("LIFF init warning:", e);
      }

      setLoadingText('ตรวจสอบข้อมูลผู้ใช้งาน...');
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

      // 2. If no session, use LIFF to check if user needs to login/register/link
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
             // Failed: Not linked yet -> Go to Link/Register Flow
             console.log("LINE connected but not linked. Prompting link or register.");
             setPendingLiffProfile(liffProfile);
             setIsLinkingMode(true);
             fetchAppData(); // Pre-fetch data
          }
          setLoading(false);
      }
      
      setLiffChecking(false);
    };
    initialize();
  }, []);

  const fetchAppData = async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadingText('กำลังดาวน์โหลดข้อมูลการแข่งขัน...');
    
    // Artificial delay steps for UX feedback if it takes long
    const timer1 = setTimeout(() => setLoadingText('กำลังประมวลผลข้อมูลทีม...'), 2000);
    const timer2 = setTimeout(() => setLoadingText('กำลังเตรียมตารางสรุปผล...'), 4500);

    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลการแข่งขันได้');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
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
    setLoadingText('กำลังตรวจสอบรหัสผ่าน...');
    
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

  // New: Handle Verify and Link
  const handleVerifyLink = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!linkInput || !pendingLiffProfile) return;
      
      setIsVerifyingLink(true);
      setLinkError('');
      
      try {
          const result = await verifyAndLinkLine(pendingLiffProfile.userId, linkInput);
          if (result.success && result.user) {
              const fullUser = { ...result.user, pictureUrl: pendingLiffProfile.pictureUrl, displayName: pendingLiffProfile.displayName };
              setCurrentUser(fullUser);
              localStorage.setItem('comp_user', JSON.stringify(fullUser));
              setIsLinkingMode(false);
              setIsAuthenticated(true);
          } else {
              setLinkError(result.message || 'ไม่พบข้อมูลที่ตรงกัน');
          }
      } catch (err) {
          setLinkError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      } finally {
          setIsVerifyingLink(false);
      }
  };

  const switchToRegister = () => {
      setIsLinkingMode(false);
      if (pendingLiffProfile) {
          setCurrentUser({
             userid: '',
             username: '',
             name: '',
             surname: '',
             SchoolID: '',
             level: 'user',
             email: pendingLiffProfile.email || '',
             avatarFileId: '',
             userline_id: pendingLiffProfile.userId,
             pictureUrl: pendingLiffProfile.pictureUrl,
             displayName: pendingLiffProfile.displayName
         });
         setIsRegistering(true);
      }
  };

  // Enhanced Loading Screen
  const LoadingScreen = () => (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center z-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[shimmer_2s_infinite]"></div>
            
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center relative z-10 border border-blue-100 shadow-sm">
                    <Sparkles className="w-10 h-10 text-blue-600 animate-pulse" />
                </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-2">CompManager</h3>
            <div className="flex items-center space-x-2 text-blue-600 mb-6 bg-blue-50 px-4 py-1.5 rounded-full">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-medium tracking-wide animate-pulse">{loadingText}</span>
            </div>
            
            <p className="text-gray-400 text-xs text-center max-w-[200px]">
                กำลังเชื่อมต่อกับฐานข้อมูล Google Sheets อาจใช้เวลาสักครู่...
            </p>
        </div>
        <style>{`
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `}</style>
      </div>
  );

  // 1. Initial Loading (Checking LIFF or Fetching Data)
  if (liffChecking || loading) {
    return <LoadingScreen />;
  }

  // 2. Linking Mode (Found LINE but not in DB)
  if (isLinkingMode && pendingLiffProfile) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4 font-kanit">
              <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
                  <div className="bg-amber-500 p-6 text-center text-white relative overflow-hidden">
                      <div className="absolute inset-0 bg-white/10 skew-y-6 transform origin-bottom-left"></div>
                      <div className="relative z-10">
                          <h1 className="text-xl font-bold">ไม่พบ LINE ID ในระบบ</h1>
                          <p className="text-amber-100 text-sm mt-1">บัญชีนี้ยังไม่เคยลงทะเบียนมาก่อน</p>
                      </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <img src={pendingLiffProfile.pictureUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="Profile"/>
                          <div>
                              <div className="text-sm font-bold text-gray-800">{pendingLiffProfile.displayName}</div>
                              <div className="text-xs text-gray-500">บัญชี LINE ปัจจุบัน</div>
                          </div>
                      </div>

                      <form onSubmit={handleVerifyLink} className="space-y-3">
                          <label className="block text-sm font-medium text-gray-700">
                              หากคุณมีบัญชีผู้ใช้อยู่แล้ว กรุณายืนยันตัวตนเพื่อเชื่อมต่อ
                          </label>
                          <div className="relative">
                              <input 
                                  type="text" 
                                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                  placeholder="อีเมล หรือ เบอร์โทร (5 ตัวท้าย)"
                                  value={linkInput}
                                  onChange={(e) => setLinkInput(e.target.value)}
                                  required
                              />
                              <LinkIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                          </div>
                          
                          {linkError && (
                              <div className="text-red-500 text-xs bg-red-50 p-2 rounded-lg flex items-center">
                                  <AlertCircle className="w-4 h-4 mr-1"/> {linkError}
                              </div>
                          )}

                          <button 
                              type="submit" 
                              disabled={isVerifyingLink}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center disabled:opacity-70"
                          >
                              {isVerifyingLink ? <Loader2 className="w-5 h-5 animate-spin"/> : 'ตรวจสอบและเชื่อมต่อ'}
                          </button>
                      </form>

                      <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                          <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-500">หรือ หากยังไม่มีบัญชี</span></div>
                      </div>

                      <button 
                          onClick={switchToRegister}
                          className="w-full border-2 border-blue-500 text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center"
                      >
                          <UserPlus className="w-5 h-5 mr-2" /> ลงทะเบียนสมาชิกใหม่
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // 3. Registration Mode
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

  // 4. Login Screen (Fallback / Standard Login)
  if (!isAuthenticated && !isRegistering && !isLinkingMode) {
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
                            * ระบบจะตรวจสอบบัญชีอัตโนมัติ หากยังไม่เคยลงทะเบียน ระบบจะพาไปหน้าลงทะเบียน
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

  // 5. Main App Content (Authenticated)
  const renderError = () => {
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
        {/* Public Route for Verification - Does not need Layout/Auth */}
        <Routes>
            <Route path="/verify" element={
                data ? <VerifyCertificate data={data} /> : <LoadingScreen />
            } />
            <Route path="*" element={
                // Pass data to Layout for global access (e.g., Scanner Modal)
                <Layout userProfile={currentUser} data={data || undefined}>
                    {renderError() || (data && (
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard data={data} user={currentUser} />} />
                            <Route path="/teams" element={<TeamList data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                            <Route path="/venues" element={<VenuesView data={data} user={currentUser} />} />
                            <Route path="/activities" element={<ActivityList data={data} />} />
                            <Route path="/score" element={<ScoreEntry data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                            <Route path="/judges" element={<JudgesView data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                            <Route path="/results" element={<ResultsView data={data} />} />
                            <Route path="/certificates" element={<DocumentsView data={data} type="certificate" user={currentUser} />} />
                            <Route path="/idcards" element={<DocumentsView data={data} type="idcard" user={currentUser} />} />
                            <Route path="/announcements" element={<AnnouncementManager data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                            <Route path="/schools" element={<PlaceholderMenu title="ข้อมูลโรงเรียน" />} />
                            <Route path="/settings" element={<PlaceholderMenu title="ตั้งค่าระบบ" />} />
                            <Route 
                                path="/profile" 
                                element={currentUser ? <ProfileView user={currentUser} data={data} onUpdateUser={setCurrentUser} /> : <Navigate to="/dashboard" />} 
                            />
                        </Routes>
                    ))}
                </Layout>
            } />
        </Routes>
    </HashRouter>
  );
};

const TrophyIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export default App;

