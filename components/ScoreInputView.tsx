
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, User, Team, AreaStageInfo } from '../types';
import { updateTeamResult, updateAreaResult } from '../services/api';
import { shareScoreResult, shareTop3Result } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Trophy, Search, ChevronRight, ChevronLeft, Share2, AlertTriangle, Calculator, X, Copy, PieChart, Check, ChevronDown, Flag, History, Loader2, ListChecks, Edit2, Crown, LayoutGrid, AlertOctagon, Wand2, Eye, EyeOff, ArrowDownWideNarrow, GraduationCap, Printer, School, FileBadge, UserX, ClipboardCheck, BarChart3, ClipboardList, Info } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';

// --- Types & Interfaces ---

interface ScoreInputViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

interface BatchItem {
    id: string;
    teamName: string;
    score: string;
    rank: string;
    medal: string;
    flag: string;
    isModified: boolean;
}

interface ConfirmModalProps {
    isOpen: boolean;
    type: 'single' | 'batch';
    count?: number;
    totalCount?: number;
    teamName?: string;
    newScore?: string;
    newRank?: string;
    newMedal?: string;
    newFlag?: string;
    batchItems?: BatchItem[];
    onConfirm: () => void;
    onCancel: () => void;
    viewScope?: 'cluster' | 'area';
}

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
    onClose: () => void;
}

interface RecentLog {
    id: string;
    teamName: string;
    schoolName: string; 
    activityName: string;
    score: string;
    time: string;
}

// --- Helper Functions ---

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

const parseLevels = (levelStr: string) => {
    try {
        const parsed = JSON.parse(levelStr);
        return Array.isArray(parsed) ? parsed.join(', ') : levelStr;
    } catch {
        return levelStr;
    }
};

const getAreaInfo = (team: Team): AreaStageInfo | null => {
    try {
        return JSON.parse(team.stageInfo);
    } catch {
        return null;
    }
};

// --- Sub-Components ---

const LoadingOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    if (!isVisible) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <div className="text-gray-800 font-medium">กำลังบันทึกข้อมูล...</div>
                <div className="text-xs text-gray-500">กรุณาอย่าปิดหน้าต่าง</div>
            </div>
        </div>
    );
};

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const bgClass = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    const icon = type === 'success' ? <CheckCircle className="w-5 h-5" /> : type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Trophy className="w-5 h-5" />;

    return (
        <div className={`fixed top-4 right-4 z-[100] flex items-center p-4 mb-4 text-white rounded-lg shadow-lg ${bgClass} animate-in slide-in-from-top-5 duration-300`}>
            <div className="mr-3">{icon}</div>
            <div className="text-sm font-medium">{message}</div>
            <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const ConfirmModal: React.FC<ConfirmModalProps> = (props) => {
    if (!props.isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className={`bg-white rounded-xl shadow-xl w-full p-6 space-y-4 flex flex-col max-h-[90vh] ${props.type === 'batch' ? 'max-w-4xl' : 'max-w-sm'}`}>
                <div className="flex items-center text-amber-500 mb-2 shrink-0">
                    <AlertTriangle className="w-6 h-6 mr-2" />
                    <h3 className="text-lg font-bold text-gray-800">ยืนยันการบันทึก ({props.viewScope === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})</h3>
                </div>
                
                {props.type === 'single' ? (
                    <div className="overflow-y-auto">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 text-center">
                            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">TEAM</p>
                            <h2 className="text-xl font-black text-gray-900 leading-tight">{props.teamName}</h2>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm mt-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500">คะแนน:</span>
                                <span className="font-bold text-blue-600 text-lg">{props.newScore === '-1' ? '-1 (ไม่เข้าร่วม)' : props.newScore}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">เหรียญรางวัล:</span>
                                <span className="font-medium text-gray-900">{props.newMedal || calculateMedal(props.newScore || '0', '')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">ลำดับที่:</span>
                                <span className="font-medium text-gray-900">{props.newRank || '-'}</span>
                            </div>
                            {props.viewScope === 'cluster' && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ตัวแทน (Q):</span>
                                    <span className={`font-medium ${props.newFlag === 'TRUE' ? 'text-green-600' : 'text-gray-400'}`}>
                                        {props.newFlag === 'TRUE' ? 'ใช่' : 'ไม่ใช่'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                         <div className="flex items-center justify-between mb-2 shrink-0">
                            <div>
                                <span className="text-gray-800 font-bold text-lg">รายการทั้งหมด</span>
                                <p className="text-xs text-gray-500">ตรวจสอบความถูกต้องก่อนบันทึก (ไฮไลต์สีฟ้าคือรายการที่มีการแก้ไข)</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">{props.count} <span className="text-sm font-normal text-gray-500">แก้ไข</span></div>
                                <div className="text-xs text-gray-400">จากทั้งหมด {props.totalCount} ทีม</div>
                            </div>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                             <table className="min-w-full divide-y divide-gray-200 text-sm relative">
                                 <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                                     <tr>
                                         <th className="px-3 py-2 text-left font-medium text-gray-500 bg-gray-50">ทีม</th>
                                         <th className="px-3 py-2 text-center font-medium text-gray-500 bg-gray-50 w-24">คะแนน</th>
                                         <th className="px-3 py-2 text-center font-medium text-gray-500 bg-gray-50 w-24">Rank</th>
                                         <th className="px-3 py-2 text-center font-medium text-gray-500 bg-gray-50 w-32">Medal</th>
                                         {props.viewScope === 'cluster' && <th className="px-3 py-2 text-center font-medium text-gray-500 bg-gray-50 w-20">Q</th>}
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-200 bg-white">
                                     {props.batchItems?.map((item) => {
                                         const displayMedal = calculateMedal(item.score, item.medal);
                                         return (
                                             <tr key={item.id} className={item.isModified ? 'bg-blue-50/70' : ''}>
                                                 <td className="px-3 py-2 text-gray-900">
                                                     <div className="font-medium truncate max-w-[200px]" title={item.teamName}>{item.teamName}</div>
                                                     {item.isModified && <span className="text-[10px] text-blue-600 flex items-center"><Edit2 className="w-3 h-3 mr-0.5"/> Modified</span>}
                                                 </td>
                                                 <td className="px-3 py-2 text-center">
                                                     <span className={`font-bold ${item.isModified ? 'text-blue-700' : 'text-gray-700'}`}>{item.score === '-1' ? '-1' : (item.score || '-')}</span>
                                                 </td>
                                                 <td className="px-3 py-2 text-center text-gray-600">{item.rank || '-'}</td>
                                                 <td className="px-3 py-2 text-center text-gray-600 text-[10px]">{displayMedal}</td>
                                                 {props.viewScope === 'cluster' && (
                                                     <td className="px-3 py-2 text-center">
                                                        {String(item.flag).toUpperCase() === 'TRUE' ? (
                                                            <div className="flex justify-center"><Check className="w-4 h-4 text-green-600" /></div>
                                                        ) : <span className="text-gray-300">-</span>}
                                                     </td>
                                                 )}
                                             </tr>
                                         );
                                     })}
                                 </tbody>
                             </table>
                         </div>
                    </div>
                )}

                <div className="flex gap-3 pt-2 shrink-0">
                    <button onClick={props.onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                    <button onClick={props.onConfirm} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">ยืนยันบันทึก</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const ScoreInputView: React.FC<ScoreInputViewProps> = ({ data, user, onDataUpdate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId');

  // Role & Scope Logic
  const role = user?.level?.toLowerCase();
  const isAdminOrArea = role === 'admin' || role === 'area';
  const isGroupAdmin = role === 'group_admin';
  const canScoreArea = ['admin', 'area', 'score'].includes(role || '');
  
  // Default scope based on role, but allow toggle
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>(isAdminOrArea ? 'area' : 'cluster');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [toast, setToast] = useState<{ message: string, type: 'success'|'error'|'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'single' | 'batch', teamId: string | null }>({ isOpen: false, type: 'single', teamId: null });

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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

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

  const initiateSave = (teamId: string) => {
      const edit = edits[teamId];
      if(edit) {
        const score = parseFloat(edit.score);
        if(!isNaN(score) && score !== -1 && (score < 0 || score > 100)) {
            showToast('คะแนนต้องอยู่ระหว่าง 0 - 100 หรือ -1 เท่านั้น', 'error');
            return;
        }
      }
      setConfirmState({ isOpen: true, type: 'single', teamId });
  };

  const initiateBatchSave = () => {
      setConfirmState({ isOpen: true, type: 'batch', teamId: null });
  };

  const performUpdate = async (teamId: string, edit: any) => {
        const finalScore = parseFloat(edit.score);
        const finalRank = edit.rank === 'undefined' ? '' : edit.rank;
        const finalMedal = edit.medal === 'undefined' ? '' : edit.medal;
        
        if (viewScope === 'area') {
            return await updateAreaResult(teamId, finalScore, finalRank, finalMedal);
        } else {
            const finalFlag = edit.flag === 'undefined' ? '' : edit.flag;
            // Auto Promote Logic
            const shouldPromote = String(finalRank) === '1' && String(finalFlag).toUpperCase() === 'TRUE';
            const stage = shouldPromote ? 'Area' : '';
            
            return await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag, stage);
        }
  };

  const handleConfirmSave = async () => {
      if (confirmState.type === 'single') {
        const teamId = confirmState.teamId;
        if (!teamId) return;
        setConfirmState({ isOpen: false, type: 'single', teamId: null });
        
        const edit = edits[teamId];
        if (!edit || !edit.isDirty) return;

        setIsLoading(true);
        const success = await performUpdate(teamId, edit);
        setIsLoading(false);

        if (success) {
            onDataUpdate(); 
            setEdits(prev => {
                const { [teamId]: _, ...rest } = prev;
                return rest;
            });
            showToast('บันทึกสำเร็จ', 'success');
        } else {
            showToast('บันทึกไม่สำเร็จ', 'error');
        }

      } else {
        setConfirmState({ isOpen: false, type: 'batch', teamId: null });
        setIsLoading(true);

        const dirtyIds = Object.keys(edits).filter(id => edits[id].isDirty && teams.some(t => t.teamId === id));
        let successCount = 0;

        for (const id of dirtyIds) {
            const edit = edits[id];
            const result = await performUpdate(id, edit);
            if (result) successCount++;
        }

        setIsLoading(false);
        onDataUpdate(); 
        
        setEdits(prev => {
             const newEdits = { ...prev };
             dirtyIds.forEach(id => delete newEdits[id]);
             return newEdits;
        });

        if (successCount === dirtyIds.length) {
            showToast(`บันทึก ${successCount} รายการเรียบร้อยแล้ว`, 'success');
        } else {
             showToast(`บันทึกสำเร็จ ${successCount} จาก ${dirtyIds.length} รายการ`, 'info');
        }
      }
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
      showToast('คำนวณลำดับแล้ว', 'info');
  };

  // --- Share Handlers ---
  const handleShare = async (team: Team) => {
      const activityName = activity?.name || '';
      const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const schoolName = school?.SchoolName || team.schoolId;

      let score = 0;
      let medal = '';
      let rank = '';
      if (viewScope === 'area') {
          const info = getAreaInfo(team);
          score = info?.score || 0;
          medal = info?.medal || calculateMedal(String(score), '');
          rank = info?.rank || '';
      } else {
          score = team.score;
          medal = team.medalOverride || calculateMedal(String(score), '');
          rank = team.rank;
      }

      try {
          const result = await shareScoreResult(team.teamName, schoolName, activityName, score, medal, rank, team.teamId);
          if (result.success && result.method === 'copy') {
              showToast('คัดลอกผลคะแนนแล้ว', 'success');
          }
      } catch (err) {
          showToast('ไม่สามารถแชร์ได้', 'error');
      }
  };

  const handleShareTop3 = async () => {
    if (!activity) return;
    
    const winners = teams
        .map(t => {
            let score = 0;
            let rank = '';
            let medal = '';
            if (viewScope === 'area') {
                const info = getAreaInfo(t);
                score = info?.score || 0;
                rank = info?.rank || '';
                medal = info?.medal || calculateMedal(String(score), '');
            } else {
                score = t.score;
                rank = t.rank;
                medal = t.medalOverride || calculateMedal(String(score), '');
            }
            return {
                rank: parseInt(rank) || 0,
                teamName: t.teamName,
                schoolName: data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId,
                score: String(score),
                medal: medal
            };
        })
        .filter(w => w.rank >= 1 && w.rank <= 3)
        .sort((a, b) => a.rank - b.rank);

    if (winners.length === 0) {
        showToast('ยังไม่มีข้อมูลลำดับที่ 1-3', 'error');
        return;
    }

    try {
        const result = await shareTop3Result(activity.name, winners);
        if (result.success && result.method === 'copy') {
            showToast('คัดลอกสรุปผลรางวัลแล้ว', 'success');
        }
    } catch (e) {
        showToast('ไม่สามารถแชร์ได้', 'error');
    }
  };

  const dirtyCount = teams.filter(t => edits[t.teamId]?.isDirty).length;

  // Prepare batch confirmation data
  const batchConfirmData = useMemo<BatchItem[]>(() => {
    return teams.map(t => {
        const edit = edits[t.teamId];
        let currentScore = 0;
        let currentRank = "";
        let currentMedal = "";
        let currentFlag = "";

        if (viewScope === 'area') {
            const info = getAreaInfo(t);
            currentScore = info?.score || 0;
            currentRank = info?.rank || "";
            currentMedal = info?.medal || "";
        } else {
            currentScore = t.score;
            currentRank = t.rank;
            currentMedal = t.medalOverride;
            currentFlag = t.flag;
        }

        return {
            id: t.teamId,
            teamName: t.teamName,
            score: edit?.score ?? (currentScore !== 0 ? String(currentScore) : ''),
            rank: edit?.rank ?? currentRank ?? '',
            medal: edit?.medal ?? currentMedal ?? '',
            flag: edit?.flag ?? currentFlag ?? '',
            isModified: edit?.isDirty ?? false
        };
    });
  }, [teams, edits, viewScope]);

  const singleConfirmData = useMemo(() => {
      if (confirmState.type !== 'single' || !confirmState.teamId) return null;
      const team = teams.find(t => t.teamId === confirmState.teamId);
      if (!team) return null;
      const edit = edits[team.teamId];
      return {
          teamName: team.teamName,
          newScore: edit?.score,
          newRank: edit?.rank,
          newMedal: edit?.medal,
          newFlag: edit?.flag
      };
  }, [confirmState, teams, edits]);

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

  const disabledInput = viewScope === 'area' && !canScoreArea;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-kanit animate-in fade-in duration-500 relative">
        <LoadingOverlay isVisible={isLoading} />
        <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({...prev, isVisible: false}))} />

        {/* Confirmation Modal */}
        <ConfirmModal 
            isOpen={confirmState.isOpen}
            type={confirmState.type}
            count={dirtyCount}
            totalCount={teams.length}
            teamName={singleConfirmData?.teamName}
            newScore={singleConfirmData?.newScore}
            newRank={singleConfirmData?.newRank}
            newMedal={singleConfirmData?.newMedal}
            newFlag={singleConfirmData?.newFlag}
            batchItems={batchConfirmData}
            viewScope={viewScope}
            onConfirm={handleConfirmSave}
            onCancel={() => setConfirmState({ isOpen: false, type: 'single', teamId: null })}
        />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between">
                <button onClick={() => navigate('/score')} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center flex-1 mx-2">
                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Score Input</div>
                    <div className="text-sm font-bold text-gray-800 line-clamp-1">{activity?.name || 'Loading...'}</div>
                </div>
                {dirtyCount > 0 && (
                    <button 
                        onClick={initiateBatchSave}
                        className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center shadow-md animate-pulse"
                    >
                        <ListChecks className="w-4 h-4 mr-1" /> Save All ({dirtyCount})
                    </button>
                )}
            </div>
            
            {/* Scope Toggle & Tools */}
            <div className="px-4 pb-3 flex justify-between items-center gap-2">
                <div className="bg-gray-100 p-1 rounded-xl flex flex-1">
                    <button 
                        onClick={() => setViewScope('cluster')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${viewScope === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <LayoutGrid className="w-3 h-3 mr-1.5" /> กลุ่มฯ
                    </button>
                    <button 
                        onClick={() => setViewScope('area')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${viewScope === 'area' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <Trophy className="w-3 h-3 mr-1.5" /> เขตฯ
                    </button>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleAutoRank} className="bg-white border border-purple-200 text-purple-600 p-2 rounded-lg shadow-sm" title="Auto Rank">
                        <Wand2 className="w-4 h-4" />
                    </button>
                    <button onClick={handleShareTop3} className="bg-white border border-green-200 text-green-600 p-2 rounded-lg shadow-sm" title="Share Top 3">
                        <Share2 className="w-4 h-4" />
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

        {/* Teams List Cards */}
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
                const isSaving = false;

                const calculatedMedal = calculateMedal(displayScore, displayMedal);
                const scoreNum = parseFloat(displayScore);
                const isAbsent = scoreNum === -1;

                return (
                    <div key={team.teamId} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isDirty ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                        {/* Header */}
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-start">
                            <div className="min-w-0">
                                <div className="font-bold text-gray-900 line-clamp-1">{team.teamName}</div>
                                <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{school?.SchoolName}</div>
                            </div>
                            <div className="text-xs font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border ml-2">#{idx + 1}</div>
                        </div>

                        {/* Input Body */}
                        <div className="p-4">
                            {/* Score Row - Big & Centered */}
                            <div className="mb-4 text-center">
                                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">คะแนน (Score)</label>
                                <input 
                                    ref={(el) => { inputRefs.current[team.teamId] = el; }}
                                    type="number" 
                                    inputMode="decimal"
                                    step="0.01"
                                    className={`w-full text-center text-3xl font-black py-2 rounded-xl border-2 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all ${isAbsent ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900 border-gray-200'} ${isDirty ? 'border-blue-300 bg-blue-50/30' : ''} ${disabledInput ? 'cursor-not-allowed bg-gray-50' : ''}`}
                                    value={displayScore}
                                    placeholder="0"
                                    onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                    disabled={disabledInput}
                                />
                                <div className="text-[9px] text-gray-400 mt-1">-1 = ไม่มาแข่ง</div>
                            </div>

                            {/* Secondary Inputs - Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <div>
                                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">รางวัล (Medal)</label>
                                    <div className="relative">
                                        <select 
                                            className={`w-full text-xs font-medium py-2 pl-2 pr-6 rounded-lg border bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${isAbsent ? 'text-gray-400 bg-gray-50' : 'text-gray-700 border-gray-300'} ${disabledInput ? 'cursor-not-allowed bg-gray-50' : ''}`}
                                            value={displayMedal}
                                            onChange={(e) => handleInputChange(team.teamId, 'medal', e.target.value)}
                                            disabled={isAbsent || disabledInput}
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
                                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">ลำดับ (Rank)</label>
                                    <input 
                                        type="number"
                                        className={`w-full text-center text-sm font-bold py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none ${isAbsent ? 'bg-gray-100' : 'bg-white border-gray-300'} ${disabledInput ? 'cursor-not-allowed bg-gray-50' : ''}`}
                                        value={displayRank}
                                        onChange={(e) => handleInputChange(team.teamId, 'rank', e.target.value)}
                                        placeholder="-"
                                        disabled={isAbsent || disabledInput}
                                    />
                                </div>
                            </div>

                            {/* Extra Toggles (Cluster only) */}
                            {viewScope === 'cluster' && (
                                <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-100">
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            className="w-5 h-5 accent-green-600 cursor-pointer mr-2"
                                            checked={String(displayFlag).toUpperCase() === 'TRUE'}
                                            onChange={(e) => handleInputChange(team.teamId, 'flag', e.target.checked ? 'TRUE' : '')}
                                            disabled={isAbsent || disabledInput}
                                        />
                                        <span className="text-xs font-bold text-gray-600">ตัวแทน (Representative)</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Actions Footer */}
                        <div className="bg-gray-50 p-2 flex gap-2">
                            {isDirty && !disabledInput ? (
                                <button 
                                    onClick={() => initiateSave(team.teamId)}
                                    disabled={isSaving}
                                    className="flex-1 bg-blue-600 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center active:bg-blue-700 transition-colors shadow-sm"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    บันทึก
                                </button>
                            ) : (
                                (currentScore > 0 || currentScore === -1) && (
                                    <div className="flex-1 flex gap-2">
                                        <div className="flex-1 bg-green-50 text-green-700 font-bold text-xs py-2 rounded-lg flex items-center justify-center border border-green-200">
                                            <CheckCircle className="w-3 h-3 mr-1.5" /> บันทึกแล้ว
                                        </div>
                                        <button 
                                            onClick={() => handleShare(team)}
                                            className="px-3 bg-white text-green-600 border border-green-200 rounded-lg flex items-center justify-center hover:bg-green-50"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
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
