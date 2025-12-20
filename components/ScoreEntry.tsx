import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, Team, AreaStageInfo } from '../types';
import { updateTeamResult, updateAreaResult } from '../services/api';
import { shareScoreResult, shareTop3Result } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Trophy, Search, ChevronRight, Share2, AlertTriangle, Calculator, X, Copy, PieChart, Check, ChevronDown, Flag, History, Loader2, ListChecks, Edit2, Crown, LayoutGrid, AlertOctagon, Wand2, Eye, EyeOff, ArrowDownWideNarrow, GraduationCap, Printer, School, FileBadge, UserX, ClipboardCheck, BarChart3, ClipboardList, RotateCcw, ChevronUp, Timer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';

// --- Types & Interfaces ---

interface ScoreEntryProps {
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
    type: 'single' | 'batch' | 'reset';
    count?: number;
    totalCount?: number;
    teamName?: string;
    schoolName?: string;
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

interface ProgressState {
    current: number;
    total: number;
    startTime: number | null;
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

const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- Sub-Components ---

const LoadingOverlay: React.FC<{ isVisible: boolean; progress?: ProgressState }> = ({ isVisible, progress }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        let interval: any;
        if (isVisible && progress && progress.startTime) {
            interval = setInterval(() => setNow(Date.now()), 100); // Update every 100ms for smooth timer
        }
        return () => clearInterval(interval);
    }, [isVisible, progress]);

    if (!isVisible) return null;

