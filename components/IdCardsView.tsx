
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, Team, User } from '../types';
import { Search, IdCard, Smartphone, X, ChevronLeft, ChevronRight, User as UserIcon, GraduationCap, School, MapPin, LayoutGrid, Trophy, CheckCircle, Share2, Printer, Maximize2, Filter, Loader2, Calendar, CheckSquare, Square, Check, List } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { shareIdCard } from '../services/liff';
import QRCode from 'qrcode';
import SearchableSelect from './SearchableSelect';

interface IdCardsViewProps {
  data: AppData;
  user?: User | null;
}

// --- Helper Components ---

const QRCodeImage = ({ text, size = 150, className }: { text: string, size?: number, className?: string }) => {
    const [src, setSrc] = useState<string>('');
    useEffect(() => {
        if (!text) return;
        QRCode.toDataURL(text, { width: size, margin: 1 }).then(setSrc).catch(console.error);
    }, [text, size]);
    if (!src) return <div className={`bg-gray-100 animate-pulse ${className}`} />;
    return <img src={src} alt="QR Code" className={className} />;
};

const ExpandedIdCard = ({ members, initialIndex, team, activity, schoolName, viewLevel, onClose, data }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
    const [translateX, setTranslateX] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const currentMember = members[currentIndex];
    const role = currentMember.role;
    const imageUrl = currentMember.image || (currentMember.photoDriveId ? `https://drive.google.com/thumbnail?id=${currentMember.photoDriveId}` : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png");
    const fullName = `${currentMember.prefix || ''}${currentMember.name || ((currentMember.firstname || '') + ' ' + (currentMember.lastname || ''))}`.trim();
    const isArea = viewLevel === 'area';
    const bgGradient = isArea ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900';
    const levelText = isArea ? 'DISTRICT LEVEL' : 'CLUSTER LEVEL';
    const qrUrl = `${window.location.origin}${window.location.pathname}#/idcards?id=${team.teamId}&level=${viewLevel}`;

    const scheduleInfo = useMemo(() => {
        if (!data || !data.venues) return null;
        for (const v of data.venues) {
            // Find schedule matching Activity AND Level
            const s = v.scheduledActivities?.find((act: any) => 
                act.activityId === team.activityId && 
                (act.level === viewLevel || !act.level) // Backward compatibility for null level
            );
            if (s) return { venueName: v.name, ...s };
        }
        return null;
    }, [data, team.activityId, viewLevel]);

    const handleShare = async () => {
        try {
            await shareIdCard(team.teamName, schoolName, fullName, role, team.teamId, imageUrl, levelText, viewLevel);
        } catch(e) { alert('Share failed'); }
    };

    // Swipe Logic
    const onTouchStart = (e: React.TouchEvent) => { setTouchStart(e.targetTouches[0].clientX); setTouchCurrent(e.targetTouches[0].clientX); setIsAnimating(false); };
    const onTouchMove = (e: React.TouchEvent) => { if (!touchStart) return; setTouchCurrent(e.targetTouches[0].clientX); setTranslateX(e.targetTouches[0].clientX - touchStart); };
    const onTouchEnd = () => {
        if (!touchStart || !touchCurrent) return;
        const distance = touchCurrent - touchStart;
        setIsAnimating(true);
        if (distance < -80 && currentIndex < members.length - 1) {
            setTranslateX(-window.innerWidth);
            setTimeout(() => { setCurrentIndex(p => p + 1); setTranslateX(window.innerWidth); requestAnimationFrame(() => setTranslateX(0)); }, 200);
        } else if (distance > 80 && currentIndex > 0) {
            setTranslateX(window.innerWidth);
            setTimeout(() => { setCurrentIndex(p => p - 1); setTranslateX(-window.innerWidth); requestAnimationFrame(() => setTranslateX(0)); }, 200);
        } else { setTranslateX(0); }
        setTouchStart(null);
    };

    // Navigation handlers
    const nextCard = (e: any) => { e.stopPropagation(); if (currentIndex < members.length - 1) { setIsAnimating(true); setTranslateX(-50); setTimeout(() => { setCurrentIndex(p => p + 1); setTranslateX(50); requestAnimationFrame(() => setTranslateX(0)); }, 200); } };
    const prevCard = (e: any) => { e.stopPropagation(); if (currentIndex > 0) { setIsAnimating(true); setTranslateX(50); setTimeout(() => { setCurrentIndex(p => p - 1); setTranslateX(-50); requestAnimationFrame(() => setTranslateX(0)); }, 200); } };

    return (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            {!isFullscreen && (
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-50">
                    <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white"><X className="w-6 h-6"/></button>
                    <div className="flex gap-2">
                        <button onClick={handleShare} className="p-2 bg-white/20 rounded-full text-white"><Share2 className="w-6 h-6"/></button>
                        <button onClick={() => { if(!document.fullscreenElement) cardRef.current?.requestFullscreen(); else document.exitFullscreen(); setIsFullscreen(!isFullscreen); }} className="p-2 bg-white/20 rounded-full text-white"><Maximize2 className="w-6 h-6"/></button>
                    </div>
                </div>
            )}
            
            {/* Navigation Arrows */}
            {currentIndex > 0 && <button onClick={prevCard} className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-white/10 rounded-full text-white hover:bg-white/30 transition-colors"><ChevronLeft className="w-8 h-8"/></button>}
            {currentIndex < members.length - 1 && <button onClick={nextCard} className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2 bg-white/10 rounded-full text-white hover:bg-white/30 transition-colors"><ChevronRight className="w-8 h-8"/></button>}

            <div ref={cardRef} className={`relative w-full h-full max-w-md bg-white flex flex-col overflow-hidden shadow-2xl ${!isFullscreen && 'sm:rounded-3xl sm:h-auto sm:aspect-[9/16] sm:max-h-[90vh]'}`} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ transform: `translateX(${translateX}px)`, transition: isAnimating ? 'transform 0.3s ease-out' : 'none' }}>
                <div className={`relative h-[25%] ${bgGradient} rounded-b-[30px] shadow-lg shrink-0`}>
                     <div className="absolute top-12 left-0 right-0 text-center"><span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-white tracking-widest border border-white/30">{levelText}</span></div>
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-200">
                            <img src={imageUrl} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} />
                        </div>
                        <div className={`absolute bottom-1 right-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md text-white ${role === 'Teacher' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>{role === 'Teacher' ? <UserIcon className="w-4 h-4"/> : <GraduationCap className="w-4 h-4"/>}</div>
                     </div>
                </div>
                <div className="pt-20 px-6 text-center shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{fullName}</h2>
                    <p className="text-sm text-gray-500 font-medium mb-1">{role}</p>
                    <p className="text-sm text-gray-600 line-clamp-1">{schoolName}</p>
                </div>
                <div className="px-6 py-4 shrink-0">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 grid grid-cols-2 gap-3">
                        <div className="col-span-2 flex items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2"><div className={`p-1.5 rounded-full ${isArea ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}><CheckCircle className="w-4 h-4"/></div><div className="text-left"><p className="text-[10px] text-gray-400 font-bold uppercase">Status</p><p className="text-xs font-bold text-green-600">Active</p></div></div>
                            <div className="text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Time</p><p className="text-xs font-bold text-gray-700">{new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</p></div>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 col-span-2">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1"/>Venue & Schedule</p>
                            {scheduleInfo ? (
                                <>
                                    <p className="text-xs font-bold text-gray-800 line-clamp-2">{scheduleInfo.venueName} {scheduleInfo.room || ''}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{scheduleInfo.date} {scheduleInfo.timeRange}</p>
                                </>
                            ) : (
                                <p className="text-xs font-bold text-gray-400">TBA</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
                    <div className="bg-white p-2 rounded-2xl shadow-lg border-2 border-dashed border-gray-200 w-[200px] aspect-square flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-50 animate-pulse"></div>
                        <QRCodeImage text={qrUrl} size={250} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-mono">ID: {team.teamId}</p>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0 text-center text-xs font-bold text-gray-400">
                    {currentIndex + 1} / {members.length}
                </div>
            </div>
        </div>
    );
};

const DigitalIdModal = ({ team, data, onClose, viewLevel }: any) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const activity = data.activities.find((a: any) => a.id === team.activityId)?.name || team.activityId;
    const school = data.schools.find((s: any) => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;
    
    let members: any[] = [];
    try {
        let raw = team.members;
        if (viewLevel === 'area' && team.stageInfo) {
            const areaInfo = JSON.parse(team.stageInfo);
            if (areaInfo.members) raw = areaInfo.members;
        }
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) members = parsed.map(m => ({...m, role: 'Student'}));
        else if (parsed) members = [...(parsed.teachers || []).map((m: any) => ({...m, role: 'Teacher'})), ...(parsed.students || []).map((m: any) => ({...m, role: 'Student'}))];
    } catch {}

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            {expandedIndex !== null && <ExpandedIdCard members={members} initialIndex={expandedIndex} team={team} activity={activity} schoolName={school} viewLevel={viewLevel} onClose={() => setExpandedIndex(null)} data={data} />}
            <div className="bg-gray-100 w-full max-w-5xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                    <div><h3 className="text-lg font-bold flex items-center"><Smartphone className="w-5 h-5 mr-2 text-blue-600"/> บัตรประจำตัวดิจิทัล ({viewLevel === 'area' ? 'เขต' : 'กลุ่ม'})</h3><p className="text-sm text-gray-500">{team.teamName} | {school}</p></div>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="overflow-y-auto p-6 flex-1 bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {members.map((m, idx) => (
                        <div key={idx} onClick={() => setExpandedIndex(idx)} className="bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center cursor-pointer hover:shadow-md transition-all">
                            <img src={m.image || (m.photoDriveId ? `https://drive.google.com/thumbnail?id=${m.photoDriveId}` : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png")} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-gray-200 mb-2" />
                            <div className="font-bold text-sm text-center line-clamp-1">{m.prefix}{m.name || m.firstname + ' ' + m.lastname}</div>
                            <div className={`text-[10px] px-2 py-0.5 rounded-full mt-1 ${m.role === 'Teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>{m.role}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const IdCardsView: React.FC<IdCardsViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Advanced Filters
  const [clusterFilter, setClusterFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(''); // NEW

  // Bulk Print State
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);

  // View Mode: Grid or List
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'list' ? 20 : 12;

  // Permissions
  const userRole = user?.level?.toLowerCase();
  const isGroupAdmin = userRole === 'group_admin';
  const isSchoolAdmin = userRole === 'school_admin' || userRole === 'user';
  
  // Set initial filters based on user
  useEffect(() => {
      if (isGroupAdmin) {
          const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
          if (userSchool) setClusterFilter(userSchool.SchoolCluster);
      } else if (isSchoolAdmin && user?.SchoolID) {
          setSchoolFilter(user.SchoolID);
      }
  }, [user, isGroupAdmin, isSchoolAdmin, data.schools]);

  useEffect(() => {
      const id = searchParams.get('id');
      const lvl = searchParams.get('level');
      if (id && data.teams.length > 0) {
          const found = data.teams.find(t => t.teamId === id);
          if (found) {
              if (lvl === 'area' || lvl === 'cluster') setViewLevel(lvl as any);
              setSelectedTeam(found);
          }
      }
  }, [searchParams, data.teams]);

  // Derived Options
  const clusterOptions = useMemo(() => {
      return [{ label: 'ทุกกลุ่มเครือข่าย', value: '' }, ...data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))];
  }, [data.clusters]);

  const schoolOptions = useMemo(() => {
      let filtered = data.schools;
      if (clusterFilter) {
          filtered = filtered.filter(s => s.SchoolCluster === clusterFilter);
      }
      return [{ label: 'ทุกโรงเรียน', value: '' }, ...filtered.map(s => ({ label: s.SchoolName, value: s.SchoolID }))];
  }, [data.schools, clusterFilter]);

  // NEW: Category Options
  const categoryOptions = useMemo(() => {
      const cats = Array.from(new Set(data.activities.map(a => a.category))).sort();
      return [{ label: 'ทุกหมวดหมู่', value: '' }, ...cats.map(c => ({ label: c, value: c }))];
  }, [data.activities]);

  const filteredTeams = useMemo(() => {
      return data.teams.filter(t => {
          // 1. View Level Check
          if (viewLevel === 'area' && t.stageStatus !== 'Area' && String(t.flag).toUpperCase() !== 'TRUE') return false;
          
          // 2. User Permission Check
          if (user) {
              if (isSchoolAdmin) {
                  const s = data.schools.find(sc => sc.SchoolID === user.SchoolID);
                  const isCreator = t.createdBy === user.userid;
                  const isSameSchool = t.schoolId === user.SchoolID || t.schoolId === s?.SchoolName;
                  if (!isCreator && !isSameSchool) return false;
              }
              if (isGroupAdmin) {
                  const userSchool = data.schools.find(sc => sc.SchoolID === user.SchoolID);
                  const teamSchool = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                  if (userSchool?.SchoolCluster !== teamSchool?.SchoolCluster) return false;
              }
          }

          const activity = data.activities.find(a => a.id === t.activityId);

          // 3. Dropdown Filters
          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          if (clusterFilter && school?.SchoolCluster !== clusterFilter) return false;
          if (schoolFilter && (t.schoolId !== schoolFilter && school?.SchoolID !== schoolFilter)) return false;
          
          // NEW: Category Filter
          if (categoryFilter && activity?.category !== categoryFilter) return false;

          // 4. Search Text (Expanded to activity name)
          const term = searchTerm.toLowerCase();
          return (
              t.teamName.toLowerCase().includes(term) || 
              t.teamId.toLowerCase().includes(term) || 
              activity?.name.toLowerCase().includes(term) ||
              school?.SchoolName.toLowerCase().includes(term)
          );
      });
  }, [data.teams, searchTerm, viewLevel, user, data.schools, data.activities, clusterFilter, schoolFilter, categoryFilter, isSchoolAdmin, isGroupAdmin]);

  const getMemberCounts = (team: Team) => {
      let tCount = 0, sCount = 0;
      let memberSource = team.members;
      if (viewLevel === 'area' && team.stageInfo) {
          try { const areaInfo = JSON.parse(team.stageInfo); if (areaInfo.members) memberSource = areaInfo.members; } catch {}
      }
      try {
          const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
          if (Array.isArray(raw)) sCount = raw.length;
          else if (raw) { tCount = (raw.teachers || []).length; sCount = (raw.students || []).length; }
      } catch {}
      return { tCount, sCount };
  };

  // --- Bulk Selection Handlers ---
  const handleToggleSelect = (teamId: string) => {
      const newSet = new Set(selectedTeamIds);
      if (newSet.has(teamId)) newSet.delete(teamId);
      else newSet.add(teamId);
      setSelectedTeamIds(newSet);
  };

  const handleSelectAll = () => {
      if (selectedTeamIds.size === paginated.length) {
          setSelectedTeamIds(new Set());
      } else {
          const ids = new Set(paginated.map(t => t.teamId));
          setSelectedTeamIds(ids);
      }
  };

  // --- Print Logic (Updated for multiple teams and schedule lookup) ---
  const handlePrintTeams = async (teamsToPrint: Team[]) => {
      if (teamsToPrint.length === 0) return;
      setIsPrinting(true);

      // Delay to allow UI loader to appear
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          setIsPrinting(false);
          return alert('Pop-up blocked');
      }

      const headerColor = viewLevel === 'area' ? 'linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)' : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)';
      const levelTitle = viewLevel === 'area' ? 'DISTRICT' : 'CLUSTER';

      // Pre-generate QRs and gather data
      const printData = await Promise.all(teamsToPrint.map(async (team) => {
          const appUrl = `${window.location.origin}${window.location.pathname}#/idcards?id=${team.teamId}&level=${viewLevel}`;
          let qrCodeBase64 = '';
          try { qrCodeBase64 = await QRCode.toDataURL(appUrl, { margin: 1, width: 300 }); } catch (e) {}

          let members: any[] = [];
          try {
              let raw = team.members;
              if (viewLevel === 'area' && team.stageInfo) { const info = JSON.parse(team.stageInfo); if (info.members) raw = info.members; }
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (Array.isArray(parsed)) members = parsed.map(m => ({...m, role: 'Student'}));
              else if (parsed) members = [...(parsed.teachers||[]).map((m: any)=>({...m,role:'Teacher'})), ...(parsed.students||[]).map((m: any)=>({...m,role:'Student'}))];
          } catch {}

          // Lookup Venue/Date
          let scheduleText = 'สถานที่: ไม่ระบุ';
          let dateText = 'วันที่: ไม่ระบุ';
          if (data.venues) {
                for (const v of data.venues) {
                    const s = v.scheduledActivities?.find(act => act.activityId === team.activityId && (act.level === viewLevel || !act.level));
                    if (s) {
                        scheduleText = `สถานที่: ${v.name} ${s.room || ''}`;
                        dateText = `วันที่: ${s.date} (${s.timeRange || ''})`;
                        break;
                    }
                }
          }
          
          const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;

          return { team, members, qrCodeBase64, activity, school, scheduleText, dateText };
      }));

      // Flatten to individual cards
      const allCards: any[] = [];
      printData.forEach(item => {
          item.members.forEach(m => {
              allCards.push({ ...m, ...item });
          });
      });

      // Chunk into 4 per page
      const pages = [];
      for (let i = 0; i < allCards.length; i += 4) pages.push(allCards.slice(i, i + 4));

      printWindow.document.write(`
        <html><head><title>Print ID Cards</title>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Kanit'; margin: 0; background: #eee; -webkit-print-color-adjust: exact; }
            .page { width: 210mm; height: 296mm; background: white; margin: 0 auto; page-break-after: always; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; padding: 10mm; gap: 5mm; box-sizing: border-box; }
            .card { border: 1px dashed #ccc; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; background: white; position: relative; }
            .card-header { background: ${headerColor}; color: white; padding: 15px; text-align: center; height: 80px; }
            .card-body { padding: 10px; flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; }
            .photo { width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; margin-top: -40px; background: #eee; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .role { padding: 2px 10px; border-radius: 10px; font-size: 10pt; font-weight: bold; margin: 5px 0; background: #eee; }
            .name { font-size: 14pt; font-weight: bold; }
            .school { font-size: 10pt; color: #555; }
            .footer { padding: 10px; background: #f9f9f9; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; }
            .qr { width: 35mm; height: 35mm; mix-blend-mode: multiply; }
            @media print { .no-print { display: none; } }
        </style></head><body>
        <div class="no-print" style="position:fixed;top:10px;right:10px;"><button onclick="window.print()" style="padding:10px 20px;background:blue;color:white;border:none;border-radius:5px;cursor:pointer;">Print</button></div>
        ${pages.map(p => `
            <div class="page">
                ${p.map((card: any) => `
                    <div class="card">
                        <div class="card-header"><h1>ID CARD</h1><p>${levelTitle}</p></div>
                        <div class="card-body">
                            <img src="${card.image || (card.photoDriveId ? `https://drive.google.com/thumbnail?id=${card.photoDriveId}` : 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png')}" class="photo"/>
                            <div class="role" style="color:${card.role==='Teacher'?'#3730a3':'#166534'};background:${card.role==='Teacher'?'#e0e7ff':'#dcfce7'}">${card.role}</div>
                            <div class="name">${card.prefix||''}${card.name||card.firstname+' '+card.lastname}</div>
                            <div class="school">${card.school}</div>
                            <div style="font-size:9pt;color:#777;margin-top:5px;">${card.team.teamName}</div>
                            <div style="font-size:10pt;font-weight:600;margin-top:auto;border-top:1px dashed #ddd;width:100%;padding-top:5px;">${card.activity}</div>
                            <div style="font-size:9pt;color:#555;margin-top:2px;">${card.dateText}</div>
                            <div style="font-size:9pt;color:#555;">${card.scheduleText}</div>
                        </div>
                        <div class="footer">
                            <div style="text-align:left;"><div style="font-weight:bold;color:#555;">ID: ${card.team.teamId}</div><div style="font-size:8pt;color:#888;">Scan to Verify</div></div>
                            <img src="${card.qrCodeBase64}" class="qr"/>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}
        </body></html>
      `);
      printWindow.document.close();
      setIsPrinting(false);
      setSelectedTeamIds(new Set()); // Clear selection after print
  };

  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginated = filteredTeams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        {selectedTeam && <DigitalIdModal team={selectedTeam} data={data} onClose={() => { setSelectedTeam(null); setSearchParams({}); }} viewLevel={viewLevel} />}
        
        {/* Loading Overlay */}
        {isPrinting && (
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
                <h3 className="text-xl font-bold mb-2">กำลังเตรียมเอกสาร...</h3>
                <p className="text-sm opacity-80">กรุณารอสักครู่ ระบบกำลังสร้างหน้าสำหรับพิมพ์</p>
            </div>
        )}

        {/* Floating Bulk Print Button */}
        {selectedTeamIds.size > 0 && (
            <div className="fixed bottom-20 right-6 z-50 animate-in slide-in-from-bottom-5">
                <button 
                    onClick={() => {
                        const teams = filteredTeams.filter(t => selectedTeamIds.has(t.teamId));
                        handlePrintTeams(teams);
                    }}
                    disabled={isPrinting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-xl flex items-center gap-2 transform transition-transform hover:scale-105"
                >
                    {isPrinting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Printer className="w-5 h-5" />}
                    พิมพ์ที่เลือก ({selectedTeamIds.size})
                </button>
            </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center"><IdCard className="w-6 h-6 mr-2 text-blue-600"/> พิมพ์บัตรประจำตัว (ID Cards)</h2>
                <p className="text-gray-500 text-sm mt-1">พิมพ์บัตรหรือแสดงบัตรดิจิทัลสำหรับผู้เข้าแข่งขัน</p>
            </div>
            <div className="flex gap-2">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><List className="w-4 h-4" /></button>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewLevel('cluster')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid className="w-4 h-4 inline mr-1"/> Cluster</button>
                    <button onClick={() => setViewLevel('area')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><Trophy className="w-4 h-4 inline mr-1"/> Area</button>
                </div>
            </div>
        </div>

        {/* Improved Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg" 
                    placeholder="ค้นหาทีม, รหัส, ชื่อกิจกรรม..." 
                    value={searchTerm} 
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                />
            </div>

            {/* Category Filter */}
            <div className="w-full lg:w-56 flex-shrink-0">
                <SearchableSelect 
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
                    placeholder="ทุกหมวดหมู่"
                    icon={<Filter className="w-4 h-4" />}
                />
            </div>
            
            {/* Cluster Filter (Dropdown) - Hide if group admin or school admin */}
            {!isGroupAdmin && !isSchoolAdmin && (
                <div className="w-full lg:w-64 flex-shrink-0">
                    <SearchableSelect 
                        options={clusterOptions}
                        value={clusterFilter}
                        onChange={(val) => { setClusterFilter(val); setCurrentPage(1); }}
                        placeholder="ทุกกลุ่มเครือข่าย"
                        icon={<LayoutGrid className="w-4 h-4" />}
                    />
                </div>
            )}

            {/* School Filter (Dropdown) - Hide if school admin */}
            {!isSchoolAdmin && (
                <div className="w-full lg:w-64 flex-shrink-0">
                    <SearchableSelect 
                        options={schoolOptions}
                        value={schoolFilter}
                        onChange={(val) => { setSchoolFilter(val); setCurrentPage(1); }}
                        placeholder="ทุกโรงเรียน"
                        icon={<School className="w-4 h-4" />}
                    />
                </div>
            )}
        </div>
        
        {/* Bulk Selection Header */}
        {paginated.length > 0 && (
            <div className="flex justify-between items-center px-2">
                <button 
                    onClick={handleSelectAll}
                    className="text-sm font-bold text-gray-600 flex items-center hover:text-blue-600"
                >
                    {selectedTeamIds.size === paginated.length ? <CheckSquare className="w-5 h-5 mr-1.5 text-blue-600"/> : <Square className="w-5 h-5 mr-1.5"/>}
                    เลือกทั้งหมดในหน้านี้
                </button>
                <span className="text-xs text-gray-500">
                    แสดง {paginated.length} จาก {filteredTeams.length} ทีม
                </span>
            </div>
        )}

        {/* Content View Switcher */}
        {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map(team => {
                    const activity = data.activities.find(a => a.id === team.activityId);
                    const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                    const { tCount, sCount } = getMemberCounts(team);
                    const isSelected = selectedTeamIds.has(team.teamId);

                    return (
                        <div 
                            key={team.teamId} 
                            className={`bg-white p-4 rounded-xl shadow-sm border relative overflow-hidden transition-all ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-100 hover:shadow-md'}`}
                            onClick={() => handleToggleSelect(team.teamId)}
                        >
                            {/* Level Indicator Strip */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${viewLevel === 'area' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                            
                            {/* Checkbox (Top Right) */}
                            <div className="absolute top-3 right-3 text-gray-300">
                                {isSelected ? <CheckSquare className="w-6 h-6 text-blue-600" /> : <Square className="w-6 h-6" />}
                            </div>

                            <div className="flex justify-between items-start mb-2 pl-2 pr-8">
                                <h3 className="font-bold text-gray-900 line-clamp-1 flex-1" title={team.teamName}>{team.teamName}</h3>
                            </div>
                            <div className="pl-2 mb-2">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{team.teamId}</span>
                            </div>

                            <p className="text-sm text-gray-600 mb-1 flex items-center pl-2"><School className="w-3 h-3 mr-1.5"/> {school?.SchoolName}</p>
                            <p className="text-xs text-gray-500 mb-3 line-clamp-1 pl-2" title={activity?.name}>{activity?.name}</p>
                            
                            <div className="flex gap-3 mb-3 ml-2">
                                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 flex items-center">
                                    <UserIcon className="w-3 h-3 mr-1"/> ครู: {tCount}
                                </span>
                                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 flex items-center">
                                    <GraduationCap className="w-3 h-3 mr-1"/> นร: {sCount}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pl-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setSelectedTeam(team)} className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-colors ${viewLevel === 'area' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}><Smartphone className="w-4 h-4 mr-1.5"/> Digital ID</button>
                                <button onClick={() => handlePrintTeams([team])} className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors ${viewLevel === 'area' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}><Printer className="w-4 h-4 mr-1.5"/> Print</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={viewLevel === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                            <tr>
                                <th className="px-4 py-3 w-10 text-center">
                                    <button onClick={handleSelectAll} className="text-gray-400 hover:text-blue-600">
                                        {selectedTeamIds.size === paginated.length && paginated.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-600"/> : <Square className="w-5 h-5"/>}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ทีม (ID)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">โรงเรียน / กลุ่มฯ</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายการแข่งขัน</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">สมาชิก</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginated.map((team) => {
                                const activity = data.activities.find(a => a.id === team.activityId);
                                const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                                const cluster = data.clusters.find(c => c.ClusterID === school?.SchoolCluster);
                                const { tCount, sCount } = getMemberCounts(team);
                                const isSelected = selectedTeamIds.has(team.teamId);

                                return (
                                    <tr key={team.teamId} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`} onClick={() => handleToggleSelect(team.teamId)}>
                                        <td className="px-4 py-4 text-center cursor-pointer">
                                            <div className={`text-gray-300 ${isSelected ? 'text-blue-600' : ''}`}>
                                                {isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{team.teamName}</div>
                                            <div className="text-xs text-gray-500 font-mono">{team.teamId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{school?.SchoolName}</div>
                                            <div className="text-xs text-gray-500">{cluster?.ClusterName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 truncate max-w-[200px]" title={activity?.name}>{activity?.name}</div>
                                            <div className="text-xs text-gray-500">{activity?.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2 text-xs">
                                                <span className="flex items-center text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100" title="ครู"><UserIcon className="w-3 h-3 mr-1"/> {tCount}</span>
                                                <span className="flex items-center text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100" title="นักเรียน"><GraduationCap className="w-3 h-3 mr-1"/> {sCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setSelectedTeam(team)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-all" title="Digital ID">
                                                    <Smartphone className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handlePrintTeams([team])} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-transparent hover:border-purple-200 transition-all" title="Print">
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {paginated.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                <p>ไม่พบทีมที่ค้นหา</p>
            </div>
        )}
        
        {totalPages > 1 && (
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"><ChevronLeft className="w-4 h-4"/></button>
                <span className="text-sm text-gray-600">Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"><ChevronRight className="w-4 h-4"/></button>
            </div>
        )}
    </div>
  );
};

export default IdCardsView;
