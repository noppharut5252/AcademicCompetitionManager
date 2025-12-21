
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, User, Team, AreaStageInfo } from '../types';
import { updateTeamResult, updateAreaResult } from '../services/api';
import { shareScoreResult, shareTop3Result } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Trophy, Search, ChevronRight, ChevronLeft, Share2, AlertTriangle, Calculator, X, Copy, PieChart, Check, ChevronDown, Flag, History, Loader2, ListChecks, Edit2, Crown, LayoutGrid, AlertOctagon, Wand2, Eye, EyeOff, ArrowDownWideNarrow, GraduationCap, Printer, School, FileBadge, UserX, ClipboardCheck, BarChart3, ClipboardList, Info, RotateCcw, PenTool, Mic, MicOff, Eraser, Receipt, GripHorizontal, Delete, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';
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
    criteriaSummary?: string;
    timestamp: string;
    signatureUrl?: string;
    judgeName?: string;
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

const getAreaInfo = (team: Team): AreaStageInfo | null => {
    try {
        return JSON.parse(team.stageInfo);
    } catch {
        return null;
    }
};

// --- Sub-Components ---

// 1. Signature Pad Component
const SignaturePad = ({ onSign }: { onSign: (dataUrl: string | null) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
            }
        }
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        setHasSignature(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const endDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            onSign(canvasRef.current.toDataURL());
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasSignature(false);
            onSign(null);
        }
    };

    return (
        <div className="border border-gray-300 rounded-xl overflow-hidden bg-white relative">
            <canvas
                ref={canvasRef}
                className="w-full h-32 touch-none cursor-crosshair bg-gray-50"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={endDrawing}
            />
            <div className="absolute bottom-2 right-2 flex gap-2">
                {hasSignature && (
                    <button onClick={clearSignature} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-red-100 hover:text-red-500 transition-colors text-xs flex items-center">
                        <Eraser className="w-3 h-3 mr-1" /> ล้าง
                    </button>
                )}
            </div>
            {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-sm">
                    เซ็นชื่อกรรมการที่นี่ (Signature)
                </div>
            )}
        </div>
    );
};

