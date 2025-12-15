
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppData, Team } from '../types';
import { CheckCircle, XCircle, Award, School, LayoutGrid, Loader2, Trophy, ArrowLeft } from 'lucide-react';

interface VerifyCertificateProps {
  data: AppData;
}

const VerifyCertificate: React.FC<VerifyCertificateProps> = ({ data }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teamId = searchParams.get('id');
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data.teams.length > 0) {
      const found = data.teams.find(t => t.teamId === teamId);
      setTeam(found || null);
      setLoading(false);
    }
  }, [data.teams, teamId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!teamId || !team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-kanit">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-red-500">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบข้อมูลเกียรติบัตร</h1>
            <p className="text-gray-500 mb-6">รหัสอ้างอิงไม่ถูกต้อง หรือข้อมูลอาจถูกลบออกจากระบบ</p>
            <div className="bg-red-50 p-3 rounded-lg text-xs text-red-600 font-mono mb-6">
                Ref ID: {teamId || 'NULL'}
            </div>
            <button 
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors font-medium"
            >
                กลับสู่หน้าหลัก
            </button>
        </div>
      </div>
    );
  }

  const activity = data.activities.find(a => a.id === team.activityId);
  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
  
  // Parse Result
  let score = team.score;
  let rank = team.rank;
  let medal = team.medalOverride;
  let isArea = false;

  // Check if Area Stage info exists and prefer it if valid
  try {
      if (team.stageInfo) {
          const areaInfo = JSON.parse(team.stageInfo);
          if (areaInfo.score || areaInfo.rank) {
              score = areaInfo.score;
              rank = areaInfo.rank;
              medal = areaInfo.medal;
              isArea = true;
          }
      }
  } catch {}

  const getMedalColor = (m: string) => {
      const lower = (m || '').toLowerCase();
      if (lower.includes('gold')) return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      if (lower.includes('silver')) return 'text-gray-500 bg-gray-50 border-gray-200';
      if (lower.includes('bronze')) return 'text-orange-600 bg-orange-50 border-orange-200';
      return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const medalText = (m: string) => {
      if (m === 'Gold') return 'เหรียญทอง';
      if (m === 'Silver') return 'เหรียญเงิน';
      if (m === 'Bronze') return 'เหรียญทองแดง';
      return 'เข้าร่วมการแข่งขัน';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 font-kanit flex flex-col items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full border border-white/50 relative">
            {/* Header */}
            <div className="bg-green-600 p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-white p-2 rounded-full shadow-lg mb-3">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-xl font-bold text-white uppercase tracking-wide">เกียรติบัตรฉบับจริง</h1>
                    <p className="text-green-100 text-sm mt-1">Verified Certificate</p>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{team.teamName}</h2>
                    <div className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-sm">
                        <School className="w-4 h-4 mr-2" />
                        {school?.SchoolName || team.schoolId}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-400 uppercase font-bold mb-1">รายการแข่งขัน</div>
                        <div className="font-semibold text-gray-800">{activity?.name || team.activityId}</div>
                        <div className="text-sm text-gray-500 mt-1">{team.level}</div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 border-dashed flex items-center justify-between ${getMedalColor(medal)}`}>
                        <div>
                            <div className="text-xs uppercase font-bold opacity-70 mb-1">ผลการแข่งขัน</div>
                            <div className="font-bold text-lg flex items-center">
                                <Award className="w-5 h-5 mr-2" />
                                {medalText(medal)}
                            </div>
                        </div>
                        {rank && (
                            <div className="text-right">
                                <div className="text-xs uppercase font-bold opacity-70 mb-1">ลำดับที่</div>
                                <div className="font-black text-2xl">{rank}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="border-t border-gray-100 pt-6">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                            <span className="block text-gray-400 mb-1">Ref ID</span>
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{team.teamId}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-gray-400 mb-1">ระดับ</span>
                            <span className="flex items-center justify-end font-medium">
                                {isArea ? <Trophy className="w-3 h-3 mr-1 text-purple-500" /> : <LayoutGrid className="w-3 h-3 mr-1 text-blue-500" />}
                                {isArea ? 'เขตพื้นที่' : 'กลุ่มเครือข่าย'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-center">
                <button 
                    onClick={() => navigate('/')}
                    className="text-gray-500 hover:text-blue-600 flex items-center text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> ตรวจสอบรายการอื่น
                </button>
            </div>
        </div>
    </div>
  );
};

export default VerifyCertificate;
