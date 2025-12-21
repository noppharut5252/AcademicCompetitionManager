
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, Team, AreaStageInfo } from '../types';
import { updateTeamResult, updateAreaResult, uploadImage, saveScoreSheet, toggleActivityLock } from '../services/api';
import { shareScoreResult, shareTop3Result } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Unlock, Trophy, Search, ChevronRight, ChevronLeft, Share2, AlertTriangle, Calculator, X, Copy, PieChart, Check, ChevronDown, Flag, History, Loader2, ListChecks, Edit2, Crown, LayoutGrid, AlertOctagon, Wand2, Eye, EyeOff, ArrowDownWideNarrow, GraduationCap, Printer, School, FileBadge, UserX, ClipboardCheck, BarChart3, ClipboardList, Info, RotateCcw, Clock, ChevronUp, Trash2, RefreshCw, Upload, Image as ImageIcon, FileCheck, FileSearch, Delete } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';
import ConfirmationModal from './ConfirmationModal';
import { resizeImage } from '../services/utils';

// --- Types & Interfaces ---

interface ScoreEntryProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

interface BatchItem {
    id: string;
    teamName: string;
    schoolName: string;
    score: string;
    rank: string;
    medal: string;
    flag: string;
    isModified: boolean;
}

interface ConfirmModalProps {
    isOpen: boolean;
    type: 'single' | 'batch' | 'reset' | 'correction';
    count?: number;
    totalCount?: number;
    teamName?: string;
    schoolName?: string; 
    newScore?: string;
    newRank?: string;
    newMedal?: string;
    newFlag?: string;
    batchItems?: BatchItem[];
    onConfirm: (remark?: string) => void;
    onCancel: () => void;
    viewScope?: 'cluster' | 'area';
    isLoading?: boolean;
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

const getAutoMedal = (score: number) => {
    if (score === -1) return 'ไม่เข้าร่วมแข่งขัน';
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

const NumericKeypad = ({ 
    isOpen, 
    onClose, 
    onInput, 
    onDelete, 
    value,
    label
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onInput: (char: string) => void, 
    onDelete: () => void, 
    value: string,
    label?: string
}) => {
    if (!isOpen) return null;

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-[100] animate-in slide-in-from-bottom duration-300">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-4 py-2 bg-gray-200 border-b border-gray-300">
                <div className="flex-1"></div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{label || 'Input'}</span>
                    <div className="text-lg font-bold text-gray-800 bg-white px-4 py-0.5 rounded shadow-inner min-w-[80px] text-center">
                        {value || '-'}
                    </div>
                </div>
                <div className="flex-1 text-right">
                    <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold shadow-sm active:bg-blue-700">เสร็จสิ้น</button>
                </div>
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

const LoadingOverlay: React.FC<{ isVisible: boolean; progress?: { current: number; total: number }; startTime?: number | null }> = ({ isVisible, progress, startTime }) => {
    const [elapsed, setElapsed] = useState('00:00');

    useEffect(() => {
        if (!isVisible || !startTime) {
            setElapsed('00:00');
            return;
        }

        const interval = setInterval(() => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(diff / 60).toString().padStart(2, '0');
            const secs = (diff % 60).toString().padStart(2, '0');
            setElapsed(`${mins}:${secs}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [isVisible, startTime]);

    if (!isVisible) return null;

    const percent = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center space-y-4 w-full max-w-sm border border-gray-100">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    {startTime && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-800 pt-1">{percent}%</div>}
                </div>
                
                <div className="text-center w-full">
                    <div className="text-lg font-bold text-gray-800">กำลังดำเนินการ...</div>
                    <div className="text-sm text-gray-500 mt-1">กรุณาอย่าปิดหน้าต่าง</div>
                </div>

                {progress && progress.total > 0 && (
                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs font-medium text-gray-600 px-1">
                            <span>กำลังบันทึก: {progress.current} / {progress.total}</span>
                            <span className="flex items-center text-blue-600"><Clock className="w-3 h-3 mr-1"/> {elapsed}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                )}
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
    const [remark, setRemark] = useState('');
    
    if (!props.isOpen) return null;

    const isReset = props.type === 'reset';
    const isCorrection = props.type === 'correction';

    const handleConfirm = () => {
        if (isCorrection && !remark.trim()) {
            alert("กรุณาระบุเหตุผลการแก้ไข (Remark)");
            return;
        }
        props.onConfirm(remark);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className={`bg-white rounded-xl shadow-xl w-full p-6 space-y-4 flex flex-col max-h-[90vh] ${props.type === 'batch' ? 'max-w-4xl' : 'max-w-sm'}`}>
                <div className={`flex items-center mb-2 shrink-0 ${isReset ? 'text-red-600' : isCorrection ? 'text-orange-600' : 'text-amber-500'}`}>
                    {isReset ? <AlertCircle className="w-6 h-6 mr-2" /> : <AlertTriangle className="w-6 h-6 mr-2" />}
                    <h3 className="text-lg font-bold text-gray-800">
                        {isReset ? `ยืนยันการรีเซ็ต` : isCorrection ? `ยืนยันการแก้ไขด่วน` : `ยืนยันการบันทึก`}
                    </h3>
                </div>
                
                {isReset ? (
                    <div>
                        <p className="text-gray-600 text-sm mb-4">
                            คุณกำลังจะลบข้อมูลคะแนน อันดับ และเหรียญรางวัลของทุกทีมในกิจกรรมนี้
                            <br/>
                            <span className="font-bold text-red-600">การกระทำนี้ไม่สามารถย้อนกลับได้</span>
                        </p>
                    </div>
                ) : props.type === 'single' || isCorrection ? (
                    <div className="overflow-y-auto">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center mb-4">
                            <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">โรงเรียน (School)</p>
                            <h2 className="text-xl font-black text-gray-900 leading-tight mb-2">{props.schoolName || 'ไม่ระบุโรงเรียน'}</h2>
                            <p className="text-sm text-gray-600">ทีม: {props.teamName}</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                                <span className="text-gray-500 font-medium">คะแนนที่ได้:</span>
                                <span className="font-black text-blue-600 text-3xl">{props.newScore === '-1' ? '-1 (ไม่มา)' : props.newScore}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">เหรียญรางวัล:</span>
                                <span className="font-medium text-gray-900">{props.newMedal || calculateMedal(props.newScore || '0', '')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">ลำดับที่:</span>
                                <span className="font-medium text-gray-900">{props.newRank || '-'}</span>
                            </div>
                            
                            {isCorrection && (
                                <div className="mt-4 pt-2 border-t border-red-100">
                                    <label className="block text-xs font-bold text-red-600 mb-1">
                                        ระบุเหตุผลการแก้ไข (จำเป็น)
                                    </label>
                                    <textarea 
                                        className="w-full border border-red-200 rounded p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="เช่น พิมพ์คะแนนผิดพลาด, กรรมการทักท้วง..."
                                        rows={2}
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                         <div className="flex items-center justify-between mb-2 shrink-0">
                            <div>
                                <span className="text-gray-800 font-bold text-lg">รายการทั้งหมด</span>
                                <p className="text-xs text-gray-500">ตรวจสอบความถูกต้องก่อนบันทึก</p>
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
                                         <th className="px-3 py-2 text-left font-medium text-gray-500 bg-gray-50">โรงเรียน (ทีม)</th>
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
                                                     <div className="font-medium truncate max-w-[200px]" title={item.schoolName}>{item.schoolName}</div>
                                                     <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{item.teamName}</div>
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
                    <button 
                        onClick={() => handleConfirm()} 
                        disabled={props.isLoading}
                        className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center justify-center ${isReset ? 'bg-red-600 hover:bg-red-700' : isCorrection ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {props.isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2"/>}
                        {isReset ? 'ยืนยันการรีเซ็ต' : isCorrection ? 'ยืนยันการแก้ไข' : 'ยืนยันและประกาศผล'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const ScoreEntry: React.FC<ScoreEntryProps> = ({ data, user, onDataUpdate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State for Scope (Cluster vs Area) - Changed default to 'area'
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>('area');

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>(''); // For Admin/Area filtering
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
  const [isLoading, setIsLoading] = useState(false);
  // Fixed state type definition
  const [confirmState, setConfirmState] = useState<{ 
      isOpen: boolean, 
      type: 'single' | 'batch' | 'reset' | 'correction', 
      teamId: string | null,
      items?: any[] // Added items array
  }>({ isOpen: false, type: 'single', teamId: null });
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [showUnscoredOnly, setShowUnscoredOnly] = useState(false);
  const [showPendingActivities, setShowPendingActivities] = useState(false);

  // Locking State (Now derived from backend data)
  const [isActivityLocked, setIsActivityLocked] = useState(false);

  // Progress Bar & Timer State
  const [progress, setProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
  const [processStartTime, setProcessStartTime] = useState<number | null>(null);

  // New State for Announced Management
  const [showAnnouncedManager, setShowAnnouncedManager] = useState(false);
  const [announcedCategoryFilter, setAnnouncedCategoryFilter] = useState('All');
  const [announcedSearch, setAnnouncedSearch] = useState('');
  // For Reset logic
  const [activityToReset, setActivityToReset] = useState<string | null>(null);

  // Score Sheet Upload State
  const [isUploadingSheet, setIsUploadingSheet] = useState(false);
  const scoreSheetInputRef = useRef<HTMLInputElement>(null);
  const [scoreSheetUrl, setScoreSheetUrl] = useState<string | null>(null); // For viewing score sheet

  // Modal States for Tables
  const [showResultListModal, setShowResultListModal] = useState(false);
  const [viewingResultActivity, setViewingResultActivity] = useState<string | null>(null);

  // Add missing state for Auto Rank confirmation
  const [showAutoRankConfirm, setShowAutoRankConfirm] = useState(false);
  
  // Add missing state for Reset confirmation (Local Edits)
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Feature 4: Excel-like Navigation Refs (Map "teamId-field" to HTMLElement)
  const cellRefs = useRef<Record<string, HTMLElement | null>>({});

  // Local Storage Key for Edits
  const storageKey = `score_draft_${selectedActivityId}_${viewScope}`;

  useEffect(() => {
      const paramActId = searchParams.get('activityId');
      if (paramActId && data.activities) {
          const act = data.activities.find(a => a.id === paramActId);
          if (act) {
              setSelectedCategory(act.category);
              setSelectedActivityId(act.id);
          }
      }
  }, [searchParams, data.activities]);

  // Determine Lock Status from Data
  useEffect(() => {
      if (selectedActivityId && data.activityStatus) {
          const statusEntry = data.activityStatus.find(s => 
              s.activityId === selectedActivityId && s.scope === viewScope
          );
          // Only true if status exists and isLocked is true
          setIsActivityLocked(statusEntry ? statusEntry.isLocked : false);
          
          // Check for score sheet
          const sheetRefId = selectedActivityId + (viewScope === 'area' ? '_AREA' : '_CLUSTER');
          const sheetFile = data.files.find(f => f.TeamID === sheetRefId && f.FileType.startsWith('ScoreSheet'));
          setScoreSheetUrl(sheetFile ? sheetFile.FileUrl : null);
      } else {
          setIsActivityLocked(false);
          setScoreSheetUrl(null);
      }
  }, [selectedActivityId, viewScope, data.activityStatus, data.files]);

  // Load Draft from LocalStorage
  useEffect(() => {
      if (selectedActivityId) {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
              try {
                  const parsed = JSON.parse(saved);
                  if (Object.keys(parsed).length > 0) {
                      setEdits(parsed);
                      showToast('โหลดข้อมูลร่างที่บันทึกไว้', 'info');
                  } else {
                      setEdits({});
                  }
              } catch (e) {
                  console.error("Failed to load drafts", e);
              }
          } else {
              setEdits({});
          }
      }
  }, [selectedActivityId, viewScope, storageKey]);

  // Save Draft to LocalStorage
  useEffect(() => {
      if (selectedActivityId) {
          if (Object.keys(edits).length > 0) {
              localStorage.setItem(storageKey, JSON.stringify(edits));
          } else {
              localStorage.removeItem(storageKey);
          }
      }
  }, [edits, selectedActivityId, viewScope, storageKey]);

  const currentActivity = useMemo(() => {
      return data.activities.find(a => a.id === selectedActivityId);
  }, [data.activities, selectedActivityId]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

  const handleRefresh = async () => {
        setIsLoading(true);
        await onDataUpdate();
        setIsLoading(false);
        showToast('อัปเดตข้อมูลล่าสุดแล้ว', 'success');
  };

  const handleToggleLock = async () => {
      if (!selectedActivityId) return;
      const newLockState = !isActivityLocked;
      setIsLoading(true);
      const success = await toggleActivityLock(selectedActivityId, viewScope, newLockState);
      setIsLoading(false);
      
      if (success) {
          setIsActivityLocked(newLockState);
          // Manually update local data to reflect change immediately if needed, 
          // but calling onDataUpdate is safer
          await onDataUpdate();
          showToast(newLockState ? 'ล็อกกิจกรรมแล้ว (Announced)' : 'ปลดล็อกกิจกรรมแล้ว', 'success');
      } else {
          showToast('เปลี่ยนสถานะล็อกไม่สำเร็จ', 'error');
      }
  };

  // 1. Check Permissions
  const role = user?.level?.toLowerCase();
  const allowedRoles = ['admin', 'area', 'group_admin', 'score'];
  const canFilterCluster = role === 'admin' || role === 'area';
  
  // Permissions for Area Score Entry: Admin, Area, Score (Group Admin usually manages Cluster only)
  const canScoreArea = ['admin', 'area', 'score'].includes(role || '');
  
  // Reset Permissions: Admin/Area always, Group Admin only in Cluster View
  const canReset = ['admin', 'area'].includes(role || '') || (role === 'group_admin' && viewScope === 'cluster');

  // Permission for Locking: Admin/Area/GroupAdmin
  const canLock = ['admin', 'area'].includes(role || '') || (role === 'group_admin' && viewScope === 'cluster');

  if (!user || !allowedRoles.includes(role || '')) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <span title="Locked"><Lock className="w-12 h-12 mb-4 text-gray-300" /></span>
            <h2 className="text-xl font-bold text-gray-700">ไม่มีสิทธิ์เข้าถึง</h2>
            <p>คุณไม่มีสิทธิ์ในการบันทึกคะแนน</p>
            <button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 text-blue-600 hover:underline">กลับหน้าหลัก</button>
        </div>
      );
  }

  // 2. Data Filtering
  const { availableCategories, availableActivities, allAuthorizedTeams } = useMemo(() => {
      let validActivities = data.activities;
      if (role === 'score') {
          const assigned = user.assignedActivities || [];
          validActivities = validActivities.filter(a => assigned.includes(a.id));
      }
      let relevantTeams = data.teams;
      if (role === 'group_admin') {
          const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
          const clusterId = userSchool?.SchoolCluster;
          if (clusterId) {
             relevantTeams = relevantTeams.filter(t => {
                  const teamSchool = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                  return teamSchool && teamSchool.SchoolCluster === clusterId;
             });
          } else {
             relevantTeams = [];
          }
      }
      const teamCountsByActivity: Record<string, number> = {};
      relevantTeams.forEach(t => { teamCountsByActivity[t.activityId] = (teamCountsByActivity[t.activityId] || 0) + 1; });
      const activeActivities = validActivities.filter(a => (teamCountsByActivity[a.id] || 0) > 0);
      const categories = Array.from(new Set(activeActivities.map(a => a.category))).sort();
      const authorizedTeams = relevantTeams.filter(t => activeActivities.some(a => a.id === t.activityId));
      return { availableCategories: categories, availableActivities: activeActivities, allAuthorizedTeams: authorizedTeams };
  }, [data.activities, data.teams, data.schools, role, user]);

  const announcedActivitiesData = useMemo(() => {
      return availableActivities.map(act => {
          let actTeams = allAuthorizedTeams.filter(t => t.activityId === act.id);
          if (viewScope === 'area') {
              actTeams = actTeams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
          } else {
              if (canFilterCluster && selectedClusterFilter) {
                  actTeams = actTeams.filter(t => {
                      const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                      return s?.SchoolCluster === selectedClusterFilter;
                  });
              }
          }

          // Check locked status for this activity in current scope
          const isLocked = data.activityStatus?.some(s => s.activityId === act.id && s.scope === viewScope && s.isLocked) || false;

          const totalTeams = actTeams.length;
          let scoredTeams = 0;
          let rank1Count = 0;

          actTeams.forEach(t => {
              const score = viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score;
              const rank = viewScope === 'area' ? (getAreaInfo(t)?.rank || '') : t.rank;
              const flag = t.flag;

              if (score > 0 || score === -1) scoredTeams++;

              if (viewScope === 'area') {
                  if (String(rank) === '1') rank1Count++;
              } else {
                  if (String(rank) === '1' && String(flag).toUpperCase() === 'TRUE') rank1Count++;
              }
          });

          return {
              ...act,
              totalTeams,
              scoredTeams,
              rank1Count,
              isFullyScored: totalTeams > 0 && totalTeams === scoredTeams,
              isLocked
          };
      }).filter(a => {
          // Changed Logic: If isLocked is true, it should appear in announced list regardless of score count
          if (a.isLocked) return true;
          if (a.scoredTeams === 0) return false;
          if (announcedCategoryFilter !== 'All' && a.category !== announcedCategoryFilter) return false;
          if (announcedSearch && !a.name.toLowerCase().includes(announcedSearch.toLowerCase())) return false;
          return true;
      });
  }, [availableActivities, allAuthorizedTeams, viewScope, announcedCategoryFilter, announcedSearch, data.schools, selectedClusterFilter, canFilterCluster, data.activityStatus]);

  const completionStats = useMemo(() => {
      const scopeTeams = viewScope === 'area' 
        ? allAuthorizedTeams.filter(t => t.stageStatus === 'Area' || t.flag === 'TRUE')
        : allAuthorizedTeams;

      const teamCount = scopeTeams.length;
      const scoredTeams = scopeTeams.filter(t => {
          const score = viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score;
          return score > 0 || score === -1;
      });

      const pendingActivityIds = new Set<string>();
      const scoredActivityIds = new Set<string>();
      const pendingReasons: Record<string, { unscored: number, missingRep: boolean }> = {};

      availableActivities.forEach(act => {
          const teamsInAct = scopeTeams.filter(t => t.activityId === act.id);
          if (teamsInAct.length === 0) return;

          let isPending = false;
          let unscoredCount = 0;
          let missingRep = false;

          const unscoredInAct = teamsInAct.filter(t => {
              const score = viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score;
              return score === 0;
          });
          unscoredCount = unscoredInAct.length;

          if (viewScope === 'cluster') {
              const hasWinnerAndRep = teamsInAct.some(t => String(t.rank) === '1' && String(t.flag).toUpperCase() === 'TRUE');
              missingRep = !hasWinnerAndRep;
              if (unscoredCount > 0 || missingRep) isPending = true;
          } else {
              if (unscoredCount > 0) isPending = true;
          }

          if (isPending) {
              pendingActivityIds.add(act.id);
              pendingReasons[act.id] = { unscored: unscoredCount, missingRep };
          } else {
              scoredActivityIds.add(act.id);
          }
      });

      return {
          totalTeams: teamCount,
          scoredTeams: scoredTeams.length,
          totalPendingTeams: teamCount - scoredTeams.length,
          totalActivities: scoredActivityIds.size + pendingActivityIds.size,
          scoredActivities: scoredActivityIds.size,
          pendingActivities: pendingActivityIds.size,
          pendingList: Array.from(pendingActivityIds).map(id => ({
              ...availableActivities.find(a => a.id === id)!,
              reason: pendingReasons[id]
          }))
      };
  }, [availableActivities, allAuthorizedTeams, viewScope]);

  const globalStats = useMemo(() => {
      const targetTeams = viewScope === 'area' 
        ? allAuthorizedTeams.filter(t => t.stageStatus === 'Area' || t.flag === 'TRUE')
        : allAuthorizedTeams;

      const total = targetTeams.length;
      let scored = 0;
      let gold = 0;

      targetTeams.forEach(t => {
          let score = 0;
          let manualMedal = '';
          if (viewScope === 'area') {
              const info = getAreaInfo(t);
              score = info?.score || 0;
              manualMedal = info?.medal || '';
          } else {
              score = t.score;
              manualMedal = t.medalOverride || '';
          }

          if (score > 0 || score === -1) scored++;
          
          const medal = calculateMedal(String(score), manualMedal);
          if (medal === 'Gold') gold++;
      });

      const percent = total > 0 ? Math.round((scored / total) * 100) : 0;
      return { total, scored, percent, gold };
  }, [allAuthorizedTeams, viewScope]);

  const filteredActivities = useMemo(() => {
      if (!selectedCategory) return [];
      return availableActivities.filter(a => a.category === selectedCategory);
  }, [selectedCategory, availableActivities]);

  const filteredTeams = useMemo(() => {
      if (!selectedActivityId) return [];
      let teams = allAuthorizedTeams.filter(t => t.activityId === selectedActivityId);
      
      if (viewScope === 'area') {
          teams = teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }

      if (canFilterCluster && selectedClusterFilter) {
          teams = teams.filter(t => {
              const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
              return school?.SchoolCluster === selectedClusterFilter;
          });
      }

      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          teams = teams.filter(t => 
              t.teamName.toLowerCase().includes(lower) || 
              t.teamId.toLowerCase().includes(lower) ||
              t.schoolId.toLowerCase().includes(lower)
          );
      }

      if (showUnscoredOnly) {
        teams = teams.filter(t => {
            const edit = edits[t.teamId];
            let currentScore = 0;
            if (edit) {
              currentScore = parseFloat(edit.score) || 0;
            } else if (viewScope === 'area') {
                const info = getAreaInfo(t);
                currentScore = info?.score || 0;
            } else {
                currentScore = t.score || 0;
            }
            return currentScore === 0;
        });
      }

      return teams.sort((a, b) => {
          const scoreA = viewScope === 'area' ? (getAreaInfo(a)?.score || 0) : a.score;
          const scoreB = viewScope === 'area' ? (getAreaInfo(b)?.score || 0) : b.score;
          return scoreB - scoreA;
      }); 
  }, [allAuthorizedTeams, selectedActivityId, searchTerm, showUnscoredOnly, edits, selectedClusterFilter, canFilterCluster, data.schools, viewScope]);

  // Define alias for compatibility
  const teams = filteredTeams;

  // Feature 2: Tie-Breaker Logic - Rank Counts
  const rankCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTeams.forEach(t => {
          const edit = edits[t.teamId];
          const rank = edit?.rank ?? (viewScope === 'area' ? String(getAreaInfo(t)?.rank || '') : String(t.rank || ''));
          if (rank) {
              counts[rank] = (counts[rank] || 0) + 1;
          }
      });
      return counts;
  }, [filteredTeams, edits, viewScope]);

  const activityProgress = useMemo(() => {
      const total = filteredTeams.length;
      const recorded = filteredTeams.filter(t => {
          let score = 0;
          if (viewScope === 'area') {
              const info = getAreaInfo(t);
              score = (info?.score || 0);
          } else {
            score = t.score;
          }
          return score > 0 || score === -1;
      }).length;
      const percent = total > 0 ? Math.round((recorded / total) * 100) : 0;
      return { total, recorded, percent };
  }, [filteredTeams, viewScope]);

  const dirtyCount = useMemo(() => {
    return filteredTeams.filter(t => edits[t.teamId]?.isDirty).length;
  }, [filteredTeams, edits]);

  const batchConfirmData = useMemo<BatchItem[]>(() => {
    if (!selectedActivityId) return [];
    return filteredTeams.map(t => {
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

        const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);

        return {
            id: t.teamId,
            teamName: t.teamName,
            schoolName: school?.SchoolName || t.schoolId,
            score: edit?.score ?? (currentScore !== 0 ? String(currentScore) : ''),
            rank: edit?.rank ?? currentRank ?? '',
            medal: edit?.medal ?? currentMedal ?? '',
            flag: edit?.flag ?? currentFlag ?? '',
            isModified: edit?.isDirty ?? false
        };
    });
  }, [filteredTeams, edits, viewScope, selectedActivityId, data.schools]);

  const singleConfirmData = useMemo(() => {
      if ((confirmState.type !== 'single' && confirmState.type !== 'correction') || !confirmState.teamId) return null;
      const team = filteredTeams.find(t => t.teamId === confirmState.teamId);
      if (!team) return null;
      const edit = edits[team.teamId];
      const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      
      return {
          teamName: team.teamName,
          schoolName: school?.SchoolName || team.schoolId,
          newScore: edit?.score,
          newRank: edit?.rank,
          newMedal: edit?.medal,
          newFlag: edit?.flag
      };
  }, [confirmState, filteredTeams, edits, data.schools]);

  // --- Handlers ---

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

          // Feature 1: Auto-Calculate Medal
          if (field === 'score') {
              const score = parseFloat(value);
              if (!isNaN(score) && score !== -1) {
                  const autoMedal = getAutoMedal(score);
                  baseState.medal = autoMedal; // Update medal automatically
              }
          }

          const newState = { ...baseState, [field]: value, isDirty: true };
          return { ...prev, [teamId]: newState };
      });
  };

  // Feature 4: Excel-like Navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentTeamId: string, currentField: string, index: number) => {
      const isShift = e.shiftKey;
      const columns = viewScope === 'cluster' ? ['score', 'medal', 'rank', 'flag'] : ['score', 'medal', 'rank'];
      const colIndex = columns.indexOf(currentField);
      
      let nextTeamId = currentTeamId;
      let nextField = currentField;
      let shouldFocus = false;

      if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = index + 1;
          if (nextIndex < filteredTeams.length) {
              nextTeamId = filteredTeams[nextIndex].teamId;
              shouldFocus = true;
          }
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = index - 1;
          if (prevIndex >= 0) {
              nextTeamId = filteredTeams[prevIndex].teamId;
              shouldFocus = true;
          }
      } else if (e.key === 'ArrowRight' && !isShift) {
          // If in text input and cursor not at end, don't move
          const target = e.target as HTMLInputElement;
          if (target.type === 'text' || target.type === 'number') {
              if (target.selectionStart !== target.value.length) return;
          }
          
          if (colIndex < columns.length - 1) {
              e.preventDefault();
              nextField = columns[colIndex + 1];
              shouldFocus = true;
          }
      } else if (e.key === 'ArrowLeft' && !isShift) {
          const target = e.target as HTMLInputElement;
          if (target.type === 'text' || target.type === 'number') {
              if (target.selectionStart !== 0) return;
          }

          if (colIndex > 0) {
              e.preventDefault();
              nextField = columns[colIndex - 1];
              shouldFocus = true;
          }
      }

      if (shouldFocus) {
          const refKey = `${nextTeamId}-${nextField}`;
          const el = cellRefs.current[refKey];
          if (el) {
              el.focus();
              if (el instanceof HTMLInputElement) {
                  el.select();
              }
          }
      }
  };

  const handleAutoRank = () => {
    const teamsByCluster: Record<string, typeof filteredTeams> = {};
    
    filteredTeams.forEach(team => {
        const groupKey = viewScope === 'area' ? 'Area' : (data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolCluster || 'Unassigned');
        
        if (!teamsByCluster[groupKey]) teamsByCluster[groupKey] = [];
        teamsByCluster[groupKey].push(team);
    });

    const newEdits: typeof edits = {};

    Object.values(teamsByCluster).forEach(clusterTeams => {
        const teamsWithScores = clusterTeams.map(team => {
            const edit = edits[team.teamId];
            let score = 0;
            if (edit?.score) {
                score = parseFloat(edit.score);
            } else {
                score = viewScope === 'area' ? (getAreaInfo(team)?.score || 0) : team.score;
            }
            return { ...team, currentScore: isNaN(score) ? 0 : score };
        });

        teamsWithScores.sort((a, b) => b.currentScore - a.currentScore);

        let currentRank = 1;
        for (let i = 0; i < teamsWithScores.length; i++) {
            if (i > 0 && teamsWithScores[i].currentScore < teamsWithScores[i - 1].currentScore) {
                currentRank = i + 1;
            }
            
            if (teamsWithScores[i].currentScore > 0) {
                const teamId = teamsWithScores[i].teamId;
                const rankStr = String(currentRank);
                
                const prevEdit = edits[teamId];
                let currentSavedRank = '';
                if (viewScope === 'area') {
                    currentSavedRank = String(getAreaInfo(teamsWithScores[i])?.rank || '');
                } else {
                    currentSavedRank = String(teamsWithScores[i].rank || '');
                }
                
                if (prevEdit?.rank !== rankStr && currentSavedRank !== rankStr) {
                    let baseScore = viewScope === 'area' ? (getAreaInfo(teamsWithScores[i])?.score || 0) : teamsWithScores[i].score;
                    let baseMedal = viewScope === 'area' ? (getAreaInfo(teamsWithScores[i])?.medal || '') : teamsWithScores[i].medalOverride;
                    let baseFlag = String(teamsWithScores[i].flag || '');

                    newEdits[teamId] = {
                        score: prevEdit?.score ?? String(baseScore > 0 || baseScore === -1 ? baseScore : ''),
                        rank: rankStr,
                        medal: prevEdit?.medal ?? String(baseMedal || ''),
                        flag: prevEdit?.flag ?? baseFlag,
                        isDirty: true
                    };
                }
            } else if (teamsWithScores[i].currentScore === -1) {
                 const teamId = teamsWithScores[i].teamId;
                 const prevEdit = edits[teamId];
                 newEdits[teamId] = {
                    score: '-1',
                    rank: '',
                    medal: 'ไม่เข้าร่วมแข่งขัน',
                    flag: prevEdit?.flag ?? String(teamsWithScores[i].flag || ''),
                    isDirty: true
                };
            }
        }
    });

    setEdits(prev => ({ ...prev, ...newEdits }));
    showToast(`คำนวณลำดับ (ระดับ${viewScope === 'area' ? 'เขต' : 'กลุ่ม'}) เรียบร้อยแล้ว`, 'info');
  };

  const handleResetEdits = () => {
      setEdits({});
      setShowResetConfirm(false);
      showToast('ล้างข้อมูลที่แก้ไขแล้ว', 'info');
  };

  const handleClearDraft = () => {
      setEdits({});
      localStorage.removeItem(storageKey);
      showToast('ล้างข้อมูลร่างเรียบร้อยแล้ว', 'info');
  };

  const handlePrintDraft = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          showToast('Pop-up ถูกบล็อก', 'error');
          return;
      }

      const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const scopeTitle = viewScope === 'cluster' ? `ระดับกลุ่มเครือข่าย ${selectedClusterFilter ? `(${data.clusters.find(c => c.ClusterID === selectedClusterFilter)?.ClusterName})` : ''}` : 'ระดับเขตพื้นที่การศึกษา';
      const activityName = currentActivity?.name || '';

      const rows = filteredTeams.map((t, idx) => {
          const edit = edits[t.teamId];
          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          
          let score = edit?.score || (viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score);
          let rank = edit?.rank || (viewScope === 'area' ? (getAreaInfo(t)?.rank || '') : t.rank);
          let medal = edit?.medal || (viewScope === 'area' ? (getAreaInfo(t)?.medal || '') : t.medalOverride);
          
          if (typeof score === 'string') score = parseFloat(score);
          const displayScore = score === -1 ? 'ไม่มา' : (score > 0 ? score : '-');
          
          // Re-calculate medal display if dirty to ensure accuracy
          if (edit && !edit.medal && score > 0 && score !== -1) {
              medal = getAutoMedal(score as number);
          } else if (!medal && score > 0) {
              medal = getAutoMedal(score as number);
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

  const initiateSave = (teamId: string) => {
      const edit = edits[teamId];
      // Only check dirty if NOT in locked mode (because locked mode is always force edit)
      if (!isActivityLocked && (!edit || !edit.isDirty)) return;
      
      const team = teams.find(t => t.teamId === teamId);
      if (!team) return;

      const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const oldScore = viewScope === 'area' ? String(getAreaInfo(team)?.score || 0) : String(team.score);
      const oldRank = viewScope === 'area' ? String(getAreaInfo(team)?.rank || '') : String(team.rank);

      // Handle Correction Mode
      if (isActivityLocked) {
          // In locked/correction mode, we might not have a draft edit yet, so prepopulate with current or new value
          const displayScore = edit?.score || oldScore;
          
          // Must verify change or force open
          setConfirmState({
              isOpen: true,
              type: 'correction',
              teamId,
              batchItems: [{
                  id: teamId,
                  teamName: team.teamName,
                  schoolName: school?.SchoolName || team.schoolId,
                  score: oldScore === '0' ? '-' : oldScore, // Old score for display
                  rank: oldRank || '-',
                  medal: '',
                  flag: '',
                  isModified: true
              }],
              newScore: displayScore === '0' ? '-' : displayScore,
              newRank: edit?.rank || oldRank || '-'
          });
      } else {
          // Standard Save
          if(edit) {
            const score = parseFloat(edit.score);
            if(!isNaN(score) && score !== -1 && (score < 0 || score > 100)) {
                showToast('คะแนนต้องอยู่ระหว่าง 0 - 100 หรือ -1 เท่านั้น', 'error');
                return;
            }
          }
          setConfirmState({
              isOpen: true,
              type: 'single',
              teamId,
              batchItems: [{
                  id: teamId,
                  teamName: team.teamName,
                  schoolName: school?.SchoolName || team.schoolId,
                  score: oldScore === '0' ? '-' : oldScore,
                  rank: oldRank || '-',
                  medal: '',
                  flag: '',
                  isModified: true
              }],
              newScore: edit?.score || '-',
              newRank: edit?.rank || '-'
          });
      }
  };

  const initiateBatchSave = () => {
      const dirtyIds = Object.keys(edits).filter(id => edits[id].isDirty && teams.some(t => t.teamId === id));
      if (dirtyIds.length === 0) return;

      const items: BatchItem[] = dirtyIds.map(id => {
          const t = teams.find(team => team.teamId === id)!;
          const edit = edits[id];
          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          // Just use edit values for batch confirmation list
          
          return {
              id: t.teamId,
              teamName: t.teamName,
              schoolName: school?.SchoolName || t.schoolId,
              score: edit.score || '-',
              rank: edit.rank || '-',
              medal: edit.medal || '',
              flag: edit.flag || '',
              isModified: true
          };
      });

      setConfirmState({
          isOpen: true,
          type: 'batch',
          teamId: null,
          batchItems: items
      });
  };

  const addRecentLog = (teamName: string, schoolName: string, activityName: string, score: string) => {
      const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const displayScore = score === '-1' ? 'ไม่เข้าร่วม' : score;
      setRecentLogs(prev => [{ id: Date.now().toString(), teamName, schoolName, activityName, score: displayScore, time }, ...prev].slice(0, 5));
  };

  const initiateResetActivity = (activityId: string) => {
      setActivityToReset(activityId);
      setConfirmState({ isOpen: true, type: 'reset', teamId: null, batchItems: [] });
  };

  const performUpdate = async (teamId: string, edit: any, remark: string = '') => {
      const finalScore = parseFloat(edit.score);
      const finalRank = edit.rank === 'undefined' ? '' : edit.rank;
      const finalMedal = edit.medal === 'undefined' ? '' : edit.medal;
      
      if (viewScope === 'area') {
          return await updateAreaResult(teamId, finalScore, finalRank, finalMedal, remark);
      } else {
          const finalFlag = edit.flag === 'undefined' ? '' : edit.flag;
          const shouldPromote = String(finalRank) === '1' && String(finalFlag).toUpperCase() === 'TRUE';
          const stage = shouldPromote ? 'Area' : '';
          
          return await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag, stage, remark);
      }
  };

  const handleConfirmSave = async (remark?: string) => {
      const currentActivityName = availableActivities.find(a => a.id === selectedActivityId)?.name || '';

      if (confirmState.type === 'single' || confirmState.type === 'correction') {
        const teamId = confirmState.teamId;
        if (!teamId) return;
        
        // Use edited value or fallback to existing for correction mode
        let edit = edits[teamId];
        if (!edit) {
             const team = teams.find(t => t.teamId === teamId);
             if (team) {
                 const baseScore = viewScope === 'area' ? (getAreaInfo(team)?.score || 0) : team.score;
                 const baseRank = viewScope === 'area' ? (getAreaInfo(team)?.rank || '') : team.rank;
                 const baseMedal = viewScope === 'area' ? (getAreaInfo(team)?.medal || '') : team.medalOverride;
                 const baseFlag = team.flag || '';
                 edit = { 
                     score: String(baseScore), 
                     rank: String(baseRank), 
                     medal: String(baseMedal), 
                     flag: String(baseFlag), 
                     isDirty: true 
                 };
             } else return;
        }

        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setProcessStartTime(Date.now());
        const success = await performUpdate(teamId, edit, remark);
        setIsLoading(false);
        setProcessStartTime(null);

        if (success) {
            onDataUpdate(); 
            // Clear only this edit from local storage state
            const newEdits = { ...edits };
            delete newEdits[teamId];
            setEdits(newEdits);
            
            const team = data.teams.find(t => t.teamId === teamId);
            const school = data.schools.find(s => s.SchoolID === team?.schoolId || s.SchoolName === team?.schoolId);
            addRecentLog(team?.teamName || teamId, school?.SchoolName || '', currentActivityName, edit.score);
            showToast(confirmState.type === 'correction' ? 'แก้ไขข้อมูลสำเร็จ' : 'บันทึกคะแนนเรียบร้อยแล้ว', 'success');
        } else {
            showToast('บันทึกข้อมูลล้มเหลว', 'error');
        }

      } else if (confirmState.type === 'batch') {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        setProcessStartTime(Date.now());

        const dirtyIds = Object.keys(edits).filter(id => edits[id].isDirty && filteredTeams.some(t => t.teamId === id));
        let successCount = 0;
        
        // Initialize Progress
        setProgress({ current: 0, total: dirtyIds.length });

        for (const id of dirtyIds) {
            const edit = edits[id];
            const result = await performUpdate(id, edit);
            if (result) {
                successCount++;
                const team = data.teams.find(t => t.teamId === id);
                const school = data.schools.find(s => s.SchoolID === team?.schoolId || s.SchoolName === team?.schoolId);
                addRecentLog(team?.teamName || id, school?.SchoolName || '', currentActivityName, edit.score);
            }
            // Update Progress
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsLoading(false);
        setProcessStartTime(null);
        setProgress({ current: 0, total: 0 }); // Reset
        onDataUpdate(); 
        
        // Clear saved edits from state and local storage
        const newEdits = { ...edits };
        dirtyIds.forEach(id => delete newEdits[id]);
        setEdits(newEdits);

        if (successCount === dirtyIds.length) {
            // Auto Lock Feature: If batch save successful, lock activity
            handleToggleLock(); // This will trigger lock on backend
            showToast(`บันทึกและประกาศผลสำเร็จ (${successCount} รายการ)`, 'success');
        } else {
             showToast(`บันทึกสำเร็จ ${successCount} จาก ${dirtyIds.length} รายการ`, 'info');
        }
      } else if (confirmState.type === 'reset') {
          if (!activityToReset) return;
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          setIsLoading(true);
          setProcessStartTime(Date.now());

          let targetTeams = allAuthorizedTeams.filter(t => t.activityId === activityToReset);
          
          if (viewScope === 'area') {
              targetTeams = targetTeams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
          } else {
              if (role === 'group_admin') {
                  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
                  const clusterId = userSchool?.SchoolCluster;
                  if (clusterId) {
                      targetTeams = targetTeams.filter(t => {
                          const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                          return s?.SchoolCluster === clusterId;
                      });
                  }
              } else if (role === 'admin' && selectedClusterFilter) {
                  targetTeams = targetTeams.filter(t => {
                      const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                      return s?.SchoolCluster === selectedClusterFilter;
                  });
              }
          }

          let successCount = 0;
          
          // Initialize Progress
          setProgress({ current: 0, total: targetTeams.length });

          for (const team of targetTeams) {
              const blankEdit = { score: '0', rank: '', medal: '', flag: '' }; 
              const result = await performUpdate(team.teamId, blankEdit);
              if (result) successCount++;
              // Update Progress
              setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }

          setIsLoading(false);
          setProcessStartTime(null);
          setProgress({ current: 0, total: 0 }); // Reset
          onDataUpdate();
          setActivityToReset(null);
          showToast(`รีเซ็ตข้อมูล ${successCount} รายการเรียบร้อยแล้ว (${viewScope === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})`, 'success');
      }
  };

  const handlePrintActivityReps = () => { /* ...existing... */ };
  const handlePrintMedalSummary = () => { /* ...existing... */ };

  const handleViewResultList = (activityId: string) => {
      setViewingResultActivity(activityId);
      setShowResultListModal(true);
  };

  const handleScoreSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!selectedActivityId) {
          showToast('กรุณาเลือกกิจกรรมก่อน', 'error');
          return;
      }

      setIsUploadingSheet(true);
      try {
          const base64 = await resizeImage(file, 1200, 1600, 0.8);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `ScoreSheet_${selectedActivityId}_${viewScope}_${timestamp}.jpg`;
          
          // 1. Upload Image
          const res = await uploadImage(base64, filename);
          
          if (res.status === 'success' && res.fileId) {
              // 2. Save Metadata
              const saveRes = await saveScoreSheet({
                  activityId: selectedActivityId,
                  scope: viewScope,
                  fileId: res.fileId,
                  fileUrl: res.fileUrl || '',
                  uploadedBy: user?.name || user?.username || 'Unknown'
              });

              if (saveRes) {
                  showToast('อัปโหลดใบคะแนนเรียบร้อยแล้ว', 'success');
                  // Update URL state
                  setScoreSheetUrl(res.fileUrl || `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w1000`);
                  // Optional: Refresh data to show indicator
                  onDataUpdate();
              } else {
                  showToast('บันทึกข้อมูลไม่สำเร็จ', 'error');
              }
          } else {
              showToast('อัปโหลดไฟล์ไม่สำเร็จ: ' + res.message, 'error');
          }
      } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'error');
      } finally {
          setIsUploadingSheet(false);
          if (scoreSheetInputRef.current) scoreSheetInputRef.current.value = '';
      }
  };

  const activityResultList = useMemo(() => {
      if (!viewingResultActivity) return [];
      
      let teams = allAuthorizedTeams.filter(t => t.activityId === viewingResultActivity);
      
      if (viewScope === 'area') {
          teams = teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      } else {
          if (role === 'group_admin') {
              // Already filtered
          } else if (canFilterCluster && selectedClusterFilter) {
              teams = teams.filter(t => {
                  const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                  return s?.SchoolCluster === selectedClusterFilter;
              });
          }
      }

      return teams.map(t => {
          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
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
              ...t,
              schoolName: school?.SchoolName || t.schoolId,
              displayScore: score,
              displayRank: rank,
              displayMedal: medal
          };
      }).sort((a, b) => b.displayScore - a.displayScore);
  }, [allAuthorizedTeams, viewingResultActivity, viewScope, role, selectedClusterFilter, data.schools]);

  // Handle Share Function - Added missing implementation
  const handleShare = async (team: Team) => {
        const activityName = currentActivity?.name || '';
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

  // Handle Share Top 3 Function - Added missing implementation
  const handleShareTop3 = async () => {
        if (!currentActivity) return;
        
        const winners = filteredTeams
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
            showToast('ยังไม่มีข้อมูลลำดับที่ 1-3', 'info');
            return;
        }

        try {
            await shareTop3Result(currentActivity.name, winners);
        } catch (e) {
            console.error(e);
            showToast('ไม่สามารถแชร์ได้', 'error');
        }
  };

  // Validation Warnings Logic - Added useMemo
  const validationWarnings = useMemo(() => {
      if (!selectedActivityId) return [];
      const warnings: string[] = [];
      let rank1Count = 0;
      
      filteredTeams.forEach(t => {
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
  }, [filteredTeams, edits, viewScope, selectedActivityId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <LoadingOverlay isVisible={isLoading} progress={progress} startTime={processStartTime} />
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({...prev, isVisible: false}))} />
      
      {/* Header & Scope Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Edit2 className="w-6 h-6 mr-2 text-blue-600" />
                บันทึกผลการแข่งขัน (Score Entry)
            </h2>
            <p className="text-gray-500 text-sm mt-1">จัดการคะแนนและประกาศผลรางวัล</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
                onClick={() => setShowAnnouncedManager(!showAnnouncedManager)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all border ${showAnnouncedManager ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
                <ListChecks className="w-4 h-4 mr-2" /> 
                จัดการผลการแข่งขันที่บันทึกแล้ว
                {showAnnouncedManager ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>

            <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-full md:w-auto">
                <button
                    onClick={() => setViewScope('cluster')}
                    className={`flex-1 md:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${viewScope === 'cluster' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-2" /> ระดับกลุ่มฯ
                </button>
                <button
                    onClick={() => setViewScope('area')}
                    className={`flex-1 md:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${viewScope === 'area' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Trophy className="w-4 h-4 mr-2" /> ระดับเขตฯ
                </button>
            </div>
        </div>
      </div>

      {/* Announced Activities Manager Section */}
      {showAnnouncedManager && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 animate-in slide-in-from-top-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-indigo-200 pb-2 gap-2">
                  <h3 className="font-bold text-indigo-800 flex items-center">
                      <ListChecks className="w-5 h-5 mr-2" /> 
                      รายการที่ประกาศผลแล้ว ({announcedActivitiesData.length})
                      <span className="text-xs font-normal text-indigo-600 ml-2 bg-indigo-100 px-2 py-0.5 rounded hidden md:inline-block">
                          {viewScope === 'area' ? 'เฉพาะรอบเขตพื้นที่' : 'เฉพาะกลุ่มเครือข่ายของท่าน'}
                      </span>
                  </h3>
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <button 
                            onClick={handleRefresh}
                            className="bg-white border border-indigo-200 text-indigo-700 text-xs rounded px-3 py-1.5 hover:bg-indigo-50 transition-colors flex items-center justify-center md:justify-start"
                            title="อัปเดตข้อมูลล่าสุด"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                        </button>
                        <select 
                            className="bg-white border border-indigo-200 text-indigo-700 text-xs rounded px-2 py-1 focus:outline-none w-full md:w-auto"
                            value={announcedCategoryFilter}
                            onChange={(e) => setAnnouncedCategoryFilter(e.target.value)}
                        >
                            <option value="All">ทุกหมวดหมู่</option>
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input 
                            type="text" 
                            className="bg-white border border-indigo-200 text-xs rounded px-2 py-1 focus:outline-none w-full md:w-48"
                            placeholder="ค้นหากิจกรรม..."
                            value={announcedSearch}
                            onChange={(e) => setAnnouncedSearch(e.target.value)}
                        />
                  </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-indigo-100">
                  <table className="min-w-full divide-y divide-indigo-100">
                      <thead className="bg-indigo-50/50">
                          <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">กิจกรรม</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider w-24">ทีมทั้งหมด</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider w-24">บันทึกแล้ว</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-indigo-700 uppercase tracking-wider w-32">
                                  {viewScope === 'area' ? 'Rank 1 (เขต)' : 'ตัวแทนกลุ่ม (Rank 1 + Q)'}
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-indigo-700 uppercase tracking-wider">จัดการ</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                          {announcedActivitiesData.map((act) => (
                              <tr key={act.id} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="px-4 py-3">
                                      <div className="text-sm font-bold text-gray-800 flex items-center">
                                          {act.name}
                                          {act.isLocked && <span title="Locked"><Lock className="w-3 h-3 ml-2 text-red-500" /></span>}
                                      </div>
                                      <div className="text-xs text-gray-500">{act.category}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm">{act.totalTeams}</td>
                                  <td className="px-4 py-3 text-center text-sm font-bold text-green-600">{act.scoredTeams}</td>
                                  <td className="px-4 py-3 text-center">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">
                                          {act.rank1Count} ทีม
                                      </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => handleViewResultList(act.id)}
                                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                              title="ดูรายชื่อและผลการแข่งขัน"
                                          >
                                              <Eye className="w-4 h-4" />
                                          </button>
                                          {canReset && (
                                              <button 
                                                  onClick={() => initiateResetActivity(act.id)}
                                                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                                                  title="รีเซ็ตผลการแข่งขัน (เฉพาะในขอบเขตนี้)"
                                              >
                                                  <RotateCcw className="w-4 h-4" />
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {announcedActivitiesData.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">ไม่พบข้อมูลกิจกรรมที่ประกาศผลแล้วในระดับนี้</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>

              {/* Mobile/Tablet Card Layout */}
              <div className="md:hidden space-y-3">
                  {announcedActivitiesData.length > 0 ? (
                      announcedActivitiesData.map((act) => (
                          <div key={act.id} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-2">
                              <div>
                                  <div className="font-bold text-gray-800 text-sm leading-tight mb-1 flex items-center">
                                      {act.name}
                                      {act.isLocked && <Lock className="w-3 h-3 ml-2 text-red-500"/>}
                                  </div>
                                  <div className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded w-fit">{act.category}</div>
                              </div>
                              <div className="flex justify-between items-center text-xs mt-2 border-t border-gray-50 pt-2">
                                  <div className="flex gap-3">
                                      <span className="text-gray-500">ทั้งหมด: {act.totalTeams}</span>
                                      <span className="text-green-600 font-bold">บันทึก: {act.scoredTeams}</span>
                                  </div>
                                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
                                      {viewScope === 'area' ? 'ที่ 1' : 'ตัวแทน'}: {act.rank1Count}
                                  </span>
                              </div>
                              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                                  <button 
                                      onClick={() => handleViewResultList(act.id)}
                                      className="flex-1 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-xs font-bold flex items-center justify-center"
                                  >
                                      <Eye className="w-3.5 h-3.5 mr-1.5" /> ดูผล
                                  </button>
                                  {canReset && (
                                      <button 
                                          onClick={() => initiateResetActivity(act.id)}
                                          className="flex-1 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded text-xs font-bold flex items-center justify-center"
                                      >
                                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> รีเซ็ต
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="text-center py-8 text-gray-400 italic bg-white rounded-xl border border-dashed border-gray-200">
                          ไม่พบข้อมูลกิจกรรมที่ประกาศผลแล้วในระดับนี้
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Completion Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group">
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">บันทึกแล้ว</div>
                    <div className="text-2xl font-black text-gray-800">{completionStats.scoredActivities} <span className="text-xs font-normal text-gray-400">รายการ</span></div>
                    <div className="text-[10px] text-green-600 font-bold">{completionStats.scoredTeams} ทีม</div>
                </div>
          </div>

          <div 
            onClick={() => setShowPendingActivities(!showPendingActivities)}
            className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all"
          >
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">ยังไม่บันทึก (ค้าง)</div>
                    <div className="text-2xl font-black text-amber-600">{completionStats.pendingActivities} <span className="text-xs font-normal text-gray-400">รายการ</span></div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        {completionStats.totalPendingTeams > 0 && (
                            <div className="text-[10px] text-red-500 font-bold flex items-center">
                                <Calculator className="w-3 h-3 mr-1" /> ค้างคะแนน {completionStats.totalPendingTeams} ทีม
                            </div>
                        )}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-300 transition-transform ${showPendingActivities ? 'rotate-180' : ''}`} />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <PieChart className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">ความคืบหน้า</div>
                    <div className="text-2xl font-black text-gray-800">{globalStats.percent}%</div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${globalStats.percent}%` }}></div>
                    </div>
                </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-5 rounded-2xl shadow-md flex items-center gap-4 text-white">
                <div className="p-3 bg-white/20 rounded-2xl">
                    <Crown className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-xs font-bold text-white/80 uppercase tracking-wider">เหรียญทองรวม</div>
                    <div className="text-2xl font-black">{globalStats.gold} <span className="text-xs font-normal opacity-80">เหรียญ</span></div>
                </div>
          </div>
      </div>

      {/* Conditional: Pending Activities List */}
      {showPendingActivities && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 animate-in slide-in-from-top-2">
              <h4 className="text-xs font-bold text-amber-700 mb-3 flex items-center">
                  <ListChecks className="w-4 h-4 mr-2" /> 
                  {viewScope === 'cluster' ? 'กิจกรรมที่ยังไม่สมบูรณ์ (ค้างคะแนน หรือ ขาดตัวแทนที่ 1 + Q)' : 'เลือกกิจกรรมที่ยังค้างคะแนน'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {completionStats.pendingList.map(act => (
                      <button 
                        key={act.id}
                        onClick={() => {
                            setSelectedCategory(act.category);
                            setSelectedActivityId(act.id);
                            setShowPendingActivities(false);
                        }}
                        className="text-left p-3 bg-white border border-amber-200 rounded-xl hover:border-amber-500 hover:shadow-md transition-all group"
                      >
                          <div className="font-bold text-gray-800 truncate mb-1">{act.name}</div>
                          <div className="flex flex-wrap gap-1">
                             {act.reason.unscored > 0 && (
                                 <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100">
                                     ค้าง {act.reason.unscored} ทีม
                                 </span>
                             )}
                             {viewScope === 'cluster' && act.reason.missingRep && (
                                 <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-bold">
                                     ขาดตัวแทน
                                 </span>
                             )}
                          </div>
                      </button>
                  ))}
                  {completionStats.pendingList.length === 0 && (
                      <div className="col-span-full py-6 text-center text-green-600 font-bold text-sm bg-white rounded-xl border border-dashed border-green-200">
                          ✨ ยอดเยี่ยม! ดำเนินการครบถ้วนทุกกิจกรรมแล้ว
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Selection Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">1. เลือกหมวดหมู่</label>
              <SearchableSelect 
                options={availableCategories.map(cat => ({ label: cat, value: cat }))}
                value={selectedCategory}
                onChange={(val) => { setSelectedCategory(val); setSelectedActivityId(''); }}
                placeholder="-- ค้นหาหมวดหมู่ --"
                icon={<Filter className="h-4 w-4" />}
              />
          </div>
          <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">2. เลือกรายการแข่งขัน</label>
              <SearchableSelect 
                options={filteredActivities.map(act => ({ label: act.name, value: act.id }))}
                value={selectedActivityId}
                onChange={setSelectedActivityId}
                placeholder="-- ค้นหารายการแข่งขัน --"
                disabled={!selectedCategory}
                icon={<Trophy className="h-4 w-4" />}
              />
          </div>
          {canFilterCluster && selectedActivityId && (
              <div className="flex-1 animate-in fade-in slide-in-from-left-2">
                  <label className="block text-sm font-medium text-purple-700 mb-2 flex items-center">
                      <LayoutGrid className="w-4 h-4 mr-1"/> กรองกลุ่มเครือข่าย (Admin)
                  </label>
                  <SearchableSelect 
                    options={[
                        { label: 'แสดงทุกกลุ่มเครือข่าย', value: '' },
                        ...data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))
                    ]}
                    value={selectedClusterFilter}
                    onChange={setSelectedClusterFilter}
                    placeholder="-- เลือกกลุ่มเครือข่าย --"
                    icon={<LayoutGrid className="h-4 w-4" />}
                  />
              </div>
          )}
      </div>

      {/* Activity Context Header */}
      {currentActivity && (
          <div className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isActivityLocked ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
              <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center ${isActivityLocked ? 'text-red-600' : 'text-blue-600'}`}>
                      {isActivityLocked ? <><Lock className="w-4 h-4 mr-1"/> ประกาศผลแล้ว (LOCKED)</> : <><GraduationCap className="w-4 h-4 mr-1"/> ระดับชั้นการแข่งขัน</>}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{parseLevels(currentActivity.levels)}</h3>
              </div>
              <div className="flex items-center gap-3">
                  {/* View Score Sheet Button */}
                  {scoreSheetUrl ? (
                      <a 
                          href={scoreSheetUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                          <FileSearch className="w-4 h-4 mr-1.5" /> ดูใบคะแนน
                      </a>
                  ) : (
                      <span className="text-xs text-gray-400 italic">ไม่มีใบคะแนน</span>
                  )}

                  {canLock && (
                      <button 
                          onClick={handleToggleLock}
                          disabled={isLoading}
                          className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm ${isActivityLocked ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                          title={isActivityLocked ? "ปลดล็อกการกรอกคะแนน" : "ล็อกและประกาศผล"}
                      >
                          {isLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin"/> : (isActivityLocked ? <Unlock className="w-4 h-4 mr-1.5" /> : <Lock className="w-4 h-4 mr-1.5" />)}
                          {isActivityLocked ? 'UNLOCK' : 'LOCK'}
                      </button>
                  )}
                  <div className="text-sm text-gray-600 bg-white/50 px-3 py-2 rounded-lg border border-blue-100">
                      <span className="block text-xs text-gray-400 mb-0.5">ประเภท</span>
                      <span className="font-medium text-blue-800">{currentActivity.mode === 'Team' ? 'ทีม' : 'เดี่ยว'} ({currentActivity.reqStudents} คน)</span>
                  </div>
              </div>
          </div>
      )}

      {/* Table Section */}
      {selectedActivityId && (
          <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div className="w-full md:w-1/2">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-gray-700">
                                {selectedClusterFilter 
                                    ? `รายการนี้ (${data.clusters.find(c => c.ClusterID === selectedClusterFilter)?.ClusterName})` 
                                    : 'ภาพรวมรายการนี้'
                                } บันทึกแล้ว
                            </span>
                            <span className="text-xs text-gray-500">{activityProgress.recorded} / {activityProgress.total} ทีม</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${activityProgress.percent}%` }}></div>
                        </div>
                   </div>
                   <div className="w-full md:w-auto flex items-center gap-2">
                         <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                                placeholder="ค้นหาชื่อทีม..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                         </div>
                         <button
                            onClick={() => setShowUnscoredOnly(!showUnscoredOnly)}
                            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 text-sm font-bold ${showUnscoredOnly ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-inner' : 'bg-white border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            title={showUnscoredOnly ? "แสดงทั้งหมด" : "แสดงเฉพาะที่ยังไม่บันทึก"}
                         >
                            {showUnscoredOnly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            <span className="hidden sm:inline">คัดกรอง: ยังไม่ตัดสิน</span>
                         </button>
                         
                         {/* Upload Score Sheet Button */}
                         <div className="relative">
                             <input 
                                type="file" 
                                ref={scoreSheetInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleScoreSheetUpload} 
                             />
                             <button 
                                onClick={() => scoreSheetInputRef.current?.click()}
                                disabled={isUploadingSheet || isActivityLocked}
                                className={`p-2 border rounded-lg transition-colors whitespace-nowrap flex items-center ${isActivityLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                                title="แนบใบคะแนนรวม"
                             >
                                 {isUploadingSheet ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileCheck className="w-4 h-4" />}
                             </button>
                         </div>

                         <button 
                            onClick={handleShareTop3}
                            className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap flex items-center"
                            title="แชร์ผลทาง LINE"
                         >
                             <Share2 className="w-4 h-4" />
                         </button>
                         
                         {/* Print Draft Button */}
                         <button 
                            onClick={handlePrintDraft}
                            className="p-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap flex items-center"
                            title="พิมพ์ใบสรุปคะแนน (ร่าง)"
                         >
                             <Printer className="w-4 h-4" />
                         </button>
                   </div>
              </div>

              {/* Validation Warning Banner */}
              {validationWarnings.length > 0 && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm animate-pulse">
                      <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-orange-600 mr-3 mt-0.5 shrink-0" />
                          <div>
                              <h4 className="text-sm font-bold text-orange-800">พบข้อควรระวัง (Validation Warnings)</h4>
                              <ul className="list-disc list-inside mt-1 text-xs text-orange-700 space-y-1">
                                  {validationWarnings.map((w, i) => (
                                      <li key={i}>{w}</li>
                                  ))}
                              </ul>
                          </div>
                      </div>
                  </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className={viewScope === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">#</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                      {viewScope === 'area' ? 'คะแนนเขต' : 'คะแนนกลุ่ม'}
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">เหรียญ</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">ลำดับ</th>
                                  {viewScope === 'cluster' && (
                                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ตัวแทน (Q)</th>
                                  )}
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                     <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => setShowAutoRankConfirm(true)}
                                            className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded text-xs hover:bg-purple-100 transition-colors shadow-sm disabled:opacity-50"
                                            title="คำนวณลำดับอัตโนมัติ"
                                            disabled={isActivityLocked}
                                        >
                                            <Wand2 className="w-3 h-3 mr-1" /> Auto Rank
                                        </button>

                                        {/* Clear Draft Button */}
                                        {Object.keys(edits).length > 0 && !isActivityLocked && (
                                            <button 
                                                onClick={handleClearDraft}
                                                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded text-xs hover:bg-gray-200 transition-colors"
                                                title="ล้างข้อมูลร่างทั้งหมด"
                                            >
                                                <X className="w-3 h-3 mr-1" /> Clear Draft
                                            </button>
                                        )}

                                        {dirtyCount > 0 ? (
                                            <>
                                                <button 
                                                    onClick={() => setShowResetConfirm(true)}
                                                    className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs hover:bg-red-100 transition-colors"
                                                    disabled={isActivityLocked}
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                                </button>
                                                <button 
                                                    onClick={initiateBatchSave}
                                                    className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors shadow-sm animate-pulse disabled:opacity-50 disabled:animate-none"
                                                    disabled={isActivityLocked}
                                                >
                                                    <ListChecks className="w-3 h-3 mr-1" /> Save All ({dirtyCount})
                                                </button>
                                            </>
                                        ) : "Actions"}
                                     </div>
                                  </th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {filteredTeams.map((team, idx) => {
                                  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                                  const edit = edits[team.teamId];
                                  
                                  let currentScore = 0;
                                  let currentRank = "";
                                  let currentMedal = "";
                                  let currentFlag = "";
                                  let currentRemark = "";

                                  if (viewScope === 'area') {
                                      const info = getAreaInfo(team);
                                      currentScore = info?.score || 0;
                                      currentRank = info?.rank || "";
                                      currentMedal = info?.medal || "";
                                      currentRemark = team.areaRemark || "";
                                  } else {
                                      currentScore = team.score;
                                      currentRank = team.rank;
                                      currentMedal = team.medalOverride;
                                      currentFlag = team.flag;
                                      currentRemark = team.clusterRemark || "";
                                  }

                                  const displayScore = edit?.score ?? (currentScore !== 0 ? String(currentScore) : '');
                                  const displayRank = edit?.rank ?? currentRank ?? '';
                                  const displayMedal = edit?.medal ?? currentMedal ?? '';
                                  const displayFlag = edit?.flag ?? currentFlag ?? '';
                                  
                                  const isDirty = edit?.isDirty;

                                  const calculatedMedal = calculateMedal(displayScore, displayMedal);
                                  
                                  const numScore = parseFloat(displayScore);
                                  const scorePercent = isNaN(numScore) ? 0 : Math.min(100, Math.max(0, numScore));
                                  const scoreColor = numScore === -1 ? 'bg-gray-400' : (numScore >= 80 ? 'bg-green-500' : numScore >= 70 ? 'bg-blue-500' : numScore >= 60 ? 'bg-orange-400' : 'bg-red-400');

                                  const disabledInput = (viewScope === 'area' && !canScoreArea) || isActivityLocked;
                                  const isUnscored = currentScore === 0 && (!edit?.score || parseFloat(edit.score) === 0);
                                  const isAbsent = numScore === -1;
                                  
                                  // Feature 2: Check for Duplicate Rank
                                  const isDuplicateRank = displayRank && rankCounts[displayRank] > 1;

                                  return (
                                      <tr key={team.teamId} className={`transition-colors ${isDirty ? "bg-blue-50/50" : (isAbsent ? "bg-gray-50 opacity-80" : (isUnscored ? "bg-red-50/20 border-l-4 border-l-red-300" : (currentScore > 0 ? "bg-green-50/20" : "")))}`}>
                                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{idx + 1}</td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="ml-0">
                                                  <div className="text-sm font-bold text-gray-900">{team.teamName}</div>
                                                  <div className="text-xs text-gray-500">{school?.SchoolName}</div>
                                                  {isAbsent && <div className="text-[10px] text-gray-400 font-bold uppercase mt-1"># ไม่เข้าร่วมการแข่งขัน</div>}
                                                  {currentRemark && <div className="text-[10px] text-red-600 bg-red-50 inline-block px-1.5 rounded mt-1 border border-red-100">Correction: {currentRemark}</div>}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                              <div className="relative">
                                                  <input 
                                                    ref={(el) => { cellRefs.current[`${team.teamId}-score`] = el; }}
                                                    type="number" step="0.01" min="-1" max="100"
                                                    className={`w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDirty ? 'border-blue-400 bg-white font-bold' : 'border-gray-300'} ${disabledInput ? 'bg-gray-100 cursor-not-allowed' : ''} ${isAbsent ? 'text-gray-400' : ''}`}
                                                    value={displayScore}
                                                    onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, team.teamId, 'score', idx)}
                                                    placeholder="0.00"
                                                    disabled={disabledInput}
                                                  />
                                                  {displayScore && (
                                                      <div className={`absolute bottom-0 left-0 h-0.5 ${scoreColor} transition-all duration-300`} style={{ width: isAbsent ? '100%' : `${scorePercent}%`, opacity: 0.6 }}></div>
                                                  )}
                                              </div>
                                              <div className="text-[9px] text-gray-400 mt-1">* กรอก -1 หากไม่มาแข่ง</div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                              <select 
                                                ref={(el) => { cellRefs.current[`${team.teamId}-medal`] = el as any; }}
                                                className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${disabledInput ? 'bg-gray-100 cursor-not-allowed' : ''} ${isAbsent ? 'bg-gray-50 text-gray-500' : ''}`}
                                                value={displayMedal}
                                                onChange={(e) => handleInputChange(team.teamId, 'medal', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, team.teamId, 'medal', idx)}
                                                disabled={disabledInput || isAbsent}
                                              >
                                                  <option value="">- Auto -</option>
                                                  {isAbsent && <option value="ไม่เข้าร่วมแข่งขัน">ไม่เข้าร่วมแข่งขัน</option>}
                                                  <option value="Gold">Gold</option>
                                                  <option value="Silver">Silver</option>
                                                  <option value="Bronze">Bronze</option>
                                                  <option value="Participant">Participant</option>
                                              </select>
                                              {(!displayMedal || displayMedal === "") && displayScore && (
                                                  <span className={`absolute right-8 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none bg-white px-1 ${isAbsent ? 'text-red-500' : 'text-gray-400'}`}>
                                                      ({calculatedMedal})
                                                  </span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                               <input 
                                                ref={(el) => { cellRefs.current[`${team.teamId}-rank`] = el; }}
                                                type="text" 
                                                className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center 
                                                    ${disabledInput || isAbsent ? 'bg-gray-100 cursor-not-allowed text-gray-300' : ''}
                                                    ${isDuplicateRank ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-gray-300'}
                                                `}
                                                value={isAbsent ? '' : displayRank}
                                                onChange={(e) => handleInputChange(team.teamId, 'rank', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, team.teamId, 'rank', idx)}
                                                placeholder="-"
                                                disabled={disabledInput || isAbsent}
                                              />
                                              {isDuplicateRank && (
                                                  <span className="absolute -top-2 -right-1 text-red-500" title="ลำดับซ้ำกัน (Duplicate Rank)">
                                                      <AlertTriangle className="w-4 h-4 fill-white" />
                                                  </span>
                                              )}
                                          </td>
                                          {viewScope === 'cluster' && (
                                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                                  <input 
                                                    ref={(el) => { cellRefs.current[`${team.teamId}-flag`] = el as any; }}
                                                    type="checkbox"
                                                    disabled={isAbsent || disabledInput}
                                                    className="w-5 h-5 accent-blue-600 cursor-pointer disabled:opacity-30"
                                                    checked={String(displayFlag).toUpperCase() === 'TRUE'}
                                                    onChange={(e) => handleInputChange(team.teamId, 'flag', e.target.checked ? 'TRUE' : '')}
                                                    onKeyDown={(e) => handleKeyDown(e, team.teamId, 'flag', idx)}
                                                  />
                                              </td>
                                          )}
                                          <td className="px-6 py-4 whitespace-nowrap text-right">
                                              <div className="flex items-center justify-end space-x-2">
                                                  {isActivityLocked ? (
                                                      <button 
                                                        onClick={() => initiateSave(team.teamId)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-orange-200 text-xs font-bold rounded-md shadow-sm text-orange-700 bg-orange-50 hover:bg-orange-100 transition-all"
                                                        title="แก้ไขคะแนนด่วน (Correction)"
                                                      >
                                                          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> แก้ไข
                                                      </button>
                                                  ) : (
                                                      <button 
                                                        disabled={!isDirty || disabledInput}
                                                        onClick={() => initiateSave(team.teamId)}
                                                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-md shadow-sm text-white focus:outline-none transition-all
                                                            ${(!isDirty || disabledInput) 
                                                                ? 'bg-gray-300 cursor-default opacity-50' 
                                                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                                                            }`}
                                                      >
                                                          <Save className="w-4 h-4 mr-1" /> บันทึก
                                                      </button>
                                                  )}
                                                  
                                                  {(currentScore > 0 || currentScore === -1) && !isDirty && (
                                                      <button 
                                                        onClick={() => handleShare(team)}
                                                        className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors border border-green-200"
                                                        title="แชร์ผลทาง LINE"
                                                      >
                                                          <Share2 className="w-4 h-4" />
                                                      </button>
                                                  )}
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              })}
                              {filteredTeams.length === 0 && (
                                  <tr><td colSpan={viewScope === 'cluster' ? 7 : 6} className="px-6 py-10 text-center text-gray-500">ไม่พบข้อมูลทีมในรายการนี้</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Summary Table: Full Activity Results (Replaced Rep Summary) */}
      {showResultListModal && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className={`p-4 border-b border-gray-100 flex justify-between items-center shrink-0 ${viewScope === 'area' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                      <div>
                          <h3 className="font-bold text-lg flex items-center">
                              <Trophy className="w-5 h-5 mr-2" />
                              สรุปผลการแข่งขัน ({viewScope === 'area' ? 'ระดับเขตพื้นที่' : 'ระดับกลุ่มเครือข่าย'})
                          </h3>
                          <p className="text-white/80 text-xs mt-0.5">
                              {viewingResultActivity ? data.activities.find(a => a.id === viewingResultActivity)?.name : ''}
                          </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowResultListModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                      {activityResultList.length > 0 ? (
                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <table className="min-w-full text-sm divide-y divide-gray-100">
                                  <thead className="bg-gray-50">
                                      <tr>
                                          <th className="px-4 py-3 text-center w-16">อันดับ</th>
                                          <th className="px-4 py-3 text-left">ทีม</th>
                                          <th className="px-4 py-3 text-left">โรงเรียน</th>
                                          <th className="px-4 py-3 text-center w-24">คะแนน</th>
                                          <th className="px-4 py-3 text-left">รางวัล</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {activityResultList.map((t, idx) => (
                                          <tr key={idx} className={`hover:bg-gray-50 ${(viewScope === 'area' && t.displayRank === '1') || (viewScope === 'cluster' && t.displayRank === '1' && String(t.flag).toUpperCase() === 'TRUE') ? 'bg-yellow-50/50' : ''}`}>
                                              <td className="px-4 py-3 text-center font-bold text-gray-500">
                                                  {t.displayRank ? `#${t.displayRank}` : '-'}
                                              </td>
                                              <td className="px-4 py-3 font-medium text-gray-900">{t.teamName}</td>
                                              <td className="px-4 py-3 text-gray-600">{t.schoolName}</td>
                                              <td className="px-4 py-3 text-center font-bold text-blue-600">
                                                  {t.displayScore === -1 ? '-' : t.displayScore}
                                              </td>
                                              <td className="px-4 py-3 text-xs">
                                                  <span className={`px-2 py-1 rounded border ${t.displayMedal.includes('Gold') ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : t.displayMedal.includes('Silver') ? 'bg-gray-100 text-gray-800 border-gray-200' : t.displayMedal.includes('Bronze') ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                      {t.displayMedal}
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                              <ListChecks className="w-12 h-12 mb-2 opacity-20" />
                              <p className="text-sm">ไม่พบรายการข้อมูลในขอบเขตนี้</p>
                          </div>
                      )}
                  </div>
                  <div className="p-3 bg-white border-t border-gray-200 text-right text-xs text-gray-500 font-medium">
                      รวมทั้งหมด {activityResultList.length} ทีม
                  </div>
              </div>
          </div>
      )}

      {!selectedActivityId && !showAnnouncedManager && (
          <div className="text-center py-20 text-gray-400 opacity-50">
              <Calculator className="w-16 h-16 mx-auto mb-4" />
              <p>เลือกรายการแข่งขันเพื่อเริ่มให้คะแนน</p>
              <div className="mt-2 text-xs opacity-70">คุณสามารถคลิกที่แถบ "ยังไม่บันทึก" ด้านบน เพื่อเข้าถึงกิจกรรมที่ค้างอยู่ได้ทันที</div>
          </div>
      )}

      {/* Confirmation Modal */}
      {confirmState.isOpen && (
          <ConfirmModal 
              isOpen={confirmState.isOpen}
              type={confirmState.type}
              count={dirtyCount}
              totalCount={batchConfirmData.length}
              teamName={singleConfirmData?.teamName}
              schoolName={singleConfirmData?.schoolName} // Pass school name
              newScore={singleConfirmData?.newScore}
              newRank={singleConfirmData?.newRank}
              newMedal={singleConfirmData?.newMedal}
              newFlag={singleConfirmData?.newFlag}
              batchItems={batchConfirmData}
              viewScope={viewScope}
              onConfirm={handleConfirmSave}
              onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          />
      )}

      {/* Auto Rank Alert Modal */}
      <ConfirmationModal
          isOpen={showAutoRankConfirm}
          title="คำนวณลำดับคะแนนอัตโนมัติ"
          description={`ระบบจะเรียงลำดับ (Rank 1, 2, 3...) ตามคะแนนจากมากไปน้อย (ระดับ${viewScope === 'area' ? 'เขต' : 'กลุ่ม'}) ข้อมูลลำดับเดิมที่กรอกไว้จะถูกทับ`}
          confirmLabel="คำนวณทันที"
          confirmColor="blue"
          onConfirm={() => {
              handleAutoRank();
              setShowAutoRankConfirm(false);
          }}
          onCancel={() => setShowAutoRankConfirm(false)}
      />

      {/* Reset Alert Modal */}
      <ConfirmationModal
          isOpen={showResetConfirm}
          title="ล้างข้อมูลที่แก้ไข"
          description="คุณต้องการรีเซ็ตข้อมูลคะแนนที่กำลังแก้ไขทั้งหมดในหน้านี้ใช่หรือไม่? (ข้อมูลที่บันทึกไปแล้วจะไม่หาย)"
          confirmLabel="รีเซ็ต"
          confirmColor="red"
          onConfirm={handleResetEdits}
          onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default ScoreEntry;
