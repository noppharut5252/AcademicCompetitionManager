
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppData, Team, School } from '../types';
import { fetchData } from '../services/api';
import { Trophy, Medal, Activity, Clock, Crown, TrendingUp, Sparkles, MonitorPlay, Maximize2, Minimize2, Wifi, WifiOff, RefreshCw, LayoutGrid, Users, Star, Heart, Zap, Award, School as SchoolIcon, Calendar, Image as ImageIcon, ChevronLeft, ChevronRight, MapPin, Camera, Aperture, Share2, X, Grid, ShieldCheck, Flame, Split, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import confetti from 'canvas-confetti';

interface LiveScoreViewProps {
  initialData: AppData;
}

// --- Utility Components ---

const NumberTicker = ({ value, decimals = 0 }: { value: number, decimals?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;

        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            
            const current = start + (end - start) * ease;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(end);
            }
        };
        requestAnimationFrame(animate);
    }, [value]);

    return <span>{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

const ProgressBar = ({ duration, onComplete, isPaused, keyReset }: { duration: number, onComplete: () => void, isPaused: boolean, keyReset: any }) => {
    const [progress, setProgress] = useState(0);
    
    useEffect(() => {
        setProgress(0); // Reset on slide change
    }, [keyReset]);

    useEffect(() => {
        if (isPaused) return;
        const interval = 100;
        const step = 100 / (duration / interval);
        
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    onComplete();
                    return 0;
                }
                return prev + step;
            });
        }, interval);
        
        return () => clearInterval(timer);
    }, [duration, onComplete, isPaused, keyReset]);

    return (
        <div className="h-1 bg-white/10 w-full fixed bottom-0 left-0 z-50">
            <div 
                className="h-full bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    );
};

const getTeamImage = (team: any) => {
    if (team.logoUrl && team.logoUrl.startsWith('http')) return team.logoUrl;
    if (team.teamPhotoId) return `https://drive.google.com/thumbnail?id=${team.teamPhotoId}&sz=w400`;
    return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png";
};

// --- Slides Components ---

const WelcomeSlide = ({ viewLevel }: { viewLevel: string }) => (
    <div className="flex flex-col h-full justify-center items-center px-4 animate-in zoom-in duration-1000 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent animate-pulse"></div>
        
        <div className="bg-white/10 p-6 rounded-full mb-8 border border-white/20 shadow-[0_0_50px_rgba(59,130,246,0.3)] backdrop-blur-md animate-[bounce_3s_infinite]">
            <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-lg" />
        </div>

        <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white mb-6 text-center drop-shadow-sm tracking-tight">
            Academic Competition
        </h1>
        
        <div className="flex items-center gap-4 bg-black/30 px-6 py-3 rounded-full border border-white/10 backdrop-blur-sm mb-8">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
            <span className="text-xl md:text-2xl text-white font-medium tracking-widest uppercase">
                {viewLevel === 'area' ? 'District Level' : 'Cluster Level'} • Ready to Start
            </span>
        </div>

        <p className="text-white/50 text-sm md:text-lg max-w-2xl text-center leading-relaxed">
            ยินดีต้อนรับคณะกรรมการ ครูผู้ฝึกสอน และนักเรียนทุกคนสู่การแข่งขัน<br/>
            ระบบจะเริ่มแสดงผลคะแนนทันทีที่มีการบันทึกข้อมูล
        </p>
    </div>
);

