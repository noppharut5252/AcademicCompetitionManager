
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, Team, TeamStatus, User, CertificateTemplate } from '../types';
import { Search, Printer, IdCard, Smartphone, CheckCircle, X, ChevronLeft, ChevronRight, User as UserIcon, GraduationCap, School, MapPin, LayoutGrid, Trophy, Lock, QrCode, Maximize2, Minimize2, Share2, Download, Settings, FileBadge, Loader2, Calendar, Clock, Sparkles, Filter, CheckSquare, Square, Trash2 } from 'lucide-react';
import CertificateConfigModal from './CertificateConfigModal';
import { getCertificateConfig } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { shareIdCard } from '../services/liff';
import QRCode from 'qrcode';

interface DocumentsViewProps {
  data: AppData;
  type: 'certificate' | 'idcard';
  user?: User | null;
}

// --- Skeleton Component ---
const DocumentsSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="h-5 w-32 bg-gray-200 rounded"></div>
                        <div className="h-4 w-12 bg-gray-100 rounded"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-48 bg-gray-100 rounded"></div>
                        <div className="h-3 w-40 bg-gray-50 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg w-full"></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="h-10 bg-gray-100 rounded-lg"></div>
                        <div className="h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// --- Component to render QR Code Image safely ---
const QRCodeImage = ({ text, size = 150, className }: { text: string, size?: number, className?: string }) => {
    const [src, setSrc] = useState<string>('');

    useEffect(() => {
        if (!text) return;
        QRCode.toDataURL(text, { width: size, margin: 1 })
            .then((url) => setSrc(url))
            .catch((err) => {
                console.error("QR Error", err);
                setSrc(''); 
            });
    }, [text, size]);

    if (!src) return <div className={`bg-gray-100 animate-pulse ${className}`} />;
    return <img src={src} alt="QR Code" className={className} />;
};

