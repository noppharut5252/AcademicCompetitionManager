
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, User, Team, AreaStageInfo } from '../types';
import { updateTeamResult, updateAreaResult } from '../services/api';
import { shareScoreResult, shareTop3Result } from '../services/liff';
import { Save, AlertCircle, CheckCircle, Trophy, ChevronRight, ChevronLeft, Share2, Calculator, X, History, Loader2, ListChecks, Wand2, Hash, RotateCcw, Delete, Crown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmationModal from './ConfirmationModal';

// --- Types & Interfaces ---

interface ScoreInputViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

interface ScoringCriteria {
    id: string;
    label: string;
    score: string;
    max: number;
}

interface SubmittedSlip {
    id: string;
    teamName: string;
    schoolName: string;
    totalScore: number;
    rank: string;
    medal: string;
    timestamp: string;
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

const getAutoMedal = (score: number) => {
    if (score === -1) return 'ไม่เข้าร่วมแข่งขัน';
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

// --- Sub-Components ---

// 1. Custom Numeric Keypad
const NumericKeypad = ({ 
    isOpen, 
    onClose, 
    onInput, 
    onDelete, 
    onNext, 
    onPrev,
    value,
    label
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onInput: (char: string) => void, 
    onDelete: () => void, 
    onNext?: () => void, 
    onPrev?: () => void,
    value: string,
    label?: string
}) => {
    if (!isOpen) return null;

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-[100] animate-in slide-in-from-bottom duration-300">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-2 bg-gray-200 border-b border-gray-300">
                <div className="flex gap-2">
                    <button onClick={onPrev} className="p-2 bg-white rounded shadow-sm active:bg-gray-100"><ChevronLeft className="w-5 h-5"/></button>
                    <button onClick={onNext} className="p-2 bg-white rounded shadow-sm active:bg-gray-100"><ChevronRight className="w-5 h-5"/></button>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{label || 'Input'}</span>
                    <div className="text-lg font-bold text-gray-800 bg-white px-4 py-0.5 rounded shadow-inner min-w-[80px] text-center">
                        {value || '-'}
                    </div>
                </div>
                <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold shadow-sm active:bg-blue-700">เสร็จสิ้น</button>
            </div>
            {/* Keypad Grid */}
            <div className="grid grid-cols-4 gap-2 p-2 pb-6 safe-area-bottom">
                {keys.map(k => (
                    <button 
                        key={k} 
                        onClick={() => onInput(k)}
                        className="bg-white rounded-lg shadow-sm p-4 text-2xl font-bold text-gray-800 active:bg-blue-50 active:scale-95 transition-all"
                    >
                        {k}
                    </button>
                ))}
                <button 
                    onClick={onDelete}
                    className="bg-red-50 rounded-lg shadow-sm p-4 text-red-600 active:bg-red-100 active:scale-95 transition-all flex items-center justify-center"
                >
                    <Delete className="w-8 h-8" />
                </button>
            </div>
        </div>
    );
};

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

const ScoreInputView: React.FC<ScoreInputViewProps> = ({ data, user, onDataUpdate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId');

  // Role & Scope Logic
  const role = user?.level?.toLowerCase();
  const isAdminOrArea = role === 'admin' || role === 'area';
  const isGroupAdmin = role === 'group_admin';
  
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>(isAdminOrArea ? 'area' : 'cluster');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{ 
      isOpen: boolean, 
      type: 'single' | 'batch', 
      teamId: string | null,
      items: { name: string, oldScore: string, newScore: string, oldRank: string, newRank: string }[] 
  }>({ isOpen: false, type: 'single', teamId: null, items: [] });
  
  // Feature State
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null); // For focused team
  const [criteriaMode, setCriteriaMode] = useState(false);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, ScoringCriteria[]>>({});
  
  // Receipt State (History)
  const [history, setHistory] = useState<SubmittedSlip[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Keypad State
  const [keypadConfig, setKeypadConfig] = useState<{ isOpen: boolean, targetId: string, field: 'score' | 'rank', criteriaId?: string } | null>(null);

  const activity = useMemo(() => 
    data.activities.find(a => a.id === activityId), 
  [data.activities, activityId]);

  const teams = useMemo(() => {
      if (!activityId) return [];
      let list = data.teams.filter(t => t.activityId === activityId);

      if (viewScope === 'area') {
          list = list.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }

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

      // Sort by Rank ASC (if available) then Score DESC
      return list.sort((a, b) => {
          const editA = edits[a.teamId];
          const editB = edits[b.teamId];
          
          const rankA = parseFloat(editA?.rank || (viewScope === 'area' ? getAreaInfo(a)?.rank : a.rank) || '999');
          const rankB = parseFloat(editB?.rank || (viewScope === 'area' ? getAreaInfo(b)?.rank : b.rank) || '999');
          
          if (rankA !== rankB) return rankA - rankB;

          const scoreA = parseFloat(editA?.score || (viewScope === 'area' ? String(getAreaInfo(a)?.score) : String(a.score)) || '0');
          const scoreB = parseFloat(editB?.score || (viewScope === 'area' ? String(getAreaInfo(b)?.score) : String(b.score)) || '0');
          
          return scoreB - scoreA;
      });
  }, [data.teams, activityId, viewScope, isGroupAdmin, user, searchTerm, data.schools, edits]);

  // Initializing Criteria for a team if not exists
  const getCriteria = (teamId: string) => {
      if (!criteriaScores[teamId]) {
          return [
              { id: 'c1', label: 'ความถูกต้อง', score: '', max: 30 },
              { id: 'c2', label: 'ความคิดสร้างสรรค์', score: '', max: 30 },
              { id: 'c3', label: 'เทคนิคการนำเสนอ', score: '', max: 20 },
              { id: 'c4', label: 'การตอบคำถาม', score: '', max: 20 },
          ];
      }
      return criteriaScores[teamId];
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

  const handleCriteriaChange = (teamId: string, cId: string, value: string) => {
      const current = getCriteria(teamId);
      const updated = current.map(c => c.id === cId ? { ...c, score: value } : c);
      
      setCriteriaScores(prev => ({ ...prev, [teamId]: updated }));

      // Auto-sum to Main Score
      let total = 0;
      updated.forEach(c => {
          const val = parseFloat(c.score);
          if (!isNaN(val)) total += val;
      });
      
      handleInputChange(teamId, 'score', String(total));
  };

  const openKeypad = (teamId: string, field: 'score' | 'rank', criteriaId?: string) => {
      setActiveTeamId(teamId); // Set Focus Mode
      setKeypadConfig({ isOpen: true, targetId: teamId, field, criteriaId });
  };

  const handleKeypadInput = (char: string) => {
      if (!keypadConfig) return;
      const { targetId, field, criteriaId } = keypadConfig;
      
      let currentVal = '';
      if (criteriaId) {
          currentVal = getCriteria(targetId).find(c => c.id === criteriaId)?.score || '';
      } else {
          currentVal = edits[targetId]?.[field] || '';
      }

      // Prevent multiple dots
      if (char === '.' && currentVal.includes('.')) return;
      
      const newVal = currentVal + char;
      
      if (criteriaId) {
          handleCriteriaChange(targetId, criteriaId, newVal);
      } else {
          handleInputChange(targetId, field, newVal);
      }
  };

  const handleKeypadDelete = () => {
      if (!keypadConfig) return;
      const { targetId, field, criteriaId } = keypadConfig;
      
      let currentVal = '';
      if (criteriaId) {
          currentVal = getCriteria(targetId).find(c => c.id === criteriaId)?.score || '';
      } else {
          currentVal = edits[targetId]?.[field] || '';
      }

      const newVal = currentVal.slice(0, -1);

      if (criteriaId) {
          handleCriteriaChange(targetId, criteriaId, newVal);
      } else {
          handleInputChange(targetId, field, newVal);
      }
  };

  // --- Auto Rank Logic ---
  const handleAutoRank = () => {
      // Sort all currently visible teams by their score (edit priority > db)
      const sorted = [...teams].sort((a, b) => {
          const scoreA = parseFloat(edits[a.teamId]?.score || (viewScope === 'area' ? String(getAreaInfo(a)?.score) : String(a.score)) || '0');
          const scoreB = parseFloat(edits[b.teamId]?.score || (viewScope === 'area' ? String(getAreaInfo(b)?.score) : String(b.score)) || '0');
          return scoreB - scoreA; // Descending
      });

      const newEdits = { ...edits };
      let currentRank = 1;
      
      sorted.forEach((t, index) => {
          // If score is valid (not 0 or -1), assign rank
          const score = parseFloat(newEdits[t.teamId]?.score || (viewScope === 'area' ? String(getAreaInfo(t)?.score) : String(t.score)) || '0');
          
          if (score > 0) {
              // Handle Tie: if score equals previous, rank stays same
              if (index > 0) {
                  const prevT = sorted[index - 1];
                  const prevScore = parseFloat(newEdits[prevT.teamId]?.score || (viewScope === 'area' ? String(getAreaInfo(prevT)?.score) : String(prevT.score)) || '0');
                  if (score < prevScore) {
                      currentRank = index + 1;
                  }
              }
              
              // Only update if rank changed
              const oldRank = newEdits[t.teamId]?.rank || (viewScope === 'area' ? String(getAreaInfo(t)?.rank) : t.rank) || '';
              if (String(currentRank) !== oldRank) {
                  // Initialize edit object if not exists
                  if (!newEdits[t.teamId]) {
                      // Need to fill base values to not lose existing score
                      const baseScore = (viewScope === 'area' ? String(getAreaInfo(t)?.score) : String(t.score));
                      newEdits[t.teamId] = {
                          score: baseScore === '0' ? '' : baseScore,
                          rank: '',
                          medal: '',
                          flag: '',
                          isDirty: true
                      };
                  }
                  newEdits[t.teamId].rank = String(currentRank);
                  newEdits[t.teamId].isDirty = true;
              }
          }
      });
      setEdits(newEdits);
  };

  // Validation Logic
  const validationWarnings = useMemo(() => {
      if (!activityId) return [];
      const warnings: string[] = [];
      let rank1Count = 0;
      
      teams.forEach(t => {
          const edit = edits[t.teamId];
          
          let score: number = 0;
          let rank = "";
          
          if (edit) {
              score = parseFloat(edit.score);
              rank = edit.rank;
          } else if (viewScope === 'area') {
              const info = getAreaInfo(t);
              score = Number(info?.score || 0);
              rank = info?.rank || '';
          } else {
              score = Number(t.score);
              rank = t.rank;
          }

          if (score > 100) warnings.push(`ทีม ${t.teamName}: คะแนนเกิน 100`);
          if (rank === '1') rank1Count++;
      });

      if (rank1Count > 1) warnings.push(`มีทีมได้อันดับ 1 จำนวน ${rank1Count} ทีม (ควรมีเพียง 1 ทีม)`);
      return warnings;
  }, [teams, edits, viewScope, activityId]);

  // --- Save Logic ---

  const performUpdate = async (teamId: string, edit: any) => {
        const finalScore = parseFloat(edit.score);
        const finalRank = edit.rank === 'undefined' ? '' : edit.rank;
        const finalMedal = calculateMedal(edit.score, edit.medal);
        
        if (viewScope === 'area') {
            return await updateAreaResult(teamId, finalScore, finalRank, finalMedal);
        } else {
            const finalFlag = edit.flag === 'undefined' ? '' : edit.flag;
            const shouldPromote = String(finalRank) === '1' && String(finalFlag).toUpperCase() === 'TRUE';
            const stage = shouldPromote ? 'Area' : '';
            return await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag, stage);
        }
  };

  // Prepare Data for Confirmation Modal
  const initiateSave = (teamId: string) => {
      const edit = edits[teamId];
      if (!edit || !edit.isDirty) return;
      const team = teams.find(t => t.teamId === teamId);
      if (!team) return;

      const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const oldScore = viewScope === 'area' ? String(getAreaInfo(team)?.score || 0) : String(team.score);
      const oldRank = viewScope === 'area' ? String(getAreaInfo(team)?.rank || '') : String(team.rank);

      setConfirmState({
          isOpen: true,
          type: 'single',
          teamId,
          items: [{
              name: school?.SchoolName || team.schoolId, // Use School Name as primary label
              oldScore: oldScore === '0' ? '-' : oldScore,
              newScore: edit.score || '-',
              oldRank: oldRank || '-',
              newRank: edit.rank || '-'
          }]
      });
  };

  const initiateBatchSave = () => {
      const dirtyIds = Object.keys(edits).filter(id => edits[id].isDirty && teams.some(t => t.teamId === id));
      if (dirtyIds.length === 0) return;

      const items = dirtyIds.map(id => {
          const t = teams.find(team => team.teamId === id)!;
          const edit = edits[id];
          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          const oldScore = viewScope === 'area' ? String(getAreaInfo(t)?.score || 0) : String(t.score);
          const oldRank = viewScope === 'area' ? String(getAreaInfo(t)?.rank || '') : String(t.rank);
          
          return {
              name: school?.SchoolName || t.schoolId, // Use School Name as primary label
              oldScore: oldScore === '0' ? '-' : oldScore,
              newScore: edit.score || '-',
              oldRank: oldRank || '-',
              newRank: edit.rank || '-'
          };
      });

      setConfirmState({
          isOpen: true,
          type: 'batch',
          teamId: null,
          items
      });
  };

  const handleConfirmSave = async () => {
      setIsLoading(true);
      setConfirmState(prev => ({ ...prev, isOpen: false }));

      const targetIds = confirmState.type === 'single' && confirmState.teamId 
          ? [confirmState.teamId] 
          : Object.keys(edits).filter(id => edits[id].isDirty && teams.some(t => t.teamId === id));

      let successCount = 0;

      for (const id of targetIds) {
          const edit = edits[id];
          if (!edit) continue;
          
          const success = await performUpdate(id, edit);
          if (success) {
              successCount++;
              
              // Add to History
              const team = teams.find(t => t.teamId === id);
              const school = data.schools.find(s => s.SchoolID === team?.schoolId || s.SchoolName === team?.schoolId);
              const slip: SubmittedSlip = {
                  id: Date.now().toString() + id,
                  teamName: team?.teamName || '',
                  schoolName: school?.SchoolName || team?.schoolId || '',
                  totalScore: parseFloat(edit.score) || 0,
                  rank: edit.rank,
                  medal: calculateMedal(edit.score, edit.medal),
                  timestamp: new Date().toISOString()
              };
              setHistory(prev => [slip, ...prev]);
          }
      }

      setIsLoading(false);
      
      // Clear edits for successful saves
      const newEdits = { ...edits };
      targetIds.forEach(id => delete newEdits[id]);
      setEdits(newEdits);
      
      if (successCount > 0) {
          onDataUpdate();
      } else {
          alert('บันทึกไม่สำเร็จ');
      }
  };

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
            await shareScoreResult(team.teamName, schoolName, activityName, score, medal, rank, team.teamId);
        } catch (err) {
            console.error('Share failed');
        }
  };

  const handleShareTop3 = async () => {
        if (!activity) return;
        
        const winners = teams
            .map(t => {
                const edit = edits[t.teamId];
                const rawScore = edit?.score ?? (viewScope === 'area' ? String(getAreaInfo(t)?.score) : String(t.score));
                const rawRank = edit?.rank ?? (viewScope === 'area' ? String(getAreaInfo(t)?.rank) : String(t.rank));
                const rawMedal = edit?.medal ?? (viewScope === 'area' ? getAreaInfo(t)?.medal : t.medalOverride);

                const scoreVal = parseFloat(String(rawScore));
                const medal = rawMedal || calculateMedal(String(scoreVal), '');
                const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);

                return {
                    rank: parseInt(String(rawRank)) || 999,
                    teamName: t.teamName,
                    schoolName: school?.SchoolName || t.schoolId,
                    score: String(scoreVal > 0 ? scoreVal : 0),
                    medal: medal
                };
            })
            .filter(w => w.rank >= 1 && w.rank <= 3)
            .sort((a, b) => a.rank - b.rank);

        if (winners.length === 0) {
            alert('ยังไม่มีข้อมูลลำดับที่ 1-3');
            return;
        }

        try {
            await shareTop3Result(activity.name, winners);
        } catch (e) {
            console.error(e);
            alert('ไม่สามารถแชร์ได้');
        }
  };

  const handlePrintDraft = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert('Pop-up ถูกบล็อก');
          return;
      }

      const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const scopeTitle = viewScope === 'cluster' ? `ระดับกลุ่มเครือข่าย` : 'ระดับเขตพื้นที่การศึกษา';
      const activityName = activity?.name || '';

      const rows = teams.map((t, idx) => {
          const edit = edits[t.teamId];
          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          
          let rawScore = edit?.score || (viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score);
          let rank = edit?.rank || (viewScope === 'area' ? (getAreaInfo(t)?.rank || '') : t.rank);
          let medal = edit?.medal || (viewScope === 'area' ? (getAreaInfo(t)?.medal || '') : t.medalOverride);
          
          // Ensure score is number for logic
          let score: number;
          if (typeof rawScore === 'string') {
              score = parseFloat(rawScore);
          } else {
              score = Number(rawScore);
          }
          if (isNaN(score)) score = 0;

          const displayScore = score === -1 ? 'ไม่มา' : (score > 0 ? score : '-');
          
          // Re-calculate medal display if dirty to ensure accuracy
          if (edit && !edit.medal && score > 0 && score !== -1) {
              medal = getAutoMedal(score);
          } else if (!medal && score > 0) {
              medal = getAutoMedal(score);
          }

          return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${t.teamName}</td>
                <td>${school?.SchoolName || t.schoolId}</td>
                <td style="text-align: center; font-weight: bold;">${displayScore}</td>
                <td style="text-align: center;">${rank || '-'}</td>
                <td style="text-align: center;">${medal || '-'}</td>
                ${edit?.isDirty ? '<td style="text-align: center; color: blue;">Draft</td>' : '<td style="text-align: center;">Saved</td>'}
            </tr>
          `;
      }).join('');

      const content = `
        <html>
        <head>
            <title>ใบสรุปคะแนนร่าง - ${activityName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Sarabun', sans-serif; padding: 20px; }
                h1, h2 { text-align: center; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th, td { border: 1px solid #000; padding: 8px; }
                th { background-color: #f2f2f2; text-align: center; }
                .draft-mark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(0,0,0,0.1); pointer-events: none; z-index: -1; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; borderRadius: 5px; cursor: pointer;">พิมพ์เอกสาร</button>
            </div>
            <div class="draft-mark">DRAFT</div>
            <h1>ใบสรุปผลการแข่งขัน (ฉบับร่าง)</h1>
            <h2>${activityName}</h2>
            <h2>${scopeTitle}</h2>
            <div style="text-align: center; margin-top: 10px;">ข้อมูล ณ วันที่ ${date} (รวมข้อมูลที่ยังไม่บันทึก)</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">ที่</th>
                        <th>ทีม</th>
                        <th>โรงเรียน</th>
                        <th style="width: 80px;">คะแนน</th>
                        <th style="width: 60px;">อันดับ</th>
                        <th style="width: 100px;">เหรียญ</th>
                        <th style="width: 60px;">สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            
            <div style="margin-top: 40px; display: flex; justify-content: flex-end;">
                <div style="text-align: center; width: 300px;">
                    <div style="border-bottom: 1px dotted #000; margin-bottom: 10px;"></div>
                    <div>( ........................................................ )</div>
                    <div style="margin-top: 5px;">กรรมการตัดสิน</div>
                </div>
            </div>
        </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
  };

  // Helper to get keypad display value
  const getKeypadValue = () => {
      if (!keypadConfig) return '';
      if (keypadConfig.criteriaId) {
          return getCriteria(keypadConfig.targetId).find(c => c.id === keypadConfig.criteriaId)?.score || '';
      }
      return edits[keypadConfig.targetId]?.[keypadConfig.field] || '';
  };

  const dirtyCount = Object.keys(edits).filter(id => edits[id].isDirty && teams.some(t => t.teamId === id)).length;

  if (!user) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-800">กรุณาเข้าสู่ระบบ</h2>
              <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-lg mt-4">กลับหน้าหลัก</button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-kanit animate-in fade-in duration-500 relative">
        <LoadingOverlay isVisible={isLoading} />
        
        {/* Pre-Save Confirmation Modal */}
        <ConfirmationModal 
            isOpen={confirmState.isOpen}
            title={confirmState.type === 'single' ? 'ยืนยันการบันทึกคะแนน' : `ยืนยันบันทึก ${confirmState.items.length} รายการ`}
            description="กรุณาตรวจสอบความถูกต้องก่อนยืนยัน"
            confirmLabel="ยืนยันบันทึก"
            confirmColor="blue"
            onConfirm={handleConfirmSave}
            onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        >
            <div className="mt-4 max-h-[50vh] overflow-y-auto border-t border-gray-200">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-3 py-2">โรงเรียน (ทีม)</th>
                            <th className="px-3 py-2 text-center">คะแนน</th>
                            <th className="px-3 py-2 text-center">อันดับ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {confirmState.items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-3 py-2 font-medium">{item.name}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className="text-gray-400 text-xs">{item.oldScore}</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-blue-600 font-bold">{item.newScore}</span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <span className="text-gray-400 text-xs">{item.oldRank}</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-blue-600 font-bold">{item.newRank}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ConfirmationModal>

        <KeypadOverlay 
            isOpen={keypadConfig?.isOpen || false} 
            onClose={() => setKeypadConfig(null)}
            onInput={handleKeypadInput}
            onDelete={handleKeypadDelete}
            value={getKeypadValue()}
            label={keypadConfig?.field === 'score' ? (keypadConfig.criteriaId ? 'คะแนนย่อย' : 'คะแนนรวม') : 'ลำดับที่'}
        />

        {/* History Modal */}
        {showHistory && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex justify-end">
                <div className="w-full max-w-md bg-white h-full overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold flex items-center"><History className="w-5 h-5 mr-2"/> ประวัติการบันทึก (Session)</h3>
                        <button onClick={() => setShowHistory(false)}><X className="w-6 h-6"/></button>
                    </div>
                    <div className="p-4 space-y-4">
                        {history.length === 0 ? <p className="text-center text-gray-400 py-10">ยังไม่มีประวัติในรอบนี้</p> : history.map(slip => (
                            <div key={slip.id} className="border rounded-xl p-3 shadow-sm hover:bg-gray-50">
                                <div className="flex justify-between font-bold text-gray-800">
                                    <span>{slip.teamName}</span>
                                    <span className="text-blue-600">{slip.totalScore}</span>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-gray-500">{slip.schoolName}</span>
                                    <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">{slip.medal}</span>
                                </div>
                                {slip.rank && <div className="text-xs text-purple-600 font-bold mt-1">Rank: {slip.rank}</div>}
                                <div className="text-[10px] text-gray-400 mt-2 text-right">{new Date(slip.timestamp).toLocaleTimeString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

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
                <div className="flex items-center">
                    {dirtyCount > 0 && (
                        <button 
                            onClick={initiateBatchSave}
                            className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm mr-2 animate-pulse"
                        >
                            Save All ({dirtyCount})
                        </button>
                    )}
                    <button onClick={() => setShowHistory(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
                        <History className="w-6 h-6" />
                        {history.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                    </button>
                </div>
            </div>
            
            <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button 
                    onClick={handleShareTop3}
                    className="flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 whitespace-nowrap"
                >
                    <Crown className="w-3 h-3 mr-1.5" /> Share Top 3
                </button>
                <button 
                    onClick={handleAutoRank}
                    className="flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap"
                >
                    <Wand2 className="w-3 h-3 mr-1.5" /> Auto Rank
                </button>
                <button
                    onClick={handlePrintDraft}
                    className="flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 whitespace-nowrap"
                >
                    <Share2 className="w-3 h-3 mr-1.5" /> Print Draft
                </button>
                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                <button 
                    onClick={() => setCriteriaMode(!criteriaMode)}
                    className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${criteriaMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
                >
                    <ListChecks className="w-3 h-3 mr-1.5" />
                    {criteriaMode ? 'แบบละเอียด (Criteria)' : 'แบบยอดรวม (Total)'}
                </button>
            </div>
        </div>

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
            <div className="mx-4 mt-4 bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r shadow-sm">
                <h4 className="text-orange-800 text-xs font-bold mb-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> ตรวจสอบความถูกต้อง</h4>
                <ul className="list-disc list-inside text-[10px] text-orange-700 space-y-0.5">
                    {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
            </div>
        )}

        {/* Teams List */}
        <div className="px-4 space-y-4 pb-24 pt-4">
            {teams.map((team, idx) => {
                const edit = edits[team.teamId];
                const rawScore = edit?.score ?? (viewScope === 'area' ? getAreaInfo(team)?.score : team.score);
                const scoreVal = parseFloat(String(rawScore));
                const displayScore = (!isNaN(scoreVal) && (scoreVal > 0 || scoreVal === -1)) ? rawScore : '';
                
                const rawRank = edit?.rank ?? (viewScope === 'area' ? getAreaInfo(team)?.rank : team.rank);
                const displayRank = rawRank || '';

                const isDirty = edit?.isDirty;
                const criteria = getCriteria(team.teamId);

                // Focus Mode Style
                const isActive = activeTeamId === team.teamId;

                return (
                    <div 
                        key={team.teamId} 
                        id={`team-${team.teamId}`}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${isActive ? 'ring-2 ring-blue-500 shadow-xl scale-[1.01] z-10' : 'border-gray-200'}`}
                        onClick={() => setActiveTeamId(team.teamId)}
                    >
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-start">
                            <div className="min-w-0">
                                <div className="text-xs text-gray-400 font-mono mb-0.5">#{idx + 1}</div>
                                <div className="font-bold text-gray-900 text-lg leading-tight">{team.teamName}</div>
                                <div className="text-xs text-gray-500 mt-1">{data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {displayScore && !isDirty && <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Saved</div>}
                                {(displayScore > 0 || displayScore === -1) && !isDirty && (
                                    <button onClick={(e) => { e.stopPropagation(); handleShare(team); }} className="text-blue-500 bg-blue-50 p-1.5 rounded-full">
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Scoring Inputs */}
                            {criteriaMode ? (
                                <div className="space-y-3">
                                    {criteria.map(c => (
                                        <div key={c.id} className="flex items-center gap-3">
                                            <div className="flex-1 text-xs text-gray-600 font-medium">{c.label} <span className="text-gray-400">({c.max})</span></div>
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); openKeypad(team.teamId, 'score', c.id); }}
                                                className={`w-20 h-10 border rounded-lg flex items-center justify-center font-bold text-lg bg-gray-50 cursor-pointer ${isActive ? 'border-blue-400 bg-white' : 'border-gray-300'}`}
                                            >
                                                {c.score}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <span className="font-bold text-gray-700">Total Score</span>
                                        <span className="text-2xl font-black text-blue-600">{displayScore || 0}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">คะแนน (Score)</label>
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); openKeypad(team.teamId, 'score'); }}
                                            className={`w-full h-16 border-2 rounded-xl flex items-center justify-center text-4xl font-black cursor-pointer transition-colors ${isActive ? 'border-blue-500 bg-blue-50/10 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
                                        >
                                            {displayScore || <span className="text-gray-300 text-2xl font-normal">-</span>}
                                        </div>
                                    </div>
                                    <div className="w-1/3">
                                        <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">ลำดับ (Rank)</label>
                                        <div
                                            onClick={(e) => { e.stopPropagation(); openKeypad(team.teamId, 'rank'); }}
                                            className="w-full h-16 border rounded-xl flex items-center justify-center text-2xl font-bold bg-white text-gray-800 cursor-pointer border-gray-300"
                                        >
                                            {displayRank || <span className="text-gray-300">-</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Save Button (Only show when active or dirty) */}
                            {(isActive || isDirty) && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); initiateSave(team.teamId); }}
                                    disabled={!displayScore}
                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:scale-100 mt-2"
                                >
                                    <Save className="w-5 h-5 mr-2" /> บันทึกผลคะแนน
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {teams.length === 0 && (
                <div className="text-center py-20 text-gray-400 opacity-50">
                    <Calculator className="w-16 h-16 mx-auto mb-4" />
                    <p>เลือกรายการแข่งขันเพื่อเริ่มให้คะแนน</p>
                </div>
            )}
        </div>
    </div>
  );
};

// Internal wrapper for Keypad to break dependency cycle if needed, but defined above is fine.
const KeypadOverlay = NumericKeypad;

export default ScoreInputView;
