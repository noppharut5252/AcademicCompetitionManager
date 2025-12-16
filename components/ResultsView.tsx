
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Team, AreaStageInfo } from '../types';
import { Award, Search, Medal, Star, Trophy, LayoutGrid, Crown, School, CheckCircle, BarChart3, Flag, MapPin } from 'lucide-react';

interface ResultsViewProps {
  data: AppData;
}

type Stage = 'cluster' | 'area';

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

        {/* Stats Skeleton */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
                ))}
            </div>
        </div>

        {/* Search Skeleton */}
        <div className="h-12 w-full md:w-96 bg-gray-200 rounded-xl"></div>

        {/* Table/Card Skeleton */}
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-white rounded-xl border border-gray-100"></div>
            ))}
        </div>
    </div>
);

const ResultsView: React.FC<ResultsViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stage, setStage] = useState<Stage>('cluster');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for better UX
  useEffect(() => {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
  }, []);

  const getAreaInfo = (team: Team): AreaStageInfo | null => {
      try {
          return JSON.parse(team.stageInfo);
      } catch {
          return null;
      }
  };

  // Filter and sort based on stage
  const scoredTeams = useMemo(() => {
      return data.teams.filter(team => {
          const hasClusterScore = team.score > 0;
          const areaInfo = getAreaInfo(team);
          const hasAreaScore = areaInfo && (areaInfo.score !== undefined && areaInfo.score !== null);
          
          const scoreCheck = stage === 'cluster' ? hasClusterScore : hasAreaScore;
          const termCheck = team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            team.schoolId.toLowerCase().includes(searchTerm.toLowerCase());
          return scoreCheck && termCheck;
      }).sort((a, b) => {
          if (stage === 'cluster') {
              // Primary: Score
              if (b.score !== a.score) return b.score - a.score;
              // Secondary: Rank (if manually set) to handle equal scores
              return (parseInt(a.rank) || 999) - (parseInt(b.rank) || 999);
          } else {
              const areaA = getAreaInfo(a)?.score || 0;
              const areaB = getAreaInfo(b)?.score || 0;
              return areaB - areaA;
          }
      });
  }, [data.teams, stage, searchTerm]);

  // Overall Statistics for current View
  const stats = useMemo(() => {
      const counts = { gold: 0, silver: 0, bronze: 0, total: scoredTeams.length };
      scoredTeams.forEach(t => {
          let medal = '';
          if (stage === 'cluster') {
              medal = t.medalOverride || (t.score >= 80 ? 'Gold' : t.score >= 70 ? 'Silver' : t.score >= 60 ? 'Bronze' : '');
          } else {
              const areaInfo = getAreaInfo(t);
              medal = areaInfo?.medal || '';
              // Fallback calc if no medal string
              if (!medal && areaInfo?.score) {
                  const s = areaInfo.score;
                  medal = s >= 80 ? 'Gold' : s >= 70 ? 'Silver' : s >= 60 ? 'Bronze' : '';
              }
          }
          
          if (medal.includes('Gold')) counts.gold++;
          else if (medal.includes('Silver')) counts.silver++;
          else if (medal.includes('Bronze')) counts.bronze++;
      });
      return counts;
  }, [scoredTeams, stage]);

  const getMedalIcon = (medal: string) => {
    const lower = medal.toLowerCase();
    if (lower.includes('gold') || lower.includes('ทอง')) return <Medal className="w-5 h-5 text-yellow-500 drop-shadow-sm" />;
    if (lower.includes('silver') || lower.includes('เงิน')) return <Medal className="w-5 h-5 text-gray-400 drop-shadow-sm" />;
    if (lower.includes('bronze') || lower.includes('ทองแดง')) return <Medal className="w-5 h-5 text-orange-600 drop-shadow-sm" />;
    if (lower.includes('platinum')) return <Star className="w-5 h-5 text-blue-400 drop-shadow-sm" />;
    return <Award className="w-5 h-5 text-blue-600" />;
  };

  const getMedalColor = (score: number, override: string) => {
      if (override) return override;
      if (score >= 80) return "Gold (เหรียญทอง)";
      if (score >= 70) return "Silver (เหรียญเงิน)";
      if (score >= 60) return "Bronze (เหรียญทองแดง)";
      return "Participant (เข้าร่วม)";
  }

  // Helper to extract clean medal text
  const getMedalTextClean = (medalStr: string) => {
      if (medalStr.includes('Gold')) return 'เหรียญทอง';
      if (medalStr.includes('Silver')) return 'เหรียญเงิน';
      if (medalStr.includes('Bronze')) return 'เหรียญทองแดง';
      return 'เข้าร่วม';
  };

  const getMedalBadgeClass = (medalStr: string) => {
      if (medalStr.includes('Gold')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      if (medalStr.includes('Silver')) return 'bg-gray-100 text-gray-700 border-gray-200';
      if (medalStr.includes('Bronze')) return 'bg-orange-100 text-orange-700 border-orange-200';
      return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  if (isLoading) return <ResultsSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center font-kanit">
              <Award className="w-6 h-6 mr-2 text-blue-600" />
              ประกาศผลรางวัล (Results)
          </h2>
          <p className="text-gray-500 text-sm mt-1">ตรวจสอบคะแนนและรางวัลการแข่งขัน</p>
        </div>
        
        {/* Stage Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-full md:w-auto">
            <button
                onClick={() => setStage('cluster')}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${stage === 'cluster' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <LayoutGrid className="w-4 h-4 mr-1.5" /> ระดับกลุ่มฯ
            </button>
            <button
                onClick={() => setStage('area')}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${stage === 'area' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Trophy className="w-4 h-4 mr-1.5" /> ระดับเขตฯ
            </button>
        </div>
      </div>

      {/* Statistics Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center mb-3 text-sm font-bold text-gray-700">
              <BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> ภาพรวมผลการแข่งขัน ({stage === 'cluster' ? 'กลุ่มเครือข่าย' : 'เขตพื้นที่'})
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col items-center">
                  <span className="text-xs text-gray-500 uppercase font-bold">ประกาศผลแล้ว</span>
                  <span className="text-xl font-black text-gray-800">{stats.total} <span className="text-xs font-normal text-gray-400">ทีม</span></span>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100 flex flex-col items-center">
                  <span className="text-xs text-yellow-600 uppercase font-bold">เหรียญทอง</span>
                  <span className="text-xl font-black text-yellow-700">{stats.gold}</span>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 border border-gray-200 flex flex-col items-center">
                  <span className="text-xs text-gray-500 uppercase font-bold">เหรียญเงิน</span>
                  <span className="text-xl font-black text-gray-700">{stats.silver}</span>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100 flex flex-col items-center">
                  <span className="text-xs text-orange-600 uppercase font-bold">เหรียญทองแดง</span>
                  <span className="text-xl font-black text-orange-700">{stats.bronze}</span>
              </div>
          </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            placeholder="ค้นหาชื่อทีม หรือ โรงเรียน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile Card View (Optimized) */}
      <div className="md:hidden space-y-4">
          {scoredTeams.length > 0 ? scoredTeams.map((team) => {
              const activity = data.activities.find(a => a.id === team.activityId);
              const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
              const cluster = data.clusters.find(c => c.ClusterID === school?.SchoolCluster);
              
              let score = 0;
              let medalText = "";
              let rank = "";
              
              if (stage === 'cluster') {
                  score = team.score;
                  medalText = getMedalColor(team.score, team.medalOverride);
                  rank = team.rank;
              } else {
                  const areaInfo = getAreaInfo(team);
                  score = areaInfo?.score || 0;
                  medalText = areaInfo?.medal || (score > 0 ? getMedalColor(score, '') : "รอผล");
                  rank = areaInfo?.rank || "";
              }

              const cleanMedal = getMedalTextClean(medalText);
              const badgeClass = getMedalBadgeClass(medalText);
              const isClusterRep = stage === 'cluster' && String(rank) === '1' && String(team.flag).toUpperCase() === 'TRUE';

              return (
                  <div key={team.teamId} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden group">
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cleanMedal === 'เหรียญทอง' ? 'bg-yellow-400' : cleanMedal === 'เหรียญเงิน' ? 'bg-gray-400' : cleanMedal === 'เหรียญทองแดง' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                      
                      <div className="pl-3 mb-2">
                          <div className="flex justify-between items-start mb-1">
                              <h3 className="font-bold text-gray-900 text-lg line-clamp-2 leading-tight">{team.teamName}</h3>
                              {rank && (
                                  <div className="flex flex-col items-end">
                                      <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded shadow-sm mb-1">
                                          #{rank}
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          <div className="text-sm text-gray-600 font-medium mb-1 flex items-center">
                              <School className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {school?.SchoolName || team.schoolId}
                          </div>
                          
                          <div className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {cluster?.ClusterName || '-'}
                          </div>
                          
                          <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-dashed border-gray-100">
                              {activity?.name || team.activityId}
                          </div>
                      </div>

                      {/* Result Bar */}
                      <div className="bg-gray-50 rounded-lg p-2 pl-3 ml-2 border border-gray-100 flex justify-between items-center mt-3">
                          <div>
                              <div className="text-[10px] text-gray-400 uppercase font-bold">คะแนนรวม</div>
                              <div className="text-xl font-black text-gray-800">{score}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass} flex items-center shadow-sm`}>
                                  {getMedalIcon(medalText)}
                                  <span className="ml-1.5">{cleanMedal}</span>
                              </div>
                              {/* Cluster Representative Badge (Mobile) */}
                              {isClusterRep && (
                                  <div className="flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200 shadow-sm animate-pulse">
                                      <Trophy className="w-3 h-3 mr-1" /> ตัวแทนกลุ่มฯ
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              );
          }) : (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">ไม่พบข้อมูลผลการแข่งขัน</p>
              </div>
          )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className={stage === 'cluster' ? 'bg-blue-50' : 'bg-purple-50'}>
                    <tr>
                        <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-16 ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>อันดับ</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>ทีม / โรงเรียน</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>รายการแข่งขัน</th>
                        <th className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-24 ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>คะแนน</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>รางวัล / สถานะ</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {scoredTeams.map((team, index) => {
                        const activity = data.activities.find(a => a.id === team.activityId);
                        const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                        const cluster = data.clusters.find(c => c.ClusterID === school?.SchoolCluster);
                        
                        let score = 0;
                        let medalText = "";
                        let rankDisplay = "";
                        
                        if (stage === 'cluster') {
                            score = team.score;
                            medalText = getMedalColor(team.score, team.medalOverride);
                            rankDisplay = team.rank;
                        } else {
                            const areaInfo = getAreaInfo(team);
                            score = areaInfo?.score || 0;
                            medalText = areaInfo?.medal || areaInfo?.rank || "ผู้เข้าร่วม";
                            rankDisplay = areaInfo?.rank || "";
                        }

                        const isClusterRep = stage === 'cluster' && String(rankDisplay) === '1' && String(team.flag).toUpperCase() === 'TRUE';
                        
                        return (
                            <tr key={team.teamId} className={`hover:bg-gray-50 transition-colors ${isClusterRep ? 'bg-indigo-50/30' : ''}`}>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${rankDisplay === '1' ? 'bg-yellow-100 text-yellow-700' : rankDisplay === '2' ? 'bg-gray-100 text-gray-600' : rankDisplay === '3' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}>
                                        {rankDisplay || index + 1}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className="text-sm font-bold text-gray-900">{team.teamName}</div>
                                        <div className="text-xs text-gray-500 font-medium flex items-center mt-0.5">
                                            {school?.SchoolName || team.schoolId}
                                            <span className="mx-1.5 text-gray-300">|</span>
                                            <span className="text-gray-400">{cluster?.ClusterName}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 max-w-[200px] truncate" title={activity?.name}>
                                    {activity?.name || team.activityId}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className="text-lg font-black text-gray-800">{score}</span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="flex items-center text-sm font-medium text-gray-700">
                                            {stage === 'area' && <Trophy className="w-4 h-4 text-purple-500 mr-2"/>}
                                            {stage === 'cluster' && getMedalIcon(medalText)}
                                            <span className="ml-2">{getMedalTextClean(medalText)}</span>
                                        </span>
                                        {/* Cluster Representative Badge (Desktop) */}
                                        {isClusterRep && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                <Trophy className="w-3 h-3 mr-1" /> ตัวแทนกลุ่มเครือข่าย
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {scoredTeams.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 border-2 border-dashed border-gray-100 bg-gray-50/50 m-4 rounded-xl">
                                <Award className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                <p>ยังไม่มีการประกาศผลคะแนนสำหรับรายการที่ค้นหา</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default ResultsView;