// --- Single Expanded Digital ID Card ---
const ExpandedIdCard = ({ 
    members, 
    initialIndex, 
    team, 
    activity, 
    schoolName, 
    viewLevel, 
    onClose,
    data
}: { 
    members: any[], 
    initialIndex: number, 
    team: Team, 
    activity: string, 
    schoolName: string, 
    viewLevel: 'cluster' | 'area', 
    onClose: () => void,
    data: AppData
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [translateX, setTranslateX] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
    const minSwipeDistance = 80; 

    const currentMember = members[currentIndex];
    const role = currentMember.role;

    const getPhotoUrl = (urlOrId: string) => {
        if (!urlOrId) return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png";
        if (urlOrId.startsWith('http')) return urlOrId;
        return `https://drive.google.com/thumbnail?id=${urlOrId}`;
    };

    const imageUrl = currentMember.image || (currentMember.photoDriveId ? getPhotoUrl(currentMember.photoDriveId) : getPhotoUrl(''));
    const prefix = currentMember.prefix || '';
    const name = currentMember.name || `${currentMember.firstname || ''} ${currentMember.lastname || ''}`;
    const fullName = `${prefix}${name}`.trim();
    
    const isArea = viewLevel === 'area';
    const bgGradient = isArea 
        ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900';
    const levelText = isArea ? 'DISTRICT LEVEL' : 'CLUSTER LEVEL';

    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const scheduleInfo = useMemo(() => {
        if (!data || !data.venues) return null;
        for (const v of data.venues) {
            const s = v.scheduledActivities?.find(act => act.activityId === team.activityId);
            if (s) return { venueName: v.name, ...s };
        }
        return null;
    }, [data, team.activityId]);

    const compDate = scheduleInfo ? scheduleInfo.date : 'TBA';
    const compLocation = scheduleInfo ? `${scheduleInfo.venueName} ${scheduleInfo.building || ''} ${scheduleInfo.room || ''}` : 'TBA';
    const compTime = scheduleInfo ? scheduleInfo.timeRange : '';

    const qrUrl = `${window.location.origin}${window.location.pathname}#/idcards?id=${team.teamId}&level=${viewLevel}`;

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            cardRef.current?.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleShare = async () => {
        try {
            await shareIdCard(team.teamName, schoolName, fullName, role, team.teamId, imageUrl, levelText, viewLevel);
        } catch(e) {
            alert('เกิดข้อผิดพลาดในการแชร์: ' + e);
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            setIsAnimating(true);
            setTranslateX(100);
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setTranslateX(-100);
                requestAnimationFrame(() => {
                    setTranslateX(0);
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 300);
        }
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < members.length - 1) {
            setIsAnimating(true);
            setTranslateX(-100);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setTranslateX(100);
                requestAnimationFrame(() => {
                    setTranslateX(0);
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 300);
        }
    };

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
        setTouchCurrent(e.targetTouches[0].clientX);
        setIsAnimating(false);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const currentX = e.targetTouches[0].clientX;
        setTouchCurrent(currentX);
        const diff = currentX - touchStart;
        if ((currentIndex === 0 && diff > 0) || (currentIndex === members.length - 1 && diff < 0)) {
            setTranslateX(diff * 0.3);
        } else {
            setTranslateX(diff);
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchCurrent) return;
        const distance = touchCurrent - touchStart;
        const isLeftSwipe = distance < -minSwipeDistance;
        const isRightSwipe = distance > minSwipeDistance;
        setIsAnimating(true);
        if (isLeftSwipe && currentIndex < members.length - 1) {
            setTranslateX(-window.innerWidth);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setTranslateX(window.innerWidth);
                requestAnimationFrame(() => {
                    setTranslateX(0);
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 200);
        } else if (isRightSwipe && currentIndex > 0) {
            setTranslateX(window.innerWidth);
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setTranslateX(-window.innerWidth);
                requestAnimationFrame(() => {
                    setTranslateX(0);
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 200);
        } else {
            setTranslateX(0);
            setTimeout(() => setIsAnimating(false), 300);
        }
        setTouchStart(null);
        setTouchCurrent(null);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <style>{`
                @keyframes holo {
                    0% { background-position: 0% 50%; opacity: 0.5; }
                    50% { background-position: 100% 50%; opacity: 1; }
                    100% { background-position: 0% 50%; opacity: 0.5; }
                }
                .holo-overlay {
                    background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.4) 30%, transparent 40%, transparent 60%, rgba(255,255,255,0.4) 70%, transparent 80%);
                    background-size: 200% 200%;
                    animation: holo 3s linear infinite;
                    mix-blend-mode: overlay;
                    pointer-events: none;
                }
            `}</style>
            {!isFullscreen && (
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
                    <div className="flex gap-3">
                        <button onClick={handleShare} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors"><Share2 className="w-6 h-6" /></button>
                        <button onClick={toggleFullscreen} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors"><Maximize2 className="w-6 h-6" /></button>
                    </div>
                </div>
            )}
            {currentIndex > 0 && (
                <button onClick={handlePrev} className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md z-50 transition-all active:scale-95"><ChevronLeft className="w-8 h-8" /></button>
            )}
            {currentIndex < members.length - 1 && (
                <button onClick={handleNext} className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md z-50 transition-all active:scale-95"><ChevronRight className="w-8 h-8" /></button>
            )}
            <div 
                ref={cardRef} 
                className={`relative w-full h-full max-w-md bg-white flex flex-col overflow-hidden shadow-2xl ${isFullscreen ? '' : 'rounded-none sm:rounded-3xl sm:h-auto sm:aspect-[9/16] sm:max-h-[90vh]'}`}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                style={{ transform: `translateX(${translateX}px)`, transition: isAnimating ? 'transform 0.3s ease-out' : 'none' }}
            >
                <div className="absolute inset-0 holo-overlay z-20"></div>
                <div className="absolute top-4 right-4 z-20 bg-black/40 text-white text-[10px] px-2.5 py-1 rounded-full font-bold backdrop-blur-sm border border-white/20">{currentIndex + 1} / {members.length}</div>
                <div className={`relative h-[25%] ${bgGradient} rounded-b-[30px] shadow-lg shrink-0`}>
                     <div className="absolute top-12 left-0 right-0 text-center">
                         <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white tracking-widest uppercase border border-white/30">{levelText}</span>
                     </div>
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-200">
                                <img src={imageUrl} alt={fullName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; }} />
                            </div>
                            <div className={`absolute bottom-1 right-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md text-white ${role === 'Teacher' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>{role === 'Teacher' ? <UserIcon className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}</div>
                        </div>
                     </div>
                </div>
                <div className="pt-20 px-6 text-center shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{fullName}</h2>
                    <p className="text-sm text-gray-500 font-medium mb-1">{role === 'Teacher' ? 'Teacher / Trainer' : 'Student / Competitor'}</p>
                    <p className="text-sm text-gray-600 line-clamp-1">{schoolName}</p>
                </div>
                <div className="px-6 py-4 shrink-0">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-3">
                        <div className="col-span-2 flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-full ${isArea ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}><CheckCircle className="w-4 h-4" /></div>
                                <div className="text-left">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Status</p>
                                    <p className="text-xs font-bold text-green-600">Active / Checked In</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Check-in Time</p>
                                <p className="text-xs font-bold text-gray-700">{timeStr}</p>
                            </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 col-span-2">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1"/>Venue & Schedule</p>
                            <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight mb-1">{compLocation}</p>
                            <p className="text-xs text-gray-500 flex items-center"><Calendar className="w-3 h-3 mr-1"/> {compDate} {compTime ? `• ${compTime}` : ''}</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
                    <div className="bg-white p-2 rounded-2xl shadow-lg border-2 border-dashed border-gray-200 w-full max-w-[240px] aspect-square flex items-center justify-center relative overflow-hidden group">
                        <QRCodeImage text={qrUrl} size={300} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-mono">ID: {team.teamId}</p>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-xs font-bold text-gray-400 w-12 text-right">{currentIndex + 1}</span>
                        <div className="flex gap-1.5">{members.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? `w-6 ${isArea ? 'bg-purple-600' : 'bg-blue-600'}` : 'w-1.5 bg-gray-300'}`} />
                        ))}</div>
                        <span className="text-xs font-bold text-gray-400 w-12 text-left">/ {members.length}</span>
                    </div>
                    <p className="text-center text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">Swipe to view next member</p>
                </div>
            </div>
        </div>
    );
};