// 2. Custom Numeric Keypad
const NumericKeypad = ({ 
    isOpen, 
    onClose, 
    onInput, 
    onDelete, 
    onNext, 
    onPrev,
    value 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onInput: (char: string) => void, 
    onDelete: () => void, 
    onNext?: () => void,
    onPrev?: () => void,
    value: string
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
                <div className="text-lg font-bold text-gray-800 bg-white px-4 py-1 rounded shadow-inner min-w-[80px] text-center">
                    {value || '0'}
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

// 3. Receipt Slip Modal
const ReceiptModal = ({ slip, onClose }: { slip: SubmittedSlip, onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-none sm:rounded-2xl overflow-hidden shadow-2xl relative">
                <div className="bg-blue-600 h-2"></div>
                <div className="p-6 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">บันทึกคะแนนสำเร็จ</h2>
                    <p className="text-gray-500 text-xs">Submission Receipt</p>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 text-left space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">ทีม:</span>
                            <span className="font-bold text-gray-800">{slip.teamName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">โรงเรียน:</span>
                            <span className="font-medium text-gray-800 truncate max-w-[150px]">{slip.schoolName}</span>
                        </div>
                        <div className="border-t border-gray-200 my-2"></div>
                        <div className="flex justify-between items-end">
                            <span className="text-gray-500 font-bold">คะแนนรวม:</span>
                            <span className="text-3xl font-black text-blue-600">{slip.totalScore}</span>
                        </div>
                        {slip.criteriaSummary && (
                            <div className="text-[10px] text-gray-400 mt-1">
                                {slip.criteriaSummary}
                            </div>
                        )}
                        <div className="text-[10px] text-gray-400 text-right mt-2">
                            {new Date(slip.timestamp).toLocaleString('th-TH')}
                        </div>
                    </div>

                    {slip.signatureUrl && (
                        <div className="text-center mt-4">
                            <div className="text-xs text-gray-400 mb-1">ลายเซ็นกรรมการ</div>
                            <img src={slip.signatureUrl} alt="Signature" className="h-12 mx-auto mix-blend-multiply opacity-80" />
                            {slip.judgeName && <div className="text-xs font-bold text-gray-600 mt-1">({slip.judgeName})</div>}
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-100">ปิด</button>
                    {/* In a real app, verify `navigator.share` support or implement html2canvas */}
                    <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md">บันทึกรูป</button>
                </div>
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
  const canScoreArea = ['admin', 'area', 'score'].includes(role || '');
  
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>(isAdminOrArea ? 'area' : 'cluster');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'single' | 'batch', teamId: string | null }>({ isOpen: false, type: 'single', teamId: null });
  
  // New Features State
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null); // For focused team (Mobile Focus Mode)
  const [criteriaMode, setCriteriaMode] = useState(false);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, ScoringCriteria[]>>({});
  const [signatures, setSignatures] = useState<Record<string, string>>({}); // Stores base64 signature per team
  const [comments, setComments] = useState<Record<string, string>>({});
  
  // Receipt State
  const [lastSlip, setLastSlip] = useState<SubmittedSlip | null>(null);
  const [history, setHistory] = useState<SubmittedSlip[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Keypad State
  const [keypadConfig, setKeypadConfig] = useState<{ isOpen: boolean, targetId: string, field: string, criteriaId?: string } | null>(null);

  // Voice Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
      if ('webkitSpeechRecognition' in window) {
          // @ts-ignore
          const recognition = new window.webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.lang = 'th-TH';
          recognition.interimResults = false;
          
          recognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              if (activeTeamId) {
                  setComments(prev => ({
                      ...prev,
                      [activeTeamId]: (prev[activeTeamId] || '') + ' ' + transcript
                  }));
              }
              setIsListening(false);
          };
          
          recognition.onerror = () => setIsListening(false);
          recognition.onend = () => setIsListening(false);
          
          recognitionRef.current = recognition;
      }
  }, [activeTeamId]);

  const toggleListening = () => {
      if (!recognitionRef.current) {
          alert('เบราว์เซอร์นี้ไม่รองรับการพิมพ์ด้วยเสียง');
          return;
      }
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

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

      return list.sort((a, b) => {
          const schoolA = data.schools.find(s => s.SchoolID === a.schoolId || s.SchoolName === a.schoolId)?.SchoolName || a.schoolId;
          const schoolB = data.schools.find(s => s.SchoolID === b.schoolId || s.SchoolName === b.schoolId)?.SchoolName || b.schoolId;
          return schoolA.localeCompare(schoolB, 'th');
      });
  }, [data.teams, activityId, viewScope, isGroupAdmin, user, searchTerm, data.schools]);

  // Initializing Criteria for a team if not exists
  const getCriteria = (teamId: string) => {
      if (!criteriaScores[teamId]) {
          return [
              { id: 'c1', label: 'ความถูกต้อง (Accuracy)', score: '', max: 30 },
              { id: 'c2', label: 'ความคิดสร้างสรรค์ (Creativity)', score: '', max: 30 },
              { id: 'c3', label: 'เทคนิคการนำเสนอ (Technique)', score: '', max: 20 },
              { id: 'c4', label: 'การตอบคำถาม (Q&A)', score: '', max: 20 },
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

  const openKeypad = (teamId: string, field: string, criteriaId?: string) => {
      setActiveTeamId(teamId); // Set Focus Mode
      let val = '';
      if (criteriaId) {
          val = getCriteria(teamId).find(c => c.id === criteriaId)?.score || '';
      } else {
          val = edits[teamId]?.score || '';
      }
      setKeypadConfig({ isOpen: true, targetId: teamId, field, criteriaId });
  };

  const handleKeypadInput = (char: string) => {
      if (!keypadConfig) return;
      const { targetId, field, criteriaId } = keypadConfig;
      
      let currentVal = '';
      if (criteriaId) {
          currentVal = getCriteria(targetId).find(c => c.id === criteriaId)?.score || '';
      } else {
          // If field is 'score', get from edits
          if (field === 'score') currentVal = edits[targetId]?.score || '';
          // Rank not supported in criteria mode keypad usually, but generic enough
      }

      // Prevent multiple dots
      if (char === '.' && currentVal.includes('.')) return;
      
      const newVal = currentVal + char;
      
      if (criteriaId) {
          handleCriteriaChange(targetId, criteriaId, newVal);
      } else if (field === 'score') {
          handleInputChange(targetId, 'score', newVal);
      }
  };

  const handleKeypadDelete = () => {
      if (!keypadConfig) return;
      const { targetId, field, criteriaId } = keypadConfig;
      
      let currentVal = '';
      if (criteriaId) {
          currentVal = getCriteria(targetId).find(c => c.id === criteriaId)?.score || '';
      } else if (field === 'score') {
          currentVal = edits[targetId]?.score || '';
      }

      const newVal = currentVal.slice(0, -1);

      if (criteriaId) {
          handleCriteriaChange(targetId, criteriaId, newVal);
      } else if (field === 'score') {
          handleInputChange(targetId, 'score', newVal);
      }
  };

  const performUpdate = async (teamId: string, edit: any) => {
        const finalScore = parseFloat(edit.score);
        const finalRank = edit.rank === 'undefined' ? '' : edit.rank;
        const finalMedal = edit.medal === 'undefined' ? '' : edit.medal;
        
        if (viewScope === 'area') {
            return await updateAreaResult(teamId, finalScore, finalRank, finalMedal);
        } else {
            const finalFlag = edit.flag === 'undefined' ? '' : edit.flag;
            const shouldPromote = String(finalRank) === '1' && String(finalFlag).toUpperCase() === 'TRUE';
            const stage = shouldPromote ? 'Area' : '';
            return await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag, stage);
        }
  };

  const handleSave = async (teamId: string) => {
      const edit = edits[teamId];
      if (!edit) return;

      setIsLoading(true);
      const success = await performUpdate(teamId, edit);
      setIsLoading(false);

      if (success) {
          const team = teams.find(t => t.teamId === teamId);
          const school = data.schools.find(s => s.SchoolID === team?.schoolId || s.SchoolName === team?.schoolId);
          
          const criteriaList = criteriaScores[teamId];
          const criteriaSummary = criteriaList ? criteriaList.map(c => `${c.label}: ${c.score || 0}`).join(', ') : '';

          // Create Slip
          const slip: SubmittedSlip = {
              id: Date.now().toString(),
              teamName: team?.teamName || '',
              schoolName: school?.SchoolName || team?.schoolId || '',
              totalScore: parseFloat(edit.score) || 0,
              criteriaSummary: criteriaMode ? criteriaSummary : undefined,
              timestamp: new Date().toISOString(),
              signatureUrl: signatures[teamId],
              judgeName: user?.name || 'Unknown Judge'
          };

          setLastSlip(slip);
          setHistory(prev => [slip, ...prev]);
          
          // Clear edit state for this team
          setEdits(prev => {
              const { [teamId]: _, ...rest } = prev;
              return rest;
          });
          
          // Clear signature & criteria local state if needed, but keeping them might be good for review
          // setSignatures(prev => { const {[teamId]:_, ...rest} = prev; return rest; });

          onDataUpdate();
      } else {
          alert('บันทึกไม่สำเร็จ');
      }
  };

  // Helper to get keypad display value
  const getKeypadValue = () => {
      if (!keypadConfig) return '';
      if (keypadConfig.criteriaId) {
          return getCriteria(keypadConfig.targetId).find(c => c.id === keypadConfig.criteriaId)?.score || '';
      }
      return edits[keypadConfig.targetId]?.score || '';
  };

  if (!user) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-800">กรุณาเข้าสู่ระบบ</h2>
              <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-lg mt-4">กลับหน้าหลัก</button>
          </div>
      );
  }

  const activeTeam = teams.find(t => t.teamId === activeTeamId);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-kanit animate-in fade-in duration-500 relative">
        <LoadingOverlay isVisible={isLoading} />
        
        {lastSlip && <ReceiptModal slip={lastSlip} onClose={() => setLastSlip(null)} />}
        
        <KeypadOverlay 
            isOpen={keypadConfig?.isOpen || false} 
            onClose={() => setKeypadConfig(null)}
            onInput={handleKeypadInput}
            onDelete={handleKeypadDelete}
            value={getKeypadValue()}
            // Simple prev/next logic for criteria could be added here
        />

        {/* History Modal */}
        {showHistory && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex justify-end">
                <div className="w-full max-w-md bg-white h-full overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold flex items-center"><History className="w-5 h-5 mr-2"/> ประวัติการให้คะแนน (Session)</h3>
                        <button onClick={() => setShowHistory(false)}><X className="w-6 h-6"/></button>
                    </div>
                    <div className="p-4 space-y-4">
                        {history.length === 0 ? <p className="text-center text-gray-400 py-10">ยังไม่มีประวัติในรอบนี้</p> : history.map(slip => (
                            <div key={slip.id} onClick={() => setLastSlip(slip)} className="border rounded-xl p-3 shadow-sm hover:bg-gray-50 cursor-pointer">
                                <div className="flex justify-between font-bold text-gray-800">
                                    <span>{slip.teamName}</span>
                                    <span className="text-blue-600">{slip.totalScore}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{slip.schoolName}</div>
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
                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Scoring Mode</div>
                    <div className="text-sm font-bold text-gray-800 line-clamp-1">{activity?.name || 'Loading...'}</div>
                </div>
                <button onClick={() => setShowHistory(true)} className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
                    <History className="w-6 h-6" />
                    {history.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
            </div>
            
            <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setCriteriaMode(!criteriaMode)}
                    className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${criteriaMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
                >
                    <ListChecks className="w-3 h-3 mr-1.5" />
                    {criteriaMode ? 'แบบละเอียด (Criteria)' : 'แบบยอดรวม (Total)'}
                </button>
            </div>
        </div>

        {/* Teams List */}
        <div className="px-4 space-y-4 pb-24 pt-4">
            {teams.map((team, idx) => {
                const edit = edits[team.teamId];
                const rawScore = edit?.score ?? (viewScope === 'area' ? getAreaInfo(team)?.score : team.score);
                const scoreVal = parseFloat(String(rawScore));
                const displayScore = (!isNaN(scoreVal) && (scoreVal > 0 || scoreVal === -1)) ? rawScore : '';
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
                            {displayScore && !isDirty && <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Recorded</div>}
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
                                <div 
                                    onClick={(e) => { e.stopPropagation(); openKeypad(team.teamId, 'score'); }}
                                    className={`w-full h-16 border-2 rounded-xl flex items-center justify-center text-4xl font-black cursor-pointer transition-colors ${isActive ? 'border-blue-500 bg-blue-50/10 text-blue-900' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
                                >
                                    {displayScore || <span className="text-gray-300 text-2xl font-normal">แตะเพื่อกรอกคะแนน</span>}
                                </div>
                            )}

                            {/* Signature & Comments (Only show when active or has data) */}
                            {(isActive || isDirty) && (
                                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2 border-t border-gray-100">
                                    {/* Signature */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">ลายเซ็น (Signature)</label>
                                        <SignaturePad onSign={(data) => setSignatures(prev => ({ ...prev, [team.teamId]: data || '' }))} />
                                    </div>

                                    {/* Voice Comment */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">ข้อเสนอแนะ (Comments)</label>
                                        <div className="relative">
                                            <textarea 
                                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-10 min-h-[80px]" 
                                                placeholder="พิมพ์หรือกดไมค์เพื่อพูด..."
                                                value={comments[team.teamId] || ''}
                                                onChange={(e) => setComments(prev => ({ ...prev, [team.teamId]: e.target.value }))}
                                            />
                                            <button 
                                                onClick={toggleListening}
                                                className={`absolute right-2 bottom-2 p-2 rounded-full transition-all ${isListening && activeTeamId === team.teamId ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                {isListening && activeTeamId === team.teamId ? <MicOff className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleSave(team.teamId); }}
                                        disabled={!displayScore}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:scale-100"
                                    >
                                        <Save className="w-5 h-5 mr-2" /> บันทึกผลคะแนน
                                    </button>
                                </div>
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
