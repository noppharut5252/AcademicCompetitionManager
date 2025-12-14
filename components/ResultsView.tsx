import React, { useState } from 'react';
import { AppData, Team } from '../types';
import { Award, Search, Medal, Star } from 'lucide-react';

interface ResultsViewProps {
  data: AppData;
}

const ResultsView: React.FC<ResultsViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only teams that have a score
  const scoredTeams = data.teams.filter(team => 
    team.score > 0 &&
    (team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     team.schoolId.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => b.score - a.score); // Sort by score descending

  const getMedalIcon = (medal: string) => {
    const lower = medal.toLowerCase();
    if (lower.includes('gold')) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (lower.includes('silver')) return <Medal className="w-5 h-5 text-gray-400" />;
    if (lower.includes('bronze')) return <Medal className="w-5 h-5 text-orange-600" />;
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
      <div>
        <h2 className="text-2xl font-bold text-gray-800">ประกาศผลรางวัล (Competition Results)</h2>
        <p className="text-gray-500">ตรวจสอบคะแนนและรางวัลการแข่งขัน</p>
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
                <thead className="bg-blue-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">อันดับ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ทีม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">รายการแข่งขัน</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">คะแนน</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">รางวัล</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {scoredTeams.map((team, index) => {
                        const activity = data.activities.find(a => a.id === team.activityId);
                        const school = data.schools.find(s => s.SchoolID === team.schoolId);
                        const medalText = getMedalColor(team.score, team.medalOverride);
                        
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
                                    {team.score}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="flex items-center text-sm text-gray-700">
                                        {getMedalIcon(medalText)}
                                        <span className="ml-2">{medalText}</span>
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                    {scoredTeams.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                ยังไม่มีการประกาศผลคะแนนสำหรับรายการที่ค้นหา
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