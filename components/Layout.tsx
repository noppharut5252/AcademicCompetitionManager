
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LayoutDashboard, Users, Trophy, School, Settings, LogOut, Award, FileBadge, IdCard, LogIn, UserCircle, Edit3, ScanLine, X, Camera, Search, ChevronRight, LayoutGrid, RotateCcw, Loader2, Zap, MapPin, Gavel, Megaphone, Printer, Hash, MonitorPlay, Menu, PanelLeftClose, PanelLeft } from 'lucide-react';
import { logoutLiff } from '../services/liff';
import { User, AppData } from '../types';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';
// @ts-ignore
import jsQR from 'jsqr';

interface LayoutProps {
  children: React.ReactNode;
  userProfile?: User | any; // Supports both our User type and LIFF profile
  data?: AppData;
}

const ScannerModal = ({ 
    isOpen, 
    onClose, 
    onSearch, 
    data, 
    user 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSearch: (id: string) => void; 
    data?: AppData;
    user?: User | any;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<'scan' | 'manual'>('scan');
    const [manualId, setManualId] = useState(''); // Stores Team ID
    const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
    const [cameraError, setCameraError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const myTeams = useMemo(() => {
        if (!data || !user) return [];
        // Ensure arrays exist
        let teams = data.teams || [];
        let activities = data.activities || [];
        let schools = data.schools || [];

        const role = user.level?.toLowerCase();

        if (role === 'admin' || role === 'area') {
        } else if (role === 'group_admin') {
            const userSchool = schools.find(s => s.SchoolID === user.SchoolID);
            if (userSchool) {
                const userClusterId = userSchool.SchoolCluster;
                teams = teams.filter(t => {
                    const teamSchool = schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                    return teamSchool && teamSchool.SchoolCluster === userClusterId;
                });
            } else {
                teams = [];
            }
        } else if (role === 'school_admin' || role === 'user') {
            const userSchool = schools.find(s => s.SchoolID === user.SchoolID);
            if (user.SchoolID) {
                teams = teams.filter(t => 
                    t.schoolId === user.SchoolID || 
                    (userSchool && t.schoolId === userSchool.SchoolName)
                );
            } else {
                teams = teams.filter(t => t.createdBy === user.userid);
            }
        } else if (role === 'score') {
             const allowedActivities = user.assignedActivities || [];
             teams = teams.filter(t => allowedActivities.includes(t.activityId));
        } else if (user.isGuest) {
             teams = []; 
        }

        if (viewLevel === 'area') {
            teams = teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
        }

        return teams.map(t => {
            const activityName = activities.find(a => a.id === t.activityId)?.name || t.activityId;
            return {
                label: `${t.teamName} (${activityName})`,
                value: t.teamId
            };
        });
    }, [data, user, viewLevel]);

    useEffect(() => {
        if (isOpen && mode === 'scan') {
            const timer = setTimeout(() => startCamera(), 300);
            return () => clearTimeout(timer);
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, mode]);

    const startCamera = async () => {
        stopCamera(); 
        setCameraError(false);
        setErrorMessage('');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("MediaDevices API not available");
            setCameraError(true);
            setErrorMessage("Browser does not support camera access or context is insecure (http).");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            handleStream(stream);
        } catch (err: any) {
            console.warn("Back camera access failed, trying fallback...", err);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true 
                });
                handleStream(stream);
            } catch (fallbackErr: any) {
                console.error("Camera access denied or not available", fallbackErr);
                setCameraError(true);
                setErrorMessage(fallbackErr.message || "Could not start video source.");
            }
        }
    };

    const handleStream = (stream: MediaStream) => {
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true"); 
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(e => console.error("Error playing video:", e));
                requestAnimationFrame(scanFrame);
            };
        }
    };

    const scanFrame = () => {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                console.log("Found QR code:", code.data);
                ctx.beginPath();
                ctx.lineWidth = 4;
                ctx.strokeStyle = "#00FF00";
                ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
                ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
                ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
                ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
                ctx.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
                ctx.stroke();
                stopCamera();
                onSearch(code.data);
                return;
            }
        }
        animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    const stopCamera = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch(e) {
                    console.warn("Error stopping track", e);
                }
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualId.trim()) {
            onSearch(`?id=${manualId}&level=${viewLevel}`);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-center p-4 bg-black/50 text-white absolute top-0 w-full z-10 backdrop-blur-sm">
                <h3 className="font-bold text-lg flex items-center">
                    {mode === 'scan' ? <ScanLine className="w-5 h-5 mr-2" /> : <IdCard className="w-5 h-5 mr-2" />}
                    {mode === 'scan' ? 'สแกน QR Code' : 'เลือกบัตรประจำตัว'}
                </h3>
                <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {mode === 'scan' ? (
                    <>
                        {!cameraError ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
                                <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="relative w-72 h-72 border-2 border-blue-400/50 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_15px_#4ade80] animate-[scan_2s_ease-in-out_infinite]"></div>
                                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>
                                    </div>
                                    <div className="mt-8 flex items-center space-x-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 animate-pulse">
                                        <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                                        <span className="text-white text-sm font-medium tracking-wide">กำลังค้นหา QR Code...</span>
                                    </div>
                                    <p className="mt-2 text-white/60 text-xs">วาง QR Code ให้อยู่ในกรอบสีฟ้า</p>
                                </div>
                                <style>{`@keyframes scan { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(280px); opacity: 0; } }`}</style>
                            </div>
                        ) : (
                            <div className="text-center text-white p-6 max-w-sm">
                                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                                <p className="text-lg font-bold mb-2">ไม่สามารถเปิดกล้องได้</p>
                                <p className="text-sm text-gray-400 mb-2">กรุณาตรวจสอบการอนุญาตเข้าถึงกล้องในเบราว์เซอร์</p>
                                {errorMessage && <p className="text-xs text-red-400 mb-6 bg-red-900/30 p-2 rounded">{errorMessage}</p>}
                                <div className="flex flex-col gap-3">
                                    <button onClick={() => startCamera()} className="px-6 py-2 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 border border-white/20 flex items-center justify-center">
                                        <RotateCcw className="w-4 h-4 mr-2" /> ลองใหม่อีกครั้ง
                                    </button>
                                    <button onClick={() => setMode('manual')} className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700">
                                        ใช้การค้นหาทีมแทน
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full max-w-sm px-6">
                        <div className="bg-white rounded-2xl p-6 shadow-xl space-y-5">
                            <div className="text-center">
                                <h4 className="text-gray-800 font-bold text-lg">ค้นหา Digital ID Card</h4>
                                <p className="text-xs text-gray-500 mt-1">เลือกรายการและทีมของท่าน</p>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setViewLevel('cluster')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <LayoutGrid className="w-4 h-4 mr-1.5" /> ระดับกลุ่มฯ
                                </button>
                                <button onClick={() => setViewLevel('area')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Trophy className="w-4 h-4 mr-1.5" /> ระดับเขตฯ
                                </button>
                            </div>
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">เลือกทีม ({user?.level === 'admin' ? 'ทั้งหมด' : 'จากโรงเรียนของท่าน'})</label>
                                    <SearchableSelect options={myTeams} value={manualId} onChange={setManualId} placeholder="-- ค้นหาชื่อทีม / รายการ --" icon={<Search className="h-4 w-4" />} />
                                    {myTeams.length === 0 && <p className="text-xs text-red-500 mt-1 text-center">ไม่พบทีมในระดับ{viewLevel === 'cluster' ? 'กลุ่มฯ' : 'เขตฯ'} ที่คุณมีสิทธิ์เข้าถึง</p>}
                                </div>
                                <button type="submit" disabled={!manualId} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:shadow-none">
                                    เปิดบัตรประจำตัว <ChevronRight className="w-5 h-5 ml-1" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-black p-4 pb-8 flex justify-center gap-4">
                <button onClick={() => setMode('scan')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'scan' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>Scan QR</button>
                <button onClick={() => setMode('manual')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'manual' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>ID Card</button>
            </div>
        </div>
    );
};

// --- Main Layout ---

const Layout: React.FC<LayoutProps> = ({ children, userProfile, data }) => {
  const isGuest = !userProfile || userProfile.isGuest;
  const navigate = useNavigate();
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop

  const currentPath = location.pathname.substring(1) || 'dashboard';
  const activeTab = currentPath.split('/')[0] || 'dashboard';

  const handleLogout = (e: React.MouseEvent) => {
      e.stopPropagation();
      localStorage.removeItem('comp_user'); 
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
  const isAdminOrArea = ['admin', 'area'].includes(userRole);
  const canScore = ['admin', 'area', 'group_admin', 'score'].includes(userRole);
  const canManageAnnouncements = ['admin', 'area', 'group_admin'].includes(userRole);
  
  const canViewPrintDocs = true; 
  
  const menuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
    { id: 'live', label: 'Live Score', icon: MonitorPlay },
    { id: 'teams', label: 'ทีม', icon: Users },
    { id: 'venues', label: 'สนาม/วันแข่ง', icon: MapPin },
    { id: 'activities', label: 'รายการ', icon: Trophy },
    ...(canScore ? [{ id: 'score', label: 'บันทึกคะแนน', icon: Edit3 }] : []),
    { id: 'results', label: 'ผลรางวัล', icon: Award },
    ...(canViewPrintDocs ? [{ id: 'documents', label: 'เอกสารการแข่งขัน', icon: Printer }] : []),
    { id: 'certificates', label: 'เกียรติบัตร', icon: FileBadge },
    { id: 'idcards', label: 'บัตร', icon: IdCard },
    { id: 'judges', label: 'ทำเนียบกรรมการ', icon: Gavel },
    ...(canManageAnnouncements ? [{ id: 'announcements', label: 'ข่าว/คู่มือ', icon: Megaphone }] : []),
    { id: 'schools', label: 'โรงเรียน', icon: School },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-kanit">
      
      <ScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        data={data}
        user={userProfile}
        onSearch={(scannedValue) => {
            setShowScanner(false);
            
            // 1. Check for Score Input URL (contains 'score-input' and 'activityId')
            // Using case insensitive check and more robust regex
            const lowerVal = scannedValue.toLowerCase();
            if (lowerVal.includes('score-input') && lowerVal.includes('activityid=')) {
                // Try to extract ID using flexible regex
                const match = scannedValue.match(/[?&][aA]ctivity[iI]d=([^&]+)/);
                if (match && match[1]) {
                    setTimeout(() => navigate(`/score-input?activityId=${match[1]}`), 100);
                    return;
                }
            }

            // 2. Default ID Card Logic
            let teamId = scannedValue;
            let levelParam = '';
            try {
                if (scannedValue.includes('id=')) {
                    const urlStr = scannedValue.startsWith('http') || scannedValue.startsWith('/') || scannedValue.startsWith('?') ? scannedValue : `http://dummy.com/${scannedValue}`;
                    const finalUrlStr = scannedValue.startsWith('?') ? `http://dummy.com/${scannedValue}` : urlStr;
                    const url = new URL(finalUrlStr);
                    let idParam = url.searchParams.get('id');
                    let lvl = url.searchParams.get('level');
                    if (!idParam && url.hash.includes('?')) {
                        const hashQuery = url.hash.split('?')[1];
                        const hashParams = new URLSearchParams(hashQuery);
                        idParam = hashParams.get('id');
                        lvl = hashParams.get('level');
                    }
                    if (idParam) teamId = idParam;
                    if (lvl) levelParam = lvl;
                }
            } catch (e) {
                console.log("Not a valid URL, using as ID");
            }
            setTimeout(() => {
                navigate(`/idcards?id=${teamId}${levelParam ? `&level=${levelParam}` : ''}`); 
            }, 100);
        }}
      />

      {/* Desktop Sidebar with Transitions */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex-col transition-transform duration-300 ease-in-out hidden md:flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center cursor-pointer" onClick={() => handleNav('dashboard')}>
            <Trophy className="w-8 h-8 text-blue-600 mr-2" />
            <span className="text-lg font-bold text-gray-900 tracking-tight block">CompManager</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
            <PanelLeftClose className="w-5 h-5" />
          </button>
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
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + (userProfile?.displayName || userProfile?.name || 'User'); }}
                />
            ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <UserCircle className="w-6 h-6" />
                </div>
            )}
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-medium text-gray-700 truncate">{userProfile?.displayName || userProfile?.name || 'Guest'}</p>
              <p className="text-xs text-gray-500 truncate">{isGuest ? 'Read Only' : (userProfile?.level || 'User')}</p>
            </div>
            <button className={`ml-1 ${isGuest ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-red-500'}`} title={isGuest ? "เข้าสู่ระบบ" : "ออกจากระบบ"} onClick={handleLogout}>
              {isGuest ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col mb-20 md:mb-0 h-screen overflow-hidden bg-gray-50 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}
      >
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center" onClick={() => handleNav('dashboard')}>
                <Trophy className="w-6 h-6 text-blue-600 mr-2" />
                <span className="font-bold text-gray-900 text-lg">CompManager</span>
            </div>
            <div className="flex items-center gap-2">
                 <div className="flex items-center gap-2 cursor-pointer" onClick={handleProfileClick}>
                     <div className="text-right">
                        <p className="text-xs font-bold text-gray-700 max-w-[100px] truncate">{userProfile?.displayName || userProfile?.name || 'Guest'}</p>
                     </div>
                     {userProfile?.pictureUrl ? (
                        <img src={userProfile.pictureUrl} alt="User" className="h-8 w-8 rounded-full bg-gray-200" />
                     ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><UserCircle className="w-6 h-6" /></div>
                     )}
                 </div>
                 <button onClick={handleLogout} className="ml-1 text-gray-500">{isGuest ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}</button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 relative">
            {/* Desktop Sidebar Toggle (Visible when closed) */}
            {!isSidebarOpen && (
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="hidden md:flex fixed top-4 left-4 z-30 p-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all"
                    title="แสดงเมนู"
                >
                    <PanelLeft className="w-5 h-5" />
                </button>
            )}

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

      {/* Updated Mobile Bottom Navigation Bar (Grid 5) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-30 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-5 h-full relative">
            {/* 1. หน้าหลัก */}
            <button onClick={() => handleNav('dashboard')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] font-medium">หน้าหลัก</span>
            </button>
            
            {/* 2. ทีม */}
            <button onClick={() => handleNav('teams')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'teams' ? 'text-blue-600' : 'text-gray-400'}`}>
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-medium">ทีม</span>
            </button>

            {/* 3. สแกน (Center Floating) */}
            <div className="relative flex justify-center items-center">
                 <div className="absolute -top-6">
                    <button onClick={() => setShowScanner(true)} className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white border-4 border-gray-50 transform transition-transform active:scale-95 group">
                        <ScanLine className="w-7 h-7 group-hover:scale-110 transition-transform" />
                    </button>
                 </div>
                 <span className="text-[10px] font-medium text-gray-400 mt-8">สแกน</span>
            </div>

            {/* 4. ผลรางวัล */}
            <button onClick={() => handleNav('results')} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === 'results' ? 'text-blue-600' : 'text-gray-400'}`}>
                <Award className="w-5 h-5" />
                <span className="text-[10px] font-medium">ผลรางวัล</span>
            </button>
            
            {/* 5. เมนูอื่นๆ */}
            <button onClick={() => setIsMobileMenuOpen(true)} className={`flex flex-col items-center justify-center space-y-1 ${!['dashboard', 'teams', 'results'].includes(activeTab) ? 'text-blue-600' : 'text-gray-400'}`}>
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">เมนูอื่นๆ</span>
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm md:hidden flex flex-col justify-end" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="bg-white rounded-t-2xl p-4 animate-in slide-in-from-bottom-10 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-gray-800 text-lg">เมนูทั้งหมด</h3>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {menuItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => { handleNav(item.id); setIsMobileMenuOpen(false); }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeTab === item.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <item.icon className="w-6 h-6 mb-2" />
                            <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
