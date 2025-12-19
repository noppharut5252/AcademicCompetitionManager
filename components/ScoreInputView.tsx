
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, User, Team, AreaStageInfo } from '../types';
import { updateTeamResult, updateAreaResult } from '../services/api';
import { Save, ChevronLeft, LayoutGrid, Trophy, Search, CheckCircle, AlertCircle, Loader2, Wand2, Calculator, Info } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ScoreInputViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

const calculateMedal = (scoreStr: string, manualMedal: string): string => {
    const score = parseFloat(scoreStr);
    if (score === -1) return 'ไม่เข้าร่วมแข่งขัน';
    if (manualMedal && manualMedal !== '' && manualMedal !== '- Auto -') return manualMedal;
    if (isNaN(score)) return '';
    if (score >= 80) return 'Gold';
    if (score >= 70) return 'Silver';
    if (score >= 60) return 'Bronze';
    return 'Participant';
};

const getAreaInfo = (team: Team): AreaStageInfo | null => {
    try {
        return JSON.parse(team.stageInfo);
    } catch {
        return null;
    }
};

const ScoreInputView: React.FC<ScoreInputViewProps> = ({ data, user, onDataUpdate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId');

  // Role & Scope Logic
  const role = user?.level?.toLowerCase();
  const isAdminOrArea = role === 'admin' || role === 'area';
  const isGroupAdmin = role === 'group_admin';
  
  // Default scope based on role, but allow toggle
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>(isAdminOrArea ? 'area' : 'cluster');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string, type: 'success'|'error', show: boolean }>({ msg: '', type: 'success', show: false });

  // Refs for keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activity = useMemo(() => 
    data.activities.find(a => a.id === activityId), 
  [data.activities, activityId]);

  const teams = useMemo(() => {
      if (!activityId) return [];
      let list = data.teams.filter(t => t.activityId === activityId);

      // Area view filtering
      if (viewScope === 'area') {
          list = list.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }

      // Group Admin filtering
      if (isGroupAdmin && viewScope === 'cluster') {
          const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
          if (userSchool) {
              list = list.filter(t => {
                  const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                  return school?.SchoolCluster === userSchool.SchoolCluster;
              });
          }
      }

      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          list = list.filter(t => t.teamName.toLowerCase().includes(lower) || t.schoolId.toLowerCase().includes(lower));
      }

      // Sort by Score Desc
      return list.sort((a, b) => {
          const scoreA = viewScope === 'area' ? (getAreaInfo(a)?.score || 0) : a.score;
          const scoreB = viewScope === 'area' ? (getAreaInfo(b)?.score || 0) : b.score;
          return scoreB - scoreA;
      });
  }, [data.teams, activityId, viewScope, isGroupAdmin, user, searchTerm, data.schools]);

  // Redirect if no activity found or no permission
  useEffect(() => {
      if (!activity) {
          // Allow a brief moment for data load
          if (data.activities.length > 0) {
             // navigate('/dashboard');
          }
      }
  }, [activity, data.activities]);

  const handleInputChange = (teamId: string, field: 'score' | 'rank' | 'medal' | 'flag', value: string) => {
      setEdits(prev => {
          const team = data.teams.find(t => t.teamId === teamId);
          if (!team) return prev;

          let baseScore = '';
          let baseRank = '';
          let baseMedal = '';
          let baseFlag = '';

          if (viewScope === 'area') {
              const info = getAreaInfo(team);
              baseScore = String(info?.score && (info.score > 0 || info.score === -1) ? info.score : '');
              baseRank = String(info?.rank || '');
              baseMedal = String(info?.medal || '');
          } else {
              baseScore = String((team.score > 0 || team.score === -1) ? team.score : '');
              baseRank = String(team.rank || '');
              baseMedal = String(team.medalOverride || '');
              baseFlag = String(team.flag || '');
          }

          const currentEdit = prev[teamId];
          const baseState = {
              score: currentEdit?.score ?? baseScore,
              rank: currentEdit?.rank ?? baseRank,
              medal: currentEdit?.medal ?? baseMedal,
              flag: currentEdit?.flag ?? baseFlag,
          };

          return { ...prev, [teamId]: { ...baseState, [field]: value, isDirty: true } };
      });
  };

  const handleSave = async (teamId: string) => {
      const edit = edits[teamId];
      if (!edit) return;

      const scoreVal = parseFloat(edit.score);
      if (!isNaN(scoreVal) && scoreVal !== -1 && (scoreVal < 0 || scoreVal > 100)) {
          alert('คะแนนต้องอยู่ระหว่าง 0-100');
          return;
      }

      setSavingId(teamId);
      
      let success = false;
      const finalScore = scoreVal;
      const finalRank = edit.rank;
      const finalMedal = edit.medal;

      if (viewScope === 'area') {
          const res = await updateAreaResult(teamId, finalScore, finalRank, finalMedal);
          success = res;
      } else {
          const finalFlag = edit.flag;
          // Auto Promote Logic
          const shouldPromote = String(finalRank) === '1' && String(finalFlag).toUpperCase() === 'TRUE';
          const stage = shouldPromote ? 'Area' : '';
          const res = await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag, stage);
          success = res;
      }

      if (success) {
          onDataUpdate();
          setEdits(prev => {
              const newState = { ...prev };
              delete newState[teamId];
              return newState;
          });
          setToast({ msg: 'บันทึกสำเร็จ', type: 'success', show: true });
          setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
      } else {
          alert('บันทึกไม่สำเร็จ กรุณาลองใหม่');
      }
      setSavingId(null);
  };

  const handleAutoRank = () => {
      if (!confirm('ต้องการคำนวณลำดับคะแนนอัตโนมัติหรือไม่? (ระบบจะเรียงตามคะแนนมากไปน้อย)')) return;
      
      const teamsWithScores = teams.map(t => {
          const edit = edits[t.teamId];
          let score = 0;
          if (edit?.score) score = parseFloat(edit.score);
          else if (viewScope === 'area') score = (getAreaInfo(t)?.score || 0);
          else score = t.score;
          return { ...t, sortScore: isNaN(score) ? 0 : score };
      });

      teamsWithScores.sort((a, b) => b.sortScore - a.sortScore);

      const newEdits: typeof edits = {};
      let currentRank = 1;

      teamsWithScores.forEach((t, i) => {
          if (i > 0 && t.sortScore < teamsWithScores[i-1].sortScore) currentRank = i + 1;
          
          if (t.sortScore > 0) {
              const rankStr = String(currentRank);
              const prevEdit = edits[t.teamId];
              // Check if change needed
              let currentSavedRank = viewScope === 'area' ? (getAreaInfo(t)?.rank || '') : t.rank;
              
              if (prevEdit?.rank !== rankStr && currentSavedRank !== rankStr) {
                  let baseScore = viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score;
                  let baseMedal = viewScope === 'area' ? (getAreaInfo(t)?.medal || '') : t.medalOverride;
                  let baseFlag = String(t.flag || '');

                  newEdits[t.teamId] = {
                      score: prevEdit?.score ?? String(baseScore > 0 || baseScore === -1 ? baseScore : ''),
                      rank: rankStr,
                      medal: prevEdit?.medal ?? String(baseMedal || ''),
                      flag: prevEdit?.flag ?? baseFlag,
                      isDirty: true
                  };
              }
          }
      });
      setEdits(prev => ({ ...prev, ...newEdits }));
  };

  if (!user) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-800">กรุณาเข้าสู่ระบบ</h2>
              <p className="text-gray-500 mb-6">คุณต้องเข้าสู่ระบบเพื่อบันทึกคะแนน</p>
              <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">กลับหน้าหลัก</button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-kanit animate-in fade-in duration-500">
        
        {/* Toast */}
        {toast.show && (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full shadow-lg text-white text-sm font-bold flex items-center ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {toast.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2"/> : <AlertCircle className="w-4 h-4 mr-2"/>}
                {toast.msg}
            </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Score Input</div>
                    <div className="text-sm font-bold text-gray-800 line-clamp-1 max-w-[200px]">{activity?.name || 'Loading...'}</div>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>
            
            {/* Scope Toggle */}
            <div className="px-4 pb-3">
                <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button 
                        onClick={() => setViewScope('cluster')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${viewScope === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <LayoutGrid className="w-3 h-3 mr-1.5" /> ระดับกลุ่มฯ
                    </button>
                    <button 
                        onClick={() => setViewScope('area')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${viewScope === 'area' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <Trophy className="w-3 h-3 mr-1.5" /> ระดับเขตฯ
                    </button>
                </div>
            </div>
        </div>

        {/* Info Bar */}
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center text-xs text-blue-800">
            <div className="flex items-center">
                <Info className="w-3 h-3 mr-1.5" /> 
                <span>{teams.length} ทีมที่ต้องบันทึก</span>
            </div>
            <button onClick={handleAutoRank} className="flex items-center bg-white border border-blue-200 px-2 py-1 rounded shadow-sm hover:bg-blue-50">
                <Wand2 className="w-3 h-3 mr-1" /> Auto Rank
            </button>
        </div>

        {/* Search */}
        <div className="p-4">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ค้นหาชื่อทีม หรือ โรงเรียน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Teams List */}
        <div className="px-4 space-y-3 pb-10">
            {teams.map((team, idx) => {
                const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                const edit = edits[team.teamId];
                
                let currentScore = 0;
                let currentRank = "";
                let currentMedal = "";
                let currentFlag = "";

                if (viewScope === 'area') {
                    const info = getAreaInfo(team);
                    currentScore = info?.score || 0;
                    currentRank = info?.rank || "";
                    currentMedal = info?.medal || "";
                } else {
                    currentScore = team.score;
                    currentRank = team.rank;
                    currentMedal = team.medalOverride;
                    currentFlag = team.flag;
                }

                const displayScore = edit?.score ?? (currentScore !== 0 ? String(currentScore) : '');
                const displayRank = edit?.rank ?? currentRank ?? '';
                const displayMedal = edit?.medal ?? currentMedal ?? '';
                const displayFlag = edit?.flag ?? currentFlag ?? '';
                const isDirty = edit?.isDirty;
                const isSaving = savingId === team.teamId;

                const calculatedMedal = calculateMedal(displayScore, displayMedal);
                const scoreNum = parseFloat(displayScore);
                const isAbsent = scoreNum === -1;

                return (
                    <div key={team.teamId} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isDirty ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                        {/* Team Header */}
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-start">
                            <div className="min-w-0">
                                <div className="font-bold text-gray-900 line-clamp-1">{team.teamName}</div>
                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{school?.SchoolName}</div>
                            </div>
                            <div className="text-xs font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border ml-2">#{idx + 1}</div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 grid grid-cols-12 gap-3">
                            {/* Score Input (Big) */}
                            <div className="col-span-5">
                                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">คะแนน (Score)</label>
                                <input 
                                    ref={(el) => { inputRefs.current[team.teamId] = el; }}
                                    type="number" 
                                    inputMode="decimal"
                                    className={`w-full text-center text-xl font-bold py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${isAbsent ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900 border-gray-300'}`}
                                    value={displayScore}
                                    placeholder="0"
                                    onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                />
                                <div className="text-[9px] text-gray-400 text-center mt-1">-1 = ไม่มาแข่ง</div>
                            </div>

                            {/* Details (Right Side) */}
                            <div className="col-span-7 grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">รางวัล (Award)</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full text-xs font-medium py-2 pl-2 pr-6 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            value={displayMedal}
                                            onChange={(e) => handleInputChange(team.teamId, 'medal', e.target.value)}
                                            disabled={isAbsent}
                                        >
                                            <option value="">Auto: {calculatedMedal || '-'}</option>
                                            <option value="Gold">Gold</option>
                                            <option value="Silver">Silver</option>
                                            <option value="Bronze">Bronze</option>
                                            <option value="Participant">Participant</option>
                                        </select>
                                        <div className="absolute right-2 top-2.5 pointer-events-none text-gray-400">▼</div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">ลำดับ</label>
                                    <input 
                                        type="number"
                                        className="w-full text-center text-sm font-bold py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={displayRank}
                                        onChange={(e) => handleInputChange(team.teamId, 'rank', e.target.value)}
                                        placeholder="-"
                                        disabled={isAbsent}
                                    />
                                </div>

                                {viewScope === 'cluster' && (
                                    <div className="flex flex-col items-center">
                                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">ตัวแทน (Q)</label>
                                        <input 
                                            type="checkbox"
                                            className="w-9 h-9 accent-green-600 cursor-pointer"
                                            checked={String(displayFlag).toUpperCase() === 'TRUE'}
                                            onChange={(e) => handleInputChange(team.teamId, 'flag', e.target.checked ? 'TRUE' : '')}
                                            disabled={isAbsent}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save Button (Conditional) */}
                        {isDirty && (
                            <button 
                                onClick={() => handleSave(team.teamId)}
                                disabled={isSaving}
                                className="w-full bg-blue-600 text-white font-bold text-sm py-3 flex items-center justify-center active:bg-blue-700 transition-colors"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                บันทึกการเปลี่ยนแปลง
                            </button>
                        )}
                        {!isDirty && (currentScore > 0 || currentScore === -1) && (
                            <div className="w-full bg-green-50 text-green-700 font-bold text-xs py-2 flex items-center justify-center border-t border-green-100">
                                <CheckCircle className="w-3 h-3 mr-1.5" /> บันทึกแล้ว
                            </div>
                        )}
                    </div>
                );
            })}
            
            {teams.length === 0 && (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <Calculator className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>ไม่พบทีมในรายการนี้</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default ScoreInputView;