// NEW: Dual Track Slide (Movement of 2 Competitions)
const DualTrackSlide = ({ recentTeams }: { recentTeams: any[] }) => {
    // Split recent results into two streams (simulating 2 venues/tracks)
    const { trackA, trackB } = useMemo(() => {
        const a: any[] = [];
        const b: any[] = [];
        recentTeams.slice(0, 8).forEach((t, i) => {
            if (i % 2 === 0) a.push(t);
            else b.push(t);
        });
        return { trackA: a, trackB: b };
    }, [recentTeams]);

    if (recentTeams.length < 2) return null;

    const RenderCard = ({ item, colorTheme }: { item: any, colorTheme: 'blue' | 'orange' }) => (
        <div className={`flex items-center p-4 bg-white/5 border ${colorTheme === 'blue' ? 'border-blue-500/30' : 'border-orange-500/30'} rounded-xl backdrop-blur-sm mb-3 shadow-lg transform transition-all hover:scale-[1.02]`}>
            <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-black/30 mr-3 shrink-0">
                <img src={getTeamImage(item)} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0">
                <div className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${colorTheme === 'blue' ? 'text-blue-400' : 'text-orange-400'}`}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) : 'Live'}
                </div>
                <h4 className="text-white font-bold text-sm truncate leading-tight">{item.teamName}</h4>
                <p className="text-white/50 text-xs truncate">{item.activityName}</p>
            </div>
            <div className="text-right pl-2">
                <div className="text-2xl font-black text-white leading-none">{item.score}</div>
                {item.medal && (
                    <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold mt-1 ${item.medal.includes('Gold') ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white'}`}>
                        {item.medal.toUpperCase()}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full px-4 md:px-12 py-8 animate-in fade-in duration-700">
            <div className="text-center mb-6">
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider flex items-center justify-center">
                    <ArrowRightLeft className="w-10 h-10 md:w-14 md:h-14 mr-4 text-white/80" />
                    Competition Pulse
                </h2>
                <p className="text-white/60 text-sm md:text-lg">Real-time updates across tracks</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 h-full overflow-hidden">
                {/* Track A */}
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-blue-500/30 pb-2">
                        <span className="text-blue-400 font-bold uppercase tracking-widest text-sm flex items-center">
                            <Activity className="w-4 h-4 mr-2" /> Track A
                        </span>
                        <div className="flex space-x-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></span>
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {trackA.map((t, i) => (
                            <div key={i} className="animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                <RenderCard item={t} colorTheme="blue" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Track B */}
                <div className="flex-1 flex flex-col mt-4 md:mt-0">
                    <div className="flex items-center justify-between mb-4 border-b border-orange-500/30 pb-2">
                        <span className="text-orange-400 font-bold uppercase tracking-widest text-sm flex items-center">
                            <Zap className="w-4 h-4 mr-2" /> Track B
                        </span>
                        <div className="flex space-x-1">
                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse delay-75"></span>
                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse delay-150"></span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {trackB.map((t, i) => (
                            <div key={i} className="animate-in slide-in-from-right duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                <RenderCard item={t} colorTheme="orange" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SchoolRollCallSlide = ({ schools }: { schools: School[] }) => {
    const displaySchools = useMemo(() => schools.sort(() => 0.5 - Math.random()).slice(0, 20), [schools]);
    
    return (
        <div className="flex flex-col h-full justify-center px-4 animate-in fade-in duration-1000">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10 text-center uppercase tracking-wider flex items-center justify-center">
                <SchoolIcon className="w-12 h-12 md:w-16 md:h-16 mr-4 text-blue-400" />
                Participating Schools
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {displaySchools.map((s, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center justify-center text-center shadow-lg transform hover:scale-105 transition-all">
                        <span className="text-white font-bold text-sm md:text-lg">{s.SchoolName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ScheduleSlide = ({ venues }: { venues: any[] }) => {
    const schedules = useMemo(() => {
        const list: any[] = [];
        venues.forEach(v => {
            v.scheduledActivities?.forEach((s: any) => {
                list.push({ venue: v.name, ...s });
            });
        });
        return list.slice(0, 5); // Show first 5 upcoming
    }, [venues]);

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in slide-in-from-bottom duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10 text-center uppercase tracking-wider flex items-center justify-center">
                <Calendar className="w-12 h-12 md:w-16 md:h-16 mr-4 text-orange-400" />
                Schedule
            </h2>
            <div className="space-y-4">
                {schedules.map((s, idx) => (
                    <div key={idx} className="flex items-center bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-orange-400 font-bold text-xl mr-4 w-24">{s.timeRange || 'Today'}</div>
                        <div className="flex-1">
                            <div className="text-white font-bold text-lg">{s.activityName}</div>
                            <div className="text-white/50 text-sm flex items-center">
                                <MapPin className="w-3 h-3 mr-1" /> {s.venue} {s.room}
                            </div>
                        </div>
                    </div>
                ))}
                {schedules.length === 0 && <div className="text-white/50 text-center">No upcoming schedules</div>}
            </div>
        </div>
    );
};

// Helper for QR Icon
const QrCodeIcon = ({className}:{className?:string}) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6.414a1 1 0 00-.707.293L4.293 16.707A1 1 0 004 17.414V20h4.586a1 1 0 00.707-.293l1.414-1.414a1 1 0 00.293-.707V16zM6 6h6v6H6V6zm1.5 1.5v3h3v-3h-3zm6.5.5h1v1h-1V8zm1.5 1.5h1v1h-1V9.5zm-1.5 1.5h1v1h-1v-1zm1.5 1.5h1v1h-1v-1z" />
    </svg>
);

const EngagementSlide = () => (
    <div className="flex flex-col h-full justify-center items-center px-4 animate-in zoom-in duration-1000">
        <div className="bg-white p-4 rounded-3xl shadow-2xl mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
             <div className="w-48 h-48 bg-gray-900 rounded-xl flex items-center justify-center">
                 <QrCodeIcon className="w-32 h-32 text-white" />
             </div>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-white mb-4 text-center">Scan for Live Results</h2>
        <p className="text-white/70 text-xl text-center max-w-lg">
            Follow the competition in real-time on your mobile device.
        </p>
    </div>
);

const LeaderboardSlide = ({ schools, viewLevel }: { schools: any[], viewLevel: string }) => {
    const topSchools = schools.slice(0, 5);
    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in slide-in-from-left duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10 text-center uppercase tracking-wider flex items-center justify-center">
                <Crown className="w-12 h-12 md:w-16 md:h-16 mr-4 text-yellow-400" />
                Leaderboard ({viewLevel === 'area' ? 'District' : 'Cluster'})
            </h2>
            <div className="space-y-3">
                {topSchools.map((s, idx) => (
                    <div key={idx} className="flex items-center bg-white/10 border border-white/10 rounded-xl p-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl mr-4 ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-orange-500 text-black' : 'bg-white/20 text-white'}`}>
                            {idx + 1}
                        </div>
                        <div className="flex-1 text-white font-bold text-lg md:text-xl truncate">{s.name}</div>
                        <div className="flex gap-4 text-sm md:text-base">
                            <div className="flex items-center text-yellow-400"><Medal className="w-4 h-4 mr-1" /> {s.gold}</div>
                            <div className="flex items-center text-gray-300"><Medal className="w-4 h-4 mr-1" /> {s.silver}</div>
                            <div className="font-mono font-bold text-white bg-white/20 px-2 py-0.5 rounded">{s.totalScore} pts</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PodiumSlide = ({ schools }: { schools: any[] }) => {
    const top3 = schools.slice(0, 3);
    if (top3.length < 3) return null; // Need at least 3 to show podium

    return (
        <div className="flex flex-col h-full justify-end pb-20 px-4 items-center animate-in zoom-in duration-700 relative">
            <h2 className="absolute top-20 text-4xl md:text-6xl font-black text-white text-center uppercase tracking-widest drop-shadow-lg">
                Top Schools
            </h2>
            <div className="flex items-end justify-center gap-4 md:gap-8 w-full max-w-4xl">
                {/* 2nd Place */}
                <div className="flex flex-col items-center w-1/3">
                    <div className="text-white font-bold text-lg md:text-2xl text-center mb-2 drop-shadow-md">{top3[1].name}</div>
                    <div className="w-full h-40 md:h-64 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg flex flex-col justify-end items-center p-4 shadow-xl border-t-4 border-gray-200">
                        <span className="text-4xl md:text-6xl font-black text-gray-600 opacity-50">2</span>
                        <div className="mt-2 bg-black/20 px-3 py-1 rounded text-white font-bold">{top3[1].gold} Gold</div>
                    </div>
                </div>
                {/* 1st Place */}
                <div className="flex flex-col items-center w-1/3 -mt-10 z-10">
                    <Crown className="w-12 h-12 text-yellow-400 mb-2 animate-bounce" />
                    <div className="text-white font-bold text-xl md:text-3xl text-center mb-2 drop-shadow-md">{top3[0].name}</div>
                    <div className="w-full h-56 md:h-80 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg flex flex-col justify-end items-center p-4 shadow-2xl border-t-4 border-yellow-100">
                        <span className="text-6xl md:text-8xl font-black text-yellow-700 opacity-50">1</span>
                        <div className="mt-2 bg-black/20 px-4 py-2 rounded text-white font-bold text-lg">{top3[0].gold} Gold</div>
                    </div>
                </div>
                {/* 3rd Place */}
                <div className="flex flex-col items-center w-1/3">
                    <div className="text-white font-bold text-lg md:text-2xl text-center mb-2 drop-shadow-md">{top3[2].name}</div>
                    <div className="w-full h-32 md:h-48 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg flex flex-col justify-end items-center p-4 shadow-xl border-t-4 border-orange-300">
                        <span className="text-4xl md:text-6xl font-black text-orange-800 opacity-50">3</span>
                        <div className="mt-2 bg-black/20 px-3 py-1 rounded text-white font-bold">{top3[2].gold} Gold</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GallerySlide = ({ teams }: { teams: Team[] }) => {
    const displayTeams = useMemo(() => teams.filter(t => t.score > 0).sort(() => 0.5 - Math.random()).slice(0, 8), [teams]);
    
    return (
        <div className="flex flex-col h-full justify-center px-4 animate-in fade-in duration-1000">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10 text-center uppercase tracking-wider">
                Gallery of Champions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {displayTeams.map((t, idx) => (
                    <div key={idx} className="aspect-square bg-white/10 rounded-xl overflow-hidden relative group">
                        <img src={getTeamImage(t)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                            <div className="text-white font-bold text-sm truncate">{t.teamName}</div>
                            <div className="text-white/70 text-xs truncate">{t.score} Points</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GoldClubSlide = ({ teams }: { teams: any[] }) => {
    const goldTeams = useMemo(() => teams.filter(t => (t.medal||'').includes('Gold')).slice(0, 10), [teams]);
    
    return (
        <div className="flex flex-col h-full justify-center px-4 animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center justify-center mb-10">
                <Star className="w-12 h-12 text-yellow-400 mr-3 fill-current animate-spin-slow" />
                <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 uppercase tracking-widest">
                    The Gold Club
                </h2>
                <Star className="w-12 h-12 text-yellow-400 ml-3 fill-current animate-spin-slow" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto w-full">
                {goldTeams.map((t, idx) => (
                    <div key={idx} className="flex items-center bg-gradient-to-r from-yellow-900/40 to-black/40 border border-yellow-500/30 rounded-xl p-3">
                        <div className="w-12 h-12 rounded-full border-2 border-yellow-400 overflow-hidden mr-3 shrink-0">
                            <img src={getTeamImage(t)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-yellow-100 font-bold text-lg truncate">{t.teamName}</div>
                            <div className="text-yellow-500/70 text-xs truncate">{t.activityName}</div>
                        </div>
                        <div className="text-2xl font-black text-yellow-400">{t.score}</div>
                    </div>
                ))}
                {goldTeams.length === 0 && <div className="col-span-full text-center text-yellow-100/50 text-xl">Waiting for the first Gold...</div>}
            </div>
        </div>
    );
};

const SchoolExcellenceSlide = ({ schools }: { schools: any[] }) => {
    const topPerforming = schools.sort((a, b) => b.gold - a.gold).slice(0, 4);
    
    return (
        <div className="flex flex-col h-full justify-center px-4 animate-in zoom-in-95 duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-12 text-center uppercase tracking-wider flex items-center justify-center">
                <Award className="w-12 h-12 md:w-16 md:h-16 mr-4 text-purple-400" />
                School Excellence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
                {topPerforming.map((s, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                        <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-lg border-4 border-purple-400">
                            {s.name.charAt(0)}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 line-clamp-1">{s.name}</h3>
                        <div className="flex gap-4 mt-2">
                            <div className="text-center">
                                <div className="text-3xl font-black text-yellow-400">{s.gold}</div>
                                <div className="text-xs text-white/50 uppercase">Gold</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-black text-gray-300">{s.silver}</div>
                                <div className="text-xs text-white/50 uppercase">Silver</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-black text-white">{s.totalScore}</div>
                                <div className="text-xs text-white/50 uppercase">Points</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BestInClassSlide = ({ teams, categories }: { teams: any[], categories: string[] }) => {
    const bestTeams = useMemo(() => {
        return categories.map(cat => {
            const inCat = teams.filter(t => t.category === cat).sort((a, b) => b.score - a.score);
            return { cat, team: inCat[0] };
        }).filter(item => item.team).slice(0, 4);
    }, [teams, categories]);

    return (
        <div className="flex flex-col h-full justify-center px-4 animate-in slide-in-from-right duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10 text-center uppercase tracking-wider">
                Best In Class
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
                {bestTeams.map((item, idx) => (
                    <div key={idx} className="relative bg-white/10 rounded-xl overflow-hidden group">
                        <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-br-xl z-10 uppercase tracking-widest">
                            {item.cat}
                        </div>
                        <div className="p-6 flex items-center">
                            <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden mr-6 shrink-0 bg-black/40">
                                <img src={getTeamImage(item.team)} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-2xl font-bold text-white mb-1 truncate">{item.team.teamName}</h3>
                                <p className="text-white/60 mb-2 truncate">{item.team.schoolName}</p>
                                <div className="inline-block bg-green-500 text-white font-bold px-3 py-1 rounded-full text-sm">
                                    {item.team.score} Points
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HighlightSlide = ({ winner }: { winner: any }) => {
    if (!winner) return null;
    return (
        <div className="flex flex-col h-full justify-center items-center px-4 animate-in zoom-in duration-1000 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent animate-pulse"></div>
            
            <div className="text-yellow-400 font-bold tracking-[0.5em] uppercase mb-4 animate-bounce">Spotlight Winner</div>
            
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-50 group-hover:opacity-80 transition-opacity rounded-full"></div>
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-8 border-yellow-400 overflow-hidden relative z-10 shadow-2xl">
                    <img src={getTeamImage(winner)} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black px-6 py-2 rounded-full whitespace-nowrap border-4 border-white z-20 shadow-lg text-xl md:text-2xl">
                    {winner.score} PTS
                </div>
            </div>

            <h2 className="text-4xl md:text-7xl font-black text-white text-center mb-2 drop-shadow-lg tracking-tight">
                {winner.teamName}
            </h2>
            <p className="text-xl md:text-3xl text-white/80 font-light mb-4">{winner.schoolName}</p>
            <div className="bg-white/10 px-6 py-2 rounded-full backdrop-blur-md border border-white/20 text-white/90">
                {winner.activityName}
            </div>
        </div>
    );
};

const StatsSlide = ({ totalTeams, totalGold, totalScored, viewLevel }: { totalTeams: number, totalGold: number, totalScored: number, viewLevel: string }) => {
    const progress = totalTeams > 0 ? Math.round((totalScored / totalTeams) * 100) : 0;
    
    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in fade-in duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-16 text-center uppercase tracking-wider">
                Competition Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center flex flex-col items-center">
                    <Users className="w-12 h-12 text-blue-400 mb-4" />
                    <div className="text-5xl font-black text-white mb-2"><NumberTicker value={totalTeams} /></div>
                    <div className="text-white/50 uppercase tracking-widest text-sm">Total Teams</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center flex flex-col items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-green-500/10" style={{ height: `${progress}%`, top: 'auto', bottom: 0 }}></div>
                    <Activity className="w-12 h-12 text-green-400 mb-4 z-10" />
                    <div className="text-5xl font-black text-white mb-2 z-10">{progress}%</div>
                    <div className="text-white/50 uppercase tracking-widest text-sm z-10">Completed</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center flex flex-col items-center">
                    <Trophy className="w-12 h-12 text-yellow-400 mb-4" />
                    <div className="text-5xl font-black text-yellow-400 mb-2"><NumberTicker value={totalGold} /></div>
                    <div className="text-white/50 uppercase tracking-widest text-sm">Gold Medals</div>
                </div>
            </div>
        </div>
    );
};

const ChampionBackdropSlide = () => (
    <div className="flex flex-col h-full justify-center items-center px-4 animate-in zoom-in duration-1000 bg-gradient-to-b from-yellow-600/20 to-black">
        <Trophy className="w-48 h-48 text-yellow-500 opacity-20 absolute animate-pulse" />
        <h1 className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 text-center drop-shadow-2xl z-10">
            CHAMPIONS
        </h1>
        <p className="text-white/60 text-xl md:text-2xl mt-4 tracking-[0.5em] uppercase z-10">
            Rise to the Challenge
        </p>
    </div>
);

// IMPROVED: Photo Moment Slide (Mosaic)
const PhotoOpSlide = ({ teams }: { teams: any[] }) => {
    // Pick up to 24 photos
    const photos = useMemo(() => {
        return teams
            .map(getTeamImage)
            .filter(url => url && !url.includes('flaticon')) // Only real photos
            .sort(() => 0.5 - Math.random())
            .slice(0, 30);
    }, [teams]);

    return (
        <div className="flex flex-col h-full justify-center items-center px-4 animate-in fade-in duration-1000 relative overflow-hidden bg-black">
            {/* Mosaic Background */}
            <div className="absolute inset-0 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 opacity-70">
                {photos.map((url, i) => (
                    <div 
                        key={i} 
                        className="w-full h-full bg-cover bg-center animate-pulse" 
                        style={{ 
                            backgroundImage: `url(${url})`,
                            animationDuration: `${Math.random() * 2 + 2}s`,
                            animationDelay: `${Math.random()}s`
                        }} 
                    />
                ))}
                {/* Fill empty spots with generic pattern if needed */}
                {[...Array(Math.max(0, 32 - photos.length))].map((_, i) => (
                    <div key={`fill-${i}`} className="w-full h-full bg-white/5 animate-pulse"></div>
                ))}
            </div>

            {/* Gradient Overlay - Darker at bottom/center for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.6)_0%,_transparent_70%)]"></div>

            {/* Animated Viewfinder Borders */}
            <div className="absolute top-10 left-10 w-24 h-24 border-t-8 border-l-8 border-white/80 rounded-tl-3xl shadow-[0_0_20px_white] animate-pulse"></div>
            <div className="absolute top-10 right-10 w-24 h-24 border-t-8 border-r-8 border-white/80 rounded-tr-3xl shadow-[0_0_20px_white] animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 border-b-8 border-l-8 border-white/80 rounded-bl-3xl shadow-[0_0_20px_white] animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 border-b-8 border-r-8 border-white/80 rounded-br-3xl shadow-[0_0_20px_white] animate-pulse"></div>

            <div className="text-center z-10 space-y-8 relative drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                <div className="flex justify-center">
                    <div className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.5)] animate-bounce border-4 border-slate-200">
                        <Camera className="w-12 h-12" />
                    </div>
                </div>
                
                <div>
                    <h2 className="text-5xl md:text-8xl font-black text-white mb-4 drop-shadow-2xl tracking-tighter">
                        CAPTURE THE<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-pink-500 to-purple-500 animate-pulse">MOMENT</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-white/90 font-medium tracking-widest uppercase">
                        Take a photo with the scoreboard!
                    </p>
                </div>

                <div className="flex items-center justify-center gap-4 bg-black/60 px-8 py-4 rounded-full backdrop-blur-md border border-white/20 shadow-xl">
                    <Share2 className="w-6 h-6 text-blue-400" />
                    <span className="text-white font-bold text-lg">#AcademicCompetition2024</span>
                </div>
            </div>
        </div>
    );
};

// RecentResultsSlide (Unchanged)
const RecentResultsSlide = ({ teams }: { teams: any[] }) => (
    <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in zoom-in-95 duration-700">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-8 md:mb-12 text-center uppercase tracking-wider flex items-center justify-center">
            <Activity className="w-12 h-12 md:w-16 md:h-16 mr-4 text-green-400" />
            Latest Results
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {teams.slice(0, 6).map((t, idx) => {
                const isGold = (t.medal || '').includes('Gold');
                const imgUrl = getTeamImage(t);
                return (
                    <div key={idx} className={`bg-white/5 backdrop-blur-sm border rounded-2xl p-4 md:p-5 flex items-center shadow-lg gap-4 ${isGold ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/10'}`}>
                        <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-full border-2 border-white/20 overflow-hidden bg-black/20">
                            <img src={imgUrl} alt="Team" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs md:text-sm text-white/60 mb-1 truncate">{t.activityName}</div>
                            <div className="text-lg md:text-2xl font-bold text-white truncate">{t.teamName}</div>
                            <div className="text-sm md:text-base text-white/40 truncate">{t.schoolName}</div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className={`text-2xl md:text-4xl font-black ${isGold ? 'text-yellow-400' : 'text-white'}`}>{t.score}</div>
                            {isGold && <div className="text-xs font-bold text-yellow-400 bg-yellow-400/20 px-2 py-0.5 rounded mt-1 inline-block">GOLD</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

const TeamsToWatchSlide = ({ teams }: { teams: any[] }) => {
    // Top 5 teams to watch
    const displayTeams = teams.slice(0, 5);
    if (displayTeams.length === 0) return null;

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in slide-in-from-right duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-12 text-center uppercase tracking-wider flex items-center justify-center">
                <TrendingUp className="w-12 h-12 md:w-16 md:h-16 mr-4 text-pink-500" />
                Teams to Watch
            </h2>
            <div className="space-y-4 max-w-5xl mx-auto w-full">
                {displayTeams.map((t, idx) => (
                    <div key={idx} className="flex items-center bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02]">
                        <div className="w-12 h-12 rounded-full border border-white/20 overflow-hidden bg-black/20 mr-4 shrink-0">
                            <img src={getTeamImage(t)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0 mr-4">
                            <div className="text-xs text-pink-400 font-bold uppercase tracking-wider mb-1 truncate">{t.activityName}</div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg md:text-xl font-bold text-white truncate">{t.teamName}</h3>
                                {(t.medal || '').includes('Gold') && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                            </div>
                            <p className="text-white/50 text-sm truncate">{t.schoolName}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-2xl md:text-3xl font-black text-pink-400">{t.score}</div>
                            <div className="text-[10px] text-white/40 uppercase">Current Score</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main View ---

const LiveScoreView: React.FC<LiveScoreViewProps> = ({ initialData }) => {
    const navigate = useNavigate();
    const [data, setData] = useState<AppData>(initialData);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [isUpdating, setIsUpdating] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
    
    const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('area');
    
    // Touch Logic State
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const minSwipeDistance = 50; 

    // Derived Data Calculation
    const { leaderboard, recentResults, spotlightWinner, stats, teamsToWatch, allTeams, categories } = useMemo(() => {
        // ... (Same Logic as before) ...
        const teams = data.teams || [];
        const activities = data.activities || [];
        
        let targetTeams = teams;
        if (viewLevel === 'area') {
            targetTeams = teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
        }

        const schoolMap: Record<string, { name: string, gold: number, silver: number, totalScore: number, entries: number }> = {};
        let goldCount = 0;
        let scoredCount = 0;
        const recent: any[] = [];
        const goldWinners: any[] = [];
        const watchList: any[] = [];
        const processedTeams: any[] = [];
        const uniqueCategories = new Set<string>();

        targetTeams.forEach(t => {
            const activity = activities.find(a => a.id === t.activityId);
            const category = activity?.category || 'General';
            uniqueCategories.add(category);

            let score = 0;
            let medal = '';
            
            if (viewLevel === 'area') {
                try {
                    const areaInfo = JSON.parse(t.stageInfo || '{}');
                    score = areaInfo.score || 0;
                    medal = areaInfo.medal || '';
                } catch { score = 0; }
                
                if (t.score >= 80) { 
                    watchList.push({
                        ...t,
                        schoolName: data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId,
                        prevScore: t.score,
                        activityName: activity?.name || t.activityId
                    });
                }

            } else {
                score = t.score;
                medal = t.medalOverride || (score >= 80 ? 'Gold' : score >= 70 ? 'Silver' : score >= 60 ? 'Bronze' : '');
            }

            const schoolName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
            const activityName = activity?.name || t.activityId;

            if (score > 0) {
                scoredCount++;
                
                if (!schoolMap[schoolName]) schoolMap[schoolName] = { name: schoolName, gold: 0, silver: 0, totalScore: 0, entries: 0 };
                schoolMap[schoolName].totalScore += score;
                schoolMap[schoolName].entries += 1;
                
                // Track Full Team Data for Gold Club
                processedTeams.push({
                    ...t, score, medal, schoolName, activityName, category
                });

                if ((medal || '').includes('Gold')) {
                    schoolMap[schoolName].gold++;
                    goldCount++;
                    const winnerObj = { 
                        ...t, 
                        score, 
                        medal, 
                        schoolName, 
                        activityName 
                    };
                    goldWinners.push(winnerObj);
                } else if ((medal || '').includes('Silver')) {
                    schoolMap[schoolName].silver++;
                }

                recent.push({
                    teamName: t.teamName,
                    schoolName,
                    activityName,
                    score,
                    medal,
                    timestamp: t.lastEditedAt,
                    logoUrl: t.logoUrl,
                    teamPhotoId: t.teamPhotoId
                });
            }
        });

        const sortedSchools = Object.values(schoolMap)
            .map(s => ({ ...s, avgScore: s.totalScore / s.entries }))
            .sort((a, b) => b.avgScore - a.avgScore || b.gold - a.gold);
        
        const sortedRecent = recent.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });

        const sortedWatchList = watchList.sort((a, b) => b.prevScore - a.prevScore);
        const randomWinner = goldWinners.length > 0 ? goldWinners[Math.floor(Math.random() * goldWinners.length)] : null;

        return {
            leaderboard: sortedSchools,
            recentResults: sortedRecent,
            spotlightWinner: randomWinner,
            stats: { totalTeams: targetTeams.length, totalGold: goldCount, totalScored: scoredCount },
            teamsToWatch: sortedWatchList,
            allTeams: processedTeams,
            categories: Array.from(uniqueCategories)
        };
    }, [data, viewLevel]);

    const updateData = async () => {
        setIsUpdating(true);
        try {
            const newData = await fetchData();
            setData(newData);
            setLastUpdated(new Date());
            setConnectionStatus('online');
        } catch (e) {
            console.error("Live Update Failed", e);
            setConnectionStatus('offline');
        } finally {
            setIsUpdating(false);
        }
    };

    // Define Slides Order dynamically
    const slides = useMemo(() => {
        const list = [];
        
        // Show Welcome Slide IF no results yet (waiting mode)
        if (stats.totalScored === 0) {
            list.push(<WelcomeSlide key="welcome" viewLevel={viewLevel} />);
            list.push(<SchoolRollCallSlide key="rollcall" schools={data.schools} />);
            if (data.venues.length > 0) list.push(<ScheduleSlide key="schedule" venues={data.venues} />);
            if (viewLevel === 'area' && teamsToWatch.length > 0) list.push(<TeamsToWatchSlide key="watch" teams={teamsToWatch} />);
            list.push(<EngagementSlide key="engagement" />);
        } else {
            // Active Mode
            list.push(<LeaderboardSlide key="leaderboard" schools={leaderboard} viewLevel={viewLevel} />);
            list.push(<PodiumSlide key="podium" schools={leaderboard} />);
            
            if (recentResults.length > 0) {
                list.push(<RecentResultsSlide key="recent" teams={recentResults} />);
                // NEW: Dual Track Slide for showing 2 competitions movement
                list.push(<DualTrackSlide key="dualtrack" recentTeams={recentResults} />); 
            }
            if (data.teams.length > 0) list.push(<GallerySlide key="gallery" teams={data.teams} />); 
            
            list.push(<GoldClubSlide key="gold" teams={allTeams} />);
            list.push(<SchoolExcellenceSlide key="excellence" schools={leaderboard} />); // NEW
            list.push(<BestInClassSlide key="best" teams={allTeams} categories={categories} />); // NEW
            
            if (spotlightWinner) list.push(<HighlightSlide key="highlight" winner={spotlightWinner} />);
            if (viewLevel === 'area' && teamsToWatch.length > 0) list.push(<TeamsToWatchSlide key="watch" teams={teamsToWatch} />);
            if (data.venues.length > 0) list.push(<ScheduleSlide key="schedule" venues={data.venues} />);
            
            list.push(<StatsSlide key="stats" totalTeams={stats.totalTeams} totalGold={stats.totalGold} totalScored={stats.totalScored} viewLevel={viewLevel} />);
            list.push(<PhotoOpSlide key="photo" teams={allTeams} />); // Updated Mosaic
            list.push(<ChampionBackdropSlide key="backdrop" />); // NEW
            list.push(<EngagementSlide key="engagement" />);
        }
        return list;
    }, [stats.totalScored, viewLevel, leaderboard, recentResults, spotlightWinner, teamsToWatch, data.schools, data.teams, data.venues, allTeams, categories]);

    const SLIDES_COUNT = slides.length;
    const SLIDE_DURATION = 15000; 
    const REFRESH_INTERVAL = 60000;

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % SLIDES_COUNT);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + SLIDES_COUNT) % SLIDES_COUNT);

    useEffect(() => {
        const timer = setInterval(() => {
            nextSlide();
        }, SLIDE_DURATION);
        return () => clearInterval(timer);
    }, [SLIDES_COUNT]);

    // Touch Handlers
    const onTouchStart = (e: React.TouchEvent) => {
        touchEndX.current = 0;
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) nextSlide();
        if (isRightSwipe) prevSlide();
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    useEffect(() => {
        const currentComponent = slides[currentSlide];
        if (!currentComponent) return;
        const isEngagement = currentComponent.key === 'engagement';
        const isHighlight = currentComponent.key === 'highlight';
        const isWelcome = currentComponent.key === 'welcome';
        const isGold = currentComponent.key === 'gold';
        const isPodium = currentComponent.key === 'podium';
        const isBackdrop = currentComponent.key === 'backdrop';

        if ((isHighlight && spotlightWinner) || isEngagement || (isWelcome && stats.totalScored === 0) || isGold || isPodium || isBackdrop) {
            const colorSet = isGold || isBackdrop ? ['#FFD700', '#F59E0B'] : isEngagement ? ['#ec4899', '#8b5cf6', '#3b82f6'] : ['#FFD700', '#F59E0B', '#FFFFFF'];
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: colorSet
            });
        }
    }, [currentSlide, spotlightWinner, slides, stats.totalScored]);

    return (
        <div 
            className="fixed inset-0 bg-slate-900 text-white font-kanit overflow-hidden z-[9999]"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Header Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center bg-gradient-to-b from-black/60 to-transparent gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                        <h1 className="text-lg md:text-2xl font-bold tracking-widest uppercase text-white/90 drop-shadow-md flex items-center">
                            Live Scoreboard
                        </h1>
                    </div>
                    <div className="flex bg-white/10 rounded-lg p-1 backdrop-blur-sm border border-white/10">
                        <button 
                            onClick={() => { setViewLevel('cluster'); setCurrentSlide(0); }}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewLevel === 'cluster' ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                            Cluster
                        </button>
                        <button 
                            onClick={() => { setViewLevel('area'); setCurrentSlide(0); }}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewLevel === 'area' ? 'bg-purple-600 text-white shadow' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                            Area
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-sm md:text-base font-mono text-white/70 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-2">
                        {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        <span className="hidden md:inline">Updated:</span> {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {connectionStatus === 'offline' && (
                        <div className="flex items-center gap-2 text-red-400">
                            <WifiOff className="w-4 h-4" /> Offline
                        </div>
                    )}
                    <button onClick={toggleFullScreen} className="hover:text-white transition-colors">
                        {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                    {/* NEW: Close Button */}
                    <button onClick={() => navigate('/dashboard')} className="p-2 bg-white/10 rounded-full hover:bg-red-500/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Navigation Arrows (Desktop) */}
            <button onClick={prevSlide} className="hidden md:block absolute left-4 top-1/2 z-30 p-2 text-white/20 hover:text-white transition-colors"><ChevronLeft className="w-10 h-10"/></button>
            <button onClick={nextSlide} className="hidden md:block absolute right-4 top-1/2 z-30 p-2 text-white/20 hover:text-white transition-colors"><ChevronRight className="w-10 h-10"/></button>

            {/* Main Content Area */}
            <div className="relative z-10 w-full h-full pt-20 pb-10">
                {slides[currentSlide]}
            </div>

            {/* Footer / Progress */}
            <ProgressBar duration={REFRESH_INTERVAL} onComplete={updateData} isPaused={isUpdating} keyReset={currentSlide} />
            
            {/* Slide Indicators */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                {Array.from({ length: SLIDES_COUNT }).map((_, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default LiveScoreView;
