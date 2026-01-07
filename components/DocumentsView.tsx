
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, Team, TeamStatus, User, CertificateTemplate } from '../types';
import { Search, Printer, IdCard, Smartphone, CheckCircle, X, ChevronLeft, ChevronRight, User as UserIcon, GraduationCap, School, MapPin, LayoutGrid, Trophy, Lock, QrCode, Maximize2, Minimize2, Share2, Download, Settings, FileBadge, Loader2, Calendar, Clock, Sparkles, Filter, CheckSquare, Square, Check } from 'lucide-react';
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

// --- Helper Functions & Icons (Defined at Top) ---

const safeJsonParse = (str: string, fallback: any = []) => {
    if (!str || typeof str !== 'string') return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
};

const ArrowLeftRightIcon = ({className}:{className?:string}) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

// --- Component to render QR Code Image safely ---
const QRCodeImage = ({ text, size = 150, className }: { text: string, size?: number, className?: string }) => {
    const [src, setSrc] = useState<string>('');

    useEffect(() => {
        if (!text) return;
        // Generate QR as Data URL
        QRCode.toDataURL(text, { width: size, margin: 1 })
            .then((url) => setSrc(url))
            .catch((err) => {
                console.error("QR Error", err);
                setSrc(''); // Clear on error
            });
    }, [text, size]);

    if (!src) return <div className={`bg-gray-100 animate-pulse ${className}`} />;
    return <img src={src} alt="QR Code" className={className} />;
};

