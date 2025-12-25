
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Team, AreaStageInfo, School, User } from '../types';
import { Award, Search, Medal, Star, Trophy, LayoutGrid, Crown, School as SchoolIcon, CheckCircle, BarChart3, Flag, MapPin, ChevronLeft, ChevronRight, Filter, TrendingUp, X, List, Clock, Zap, Info, ChevronDown, ChevronUp, Activity, Download, PieChart as PieIcon, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import SearchableSelect from './SearchableSelect';

interface ResultsViewProps {
  data: AppData;
  user?: User | null;
}

type Stage = 'cluster' | 'area';
type QuickFilter = 'all' | 'gold' | 'rep' | 'top3';

// --- Skeleton Component ---
const ResultsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
                <div className="h-4 w-32 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="flex gap-2">
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
            </div>
        </div>

        {/* Stats/Summary Skeleton */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
                ))}
            </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
             <div className="h-12 w-full md:w-96 bg-gray-200 rounded-xl"></div>
             <div className="flex gap-2">
                <div className="h-10 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-10 w-20 bg-gray-200 rounded-full"></div>
             </div>
        </div>

        {/* Table/Card Skeleton */}
        <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-24 bg-white rounded-xl border border-gray-100"></div>
            ))}
        </div>
    </div>
);

// --- Helper Functions ---
const calculateMedal = (score: number, override?: string): string => {
    if (override && override !== '') return override;
    if (score >= 80) return 'Gold';
    if (score >= 70) return 'Silver';
    if (score >= 60) return 'Bronze';
    return 'Participant';
};

const getMedalIcon = (medal: string) => {
    const lower = (medal || '').toLowerCase();
    if (lower.includes('gold') || lower.includes('ทอง')) return <Medal className="w-5 h-5 text-yellow-500 drop-shadow-sm" />;
    if (lower.includes('silver') || lower.includes('เงิน')) return <Medal className="w-5 h-5 text-gray-400 drop-shadow-sm" />;
    if (lower.includes('bronze') || lower.includes('ทองแดง')) return <Medal className="w-5 h-5 text-orange-600 drop-shadow-sm" />;
    if (lower.includes('platinum')) return <Star className="w-5 h-5 text-blue-400 drop-shadow-sm" />;
    return <Award className="w-5 h-5 text-blue-600" />;
};

const getMedalTextThai = (medalStr: string) => {
    const medal = medalStr || '';
    if (medal.includes('Gold')) return 'เหรียญทอง';
    if (medal.includes('Silver')) return 'เหรียญเงิน';
    if (medal.includes('Bronze')) return 'เหรียญทองแดง';
    return 'เข้าร่วม';
};

const COLORS = ['#F59E0B', '#94A3B8', '#F97316', '#3B82F6']; // Gold, Silver, Bronze, Blue

