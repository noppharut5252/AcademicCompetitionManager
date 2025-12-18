
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Team, AreaStageInfo, School } from '../types';
import { Award, Search, Medal, Star, Trophy, LayoutGrid, Crown, School as SchoolIcon, CheckCircle, BarChart3, Flag, MapPin, ChevronLeft, ChevronRight, Filter, TrendingUp } from 'lucide-react';

interface ResultsViewProps {
  data: AppData;
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
    const lower = medal.toLowerCase();
    if (lower.includes('gold') || lower.includes('ทอง')) return <Medal className="w-5 h-5 text-yellow-500 drop-shadow-sm" />;
    if (lower.includes('silver') || lower.includes('เงิน')) return <Medal className="w-5 h-5 text-gray-400 drop-shadow-sm" />;
    if (lower.includes('bronze') || lower.includes('ทองแดง')) return <Medal className="w-5 h-5 text-orange-600 drop-shadow-sm" />;
    if (lower.includes('platinum')) return <Star className="w-5 h-5 text-blue-400 drop-shadow-sm" />;
    return <Award className="w-5 h-5 text-blue-600" />;
};

const getMedalTextThai = (medalStr: string) => {
    if (medalStr.includes('Gold')) return 'เหรียญทอง';
    if (medalStr.includes('Silver')) return 'เหรียญเงิน';
    if (medalStr.includes('Bronze')) return 'เหรียญทองแดง';
    return 'เข้าร่วม';
};

const ResultsView: React.FC<ResultsViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stage, setStage] = useState<Stage>('cluster');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Simulate loading for better UX
  useEffect(() => {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, stage, quickFilter]);

  const getAreaInfo = (team: Team): AreaStageInfo | null => {
      try {
          return JSON.parse(team.stageInfo);
      } catch {
          return null;
      }
  };

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

          return {
              ...team,
              displayScore,
              displayRank,
              displayMedalRaw,
              isRep,
              schoolName: data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId,
              clusterName: data.clusters.find(c => c.ClusterID === (data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolCluster))?.ClusterName || '-'
          };
      });

      // Filter
      const filtered = teams.filter(t => {
          const hasScore = t.displayScore > 0 || (stage === 'area' && t.stageStatus === 'Area'); // Basic visibility
          
          // Search
          const matchSearch = t.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              t.clusterName.toLowerCase().includes(searchTerm.toLowerCase());

          // Quick Filters
          let matchFilter = true;
          if (quickFilter === 'gold') matchFilter = t.displayMedalRaw.includes('Gold');
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

  }, [data.teams, data.schools, data.clusters, stage, searchTerm, quickFilter]);

  // --- Medal Summary Statistics ---
  const summaryStats = useMemo(() => {
      type SchoolStat = { name: string; gold: number; silver: number; bronze: number; total: number; score: number; winnerCount: number };
      
      if (stage === 'area') {
          const schoolMap: Record<string, SchoolStat> = {};
          processedData.forEach(t => {
              if (!schoolMap[t.schoolName]) schoolMap[t.schoolName] = { name: t.schoolName, gold: 0, silver: 0, bronze: 0, total: 0, score: 0, winnerCount: 0 };
              
              const medal = t.displayMedalRaw;
              const rank = t.displayRank;

              if (medal.includes('Gold')) schoolMap[t.schoolName].gold++;
              else if (medal.includes('Silver')) schoolMap[t.schoolName].silver++;
              else if (medal.includes('Bronze')) schoolMap[t.schoolName].bronze++;
              
              // MODIFIED: Winner check in Area Stage strictly Rank 1
              if (String(rank) === '1') schoolMap[t.schoolName].winnerCount++;

              schoolMap[t.schoolName].total++;
              schoolMap[t.schoolName].score += t.displayScore;
          });
          return {
              type: 'area',
              data: Object.values(schoolMap).sort((a, b) => b.winnerCount - a.winnerCount || b.gold - a.gold || b.score - a.score).slice(0, 10) 
          };
      } else {
          const clusterMap: Record<string, Record<string, SchoolStat>> = {};
          
          processedData.forEach(t => {
              const cName = t.clusterName;
              if (!clusterMap[cName]) clusterMap[cName] = {};
              
              if (!clusterMap[cName][t.schoolName]) clusterMap[cName][t.schoolName] = { name: t.schoolName, gold: 0, silver: 0, bronze: 0, total: 0, score: 0, winnerCount: 0 };
              
              const medal = t.displayMedalRaw;
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
          Object.keys(clusterMap).forEach(k => {
              sortedClusters[k] = Object.values(clusterMap[k]).sort((a, b) => b.winnerCount - a.winnerCount || b.gold - a.gold || b.score - a.score);
          });
          
          return { type: 'cluster', data: sortedClusters };
      }
  }, [processedData, stage]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedTeams = processedData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  if (isLoading) return <ResultsSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800 flex items-center uppercase tracking-wide">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> 
                  สรุปเหรียญรางวัล ({stage === 'cluster' ? 'แยกกลุ่มเครือข่าย' : 'รวมระดับเขต'})
              </h3>
          </div>
          
          <div className="p-6 bg-gray-50 overflow-x-auto">
              {summaryStats.type === 'area' ? (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-w-[600px]">
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
                                  <tr key={idx} className="hover:bg-purple-50/20">
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
              ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {Object.entries(summaryStats.data).map(([clusterName, schools]: [string, any]) => (
                          <div key={clusterName} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
                              <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 text-xs font-bold text-blue-800 uppercase tracking-wider">
                                  {clusterName}
                              </div>
                              <table className="w-full text-xs">
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
                                          <tr key={idx}>
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
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        
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

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
            placeholder="ค้นหาชื่อทีม, โรงเรียน, หรือกลุ่มเครือข่าย..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="md:hidden space-y-3">
          {paginatedTeams.length > 0 ? paginatedTeams.map((team) => {
              const activity = data.activities.find(a => a.id === team.activityId);
              const medalText = getMedalTextThai(team.displayMedalRaw);
              const badgeClass = team.displayMedalRaw.includes('Gold') ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                 team.displayMedalRaw.includes('Silver') ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                 team.displayMedalRaw.includes('Bronze') ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                 'bg-blue-50 text-blue-700 border-blue-100';

              return (
                  <div key={team.teamId} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden group ${team.isRep ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
                      {team.isRep && (
                          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center">
                              <Trophy className="w-3 h-3 mr-1" /> {stage === 'area' ? 'ชนะเลิศระดับเขต' : 'ตัวแทนกลุ่มฯ'}
                          </div>
                      )}
                      
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-200" style={{ backgroundColor: team.displayMedalRaw.includes('Gold') ? '#EAB308' : team.displayMedalRaw.includes('Silver') ? '#9CA3AF' : team.displayMedalRaw.includes('Bronze') ? '#F97316' : '#60A5FA' }}></div>
                      
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
                          
                          <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-dashed border-gray-100">
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
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-[200px] truncate" title={activity?.name}>
                                    {activity?.name || team.activityId}
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