// --- Single Expanded Digital ID Card (Full Screen Mode) ---
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

    // Touch & Swipe Logic
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
    const [translateX, setTranslateX] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Minimum swipe distance (in px) 
    const minSwipeDistance = 80; 

    // Safety check for members
    if (!members || members.length === 0) return null;
    const currentMember = members[currentIndex] || members[0];
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

    // Mock Date/Time for status (Verification Time)
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    // Lookup Venue Schedule
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
            cardRef.current?.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleShare = async () => {
        try {
            const result = await shareIdCard(
                team.teamName,
                schoolName,
                fullName,
                role,
                team.teamId,
                imageUrl,
                levelText,
                viewLevel
            );

            if (result.success) {
                if (result.method === 'copy') {
                    alert('คัดลอกลิงก์ ID Card เรียบร้อยแล้ว');
                }
            } else {
                alert('ไม่สามารถแชร์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
            }
        } catch(e) {
            alert('เกิดข้อผิดพลาดในการแชร์: ' + e);
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            setIsAnimating(true);
            setTranslateX(100); // Move out to right
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setTranslateX(-100); // Reset position from left
                requestAnimationFrame(() => {
                    setTranslateX(0); // Animate in
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 300);
        }
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < members.length - 1) {
            setIsAnimating(true);
            setTranslateX(-100); // Move out to left
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setTranslateX(100); // Reset position from right
                requestAnimationFrame(() => {
                    setTranslateX(0); // Animate in
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 300);
        }
    };

    // --- Enhanced Swipe Handlers ---
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
        setTouchCurrent(e.targetTouches[0].clientX);
        setIsAnimating(false); // Disable transition during drag for 1:1 feel
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const currentX = e.targetTouches[0].clientX;
        setTouchCurrent(currentX);
        
        const diff = currentX - touchStart;
        // Limit drag slightly at edges if no more items
        if ((currentIndex === 0 && diff > 0) || (currentIndex === members.length - 1 && diff < 0)) {
            setTranslateX(diff * 0.3); // Resistance
        } else {
            setTranslateX(diff);
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchCurrent) return;
        
        const distance = touchCurrent - touchStart;
        const isLeftSwipe = distance < -minSwipeDistance;
        const isRightSwipe = distance > minSwipeDistance;

        setIsAnimating(true); // Re-enable transition for snap/switch

        if (isLeftSwipe && currentIndex < members.length - 1) {
            // Commit switch to next
            setTranslateX(-window.innerWidth); // Animate out completely
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setTranslateX(window.innerWidth); // Reset from right
                requestAnimationFrame(() => {
                    setTranslateX(0); // Animate in
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 200);
        } else if (isRightSwipe && currentIndex > 0) {
            // Commit switch to prev
            setTranslateX(window.innerWidth); // Animate out completely
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setTranslateX(-window.innerWidth); // Reset from left
                requestAnimationFrame(() => {
                    setTranslateX(0); // Animate in
                    setTimeout(() => setIsAnimating(false), 300);
                });
            }, 200);
        } else {
            // Snap back
            setTranslateX(0);
            setTimeout(() => setIsAnimating(false), 300);
        }

        setTouchStart(null);
        setTouchCurrent(null);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            {/* CSS for Holographic Effect */}
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

            {/* Toolbar */}
            {!isFullscreen && (
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex gap-3">
                        <button onClick={handleShare} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors">
                            <Share2 className="w-6 h-6" />
                        </button>
                        <button onClick={toggleFullscreen} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-colors">
                            <Maximize2 className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {/* Navigation Arrows (Visual Hint) */}
            {currentIndex > 0 && (
                <button 
                    onClick={handlePrev} 
                    className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md z-50 transition-all active:scale-95"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
            )}

            {currentIndex < members.length - 1 && (
                <button 
                    onClick={handleNext} 
                    className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md z-50 transition-all active:scale-95"
                >
                    <ChevronRight className="w-8 h-8" />
                </button>
            )}

            {/* Main Card Container with Swipe Animation */}
            <div 
                ref={cardRef} 
                className={`relative w-full h-full max-w-md bg-white flex flex-col overflow-hidden shadow-2xl ${isFullscreen ? '' : 'rounded-none sm:rounded-3xl sm:h-auto sm:aspect-[9/16] sm:max-h-[90vh]'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{ 
                    transform: `translateX(${translateX}px)`,
                    transition: isAnimating ? 'transform 0.3s ease-out' : 'none'
                }}
            >
                {/* Holographic Overlay */}
                <div className="absolute inset-0 holo-overlay z-20"></div>

                {/* Member Counter Badge */}
                <div className="absolute top-4 right-4 z-20 bg-black/40 text-white text-[10px] px-2.5 py-1 rounded-full font-bold backdrop-blur-sm border border-white/20">
                    {currentIndex + 1} / {members.length}
                </div>

                {/* 1. Header Section */}
                <div className={`relative h-[25%] ${bgGradient} rounded-b-[30px] shadow-lg shrink-0`}>
                     <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                     <div className="absolute top-12 left-0 right-0 text-center">
                         <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white tracking-widest uppercase border border-white/30">
                             {levelText}
                         </span>
                     </div>
                     
                     {/* Photo - Centered on bottom edge with translate-y-1/2 */}
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-200">
                                <img 
                                    src={imageUrl} 
                                    alt={fullName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; }}
                                />
                            </div>
                            <div className={`absolute bottom-1 right-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md text-white ${role === 'Teacher' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                                {role === 'Teacher' ? <UserIcon className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                            </div>
                        </div>
                     </div>
                </div>

                {/* 2. Identity Section */}
                <div className="pt-20 px-6 text-center shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{fullName}</h2>
                    <p className="text-sm text-gray-500 font-medium mb-1">{role === 'Teacher' ? 'Teacher / Trainer' : 'Student / Competitor'}</p>
                    <p className="text-sm text-gray-600 line-clamp-1">{schoolName}</p>
                </div>

                {/* 3. Status & Info Grid */}
                <div className="px-6 py-4 shrink-0">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-3">
                        <div className="col-span-2 flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-full ${isArea ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <CheckCircle className="w-4 h-4" /> 
                                </div>
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

                {/* 4. Large QR Code Area */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
                    <div className="bg-white p-2 rounded-2xl shadow-lg border-2 border-dashed border-gray-200 w-full max-w-[240px] aspect-square flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -translate-x-full group-hover:translate-x-full" style={{ transition: 'transform 1s' }}></div>
                        <QRCodeImage text={qrUrl} size={300} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-mono">ID: {team.teamId}</p>
                </div>

                {/* 5. Footer / Pagination */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-xs font-bold text-gray-400 w-12 text-right">
                            {currentIndex + 1}
                        </span>
                        <div className="flex gap-1.5">
                            {members.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? `w-6 ${isArea ? 'bg-purple-600' : 'bg-blue-600'}` : 'w-1.5 bg-gray-300'}`}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-bold text-gray-400 w-12 text-left">
                            / {members.length}
                        </span>
                    </div>
                    <p className="text-center text-[10px] text-gray-400 mt-2 flex items-center justify-center gap-1">
                        <ArrowLeftRightIcon className="w-3 h-3" /> Swipe to view next member
                    </p>
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
        <div 
            onClick={onClick}
            className="group relative w-full aspect-[3/4.5] bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden border border-gray-200 cursor-pointer transform transition-all duration-300 hover:-translate-y-1"
        >
            {/* Holographic Overlay for Preview */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none" style={{ mixBlendMode: 'overlay' }}></div>

            {/* Header Background */}
            <div className={`absolute top-0 left-0 right-0 h-1/3 ${bgGradient} z-0`}></div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center pt-6 px-4 h-full pb-4">
                
                <span className="text-[10px] font-bold text-white/90 tracking-widest uppercase mb-4 border border-white/20 px-2 py-0.5 rounded-full">{levelText}</span>

                {/* Photo */}
                <div className="relative w-24 h-24 mb-3">
                    <img 
                        src={imageUrl} 
                        alt={fullName}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-gray-100 group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; }}
                    />
                    <div className={`absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-sm text-white ${role === 'Teacher' ? 'bg-indigo-500' : 'bg-green-500'}`}>
                        {role === 'Teacher' ? <UserIcon className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                    </div>
                </div>

                {/* Name */}
                <div className="text-center mb-auto w-full px-2">
                    <h3 className="text-gray-900 font-bold text-lg leading-tight mb-1 line-clamp-2">{fullName}</h3>
                    <p className="text-xs text-gray-500">{role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'ผู้เข้าแข่งขัน'}</p>
                </div>

                {/* Bottom Info */}
                <div className="w-full text-center mt-4 pt-3 border-t border-dashed border-gray-200">
                    <div className="flex items-center justify-center text-xs text-gray-400 mb-2">
                        <Sparkles className="w-3 h-3 mr-1 text-yellow-500" />
                        <span>Tap to Expand</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono">ID: {team.teamId}</p>
                </div>
            </div>
        </div>
    );
};

// --- DigitalIdModal ---
const DigitalIdModal = ({ team, data, onClose, viewLevel }: { team: Team, data: AppData, onClose: () => void, viewLevel: 'cluster' | 'area' }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
    const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;

    let teachers: any[] = [];
    let students: any[] = [];

    // Decide which members to show based on viewLevel
    let memberSource = team.members;
    if (viewLevel === 'area' && team.stageInfo) {
        try {
            const areaInfo = safeJsonParse(team.stageInfo, {});
            if (areaInfo.members) memberSource = areaInfo.members;
        } catch {}
    }

    try {
        const rawMembers = typeof memberSource === 'string' ? safeJsonParse(memberSource, []) : memberSource;
        if (rawMembers) {
            if (Array.isArray(rawMembers)) {
                students = rawMembers;
            } else if (typeof rawMembers === 'object') {
                teachers = Array.isArray(rawMembers.teachers) ? rawMembers.teachers : [];
                students = Array.isArray(rawMembers.students) ? rawMembers.students : [];
            }
        }
    } catch { }

    // Combine for swipeable list
    const allMembers = [
        ...teachers.map(t => ({...t, role: 'Teacher'})),
        ...students.map(s => ({...s, role: 'Student'}))
    ];

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            
            {/* Full Screen Member View */}
            {expandedIndex !== null && (
                <ExpandedIdCard 
                    members={allMembers}
                    initialIndex={expandedIndex}
                    team={team} 
                    activity={activity} 
                    schoolName={school} 
                    viewLevel={viewLevel} 
                    onClose={() => setExpandedIndex(null)}
                    data={data} 
                />
            )}

            <div className="bg-gray-100 w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center font-kanit">
                            <Smartphone className="w-5 h-5 mr-2 text-blue-600" />
                            บัตรประจำตัวดิจิทัล ({viewLevel === 'area' ? 'ระดับเขตพื้นที่' : 'ระดับกลุ่มเครือข่าย'})
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="font-medium">{team.teamName}</span>
                            <span className="text-gray-300">|</span>
                            <span>{school}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
                        {allMembers.map((m, idx) => (
                            <DigitalIdCard 
                                key={`m-${idx}`} 
                                member={m} 
                                role={m.role} 
                                team={team} 
                                activity={activity} 
                                schoolName={school} 
                                viewLevel={viewLevel} 
                                onClick={() => setExpandedIndex(idx)}
                            />
                        ))}
                        {allMembers.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-400">
                                ไม่พบข้อมูลสมาชิกในทีม
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-white border-t border-gray-200 p-3 text-center text-xs text-gray-400">
                    <p>คลิกที่บัตรเพื่อดูแบบเต็มจอ (Holographic View) | สามารถปัดซ้าย-ขวาเพื่อเปลี่ยนคนได้</p>
                </div>
            </div>
        </div>
    );
};

// --- Main View Component ---

const DocumentsView: React.FC<DocumentsViewProps> = ({ data, type, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedTeamForDigital, setSelectedTeamForDigital] = useState<Team | null>(null);
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  
  // Certificate Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Certificate Configuration State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [certificateTemplates, setCertificateTemplates] = useState<Record<string, CertificateTemplate>>({});

  // NEW: Filter & Selection States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMedal, setSelectedMedal] = useState('All'); 
  const [selectedRank, setSelectedRank] = useState('All'); 
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  // URL Params for Auto-Opening ID Card
  const [searchParams, setSearchParams] = useSearchParams();

  // Load Templates
  useEffect(() => {
      const loadTemplates = async () => {
          if (type === 'certificate') {
              const configs = await getCertificateConfig();
              setCertificateTemplates(configs);
          }
      };
      loadTemplates();
  }, [type]);

  // Derived Categories
  const categories = useMemo(() => {
      if (!data || !data.activities) return [];
      return Array.from(new Set(data.activities.map(a => a.category))).sort();
  }, [data.activities]);

  // Auto-Open ID Card from URL
  useEffect(() => {
      const teamIdParam = searchParams.get('id');
      const levelParam = searchParams.get('level');

      if (teamIdParam && type === 'idcard' && data && data.teams) {
          const foundTeam = data.teams.find(t => t.teamId === teamIdParam);
          if (foundTeam) {
              if (levelParam === 'area' || levelParam === 'cluster') {
                  setViewLevel(levelParam as 'cluster' | 'area');
              }
              setSelectedTeamForDigital(foundTeam);
          }
      }
  }, [searchParams, data.teams, type]);

  // Clear selection when filters change
  useEffect(() => {
      setSelectedTeamIds(new Set());
      setCurrentPage(1);
  }, [searchTerm, viewLevel, selectedCategory, selectedMedal, selectedRank]);

  const handleSaveTemplates = (newTemplates: Record<string, CertificateTemplate>) => {
      setCertificateTemplates(newTemplates);
  };

  const title = type === 'certificate' ? 'พิมพ์เกียรติบัตร (Certificates)' : 'พิมพ์บัตรประจำตัว (ID Cards)';
  const description = type === 'certificate' 
    ? 'ดาวน์โหลดเกียรติบัตรสำหรับทีมที่ได้รับรางวัล' 
    : 'พิมพ์บัตรประจำตัวผู้เข้าแข่งขันและครูผู้ฝึกสอน หรือแสดงบัตรดิจิทัล';

  const userRole = user?.level?.toLowerCase();
  const isSuperUser = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const canConfigureCert = isSuperUser || isGroupAdmin;

  // Filter Logic
  const filteredTeams = useMemo(() => {
    if (!data || !data.teams) return [];
    
    return data.teams.filter(team => {
        // User Permission Check
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
            }
        }

        let isRep = false;
        let rankStr = '';
        let medalStr = '';

        // Parsing for filters
        if (viewLevel === 'area') {
            isRep = String(team.flag).toUpperCase() === 'TRUE';
            const isRank1 = String(team.rank) === '1'; 
            if (!isRep || !isRank1) return false;

            try {
                const info = safeJsonParse(team.stageInfo || '{}', {});
                rankStr = String(info.rank || '');
                medalStr = info.medal || '';
                // Fallback medal calc if area score exists
                if (!medalStr && info.score) {
                    const s = parseFloat(info.score);
                    if (s >= 80) medalStr = 'Gold';
                    else if (s >= 70) medalStr = 'Silver';
                    else if (s >= 60) medalStr = 'Bronze';
                    else medalStr = 'Participant';
                }
            } catch {}
        } else {
            // Cluster
            rankStr = String(team.rank || '');
            medalStr = team.medalOverride || '';
            // Auto calc
            if (!medalStr && team.score) {
                const s = team.score;
                if (s >= 80) medalStr = 'Gold';
                else if (s >= 70) medalStr = 'Silver';
                else if (s >= 60) medalStr = 'Bronze';
                else medalStr = 'Participant';
            }
        }
        
        const activity = data.activities.find(a => a.id === team.activityId);
        const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
        const term = searchTerm.toLowerCase();
        
        // NEW: Category Check
        const matchCategory = selectedCategory === 'All' || activity?.category === selectedCategory;

        // NEW: Medal Check
        let matchMedal = true;
        if (selectedMedal !== 'All') {
            matchMedal = medalStr.includes(selectedMedal);
        }

        // NEW: Rank Check
        let matchRank = true;
        if (selectedRank !== 'All') {
            if (selectedRank === '1') matchRank = rankStr === '1';
            else if (selectedRank === '1-3') matchRank = ['1', '2', '3'].includes(rankStr);
        }

        return (
            matchCategory && matchMedal && matchRank && (
                team.teamName.toLowerCase().includes(term) || 
                team.teamId.toLowerCase().includes(term) ||
                (school && school.SchoolName.toLowerCase().includes(term)) ||
                (activity && activity.name.toLowerCase().includes(term))
            )
        );
    }).sort((a, b) => {
        // Sort for better printing organization: Activity Name -> School Name -> Team Name
        const actA = data.activities.find(act => act.id === a.activityId)?.name || '';
        const actB = data.activities.find(act => act.id === b.activityId)?.name || '';
        if (actA !== actB) return actA.localeCompare(actB);
        
        const schoolA = data.schools.find(s => s.SchoolID === a.schoolId)?.SchoolName || a.schoolId;
        const schoolB = data.schools.find(s => s.SchoolID === b.schoolId)?.SchoolName || b.schoolId;
        if (schoolA !== schoolB) return schoolA.localeCompare(schoolB);

        return a.teamName.localeCompare(b.teamName);
    });
  }, [data.teams, data.schools, data.activities, searchTerm, type, user, viewLevel, selectedCategory, selectedMedal, selectedRank]);

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper: Get Member Counts
  const getMemberCounts = (team: Team) => {
      let tCount = 0;
      let sCount = 0;
      let memberSource = team.members;
      if (viewLevel === 'area' && team.stageInfo) {
          try {
              const areaInfo = safeJsonParse(team.stageInfo, {});
              if (areaInfo.members) memberSource = areaInfo.members;
          } catch {}
      }
      try {
          const raw = typeof memberSource === 'string' ? safeJsonParse(memberSource, []) : memberSource;
          if (Array.isArray(raw)) {
              sCount = raw.length;
          } else if (raw && typeof raw === 'object') {
              tCount = Array.isArray(raw.teachers) ? raw.teachers.length : 0;
              sCount = Array.isArray(raw.students) ? raw.students.length : 0;
          }
      } catch {}
      return { tCount, sCount };
  };

  // --- Printing Logic (Single & Batch) ---

  const handlePrintTeams = async (targetTeams: Team[]) => {
      if (targetTeams.length === 0) return;

      setIsGenerating(true);
      
      const verifyBase = `${window.location.origin}${window.location.pathname}#/verify?id=`;
      const appBase = `${window.location.origin}${window.location.pathname}#/idcards?level=${viewLevel}&id=`;
      
      // Pre-generate QR Codes for verify URLs
      const qrMap: Record<string, string> = {};
      
      // Optimize by running promises in parallel
      await Promise.all(targetTeams.map(async (t) => {
          try {
              const url = type === 'certificate' ? `${verifyBase}${t.teamId}` : `${appBase}${t.teamId}`;
              qrMap[t.teamId] = await QRCode.toDataURL(url, { margin: 1, width: 300 });
          } catch (e) {
              console.error("QR Gen Error", e);
          }
      }));

      await new Promise(resolve => setTimeout(resolve, 800)); // UI delay

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          setIsGenerating(false);
          alert('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
          return;
      }

      // Generate HTML Content
      let allHtml = '';
      
      for (const team of targetTeams) {
          const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
          const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          const schoolName = schoolObj?.SchoolName || team.schoolId;
          const clusterID = schoolObj?.SchoolCluster;
          const clusterName = clusterID ? data.clusters.find(c => c.ClusterID === clusterID)?.ClusterName : '';
          const qrCodeBase64 = qrMap[team.teamId];

          // Parsing Members
          let allMembers: any[] = [];
          let memberSource = team.members;
          if (viewLevel === 'area' && team.stageInfo) {
              try {
                  const areaInfo = safeJsonParse(team.stageInfo, {});
                  if (areaInfo.members) memberSource = areaInfo.members;
              } catch {}
          }
          try {
              const raw = typeof memberSource === 'string' ? safeJsonParse(memberSource, []) : memberSource;
              if (Array.isArray(raw)) {
                  allMembers = raw.map(m => ({ ...m, role: 'Student' }));
              } else if (raw && typeof raw === 'object') {
                  const teachers = (Array.isArray(raw.teachers) ? raw.teachers : []).map((m: any) => ({ ...m, role: 'Teacher' }));
                  const students = (Array.isArray(raw.students) ? raw.students : []).map((m: any) => ({ ...m, role: 'Student' }));
                  allMembers = [...teachers, ...students];
              }
          } catch {}

          if (type === 'certificate') {
              // ... existing certificate logic ...
              let template: CertificateTemplate;
              if (viewLevel === 'area') {
                  template = certificateTemplates['area'];
              } else {
                  template = clusterID ? certificateTemplates[clusterID] : undefined;
              }

              if (!template) {
                  template = {
                      id: 'default',
                      name: 'Default',
                      backgroundUrl: '',
                      headerText: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
                      subHeaderText: 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า',
                      eventName: '',
                      frameStyle: 'simple-gold',
                      logoLeftUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png',
                      logoRightUrl: '',
                      signatories: [{ name: '.......................................', position: 'ผู้อำนวยการ', signatureUrl: '' }],
                      showSignatureLine: true,
                      dateText: `ให้ไว้ ณ วันที่ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                      showRank: true,
                      serialFormat: '{activityId}-{year}-{run:4}',
                      serialStart: 1,
                      contentTop: 25, footerBottom: 25, logoHeight: 35, signatureSpacing: 3, serialTop: 10, serialRight: 10, qrBottom: 10, qrRight: 10
                  } as CertificateTemplate;
              }

              const contentTop = template.contentTop ? `${template.contentTop}mm` : '25mm';
              const footerBottom = template.footerBottom ? `${template.footerBottom}mm` : '25mm';
              const logoHeight = template.logoHeight ? `${template.logoHeight}mm` : '35mm';
              const sigSpacing = template.signatureSpacing ? `${template.signatureSpacing}mm` : '3mm';
              const sTop = template.serialTop ?? 10;
              const sRight = template.serialRight ?? 10;
              const qBottom = template.qrBottom ?? 10;
              const qRight = template.qrRight ?? 10;

              allHtml += allMembers.map((member, idx) => {
                  const prefix = member.prefix || '';
                  const name = member.name || `${member.firstname || ''} ${member.lastname || ''}`;
                  const fullName = `${prefix}${name}`.trim();
                  const roleText = member.role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'นักเรียน';
                  
                  // Serial Gen
                  const year = new Date().getFullYear();
                  const thYear = year + 543;
                  let serial = (template.serialFormat || '{activityId}-{year}-{run:4}')
                    .replace('{year}', String(year))
                    .replace('{th_year}', String(thYear))
                    .replace('{id}', team.teamId)
                    .replace('{activityId}', team.activityId);
                  
                  const runNum = (template.serialStart || 1) + idx;
                  if (serial.includes('{run:')) {
                      const match = serial.match(/{run:(\d+)}/);
                      if (match) {
                          const digits = parseInt(match[1]);
                          serial = serial.replace(match[0], String(runNum).padStart(digits, '0'));
                      }
                  } else {
                      serial = serial.replace('{run}', String(runNum));
                  }

                  let awardText = "เข้าร่วมการแข่งขัน";
                  if (template.showRank) {
                      const rank = viewLevel === 'area' ? (safeJsonParse(team.stageInfo || '{}', {}).rank || team.rank) : team.rank;
                      const medal = viewLevel === 'area' ? (safeJsonParse(team.stageInfo || '{}', {}).medal || team.medalOverride) : team.medalOverride;
                      let medalThai = "";
                      if (medal === 'Gold') medalThai = "เหรียญทอง";
                      else if (medal === 'Silver') medalThai = "เหรียญเงิน";
                      else if (medal === 'Bronze') medalThai = "เหรียญทองแดง";
                      else if (medal === 'Participant') medalThai = "เข้าร่วม";

                      if (rank === '1' || rank === 1) awardText = `รางวัลชนะเลิศ${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                      else if (rank === '2' || rank === 2) awardText = `รางวัลรองชนะเลิศอันดับ 1${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                      else if (rank === '3' || rank === 3) awardText = `รางวัลรองชนะเลิศอันดับ 2${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                      else if (medalThai && medalThai !== "เข้าร่วม") awardText = `รางวัลระดับ${medalThai}${rank ? ` (ลำดับที่ ${rank})` : ''}`;
                  }

                  let frameElement = '';
                  if (!template.backgroundUrl) {
                      if (template.frameStyle === 'infinite-wave') frameElement = '<div class="frame-infinite-wave"></div>';
                      else if (template.frameStyle === 'ornamental-corners') frameElement = '<div class="frame-ornamental-corners"></div><div class="frame-ornamental-extra"></div><div class="frame-ornamental-extra2"></div>';
                      else if (template.frameStyle === 'thai-premium') frameElement = '<div class="frame-thai-premium"></div>';
                      else if (template.frameStyle !== 'none') frameElement = '<div class="frame-simple-gold"></div>';
                  }

                  const logoStyle = !template.logoRightUrl ? 'justify-content: center;' : 'justify-content: space-between;';

                  return `
                    <div class="page">
                        ${template.backgroundUrl ? `<img src="${template.backgroundUrl}" class="bg-img" />` : frameElement}
                        <div class="serial-no" style="top:${sTop}mm; right:${sRight}mm;">No. ${serial}</div>
                        <div class="content" style="padding-top:${contentTop};">
                            <div class="logos" style="${logoStyle} height:${logoHeight};">
                                ${template.logoLeftUrl ? `<img src="${template.logoLeftUrl}" class="logo-img" />` : '<div></div>'}
                                ${template.logoRightUrl ? `<img src="${template.logoRightUrl}" class="logo-img" />` : ''}
                            </div>
                            <div class="header">${template.headerText}</div>
                            <div class="subheader">${template.subHeaderText}</div>
                            <div class="name">${fullName}</div>
                            <div class="desc">
                                ${roleText}โรงเรียน <span class="highlight">${schoolName}</span><br/>
                                ได้รับ <span class="highlight">${awardText}</span><br/>
                                กิจกรรม ${activity}<br/>
                                ${template.eventName || (viewLevel === 'area' ? 'งานศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่การศึกษา' : `งานศิลปหัตถกรรมนักเรียน ${clusterName}`)}
                            </div>
                            <div class="date">${template.dateText}</div>
                            <div class="signatures" style="margin-bottom:${footerBottom};">
                                ${template.signatories.map(sig => `
                                    <div class="sig-block">
                                        ${sig.signatureUrl ? `<img src="${sig.signatureUrl}" class="sig-img" />` : '<div style="height:20mm;"></div>'}
                                        ${template.showSignatureLine !== false ? '<div class="sig-line"></div>' : ''}
                                        <div class="sig-name" style="margin-top:${sigSpacing};">(${sig.name})</div>
                                        <div class="sig-pos">${sig.position}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="qr-verify" style="bottom:${qBottom}mm; right:${qRight}mm;">
                                <img src="${qrCodeBase64}" class="qr-img" />
                                <div class="qr-text">Scan for Verify</div>
                            </div>
                        </div>
                    </div>
                  `;
              }).join('');

          } else {
              // --- UPDATED ID CARD LOGIC ---
              
              // 1. Get Schedule
              let scheduleStr = { date: '-', time: '-', place: '-' };
              if (data.venues) {
                  for (const v of data.venues) {
                      const s = v.scheduledActivities?.find(act => act.activityId === team.activityId);
                      if (s) {
                          scheduleStr.date = s.date || '-';
                          scheduleStr.time = s.timeRange || '-';
                          scheduleStr.place = `${v.name} ${s.building || ''} ${s.room || ''}`;
                          break;
                      }
                  }
              }

              // 2. Pagination (4 cards per page for A4)
              const cardPages = [];
              for (let i = 0; i < allMembers.length; i += 4) cardPages.push(allMembers.slice(i, i + 4));
              
              allHtml += cardPages.map(pageMembers => `
                  <div class="page-id-container">
                    ${pageMembers.map(m => {
                        const fullName = `${m.prefix || ''}${m.name || (m.firstname + ' ' + m.lastname)}`.trim();
                        const isTeacher = m.role === 'Teacher';
                        const roleLabel = isTeacher ? 'ครูผู้ฝึกสอน (Trainer)' : 'ผู้เข้าแข่งขัน (Competitor)';
                        const roleColor = isTeacher ? '#4338ca' : '#059669'; // Indigo vs Emerald
                        const headerGradient = viewLevel === 'area' ? 'linear-gradient(135deg, #581c87 0%, #3b0764 100%)' : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)';
                        
                        // Fix image url
                        let img = m.image;
                        if (!img && m.photoDriveId) img = `https://drive.google.com/thumbnail?id=${m.photoDriveId}`;
                        if (!img) img = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png";

                        return `
                          <div class="id-card">
                            <!-- Background Pattern -->
                            <div class="id-card-bg"></div>
                            
                            <!-- Header -->
                            <div class="id-header" style="background: ${headerGradient};">
                                <div class="id-header-top">
                                    <span class="id-level">${viewLevel === 'area' ? 'DISTRICT LEVEL' : 'CLUSTER LEVEL'}</span>
                                    <span class="id-app-name">CompManager</span>
                                </div>
                                <div class="id-title">OFFICIAL ID CARD</div>
                            </div>

                            <!-- Content -->
                            <div class="id-body">
                                <div class="id-main-row">
                                    <div class="id-photo-wrapper">
                                        <img src="${img}" class="id-photo" />
                                        <div class="id-role-badge" style="background: ${roleColor};">${roleLabel}</div>
                                    </div>
                                    <div class="id-info">
                                        <div class="id-name">${fullName}</div>
                                        <div class="id-school">${schoolName}</div>
                                        <div class="id-team-meta">
                                            <span class="id-team-label">Team:</span> ${team.teamName}
                                        </div>
                                        <div class="id-activity">${activity}</div>
                                    </div>
                                </div>

                                <div class="id-schedule">
                                    <div class="id-sch-row">
                                        <strong>Date:</strong> ${scheduleStr.date} 
                                        <span style="margin: 0 5px;">|</span> 
                                        <strong>Time:</strong> ${scheduleStr.time}
                                    </div>
                                    <div class="id-sch-row">
                                        <strong>Venue:</strong> ${scheduleStr.place}
                                    </div>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div class="id-footer">
                                <div class="id-qr-box">
                                    <img src="${qrCodeBase64}" class="id-qr" />
                                </div>
                                <div class="id-footer-text">
                                    SCAN FOR DIGITAL ID & VERIFICATION<br/>
                                    ACADEMIC COMPETITION 2024
                                </div>
                            </div>
                          </div>
                        `;
                    }).join('')}
                  </div>
              `).join('');
          }
      }

      const htmlContent = `
        <html>
        <head>
            <title>Print ${type === 'certificate' ? 'Certificates' : 'ID Cards'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 ${type === 'certificate' ? 'landscape' : 'portrait'}; margin: 0; }
                body { margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .page { width: 297mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; background-color: white; }
                
                /* Certificate Styles */
                /* Frame Styles */
                .frame-simple-gold { position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; border: 3px solid #D4AF37; border-radius: 8px; z-index: 1; pointer-events: none; }
                .frame-infinite-wave { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wave" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="%23FDE047" stroke-width="2" stroke-opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(%23wave)"/></svg>'); z-index: 1; pointer-events: none; border: 10mm solid transparent; }
                .frame-ornamental-corners { position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm; border: 2px solid #666; z-index: 1; pointer-events: none; }
                .frame-ornamental-corners::before { content: ''; position: absolute; top: -2px; left: -2px; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
                .frame-ornamental-corners::after { content: ''; position: absolute; bottom: -2px; right: -2px; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
                .frame-ornamental-extra { content: ''; position: absolute; top: 10mm; right: 10mm; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
                .frame-ornamental-extra2 { content: ''; position: absolute; bottom: 10mm; left: 10mm; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
                .frame-thai-premium { position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm; border: 8px solid transparent; border-image: linear-gradient(to bottom right, #b88746, #fdf5a6, #b88746) 1; z-index: 1; pointer-events: none; }
                .bg-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
                
                .content { position: relative; z-index: 10; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
                .logos { display: flex; width: 80%; margin-bottom: 5mm; position: relative; }
                .logos.single { justify-content: center; }
                .logo-img { height: 100%; object-fit: contain; background-color: transparent; }
                .header { font-size: 24pt; font-weight: bold; color: #1e3a8a; margin-bottom: 5mm; text-align: center; line-height: 1.2; text-shadow: 1px 1px 0px rgba(255,255,255,0.8); }
                .subheader { font-size: 16pt; margin-bottom: 8mm; text-align: center; }
                .name { font-size: 32pt; font-weight: bold; color: #111; margin-bottom: 5mm; font-family: 'Thasadith', sans-serif; text-align: center; border-bottom: 2px dotted #ccc; padding: 0 20px; min-width: 50%; }
                .desc { font-size: 16pt; margin-bottom: 5mm; max-width: 80%; text-align: center; line-height: 1.5; }
                .highlight { font-weight: bold; color: #2563eb; }
                .date { font-size: 14pt; margin-top: auto; margin-bottom: 10mm; }
                .signatures { display: flex; justify-content: center; gap: 15mm; width: 90%; align-items: flex-end; }
                .sig-block { display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 60mm; }
                .sig-img { height: 20mm; object-fit: contain; margin-bottom: -5mm; z-index: 1; background-color: transparent; }
                .sig-line { width: 100%; border-bottom: 1px dotted #000; margin-bottom: 2px; }
                .sig-name { font-size: 12pt; font-weight: bold; padding-top: 2px; width: 100%; }
                .sig-pos { font-size: 10pt; white-space: pre-line; line-height: 1.3; margin-top: 2px; }
                .qr-verify { position: absolute; display: flex; flex-direction: column; align-items: center; }
                .qr-img { width: 22mm; height: 22mm; }
                .qr-text { font-size: 8pt; margin-top: 2px; color: #666; font-weight: bold; text-transform: uppercase; }
                .serial-no { position: absolute; font-size: 10pt; font-family: 'Courier New', monospace; color: #555; font-weight: bold; }

                /* ID Card Specific Styles */
                .page-id-container {
                    width: 210mm;
                    height: 296mm; /* Full A4 Portrait Height */
                    page-break-after: always;
                    box-sizing: border-box;
                    padding: 10mm;
                    display: flex;
                    flex-wrap: wrap;
                    align-content: flex-start;
                    justify-content: center;
                    gap: 10mm;
                }

                .id-card {
                    width: 85mm;
                    height: 125mm;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                    background: white;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    display: flex;
                    flex-direction: column;
                }

                .id-card-bg {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
                    background-size: 10px 10px;
                    opacity: 0.3;
                    z-index: 0;
                }

                .id-header {
                    padding: 12px 10px;
                    color: white;
                    position: relative;
                    z-index: 1;
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }

                .id-header-top {
                    display: flex;
                    justify-content: space-between;
                    font-size: 8px;
                    opacity: 0.8;
                    font-weight: bold;
                    margin-bottom: 2px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .id-title {
                    font-size: 16px;
                    font-weight: 900;
                    text-align: center;
                    letter-spacing: 2px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .id-body {
                    flex: 1;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 1;
                }

                .id-main-row {
                    text-align: center;
                    margin-bottom: 10px;
                }

                .id-photo-wrapper {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 15px auto;
                }

                .id-photo {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .id-role-badge {
                    position: absolute;
                    bottom: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 2px 8px;
                    border-radius: 10px;
                    color: white;
                    font-size: 9px;
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }

                .id-name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #1e293b;
                    line-height: 1.2;
                    margin-bottom: 4px;
                }

                .id-school {
                    font-size: 11px;
                    color: #64748b;
                    margin-bottom: 8px;
                    font-weight: 500;
                }

                .id-activity {
                    font-size: 10px;
                    color: #334155;
                    background: #f1f5f9;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                    display: inline-block;
                    max-width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .id-team-meta {
                    font-size: 10px;
                    color: #64748b;
                    margin-bottom: 4px;
                }
                .id-team-label { font-weight: bold; color: #94a3b8; text-transform: uppercase; }

                .id-schedule {
                    margin-top: auto;
                    background: #f8fafc;
                    border: 1px dashed #cbd5e1;
                    border-radius: 6px;
                    padding: 6px;
                    font-size: 9px;
                    color: #475569;
                }

                .id-sch-row {
                    margin-bottom: 2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .id-sch-row:last-child { margin-bottom: 0; }

                .id-footer {
                    padding: 8px;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: white;
                    position: relative;
                    z-index: 1;
                }

                .id-qr-box {
                    width: 35px;
                    height: 35px;
                }
                .id-qr { width: 100%; height: 100%; }

                .id-footer-text {
                    font-size: 7px;
                    color: #94a3b8;
                    text-align: right;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                    line-height: 1.2;
                }

                .no-print { display: block; position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
                .btn-print { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-family: 'Sarabun'; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                @media print { 
                    .no-print { display: none; } 
                    .bg-img, .frame-infinite-wave, .frame-ornamental-corners, .frame-simple-gold, .frame-thai-premium { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button onclick="window.print()" class="btn-print">🖨️ พิมพ์ / บันทึก PDF (Print/Save PDF)</button>
            </div>
            ${allHtml}
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setIsGenerating(false);
  };

  // Selection Logic
  const handleSelectAll = () => {
      if (selectedTeamIds.size === paginatedTeams.length) {
          setSelectedTeamIds(new Set());
      } else {
          setSelectedTeamIds(new Set(paginatedTeams.map(t => t.teamId)));
      }
  };

  const handleSelectTeam = (id: string) => {
      const newSet = new Set(selectedTeamIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedTeamIds(newSet);
  };

  const handleBatchPrint = () => {
      const selectedTeams = filteredTeams.filter(t => selectedTeamIds.has(t.teamId));
      handlePrintTeams(selectedTeams);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Loading Overlay */}
      {isGenerating && (
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
              <h3 className="text-xl font-bold mb-2">กำลังสร้างเอกสาร...</h3>
              <p className="text-sm opacity-80">กรุณารอสักครู่ ระบบกำลังจัดเตรียมหน้าสำหรับพิมพ์</p>
          </div>
      )}

      {selectedTeamForDigital && (
          <DigitalIdModal team={selectedTeamForDigital} data={data} onClose={() => { setSelectedTeamForDigital(null); setSearchParams({}); }} viewLevel={viewLevel} />
      )}
      {showConfigModal && (
          <CertificateConfigModal 
              isOpen={showConfigModal} 
              onClose={() => setShowConfigModal(false)}
              data={data}
              onSave={handleSaveTemplates}
              initialTemplates={certificateTemplates}
              currentUser={user}
          />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                {type === 'certificate' ? <FileBadge className="w-6 h-6 mr-2 text-green-600" /> : <IdCard className="w-6 h-6 mr-2 text-blue-600" />}
                {title}
            </h2>
            <p className="text-gray-500 text-sm mt-1">{description}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
             
             {type === 'certificate' && canConfigureCert && (
                 <button 
                    onClick={() => setShowConfigModal(true)}
                    className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                 >
                     <Settings className="w-4 h-4" />
                     ตั้งค่ารูปแบบเกียรติบัตร
                 </button>
             )}

             {/* Level Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-full sm:w-auto">
                <button
                    onClick={() => setViewLevel('cluster')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-1.5" />
                    ระดับกลุ่มฯ
                </button>
                <button
                    onClick={() => setViewLevel('area')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Trophy className="w-4 h-4 mr-1.5" />
                    ระดับเขตฯ
                </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    placeholder="ค้นหาชื่อทีม, โรงเรียน, กิจกรรม..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>
        </div>
      </div>

      {/* Filter Section - Enhanced */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-bold text-gray-700">Filter:</span>
              </div>
              
              {/* Category Filter */}
              <select 
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full md:w-auto"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
              >
                  <option value="All">ทุกหมวดหมู่</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Medal Filter */}
              <select 
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full md:w-auto"
                  value={selectedMedal}
                  onChange={(e) => setSelectedMedal(e.target.value)}
              >
                  <option value="All">ทุกรางวัล</option>
                  <option value="Gold">เหรียญทอง (Gold)</option>
                  <option value="Silver">เหรียญเงิน (Silver)</option>
                  <option value="Bronze">เหรียญทองแดง (Bronze)</option>
                  <option value="Participant">เข้าร่วม (Participant)</option>
              </select>

              {/* Rank Filter */}
              <select 
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer w-full md:w-auto"
                  value={selectedRank}
                  onChange={(e) => setSelectedRank(e.target.value)}
              >
                  <option value="All">ทุกลำดับ</option>
                  <option value="1">ลำดับที่ 1 (Winner)</option>
                  <option value="1-3">ลำดับที่ 1-3 (Top 3)</option>
              </select>
              
              {/* Clear Filters */}
              {(selectedCategory !== 'All' || selectedMedal !== 'All' || selectedRank !== 'All') && (
                  <button 
                      onClick={() => { setSelectedCategory('All'); setSelectedMedal('All'); setSelectedRank('All'); }}
                      className="text-xs text-red-500 hover:underline flex items-center ml-auto md:ml-2"
                  >
                      <X className="w-3 h-3 mr-1" /> ล้างตัวกรอง
                  </button>
              )}
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 pt-2">
              <div className="flex items-center gap-2">
                  {/* User Info Badge if School Admin */}
                  {(user?.level === 'school_admin' || user?.level === 'user') && user.SchoolID && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded flex items-center">
                           <School className="w-3 h-3 mr-1" />
                           {data.schools.find(s => s.SchoolID === user.SchoolID)?.SchoolName || user.SchoolID}
                      </span>
                  )}
                  {/* Area Level Warning */}
                  {viewLevel === 'area' && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded flex items-center">
                           <Trophy className="w-3 h-3 mr-1" />
                           ระดับเขตพื้นที่: แสดงเฉพาะทีมที่เป็นตัวแทน (Representative) และได้ลำดับที่ 1
                      </span>
                  )}
              </div>
              <div className="font-bold">
                  พบ {filteredTeams.length} รายการ
              </div>
          </div>
      </div>

      {/* Batch Action Bar (Floating) */}
      {selectedTeamIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-40 flex items-center gap-4 animate-in slide-in-from-bottom-4">
              <div className="text-sm font-bold flex items-center">
                  <CheckSquare className="w-4 h-4 mr-2 text-green-400" />
                  เลือกแล้ว {selectedTeamIds.size} รายการ
              </div>
              <div className="h-6 w-px bg-gray-600"></div>
              <button 
                  onClick={handleBatchPrint}
                  className="flex items-center text-sm font-bold bg-white text-gray-900 px-4 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                  <Printer className="w-4 h-4 mr-2" />
                  พิมพ์ที่เลือก
              </button>
              <button 
                  onClick={() => setSelectedTeamIds(new Set())}
                  className="p-1 hover:bg-gray-700 rounded-full"
              >
                  <X className="w-4 h-4" />
              </button>
          </div>
      )}

      {/* Mobile View (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
          {paginatedTeams.map(team => {
              const activity = data.activities.find(a => a.id === team.activityId);
              const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
              const { tCount, sCount } = getMemberCounts(team);
              
              // Score Check
              const score = viewLevel === 'area' ? (safeJsonParse(team.stageInfo || '{}', {}).score || 0) : team.score;
              const hasScore = score > 0;
              const isSelected = selectedTeamIds.has(team.teamId);

              return (
                  <div key={team.teamId} className={`bg-white p-4 rounded-xl shadow-sm border ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-100'} relative overflow-hidden transition-all`} onClick={() => handleSelectTeam(team.teamId)}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${viewLevel === 'area' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-2 pl-2">
                          <div className="flex items-center gap-2">
                              <div className={`shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                  {isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                              </div>
                              <h3 className="font-bold text-gray-900 line-clamp-1 font-kanit">{team.teamName}</h3>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{team.teamId}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 flex items-center pl-2 ml-7"><School className="w-3 h-3 mr-1.5"/> {school?.SchoolName}</p>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-1 pl-2 ml-7">{activity?.name}</p>
                      
                      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg ml-9">
                          <div className="flex items-center"><UserIcon className="w-3 h-3 mr-1 text-indigo-500"/> ครู: {tCount}</div>
                          <div className="flex items-center"><GraduationCap className="w-3 h-3 mr-1 text-green-500"/> นักเรียน: {sCount}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pl-2 ml-7">
                          {type === 'idcard' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedTeamForDigital(team); }}
                                className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-colors ${viewLevel === 'area' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                              >
                                  <Smartphone className="w-4 h-4 mr-1.5" /> Digital ID
                              </button>
                          )}
                          {/* Print Button - Conditional */}
                          {type === 'certificate' ? (
                              hasScore ? (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handlePrintTeams([team]); }}
                                    className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors bg-green-600 hover:bg-green-700 col-span-2"
                                  >
                                      <Printer className="w-4 h-4 mr-1.5" /> พิมพ์เกียรติบัตร
                                  </button>
                              ) : (
                                  <div className="col-span-2 text-center text-xs text-gray-400 py-2 border border-dashed rounded bg-gray-50">
                                      ยังไม่มีผลคะแนน
                                  </div>
                              )
                          ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handlePrintTeams([team]); }}
                                className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors ${viewLevel === 'area' ? 'bg-purple-600 hover:bg-purple-700 col-span-1' : 'bg-blue-600 hover:bg-blue-700 col-span-1'}`}
                              >
                                  <Printer className="w-4 h-4 mr-1.5" /> พิมพ์บัตร
                              </button>
                          )}
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className={viewLevel === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                      <tr>
                          <th className="px-4 py-3 w-10 text-center">
                              <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
                                  {selectedTeamIds.size === paginatedTeams.length && paginatedTeams.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </button>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการแข่งขัน</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โรงเรียน</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สมาชิก ({viewLevel === 'area' ? 'เขต' : 'กลุ่ม'})</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ดำเนินการ</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedTeams.map((team) => {
                          const activity = data.activities.find(a => a.id === team.activityId);
                          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                          const { tCount, sCount } = getMemberCounts(team);
                          const score = viewLevel === 'area' ? (safeJsonParse(team.stageInfo || '{}', {}).score || 0) : team.score;
                          const hasScore = score > 0;
                          const isSelected = selectedTeamIds.has(team.teamId);

                          return (
                              <tr key={team.teamId} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`} onClick={() => handleSelectTeam(team.teamId)}>
                                  <td className="px-4 py-4 text-center">
                                      <div className={`cursor-pointer ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900 font-kanit">{team.teamName}</div>
                                      <div className="text-xs text-gray-500 font-mono">{team.teamId}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900 max-w-[200px] truncate" title={activity?.name}>{activity?.name}</div>
                                      <div className="text-xs text-gray-500">{team.level}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{school?.SchoolName}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <div className="text-xs text-gray-600 flex justify-center gap-3">
                                          <span className="flex items-center bg-indigo-50 px-2 py-1 rounded border border-indigo-100 text-indigo-700" title="ครู"><UserIcon className="w-3 h-3 mr-1"/> {tCount}</span>
                                          <span className="flex items-center bg-green-50 px-2 py-1 rounded border border-green-100 text-green-700" title="นักเรียน"><GraduationCap className="w-3 h-3 mr-1"/> {sCount}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                          {type === 'idcard' && (
                                              <button 
                                                onClick={() => setSelectedTeamForDigital(team)}
                                                className={`flex items-center px-3 py-1.5 border rounded-lg transition-colors shadow-sm ${viewLevel === 'area' ? 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                              >
                                                  <Smartphone className="w-4 h-4 mr-1.5" />
                                                  Digital ID
                                              </button>
                                          )}
                                          
                                          {type === 'certificate' ? (
                                              hasScore ? (
                                                  <button 
                                                    onClick={() => handlePrintTeams([team])}
                                                    className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                                  >
                                                      <Printer className="w-4 h-4 mr-1.5" />
                                                      พิมพ์
                                                  </button>
                                              ) : (
                                                  <span className="text-xs text-gray-400 italic pr-2">รอผลคะแนน</span>
                                              )
                                          ) : (
                                              <button 
                                                onClick={() => handlePrintTeams([team])}
                                                className="flex items-center px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
                                              >
                                                  <Printer className="w-4 h-4 mr-1.5" />
                                                  พิมพ์
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {paginatedTeams.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-500 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/50">
                                  <Printer className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                  <p>ไม่พบข้อมูลทีมสำหรับพิมพ์เอกสาร</p>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
              <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                  ก่อนหน้า
              </button>
              <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                  ถัดไป
              </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                  <p className="text-sm text-gray-700">
                      แสดง <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTeams.length)}</span> จาก <span className="font-medium">{filteredTeams.length}</span> รายการ
                  </p>
              </div>
              <div className="flex items-center gap-2">
                  <select
                      className="block rounded-md border-gray-300 py-1.5 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  >
                      <option value={12}>12 / หน้า</option>
                      <option value={24}>24 / หน้า</option>
                      <option value={48}>48 / หน้า</option>
                  </select>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                  </nav>
              </div>
          </div>
      </div>
    </div>
  );
};

export default DocumentsView;