// --- DigitalIdCard (Preview Card) ---
interface DigitalIdCardProps {
    member: any;
    role: string;
    team: Team;
    activity: string;
    schoolName: string;
    viewLevel: 'cluster' | 'area';
    onClick: () => void;
}

const DigitalIdCard: React.FC<DigitalIdCardProps> = ({ member, role, team, activity, schoolName, viewLevel, onClick }) => {
    const getPhotoUrl = (urlOrId: string) => {
        if (!urlOrId) return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png";
        if (urlOrId.startsWith('http')) return urlOrId;
        return `https://drive.google.com/thumbnail?id=${urlOrId}`;
    };
    const imageUrl = member.image || (member.photoDriveId ? getPhotoUrl(member.photoDriveId) : getPhotoUrl(''));
    const prefix = member.prefix || '';
    const name = member.name || `${member.firstname || ''} ${member.lastname || ''}`;
    const fullName = `${prefix}${name}`.trim();
    const isArea = viewLevel === 'area';
    const bgGradient = isArea ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900' : 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900';
    const levelText = isArea ? 'DISTRICT' : 'CLUSTER';

    return (
        <div onClick={onClick} className="group relative w-full aspect-[3/4.5] bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden border border-gray-200 cursor-pointer transform transition-all duration-300 hover:-translate-y-1">
            <div className={`absolute top-0 left-0 right-0 h-1/3 ${bgGradient} z-0`}></div>
            <div className="relative z-10 flex flex-col items-center pt-6 px-4 h-full pb-4">
                <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase mb-4 border border-white/20 px-2 py-0.5 rounded-full">{levelText}</span>
                <div className="relative w-24 h-24 mb-3">
                    <img src={imageUrl} alt={fullName} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-gray-100 group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; }} />
                    <div className={`absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-sm text-white ${role === 'Teacher' ? 'bg-indigo-500' : 'bg-green-500'}`}>{role === 'Teacher' ? <UserIcon className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}</div>
                </div>
                <div className="text-center mb-auto w-full px-2">
                    <h3 className="text-gray-900 font-bold text-lg leading-tight mb-1 line-clamp-2">{fullName}</h3>
                    <p className="text-xs text-gray-500">{role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'ผู้เข้าแข่งขัน'}</p>
                </div>
                <div className="w-full text-center mt-4 pt-3 border-t border-dashed border-gray-200">
                    <div className="flex items-center justify-center text-xs text-gray-400 mb-2"><Sparkles className="w-3 h-3 mr-1 text-yellow-500" /><span>Tap to Expand</span></div>
                    <p className="text-[10px] text-gray-400 font-mono">ID: {team.teamId}</p>
                </div>
            </div>
        </div>
    );
};

