
import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TeamList from './components/TeamList';
import ActivityList from './components/ActivityList';
import ResultsView from './components/ResultsView';
import DocumentsView from './components/DocumentsView';
import ProfileView from './components/ProfileView'; 
import ScoreEntry from './components/ScoreEntry'; 
import ScoreInputView from './components/ScoreInputView';
import VerifyCertificate from './components/VerifyCertificate'; 
import VenuesView from './components/VenuesView'; 
import JudgesView from './components/JudgesView'; 
import AnnouncementManager from './components/AnnouncementManager'; 
import PrintDocumentsView from './components/PrintDocumentsView';
import LiveScoreView from './components/LiveScoreView'; 
import PublicResultView from './components/PublicResultView'; 
import SettingsView from './components/SettingsView';
import UserManagement from './components/UserManagement'; 
import SchoolManagement from './components/SchoolManagement'; // New Component
import LoginScreen from './components/LoginScreen';
import { AppData, User } from './types';
import { fetchData, checkUserPermission, verifyAndLinkLine } from './services/api';
import { initLiff, loginLiff, LiffProfile } from './services/liff';
import { Loader2, Link as LinkIcon, CheckCircle, AlertCircle, Sparkles, UserPlus } from 'lucide-react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  // 1. Optimistic Load from Cache
  const [data, setData] = useState<AppData | null>(() => {
      try {
          const cached = localStorage.getItem('comp_data');
          return cached ? JSON.parse(cached) : null;
      } catch { return null; }
  });
  
  // 2. Optimistic User Load
  const [currentUser, setCurrentUser] = useState<User | any | null>(() => {
      try {
          const cached = localStorage.getItem('comp_user');
          return cached ? JSON.parse(cached) : null;
      } catch { return null; }
  });

  // Only show loading screen if we have ABSOLUTELY NO data to show
  const [loading, setLoading] = useState(!data);
  const [loadingText, setLoadingText] = useState('กำลังโหลด...');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(!!currentUser);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Linking Account State
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [pendingLiffProfile, setPendingLiffProfile] = useState<LiffProfile | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Initialize System (Parallel Execution)
  useEffect(() => {
    const initialize = async () => {
      // A. Trigger Data Fetch in Background
      const dataPromise = fetchAppData(true); // silent fetch

      // B. Handle Authentication
      if (currentUser) {
          // Fast Path: User already cached, just refresh LIFF token silently
          initLiff().catch(e => console.warn("LIFF Lazy Init:", e));
      } else {
          // Slow Path: Check LIFF or Default to Guest
          try {
              // Try to initialize LIFF quickly
              const liffProfile = await initLiff();
              if (liffProfile) {
                  const dbUser = await checkUserPermission(liffProfile.userId);
                  if (dbUser) {
                      // Found User
                      const fullUser = { ...dbUser, pictureUrl: liffProfile.pictureUrl, displayName: liffProfile.displayName };
                      setCurrentUser(fullUser);
                      localStorage.setItem('comp_user', JSON.stringify(fullUser));
                      setIsAuthenticated(true);
                  } else {
                      // Not linked yet -> Go to Link Mode
                      setPendingLiffProfile(liffProfile);
                      setIsLinkingMode(true);
                  }
              } else {
                  // No LIFF (Browser) -> Default Guest
                  handleGuestAccess();
              }
          } catch (e) {
              // Error -> Default Guest
              console.warn("Auth check failed, defaulting to guest", e);
              handleGuestAccess();
          }
      }
      
      await dataPromise;
    };
    
    initialize();
  }, []);

  const fetchAppData = async (silent = false) => {
    // Only block UI if we have absolutely no data and it's not a silent update
    if (!data && !silent) setLoading(true);
    
    try {
      const result = await fetchData();
      setData(result);
      localStorage.setItem('comp_data', JSON.stringify(result));
    } catch (err) {
      console.error(err);
      if (!data) setError('ไม่สามารถโหลดข้อมูลการแข่งขันได้ (กรุณาตรวจสอบอินเทอร์เน็ต)');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
      const guestUser = { name: 'Guest', isGuest: true, level: 'guest' };
      setCurrentUser(guestUser);
      setIsAuthenticated(true);
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

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      localStorage.setItem('comp_user', JSON.stringify(user));
      setIsAuthenticated(true);
      fetchAppData(true); // Fetch fresh data on login
      
      // Navigate to dashboard
      if (window.location.hash.includes('/login')) {
          window.location.hash = '#/dashboard';
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
        </div>
        <style>{`
            @keyframes shimmer {
                0% { transform: translateY(0); opacity: 0; }
                100% { transform: translateY(100%); }
            }
        `}</style>
      </div>
  );

  // 1. Initial Loading (Only if NO cache and fetch pending)
  if (loading) {
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
  if (isRegistering) {
      if (!data) return <LoadingScreen />;
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

  // 4. Main App Content (Authenticated or Guest)
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

  return (
    <HashRouter>
        {/* Public Routes */}
        <Routes>
            <Route path="/verify" element={data ? <VerifyCertificate data={data} /> : <LoadingScreen />} />
            <Route path="/live" element={data ? <LiveScoreView initialData={data} /> : <LoadingScreen />} />
            <Route path="/share-result" element={data ? <PublicResultView data={data} /> : <LoadingScreen />} />
            <Route path="/score-input" element={data ? <ScoreInputView data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} /> : <LoadingScreen />} />
            <Route path="/login" element={<LoginScreen onLoginSuccess={handleLoginSuccess} />} />
            
            {/* Main App Routes with Layout */}
            <Route path="*" element={
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
                            <Route path="/results" element={<ResultsView data={data} user={currentUser} />} />
                            <Route path="/certificates" element={<DocumentsView data={data} type="certificate" user={currentUser} />} />
                            <Route path="/idcards" element={<DocumentsView data={data} type="idcard" user={currentUser} />} />
                            <Route path="/documents" element={<PrintDocumentsView data={data} user={currentUser} />} />
                            <Route path="/announcements" element={<AnnouncementManager data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                            <Route path="/schools" element={<SchoolManagement data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                            <Route path="/users" element={<UserManagement data={data} currentUser={currentUser} />} />
                            <Route path="/settings" element={<SettingsView data={data} user={currentUser} onDataUpdate={() => fetchAppData(true)} />} />
                            <Route 
                                path="/profile" 
                                element={currentUser && !currentUser.isGuest ? <ProfileView user={currentUser} data={data} onUpdateUser={setCurrentUser} /> : <Navigate to="/login" />} 
                            />
                        </Routes>
                    ))}
                </Layout>
            } />
        </Routes>
    </HashRouter>
  );
};

export default App;
