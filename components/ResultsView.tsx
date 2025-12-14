import React, { useState } from 'react';
import { AppData, Team, AreaStageInfo } from '../types';
import { Award, Search, Medal, Star, Trophy } from 'lucide-react';

interface ResultsViewProps {
  data: AppData;
}

type Stage = 'cluster' | 'area';

const ResultsView: React.FC<ResultsViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stage, setStage] = useState<Stage>('cluster');

  const getAreaInfo = (team: Team): AreaStageInfo | null => {
      try {
          return JSON.parse(team.stageInfo);
      } catch {
          return null;
      }
  };

  // Filter and sort based on stage
  const scoredTeams = data.teams.filter(team => {
      const hasClusterScore = team.score > 0;
      const areaInfo = getAreaInfo(team);
      const hasAreaScore = areaInfo && (areaInfo.score !== undefined && areaInfo.score !== null);
      
      const scoreCheck = stage === 'cluster' ? hasClusterScore : hasAreaScore;
      const termCheck = team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        team.schoolId.toLowerCase().includes(searchTerm.toLowerCase());
      return scoreCheck && termCheck;
  }).sort((a, b) => {
      if (stage === 'cluster') {
          return b.score - a.score;
      } else {
          const areaA = getAreaInfo(a)?.score || 0;
          const areaB = getAreaInfo(b)?.score || 0;
          return areaB - areaA;
      }
  });

  const getMedalIcon = (medal: string) => {
    const lower = medal.toLowerCase();
    if (lower.includes('gold') || lower.includes('ทอง')) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (lower.includes('silver') || lower.includes('เงิน')) return <Medal className="w-5 h-5 text-gray-400" />;
    if (lower.includes('bronze') || lower.includes('ทองแดง')) return <Medal className="w-5 h-5 text-orange-600" />;
    if (lower.includes('platinum')) return <Star className="w-5 h-5 text-blue-400" />;
    return <Award className="w-5 h-5 text-blue-600" />;
  };

  const getMedalColor = (score: number, override: string) => {
      if (override) return override;
      if (score >= 80) return "Gold (เหรียญทอง)";
      if (score >= 70) return "Silver (เหรียญเงิน)";
      if (score >= 60) return "Bronze (เหรียญทองแดง)";
      return "Participant (เข้าร่วม)";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">ประกาศผลรางวัล (Results)</h2>
          <p className="text-gray-500">ตรวจสอบคะแนนและรางวัลการแข่งขัน</p>
        </div>
        
        {/* Stage Toggle */}
        <div className="mt-4 md:mt-0 flex bg-gray-100 p-1 rounded-lg">
            <button
                onClick={() => setStage('cluster')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${stage === 'cluster' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                ระดับกลุ่มเครือข่าย (Network)
            </button>
            <button
                onClick={() => setStage('area')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${stage === 'area' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                ระดับเขตพื้นที่ (District)
            </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="ค้นหาชื่อทีม หรือ โรงเรียน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className={stage === 'cluster' ? 'bg-blue-50' : 'bg-purple-50'}>
                    <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>อันดับ</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>ทีม</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>รายการแข่งขัน</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>คะแนน ({stage === 'cluster' ? 'Cluster' : 'Area'})</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${stage === 'cluster' ? 'text-blue-800' : 'text-purple-800'}`}>รางวัล/สถานะ</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {scoredTeams.map((team, index) => {
                        const activity = data.activities.find(a => a.id === team.activityId);
                        const school = data.schools.find(s => s.SchoolID === team.schoolId);
                        
                        let score = 0;
                        let medalText = "";
                        
                        if (stage === 'cluster') {
                            score = team.score;
                            medalText = getMedalColor(team.score, team.medalOverride);
                        } else {
                            const areaInfo = getAreaInfo(team);
                            score = areaInfo?.score || 0;
                            medalText = areaInfo?.medal || areaInfo?.rank || "ผู้เข้าร่วม";
                        }
                        
                        return (
                            <tr key={team.teamId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                                    {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                                    <div className="text-xs text-gray-500">{school?.SchoolName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {activity?.name || team.activityId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    {score}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="flex items-center text-sm text-gray-700">
                                        {stage === 'area' && <Trophy className="w-4 h-4 text-purple-500 mr-2"/>}
                                        {stage === 'cluster' && getMedalIcon(medalText)}
                                        <span className="ml-2">{medalText}</span>
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    {scoredTeams.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                ยังไม่มีการประกาศผลคะแนนสำหรับรายการที่ค้นหาในรอบ {stage === 'cluster' ? 'เขตพื้นที่' : 'ภาค/ประเทศ'}
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