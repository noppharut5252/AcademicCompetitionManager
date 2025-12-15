
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Trophy, School, Settings, LogOut, Award, FileBadge, IdCard, LogIn, UserCircle, Edit3, ScanLine, X, Camera, Search, ChevronRight } from 'lucide-react';
import { logoutLiff } from '../services/liff';
import { User } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  userProfile?: User | any; // Supports both our User type and LIFF profile
}

// --- Scanner Modal Component ---
const ScannerModal = ({ isOpen, onClose, onSearch }: { isOpen: boolean; onClose: () => void; onSearch: (id: string) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mode, setMode] = useState<'scan' | 'manual'>('scan');
    const [manualId, setManualId] = useState('');
    const [cameraError, setCameraError] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (isOpen && mode === 'scan') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, mode]);

    const startCamera = async () => {
        setCameraError(false);
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("MediaDevices API not available");
            setCameraError(true);
            return;
        }

        try {
            // Attempt 1: Specific constraint for back camera
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            handleStream(stream);
        } catch (err) {
            console.warn("Back camera access failed, trying fallback...", err);
            try {
                // Attempt 2: Fallback to any available video source
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true 
                });
                handleStream(stream);
            } catch (fallbackErr) {
                console.error("Camera access denied or not available", fallbackErr);
                setCameraError(true);
            }
        }
    };

    const handleStream = (stream: MediaStream) => {
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualId.trim()) {
            onSearch(manualId);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/50 text-white absolute top-0 w-full z-10">
                <h3 className="font-bold text-lg flex items-center">
                    {mode === 'scan' ? <ScanLine className="w-5 h-5 mr-2" /> : <IdCard className="w-5 h-5 mr-2" />}
                    {mode === 'scan' ? 'สแกน QR Code' : 'กรอกรหัสบัตร'}
                </h3>
                <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {mode === 'scan' ? (
                    <>
                        {!cameraError ? (
                            <div className="relative w-full h-full">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-cover"
                                />
                                {/* Overlay Scanning Frame */}
                                <div className="absolute inset-0 border-[40px] border-black/50 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-64 border-2 border-white/50 rounded-xl relative">
                                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                    </div>
                                </div>
                                <p className="absolute bottom-20 w-full text-center text-white/80 text-sm">วาง QR Code ให้อยู่ในกรอบ</p>
                            </div>
                        ) : (
                            <div className="text-center text-white p-6">
                                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                                <p className="text-lg font-bold mb-2">ไม่สามารถเปิดกล้องได้</p>
                                <p className="text-sm text-gray-400 mb-6">กรุณาอนุญาตให้เข้าถึงกล้อง หรือใช้การกรอกรหัสแทน</p>
                                <button 
                                    onClick={() => setMode('manual')}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700"
                                >
                                    กรอกรหัส ID
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full max-w-sm px-6">
                        <div className="bg-white rounded-2xl p-6 shadow-xl">
                            <h4 className="text-gray-800 font-bold text-lg mb-4 text-center">ค้นหา Digital ID Card</h4>
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Team ID / Student ID</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                        <input 
                                            type="text" 
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono text-lg uppercase"
                                            placeholder="T001"
                                            value={manualId}
                                            onChange={(e) => setManualId(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center"
                                >
                                    ค้นหา <ChevronRight className="w-5 h-5 ml-1" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Toggle */}
            <div className="bg-black p-4 pb-8 flex justify-center gap-4">
                <button 
                    onClick={() => setMode('scan')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'scan' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    Scan QR
                </button>
                <button 
                    onClick={() => setMode('manual')}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'manual' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    ID Card
                </button>
            </div>
        </div>
    );
};

// --- Main Layout ---

const Layout: React.FC<LayoutProps> = ({ children, userProfile }) => {
  const isGuest = !userProfile || userProfile.isGuest;
  const navigate = useNavigate();
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);

  // Determine active tab from current path
  const currentPath = location.pathname.substring(1) || 'dashboard';
  const activeTab = currentPath.split('/')[0] || 'dashboard';

  const handleLogout = (e: React.MouseEvent) => {
      e.stopPropagation();
      localStorage.removeItem('comp_user'); // Clear session
      if (isGuest) {
          window.location.reload();
      } else {
          logoutLiff(); 
      }
  };

  const handleNav = (id: string) => {
      navigate(`/${id}`);
  };

  const handleProfileClick = () => {
    if(!isGuest) {
      navigate('/profile');
    }
  };

  const userRole = userProfile?.level?.toLowerCase();
  const canScore = ['admin', 'area', 'group_admin', 'score'].includes(userRole);

  const menuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
    { id: 'teams', label: 'ทีม', icon: Users },
    { id: 'activities', label: 'รายการ', icon: Trophy },
    ...(canScore ? [{ id: 'score', label: 'บันทึกคะแนน', icon: Edit3 }] : []),
    { id: 'results', label: 'ผลรางวัล', icon: Award },
    { id: 'certificates', label: 'เกียรติบัตร', icon: FileBadge },
    { id: 'idcards', label: 'บัตร', icon: IdCard },
    { id: 'schools', label: 'โรงเรียน', icon: School },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-kanit">
      
      {/* Scanner Modal */}
      <ScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onSearch={(id) => {
            // Navigate to ID Cards with search param (Assuming DocumentsView handles filtering, or just go there)
            // Ideally we pass search state, but for now redirecting to the route
            navigate('/idcards');
            // Note: In a real implementation with global state, we would set the search term here.
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 cursor-pointer" onClick={() => handleNav('dashboard')}>
          <Trophy className="w-8 h-8 text-blue-600 mr-2" />
          <div>
            <span className="text-lg font-bold text-gray-900 tracking-tight block">CompManager</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                ${activeTab === item.id 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div 
            className={`flex items-center p-2 rounded-lg transition-colors ${!isGuest ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={handleProfileClick}
            title={!isGuest ? "แก้ไขข้อมูลส่วนตัว" : ""}
          >
            {userProfile?.pictureUrl || userProfile?.avatarFileId ? (
                <img 
                src={userProfile?.pictureUrl || `https://drive.google.com/thumbnail?id=${userProfile?.avatarFileId}`} 
                alt="User" 
                className="h-10 w-10 rounded-full bg-gray-200 object-cover"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + (userProfile?.displayName || userProfile?.name || 'User');
                }}
                />
            ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <UserCircle className="w-6 h-6" />
                </div>
            )}
            
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-medium text-gray-700 truncate">
                  {userProfile?.displayName || userProfile?.name || 'Guest'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                  {isGuest ? 'Read Only' : (userProfile?.level || 'User')}
              </p>
            </div>
            <button 
                className={`ml-1 ${isGuest ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-red-500'}`}
                title={isGuest ? "เข้าสู่ระบบ" : "ออกจากระบบ"}
                onClick={handleLogout}
            >
              {isGuest ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 mb-20 md:mb-0 h-screen overflow-hidden bg-gray-50">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center" onClick={() => handleNav('dashboard')}>
                <Trophy className="w-6 h-6 text-blue-600 mr-2" />
                <span className="font-bold text-gray-900 text-lg">CompManager</span>
            </div>
            <div className="flex items-center gap-2">
                 <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={handleProfileClick}
                 >
                     <div className="text-right">
                        <p className="text-xs font-bold text-gray-700 max-w-[100px] truncate">{userProfile?.displayName || userProfile?.name || 'Guest'}</p>
                     </div>
                     {userProfile?.pictureUrl ? (
                        <img 
                            src={userProfile.pictureUrl} 
                            alt="User" 
                            className="h-8 w-8 rounded-full bg-gray-200"
                        />
                     ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <UserCircle className="w-6 h-6" />
                        </div>
                     )}
                 </div>
                 <button onClick={handleLogout} className="ml-1 text-gray-500">
                     {isGuest ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                 </button>
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto">
                {isGuest && (
                    <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center">
                        <UserCircle className="w-4 h-4 mr-2" />
                        คุณกำลังใช้งานในฐานะผู้เยี่ยมชม (Guest) สามารถดูข้อมูลได้เท่านั้น
                    </div>
                )}
                {children}
            </div>
        </main>
      </div>

      {/* Enhanced Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-30 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="relative flex justify-between items-center h-full px-2">
            
            {/* Left Items */}
            <div className="flex-1 flex justify-around">
                <button
                    onClick={() => handleNav('dashboard')}
                    className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[10px] font-medium">หน้าหลัก</span>
                </button>
                <button
                    onClick={() => handleNav('teams')}
                    className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'teams' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <Users className="w-6 h-6" />
                    <span className="text-[10px] font-medium">ทีม</span>
                </button>
            </div>

            {/* Center Floating Button (Scan) */}
            <div className="relative -top-6 w-16 flex justify-center">
                <div className="absolute top-4 w-16 h-8 bg-transparent rounded-full shadow-[0_8px_0_0_white]"></div> {/* Fake Curve effect filler if needed, simplified here */}
                <button
                    onClick={() => setShowScanner(true)}
                    className="w-16 h-16 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white border-4 border-gray-50 transform transition-transform active:scale-95"
                >
                    <ScanLine className="w-8 h-8" />
                </button>
            </div>

            {/* Right Items */}
            <div className="flex-1 flex justify-around">
                <button
                    onClick={() => handleNav('results')}
                    className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'results' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <Award className="w-6 h-6" />
                    <span className="text-[10px] font-medium">ผลรางวัล</span>
                </button>
                <button
                    onClick={() => handleNav('settings')} // Or a dedicated menu route
                    className={`flex flex-col items-center justify-center w-full space-y-1 ${['settings','certificates','idcards','profile','score'].includes(activeTab) ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <Settings className="w-6 h-6" />
                    <span className="text-[10px] font-medium">เมนู</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;