const DigitalIdModal = ({ team, data, onClose, viewLevel }: { team: Team, data: AppData, onClose: () => void, viewLevel: 'cluster' | 'area' }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
    const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;
    let teachers: any[] = [];
    let students: any[] = [];
    let memberSource = team.members;
    if (viewLevel === 'area' && team.stageInfo) {
        try {
            const areaInfo = JSON.parse(team.stageInfo);
            if (areaInfo.members) memberSource = areaInfo.members;
        } catch {}
    }
    try {
        const rawMembers = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
        if (rawMembers) {
            if (Array.isArray(rawMembers)) { students = rawMembers; } 
            else if (typeof rawMembers === 'object') {
                teachers = Array.isArray(rawMembers.teachers) ? rawMembers.teachers : [];
                students = Array.isArray(rawMembers.students) ? rawMembers.students : [];
            }
        }
    } catch { }
    const allMembers = [...teachers.map(t => ({...t, role: 'Teacher'})), ...students.map(s => ({...s, role: 'Student'}))];
    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            {expandedIndex !== null && (
                <ExpandedIdCard members={allMembers} initialIndex={expandedIndex} team={team} activity={activity} schoolName={school} viewLevel={viewLevel} onClose={() => setExpandedIndex(null)} data={data} />
            )}
            <div className="bg-gray-100 w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center font-kanit"><Smartphone className="w-5 h-5 mr-2 text-blue-600" />บัตรประจำตัวดิจิทัล ({viewLevel === 'area' ? 'ระดับเขตพื้นที่' : 'ระดับกลุ่มเครือข่าย'})</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2"><span className="font-medium">{team.teamName}</span><span className="text-gray-300">|</span><span>{school}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500" /></button>
                </div>
                <div className="overflow-y-auto p-6 flex-1 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
                        {allMembers.map((m, idx) => (<DigitalIdCard key={`m-${idx}`} member={m} role={m.role} team={team} activity={activity} schoolName={school} viewLevel={viewLevel} onClick={() => setExpandedIndex(idx)} />))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main View Component ---
const DocumentsView: React.FC<DocumentsViewProps> = ({ data, type, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedTeamForDigital, setSelectedTeamForDigital] = useState<Team | null>(null);
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('area');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [certificateTemplates, setCertificateTemplates] = useState<Record<string, CertificateTemplate>>({});
  
  // Selection State for Batch Printing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      const teamIdParam = searchParams.get('id');
      const levelParam = searchParams.get('level');
      if (teamIdParam && type === 'idcard' && data.teams.length > 0) {
          const foundTeam = data.teams.find(t => t.teamId === teamIdParam);
          if (foundTeam) {
              if (levelParam === 'area' || levelParam === 'cluster') setViewLevel(levelParam as 'cluster' | 'area');
              setSelectedTeamForDigital(foundTeam);
          }
      }
  }, [searchParams, data.teams, type]);

  useEffect(() => {
      const loadTemplates = async () => {
          if (type === 'certificate') {
              const configs = await getCertificateConfig();
              setCertificateTemplates(configs);
          }
      };
      loadTemplates();
  }, [type]);

  const categories = useMemo(() => {
      return ['All', ...Array.from(new Set(data.activities.map(a => a.category))).sort()];
  }, [data.activities]);

  const userRole = user?.level?.toLowerCase();
  const isSuperUser = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const canConfigureCert = isSuperUser || isGroupAdmin;

  // Filter Logic with User Permission
  const filteredTeams = useMemo(() => {
    return data.teams.filter(team => {
        // User Role Filter
        if (user) {
            const role = user.level?.toLowerCase();
            if (role === 'school_admin' || role === 'user') {
                const userSchoolInfo = data.schools.find(s => s.SchoolID === user.SchoolID);
                let hasAccess = false;
                if (user.SchoolID) {
                   if (team.schoolId === user.SchoolID) hasAccess = true;
                   else if (userSchoolInfo && team.schoolId === userSchoolInfo.SchoolName) hasAccess = true;
                }
                if (!hasAccess && team.createdBy === user.userid) hasAccess = true;
                if (!hasAccess) return false;
            } else if (role === 'group_admin') {
                const userSchoolInfo = data.schools.find(s => s.SchoolID === user.SchoolID);
                const teamSchoolInfo = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                if (userSchoolInfo && teamSchoolInfo && userSchoolInfo.SchoolCluster !== teamSchoolInfo.SchoolCluster) return false;
            }
        }

        // viewLevel Filter (Area requires rank 1 and qualified flag)
        if (viewLevel === 'area') {
            const isRep = String(team.flag).toUpperCase() === 'TRUE';
            const isRank1 = String(team.rank) === '1'; 
            if (!isRep || !isRank1) return false;
        }
        
        const activity = data.activities.find(a => a.id === team.activityId);
        const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
        const term = searchTerm.toLowerCase();
        
        // Category Filter
        if (categoryFilter !== 'All' && activity?.category !== categoryFilter) return false;

        return (
            team.teamName.toLowerCase().includes(term) || 
            team.teamId.toLowerCase().includes(term) ||
            (school && school.SchoolName.toLowerCase().includes(term)) ||
            (activity && activity.name.toLowerCase().includes(term))
        );
    });
  }, [data.teams, data.schools, data.activities, searchTerm, categoryFilter, user, viewLevel]);

  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const isAllSelected = paginatedTeams.length > 0 && paginatedTeams.every(t => selectedIds.has(t.teamId));

  const toggleSelect = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      const newSet = new Set(selectedIds);
      if (isAllSelected) {
          paginatedTeams.forEach(t => newSet.delete(t.teamId));
      } else {
          paginatedTeams.forEach(t => newSet.add(t.teamId));
      }
      setSelectedIds(newSet);
  };

  const handlePrint = async (teamsToPrint: Team[]) => {
      if (teamsToPrint.length === 0) return;
      setIsGenerating(true);
      
      const verifyBase = `${window.location.origin}${window.location.pathname}#/verify?id=`;
      const appBase = `${window.location.origin}${window.location.pathname}#/idcards?level=${viewLevel}&id=`;
      
      const qrMap: Record<string, string> = {};
      await Promise.all(teamsToPrint.map(async (t) => {
          try {
              const url = type === 'certificate' ? `${verifyBase}${t.teamId}` : `${appBase}${t.teamId}`;
              qrMap[t.teamId] = await QRCode.toDataURL(url, { margin: 1, width: 300 });
          } catch (e) { console.error(e); }
      }));

      // Delay to ensure loading state renders
      await new Promise(resolve => setTimeout(resolve, 800));

      const printWindow = window.open('', '_blank');
      if (!printWindow) { setIsGenerating(false); alert('Pop-up ถูกบล็อก'); return; }

      let allHtml = '';
      
      for (const team of teamsToPrint) {
          const activity = data.activities.find(a => a.id === team.activityId);
          const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          const schoolName = schoolObj?.SchoolName || team.schoolId;
          const clusterID = schoolObj?.SchoolCluster;
          const clusterName = clusterID ? data.clusters.find(c => c.ClusterID === clusterID)?.ClusterName : '';
          const qrCodeBase64 = qrMap[team.teamId];

          let allMembers: any[] = [];
          let memberSource = team.members;
          if (viewLevel === 'area' && team.stageInfo) {
              try { const areaInfo = JSON.parse(team.stageInfo); if (areaInfo.members) memberSource = areaInfo.members; } catch {}
          }
          try {
              const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
              if (Array.isArray(raw)) allMembers = raw.map(m => ({ ...m, role: 'Student' }));
              else if (raw && typeof raw === 'object') {
                  const teachers = (Array.isArray(raw.teachers) ? raw.teachers : []).map((m: any) => ({ ...m, role: 'Teacher' }));
                  const students = (Array.isArray(raw.students) ? raw.students : []).map((m: any) => ({ ...m, role: 'Student' }));
                  allMembers = [...teachers, ...students];
              }
          } catch {}

          if (type === 'certificate') {
              let template = (viewLevel === 'area' ? certificateTemplates['area'] : (clusterID ? certificateTemplates[clusterID] : undefined)) || {
                  id: 'default', headerText: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน', subHeaderText: 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า', frameStyle: 'simple-gold', logoLeftUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png', signatories: [{ name: '.......................................', position: 'ผู้อำนวยการ', signatureUrl: '' }], showSignatureLine: true, dateText: `ให้ไว้ ณ วันที่ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`, showRank: true, serialFormat: '{activityId}-{year}-{run:4}', serialStart: 1, contentTop: 25, footerBottom: 25, logoHeight: 35, signatureSpacing: 3, serialTop: 10, serialRight: 10, qrBottom: 10, qrRight: 10
              } as CertificateTemplate;

              const contentTop = template.contentTop ? `${template.contentTop}mm` : '25mm';
              const footerBottom = template.footerBottom ? `${template.footerBottom}mm` : '25mm';
              const logoHeight = template.logoHeight ? `${template.logoHeight}mm` : '35mm';
              const sigSpacing = template.signatureSpacing ? `${template.signatureSpacing}mm` : '3mm';

              allHtml += allMembers.map((member, idx) => {
                  const fullName = `${member.prefix || ''}${member.name || (member.firstname + ' ' + member.lastname)}`.trim();
                  const roleText = member.role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'นักเรียน';
                  const runNum = (template.serialStart || 1) + idx;
                  const serialNo = (template.serialFormat || '{activityId}-{year}-{run:4}')
                    .replace('{year}', String(new Date().getFullYear()))
                    .replace('{th_year}', String(new Date().getFullYear() + 543))
                    .replace('{id}', team.teamId)
                    .replace('{activityId}', team.activityId)
                    .replace(/{run:(\d+)}/, (_, d) => String(runNum).padStart(parseInt(d), '0'))
                    .replace('{run}', String(runNum));

                  let awardText = "เข้าร่วมการแข่งขัน";
                  if (template.showRank) {
                      const rank = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').rank || team.rank) : team.rank;
                      const medal = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').medal || team.medalOverride) : team.medalOverride;
                      let medalThai = medal === 'Gold' ? "เหรียญทอง" : medal === 'Silver' ? "เหรียญเงิน" : medal === 'Bronze' ? "เหรียญทองแดง" : medal === 'Participant' ? "เข้าร่วม" : "";
                      if (rank === '1' || rank === 1) awardText = `รางวัลชนะเลิศ${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                      else if (rank === '2' || rank === 2) awardText = `รางวัลรองชนะเลิศอันดับ 1${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                      else if (rank === '3' || rank === 3) awardText = `รางวัลรองชนะเลิศอันดับ 2${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                      else if (medalThai && medalThai !== "เข้าร่วม") awardText = `รางวัลระดับ${medalThai}${rank ? ` (ลำดับที่ ${rank})` : ''}`;
                  }

                  let frameEl = '';
                  if (!template.backgroundUrl) {
                      if (template.frameStyle === 'infinite-wave') frameEl = '<div class="frame-infinite-wave"></div>';
                      else if (template.frameStyle === 'ornamental-corners') frameEl = '<div class="frame-ornamental-corners"></div><div class="frame-ornamental-extra"></div><div class="frame-ornamental-extra2"></div>';
                      else if (template.frameStyle === 'thai-premium') frameEl = '<div class="frame-thai-premium"></div>';
                      else if (template.frameStyle !== 'none') frameEl = '<div class="frame-simple-gold"></div>';
                  }

                  // Logo Logic: If no right logo, center the logos container
                  const logoStyle = !template.logoRightUrl ? 'justify-content: center;' : 'justify-content: space-between;';
                  
                  // Position Configs
                  const sTop = template.serialTop ?? 10;
                  const sRight = template.serialRight ?? 10;
                  const qBottom = template.qrBottom ?? 10;
                  const qRight = template.qrRight ?? 10;

                  return `
                    <div class="page">
                        ${template.backgroundUrl ? `<img src="${template.backgroundUrl}" class="bg-img" />` : frameEl}
                        <div class="serial-no" style="top: ${sTop}mm; right: ${sRight}mm;">No. ${serialNo}</div>
                        <div class="content">
                            <div class="logos" style="${logoStyle}">
                                ${template.logoLeftUrl ? `<img src="${template.logoLeftUrl}" class="logo-img" />` : '<div></div>'}
                                ${template.logoRightUrl ? `<img src="${template.logoRightUrl}" class="logo-img" />` : ''}
                            </div>
                            <div class="header">${template.headerText}</div>
                            <div class="subheader">${template.subHeaderText}</div>
                            <div class="name">${fullName}</div>
                            <div class="desc">
                                ${roleText}โรงเรียน <span class="highlight">${schoolName}</span><br/>
                                ได้รับ <span class="highlight">${awardText}</span><br/>
                                กิจกรรม ${activity?.name || team.activityId}<br/>
                                ${template.eventName || (viewLevel === 'area' ? 'งานศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่การศึกษา' : `งานศิลปหัตถกรรมนักเรียน ${clusterName}`)}
                            </div>
                            <div class="date">${template.dateText}</div>
                            <div class="signatures">
                                ${template.signatories.map(sig => `
                                    <div class="sig-block">
                                        ${sig.signatureUrl ? `<img src="${sig.signatureUrl}" class="sig-img" />` : '<div style="height:20mm;"></div>'}
                                        ${template.showSignatureLine !== false ? '<div class="sig-line"></div>' : ''}
                                        <div class="sig-name" style="margin-top: ${sigSpacing};">(${sig.name})</div>
                                        <div class="sig-pos">${sig.position}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="qr-verify" style="bottom: ${qBottom}mm; right: ${qRight}mm;"><img src="${qrCodeBase64}" class="qr-img" /><div class="qr-text">Scan for Verify</div></div>
                        </div>
                    </div>
                  `;
              }).join('');
          } else {
              // ID Card Multi-print Logic
              const cardPages = [];
              for (let i = 0; i < allMembers.length; i += 4) cardPages.push(allMembers.slice(i, i + 4));
              allHtml += cardPages.map(pageMembers => `
                  <div class="page-id">
                    ${pageMembers.map(m => {
                        const fullName = `${m.prefix || ''}${m.name || (m.firstname + ' ' + m.lastname)}`.trim();
                        const roleClass = m.role === 'Teacher' ? 'role-teacher' : 'role-student';
                        const img = m.image || (m.photoDriveId ? `https://drive.google.com/thumbnail?id=${m.photoDriveId}` : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png");
                        return `
                          <div class="card">
                            <div class="card-header"><h1>ID CARD</h1><p>${viewLevel === 'area' ? 'DISTRICT' : 'CLUSTER'}</p></div>
                            <div class="card-body">
                              <div class="photo-container"><img src="${img}" class="photo" /></div>
                              <div class="${roleClass} role-badge">${m.role}</div>
                              <div class="name">${fullName}</div>
                              <div class="school">${schoolName}</div>
                              <div class="team">ทีม: ${team.teamName}</div>
                            </div>
                            <div class="footer"><img src="${qrCodeBase64}" class="qr-code" /></div>
                          </div>
                        `;
                    }).join('')}
                  </div>
              `).join('');
          }
      }

      printWindow.document.write(`
        <html><head><title>Batch Printing</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&family=Kanit:wght@400;700&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
        <style>
            @page { size: A4 ${type === 'certificate' ? 'landscape' : 'portrait'}; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { width: 297mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; background-color: white; }
            .page-id { width: 210mm; height: 296mm; page-break-after: always; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; padding: 10mm; gap: 5mm; }
            .bg-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
            
            /* Frame Styles */
            .frame-simple-gold { 
                position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; 
                border: 3px solid #D4AF37; z-index: 1; pointer-events: none; border-radius: 8px; 
            }
            .frame-infinite-wave {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background-image: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wave" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="%23FDE047" stroke-width="2" stroke-opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(%23wave)"/></svg>');
                z-index: 1; pointer-events: none;
                border: 10mm solid transparent; /* Padding effect */
            }
            .frame-ornamental-corners {
                position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
                border: 2px solid #666; z-index: 1; pointer-events: none;
            }
            .frame-ornamental-corners::before { content: ''; position: absolute; top: -2px; left: -2px; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
            .frame-ornamental-corners::after { content: ''; position: absolute; bottom: -2px; right: -2px; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
            .frame-ornamental-extra { content: ''; position: absolute; top: 10mm; right: 10mm; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
            .frame-ornamental-extra2 { content: ''; position: absolute; bottom: 10mm; left: 10mm; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
            
            .frame-thai-premium {
                position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm;
                border: 8px solid transparent;
                border-image: linear-gradient(to bottom right, #b88746, #fdf5a6, #b88746) 1;
                z-index: 1; pointer-events: none;
            }

            .content { position: relative; z-index: 10; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding-top: 25mm; box-sizing: border-box; }
            .logos { display: flex; width: 80%; height: 35mm; margin-bottom: 5mm; } 
            .logo-img { height: 100%; object-fit: contain; }
            .header { font-size: 24pt; font-weight: bold; color: #1e3a8a; text-align: center; }
            .subheader { font-size: 16pt; margin-bottom: 8mm; }
            .name { font-size: 32pt; font-weight: bold; color: #111; margin-bottom: 5mm; font-family: 'Thasadith', sans-serif; text-align: center; border-bottom: 2px dotted #ccc; padding: 0 20px; min-width: 50%; }
            .desc { font-size: 16pt; text-align: center; line-height: 1.5; }
            .highlight { font-weight: bold; color: #2563eb; }
            .date { font-size: 14pt; margin-top: auto; margin-bottom: 10mm; }
            .signatures { display: flex; justify-content: center; gap: 15mm; margin-bottom: 25mm; width: 90%; align-items: flex-end; }
            .sig-block { display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 60mm; }
            .sig-img { height: 20mm; object-fit: contain; margin-bottom: -5mm; z-index: 1; }
            .sig-line { width: 100%; border-bottom: 1px dotted #000; margin-bottom: 2px; }
            .sig-pos { font-size: 10pt; white-space: pre-line; line-height: 1.3; margin-top: 2px; }
            .qr-verify { position: absolute; display: flex; flex-direction: column; align-items: center; }
            .qr-img { width: 22mm; height: 22mm; }
            .qr-text { font-size: 8pt; color: #666; font-weight: bold; }
            .serial-no { position: absolute; font-size: 10pt; font-family: 'Courier New', monospace; font-weight: bold; color: #555; }
            .card { border: 1px dashed #ccc; border-radius: 12px; display: flex; flex-direction: column; }
            .card-header { background: #1e40af; color: white; padding: 15px; text-align: center; }
            .card-body { padding: 10px; flex: 1; display: flex; flex-direction: column; align-items: center; }
            .photo-container { width: 80px; height: 80px; margin-top: -30px; border-radius: 50%; border: 4px solid white; overflow: hidden; }
            .photo { width: 100%; height: 100%; object-fit: cover; }
            .qr-code { width: 35mm; height: 35mm; margin: auto; }
            
            .no-print { position: fixed; top: 20px; right: 20px; z-index: 1000; }
            .btn-print { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-family: 'Sarabun'; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            @media print { .no-print { display: none; } }
        </style></head><body>
            <div class="no-print">
                <button onclick="window.print()" class="btn-print">🖨️ ยืนยันการพิมพ์</button>
            </div>
            ${allHtml}
        </body></html>
      `);
      printWindow.document.close();
      setIsGenerating(false);
  };

  const handlePrintSelected = () => {
      const selectedTeams = data.teams.filter(t => selectedIds.has(t.teamId));
      handlePrint(selectedTeams);
  };

  if (isInitialLoading) return <div className="space-y-6 animate-in fade-in duration-500 pb-20"><DocumentsSkeleton /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {isGenerating && (
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
              <h3 className="text-xl font-bold mb-2">กำลังสร้างเอกสาร...</h3>
              <p className="text-sm opacity-80">กรุณารอสักครู่ ระบบกำลังจัดเตรียมหน้าสำหรับพิมพ์</p>
          </div>
      )}

      {selectedTeamForDigital && <DigitalIdModal team={selectedTeamForDigital} data={data} onClose={() => { setSelectedTeamForDigital(null); setSearchParams({}); }} viewLevel={viewLevel} />}
      {showConfigModal && <CertificateConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} data={data} onSave={setCertificateTemplates} initialTemplates={certificateTemplates} currentUser={user} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                {type === 'certificate' ? <FileBadge className="w-6 h-6 mr-2 text-green-600" /> : <IdCard className="w-6 h-6 mr-2 text-blue-600" />}
                {type === 'certificate' ? 'พิมพ์เกียรติบัตร (Certificates)' : 'พิมพ์บัตรประจำตัว (ID Cards)'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">{type === 'certificate' ? 'ดาวน์โหลดเกียรติบัตรแบบกลุ่มหรือรายคน' : 'แสดงบัตรดิจิทัลหรือพิมพ์บัตรประจำตัว'}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
             {type === 'certificate' && canConfigureCert && (
                 <button onClick={() => setShowConfigModal(true)} className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"><Settings className="w-4 h-4" />ตั้งค่ารูปแบบ</button>
             )}
             <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-full sm:w-auto">
                <button onClick={() => setViewLevel('cluster')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid className="w-4 h-4 mr-1.5" />ระดับกลุ่มฯ</button>
                <button onClick={() => setViewLevel('area')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Trophy className="w-4 h-4 mr-1.5" />ระดับเขตฯ</button>
            </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute inset-y-0 left-3 flex items-center pointer-events-none h-4 w-4 text-gray-400" />
              <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="ค้นหาชื่อทีม, โรงเรียน..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="w-full md:w-64 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 max-w-full text-ellipsis overflow-hidden" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
                  {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? 'ทุกหมวดหมู่' : cat}</option>)}
              </select>
          </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
          <div className="sticky top-20 z-40 bg-white border border-blue-200 shadow-xl rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <div className="text-white text-sm font-bold px-3 py-1 rounded-full bg-blue-600 flex items-center shadow-sm"><CheckSquare className="w-4 h-4 mr-1.5" />{selectedIds.size}</div>
                  <span className="text-sm text-gray-700 font-medium">รายการที่เลือก</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  <button onClick={() => setSelectedIds(new Set())} className="flex-1 sm:flex-none px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">ยกเลิก</button>
                  <button onClick={handlePrintSelected} className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all shadow-md"><Printer className="w-4 h-4 mr-2" />พิมพ์ที่เลือก ({selectedIds.size})</button>
              </div>
          </div>
      )}

      {/* Table Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className={viewLevel === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                      <tr>
                          <th className="px-4 py-3 text-center w-12">
                              <button onClick={toggleSelectAll} className="p-1 hover:bg-black/5 rounded">{isAllSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-300" />}</button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายการแข่งขัน</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">โรงเรียน</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">ดำเนินการ</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedTeams.map((team) => {
                          const activity = data.activities.find(a => a.id === team.activityId);
                          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                          const isSelected = selectedIds.has(team.teamId);
                          const score = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').score || 0) : team.score;
                          const hasScore = score > 0 || score === -1;
                          return (
                              <tr key={team.teamId} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`} onClick={() => toggleSelect(team.teamId)}>
                                  <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => toggleSelect(team.teamId)} className="p-1">{isSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-300" />}</button>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-bold text-gray-900 font-kanit">{team.teamName}</div>
                                      <div className="text-[10px] text-gray-400 font-mono">{team.teamId}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900 truncate max-w-[200px]" title={activity?.name}>{activity?.name}</div>
                                      <div className="text-[10px] text-blue-600 font-bold uppercase">{activity?.category}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{school?.SchoolName}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                          {type === 'idcard' && (
                                              <button onClick={() => setSelectedTeamForDigital(team)} className="flex items-center px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><Smartphone className="w-4 h-4 mr-1.5" />Digital ID</button>
                                          )}
                                          <button 
                                            onClick={() => handlePrint([team])} 
                                            disabled={type === 'certificate' && !hasScore}
                                            className={`flex items-center px-3 py-1.5 rounded-lg transition-all ${type === 'certificate' ? (hasScore ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed') : 'bg-gray-800 text-white hover:bg-gray-900'}`}
                                          >
                                              <Printer className="w-4 h-4 mr-1.5" />พิมพ์
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {paginatedTeams.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><Printer className="w-12 h-12 mx-auto text-gray-200 mb-2" /><p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p></td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl shadow-sm">
              <div className="text-xs text-gray-500">แสดงผลหน้าที่ {currentPage} จาก {totalPages}</div>
              <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs">ก่อนหน้า</button>
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs">ถัดไป</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default DocumentsView;
