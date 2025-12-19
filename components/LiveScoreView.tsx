
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppData, Team, School } from '../types';
import { fetchData } from '../services/api';
import { Trophy, Medal, Activity, Clock, Crown, TrendingUp, Sparkles, MonitorPlay, Maximize2, Minimize2, Wifi, WifiOff, RefreshCw, LayoutGrid, Users, Star, Heart, Zap, Award, School as SchoolIcon, Calendar, Image as ImageIcon, ChevronLeft, ChevronRight, MapPin, Camera, Aperture, Share2, X, Grid, ShieldCheck, Flame, LocateFixed, CalendarClock, Split } from 'lucide-react';
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

// New Slide 1: The Gold Club (Hall of Fame)
const GoldClubSlide = ({ teams }: { teams: any[] }) => {
    // Randomly select 8-10 gold winners to show each rotation to keep it fresh
    const displayTeams = useMemo(() => {
        const goldTeams = teams.filter(t => (t.medal || '').includes('Gold'));
        return goldTeams.sort(() => 0.5 - Math.random()).slice(0, 10);
    }, [teams]);

    if (displayTeams.length === 0) return null;

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-16 animate-in fade-in duration-1000 relative overflow-hidden">
            {/* Golden Particles Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-black to-black"></div>
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute bg-yellow-400 rounded-full opacity-40 animate-pulse" 
                         style={{
                             top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                             width: `${Math.random() * 4 + 2}px`, height: `${Math.random() * 4 + 2}px`,
                             animationDelay: `${Math.random() * 2}s`
                         }}>
                    </div>
                ))}
            </div>

            <div className="relative z-10 text-center mb-8">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-600 to-amber-700 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.4)] border border-yellow-400/50 mb-4">
                    <Star className="w-5 h-5 text-yellow-200 fill-current animate-[spin_3s_linear_infinite]" />
                    <span className="text-lg font-bold text-white uppercase tracking-widest">Hall of Fame</span>
                    <Star className="w-5 h-5 text-yellow-200 fill-current animate-[spin_3s_linear_infinite]" />
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-100 to-amber-500 drop-shadow-sm uppercase">
                    The Gold Club
                </h2>
            </div>

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-4">
                {displayTeams.map((t, idx) => (
                    <div key={idx} className="bg-white/5 border border-yellow-500/30 rounded-xl p-4 flex flex-col items-center text-center hover:bg-yellow-500/10 transition-all duration-500 group">
                        <div className="w-16 h-16 rounded-full border-2 border-yellow-400 p-1 mb-3 bg-black/40 group-hover:scale-110 transition-transform">
                            <img src={getTeamImage(t)} className="w-full h-full rounded-full object-cover" alt={t.teamName} />
                        </div>
                        <h3 className="text-white font-bold text-sm line-clamp-1 w-full">{t.teamName}</h3>
                        <p className="text-yellow-200/60 text-xs mt-1 line-clamp-1">{t.schoolName}</p>
                        <div className="mt-2 text-xl font-black text-yellow-400">{t.score}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// New Slide 2: School Podium (Top 3)
const PodiumSlide = ({ schools }: { schools: any[] }) => {
    // Take top 3 schools
    const top3 = schools.slice(0, 3);
    if (top3.length < 3) return null;

    // Reorder for podium: 2nd (Left), 1st (Center), 3rd (Right)
    const podiumOrder = [top3[1], top3[0], top3[2]]; 

    return (
        <div className="flex flex-col h-full justify-end px-4 md:px-20 pb-10 animate-in slide-in-from-bottom duration-1000 relative">
            <div className="absolute top-10 left-0 right-0 text-center">
                <h2 className="text-3xl md:text-5xl font-black text-white mb-2 uppercase tracking-wider flex items-center justify-center">
                    <Trophy className="w-10 h-10 md:w-14 md:h-14 mr-4 text-yellow-400" />
                    School Rankings
                </h2>
                <p className="text-white/60 text-lg">Top 3 Performing Schools</p>
            </div>

            <div className="flex items-end justify-center gap-4 md:gap-8 h-[60%]">
                {podiumOrder.map((s, idx) => {
                    // Logic to determine height and color based on rank (idx 0 is Rank 2, idx 1 is Rank 1, idx 2 is Rank 3)
                    const isFirst = idx === 1;
                    const isSecond = idx === 0;
                    const isThird = idx === 2;
                    
                    const heightClass = isFirst ? 'h-full' : isSecond ? 'h-[75%]' : 'h-[60%]';
                    const colorClass = isFirst 
                        ? 'bg-gradient-to-t from-yellow-600 to-yellow-400 border-yellow-300' 
                        : isSecond 
                            ? 'bg-gradient-to-t from-gray-600 to-gray-400 border-gray-300' 
                            : 'bg-gradient-to-t from-orange-700 to-orange-500 border-orange-400';
                    
                    const rankNum = isFirst ? 1 : isSecond ? 2 : 3;

                    return (
                        <div key={idx} className={`relative flex flex-col justify-end w-1/3 max-w-[250px] ${heightClass} transition-all duration-1000 ease-out`}>
                            {/* School Info Bubble */}
                            <div className="mb-4 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center shadow-xl animate-bounce" style={{ animationDuration: '3s', animationDelay: `${idx * 0.5}s` }}>
                                <div className="text-2xl md:text-4xl font-black text-white mb-1">{s.totalScore}</div>
                                <div className="text-xs text-white/60 font-bold uppercase">Total Score</div>
                                <div className="mt-2 text-sm md:text-lg font-bold text-white line-clamp-2 leading-tight">{s.name}</div>
                            </div>

                            {/* The Bar */}
                            <div className={`w-full flex-1 rounded-t-lg border-t-4 border-x border-white/30 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-start pt-4 relative ${colorClass}`}>
                                <div className="text-4xl md:text-6xl font-black text-white/90 drop-shadow-md">{rankNum}</div>
                                {isFirst && <Crown className="w-12 h-12 text-white absolute -top-16 animate-pulse filter drop-shadow-[0_0_10px_gold]" />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

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

// NEW: School of Excellence (Honor Roll)
const SchoolExcellenceSlide = ({ schools }: { schools: any[] }) => {
    // Show schools with at least 1 gold medal
    const goldSchools = useMemo(() => {
        return schools
            .filter(s => s.gold > 0)
            .sort((a, b) => b.gold - a.gold)
            .slice(0, 12);
    }, [schools]);

    if (goldSchools.length === 0) return null;

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in slide-in-from-bottom duration-700 bg-gradient-to-br from-slate-900 via-slate-800 to-black">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest border border-yellow-500/50 mb-3">
                    <ShieldCheck className="w-4 h-4" /> Honor Roll
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-300 to-amber-500 uppercase tracking-wide drop-shadow-sm">
                    School of Excellence
                </h2>
                <p className="text-white/50 text-lg mt-2 font-light">Schools achieving Gold Medal standard</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
                {goldSchools.map((s, idx) => (
                    <div key={idx} className="relative bg-gradient-to-b from-white/10 to-white/5 border border-yellow-500/30 p-6 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white/15 transition-all duration-300 group hover:-translate-y-1 shadow-lg">
                        {/* Gold Badge Icon */}
                        <div className="absolute -top-4 -right-4 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-black text-black shadow-lg z-10 border-2 border-slate-900">
                            {s.gold}
                        </div>
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                            <Award className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 group-hover:text-yellow-200 transition-colors">{s.name}</h3>
                        <div className="mt-2 text-xs text-yellow-500 font-bold uppercase tracking-widest">Gold Medalist</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// NEW: Best in Class (Category Leaders)
const BestInClassSlide = ({ teams, categories }: { teams: any[], categories: string[] }) => {
    // Pick 3 random categories and find top scorer for each
    const leaders = useMemo(() => {
        const result: any[] = [];
        const shuffledCats = [...categories].sort(() => 0.5 - Math.random()).slice(0, 3);
        
        shuffledCats.forEach(cat => {
            const teamsInCat = teams.filter(t => t.activityName && teams.some(tm => tm.activityName === t.activityName && tm.category === cat));
            // Note: Since 'teams' here is processedTeams from main component, it might not have 'category' directly on it if not enriched.
            // Let's assume 'teams' passed here has category info. If not, we might need to look up.
            // *Correction*: In main component, `processedTeams` has score/school/name but might lack category.
            // Let's filter by checking if any activity in the category matches.
            // Simplified approach: Group all teams by category first.
            const categoryTeams = teams.filter(t => t.category === cat);
            if (categoryTeams.length > 0) {
                const top = categoryTeams.reduce((prev, current) => (prev.score > current.score) ? prev : current);
                result.push({ ...top, category: cat });
            }
        });
        return result;
    }, [teams, categories]);

    if (leaders.length === 0) return null;

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-16 animate-in zoom-in-95 duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-12 text-center uppercase tracking-wider flex items-center justify-center">
                <Flame className="w-12 h-12 md:w-16 md:h-16 mr-4 text-orange-500" />
                Best in Class
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
                {leaders.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden hover:bg-white/10 transition-all duration-500 group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap className="w-32 h-32 text-white" />
                        </div>
                        <div className="relative z-10">
                            <div className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-2">
                                {item.category}
                            </div>
                            <div className="text-4xl font-black text-white mb-1">{item.score}</div>
                            <div className="text-xs text-green-400 font-bold uppercase mb-4">Highest Score</div>
                            <h3 className="text-xl font-bold text-white leading-tight mb-1 truncate">{item.teamName}</h3>
                            <p className="text-white/50 text-sm truncate">{item.schoolName}</p>
                            <p className="text-white/30 text-xs mt-4 truncate">{item.activityName}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// NEW: Champion Backdrop (Photo Booth)
const ChampionBackdropSlide = () => (
    <div className="flex flex-col h-full justify-center items-center px-4 animate-in fade-in duration-1000 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
        {/* Bokeh Effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-[60px]"></div>

        <div className="relative z-10 text-center flex flex-col items-center">
            {/* Giant Trophy */}
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-yellow-500/30 blur-[60px] rounded-full"></div>
                <Trophy className="w-48 h-48 md:w-64 md:h-64 text-yellow-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
                <Sparkles className="absolute -top-4 -right-4 w-16 h-16 text-white animate-spin-slow" />
                <Sparkles className="absolute bottom-4 -left-8 w-10 h-10 text-yellow-200 animate-pulse" />
            </div>

            <h1 className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-100 to-amber-600 drop-shadow-2xl tracking-tighter mb-4">
                CHAMPION
            </h1>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3 rounded-full">
                <span className="text-xl md:text-2xl text-white font-medium tracking-[0.5em] uppercase">
                    ACADEMIC COMPETITION
                </span>
            </div>
        </div>
    </div>
);

// NEW SLIDE: District Venues Dual View
const DistrictVenuesSlide = ({ venues }: { venues: any[] }) => {
    // Logic: Find top 2 venues with the most "Area" level activities
    const topVenues = useMemo(() => {
        return venues
            .map(v => {
                const areaActs = (v.scheduledActivities || []).filter((s: any) => s.level === 'area');
                return { ...v, areaActs };
            })
            .filter(v => v.areaActs.length > 0)
            .sort((a, b) => b.areaActs.length - a.areaActs.length)
            .slice(0, 2);
    }, [venues]);

    if (topVenues.length === 0) return null;

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-16 animate-in fade-in duration-1000">
             <div className="text-center mb-8 md:mb-12">
                 <div className="inline-flex items-center gap-2 bg-purple-600/30 text-purple-300 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest border border-purple-500/50 mb-3 animate-pulse">
                    <LocateFixed className="w-4 h-4" /> Live District Updates
                 </div>
                 <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider flex items-center justify-center drop-shadow-md">
                    <MapPin className="w-10 h-10 md:w-14 md:h-14 mr-3 text-purple-400" />
                    District Venues
                 </h2>
                 <p className="text-white/60 text-lg mt-2">Real-time schedule at key locations</p>
             </div>

             <div className={`grid gap-6 md:gap-10 h-[60%] w-full max-w-7xl mx-auto ${topVenues.length === 1 ? 'grid-cols-1 max-w-3xl' : 'grid-cols-1 md:grid-cols-2'}`}>
                {topVenues.map((v, idx) => (
                    <div key={idx} className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative group">
                        {/* Header Image */}
                        <div className="h-32 md:h-40 relative shrink-0">
                            <img 
                                src={v.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" 
                                alt={v.name}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                            <div className="absolute bottom-4 left-6">
                                <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-lg">{v.name}</h3>
                                <p className="text-white/70 text-sm flex items-center mt-1"><Split className="w-3 h-3 mr-1"/> {v.areaActs.length} Activities</p>
                            </div>
                            <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center animate-pulse shadow-lg">
                                <div className="w-2 h-2 bg-white rounded-full mr-1.5"></div> LIVE
                            </div>
                        </div>

                        {/* Activities List */}
                        <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center tracking-wider">
                                <CalendarClock className="w-4 h-4 mr-2" /> Current & Upcoming
                            </h4>
                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                {v.areaActs.slice(0, 4).map((act: any, i: number) => (
                                    <div key={i} className="flex items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="text-center w-14 shrink-0 mr-3">
                                            <div className="text-orange-400 font-bold text-sm">{act.timeRange ? act.timeRange.split('-')[0] : 'Now'}</div>
                                            <div className="text-[10px] text-white/40 uppercase">Time</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-bold text-sm truncate">{act.activityName}</div>
                                            <div className="text-white/50 text-xs mt-0.5 flex items-center">
                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                                                {act.building} {act.room}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    )
}

const SchoolRollCallSlide = ({ schools }: { schools: any[] }) => {
    const displaySchools = useMemo(() => {
        const shuffled = [...schools].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 12);
    }, [schools]);

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-12 text-center uppercase tracking-wider flex items-center justify-center">
                <SchoolIcon className="w-12 h-12 md:w-16 md:h-16 mr-4 text-blue-400" />
                Participating Schools
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displaySchools.map((s, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all duration-300 group hover:scale-105 cursor-default shadow-lg">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
                            <SchoolIcon className="w-8 h-8 text-white/70 group-hover:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{s.SchoolName}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LeaderboardSlide = ({ schools, viewLevel }: { schools: any[], viewLevel: string }) => (
    <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 mb-2 text-center uppercase tracking-wider drop-shadow-sm flex items-center justify-center">
            <Crown className="w-12 h-12 md:w-16 md:h-16 mr-4 text-yellow-400" />
            Top Performance
        </h2>
        <p className="text-center text-white/60 mb-8 text-sm md:text-lg font-mono uppercase tracking-widest">
            {viewLevel === 'area' ? 'District Level' : 'Cluster Level'} • Ranked by Average Score
        </p>
        <div className="space-y-4">
            {schools.slice(0, 5).map((s, idx) => (
                <div key={idx} className="flex items-center bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-5 shadow-xl transform transition-all duration-500 hover:scale-[1.02] hover:bg-white/20">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl md:text-2xl font-black mr-6 shrink-0 ${idx === 0 ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.6)]' : idx === 1 ? 'bg-gray-300 text-gray-800' : idx === 2 ? 'bg-orange-400 text-orange-900' : 'bg-white/10 text-white'}`}>
                        {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl md:text-2xl font-bold text-white truncate mb-1">{s.name}</h3>
                        <div className="flex gap-4 text-sm text-white/60">
                            <span className="flex items-center"><Users className="w-3 h-3 mr-1 text-blue-400"/> {s.entries} Teams</span>
                            <span className="flex items-center"><Medal className="w-3 h-3 mr-1 text-yellow-400"/> {s.gold} Gold</span>
                        </div>
                    </div>
                    <div className="text-right shrink-0 pl-4 border-l border-white/10">
                        <div className="text-3xl md:text-5xl font-black text-green-400 leading-none">
                            <NumberTicker value={s.avgScore} decimals={2} />
                        </div>
                        <div className="text-[10px] md:text-xs text-white/50 uppercase font-bold tracking-widest mt-1">Average Score</div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

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

const GallerySlide = ({ teams }: { teams: any[] }) => {
    // Filter teams with photos or logos
    const teamsWithPhotos = useMemo(() => {
        const withPhotos = teams.filter(t => t.teamPhotoId || (t.logoUrl && t.logoUrl.startsWith('http')));
        return withPhotos.sort(() => 0.5 - Math.random()).slice(0, 6);
    }, [teams]);

    if (teamsWithPhotos.length < 3) return null;

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in fade-in duration-1000">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-8 text-center uppercase tracking-wider flex items-center justify-center">
                <ImageIcon className="w-12 h-12 md:w-16 md:h-16 mr-4 text-pink-400" />
                Moments of Glory
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[200px]">
                {teamsWithPhotos.map((t, idx) => (
                    <div key={idx} className={`relative rounded-2xl overflow-hidden shadow-lg group ${idx === 0 ? 'col-span-2 row-span-2' : ''}`}>
                        <img 
                            src={getTeamImage(t)} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                            alt={t.teamName}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-0 left-0 p-4">
                            <div className="text-white font-bold text-lg leading-tight line-clamp-1">{t.teamName}</div>
                            <div className="text-white/70 text-xs line-clamp-1">{t.schoolName}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ScheduleSlide = ({ venues }: { venues: any[] }) => {
    const upcomingEvents = useMemo(() => {
        const events: any[] = [];
        venues.forEach(v => {
            if (v.scheduledActivities) {
                v.scheduledActivities.forEach((s: any) => {
                    events.push({ ...s, venueName: v.name });
                });
            }
        });
        // Sort by date/time (mock logic for demo, assume future or random subset)
        return events.slice(0, 5); 
    }, [venues]);

    if (upcomingEvents.length === 0) return null;

    return (
        <div className="flex flex-col h-full justify-center px-4 md:px-20 animate-in slide-in-from-right duration-700">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-10 text-center uppercase tracking-wider flex items-center justify-center">
                <Calendar className="w-12 h-12 md:w-16 md:h-16 mr-4 text-orange-400" />
                Competition Schedule
            </h2>
            <div className="space-y-4 max-w-4xl mx-auto w-full">
                {upcomingEvents.map((evt, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-6 hover:bg-white/15 transition-colors">
                        <div className="text-center w-20 shrink-0">
                            <div className="text-xs text-orange-300 font-bold uppercase">{evt.timeRange || 'TBA'}</div>
                            <div className="text-2xl font-black text-white">{evt.date ? evt.date.split(' ')[0] : 'Today'}</div>
                        </div>
                        <div className="w-px h-12 bg-white/20"></div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xl font-bold text-white truncate">{evt.activityName}</div>
                            <div className="text-white/60 flex items-center gap-2 text-sm">
                                <MapPin className="w-3 h-3" /> {evt.venueName} - {evt.room}
                            </div>
                        </div>
                        {evt.level && (
                            <div className="px-3 py-1 rounded-full bg-black/20 text-xs font-bold text-white/80 border border-white/10">
                                {evt.level === 'area' ? 'Area' : 'Cluster'}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const HighlightSlide = ({ winner }: { winner: any }) => {
    if (!winner) return null;
    const imgUrl = getTeamImage(winner);
    return (
        <div className="flex flex-col h-full justify-center items-center px-4 animate-in zoom-in duration-1000 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent animate-pulse"></div>
            <div className="relative z-10 text-center space-y-6">
                <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest border border-yellow-500/50 mb-4 animate-bounce">
                    <Sparkles className="w-4 h-4" /> Spotlight Winner
                </div>
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-yellow-400 p-1 mx-auto shadow-[0_0_50px_rgba(250,204,21,0.5)] bg-black/40 relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <Crown className="w-12 h-12 text-yellow-400 drop-shadow-lg animate-pulse" />
                    </div>
                    <img src={imgUrl} className="w-full h-full rounded-full object-cover" alt={winner.teamName} />
                </div>
                <div>
                    <h2 className="text-3xl md:text-6xl font-black text-white mb-2 drop-shadow-lg">{winner.teamName}</h2>
                    <p className="text-xl md:text-3xl text-white/80 font-medium">{winner.schoolName}</p>
                </div>
                <div className="flex justify-center gap-8 mt-8">
                    <div className="text-center">
                        <div className="text-sm text-gray-400 uppercase tracking-wider font-bold">Score</div>
                        <div className="text-4xl md:text-6xl font-black text-yellow-400">{winner.score}</div>
                    </div>
                    <div className="w-px bg-white/20"></div>
                    <div className="text-center">
                        <div className="text-sm text-gray-400 uppercase tracking-wider font-bold">Award</div>
                        <div className="text-4xl md:text-6xl font-black text-yellow-400 uppercase">{winner.medal}</div>
                    </div>
                </div>
                <div className="mt-8 text-sm text-white/40">{winner.activityName}</div>
            </div>
        </div>
    );
};

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

const StatsSlide = ({ totalTeams, totalGold, totalScored, viewLevel }: { totalTeams: number, totalGold: number, totalScored: number, viewLevel: string }) => (
    <div className="flex flex-col h-full justify-center px-4 animate-in fade-in duration-1000">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-16 text-center uppercase tracking-wider">
            Competition Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 p-8 rounded-3xl text-center backdrop-blur-sm">
                <div className="text-6xl md:text-8xl font-black text-blue-400 mb-4">
                    <NumberTicker value={totalTeams} />
                </div>
                <div className="text-xl text-white font-bold uppercase tracking-widest">Total Teams</div>
                <div className="text-white/40 text-sm mt-2">{viewLevel === 'area' ? 'District Level' : 'Cluster Level'}</div>
            </div>
            <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/30 p-8 rounded-3xl text-center backdrop-blur-sm">
                <div className="text-6xl md:text-8xl font-black text-green-400 mb-4">
                    <NumberTicker value={totalScored} />
                </div>
                <div className="text-xl text-white font-bold uppercase tracking-widest">Scored</div>
                <div className="text-white/40 text-sm mt-2">Teams Evaluated</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-500/30 p-8 rounded-3xl text-center backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <div className="text-6xl md:text-8xl font-black text-yellow-400 mb-4 relative z-10">
                    <NumberTicker value={totalGold} />
                </div>
                <div className="text-xl text-white font-bold uppercase tracking-widest relative z-10">Gold Medals</div>
                <div className="text-white/40 text-sm mt-2 relative z-10">Excellence Achieved</div>
            </div>
        </div>
    </div>
);

const EngagementSlide = () => (
    <div className="flex flex-col h-full justify-center items-center px-4 animate-in zoom-in duration-1000 bg-gradient-to-b from-slate-900 to-indigo-950">
        <div className="bg-white p-4 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.2)] mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            {/* Generate current URL QR code */}
            <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`} 
                alt="Scan QR" 
                className="w-48 h-48 md:w-64 md:h-64 rounded-xl"
            />
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-white mb-4 text-center">JOIN THE ACTION</h2>
        <p className="text-xl text-indigo-300 mb-8 text-center max-w-md">Scan to view live results on your mobile device</p>
        <div className="flex items-center gap-2 text-white/40 text-sm font-mono">
            <MonitorPlay className="w-4 h-4" />
            <span>real-time updates</span>
        </div>
    </div>
);

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

    // New: District Venues Slide
    const DistrictVenuesSlide = ({ venues }: { venues: any[] }) => {
        const topVenues = useMemo(() => {
            return venues
                .map(v => {
                    const areaActs = (v.scheduledActivities || []).filter((s: any) => s.level === 'area');
                    return { ...v, areaActs };
                })
                .filter(v => v.areaActs.length > 0)
                .sort((a, b) => b.areaActs.length - a.areaActs.length)
                .slice(0, 2);
        }, [venues]);

        if (topVenues.length === 0) return null;

        return (
            <div className="flex flex-col h-full justify-center px-4 md:px-16 animate-in fade-in duration-1000">
                 <div className="text-center mb-8 md:mb-12">
                     <div className="inline-flex items-center gap-2 bg-purple-600/30 text-purple-300 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest border border-purple-500/50 mb-3 animate-pulse">
                        <LocateFixed className="w-4 h-4" /> Live District Updates
                     </div>
                     <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider flex items-center justify-center drop-shadow-md">
                        <MapPin className="w-10 h-10 md:w-14 md:h-14 mr-3 text-purple-400" />
                        District Venues
                     </h2>
                     <p className="text-white/60 text-lg mt-2">Real-time schedule at key locations</p>
                 </div>

                 <div className={`grid gap-6 md:gap-10 h-[60%] w-full max-w-7xl mx-auto ${topVenues.length === 1 ? 'grid-cols-1 max-w-3xl' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {topVenues.map((v, idx) => (
                        <div key={idx} className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative group">
                            {/* Header Image */}
                            <div className="h-32 md:h-40 relative shrink-0">
                                <img 
                                    src={v.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"} 
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" 
                                    alt={v.name}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                                <div className="absolute bottom-4 left-6">
                                    <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-lg">{v.name}</h3>
                                    <p className="text-white/70 text-sm flex items-center mt-1"><Split className="w-3 h-3 mr-1"/> {v.areaActs.length} Activities</p>
                                </div>
                                <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center animate-pulse shadow-lg">
                                    <div className="w-2 h-2 bg-white rounded-full mr-1.5"></div> LIVE
                                </div>
                            </div>

                            {/* Activities List */}
                            <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center tracking-wider">
                                    <CalendarClock className="w-4 h-4 mr-2" /> Current & Upcoming
                                </h4>
                                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                    {v.areaActs.slice(0, 4).map((act: any, i: number) => (
                                        <div key={i} className="flex items-start bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="text-center w-14 shrink-0 mr-3">
                                                <div className="text-orange-400 font-bold text-sm">{act.timeRange ? act.timeRange.split('-')[0] : 'Now'}</div>
                                                <div className="text-[10px] text-white/40 uppercase">Time</div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-bold text-sm truncate">{act.activityName}</div>
                                                <div className="text-white/50 text-xs mt-0.5 flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                                                    {act.building} {act.room}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        )
    }

    // Define Slides Order dynamically
    const slides = useMemo(() => {
        const list = [];
        
        // Show Welcome Slide IF no results yet (waiting mode)
        if (stats.totalScored === 0) {
            list.push(<WelcomeSlide key="welcome" viewLevel={viewLevel} />);
            list.push(<SchoolRollCallSlide key="rollcall" schools={data.schools} />);
            if (data.venues.length > 0) list.push(<ScheduleSlide key="schedule" venues={data.venues} />);
            if (viewLevel === 'area' && teamsToWatch.length > 0) list.push(<TeamsToWatchSlide key="watch" teams={teamsToWatch} />);
            if (viewLevel === 'area' && data.venues.length > 0) list.push(<DistrictVenuesSlide key="venues" venues={data.venues} />);
            list.push(<EngagementSlide key="engagement" />);
        } else {
            // Active Mode
            list.push(<LeaderboardSlide key="leaderboard" schools={leaderboard} viewLevel={viewLevel} />);
            list.push(<PodiumSlide key="podium" schools={leaderboard} />);
            
            if (recentResults.length > 0) list.push(<RecentResultsSlide key="recent" teams={recentResults} />);
            if (data.teams.length > 0) list.push(<GallerySlide key="gallery" teams={data.teams} />); 
            
            list.push(<GoldClubSlide key="gold" teams={allTeams} />);
            list.push(<SchoolExcellenceSlide key="excellence" schools={leaderboard} />); // NEW
            list.push(<BestInClassSlide key="best" teams={allTeams} categories={categories} />); // NEW
            
            if (spotlightWinner) list.push(<HighlightSlide key="highlight" winner={spotlightWinner} />);
            if (viewLevel === 'area' && teamsToWatch.length > 0) list.push(<TeamsToWatchSlide key="watch" teams={teamsToWatch} />);
            if (data.venues.length > 0) list.push(<ScheduleSlide key="schedule" venues={data.venues} />);
            if (viewLevel === 'area' && data.venues.length > 0) list.push(<DistrictVenuesSlide key="venues" venues={data.venues} />);
            
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