const SchoolDetailModal = ({ schoolName, teams, stage, onClose, data }: { schoolName: string, teams: any[], stage: Stage, onClose: () => void, data: AppData }) => {
    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${stage === 'area' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                    <div>
                        <h3 className="font-bold text-lg flex items-center">
                            <SchoolIcon className="w-5 h-5 mr-2" />
                            {schoolName}
                        </h3>
                        <p className="text-white/80 text-xs mt-0.5">
                            {stage === 'area' ? 'รายการรางวัลทั้งหมด (ระดับเขต)' : 'รายการที่เป็นตัวแทน (ระดับกลุ่ม)'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {teams.length > 0 ? (
                        <div className="space-y-3">
                            {teams.map((t, idx) => {
                                const activity = data.activities.find(a => a.id === t.activityId);
                                const isRep = t.isRep;
                                return (
                                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${t.displayMedalRaw.includes('Gold') ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : t.displayMedalRaw.includes('Silver') ? 'bg-gray-50 border-gray-300 text-gray-500' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                                            {t.displayRank ? <span className="font-bold text-sm">#{t.displayRank}</span> : <Award className="w-5 h-5"/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-gray-500 truncate">{activity?.category || 'General'}</div>
                                            <div className="text-sm font-bold text-gray-900 line-clamp-1">{t.teamName}</div>
                                            <div className="text-xs text-gray-600 truncate">{activity?.name}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-black text-lg text-gray-800">{t.displayScore}</div>
                                            {isRep && (
                                                <div className="text-[9px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded inline-block">
                                                    ตัวแทน
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <List className="w-12 h-12 mb-2 opacity-20" />
                            <p className="text-sm">ไม่พบรายการข้อมูล</p>
                        </div>
                    )}
                </div>
                <div className="p-3 bg-white border-t border-gray-200 text-center text-xs text-gray-500">
                    รวมทั้งหมด {teams.length} รายการ
                </div>
            </div>
        </div>
    );
};

const ActivityRankingModal = ({ activityId, stage, data, onClose }: { activityId: string, stage: Stage, data: AppData, onClose: () => void }) => {
    const activity = data.activities.find(a => a.id === activityId);
    
    const teams = useMemo(() => {
        const relevantTeams = data.teams.filter(t => t.activityId === activityId);
        
        // Process teams for the current stage
        const processed = relevantTeams.map(team => {
            const areaInfo = team.stageInfo ? JSON.parse(team.stageInfo) : null;
            let score = 0;
            let rank = "";
            let medal = "";
            
            if (stage === 'cluster') {
                score = team.score;
                rank = team.rank;
                medal = team.medalOverride || calculateMedal(team.score);
            } else {
                // For Area view, only include if they have Area data or Flag TRUE
                if (team.stageStatus !== 'Area' && String(team.flag).toUpperCase() !== 'TRUE') return null;
                
                score = areaInfo?.score || 0;
                rank = areaInfo?.rank || "";
                medal = areaInfo?.medal || calculateMedal(score);
            }

            // Rep Logic
            const isRep = stage === 'area' 
                ? (String(rank) === '1') 
                : (String(team.rank) === '1' && String(team.flag).toUpperCase() === 'TRUE');

            const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);

            return {
                ...team,
                displayScore: score,
                displayRank: rank,
                displayMedal: medal,
                isRep,
                schoolName: school?.SchoolName || team.schoolId,
                clusterName: data.clusters.find(c => c.ClusterID === school?.SchoolCluster)?.ClusterName || '-'
            };
        }).filter(t => t !== null && (t.displayScore > 0 || t.displayScore === -1 || (stage === 'area' && t.stageStatus === 'Area')));

        // Sort: Score Desc -> Rank Asc
        return processed.sort((a, b) => {
            if (b.displayScore !== a.displayScore) return b.displayScore - a.displayScore;
            const rankA = parseInt(a.displayRank) || 999;
            const rankB = parseInt(b.displayRank) || 999;
            return rankA - rankB;
        });
    }, [activityId, stage, data]);

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${stage === 'area' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                    <div>
                        <h3 className="font-bold text-lg flex items-center">
                            <Activity className="w-5 h-5 mr-2" />
                            {activity?.name || activityId}
                        </h3>
                        <p className="text-white/80 text-xs mt-0.5">
                            {stage === 'area' ? 'สรุปผลระดับเขตพื้นที่' : 'สรุปผลระดับกลุ่มเครือข่าย'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-center w-16">อันดับ</th>
                                <th className="px-4 py-3 text-left">ทีม</th>
                                <th className="px-4 py-3 text-left">โรงเรียน</th>
                                <th className="px-4 py-3 text-center w-24">คะแนน</th>
                                <th className="px-4 py-3 text-left">รางวัล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {teams.map((t, idx) => (
                                <tr key={t.teamId} className={`hover:bg-gray-50 ${t.isRep ? 'bg-yellow-50/30' : ''}`}>
                                    <td className="px-4 py-3 text-center font-bold text-gray-500">
                                        {t.displayRank ? `#${t.displayRank}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{t.teamName}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {t.schoolName}
                                        <div className="text-[10px] text-gray-400">{t.clusterName}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600">
                                        {t.displayScore}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {getMedalIcon(t.displayMedal)}
                                            <span className="text-gray-700">{getMedalTextThai(t.displayMedal)}</span>
                                            {t.isRep && (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-bold ml-1">
                                                    ตัวแทน
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {teams.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">ยังไม่มีข้อมูลการตัดสินในระดับนี้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-200 text-right text-xs text-gray-500">
                    รวมทั้งหมด {teams.length} ทีม
                </div>
            </div>
        </div>
    );
};

const ResultsView: React.FC<ResultsViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCluster, setSelectedCluster] = useState(''); // NEW: Cluster Filter
  // Set default stage to 'area'
  const [stage, setStage] = useState<Stage>('area');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAllStats, setShowAllStats] = useState(false);
  const [showStatsChart, setShowStatsChart] = useState(true); // New: Toggle Chart
  
  // Modal State
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<{ name: string, cluster?: string } | null>(null);
  const [viewingActivityId, setViewingActivityId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Identify User's Cluster
  const userCluster = useMemo(() => {
      if (!user || !user.SchoolID) return null;
      const school = data.schools.find(s => s.SchoolID === user.SchoolID);
      return school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster)?.ClusterName : null;
  }, [user, data.schools, data.clusters]);

  // Simulate loading for better UX
  useEffect(() => {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, stage, quickFilter, selectedCategory, selectedCluster]);

  const getAreaInfo = (team: Team): AreaStageInfo | null => {
      try {
          return JSON.parse(team.stageInfo);
      } catch {
          return null;
      }
  };

  const categories = useMemo(() => {
      return ['All', ...Array.from(new Set(data.activities.map(a => a.category))).sort()];
  }, [data.activities]);

  // --- My School Summary Logic ---
  const mySchoolSummary = useMemo(() => {
      if (!user || !user.SchoolID) return null;
      
      const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
      const schoolName = userSchool?.SchoolName || user.SchoolID;
      
      let gold = 0, silver = 0, bronze = 0, total = 0, scoreSum = 0;
      let winnerCount = 0;

      data.teams.forEach(t => {
          // Filter by School
          const teamSchool = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          if (teamSchool?.SchoolID !== user.SchoolID) return;

          let score = 0;
          let medal = "";
          let rank = "";
          let isRep = false;

          if (stage === 'cluster') {
              score = t.score;
              medal = t.medalOverride || calculateMedal(t.score);
              rank = t.rank;
              // Cluster Rep: Rank 1 & Flag TRUE
              isRep = String(rank) === '1' && String(t.flag).toUpperCase() === 'TRUE';
          } else {
              const info = getAreaInfo(t);
              score = info?.score || 0;
              medal = info?.medal || (score > 0 ? calculateMedal(score) : "");
              rank = info?.rank || "";
              // Area Winner: Rank 1
              isRep = String(rank) === '1';
              
              // If viewing Area, only include teams that reached Area
              if (t.stageStatus !== 'Area' && String(t.flag).toUpperCase() !== 'TRUE') return;
          }

          if (score > 0 || score === -1) {
              total++;
              scoreSum += (score === -1 ? 0 : score);
              if (medal.includes('Gold')) gold++;
              else if (medal.includes('Silver')) silver++;
              else if (medal.includes('Bronze')) bronze++;
          }

          if (isRep) winnerCount++;
      });

      return {
          schoolName,
          gold, silver, bronze, total,
          winnerCount,
          avgScore: total > 0 ? (scoreSum / total).toFixed(1) : '0.0'
      };
  }, [user, data.teams, data.schools, stage]);

  // --- Main Data Processing ---
  const processedData = useMemo(() => {
      const teams = data.teams.map(team => {
          const areaInfo = getAreaInfo(team);
          
          let displayScore = 0;
          let displayRank = "";
          let displayMedalRaw = "";
          
          if (stage === 'cluster') {
              displayScore = team.score;
              displayRank = team.rank;
              displayMedalRaw = team.medalOverride || calculateMedal(team.score);
          } else {
              displayScore = areaInfo?.score || 0;
              displayRank = areaInfo?.rank || "";
              displayMedalRaw = areaInfo?.medal || (displayScore > 0 ? calculateMedal(displayScore) : "Participant");
          }

          // Representative Logic: 
          // ระดับเขต: นับเฉพาะที่ได้ที่ 1
          // ระดับกลุ่ม: นับ Rank 1 และมี Flag Q
          const isRep = stage === 'area' 
            ? (String(displayRank) === '1') 
            : (String(team.rank) === '1' && String(team.flag).toUpperCase() === 'TRUE');

          const activity = data.activities.find(a => a.id === team.activityId);
          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);

          return {
              ...team,
              displayScore,
              displayRank,
              displayMedalRaw,
              isRep,
              schoolName: school?.SchoolName || team.schoolId,
              clusterName: data.clusters.find(c => c.ClusterID === school?.SchoolCluster)?.ClusterName || '-',
              schoolClusterID: school?.SchoolCluster, // Add ID for filtering
              activityName: activity?.name || team.activityId,
              activityCategory: activity?.category || 'General'
          };
      });

      // Filter
      const filtered = teams.filter(t => {
          // Cluster Filter
          if (selectedCluster && selectedCluster !== 'All' && t.schoolClusterID !== selectedCluster) return false;

          // Category Filter
          if (selectedCategory !== 'All' && t.activityCategory !== selectedCategory) return false;

          // Search (Added Activity Name search)
          const term = searchTerm.toLowerCase();
          const matchSearch = t.teamName.toLowerCase().includes(term) || 
                              t.schoolName.toLowerCase().includes(term) ||
                              t.clusterName.toLowerCase().includes(term) ||
                              t.activityName.toLowerCase().includes(term);

          // Quick Filters
          let matchFilter = true;
          if (quickFilter === 'gold') matchFilter = (t.displayMedalRaw || '').includes('Gold');
          if (quickFilter === 'rep') matchFilter = t.isRep;
          if (quickFilter === 'top3') {
              const r = parseInt(t.displayRank);
              matchFilter = !isNaN(r) && r >= 1 && r <= 3;
          }

          // Stage Logic
          const matchStage = stage === 'cluster' ? (t.score > 0) : (t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');

          return matchSearch && matchFilter && matchStage;
      });

      // Sort: Score Desc -> Rank Asc -> Name Asc
      return filtered.sort((a, b) => {
          if (b.displayScore !== a.displayScore) return b.displayScore - a.displayScore;
          const rankA = parseInt(a.displayRank) || 999;
          const rankB = parseInt(b.displayRank) || 999;
          return rankA - rankB;
      });

  }, [data.teams, data.schools, data.clusters, stage, searchTerm, quickFilter, data.activities, selectedCategory, selectedCluster]);

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
      let gold = 0, silver = 0, bronze = 0, participant = 0;
      processedData.forEach(t => {
          const m = t.displayMedalRaw || '';
          if (m.includes('Gold')) gold++;
          else if (m.includes('Silver')) silver++;
          else if (m.includes('Bronze')) bronze++;
          else participant++;
      });
      return [
          { name: 'Gold', value: gold },
          { name: 'Silver', value: silver },
          { name: 'Bronze', value: bronze },
          { name: 'Other', value: participant }
      ];
  }, [processedData]);

  // --- Export CSV ---
  const handleExportCSV = () => {
      const headers = ['Team Name', 'School', 'Activity', 'Category', 'Score', 'Rank', 'Medal', 'Representative'];
      const csvContent = [
          headers.join(','),
          ...processedData.map(t => [
              `"${t.teamName.replace(/"/g, '""')}"`,
              `"${t.schoolName.replace(/"/g, '""')}"`,
              `"${t.activityName.replace(/"/g, '""')}"`,
              `"${t.activityCategory.replace(/"/g, '""')}"`,
              t.displayScore,
              t.displayRank || '-',
              t.displayMedalRaw,
              t.isRep ? 'Yes' : 'No'
          ].join(','))
      ].join('\n');

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `competition_results_${stage}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- Recent Updates (Top 6 latest updated) ---
  const recentUpdates = useMemo(() => {
      // Filter teams that have scores and sort by lastEditedAt
      const withScore = processedData.filter(t => t.displayScore > 0);
      return withScore.sort((a, b) => {
          const dateA = a.lastEditedAt ? new Date(a.lastEditedAt).getTime() : 0;
          const dateB = b.lastEditedAt ? new Date(b.lastEditedAt).getTime() : 0;
          return dateB - dateA;
      }).slice(0, 6);
  }, [processedData]);

  // --- Medal Summary Statistics ---
  const summaryStats = useMemo(() => {
      type SchoolStat = { name: string; gold: number; silver: number; bronze: number; total: number; score: number; winnerCount: number };
      
      if (stage === 'area') {
          const schoolMap: Record<string, SchoolStat> = {};
          processedData.forEach(t => {
              if (!schoolMap[t.schoolName]) schoolMap[t.schoolName] = { name: t.schoolName, gold: 0, silver: 0, bronze: 0, total: 0, score: 0, winnerCount: 0 };
              
              const medal = t.displayMedalRaw || '';
              const rank = t.displayRank;

              if (medal.includes('Gold')) schoolMap[t.schoolName].gold++;
              else if (medal.includes('Silver')) schoolMap[t.schoolName].silver++;
              else if (medal.includes('Bronze')) schoolMap[t.schoolName].bronze++;
              
              // Winner check in Area Stage strictly Rank 1
              if (String(rank) === '1') schoolMap[t.schoolName].winnerCount++;

              schoolMap[t.schoolName].total++;
              schoolMap[t.schoolName].score += t.displayScore;
          });
          
          const sortedList = Object.values(schoolMap).sort((a, b) => b.winnerCount - a.winnerCount || b.gold - a.gold || b.score - a.score);
          // Return full list or slice based on showAllStats
          return {
              type: 'area',
              data: showAllStats ? sortedList : sortedList.slice(0, 10),
              totalCount: sortedList.length
          };
      } else {
          // Cluster Stage
          const clusterMap: Record<string, Record<string, SchoolStat>> = {};
          
          processedData.forEach(t => {
              // Apply Cluster Filter Logic here as well for consistency in stats
              if (selectedCluster && selectedCluster !== 'All' && t.schoolClusterID !== selectedCluster) return;

              const cName = t.clusterName;
              if (!clusterMap[cName]) clusterMap[cName] = {};
              
              if (!clusterMap[cName][t.schoolName]) clusterMap[cName][t.schoolName] = { name: t.schoolName, gold: 0, silver: 0, bronze: 0, total: 0, score: 0, winnerCount: 0 };
              
              const medal = t.displayMedalRaw || '';
              const rank = t.displayRank;
              const flag = t.flag;

              if (medal.includes('Gold')) clusterMap[cName][t.schoolName].gold++;
              else if (medal.includes('Silver')) clusterMap[cName][t.schoolName].silver++;
              else if (medal.includes('Bronze')) clusterMap[cName][t.schoolName].bronze++;
              
              // Representative check for Cluster: Rank 1 and Flag TRUE
              if (String(rank) === '1' && String(flag).toUpperCase() === 'TRUE') clusterMap[cName][t.schoolName].winnerCount++;

              clusterMap[cName][t.schoolName].total++;
              clusterMap[cName][t.schoolName].score += t.displayScore;
          });

          const sortedClusters: Record<string, SchoolStat[]> = {};
          
          // Sort keys to prioritize user's cluster if exists
          let clusterKeys = Object.keys(clusterMap).sort();
          if (userCluster) {
              clusterKeys = clusterKeys.sort((a, b) => {
                  if (a === userCluster) return -1;
                  if (b === userCluster) return 1;
                  return a.localeCompare(b);
              });
          }

          clusterKeys.forEach(k => {
              sortedClusters[k] = Object.values(clusterMap[k]).sort((a, b) => b.winnerCount - a.winnerCount || b.gold - a.gold || b.score - a.score);
          });
          
          return { type: 'cluster', data: sortedClusters };
      }
  }, [processedData, stage, showAllStats, userCluster, selectedCluster]);

  // --- Modal Logic ---
  const modalTeams = useMemo(() => {
    if (!selectedSchoolDetail) return [];
    
    // Base filter: School
    let teams = processedData.filter(t => t.schoolName === selectedSchoolDetail.name);

    if (stage === 'cluster') {
        // Cluster Context
        if (selectedSchoolDetail.cluster) {
             teams = teams.filter(t => t.clusterName === selectedSchoolDetail.cluster);
        }
        // Requirement: "Cluster level can click to see activities where the school is a representative"
        teams = teams.filter(t => t.isRep);
    } else {
        // Requirement: "Area level can click to see every award"
        // Already filtered by stage in processedData, so show all matches
    }

    // Sort by Rank/Score
    return teams.sort((a, b) => parseInt(a.displayRank || '999') - parseInt(b.displayRank || '999') || b.displayScore - a.displayScore);
  }, [selectedSchoolDetail, processedData, stage]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedTeams = processedData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  if (isLoading) return <ResultsSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Modals */}
      {selectedSchoolDetail && (
          <SchoolDetailModal 
              schoolName={selectedSchoolDetail.name}
              teams={modalTeams}
              stage={stage}
              onClose={() => setSelectedSchoolDetail(null)}
              data={data}
          />
      )}
      
      {viewingActivityId && (
          <ActivityRankingModal 
              activityId={viewingActivityId}
              stage={stage}
              data={data}
              onClose={() => setViewingActivityId(null)}
          />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center font-kanit">
              <Award className="w-6 h-6 mr-2 text-blue-600" />
              ประกาศผลรางวัล (Results)
          </h2>
          <p className="text-gray-500 text-sm mt-1">ตรวจสอบคะแนนและรางวัลการแข่งขัน</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-full md:w-auto shadow-inner">
            <button
                onClick={() => setStage('cluster')}
                className={`flex-1 md:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${stage === 'cluster' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <LayoutGrid className="w-4 h-4 mr-2" /> ระดับกลุ่มฯ
            </button>
            <button
                onClick={() => setStage('area')}
                className={`flex-1 md:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${stage === 'area' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Trophy className="w-4 h-4 mr-2" /> ระดับเขตฯ
            </button>
        </div>
      </div>

      {/* My School Summary Block (Only if Logged In) */}
      {mySchoolSummary && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden animate-in slide-in-from-top-4">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <SchoolIcon className="w-40 h-40" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                      <SchoolIcon className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-2 backdrop-blur-sm">
                          <CheckCircle className="w-3 h-3" /> สรุปผลงานของท่าน ({stage === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})
                      </div>
                      <h3 className="text-2xl font-bold mb-1">{mySchoolSummary.schoolName}</h3>
                      <p className="text-blue-100 text-sm mb-4">ส่งแข่งขันทั้งหมด {mySchoolSummary.total} รายการ</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
                              <div className="text-2xl font-black text-yellow-300">{mySchoolSummary.gold}</div>
                              <div className="text-[10px] uppercase font-bold opacity-80">Gold</div>
                          </div>
                          <div className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
                              <div className="text-2xl font-black text-gray-300">{mySchoolSummary.silver}</div>
                              <div className="text-[10px] uppercase font-bold opacity-80">Silver</div>
                          </div>
                          <div className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
                              <div className="text-2xl font-black text-orange-300">{mySchoolSummary.bronze}</div>
                              <div className="text-[10px] uppercase font-bold opacity-80">Bronze</div>
                          </div>
                          <div className="bg-white/20 rounded-lg p-2 text-center border border-white/30 backdrop-blur-sm">
                              <div className="text-2xl font-black text-white">{mySchoolSummary.winnerCount}</div>
                              <div className="text-[10px] uppercase font-bold opacity-80">{stage === 'area' ? 'Winner' : 'Rep.'}</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Visual Analytics Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                  <PieIcon className="w-4 h-4 mr-2 text-purple-600" /> 
                  ภาพรวมเหรียญรางวัล (Medal Distribution)
              </h3>
              <button onClick={() => setShowStatsChart(!showStatsChart)} className="text-xs text-blue-600 hover:underline">
                  {showStatsChart ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}
              </button>
          </div>
          {showStatsChart && (
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{fontSize: 12}} />
                          <YAxis tick={{fontSize: 12}} />
                          <Tooltip />
                          <Bar dataKey="value" name="จำนวนทีม" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          )}
      </div>

      {/* Recent Updates Block - Enhanced */}
      {recentUpdates.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between mb-3 relative z-10">
                  <h3 className="text-sm font-bold text-blue-800 flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500 animate-pulse" />
                      รายการที่ประกาศล่าสุด (Recently Updated)
                  </h3>
                  <span className="text-[10px] text-blue-600 font-medium bg-white px-2 py-0.5 rounded-full shadow-sm">
                      <RefreshCw className="w-3 h-3 inline mr-1" />
                      Real-time
                  </span>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 relative z-10">
                  {recentUpdates.map((t, i) => (
                      <div key={`${t.teamId}-${i}`} className="min-w-[200px] max-w-[220px] bg-white p-3 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col group">
                          <div className="text-[10px] text-gray-400 font-medium mb-1 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {t.lastEditedAt ? new Date(t.lastEditedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : 'Recently'}
                          </div>
                          <div className="font-bold text-gray-800 text-sm truncate group-hover:text-blue-600 transition-colors" title={t.teamName}>{t.teamName}</div>
                          <div className="text-xs text-gray-500 truncate mb-2">{t.schoolName}</div>
                          <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-50">
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate max-w-[100px]" title={t.activityName}>{t.activityName}</span>
                              <span className="font-bold text-blue-600 text-sm">{t.displayScore}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center uppercase tracking-wide">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> 
                  สรุปเหรียญรางวัล ({stage === 'cluster' ? 'แยกกลุ่มเครือข่าย' : 'รวมระดับเขต'})
              </h3>
              <div className="flex items-center text-[10px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                  <Info className="w-3 h-3 mr-1 text-blue-500" />
                  💡 คลิกที่ชื่อโรงเรียนเพื่อดูรายการที่ได้รับรางวัล
              </div>
          </div>
          
          <div className="p-4 md:p-6 bg-gray-50">
              {summaryStats.type === 'area' ? (
                  // AREA: Single Table / List
                  <div className="flex flex-col gap-4">
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-w-[600px]">
                        <table className="w-full text-sm">
                            <thead className="bg-purple-50 text-purple-800 font-bold">
                                <tr>
                                    <th className="px-4 py-3 text-left">อันดับ</th>
                                    <th className="px-4 py-3 text-left">โรงเรียน</th>
                                    <th className="px-4 py-3 text-center text-yellow-600">ทอง</th>
                                    <th className="px-4 py-3 text-center text-gray-500">เงิน</th>
                                    <th className="px-4 py-3 text-center text-orange-600">ทองแดง</th>
                                    <th className="px-4 py-3 text-center">รวม</th>
                                    <th className="px-4 py-3 text-center bg-purple-100">ชนะเลิศ (ที่ 1)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(summaryStats.data as any[]).map((s, idx) => (
                                    <tr 
                                        key={idx} 
                                        className="hover:bg-purple-50/20 cursor-pointer transition-colors"
                                        onClick={() => setSelectedSchoolDetail({ name: s.name })}
                                    >
                                        <td className="px-4 py-3 text-center w-16 font-bold text-gray-500">{idx + 1}</td>
                                        <td className="px-4 py-3 font-bold text-gray-900">{s.name}</td>
                                        <td className="px-4 py-3 text-center font-bold text-gray-800">{s.gold}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{s.silver}</td>
                                        <td className="px-4 py-3 text-center text-gray-600">{s.bronze}</td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-600">{s.total}</td>
                                        <td className="px-4 py-3 text-center font-black text-purple-700 bg-purple-50/30">{s.winnerCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile List Cards */}
                    <div className="md:hidden space-y-3">
                        {(summaryStats.data as any[]).map((s, idx) => (
                            <div 
                                key={idx} 
                                className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
                                onClick={() => setSelectedSchoolDetail({ name: s.name })}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-bold flex items-center justify-center text-sm border border-purple-100">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm line-clamp-1">{s.name}</div>
                                        <div className="flex gap-2 mt-1 text-[10px] text-gray-500 font-medium">
                                            <span className="flex items-center text-yellow-600"><Medal className="w-3 h-3 mr-0.5" />{s.gold}</span>
                                            <span className="flex items-center text-gray-400"><Medal className="w-3 h-3 mr-0.5" />{s.silver}</span>
                                            <span className="flex items-center text-orange-600"><Medal className="w-3 h-3 mr-0.5" />{s.bronze}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 uppercase font-bold">ที่ 1</div>
                                    <div className="text-lg font-black text-purple-700 leading-none">{s.winnerCount}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* View All Button */}
                    {(summaryStats.totalCount || 0) > 10 && (
                        <button 
                            onClick={() => setShowAllStats(!showAllStats)}
                            className="w-full py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center font-medium shadow-sm"
                        >
                            {showAllStats ? (
                                <><ChevronUp className="w-4 h-4 mr-2" /> ย่อรายการ</>
                            ) : (
                                <><ChevronDown className="w-4 h-4 mr-2" /> ดูทั้งหมด ({summaryStats.totalCount})</>
                            )}
                        </button>
                    )}
                  </div>
              ) : (
                  // CLUSTER: Grid of Tables (Desktop) / Cards (Mobile)
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Object.entries(summaryStats.data).map(([clusterName, schools]: [string, any]) => {
                          const isUserCluster = userCluster && clusterName === userCluster;
                          return (
                            <div key={clusterName} className={`bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col h-full ${isUserCluster ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                                <div className={`px-4 py-2 border-b text-xs font-bold uppercase tracking-wider flex justify-between items-center ${isUserCluster ? 'bg-blue-600 text-white' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                                    <span>{clusterName}</span>
                                    {isUserCluster && <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] text-white">Your Cluster</span>}
                                </div>
                                
                                {/* Desktop Table */}
                                <table className="w-full text-xs hidden md:table">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">โรงเรียน</th>
                                            <th className="px-2 py-2 text-center w-10 text-yellow-600">ทอง</th>
                                            <th className="px-2 py-2 text-center w-10 text-gray-500">เงิน</th>
                                            <th className="px-2 py-2 text-center w-10 text-orange-600">ท.ด.</th>
                                            <th className="px-2 py-2 text-center w-10">รวม</th>
                                            <th className="px-3 py-2 text-center w-16 bg-blue-50">ตัวแทน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {schools.map((s: any, idx: number) => (
                                            <tr 
                                              key={idx} 
                                              className="hover:bg-blue-50/20 cursor-pointer"
                                              onClick={() => setSelectedSchoolDetail({ name: s.name, cluster: clusterName })}
                                            >
                                                <td className="px-3 py-2 truncate max-w-[150px]" title={s.name}>{idx+1}. {s.name}</td>
                                                <td className="px-2 py-2 text-center font-bold">{s.gold}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{s.silver}</td>
                                                <td className="px-2 py-2 text-center text-gray-500">{s.bronze}</td>
                                                <td className="px-2 py-2 text-center font-bold text-blue-600">{s.total}</td>
                                                <td className="px-3 py-2 text-center font-black text-blue-700 bg-blue-50/30">{s.winnerCount}</td>
                                            </tr>
                                        ))}
                                        {schools.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-gray-400">ยังไม่มีข้อมูล</td></tr>}
                                    </tbody>
                                </table>

                                {/* Mobile List */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {schools.map((s: any, idx: number) => (
                                        <div 
                                          key={idx} 
                                          className="p-3 flex items-center justify-between cursor-pointer active:bg-gray-50"
                                          onClick={() => setSelectedSchoolDetail({ name: s.name, cluster: clusterName })}
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="text-xs font-bold text-gray-400 w-4">{idx + 1}</div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                                                    <div className="flex gap-2 text-[10px] text-gray-500">
                                                        <span className="text-yellow-600 font-bold">{s.gold} G</span>
                                                        <span>•</span>
                                                        <span className="text-blue-600 font-bold">รวม {s.total}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right pl-2 shrink-0">
                                                <div className="text-[10px] text-gray-400">ตัวแทน</div>
                                                <div className="text-sm font-black text-blue-700">{s.winnerCount}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {schools.length === 0 && <div className="p-4 text-center text-xs text-gray-400 italic">ยังไม่มีข้อมูล</div>}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              )}
          </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 sticky top-0 z-10 md:static">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-1">หมวดหมู่ (Category)</label>
                <select 
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            
            {/* Cluster Filter */}
            <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-1">กลุ่มเครือข่าย (Cluster)</label>
                <SearchableSelect 
                    options={[{ label: 'ทั้งหมด (All Clusters)', value: 'All' }, ...(data.clusters || []).map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                    value={selectedCluster}
                    onChange={setSelectedCluster}
                    placeholder="เลือกกลุ่มเครือข่าย"
                    icon={<LayoutGrid className="h-4 w-4" />}
                />
            </div>

            <div className="flex-1 relative">
                <label className="block text-xs font-bold text-gray-500 mb-1">ค้นหา (Search)</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                        placeholder="ค้นหาชื่อทีม, โรงเรียน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-end">
                <button 
                    onClick={handleExportCSV}
                    className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center justify-center hover:bg-green-700 shadow-sm transition-all"
                >
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </button>
            </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button 
                onClick={() => setQuickFilter('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex items-center ${quickFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
                <LayoutGrid className="w-3 h-3 mr-1.5" /> ทั้งหมด ({processedData.length})
            </button>
            <button 
                onClick={() => setQuickFilter('gold')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex items-center ${quickFilter === 'gold' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50'}`}
            >
                <Medal className="w-3 h-3 mr-1.5" /> เหรียญทอง
            </button>
            <button 
                onClick={() => setQuickFilter('top3')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex items-center ${quickFilter === 'top3' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
            >
                <TrendingUp className="w-3 h-3 mr-1.5" /> Top 3 (1-3)
            </button>
            <button 
                onClick={() => setQuickFilter('rep')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex items-center ${quickFilter === 'rep' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
            >
                <Trophy className="w-3 h-3 mr-1.5" /> {stage === 'area' ? 'ผู้ชนะ (ที่ 1)' : 'ตัวแทนกลุ่มฯ'}
            </button>
        </div>
      </div>
      
      {/* Mobile Cards (Teams List) */}
      <div className="md:hidden space-y-3">
          {paginatedTeams.length > 0 ? paginatedTeams.map((team) => {
              const activity = data.activities.find(a => a.id === team.activityId);
              const medalText = getMedalTextThai(team.displayMedalRaw);
              const badgeClass = (team.displayMedalRaw || '').includes('Gold') ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                 (team.displayMedalRaw || '').includes('Silver') ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                 (team.displayMedalRaw || '').includes('Bronze') ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                 'bg-blue-50 text-blue-700 border-blue-100';

              return (
                  <div key={team.teamId} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden group ${team.isRep ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
                      {team.isRep && (
                          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center">
                              <Trophy className="w-3 h-3 mr-1" /> {stage === 'area' ? 'ชนะเลิศระดับเขต' : 'ตัวแทนกลุ่มฯ'}
                          </div>
                      )}
                      
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-200" style={{ backgroundColor: (team.displayMedalRaw || '').includes('Gold') ? '#EAB308' : (team.displayMedalRaw || '').includes('Silver') ? '#9CA3AF' : (team.displayMedalRaw || '').includes('Bronze') ? '#F97316' : '#60A5FA' }}></div>
                      
                      <div className="pl-3">
                          <div className="flex justify-between items-start mb-1 pr-16">
                              <h3 className="font-bold text-gray-900 text-lg line-clamp-2 leading-tight">{team.teamName}</h3>
                          </div>
                          
                          <div className="text-sm text-gray-600 font-medium mb-1 flex items-center">
                              <SchoolIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {team.schoolName}
                          </div>
                          
                          <div className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {team.clusterName}
                          </div>
                          
                          <div 
                            onClick={() => setViewingActivityId(team.activityId)}
                            className="text-xs text-blue-500 mt-2 pt-2 border-t border-dashed border-gray-100 cursor-pointer hover:underline flex items-center"
                          >
                              <Activity className="w-3 h-3 mr-1" />
                              {activity?.name || team.activityId}
                          </div>

                          <div className="flex justify-between items-end mt-3">
                              <div>
                                  <div className="text-[10px] text-gray-400 uppercase font-bold">คะแนนรวม</div>
                                  <div className="text-2xl font-black text-gray-800 leading-none">{team.displayScore}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                  {team.displayRank && (
                                      <div className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                                          ลำดับที่ {team.displayRank}
                                      </div>
                                  )}
                                  <div className={`px-2 py-0.5 rounded-md text-xs font-bold border ${badgeClass} flex items-center`}>
                                      {getMedalIcon(team.displayMedalRaw)}
                                      <span className="ml-1">{medalText}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              );
          }) : (
              <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">ไม่พบข้อมูลผลการแข่งขัน</p>
              </div>
          )}
      </div>

      {/* Desktop Table (Teams List) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className={stage === 'cluster' ? 'bg-blue-50' : 'bg-purple-50'}>
                    <tr>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-16 text-gray-600">อันดับ</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">ทีม / โรงเรียน</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">รายการแข่งขัน</th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-24 text-gray-600">คะแนน</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">รางวัล / สถานะ</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTeams.map((team, index) => {
                        const activity = data.activities.find(a => a.id === team.activityId);
                        const medalText = getMedalTextThai(team.displayMedalRaw);
                        const rankDisplay = team.displayRank;
                        const isRep = team.isRep;
                        
                        return (
                            <tr key={team.teamId} className={`hover:bg-gray-50 transition-colors ${isRep ? 'bg-indigo-50/40' : ''}`}>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${rankDisplay === '1' ? 'bg-yellow-100 text-yellow-700' : rankDisplay === '2' ? 'bg-gray-100 text-gray-600' : rankDisplay === '3' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}>
                                        {rankDisplay || '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className="text-sm font-bold text-gray-900">{team.teamName}</div>
                                        <div className="text-xs text-gray-500 font-medium flex items-center mt-0.5">
                                            {team.schoolName}
                                            <span className="mx-1.5 text-gray-300">|</span>
                                            <span className="text-gray-400">{team.clusterName}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                    <button 
                                        onClick={() => setViewingActivityId(team.activityId)}
                                        className="text-blue-600 hover:underline hover:text-blue-800 font-medium max-w-[250px] truncate text-left"
                                        title={`ดูอันดับ ${activity?.name}`}
                                    >
                                        {activity?.name || team.activityId}
                                    </button>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className="text-lg font-black text-gray-800">{team.displayScore}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="flex items-center text-sm font-medium text-gray-700">
                                            {getMedalIcon(team.displayMedalRaw)}
                                            <span className="ml-2">{medalText}</span>
                                        </span>
                                        {isRep && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 animate-pulse">
                                                <Trophy className="w-3 h-3 mr-1" /> {stage === 'area' ? 'ชนะเลิศระดับเขต' : 'ตัวแทนกลุ่มเครือข่าย'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {paginatedTeams.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 border-2 border-dashed border-gray-100 bg-gray-50/50 m-4 rounded-xl">
                                <Award className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                <p>ไม่พบข้อมูลผลการแข่งขัน</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-xl shadow-sm">
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
                          แสดง <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedData.length)}</span> จาก <span className="font-medium">{processedData.length}</span> รายการ
                      </p>
                  </div>
                  <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                              <span className="sr-only">Previous</span>
                              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          
                          <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                              หน้า {currentPage} / {totalPages}
                          </span>

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
      )}
    </div>
  );
};

export default ResultsView;
