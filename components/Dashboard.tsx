
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Announcement, User, AreaStageInfo, Team, Venue, Activity as ActivityType } from '../types';
import { Users, School, Trophy, Megaphone, Plus, Book, Calendar, ChevronRight, FileText, Loader2, Star, Medal, TrendingUp, Activity, Timer, ArrowUpRight, Zap, Target, CheckCircle, PieChart as PieIcon, List, X, BarChart3, MapPin, Navigation, Handshake, Briefcase, UserX, GraduationCap, AlertTriangle, Clock } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import StatCard from './StatCard';
import { useNavigate } from 'react-router-dom';
import { addAnnouncement } from '../services/api';
import { formatDeadline } from '../services/utils';

interface DashboardProps {
  data: AppData;
  user?: User | null;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];
const MEDAL_COLORS = { 'Gold': '#FFD700', 'Silver': '#C0C0C0', 'Bronze': '#CD7F32', 'Participant': '#94a3b8' };

// Mock Event Date (You can change this or pull from config)
const EVENT_DATE = "2024-12-25T09:00:00";

// --- Components ---

const CountdownWidget = () => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const difference = +new Date(EVENT_DATE) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft as any;
    }

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const timerComponents = Object.keys(timeLeft).length === 0 ? (
        <span className="text-sm font-bold">เริ่มการแข่งขันแล้ว!</span>
    ) : (
        <div className="flex gap-2 text-center">
            {Object.entries(timeLeft).map(([unit, value]: [string, any]) => (
                <div key={unit} className="flex flex-col items-center bg-white/20 rounded p-1.5 min-w-[40px]">
                    <span className="font-mono text-xl font-bold leading-none">{value}</span>
                    <span className="text-[9px] uppercase opacity-80">{unit}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white shadow-md relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Clock className="w-24 h-24" /></div>
            <div className="relative z-10 flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5" /> นับถอยหลังวันแข่งขัน
                </h3>
                {timerComponents}
                <div className="mt-2 text-xs opacity-90 bg-black/10 px-2 py-0.5 rounded-full">
                    25 ธันวาคม 2567
                </div>
            </div>
        </div>
    );
};

// --- Skeleton Component ---
const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse p-4">
        <div className="h-48 bg-gray-200 rounded-3xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl"></div>
            <div className="space-y-6">
                <div className="h-40 bg-gray-200 rounded-2xl"></div>
                <div className="h-40 bg-gray-200 rounded-2xl"></div>
            </div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ data, user }) => {
  const navigate = useNavigate();
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  const [isLoading, setIsLoading] = useState(true); // Internal loading state for visual transition
  
  // Modal States
  const [showUnscoredModal, setShowUnscoredModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);

  // Admin News State
  const [showAddNews, setShowAddNews] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'news' | 'manual'>('news');
  const [newLink, setNewLink] = useState('');
  const [isAddingNews, setIsAddingNews] = useState(false);

  // Simulate loading for Skeleton effect
  useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
  }, []);

  // --- Helpers ---
  const getAreaInfo = (team: any): AreaStageInfo | null => {
      try { return JSON.parse(team.stageInfo); } catch { return null; }
  };

  const calculateMedalFromScore = (score: number) => {
      if (score >= 80) return 'Gold';
      if (score >= 70) return 'Silver';
      if (score >= 60) return 'Bronze';
      return 'Participant';
  };

  const isQualified = (team: Team) => {
      return String(team.rank) === '1' && String(team.flag).toUpperCase() === 'TRUE';
  };

  // --- Data Filtering & Processing ---

  // 1. Filter Teams by View Level
  const scopeTeams = useMemo(() => {
      if (viewLevel === 'area') {
          return data.teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }
      return data.teams;
  }, [data.teams, viewLevel]);

  // 2. Statistics Overview & Charts
  const { stats, medalChartData, categoryChartData } = useMemo(() => {
      const totalTeams = scopeTeams.length;
      const schools = new Set(scopeTeams.map(t => t.schoolId)).size;
      const activities = new Set(scopeTeams.map(t => t.activityId)).size;
      
      let scoredCount = 0;
      let goldCount = 0;
      const medalCounts: Record<string, number> = { 'Gold': 0, 'Silver': 0, 'Bronze': 0, 'Participant': 0 };
      const catCounts: Record<string, number> = {};

      scopeTeams.forEach(t => {
          // Score & Medal Logic
          let score = 0;
          let medal = '';
          
          if (viewLevel === 'area') {
              const info = getAreaInfo(t);
              score = info?.score || 0;
              medal = info?.medal || calculateMedalFromScore(score);
          } else {
              score = t.score;
              medal = t.medalOverride || calculateMedalFromScore(score);
          }

          if (score > 0) {
              scoredCount++;
              // Count medals only for scored teams
              if (medal.includes('Gold')) medalCounts['Gold']++;
              else if (medal.includes('Silver')) medalCounts['Silver']++;
              else if (medal.includes('Bronze')) medalCounts['Bronze']++;
              else medalCounts['Participant']++;
          }
          if (score >= 80) goldCount++;

          // Category Logic
          const activity = data.activities.find(a => a.id === t.activityId);
          if (activity) {
              catCounts[activity.category] = (catCounts[activity.category] || 0) + 1;
          }
      });

      const progress = totalTeams > 0 ? Math.round((scoredCount / totalTeams) * 100) : 0;

      // Format for Recharts
      const medalChart = Object.keys(medalCounts).map(key => ({ name: key, value: medalCounts[key] }));
      const categoryChart = Object.keys(catCounts)
          .map(key => ({ name: key, value: catCounts[key] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 Categories

      return { 
          stats: { totalTeams, schools, activities, progress, goldCount, scoredCount },
          medalChartData: medalChart,
          categoryChartData: categoryChart
      };
  }, [scopeTeams, viewLevel, data.activities]);

  // 3. Leaderboards Logic (Reused for My School Rank)
  const leaderboards = useMemo(() => {
      const schoolStats: Record<string, { 
          name: string, 
          totalEntries: number, 
          qualifiedCount: number, 
          totalScore: number, 
          goldCount: number 
      }> = {};

      scopeTeams.forEach(t => {
          const schoolObj = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          const sName = schoolObj?.SchoolName || t.schoolId;

          if (!schoolStats[sName]) {
              schoolStats[sName] = { name: sName, totalEntries: 0, qualifiedCount: 0, totalScore: 0, goldCount: 0 };
          }

          schoolStats[sName].totalEntries++;

          if (isQualified(t)) schoolStats[sName].qualifiedCount++;

          let score = 0;
          if (viewLevel === 'area') {
              const info = getAreaInfo(t);
              score = info?.score || 0;
          } else {
              score = t.score;
          }

          if (score > 0) schoolStats[sName].totalScore += score;
          if (score >= 80) schoolStats[sName].goldCount++;
      });

      const schoolsArray = Object.values(schoolStats);

      // Full Lists for Modals
      const fullSuccessRate = [...schoolsArray]
          .map(s => ({ ...s, rate: s.totalEntries > 0 ? (s.qualifiedCount / s.totalEntries) * 100 : 0 }))
          .sort((a, b) => b.rate - a.rate || b.qualifiedCount - a.qualifiedCount);

      const topBySuccessRate = fullSuccessRate.slice(0, 5);

      const topByScore = [...schoolsArray]
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 5);

      const topByGold = [...schoolsArray]
          .sort((a, b) => b.goldCount - a.goldCount || b.totalScore - a.totalScore)
          .slice(0, 5);

      return { topBySuccessRate, topByScore, topByGold, fullSuccessRate, allSchoolStats: schoolsArray };
  }, [scopeTeams, viewLevel, data.schools]);

  // 4. FEATURE 3: My School Performance Logic
  const mySchoolStats = useMemo(() => {
      if (!user || user.level === 'admin' || user.level === 'area') return null;
      
      const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
      const schoolName = userSchool?.SchoolName;
      if (!schoolName) return null;

      // Find in pre-calculated stats
      const myStats = leaderboards.allSchoolStats.find(s => s.name === schoolName);
      if (!myStats) return { name: schoolName, totalEntries: 0, goldCount: 0, rank: '-' };

      // Calculate Rank based on Total Score
      const sortedByScore = [...leaderboards.allSchoolStats].sort((a, b) => b.totalScore - a.totalScore);
      const rank = sortedByScore.findIndex(s => s.name === schoolName) + 1;

      return { ...myStats, rank };
  }, [user, leaderboards.allSchoolStats, data.schools]);

  // 5. FEATURE 2: Data Integrity Logic (Missing Data Alerts)
  const integrityStats = useMemo(() => {
      // Only relevant for Admin/GroupAdmin or users checking their own scope
      let targetTeams = scopeTeams;
      if (user?.level === 'school_admin') {
          targetTeams = scopeTeams.filter(t => t.schoolId === user.SchoolID);
      }

      let missingTeachers = 0;
      let missingStudents = 0;
      let pendingStatus = 0;

      targetTeams.forEach(t => {
          if (t.status === 'Rejected') return;
          if (t.status === 'Pending') pendingStatus++;

          const activity = data.activities.find(a => a.id === t.activityId);
          if (!activity) return;

          // Parse Members
          let teachersCount = 0;
          let studentsCount = 0;
          try {
              let raw = t.members;
              // If area view, check stageInfo members first
              if (viewLevel === 'area') {
                  const info = getAreaInfo(t);
                  if (info?.members) raw = info.members;
              }

              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (Array.isArray(parsed)) {
                  studentsCount = parsed.length;
              } else if (parsed && typeof parsed === 'object') {
                  teachersCount = Array.isArray(parsed.teachers) ? parsed.teachers.length : 0;
                  studentsCount = Array.isArray(parsed.students) ? parsed.students.length : 0;
              }
          } catch {}

          if (activity.reqTeachers > 0 && teachersCount < activity.reqTeachers) missingTeachers++;
          if (activity.reqStudents > 0 && studentsCount < activity.reqStudents) missingStudents++;
      });

      return { missingTeachers, missingStudents, pendingStatus, totalIssues: missingTeachers + missingStudents };
  }, [scopeTeams, data.activities, viewLevel, user]);

  // 6. Judge Cooperation Stats (Updated: Separate by Level & Count Activities)
  const judgeCooperation = useMemo(() => {
      const stats: Record<string, { name: string, count: number }> = {};
      
      data.judges.forEach(j => {
          // Filter by current view level
          const isArea = j.stageScope === 'area';
          if (viewLevel === 'area' && !isArea) return;
          if (viewLevel === 'cluster' && isArea) return;

          // Skip external judges
          if (j.schoolId === '__EXTERNAL__') return;
          
          const schoolName = j.schoolName || 'Unknown';
          if (!stats[schoolName]) stats[schoolName] = { name: schoolName, count: 0 };
          
          // Count every assignment (which is a row in data.judges) as one activity cooperation
          stats[schoolName].count++;
      });

      return Object.values(stats)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 Cooperative Schools
  }, [data.judges, viewLevel]);

  // 7. Unscored Teams Logic
  const unscoredTeams = useMemo(() => {
      return scopeTeams.filter(t => {
          if (viewLevel === 'area') {
              const info = getAreaInfo(t);
              return !info || !info.score || info.score === 0;
          }
          return t.score === 0;
      });
  }, [scopeTeams, viewLevel]);

  // 8. Latest Results Feed
  const latestResults = useMemo(() => {
      const scored = scopeTeams.filter(t => {
          if (viewLevel === 'area') {
              const info = getAreaInfo(t);
              return (info?.score || 0) > 0;
          }
          return t.score > 0;
      });

      return scored.sort((a, b) => {
          const dateA = a.lastEditedAt ? new Date(a.lastEditedAt).getTime() : 0;
          const dateB = b.lastEditedAt ? new Date(b.lastEditedAt).getTime() : 0;
          return dateB - dateA;
      }).slice(0, 6);
  }, [scopeTeams, viewLevel]);

  // 9. Venue Highlights
  const venueHighlights = useMemo(() => {
      return data.venues.slice(0, 3);
  }, [data.venues]);

  // Admin Actions
  const handleAddNews = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsAddingNews(true);
      try {
          const success = await addAnnouncement(newTitle, newContent, newType, newLink, user?.name || 'Admin');
          if (success) {
              alert('เพิ่มข้อมูลสำเร็จ! (กรุณารีเฟรชหน้าเว็บเพื่อดูข้อมูลล่าสุด)');
              setShowAddNews(false);
              setNewTitle(''); setNewContent(''); setNewLink('');
          } else { alert('เกิดข้อผิดพลาดในการบันทึก'); }
      } catch (err) { alert('เชื่อมต่อไม่ได้'); } finally { setIsAddingNews(false); }
  };

  const isAdmin = user?.level === 'admin' || user?.level === 'area';
  const newsList = (data.announcements || []).filter(a => a.type !== 'manual');
  const manualList = (data.announcements || []).filter(a => a.type === 'manual');

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {/* Header Section */}
      <div className={`rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden ${viewLevel === 'area' ? 'bg-gradient-to-r from-purple-800 to-indigo-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
            {viewLevel === 'area' ? <Trophy className="w-40 h-40" /> : <School className="w-40 h-40" />}
        </div>
        <div className="relative z-10 text-center md:text-left">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white mb-2 border border-white/30">
                {viewLevel === 'area' ? '🏆 District Level' : '🏫 Cluster Level'}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {viewLevel === 'area' ? 'สรุปผลระดับเขตพื้นที่' : 'สรุปผลระดับกลุ่มเครือข่าย'}
            </h1>
            <p className="text-white/80 text-sm">
                {viewLevel === 'area' ? 'ติดตามตารางสรุปเหรียญและคะแนนรวม' : 'ติดตามสถานะการคัดเลือกตัวแทนเข้าสู่ระดับเขต'}
            </p>
        </div>
        
        {/* Level Toggle */}
        <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-md flex relative z-10 border border-white/20">
            <button onClick={() => setViewLevel('cluster')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-white/80 hover:bg-white/10'}`}>
                <School className="w-4 h-4 mr-2"/> ระดับกลุ่มฯ
            </button>
            <button onClick={() => setViewLevel('area')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'}`}>
                <Trophy className="w-4 h-4 mr-2"/> ระดับเขตฯ
            </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-bold uppercase">ทีมทั้งหมด</span>
                  <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-gray-800">{stats.totalTeams}</div>
          </div>
          
          {/* Clickable Scoring Progress Block */}
          <div 
            onClick={() => setShowUnscoredModal(true)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group relative overflow-hidden"
          >
             <div className="absolute right-0 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <List className="w-4 h-4 text-blue-400" />
             </div>
             <div className="flex justify-between items-center mb-1">
                 <span className="text-xs text-gray-500 font-bold uppercase flex items-center group-hover:text-blue-600">
                    <Target className="w-3 h-3 mr-1"/> ความคืบหน้า
                 </span>
                 <span className="text-lg font-black text-green-600">{stats.progress}%</span>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                 <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{width: `${stats.progress}%`}}></div>
             </div>
             <div className="text-[10px] text-gray-400 mt-1 text-right group-hover:text-blue-500 font-medium">
                 เหลือ {unscoredTeams.length} ทีม (คลิกดู)
             </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-amber-600 font-bold uppercase">เหรียญทอง</span>
                  <Medal className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-700">{stats.goldCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-bold uppercase">ตัดสินแล้ว</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-black text-gray-800">{stats.scoredCount}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* FEATURE 3: My School Performance Card */}
              {mySchoolStats && (
                  <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><School className="w-32 h-32 text-blue-600" /></div>
                      <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center shrink-0 border-2 border-blue-100 shadow-sm">
                              <School className="w-8 h-8 text-blue-600" />
                          </div>
                          <div className="flex-1 text-center sm:text-left z-10">
                              <h2 className="text-lg font-bold text-gray-900">{mySchoolStats.name}</h2>
                              <p className="text-xs text-gray-500 mb-3">สรุปผลงานโรงเรียนของคุณ (Your School Performance)</p>
                              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                                  <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                      <div className="text-xs text-gray-500 font-bold uppercase">ส่งแข่ง</div>
                                      <div className="text-xl font-black text-gray-800">{mySchoolStats.totalEntries} <span className="text-[10px] font-normal">ทีม</span></div>
                                  </div>
                                  <div className="bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-100">
                                      <div className="text-xs text-yellow-700 font-bold uppercase">เหรียญทอง</div>
                                      <div className="text-xl font-black text-yellow-600">{mySchoolStats.goldCount} <span className="text-[10px] font-normal">เหรียญ</span></div>
                                  </div>
                                  <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                      <div className="text-xs text-blue-700 font-bold uppercase">ลำดับรวม</div>
                                      <div className="text-xl font-black text-blue-600">#{mySchoolStats.rank}</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* AREA VIEW: Medal Chart & Category Analytics */}
              {viewLevel === 'area' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Medal Pie Chart */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col items-center">
                          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center w-full">
                              <PieIcon className="w-4 h-4 mr-2 text-purple-500" /> สรุปเหรียญรางวัล
                          </h3>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={medalChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {medalChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={MEDAL_COLORS[entry.name as keyof typeof MEDAL_COLORS] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Category Bar Chart */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col">
                          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                              <BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> หมวดหมู่ยอดนิยม (Top 5)
                          </h3>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 10}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              )}

              {/* CLUSTER VIEW: Qualification Rate Leaderboard */}
              {viewLevel === 'cluster' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                          <div>
                              <h2 className="font-bold text-gray-800 flex items-center">
                                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                                  5 อันดับโรงเรียนคุณภาพ (Qualification Rate)
                              </h2>
                              <p className="text-xs text-gray-500 mt-0.5">คิดจาก % การส่งทีมเข้ารอบระดับเขตเทียบกับจำนวนที่ส่งทั้งหมด</p>
                          </div>
                          <button 
                            onClick={() => setShowRankingModal(true)}
                            className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-sm"
                          >
                              ดูทั้งหมด
                          </button>
                      </div>
                      <div className="p-0">
                          {leaderboards.topBySuccessRate.length > 0 ? (
                              <table className="w-full">
                                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium">
                                      <tr>
                                          <th className="px-4 py-3 text-left w-12">#</th>
                                          <th className="px-4 py-3 text-left">โรงเรียน</th>
                                          <th className="px-4 py-3 text-center">ส่งแข่ง</th>
                                          <th className="px-4 py-3 text-center text-blue-600">เข้ารอบ</th>
                                          <th className="px-4 py-3 text-right">อัตราส่วน</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50 text-sm">
                                      {leaderboards.topBySuccessRate.map((school, idx) => (
                                          <tr key={idx} className="hover:bg-gray-50/50">
                                              <td className="px-4 py-3 text-center font-bold text-gray-400">{idx + 1}</td>
                                              <td className="px-4 py-3 font-medium text-gray-800">{school.name}</td>
                                              <td className="px-4 py-3 text-center text-gray-500">{school.totalEntries}</td>
                                              <td className="px-4 py-3 text-center font-bold text-blue-600">{school.qualifiedCount}</td>
                                              <td className="px-4 py-3 text-right">
                                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                                      {school.rate.toFixed(1)}%
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          ) : (
                              <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีข้อมูลการตัดสิน</div>
                          )}
                      </div>
                  </div>
              )}

              {/* AREA VIEW: Gold & Score Leaderboards */}
              {viewLevel === 'area' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="p-4 border-b border-gray-100 bg-yellow-50/50">
                              <h2 className="font-bold text-gray-800 flex items-center text-sm">
                                  <Medal className="w-4 h-4 mr-2 text-yellow-500" />
                                  อันดับเหรียญทอง (Top Gold)
                              </h2>
                          </div>
                          <div className="p-0">
                              {leaderboards.topByGold.length > 0 ? (
                                  <div className="divide-y divide-gray-50">
                                      {leaderboards.topByGold.map((s, idx) => (
                                          <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50/50">
                                              <div className="flex items-center min-w-0">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 shrink-0 ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</div>
                                                  <div className="truncate text-sm font-medium text-gray-700" title={s.name}>{s.name}</div>
                                              </div>
                                              <div className="flex items-center text-sm font-bold text-yellow-600">
                                                  {s.goldCount} <span className="text-[10px] text-gray-400 font-normal ml-1">เหรียญ</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : <div className="p-6 text-center text-gray-400 text-xs">ยังไม่มีข้อมูล</div>}
                          </div>
                      </div>

                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="p-4 border-b border-gray-100 bg-indigo-50/50">
                              <h2 className="font-bold text-gray-800 flex items-center text-sm">
                                  <Zap className="w-4 h-4 mr-2 text-indigo-500" />
                                  คะแนนรวมสูงสุด (Total Score)
                              </h2>
                          </div>
                          <div className="p-0">
                              {leaderboards.topByScore.length > 0 ? (
                                  <div className="divide-y divide-gray-50">
                                      {leaderboards.topByScore.map((s, idx) => (
                                          <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50/50">
                                              <div className="flex items-center min-w-0">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 shrink-0 ${idx === 0 ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</div>
                                                  <div className="truncate text-sm font-medium text-gray-700" title={s.name}>{s.name}</div>
                                              </div>
                                              <div className="flex items-center text-sm font-bold text-indigo-600">
                                                  {s.totalScore.toLocaleString()}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : <div className="p-6 text-center text-gray-400 text-xs">ยังไม่มีข้อมูล</div>}
                          </div>
                      </div>
                  </div>
              )}

              {/* Latest Results Feed */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="font-bold text-gray-800 flex items-center">
                          <Activity className="w-5 h-5 mr-2 text-green-500" />
                          ผลการแข่งขันล่าสุด (Live Feed)
                      </h2>
                      <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                      </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                      {latestResults.length > 0 ? latestResults.map((team) => {
                          const activityName = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
                          const schoolName = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;
                          
                          let score = 0;
                          let medal = '';
                          if (viewLevel === 'area') {
                              const info = getAreaInfo(team);
                              score = info?.score || 0;
                              medal = info?.medal || calculateMedalFromScore(score);
                          } else {
                              score = team.score;
                              medal = team.medalOverride || calculateMedalFromScore(score);
                          }

                          return (
                              <div key={team.teamId} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                                  <div className="min-w-0 flex-1 pr-4">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
                                              {viewLevel === 'area' ? 'Area' : 'Cluster'}
                                          </span>
                                          <span className="text-xs text-gray-400 flex items-center">
                                              <Timer className="w-3 h-3 mr-1" /> 
                                              {team.lastEditedAt ? formatDeadline(team.lastEditedAt) : 'เมื่อสักครู่'}
                                          </span>
                                      </div>
                                      <h4 className="text-sm font-bold text-gray-900 truncate">{activityName}</h4>
                                      <p className="text-xs text-gray-500 truncate mt-0.5">{team.teamName} - {schoolName}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                      <div className="text-xl font-black text-gray-800">{score}</div>
                                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 
                                          ${medal.includes('Gold') ? 'bg-yellow-100 text-yellow-700' : 
                                            medal.includes('Silver') ? 'bg-gray-100 text-gray-600' : 
                                            medal.includes('Bronze') ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                          {medal}
                                      </div>
                                  </div>
                              </div>
                          );
                      }) : (
                          <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีรายการบันทึกคะแนนใหม่</div>
                      )}
                  </div>
                  {latestResults.length > 0 && (
                      <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                          <button onClick={() => navigate('/results')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center">
                              ดูผลทั้งหมด <ArrowUpRight className="w-3 h-3 ml-1" />
                          </button>
                      </div>
                  )}
              </div>
          </div>

          {/* Right Column: News & Manuals & New Blocks */}
          <div className="space-y-6">
             
             {/* FEATURE 4: Countdown Timer */}
             <CountdownWidget />

             {/* FEATURE 2: Data Integrity Alerts */}
             <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                 <div className="p-4 border-b border-red-50 bg-red-50/30 flex items-center">
                     <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                     <h3 className="text-sm font-bold text-red-800">แจ้งเตือนข้อมูลไม่สมบูรณ์</h3>
                 </div>
                 <div className="p-4 grid grid-cols-2 gap-3">
                     <div className="bg-red-50 p-2 rounded-lg text-center">
                         <div className="text-xs text-red-600 mb-1">ขาดครู</div>
                         <div className="font-black text-xl text-red-700 flex items-center justify-center">
                             <UserX className="w-4 h-4 mr-1"/> {integrityStats.missingTeachers}
                         </div>
                     </div>
                     <div className="bg-red-50 p-2 rounded-lg text-center">
                         <div className="text-xs text-red-600 mb-1">ขาด นร.</div>
                         <div className="font-black text-xl text-red-700 flex items-center justify-center">
                             <GraduationCap className="w-4 h-4 mr-1"/> {integrityStats.missingStudents}
                         </div>
                     </div>
                     {integrityStats.totalIssues === 0 && (
                         <div className="col-span-2 text-center text-xs text-green-600 py-2 flex items-center justify-center">
                             <CheckCircle className="w-3 h-3 mr-1" /> ข้อมูลครบถ้วนสมบูรณ์
                         </div>
                     )}
                 </div>
             </div>

             {/* Judge Cooperation Stats */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-4 border-b border-gray-100 bg-emerald-50/50 flex items-center justify-between">
                     <h3 className="text-sm font-bold text-emerald-800 flex items-center">
                         <Handshake className="w-4 h-4 mr-2" /> ความร่วมมือ (กรรมการ) - {viewLevel === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'}
                     </h3>
                 </div>
                 <div className="p-3">
                     {judgeCooperation.length > 0 ? (
                         <div className="space-y-3">
                             {judgeCooperation.map((s, idx) => (
                                 <div key={idx} className="flex items-center justify-between text-sm">
                                     <div className="flex items-center min-w-0">
                                         <div className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold mr-2 shrink-0">{idx + 1}</div>
                                         <div className="truncate text-gray-700" title={s.name}>{s.name}</div>
                                     </div>
                                     <div className="font-bold text-emerald-600">{s.count} <span className="text-[10px] text-gray-400 font-normal">รายการ</span></div>
                                 </div>
                             ))}
                         </div>
                     ) : <div className="text-center text-xs text-gray-400 py-4">ยังไม่มีข้อมูล</div>}
                 </div>
             </div>

             {/* Venue Highlights */}
             {venueHighlights.length > 0 && (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                         <h3 className="text-sm font-bold text-gray-800 flex items-center">
                             <MapPin className="w-4 h-4 mr-2 text-blue-500" /> สถานที่แข่งขัน
                         </h3>
                         <button onClick={() => navigate('/venues')} className="text-xs text-blue-600 hover:underline">ดูทั้งหมด</button>
                     </div>
                     <div className="divide-y divide-gray-50">
                         {venueHighlights.map(v => (
                             <div key={v.id} className="p-3 hover:bg-gray-50 flex items-start gap-3">
                                 <img src={v.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-200 shrink-0" alt="" />
                                 <div className="min-w-0 flex-1">
                                     <div className="font-bold text-sm text-gray-800 truncate">{v.name}</div>
                                     <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                                         <Briefcase className="w-3 h-3 mr-1"/> {v.scheduledActivities?.length || 0} รายการ
                                     </div>
                                     {v.locationUrl && (
                                         <a href={v.locationUrl} target="_blank" className="text-[10px] text-blue-500 flex items-center mt-1 hover:underline">
                                             <Navigation className="w-3 h-3 mr-1"/> แผนที่
                                         </a>
                                     )}
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             <div className="flex items-center justify-between mt-4">
                 <h2 className="text-lg font-bold text-gray-800 flex items-center">
                     <Megaphone className="w-5 h-5 mr-2 text-orange-500" /> ข่าวประชาสัมพันธ์
                 </h2>
                 {isAdmin && (
                    <button onClick={() => setShowAddNews(true)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                        <Plus className="w-4 h-4" />
                    </button>
                 )}
             </div>
             
             <div className="space-y-4">
                {newsList.length > 0 ? (
                    newsList.slice(0, 3).map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                            <div className="pl-3">
                                <span className="text-[10px] text-gray-400 mb-1 block">{new Date(item.date).toLocaleDateString('th-TH')}</span>
                                <h3 className="text-sm font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{item.title}</h3>
                                {item.link && <a href={item.link} target="_blank" className="text-xs text-blue-500 hover:underline">อ่านต่อ →</a>}
                            </div>
                        </div>
                    ))
                ) : <div className="text-center py-8 text-gray-400 text-sm border-dashed border-2 rounded-xl">ไม่มีข่าวใหม่</div>}
             </div>

             <div className="pt-4 border-t border-gray-200">
                 <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4">
                     <Book className="w-5 h-5 mr-2 text-green-600" /> คู่มือการใช้งาน
                 </h2>
                 <div className="grid gap-3">
                    {manualList.length > 0 ? manualList.map(item => (
                        <a key={item.id} href={item.link} target="_blank" className="flex items-center p-3 bg-white border border-gray-200 rounded-xl hover:border-green-400 transition-colors group">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg mr-3 group-hover:bg-green-100"><FileText className="w-4 h-4"/></div>
                            <div className="text-sm font-medium text-gray-700 group-hover:text-green-700 truncate">{item.title}</div>
                        </a>
                    )) : <div className="text-center py-4 text-gray-400 text-sm">ไม่มีคู่มือ</div>}
                 </div>
             </div>
          </div>
      </div>

      {/* Modal: Unscored Teams */}
      {showUnscoredModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-gray-800">รายการที่ยังไม่ได้ตัดสิน (Pending)</h3>
                          <p className="text-xs text-gray-500">ระดับ: {viewLevel === 'area' ? 'เขตพื้นที่' : 'กลุ่มเครือข่าย'}</p>
                      </div>
                      <button onClick={() => setShowUnscoredModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-0">
                      {unscoredTeams.length > 0 ? (
                          <table className="w-full text-sm">
                              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                  <tr>
                                      <th className="px-4 py-3 text-left">ทีม</th>
                                      <th className="px-4 py-3 text-left">โรงเรียน</th>
                                      <th className="px-4 py-3 text-left">กิจกรรม</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                  {unscoredTeams.map(t => {
                                      const actName = data.activities.find(a => a.id === t.activityId)?.name;
                                      const sName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
                                      return (
                                          <tr key={t.teamId} className="hover:bg-gray-50">
                                              <td className="px-4 py-3 font-medium">{t.teamName}</td>
                                              <td className="px-4 py-3 text-gray-600">{sName}</td>
                                              <td className="px-4 py-3 text-gray-500 text-xs">{actName}</td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      ) : (
                          <div className="p-10 text-center text-gray-400">
                              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                              <p>ตัดสินครบทุกรายการแล้ว!</p>
                          </div>
                      )}
                  </div>
                  <div className="p-3 border-t border-gray-100 bg-gray-50 text-right text-xs text-gray-500">
                      รวม {unscoredTeams.length} ทีม
                  </div>
              </div>
          </div>
      )}

      {/* Modal: Full Ranking */}
      {showRankingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                      <div>
                          <h3 className="font-bold text-blue-900 flex items-center">
                              <TrendingUp className="w-5 h-5 mr-2" /> อันดับโรงเรียนคุณภาพ (Qualification Rate)
                          </h3>
                          <p className="text-xs text-blue-700">เรียงลำดับจาก % การเข้ารอบ</p>
                      </div>
                      <button onClick={() => setShowRankingModal(false)} className="p-1.5 hover:bg-blue-100 rounded-full text-blue-800"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 shadow-sm">
                              <tr>
                                  <th className="px-4 py-3 text-center w-12">#</th>
                                  <th className="px-4 py-3 text-left">โรงเรียน</th>
                                  <th className="px-4 py-3 text-center">ส่งแข่ง</th>
                                  <th className="px-4 py-3 text-center text-blue-600">เข้ารอบ</th>
                                  <th className="px-4 py-3 text-right">อัตราส่วน</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {leaderboards.fullSuccessRate.map((school, idx) => (
                                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                      <td className="px-4 py-3 text-center font-bold text-gray-400">{idx + 1}</td>
                                      <td className="px-4 py-3 font-medium text-gray-800">{school.name}</td>
                                      <td className="px-4 py-3 text-center text-gray-500">{school.totalEntries}</td>
                                      <td className="px-4 py-3 text-center font-bold text-blue-600">{school.qualifiedCount}</td>
                                      <td className="px-4 py-3 text-right">
                                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${school.rate >= 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {school.rate.toFixed(1)}%
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Admin Add News Modal */}
      {showAddNews && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Plus className="w-5 h-5 mr-2 text-blue-600" />
                      เพิ่มข่าว/คู่มือ
                  </h3>
                  <form onSubmit={handleAddNews} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
                          <input type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={newType} onChange={e => setNewType(e.target.value as any)}>
                              <option value="news">ข่าวประชาสัมพันธ์</option>
                              <option value="manual">คู่มือการใช้งาน</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                          <textarea required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" value={newContent} onChange={e => setNewContent(e.target.value)}></textarea>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ลิงก์ (ถ้ามี)</label>
                          <input type="url" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={newLink} onChange={e => setNewLink(e.target.value)} />
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-4">
                          <button type="button" onClick={() => setShowAddNews(false)} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg font-medium">ยกเลิก</button>
                          <button type="submit" disabled={isAddingNews} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-bold shadow-sm flex items-center disabled:opacity-70">
                              {isAddingNews && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              บันทึก
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;

