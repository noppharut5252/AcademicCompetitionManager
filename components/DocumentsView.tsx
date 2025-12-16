
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, Team, TeamStatus, User, CertificateTemplate } from '../types';
import { Search, Printer, IdCard, Smartphone, CheckCircle, X, ChevronLeft, ChevronRight, User as UserIcon, GraduationCap, School, MapPin, LayoutGrid, Trophy, Lock, QrCode, Maximize2, Minimize2, Share2, Download, Settings, FileBadge, Loader2, Calendar, Clock, Sparkles } from 'lucide-react';
import CertificateConfigModal from './CertificateConfigModal';
import { getCertificateConfig } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { shareIdCard } from '../services/liff';

interface DocumentsViewProps {
  data: AppData;
  type: 'certificate' | 'idcard';
  user?: User | null;
}

// --- Helper for QR Code URL ---
const getQrCodeUrl = (text: string, size: number = 150) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=10`;
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
                        <img 
                            src={getQrCodeUrl(`${window.location.origin}${window.location.pathname}#/idcards?id=${team.teamId}&level=${viewLevel}`, 300)} 
                            alt="QR" 
                            className="w-full h-full object-contain mix-blend-multiply" 
                        />
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

const ArrowLeftRightIcon = ({className}:{className?:string}) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

