
import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppData, Team, AreaStageInfo } from '../types';
import { Trophy, Medal, School, ArrowLeft, Activity, Calendar, Loader2, Award, CheckCircle, List, ListChecks, Hash, Users } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';

interface PublicResultViewProps {
  data: AppData;
}

const PublicResultView: React.FC<PublicResultViewProps> = ({ data }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teamId = searchParams.get('id');
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data && data.teams.length > 0) {
      const found = data.teams.find(t => t.teamId === teamId);
      setTeam(found || null);
      setLoading(false);
    }
  }, [data, teamId]);

  // Determine viewing context (Area vs Cluster) based on data presence
  const resultData = useMemo(() => {
      if (!team) return null;
      
      let score = team.score;
      let rank = team.rank;
      let medal = team.medalOverride;
      let isArea = false;
      let stageLabel = "ระดับกลุ่มเครือข่าย";

      // Check if Area Stage info exists and has valid score
      try {
          if (team.stageInfo) {
              const areaInfo = JSON.parse(team.stageInfo);
              if (areaInfo.score || areaInfo.rank) {
                  score = areaInfo.score;
                  rank = areaInfo.rank;
                  medal = areaInfo.medal;
                  isArea = true;
                  stageLabel = "ระดับเขตพื้นที่การศึกษา";
              }
          }
      } catch {}

      // Calculate Medal if automatic
      if (!medal && score > 0) {
          if (score >= 80) medal = 'Gold';
          else if (score >= 70) medal = 'Silver';
          else if (score >= 60) medal = 'Bronze';
          else medal = 'Participant';
      }

      return { score, rank, medal, isArea, stageLabel };
  }, [team]);

  // ประมวลผลตารางคะแนนรวมของกิจกรรมนั้นๆ
  const leaderboard = useMemo(() => {
      if (!team || !data) return [];
      
      const activityId = team.activityId;
      const isArea = resultData?.isArea || false;

      let allTeamsInAct = data.teams.filter(t => t.activityId === activityId);
      
      if (isArea) {
          // ในระดับเขต กรองเฉพาะทีมที่เข้ารอบเขต
          allTeamsInAct = allTeamsInAct.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      } else {
          // ในระดับกลุ่ม กรองเฉพาะกลุ่มเดียวกับทีมที่แชร์
          const teamSchool = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          if (teamSchool) {
              allTeamsInAct = allTeamsInAct.filter(t => {
                  const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                  return s?.SchoolCluster === teamSchool.SchoolCluster;
              });
          }
      }

      return allTeamsInAct.map(t => {
          let s = 0, r = '', m = '';
          if (isArea) {
              try {
                  const info = JSON.parse(t.stageInfo || '{}');
                  s = info.score || 0;
                  r = info.rank || '';
                  m = info.medal || '';
              } catch { s = 0; }
          } else {
              s = t.score;
              r = t.rank;
              m = t.medalOverride;
          }

          if (!m && s > 0) {
              if (s >= 80) m = 'Gold';
              else if (s >= 70) m = 'Silver';
              else if (s >= 60) m = 'Bronze';
              else m = 'Participant';
          }

          const sch = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
          return {
              id: t.teamId,
              name: t.teamName,
              school: sch?.SchoolName || t.schoolId,
              score: s,
              rank: r,
              medal: m
          };
      }).sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const rA = parseInt(a.rank) || 999;
          const rB = parseInt(b.rank) || 999;
          return rA - rB;
      });
  }, [team, data, resultData]);

  // Effect: Confetti for winners
  useEffect(() => {
      if (!loading && resultData) {
          const m = (resultData.medal || '').toLowerCase();
          if (m.includes('gold') || m.includes('silver') || m.includes('bronze')) {
              const duration = 2000;
              const end = Date.now() + duration;
              const frame = () => {
                  confetti({
                      particleCount: 2,
                      angle: 60,
                      spread: 55,
                      origin: { x: 0 },
                      colors: m.includes('gold') ? ['#FFD700', '#FFA500'] : m.includes('silver') ? ['#C0C0C0', '#FFFFFF'] : ['#CD7F32', '#8B4513']
                  });
                  confetti({
                      particleCount: 2,
                      angle: 120,
                      spread: 55,
                      origin: { x: 1 },
                      colors: m.includes('gold') ? ['#FFD700', '#FFA500'] : m.includes('silver') ? ['#C0C0C0', '#FFFFFF'] : ['#CD7F32', '#8B4513']
                  });
                  if (Date.now() < end) requestAnimationFrame(frame);
              };
              frame();
          }
      }
  }, [loading, resultData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-kanit">กำลังโหลดตารางคะแนน...</p>
      </div>
    );
  }

  if (!team || !resultData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-kanit">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800">ไม่พบข้อมูล</h3>
            <p className="text-gray-500 text-sm mt-2">อาจรอยืนยันผลหรือลิงก์ไม่ถูกต้อง</p>
            <button onClick={() => navigate('/')} className="mt-6 w-full py-2 bg-gray-100 rounded-xl text-gray-600 font-bold text-sm">กลับหน้าหลัก</button>
        </div>
      </div>
    );
  }

  const activity = data.activities.find(a => a.id === team.activityId);
  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
  
  const getMedalColor = (m: string) => {
      const lower = (m || '').toLowerCase();
      if (lower.includes('gold')) return { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-200', gradient: 'from-yellow-400 to-amber-500' };
      if (lower.includes('silver')) return { bg: 'bg-gray-400', text: 'text-gray-600', border: 'border-gray-200', gradient: 'from-gray-300 to-gray-500' };
      if (lower.includes('bronze')) return { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', gradient: 'from-orange-400 to-red-500' };
      return { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-100', gradient: 'from-blue-400 to-indigo-500' };
  };

  const medalStyle = getMedalColor(resultData.medal || '');
  const medalText = (resultData.medal || '').includes('Gold') ? 'เหรียญทอง' : (resultData.medal || '').includes('Silver') ? 'เหรียญเงิน' : (resultData.medal || '').includes('Bronze') ? 'เหรียญทองแดง' : 'เข้าร่วม';

  return (
    <div className="min-h-screen bg-gray-50 font-kanit pb-10">
        {/* Header Background */}
        <div className={`h-48 w-full bg-gradient-to-br ${medalStyle.gradient} relative overflow-hidden rounded-b-[40px] shadow-lg`}>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center text-white/90 z-10">
                <button onClick={() => navigate('/')} className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Public Report</span>
                    <span className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                        {resultData.stageLabel}
                    </span>
                </div>
            </div>
            
            {/* Big Score/Rank Display */}
            <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pb-8 text-white">
                <div className="text-5xl font-black drop-shadow-md tracking-tight mb-1">
                    {resultData.score > 0 ? resultData.score : '-'}
                </div>
                <div className="text-sm font-medium opacity-90 uppercase tracking-widest">คะแนนการแข่งขัน</div>
            </div>
        </div>

        {/* Main Card - Team Specific */}
        <div className="px-6 -mt-10 relative z-10 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-6 text-center border border-white/50 mb-8">
                
                <div className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full ${medalStyle.bg}/10 ${medalStyle.text} font-bold text-sm mb-4 border ${medalStyle.border}`}>
                    <Medal className="w-4 h-4 mr-1.5" /> {medalText}
                </div>

                <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">{team.teamName}</h1>
                
                <div className="flex items-center justify-center text-gray-500 text-sm mb-6">
                    <School className="w-4 h-4 mr-1.5" />
                    {school?.SchoolName || team.schoolId}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div className="text-xs text-gray-400 font-bold uppercase mb-1">ลำดับที่</div>
                        <div className="text-xl font-black text-gray-800">{resultData.rank || '-'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div className="text-xs text-gray-400 font-bold uppercase mb-1">กิจกรรม</div>
                        <div className="text-sm font-bold text-blue-600 truncate px-2">
                             {activity?.name || '-'}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>ข้อมูลผลการแข่งขันได้รับการยืนยันจากระบบแล้ว</span>
                </div>
            </div>

            {/* Leaderboard Section - Public Activity Overview */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <ListChecks className="w-5 h-5 mr-2 text-blue-600" />
                        ตารางอันดับคะแนน (Leaderboard)
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {leaderboard.length} TEAMS
                    </span>
                </div>

                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-center w-16">อันดับ</th>
                                    <th className="px-6 py-4">สถานศึกษา/ทีม</th>
                                    <th className="px-6 py-4 text-center w-24">คะแนน</th>
                                    <th className="px-6 py-4 text-center w-24">รางวัล</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leaderboard.map((item, idx) => {
                                    const isTarget = item.id === team.teamId;
                                    const mStyle = getMedalColor(item.medal);
                                    return (
                                        <tr key={item.id} className={`${isTarget ? 'bg-blue-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${item.rank === '1' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {item.rank || (idx + 1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 leading-tight">{item.school}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{item.name}</div>
                                                {isTarget && <span className="inline-block mt-1 text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-full">YOUR TEAM</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-black text-lg text-gray-800">{item.score > 0 ? item.score : '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center border ${mStyle.border} ${mStyle.bg} text-white shadow-sm`} title={item.medal}>
                                                    <Award className="w-5 h-5" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Public Info Footer */}
            <div className="mt-10 p-6 bg-blue-600 rounded-3xl text-white relative overflow-hidden shadow-xl">
                 <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="w-24 h-24" /></div>
                 <div className="relative z-10 flex flex-col items-center text-center">
                     <h4 className="font-bold text-lg mb-1">ติดตามผลการแข่งขันสดๆ ได้ที่นี่</h4>
                     <p className="text-blue-100 text-sm mb-6">ระบบรายงานผลอัตโนมัติ Real-time ตลอดการแข่งขัน</p>
                     <button 
                        onClick={() => navigate('/')}
                        className="bg-white text-blue-600 px-8 py-2.5 rounded-full font-bold text-sm shadow-lg hover:bg-blue-50 transition-all active:scale-95"
                     >
                         เข้าสู่หน้าหลักของระบบ
                     </button>
                 </div>
            </div>
        </div>

        {/* Technical Footer */}
        <div className="text-center mt-12 px-6">
            <p className="text-xs text-gray-400">ระบบบริหารจัดการการแข่งขันวิชาการ • Academic Competition Manager</p>
            <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest">© 2024 All Rights Reserved</p>
        </div>
    </div>
  );
};

export default PublicResultView;