    const percent = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    const elapsed = progress && progress.startTime ? now - progress.startTime : 0;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-5 w-80 text-center border border-white/20">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    {progress && progress.total > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-800">
                            {percent}%
                        </div>
                    )}
                </div>
                
                <div className="space-y-1">
                    <div className="text-gray-800 font-bold text-lg">กำลังดำเนินการ...</div>
                    {progress && progress.total > 0 ? (
                        <div className="text-sm text-gray-500">
                            ประมวลผลแล้ว {progress.current} จาก {progress.total} รายการ
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500">กรุณาอย่าปิดหน้าต่าง</div>
                    )}
                </div>

                {progress && progress.total > 0 && (
                    <div className="w-full space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-center items-center text-xs font-mono text-gray-400 bg-gray-100 py-1 rounded">
                            <Timer className="w-3 h-3 mr-1" />
                            เวลาที่ใช้: {formatDuration(elapsed)}
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
    if (!props.isOpen) return null;

    const isReset = props.type === 'reset';

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className={`bg-white rounded-xl shadow-xl w-full p-6 space-y-4 flex flex-col max-h-[90vh] ${props.type === 'batch' ? 'max-w-4xl' : 'max-w-sm'}`}>
                <div className={`flex items-center mb-2 shrink-0 ${isReset ? 'text-red-600' : 'text-amber-500'}`}>
                    {isReset ? <AlertCircle className="w-6 h-6 mr-2" /> : <AlertTriangle className="w-6 h-6 mr-2" />}
                    <h3 className="text-lg font-bold text-gray-800">
                        {isReset ? `ยืนยันการรีเซ็ต (${props.viewScope === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})` : `ยืนยันการบันทึก (${props.viewScope === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})`}
                    </h3>
                </div>
                
                {isReset ? (
                    <div>
                        <p className="text-gray-600 text-sm mb-4">
                            คุณกำลังจะลบข้อมูลคะแนน อันดับ และเหรียญรางวัลของทุกทีมในกิจกรรมนี้
                            <br/>
                            <span className="text-xs text-gray-500 font-bold mt-1 block">
                                (เฉพาะข้อมูลในระดับ {props.viewScope === 'area' ? 'เขตพื้นที่' : 'กลุ่มเครือข่าย'} เท่านั้น)
                            </span>
                            <br/>
                            <span className="font-bold text-red-600">การกระทำนี้ไม่สามารถย้อนกลับได้</span>
                        </p>
                    </div>
                ) : props.type === 'single' ? (
                    <div className="overflow-y-auto">
                        <p className="text-gray-600 text-sm">กรุณาตรวจสอบความถูกต้องของข้อมูลทีม <br/>
                        <span className="font-bold text-gray-800">{props.teamName}</span>
                        {props.schoolName && <><br/><span className="text-xs text-gray-500">({props.schoolName})</span></>}
                        </p>
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
                    <button 
                        onClick={props.onConfirm} 
                        className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${isReset ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isReset ? 'ยืนยันการรีเซ็ต' : 'ยืนยันบันทึก'}
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
  
  // 1. Check Permissions & Set Default Scope
  const role = user?.level?.toLowerCase();
  const allowedRoles = ['admin', 'area', 'group_admin', 'score'];
  
  // Improved default state logic: Admin/Area defaults to 'area', others to 'cluster'
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>(
      (role === 'admin' || role === 'area') ? 'area' : 'cluster'
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'single' | 'batch' | 'reset', teamId: string | null }>({ isOpen: false, type: 'single', teamId: null });
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [showUnscoredOnly, setShowUnscoredOnly] = useState(false);
  const [showPendingActivities, setShowPendingActivities] = useState(false);

  // New State for Progress Tracking
  const [resetProgress, setResetProgress] = useState<ProgressState>({ current: 0, total: 0, startTime: null });

  // New State for Announced Management
  const [showAnnouncedManager, setShowAnnouncedManager] = useState(false);
  const [announcedCategoryFilter, setAnnouncedCategoryFilter] = useState('All');
  const [announcedSearch, setAnnouncedSearch] = useState('');
  const [activityToReset, setActivityToReset] = useState<string | null>(null);

  // Modal States for Tables
  const [showResultListModal, setShowResultListModal] = useState(false);
  const [viewingResultActivity, setViewingResultActivity] = useState<string | null>(null);
  const [showRepSummaryModal, setShowRepSummaryModal] = useState(false);
  const [viewingRepActivity, setViewingRepActivity] = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const currentActivity = useMemo(() => {
      return data.activities.find(a => a.id === selectedActivityId);
  }, [data.activities, selectedActivityId]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

  const canFilterCluster = role === 'admin' || role === 'area';
  const canScoreArea = ['admin', 'area', 'score'].includes(role || '');
  const canReset = ['admin', 'area'].includes(role || '') || (role === 'group_admin' && viewScope === 'cluster');

  if (!user || !allowedRoles.includes(role || '')) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Lock className="w-12 h-12 mb-4 text-gray-300" />
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

  // Announced Activities Data
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

          const totalTeams = actTeams.length;
          let scoredTeams = 0;
          let rank1Count = 0;
          const scoredClusters = new Set<string>();
          const clusterReps = new Set<string>(); // Clusters that have a representative

          actTeams.forEach(t => {
              const score = viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score;
              const rank = viewScope === 'area' ? (getAreaInfo(t)?.rank || '') : t.rank;
              const flag = t.flag;
              const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
              const clusterId = school?.SchoolCluster;

              if (score > 0 || score === -1) {
                  scoredTeams++;
                  if (clusterId) scoredClusters.add(clusterId);
              }

              if (viewScope === 'area') {
                  if (String(rank) === '1') {
                      rank1Count++;
                      if (clusterId) clusterReps.add(clusterId);
                  }
              } else {
                  if (String(rank) === '1' && String(flag).toUpperCase() === 'TRUE') {
                      rank1Count++;
                      if (clusterId) clusterReps.add(clusterId);
                  }
              }
          });

          return {
              ...act,
              totalTeams,
              scoredTeams,
              rank1Count,
              isFullyScored: totalTeams > 0 && totalTeams === scoredTeams,
              scoredClustersCount: scoredClusters.size,
              clusterRepCount: clusterReps.size
          };
      }).filter(a => {
          if (a.scoredTeams === 0) return false;
          if (announcedCategoryFilter !== 'All' && a.category !== announcedCategoryFilter) return false;
          if (announcedSearch && !a.name.toLowerCase().includes(announcedSearch.toLowerCase())) return false;
          return true;
      });
  }, [availableActivities, allAuthorizedTeams, viewScope, announcedCategoryFilter, announcedSearch, data.schools, selectedClusterFilter, canFilterCluster, data.clusters]);

  // Representatives List Calculation
  const representativesList = useMemo(() => {
      // Filter teams that are representatives/winners from allAuthorizedTeams
      // We assume allAuthorizedTeams contains relevant teams for the current user role context
      const reps = allAuthorizedTeams.filter(t => {
          if (viewScope === 'area') {
              const info = getAreaInfo(t);
              return String(info?.rank) === '1'; // Area Winner
          } else {
              return String(t.rank) === '1' && String(t.flag).toUpperCase() === 'TRUE'; // Cluster Rep
          }
      });

      return reps.map(t => {
          const act = data.activities.find(a => a.id === t.activityId);
          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          return {
              category: act?.category || '',
              activity: act?.name || t.activityId,
              school: school?.SchoolName || t.schoolId,
              teamName: t.teamName,
              activityId: t.activityId
          };
      });
  }, [allAuthorizedTeams, viewScope, data.activities, data.schools]);

  const representativesListFiltered = useMemo(() => {
      // If specific activity view
      if (viewingRepActivity) {
          // Use activityId for safer filtering instead of name matching
          return representativesList.filter(r => r.activityId === viewingRepActivity);
      }
      return representativesList;
  }, [representativesList, viewingRepActivity]);

  // Completion Stats
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

  // Global Stats
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

  // Filtering
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

        return {
            id: t.teamId,
            teamName: t.teamName,
            schoolName: data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId,
            score: edit?.score ?? (currentScore !== 0 ? String(currentScore) : ''),
            rank: edit?.rank ?? currentRank ?? '',
            medal: edit?.medal ?? currentMedal ?? '',
            flag: edit?.flag ?? currentFlag ?? '',
            isModified: edit?.isDirty ?? false
        };
    });
  }, [filteredTeams, edits, viewScope, selectedActivityId, data.schools]);

  const singleConfirmData = useMemo(() => {
      if (confirmState.type !== 'single' || !confirmState.teamId) return null;
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

          const newState = { ...baseState, [field]: value, isDirty: true };
          return { ...prev, [teamId]: newState };
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = currentIndex + 1;
          if (nextIndex < filteredTeams.length) {
              const nextTeamId = filteredTeams[nextIndex].teamId;
              const nextInput = inputRefs.current[nextTeamId];
              if (nextInput) nextInput.focus();
          }
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = currentIndex - 1;
          if (prevIndex >= 0) {
              const prevTeamId = filteredTeams[prevIndex].teamId;
              const currentInput = inputRefs.current[prevTeamId];
              if (currentInput) currentInput.focus();
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

  const addRecentLog = (teamName: string, schoolName: string, activityName: string, score: string) => {
      const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const displayScore = score === '-1' ? 'ไม่เข้าร่วม' : score;
      setRecentLogs(prev => [{ id: Date.now().toString(), teamName, schoolName, activityName, score: displayScore, time }, ...prev].slice(0, 5));
  };

  // --- Reset Functionality ---
  const initiateResetActivity = (activityId: string) => {
      setActivityToReset(activityId);
      setConfirmState({ isOpen: true, type: 'reset', teamId: null });
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

  const handleShare = async (team: Team) => {
      const activityName = availableActivities.find(a => a.id === team.activityId)?.name || '';
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
          // Use standard shareScoreResult (supports flex message)
          const result = await shareScoreResult(team.teamName, schoolName, activityName, score, medal, rank, team.teamId);
          if (result.success && result.method === 'copy') {
              showToast('คัดลอกผลคะแนนแล้ว', 'success');
          }
      } catch (err) {
          showToast('ไม่สามารถแชร์ได้', 'error');
      }
  };

  const handleShareTop3 = async () => {
      const activity = availableActivities.find(a => a.id === selectedActivityId);
      if (!activity) return;
      
      const teamsInActivity = allAuthorizedTeams.filter(t => t.activityId === selectedActivityId);
      let scopeTeams = teamsInActivity;
      
      if (viewScope === 'area') {
          scopeTeams = teamsInActivity.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }
      
      if (canFilterCluster && selectedClusterFilter) {
          scopeTeams = scopeTeams.filter(t => {
              const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
              return s?.SchoolCluster === selectedClusterFilter;
          });
      }

      const winners = scopeTeams
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

  const handleConfirmSave = async () => {
      const currentActivityName = availableActivities.find(a => a.id === selectedActivityId)?.name || '';

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
            const team = data.teams.find(t => t.teamId === teamId);
            const school = data.schools.find(s => s.SchoolID === team?.schoolId || s.SchoolName === team?.schoolId);
            addRecentLog(team?.teamName || teamId, school?.SchoolName || '', currentActivityName, edit.score);
            showToast('บันทึกคะแนนเรียบร้อยแล้ว', 'success');
        } else {
            showToast('บันทึกข้อมูลล้มเหลว', 'error');
        }

      } else if (confirmState.type === 'batch') {
        setConfirmState({ isOpen: false, type: 'batch', teamId: null });
        setIsLoading(true);

        const dirtyIds = Object.keys(edits).filter(id => edits[id].isDirty && filteredTeams.some(t => t.teamId === id));
        let successCount = 0;

        for (const id of dirtyIds) {
            const edit = edits[id];
            const result = await performUpdate(id, edit);
            if (result) {
                successCount++;
                const team = data.teams.find(t => t.teamId === id);
                const school = data.schools.find(s => s.SchoolID === team?.schoolId || s.SchoolName === team?.schoolId);
                addRecentLog(team?.teamName || id, school?.SchoolName || '', currentActivityName, edit.score);
            }
        }

        setIsLoading(false);
        onDataUpdate(); 
        
        setEdits(prev => {
             const newEdits = { ...prev };
             dirtyIds.forEach(id => delete newEdits[id]);
             return newEdits;
        });

        if (successCount === dirtyIds.length) {
            showToast(`บันทึกข้อมูลทั้งหมด ${successCount} รายการเรียบร้อยแล้ว`, 'success');
        } else {
             showToast(`บันทึกสำเร็จ ${successCount} จาก ${dirtyIds.length} รายการ`, 'info');
        }
      } else if (confirmState.type === 'reset') {
          // --- Reset Logic Optimized with Concurrency ---
          if (!activityToReset) return;
          setConfirmState({ isOpen: false, type: 'reset', teamId: null });
          setIsLoading(true);

          let targetTeams = allAuthorizedTeams.filter(t => t.activityId === activityToReset);
          
          if (viewScope === 'cluster' && role === 'group_admin') {
              const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
              const clusterId = userSchool?.SchoolCluster;
              if (clusterId) {
                  targetTeams = targetTeams.filter(t => {
                      const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                      return s?.SchoolCluster === clusterId;
                  });
              }
          }

          setResetProgress({ current: 0, total: targetTeams.length, startTime: Date.now() });

          let successCount = 0;
          
          // Helper for batch processing
          const processInBatches = async (items: Team[], batchSize: number) => {
              for (let i = 0; i < items.length; i += batchSize) {
                  const chunk = items.slice(i, i + batchSize);
                  const promises = chunk.map(team => {
                      const blankEdit = { score: '0', rank: '', medal: '', flag: '' }; 
                      return performUpdate(team.teamId, blankEdit).then(res => {
                          if (res) successCount++;
                          return res;
                      });
                  });
                  await Promise.all(promises);
                  setResetProgress(prev => ({ ...prev, current: Math.min(prev.total, i + batchSize) }));
              }
          };

          // Execute in batches of 5 to speed up but respect concurrency limits
          await processInBatches(targetTeams, 5);

          setIsLoading(false);
          setResetProgress({ current: 0, total: 0, startTime: null }); // Reset progress
          onDataUpdate();
          setActivityToReset(null);
          showToast(`รีเซ็ตข้อมูล ${successCount} รายการเรียบร้อยแล้ว`, 'success');
      }
  };

  // --- Handlers for Print/Share ---
  const handlePrintActivityReps = () => { /* ...existing... */ };
  const handlePrintMedalSummary = () => { /* ...existing... */ };

  const handleViewReps = (activityId: string) => {
      setViewingRepActivity(activityId);
      setShowRepSummaryModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <LoadingOverlay isVisible={isLoading} progress={resetProgress} />
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
                        {viewScope === 'cluster' && (
                             <div className="text-[10px] text-amber-600 font-bold flex items-center">
                                <Trophy className="w-3 h-3 mr-1" /> ขาดตัวแทน {completionStats.pendingList.filter(a => a.reason.missingRep).length} รายการ
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

      {/* Announced Activities Manager Section */}
      {showAnnouncedManager && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4 border-b border-indigo-200 pb-2">
                  <h3 className="font-bold text-indigo-800 flex items-center">
                      <ListChecks className="w-5 h-5 mr-2" /> 
                      รายการที่ประกาศผลแล้ว ({announcedActivitiesData.length})
                  </h3>
                  <div className="flex gap-2">
                        {/* Filters for this specific table */}
                        <select 
                            className="bg-white border border-indigo-200 text-indigo-700 text-xs rounded px-2 py-1 focus:outline-none"
                            value={announcedCategoryFilter}
                            onChange={(e) => setAnnouncedCategoryFilter(e.target.value)}
                        >
                            <option value="All">ทุกหมวดหมู่</option>
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input 
                            type="text" 
                            className="bg-white border border-indigo-200 text-xs rounded px-2 py-1 focus:outline-none"
                            placeholder="ค้นหากิจกรรม..."
                            value={announcedSearch}
                            onChange={(e) => setAnnouncedSearch(e.target.value)}
                        />
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-indigo-100">
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
                                      <div className="text-sm font-bold text-gray-800">{act.name}</div>
                                      <div className="text-xs text-gray-500">{act.category}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm">{act.totalTeams}</td>
                                  <td className="px-4 py-3 text-center text-sm font-bold text-green-600">{act.scoredTeams}</td>
                                  <td className="px-4 py-3 text-center">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">
                                          {viewScope === 'area' ? act.clusterRepCount : act.scoredClustersCount} {viewScope === 'area' ? 'กลุ่ม/เขต' : 'กลุ่ม'}
                                      </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => handleViewReps(act.id)}
                                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                              title="ดูรายชื่อตัวแทน/ผู้ชนะ"
                                          >
                                              <Eye className="w-4 h-4" />
                                          </button>
                                          {/* Reset Button */}
                                          {canReset && (
                                              <button 
                                                  onClick={() => initiateResetActivity(act.id)}
                                                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                                                  title="รีเซ็ตผลการแข่งขัน"
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
          </div>
      )}

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
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1 flex items-center">
                      <GraduationCap className="w-4 h-4 mr-1"/> ระดับชั้นการแข่งขัน
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{parseLevels(currentActivity.levels)}</h3>
              </div>
              <div className="text-sm text-gray-600 bg-white/50 px-3 py-2 rounded-lg border border-blue-100">
                  <span className="block text-xs text-gray-400 mb-0.5">ประเภท</span>
                  <span className="font-medium text-blue-800">{currentActivity.mode === 'Team' ? 'ทีม' : 'เดี่ยว'} ({currentActivity.reqStudents} คน)</span>
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
                         <button 
                            onClick={handleShareTop3}
                            className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap flex items-center"
                            title="แชร์ผลทาง LINE"
                         >
                             <Share2 className="w-4 h-4" />
                         </button>
                   </div>
              </div>

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
                                            onClick={handleAutoRank}
                                            className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded text-xs hover:bg-purple-100 transition-colors shadow-sm"
                                            title="คำนวณลำดับอัตโนมัติ"
                                        >
                                            <Wand2 className="w-3 h-3 mr-1" /> Auto Rank
                                        </button>

                                        {dirtyCount > 0 ? (
                                            <button 
                                                onClick={initiateBatchSave}
                                                className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors shadow-sm"
                                            >
                                                <ListChecks className="w-3 h-3 mr-1" /> Save All ({dirtyCount})
                                            </button>
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

                                  const calculatedMedal = calculateMedal(displayScore, displayMedal);
                                  
                                  const numScore = parseFloat(displayScore);
                                  const scorePercent = isNaN(numScore) ? 0 : Math.min(100, Math.max(0, numScore));
                                  const scoreColor = numScore === -1 ? 'bg-gray-400' : (numScore >= 80 ? 'bg-green-500' : numScore >= 70 ? 'bg-blue-500' : numScore >= 60 ? 'bg-orange-400' : 'bg-red-400');

                                  const disabledInput = viewScope === 'area' && !canScoreArea;
                                  const isUnscored = currentScore === 0 && (!edit?.score || parseFloat(edit.score) === 0);
                                  const isAbsent = numScore === -1;

                                  return (
                                      <tr key={team.teamId} className={`transition-colors ${isDirty ? "bg-blue-50/50" : (isAbsent ? "bg-gray-50 opacity-80" : (isUnscored ? "bg-red-50/20 border-l-4 border-l-red-300" : (currentScore > 0 ? "bg-green-50/20" : "")))}`}>
                                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{idx + 1}</td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="ml-0">
                                                  <div className="text-sm font-bold text-gray-900">{team.teamName}</div>
                                                  <div className="text-xs text-gray-500">{school?.SchoolName}</div>
                                                  {isAbsent && <div className="text-[10px] text-gray-400 font-bold uppercase mt-1"># ไม่เข้าร่วมการแข่งขัน</div>}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                              <div className="relative">
                                                  <input 
                                                    ref={(el) => { inputRefs.current[team.teamId] = el; }}
                                                    type="number" step="0.01" min="-1" max="100"
                                                    className={`w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDirty ? 'border-blue-400 bg-white font-bold' : 'border-gray-300'} ${disabledInput ? 'bg-gray-100 cursor-not-allowed' : ''} ${isAbsent ? 'text-gray-400' : ''}`}
                                                    value={displayScore}
                                                    onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, idx)}
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
                                                className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${disabledInput ? 'bg-gray-100 cursor-not-allowed' : ''} ${isAbsent ? 'bg-gray-50 text-gray-500' : ''}`}
                                                value={displayMedal}
                                                onChange={(e) => handleInputChange(team.teamId, 'medal', e.target.value)}
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
                                          <td className="px-6 py-4 whitespace-nowrap">
                                               <input 
                                                type="text" 
                                                className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center ${disabledInput || isAbsent ? 'bg-gray-100 cursor-not-allowed text-gray-300' : ''}`}
                                                value={isAbsent ? '' : displayRank}
                                                onChange={(e) => handleInputChange(team.teamId, 'rank', e.target.value)}
                                                placeholder="-"
                                                disabled={disabledInput || isAbsent}
                                              />
                                          </td>
                                          {viewScope === 'cluster' && (
                                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                                  <input 
                                                    type="checkbox"
                                                    disabled={isAbsent}
                                                    className="w-5 h-5 accent-blue-600 cursor-pointer disabled:opacity-30"
                                                    checked={String(displayFlag).toUpperCase() === 'TRUE'}
                                                    onChange={(e) => handleInputChange(team.teamId, 'flag', e.target.checked ? 'TRUE' : '')}
                                                  />
                                              </td>
                                          )}
                                          <td className="px-6 py-4 whitespace-nowrap text-right">
                                              <div className="flex items-center justify-end space-x-2">
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

      {/* Summary Table: Representatives */}
      {showRepSummaryModal && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-purple-600 p-4 border-b border-purple-100 flex justify-between items-center text-white shrink-0">
                      <div>
                          <h3 className="font-bold text-lg flex items-center">
                              <Flag className="w-5 h-5 mr-2" />
                              สรุปรายชื่อโรงเรียนตัวแทนกิจกรรม ({viewScope === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})
                          </h3>
                          <p className="text-purple-100 text-xs mt-0.5">
                              {viewScope === 'area' ? 'รายการกิจกรรมที่ได้ลำดับที่ 1 (ระดับเขต)' : 'รายการทั้งหมดที่มีตัวแทนเข้ารอบ (Rank 1 + Q)'}
                          </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowRepSummaryModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                      <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                              <tr>
                                  <th className="px-4 py-3 text-center w-16">#</th>
                                  <th className="px-4 py-3 text-left">หมวดหมู่</th>
                                  <th className="px-4 py-3 text-left">ชื่อกิจกรรม</th>
                                  <th className="px-4 py-3 text-left">โรงเรียนตัวแทน</th>
                                  <th className="px-4 py-3 text-left">ชื่อทีม</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {representativesListFiltered.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 text-center text-gray-500">{idx + 1}</td>
                                      <td className="px-4 py-3">
                                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100">
                                              {item.category}
                                          </span>
                                      </td>
                                      <td className="px-4 py-3 font-medium text-gray-900">{item.activity}</td>
                                      <td className="px-4 py-3 text-gray-700 font-bold">{item.school}</td>
                                      <td className="px-4 py-3 text-gray-500 italic">{item.teamName}</td>
                                  </tr>
                              ))}
                              {representativesListFiltered.length === 0 && (
                                  <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic">ยังไม่มีข้อมูลตัวแทน</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-3 bg-gray-50 border-t text-right text-xs text-gray-500 font-medium">
                      รวมทั้งหมด {representativesListFiltered.length} รายการ
                  </div>
              </div>
          </div>
      )}

      {!selectedActivityId && !showAnnouncedManager && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
              <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>กรุณาเลือกหมวดหมู่และรายการแข่งขันเพื่อเริ่มบันทึกคะแนน</p>
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
              schoolName={singleConfirmData?.schoolName}
              newScore={singleConfirmData?.newScore}
              newRank={singleConfirmData?.newRank}
              newMedal={singleConfirmData?.newMedal}
              newFlag={singleConfirmData?.newFlag}
              batchItems={batchConfirmData}
              viewScope={viewScope}
              onConfirm={handleConfirmSave}
              onCancel={() => setConfirmState({ isOpen: false, type: 'single', teamId: null })}
          />
      )}
    </div>
  );
};

export default ScoreEntry;