// --- DigitalIdCard (Preview Card) ---
const DigitalIdCard = ({ member, role, team, activity, schoolName, viewLevel, onClick }: { member: any, role: string, team: Team, activity: string, schoolName: string, viewLevel: 'cluster' | 'area', onClick: () => void }) => {
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
            const areaInfo = JSON.parse(team.stageInfo);
            if (areaInfo.members) memberSource = areaInfo.members;
        } catch {}
    }

    try {
        const rawMembers = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
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

  // URL Params for Auto-Opening ID Card
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
      // Check for 'id' parameter in URL to auto-open Digital ID
      const teamIdParam = searchParams.get('id');
      const levelParam = searchParams.get('level');

      if (teamIdParam && type === 'idcard' && data.teams.length > 0) {
          const foundTeam = data.teams.find(t => t.teamId === teamIdParam);
          if (foundTeam) {
              if (levelParam === 'area' || levelParam === 'cluster') {
                  setViewLevel(levelParam as 'cluster' | 'area');
              }
              setSelectedTeamForDigital(foundTeam);
              // Clean up the URL parameter to prevent reopening on refresh if desired, 
              // or keep it to allow sharing. Keeping it for now.
          }
      }
  }, [searchParams, data.teams, type]);

  useEffect(() => {
      // Fetch templates from API on load
      const loadTemplates = async () => {
          if (type === 'certificate') {
              const configs = await getCertificateConfig();
              setCertificateTemplates(configs);
          }
      };
      loadTemplates();
  }, [type]);

  const handleSaveTemplates = (newTemplates: Record<string, CertificateTemplate>) => {
      setCertificateTemplates(newTemplates);
      // Saved to backend in modal, updating local state here
  };

  const title = type === 'certificate' ? 'พิมพ์เกียรติบัตร (Certificates)' : 'พิมพ์บัตรประจำตัว (ID Cards)';
  const description = type === 'certificate' 
    ? 'ดาวน์โหลดเกียรติบัตรสำหรับทีมที่ได้รับรางวัล' 
    : 'พิมพ์บัตรประจำตัวผู้เข้าแข่งขันและครูผู้ฝึกสอน หรือแสดงบัตรดิจิทัล';

  const userRole = user?.level?.toLowerCase();
  const isSuperUser = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const canConfigureCert = isSuperUser || isGroupAdmin;

  // Helper: Count Members
  const getMemberCounts = (team: Team) => {
      let tCount = 0;
      let sCount = 0;
      
      let memberSource = team.members;
      if (viewLevel === 'area' && team.stageInfo) {
          try {
              const areaInfo = JSON.parse(team.stageInfo);
              if (areaInfo.members) memberSource = areaInfo.members;
          } catch {}
      }

      try {
          const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
          if (Array.isArray(raw)) {
              sCount = raw.length;
          } else if (raw && typeof raw === 'object') {
              tCount = Array.isArray(raw.teachers) ? raw.teachers.length : 0;
              sCount = Array.isArray(raw.students) ? raw.students.length : 0;
          }
      } catch {}
      return { tCount, sCount };
  };

  // Filter Logic
  const filteredTeams = useMemo(() => {
    return data.teams.filter(team => {
        // ... (Existing Permission Logic) ...
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

        // Area Logic
        if (viewLevel === 'area') {
            const isRep = String(team.flag).toUpperCase() === 'TRUE';
            const isRank1 = String(team.rank) === '1'; 
            if (!isRep || !isRank1) return false;
        }
        
        const activity = data.activities.find(a => a.id === team.activityId);
        const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
        const term = searchTerm.toLowerCase();
        
        return (
            team.teamName.toLowerCase().includes(term) || 
            team.teamId.toLowerCase().includes(term) ||
            (school && school.SchoolName.toLowerCase().includes(term)) ||
            (activity && activity.name.toLowerCase().includes(term))
        );
    });
  }, [data.teams, data.schools, data.activities, searchTerm, type, user, viewLevel]);

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrint = async (team: Team) => {
      // Start Loading Overlay
      setIsGenerating(true);
      
      // Delay slightly to allow UI update
      await new Promise(resolve => setTimeout(resolve, 500));

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          setIsGenerating(false);
          alert('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
          return;
      }

      const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
      const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const schoolName = schoolObj?.SchoolName || team.schoolId;
      const clusterID = schoolObj?.SchoolCluster;
      const clusterName = clusterID ? data.clusters.find(c => c.ClusterID === clusterID)?.ClusterName : '';

      const levelTitle = viewLevel === 'area' ? 'ระดับเขตพื้นที่การศึกษา' : 'ระดับกลุ่มเครือข่าย';
      
      let allMembers: any[] = [];
      let memberSource = team.members;
      
      // Stage Check for members
      if (viewLevel === 'area' && team.stageInfo) {
          try {
              const areaInfo = JSON.parse(team.stageInfo);
              if (areaInfo.members) memberSource = areaInfo.members;
          } catch {}
      }

      try {
          const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
          if (Array.isArray(raw)) {
              allMembers = raw.map(m => ({ ...m, role: 'Student' }));
          } else if (raw && typeof raw === 'object') {
              const teachers = (Array.isArray(raw.teachers) ? raw.teachers : []).map((m: any) => ({ ...m, role: 'Teacher' }));
              const students = (Array.isArray(raw.students) ? raw.students : []).map((m: any) => ({ ...m, role: 'Student' }));
              allMembers = [...teachers, ...students];
          }
      } catch {}

      if (type === 'certificate') {
          // Resolve Template
          let template: CertificateTemplate;
          if (viewLevel === 'area') {
              template = certificateTemplates['area'];
          } else {
              template = clusterID ? certificateTemplates[clusterID] : undefined;
          }
          
          // Fallback Default
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
                  contentTop: 25,
                  footerBottom: 25,
                  logoHeight: 35
              } as CertificateTemplate;
          }

          // Build Verification URL (To the app itself with hash router)
          const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify?id=${team.teamId}`;
          const qrUrl = getQrCodeUrl(verifyUrl, 100);

          // Resolve Event Name
          let eventNameDisplay = template.eventName;
          if (!eventNameDisplay) {
              eventNameDisplay = viewLevel === 'area' 
                ? 'งานศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่การศึกษา' 
                : `งานศิลปหัตถกรรมนักเรียน ${clusterName}`;
          }

          // Resolve Layout Configs
          const contentTop = template.contentTop ? `${template.contentTop}mm` : '25mm';
          const footerBottom = template.footerBottom ? `${template.footerBottom}mm` : '25mm';
          const logoHeight = template.logoHeight ? `${template.logoHeight}mm` : '35mm';

          // Serial Generation Function (Running Number)
          const generateSerial = (index: number) => {
              const fmt = template.serialFormat || '{activityId}-{year}-{run:4}';
              const start = template.serialStart || 1;
              const year = new Date().getFullYear();
              const thYear = year + 543;
              // Ensure running number is sequential based on current print batch order + start
              const runNum = start + index;
              
              let serial = fmt
                .replace('{year}', String(year))
                .replace('{th_year}', String(thYear))
                .replace('{id}', team.teamId)
                .replace('{activityId}', team.activityId); // Added activity ID support

              // Handle padding {run:X}
              if (serial.includes('{run:')) {
                  const match = serial.match(/{run:(\d+)}/);
                  if (match) {
                      const digits = parseInt(match[1]);
                      serial = serial.replace(match[0], String(runNum).padStart(digits, '0'));
                  }
              } else {
                  serial = serial.replace('{run}', String(runNum));
              }
              return serial;
          };

          // Build HTML for Certificates
          const htmlContent = `
            <html>
            <head>
                <title>Certificates - ${team.teamName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    @page { size: A4 landscape; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Sarabun', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .page {
                        width: 297mm;
                        height: 210mm;
                        position: relative;
                        overflow: hidden;
                        page-break-after: always;
                        background-color: white;
                    }
                    /* Simple Gold Frame - Modified for open bottom */
                    .frame-simple-gold {
                        position: absolute;
                        top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
                        border: 2px solid #D4AF37;
                        border-bottom: none; /* Open bottom */
                        opacity: 1.0;
                        box-sizing: border-box;
                        z-index: 1;
                        pointer-events: none;
                        border-radius: 8px 8px 0 0;
                    }
                    /* Add bottom corners */
                    .frame-simple-gold::before {
                        content: ''; position: absolute; bottom: 0; left: 0; height: 2px; width: 15%; background: #D4AF37;
                    }
                    .frame-simple-gold::after {
                        content: ''; position: absolute; bottom: 0; right: 0; height: 2px; width: 15%; background: #D4AF37;
                    }

                    /* Infinite Wave Frame - Fainter */
                    .frame-infinite-wave {
                        position: absolute;
                        top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
                        border: 2px solid #D4AF37;
                        /* SVG Wave Pattern - Opacity lowered to 0.15 */
                        background-image: url("data:image/svg+xml,%3Csvg width='40' height='20' viewBox='0 0 40 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q10 0 20 10 T40 10' fill='none' stroke='%23D4AF37' stroke-opacity='0.15' stroke-width='2'/%3E%3C/svg%3E");
                        background-size: 20mm 10mm;
                        z-index: 1;
                        pointer-events: none;
                        border-radius: 4px;
                    }
                    /* Ornamental Corners (Thai Style) */
                    .frame-ornamental-corners {
                        position: absolute;
                        top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
                        border: 3px double #D4AF37;
                        box-sizing: border-box;
                        z-index: 1;
                        pointer-events: none;
                    }
                    .frame-ornamental-corners::before, .frame-ornamental-corners::after {
                        content: ''; position: absolute; width: 100%; height: 100%; top: 0; left: 0;
                        /* Thai-ish Corner Pattern via SVG */
                        background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2,2 L30,2 L30,6 L6,6 L6,30 L2,30 Z M20,20 L35,20 L35,22 L22,22 L22,35 L20,35 Z' fill='%23D4AF37' /%3E%3C/svg%3E");
                        background-repeat: no-repeat;
                        background-position: top left;
                        background-size: 30mm 30mm;
                    }
                    .frame-ornamental-corners::after {
                        transform: rotate(180deg);
                    }
                    .frame-ornamental-extra {
                        position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; z-index: 1; pointer-events: none;
                        background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2,2 L30,2 L30,6 L6,6 L6,30 L2,30 Z M20,20 L35,20 L35,22 L22,22 L22,35 L20,35 Z' fill='%23D4AF37' /%3E%3C/svg%3E");
                        background-repeat: no-repeat;
                        background-position: top right;
                        background-size: 30mm 30mm;
                        transform: scaleX(-1);
                    }
                    .frame-ornamental-extra2 {
                        position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; z-index: 1; pointer-events: none;
                        background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2,2 L30,2 L30,6 L6,6 L6,30 L2,30 Z M20,20 L35,20 L35,22 L22,22 L22,35 L20,35 Z' fill='%23D4AF37' /%3E%3C/svg%3E");
                        background-repeat: no-repeat;
                        background-position: bottom left;
                        background-size: 30mm 30mm;
                        transform: scaleY(-1);
                    }

                    .bg-img {
                        position: absolute;
                        top: 0; left: 0; width: 100%; height: 100%;
                        object-fit: cover;
                        z-index: 0;
                    }
                    @media print {
                        .bg-img, .frame-infinite-wave, .frame-ornamental-corners, .frame-simple-gold {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }

                    .content {
                        position: relative;
                        z-index: 10;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding-top: ${contentTop}; /* Configurable */
                        box-sizing: border-box;
                    }
                    .logos {
                        display: flex;
                        justify-content: space-between;
                        width: 80%;
                        height: ${logoHeight}; /* Configurable */
                        margin-bottom: 5mm;
                        position: relative;
                    }
                    /* Support PNG Transparency */
                    .logo-img { height: 100%; object-fit: contain; background-color: transparent; }
                    .header { font-size: 24pt; font-weight: bold; color: #1e3a8a; margin-bottom: 5mm; text-align: center; line-height: 1.2; text-shadow: 1px 1px 0px rgba(255,255,255,0.8); }
                    .subheader { font-size: 16pt; margin-bottom: 8mm; text-align: center; }
                    .name { font-size: 32pt; font-weight: bold; color: #111; margin-bottom: 5mm; font-family: 'Thasadith', sans-serif; text-align: center; border-bottom: 2px dotted #ccc; padding: 0 20px; min-width: 50%; }
                    .desc { font-size: 16pt; margin-bottom: 5mm; max-width: 80%; text-align: center; line-height: 1.5; }
                    .highlight { font-weight: bold; color: #2563eb; }
                    .date { font-size: 14pt; margin-top: auto; margin-bottom: 10mm; }
                    
                    .signatures {
                        display: flex;
                        justify-content: center;
                        gap: 15mm;
                        margin-bottom: ${footerBottom}; /* Configurable */
                        width: 90%;
                        align-items: flex-end;
                    }
                    .sig-block {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        min-width: 60mm;
                    }
                    /* Transparent signatures */
                    .sig-img { height: 20mm; object-fit: contain; margin-bottom: -5mm; z-index: 1; background-color: transparent; }
                    .sig-line { 
                        width: 100%; 
                        border-bottom: 1px dotted #000; 
                        margin-bottom: 2px;
                    }
                    .sig-name { font-size: 12pt; font-weight: bold; padding-top: 2px; width: 100%; margin-top: 3mm;}
                    .sig-pos { font-size: 10pt; white-space: pre-line; line-height: 1.3; margin-top: 2px; }
                    .logos.single { justify-content: center; }

                    /* QR Code Positioning */
                    .qr-verify {
                        position: absolute;
                        bottom: 10mm;
                        right: 10mm;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .qr-img { width: 22mm; height: 22mm; }
                    .qr-text { font-size: 8pt; margin-top: 2px; color: #666; font-weight: bold; text-transform: uppercase; }

                    /* Serial Number */
                    .serial-no {
                        position: absolute;
                        top: 10mm;
                        right: 10mm;
                        font-size: 10pt;
                        font-family: 'Courier New', monospace;
                        color: #555;
                        font-weight: bold;
                    }
                    .no-print { display: block; position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-family: 'Sarabun'; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        🖨️ พิมพ์ / บันทึก PDF (Print/Save PDF)
                    </button>
                </div>
                ${allMembers.map((member, idx) => {
                    const prefix = member.prefix || '';
                    const name = member.name || `${member.firstname || ''} ${member.lastname || ''}`;
                    const fullName = `${prefix}${name}`.trim();
                    const roleText = member.role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'นักเรียน';
                    const serialNo = generateSerial(idx);

                    let awardText = "เข้าร่วมการแข่งขัน";
                    if (template.showRank) {
                        const rank = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').rank || team.rank) : team.rank;
                        const medal = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').medal || team.medalOverride) : team.medalOverride;
                        
                        let medalThai = "";
                        if (medal === 'Gold') medalThai = "เหรียญทอง";
                        else if (medal === 'Silver') medalThai = "เหรียญเงิน";
                        else if (medal === 'Bronze') medalThai = "เหรียญทองแดง";
                        else if (medal === 'Participant') medalThai = "เข้าร่วม";

                        if (rank === '1' || rank === 1) awardText = `รางวัลชนะเลิศ${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                        else if (rank === '2' || rank === 2) awardText = `รางวัลรองชนะเลิศอันดับ 1${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                        else if (rank === '3' || rank === 3) awardText = `รางวัลรองชนะเลิศอันดับ 2${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                        else if (medalThai && medalThai !== "เข้าร่วม") awardText = `รางวัลระดับ${medalThai}${rank ? ` (ลำดับที่ ${rank})` : ''}`;
                        else awardText = "เข้าร่วมการแข่งขัน";
                    }

                    // Select Frame Style
                    let frameElement = '';
                    if (!template.backgroundUrl) {
                        if (template.frameStyle === 'infinite-wave') {
                            frameElement = '<div class="frame-infinite-wave"></div>';
                        } else if (template.frameStyle === 'ornamental-corners') {
                            frameElement = `
                                <div class="frame-ornamental-corners"></div>
                                <div class="frame-ornamental-extra"></div>
                                <div class="frame-ornamental-extra2"></div>
                            `;
                        } else if (template.frameStyle === 'simple-gold' || !template.frameStyle) {
                            frameElement = '<div class="frame-simple-gold"></div>';
                        }
                    }

                    return `
                    <div class="page">
                        ${template.backgroundUrl ? `<img src="${template.backgroundUrl}" class="bg-img" />` : frameElement}
                        <div class="serial-no">No. ${serialNo}</div>
                        <div class="content">
                            <div class="logos ${!template.logoRightUrl ? 'single' : ''}">
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
                                ${eventNameDisplay}
                            </div>
                            <div class="date">${template.dateText}</div>
                            <div class="signatures">
                                ${template.signatories.map(sig => `
                                    <div class="sig-block">
                                        ${sig.signatureUrl ? `<img src="${sig.signatureUrl}" class="sig-img" />` : '<div style="height:20mm;"></div>'}
                                        ${template.showSignatureLine !== false ? '<div class="sig-line"></div>' : ''}
                                        <div class="sig-name">(${sig.name})</div>
                                        <div class="sig-pos">${sig.position}</div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="qr-verify">
                                <img src="${qrUrl}" class="qr-img" />
                                <div class="qr-text">Scan for Verify</div>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
                <script>
                    // Auto print on load (optional, but convenient)
                    window.onload = function() {
                        setTimeout(function(){ window.print(); }, 500);
                    }
                </script>
            </body>
            </html>
          `;
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          
          setIsGenerating(false);

      } else {
          // ... (ID Card Logic - Just trigger print)
          setIsGenerating(false); 
          const pages = [];
          for (let i = 0; i < allMembers.length; i += 4) {
              pages.push(allMembers.slice(i, i + 4));
          }
          // IMPORTANT UPDATE: Generate Full URL for scanning into App with specific ID Cards path including LEVEL
          const appUrl = `${window.location.origin}${window.location.pathname}#/idcards?id=${team.teamId}&level=${viewLevel}`;
          const qrUrl = getQrCodeUrl(appUrl, 300); // Generate a larger QR source for better quality
          
          // Lookup Venue Info for Printing
          let scheduleText = 'สถานที่: ไม่ระบุ';
          let dateText = 'วันที่: ไม่ระบุ';
          if (data.venues) {
                for (const v of data.venues) {
                    const s = v.scheduledActivities?.find(act => act.activityId === team.activityId);
                    if (s) {
                        scheduleText = `สถานที่: ${v.name} ${s.room || ''}`;
                        dateText = `วันที่: ${s.date} (${s.timeRange || ''})`;
                        break;
                    }
                }
          }

          const headerColor = viewLevel === 'area' ? 'linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)' : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'; 
          const htmlContent = `
            <html>
              <head>
                <title>Print ID Cards - ${team.teamName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                  @page { size: A4; margin: 0; }
                  body { font-family: 'Kanit', sans-serif; margin: 0; padding: 0; background: #eee; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .page { width: 210mm; height: 296mm; background: white; margin: 0 auto; page-break-after: always; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; padding: 10mm; box-sizing: border-box; gap: 5mm; }
                  .card { border: 1px dashed #ccc; border-radius: 12px; overflow: hidden; position: relative; display: flex; flex-direction: column; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05); background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 20px 20px; }
                  .card-header { background: ${headerColor}; color: white; padding: 15px 10px; text-align: center; height: 80px; display: flex; flex-direction: column; justify-content: center; position: relative; }
                  .card-header::after { content: ''; position: absolute; bottom: -10px; left: 0; right: 0; height: 20px; background: white; border-radius: 50% 50% 0 0; }
                  .card-header h1 { margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
                  .card-header p { margin: 2px 0 0; font-size: 9pt; opacity: 0.9; }
                  .card-body { padding: 10px 15px; flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 1; }
                  .photo-container { width: 80px; height: 80px; margin-top: -30px; margin-bottom: 10px; border-radius: 50%; border: 4px solid white; background: #f3f4f6; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; }
                  .photo { width: 100%; height: 100%; object-fit: cover; }
                  .role-badge { display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 9pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
                  .role-teacher { background: #e0e7ff; color: #3730a3; }
                  .role-student { background: #dcfce7; color: #166534; }
                  .name { font-size: 14pt; font-weight: bold; color: #000; margin-bottom: 2px; line-height: 1.2; }
                  .school { font-size: 10pt; color: #555; margin-bottom: 5px; font-weight: 500; }
                  .team { font-size: 9pt; color: #777; margin-bottom: 10px; }
                  .activity-box { width: 100%; border-top: 1px dashed #ddd; padding-top: 8px; margin-top: auto; }
                  .activity-name { font-size: 10pt; color: #333; font-weight: 600; }
                  .info-row { font-size: 9pt; color: #666; margin-top: 4px; display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
                  .footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; background: #f9fafb; border-top: 1px solid #eee; }
                  .footer-text { text-align: left; }
                  /* INCREASED QR SIZE HERE */
                  .qr-code { width: 35mm; height: 35mm; display: block; mix-blend-mode: multiply; }
                  .no-print { display: block; position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
                  @media print { .no-print { display: none; } }
                </style>
              </head>
              <body>
                <div class="no-print">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-family: 'Kanit';">🖨️ พิมพ์ / บันทึก PDF</button>
                </div>
                ${pages.map(pageMembers => `
                  <div class="page">
                    ${pageMembers.map((m: any) => {
                        const prefix = m.prefix || '';
                        const name = m.name || `${m.firstname || ''} ${m.lastname || ''}`;
                        const fullName = `${prefix}${name}`.trim();
                        const roleClass = m.role === 'Teacher' ? 'role-teacher' : 'role-student';
                        const getImg = (mem: any) => { if (mem.image) return mem.image; if (mem.photoDriveId) return `https://drive.google.com/thumbnail?id=${mem.photoDriveId}`; return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; };
                        return `
                          <div class="card">
                            <div class="card-header"><h1>ID CARD</h1><p>${levelTitle}</p></div>
                            <div class="card-body">
                              <div class="photo-container"><img src="${getImg(m)}" class="photo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135768.png'" /></div>
                              <div class="${roleClass} role-badge">${m.role}</div>
                              <div class="name">${fullName}</div>
                              <div class="school">${schoolName}</div>
                              <div class="team">ทีม: ${team.teamName}</div>
                              <div class="activity-box">
                                <div class="activity-name">${activity}</div>
                                <div class="info-row">
                                    <span>${dateText}</span>
                                </div>
                                <div class="info-row">
                                    <span>${scheduleText}</span>
                                </div>
                              </div>
                            </div>
                            <div class="footer">
                                <div class="footer-text"><div style="font-size: 8pt; font-weight: bold; color: #555;">ID: ${team.teamId}</div><div style="font-size: 8pt; color: #888;">Scan for Check-in</div></div>
                                <img src="${qrUrl}" class="qr-code" />
                            </div>
                          </div>
                        `;
                    }).join('')}
                  </div>
                `).join('')}
              </body>
            </html>
          `;
          printWindow.document.write(htmlContent);
          printWindow.document.close();
      }
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

      {/* User Info Badge if School Admin */}
      {(user?.level === 'school_admin' || user?.level === 'user') && user.SchoolID && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center text-blue-700 text-sm">
               <School className="w-4 h-4 mr-2" />
               แสดงข้อมูลเฉพาะ: <span className="font-bold ml-1">{data.schools.find(s => s.SchoolID === user.SchoolID)?.SchoolName || user.SchoolID}</span>
          </div>
      )}
      
      {/* Area Level Warning */}
      {viewLevel === 'area' && (
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex items-center text-purple-700 text-sm">
               <Trophy className="w-4 h-4 mr-2" />
               ระดับเขตพื้นที่: แสดงเฉพาะทีมที่เป็นตัวแทน (Representative) และได้ลำดับที่ 1 เท่านั้น
          </div>
      )}

      {/* Mobile View (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
          {paginatedTeams.map(team => {
              const activity = data.activities.find(a => a.id === team.activityId);
              const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
              const { tCount, sCount } = getMemberCounts(team);
              
              // Score Check
              const score = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').score || 0) : team.score;
              const hasScore = score > 0;

              return (
                  <div key={team.teamId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${viewLevel === 'area' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-2 pl-2">
                          <h3 className="font-bold text-gray-900 line-clamp-1 font-kanit">{team.teamName}</h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{team.teamId}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 flex items-center pl-2"><School className="w-3 h-3 mr-1.5"/> {school?.SchoolName}</p>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-1 pl-2">{activity?.name}</p>
                      
                      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg ml-2">
                          <div className="flex items-center"><UserIcon className="w-3 h-3 mr-1 text-indigo-500"/> ครู: {tCount}</div>
                          <div className="flex items-center"><GraduationCap className="w-3 h-3 mr-1 text-green-500"/> นักเรียน: {sCount}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pl-2">
                          {type === 'idcard' && (
                              <button 
                                onClick={() => setSelectedTeamForDigital(team)}
                                className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-colors ${viewLevel === 'area' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                              >
                                  <Smartphone className="w-4 h-4 mr-1.5" /> Digital ID
                              </button>
                          )}
                          {/* Print Button - Conditional */}
                          {type === 'certificate' ? (
                              hasScore ? (
                                  <button 
                                    onClick={() => handlePrint(team)}
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
                                onClick={() => handlePrint(team)}
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
                          const score = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').score || 0) : team.score;
                          const hasScore = score > 0;

                          return (
                              <tr key={team.teamId} className="hover:bg-gray-50 transition-colors">
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
                                      <div className="flex items-center justify-end gap-2">
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
                                                    onClick={() => handlePrint(team)}
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
                                                onClick={() => handlePrint(team)}
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
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/50">
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

