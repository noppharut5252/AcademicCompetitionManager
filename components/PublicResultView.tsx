
import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppData, Team } from '../types';
import { Trophy, Medal, School, ArrowLeft, Share2, Activity, Calendar, MapPin, Loader2, Award, CheckCircle } from 'lucide-react';
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
        <p className="text-gray-500 font-kanit">กำลังโหลดผลคะแนน...</p>
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
                <span className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    {resultData.stageLabel}
                </span>
            </div>
            
            {/* Big Score/Rank Display */}
            <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pb-8 text-white">
                <div className="text-5xl font-black drop-shadow-md tracking-tight mb-1">
                    {resultData.score > 0 ? resultData.score : '-'}
                </div>
                <div className="text-sm font-medium opacity-90 uppercase tracking-widest">คะแนนรวม</div>
            </div>
        </div>

        {/* Main Card */}
        <div className="px-6 -mt-10 relative z-10">
            <div className="bg-white rounded-3xl shadow-xl p-6 text-center border border-white/50">
                
                {/* Medal Badge */}
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
                        <div className="text-xs text-gray-400 font-bold uppercase mb-1">สถานะ</div>
                        <div className="text-sm font-bold text-green-600 flex items-center justify-center h-[28px]">
                            <CheckCircle className="w-4 h-4 mr-1" /> ยืนยันแล้ว
                        </div>
                    </div>
                </div>

                <div className="text-left space-y-3">
                    <div className="flex items-start p-3 bg-blue-50/50 rounded-xl">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3 text-blue-600"><Activity className="w-5 h-5"/></div>
                        <div>
                            <div className="text-[10px] text-blue-400 font-bold uppercase">รายการแข่งขัน</div>
                            <div className="text-sm font-bold text-gray-800">{activity?.name || team.activityId}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{activity?.category}</div>
                        </div>
                    </div>
                    
                    {/* Only show schedule if available in venue data */}
                    {(() => {
                        let scheduleText = null;
                        for(const v of data.venues) {
                            const sch = v.scheduledActivities?.find(s => s.activityId === team.activityId);
                            if(sch) {
                                scheduleText = (
                                    <div className="flex items-start p-3 bg-orange-50/50 rounded-xl">
                                        <div className="bg-orange-100 p-2 rounded-lg mr-3 text-orange-600"><Calendar className="w-5 h-5"/></div>
                                        <div>
                                            <div className="text-[10px] text-orange-400 font-bold uppercase">วันและเวลา</div>
                                            <div className="text-sm font-bold text-gray-800">{sch.date}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{sch.timeRange} @ {v.name} {sch.room}</div>
                                        </div>
                                    </div>
                                );
                                break;
                            }
                        }
                        return scheduleText;
                    })()}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 px-6">
            <p className="text-xs text-gray-400">ระบบประกาศผลการแข่งขันวิชาการ</p>
            <p className="text-[10px] text-gray-300 mt-1">Ref ID: {team.teamId}</p>
        </div>
    </div>
  );
};

export default PublicResultView;
