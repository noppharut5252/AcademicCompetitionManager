
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, Team, AreaStageInfo } from '../types';
import { updateTeamResult, updateAreaResult } from '../services/api';
import { shareScoreResult, shareTop3Result } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Trophy, Search, ChevronRight, Share2, AlertTriangle, Calculator, X, Copy, PieChart, Check, ChevronDown, Flag, History, Loader2, ListChecks, Edit2, Crown, LayoutGrid, AlertOctagon, Wand2, Eye, EyeOff, ArrowDownWideNarrow, GraduationCap, Printer, School, FileBadge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from './SearchableSelect'; // Import shared component

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
    if (manualMedal && manualMedal !== '' && manualMedal !== '- Auto -') return manualMedal;
    const score = parseFloat(scoreStr);
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
                        <p className="text-gray-600 text-sm">กรุณาตรวจสอบความถูกต้องของข้อมูลทีม <br/><span className="font-bold text-gray-800">{props.teamName}</span></p>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm mt-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500">คะแนน:</span>
                                <span className="font-bold text-blue-600 text-lg">{props.newScore}</span>
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
                                                     <span className={`font-bold ${item.isModified ? 'text-blue-700' : 'text-gray-700'}`}>{item.score || '-'}</span>
                                                 </td>
                                                 <td className="px-3 py-2 text-center text-gray-600">{item.rank || '-'}</td>
                                                 <td className="px-3 py-2 text-center text-gray-600">{displayMedal}</td>
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

const ScoreEntry: React.FC<ScoreEntryProps> = ({ data, user, onDataUpdate }) => {
  const navigate = useNavigate();
  
  // State for Scope (Cluster vs Area)
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>('cluster');

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>(''); // For Admin/Area filtering
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'single' | 'batch', teamId: string | null }>({ isOpen: false, type: 'single', teamId: null });
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [showMissingRepList, setShowMissingRepList] = useState(false);
  const [showUnscoredOnly, setShowUnscoredOnly] = useState(false);

  // New: Modal States
  const [repModalData, setRepModalData] = useState<{ schoolName: string; teams: Team[] } | null>(null);
  const [medalDetailData, setMedalDetailData] = useState<{ schoolName: string, medal: string, teams: Team[] } | null>(null);

  // References for keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const currentActivity = useMemo(() => {
      return data.activities.find(a => a.id === selectedActivityId);
  }, [data.activities, selectedActivityId]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

  // 1. Check Permissions
  const role = user?.level?.toLowerCase();
  const allowedRoles = ['admin', 'area', 'group_admin', 'score'];
  const canFilterCluster = role === 'admin' || role === 'area';
  
  // Permissions for Area Score Entry: Admin, Area, Score (Group Admin usually manages Cluster only)
  const canScoreArea = ['admin', 'area', 'score'].includes(role || '');

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

  // Representative Stats Calculation & School Stats
  const { repStats, schoolStats, representativesList } = useMemo(() => {
      // 1. Rep Stats (Missing)
      const activityIds = new Set(availableActivities.map(a => a.id));
      const activitiesWithRep = new Set(
          allAuthorizedTeams
            .filter(t => String(t.flag).toUpperCase() === 'TRUE')
            .map(t => t.activityId)
            .filter(id => activityIds.has(id))
      );
      const missingActivities = availableActivities.filter(a => !activitiesWithRep.has(a.id));

      // 2. School Stats (Medals & Reps)
      const schoolMap: Record<string, { name: string, gold: number, silver: number, bronze: number, repCount: number, repTeams: Team[] }> = {};
      
      // 3. Representatives List (For new table)
      const repList: { activity: string, category: string, school: string, teamName: string }[] = [];

      allAuthorizedTeams.forEach(t => {
          const schoolName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
          
          if (!schoolMap[schoolName]) {
              schoolMap[schoolName] = { name: schoolName, gold: 0, silver: 0, bronze: 0, repCount: 0, repTeams: [] };
          }

          const score = t.score;
          if (score >= 80) schoolMap[schoolName].gold++;
          else if (score >= 70) schoolMap[schoolName].silver++;
          else if (score >= 60) schoolMap[schoolName].bronze++;

          if (String(t.flag).toUpperCase() === 'TRUE' && String(t.rank) === '1') {
              schoolMap[schoolName].repCount++;
              schoolMap[schoolName].repTeams.push(t);
              
              const act = data.activities.find(a => a.id === t.activityId);
              repList.push({
                  activity: act?.name || t.activityId,
                  category: act?.category || 'General',
                  school: schoolName,
                  teamName: t.teamName
              });
          }
      });

      const sortedSchoolStats = Object.values(schoolMap).sort((a, b) => b.repCount - a.repCount || b.gold - a.gold);
      repList.sort((a, b) => a.category.localeCompare(b.category) || a.activity.localeCompare(b.activity));

      return {
          repStats: {
              total: availableActivities.length,
              countWithRep: activitiesWithRep.size,
              countMissing: missingActivities.length,
              missingList: missingActivities
          },
          schoolStats: sortedSchoolStats,
          representativesList: repList
      };
  }, [availableActivities, allAuthorizedTeams, data.schools, data.activities]);


  // Global Dashboard Stats
  const globalStats = useMemo(() => {
      // Filter logic based on View Scope for stats
      const targetTeams = viewScope === 'area' 
        ? allAuthorizedTeams.filter(t => t.stageStatus === 'Area' || t.flag === 'TRUE')
        : allAuthorizedTeams;

      const total = targetTeams.length;
      let scored = 0;
      let gold = 0;
      let silver = 0;
      let bronze = 0;

      targetTeams.forEach(t => {
          let score = 0;
          if (viewScope === 'area') {
              const info = getAreaInfo(t);
              score = info?.score || 0;
          } else {
              score = t.score;
          }

          if (score > 0) scored++;
          if (score >= 80) gold++;
          else if (score >= 70) silver++;
          else if (score >= 60) bronze++;
      });

      const pending = total - scored;
      const percent = total > 0 ? Math.round((scored / total) * 100) : 0;
      return { total, scored, pending, percent, gold, silver, bronze };
  }, [allAuthorizedTeams, viewScope]);

  // Activity Specific Filtering
  const filteredActivities = useMemo(() => {
      if (!selectedCategory) return [];
      return availableActivities.filter(a => a.category === selectedCategory);
  }, [selectedCategory, availableActivities]);

  const filteredTeams = useMemo(() => {
      if (!selectedActivityId) return [];
      let teams = allAuthorizedTeams.filter(t => t.activityId === selectedActivityId);
      
      // If Area Scope, only show qualified teams or teams moved to Area stage
      if (viewScope === 'area') {
          teams = teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }

      // Filter by Cluster (For Admin/Area)
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
            if (edit) return parseFloat(edit.score) <= 0;
            // Check based on scope
            if (viewScope === 'area') {
                const info = getAreaInfo(t);
                return (info?.score || 0) <= 0;
            } else {
                return t.score <= 0;
            }
        });
      }

      return teams.sort((a, b) => {
          // Sort logic
          const scoreA = viewScope === 'area' ? (getAreaInfo(a)?.score || 0) : a.score;
          const scoreB = viewScope === 'area' ? (getAreaInfo(b)?.score || 0) : b.score;
          return scoreB - scoreA;
      }); 
  }, [allAuthorizedTeams, selectedActivityId, searchTerm, showUnscoredOnly, edits, selectedClusterFilter, canFilterCluster, data.schools, viewScope]);

  // Activity Progress
  const activityProgress = useMemo(() => {
      const total = filteredTeams.length;
      const recorded = filteredTeams.filter(t => {
          if (viewScope === 'area') {
              const info = getAreaInfo(t);
              return (info?.score || 0) > 0;
          }
          return t.score > 0;
      }).length;
      const percent = total > 0 ? Math.round((recorded / total) * 100) : 0;
      return { total, recorded, percent };
  }, [filteredTeams, viewScope]);

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
              baseScore = String(info?.score && info.score > 0 ? info.score : '');
              baseRank = String(info?.rank || '');
              baseMedal = String(info?.medal || '');
              // Flag usually not used in Area unless going to National
          } else {
              baseScore = String(team.score > 0 ? team.score : '');
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
              const prevInput = inputRefs.current[prevTeamId];
              if (prevInput) prevInput.focus();
          }
      }
  };

  const handleAutoRank = () => {
    // 1. Group teams by Cluster to ensure ranking is done per network/cluster context
    // This supports scenarios where multiple clusters are viewed at once (e.g. by admin)
    const teamsByCluster: Record<string, typeof filteredTeams> = {};
    
    filteredTeams.forEach(team => {
        // If Area mode, group all together or by some other logic? Usually Area is one big group.
        const groupKey = viewScope === 'area' ? 'Area' : (data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolCluster || 'Unassigned');
        
        if (!teamsByCluster[groupKey]) teamsByCluster[groupKey] = [];
        teamsByCluster[groupKey].push(team);
    });

    const newEdits: typeof edits = {};

    // 2. Process each group
    Object.values(teamsByCluster).forEach(clusterTeams => {
        // Prepare score list
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

        // Sort Descending
        teamsWithScores.sort((a, b) => b.currentScore - a.currentScore);

        // Assign Ranks (1, 2, 3...)
        let currentRank = 1;
        for (let i = 0; i < teamsWithScores.length; i++) {
            if (i > 0 && teamsWithScores[i].currentScore < teamsWithScores[i - 1].currentScore) {
                currentRank = i + 1;
            }
            
            // Only rank if score > 0
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
                
                // Add to edits if changed
                if (prevEdit?.rank !== rankStr && currentSavedRank !== rankStr) {
                    // Reconstruct base edit state if not exists
                    let baseScore = viewScope === 'area' ? (getAreaInfo(teamsWithScores[i])?.score || 0) : teamsWithScores[i].score;
                    let baseMedal = viewScope === 'area' ? (getAreaInfo(teamsWithScores[i])?.medal || '') : teamsWithScores[i].medalOverride;
                    let baseFlag = String(teamsWithScores[i].flag || '');

                    newEdits[teamId] = {
                        score: prevEdit?.score ?? String(baseScore > 0 ? baseScore : ''),
                        rank: rankStr,
                        medal: prevEdit?.medal ?? String(baseMedal || ''),
                        flag: prevEdit?.flag ?? baseFlag,
                        isDirty: true
                    };
                }
            }
        }
    });

    setEdits(prev => ({ ...prev, ...newEdits }));
    showToast(`คำนวณลำดับ (ระดับ${viewScope === 'area' ? 'เขต' : 'กลุ่ม'}) เรียบร้อยแล้ว (กรุณากดบันทึก)`, 'info');
  };

  const initiateSave = (teamId: string) => {
      const edit = edits[teamId];
      if(edit) {
        const score = parseFloat(edit.score);
        if(!isNaN(score) && (score < 0 || score > 100)) {
            showToast('คะแนนต้องอยู่ระหว่าง 0 - 100', 'error');
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
      setRecentLogs(prev => [{ id: Date.now().toString(), teamName, schoolName, activityName, score, time }, ...prev].slice(0, 5));
  };

  const performUpdate = async (teamId: string, edit: any) => {
        const finalScore = parseFloat(edit.score) || 0;
        const finalRank = edit.rank === 'undefined' ? '' : edit.rank;
        const finalMedal = edit.medal === 'undefined' ? '' : edit.medal;
        
        if (viewScope === 'area') {
            // Area Update
            return await updateAreaResult(teamId, finalScore, finalRank, finalMedal);
        } else {
            // Cluster Update
            const finalFlag = edit.flag === 'undefined' ? '' : edit.flag;
            return await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag);
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

      } else {
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
      }
  };

  // --- Printing & Sharing ---

  const handleShare = async (team: Team) => {
     const activityName = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
     const schoolName = data.schools.find(s => s.SchoolID === team.schoolId)?.SchoolName || team.schoolId;
     const medal = calculateMedal(String(team.score), team.medalOverride);
     
     const result = await shareScoreResult(team.teamName, schoolName, activityName, team.score, medal, team.rank);
     
     if (result.success) {
         if (result.method === 'copy') {
             showToast('คัดลอกผลการแข่งขันแล้ว', 'success');
         }
     } else {
         showToast('ไม่สามารถแชร์ข้อมูลได้', 'error');
     }
  };

  const handleShareTop3 = async () => {
    if (filteredTeams.length === 0) return;
    const currentActivityName = availableActivities.find(a => a.id === selectedActivityId)?.name || selectedActivityId;
    
    const sorted = [...filteredTeams].sort((a, b) => {
         const scoreA = edits[a.teamId]?.score ? parseFloat(edits[a.teamId].score) : (viewScope === 'area' ? (getAreaInfo(a)?.score || 0) : a.score);
         const scoreB = edits[b.teamId]?.score ? parseFloat(edits[b.teamId].score) : (viewScope === 'area' ? (getAreaInfo(b)?.score || 0) : b.score);
         return scoreB - scoreA;
    });

    const top3 = sorted.slice(0, 3).map((t, index) => {
        const edit = edits[t.teamId];
        const score = edit?.score ?? String(viewScope === 'area' ? (getAreaInfo(t)?.score || 0) : t.score);
        const manualMedal = edit?.medal ?? (viewScope === 'area' ? (getAreaInfo(t)?.medal || '') : t.medalOverride);
        const medal = calculateMedal(score, manualMedal);
        const schoolName = data.schools.find(s => s.SchoolID === t.schoolId)?.SchoolName || t.schoolId;

        return {
            rank: index + 1,
            teamName: t.teamName,
            schoolName,
            score,
            medal
        };
    });

    const result = await shareTop3Result(currentActivityName, top3);
    if (result.success) {
         if (result.method === 'copy') {
             showToast('คัดลอกผลสรุปแล้ว', 'success');
         }
     } else {
         showToast('ไม่สามารถแชร์ข้อมูลได้', 'error');
     }
  };

  // --- Modal & Print Handlers ---

  const handleMedalClick = (schoolName: string, medalType: string) => {
      const teams = allAuthorizedTeams.filter(t => {
          const sName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
          if (sName !== schoolName) return false;
          
          const score = t.score;
          if (medalType === 'Gold' && score >= 80) return true;
          if (medalType === 'Silver' && score >= 70 && score < 80) return true;
          if (medalType === 'Bronze' && score >= 60 && score < 70) return true;
          return false;
      });
      setMedalDetailData({ schoolName, medal: medalType, teams });
  };

  const handlePrintActivityReps = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const htmlRows = representativesList.map((item, idx) => `
        <tr>
            <td style="text-align:center">${idx + 1}</td>
            <td>${item.category}</td>
            <td>${item.activity}</td>
            <td>${item.school}</td>
            <td>${item.teamName}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <html>
        <head>
            <title>สรุปรายการตัวแทน - ระดับกลุ่มเครือข่าย</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Sarabun', sans-serif; padding: 20px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
                th { background-color: #f0f0f0; }
                h1, h2 { text-align: center; margin: 5px; }
                .meta { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">พิมพ์รายงาน</button>
            </div>
            <h1>สรุปรายชื่อโรงเรียนตัวแทนกิจกรรม</h1>
            <h2>ระดับกลุ่มเครือข่ายพัฒนาคุณภาพการศึกษา</h2>
            <div class="meta">ข้อมูล ณ วันที่ ${date}</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">ที่</th>
                        <th style="width: 15%;">หมวดหมู่</th>
                        <th style="width: 35%;">กิจกรรม</th>
                        <th style="width: 25%;">โรงเรียนตัวแทน</th>
                        <th>ชื่อทีม</th>
                    </tr>
                </thead>
                <tbody>${htmlRows}</tbody>
            </table>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  const handlePrintRepSummary = () => {
      if (!repModalData) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      
      let htmlRows = '';
      repModalData.teams.forEach((t, idx) => {
          const actName = data.activities.find(a => a.id === t.activityId)?.name || t.activityId;
          
          let teachers: any[] = [];
          let students: any[] = [];
          
          try {
              const raw = typeof t.members === 'string' ? JSON.parse(t.members) : t.members;
              if (Array.isArray(raw)) { students = raw; }
              else if (raw && typeof raw === 'object') {
                  teachers = raw.teachers || [];
                  students = raw.students || [];
              }
          } catch {}

          const teacherNames = teachers.map(m => `${m.prefix || ''}${m.name || ''}`).join(', ');
          const studentNames = students.map(m => `${m.prefix || ''}${m.name || ''}`).join(', ');

          htmlRows += `
            <tr>
                <td style="text-align:center">${idx + 1}</td>
                <td>${actName}</td>
                <td>${t.teamName}</td>
                <td>${studentNames || '-'}</td>
                <td>${teacherNames || '-'}</td>
            </tr>
          `;
      });

      const htmlContent = `
        <html>
        <head>
            <title>รายชื่อตัวแทน - ${repModalData.schoolName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Sarabun', sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
                th { background-color: #f0f0f0; }
                h1, h2 { text-align: center; margin: 5px; }
                .meta { text-align: center; font-size: 14px; color: #666; margin-bottom: 20px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">พิมพ์รายงาน</button>
            </div>
            <h1>สรุปรายการตัวแทนเข้าแข่งขันระดับเขตพื้นที่</h1>
            <h2>โรงเรียน${repModalData.schoolName}</h2>
            <div class="meta">ข้อมูล ณ วันที่ ${date}</div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">ที่</th>
                        <th style="width: 25%;">กิจกรรม</th>
                        <th style="width: 20%;">ชื่อทีม</th>
                        <th>นักเรียน</th>
                        <th>ครูผู้ฝึกสอน</th>
                    </tr>
                </thead>
                <tbody>${htmlRows}</tbody>
            </table>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  const getSingleConfirmData = () => {
      if (confirmState.type !== 'single' || !confirmState.teamId) return null;
      const team = data.teams.find(t => t.teamId === confirmState.teamId);
      const edit = edits[confirmState.teamId!];
      if (!team || !edit) return null;
      return {
          teamName: team.teamName,
          newScore: edit.score,
          newRank: edit.rank,
          newMedal: edit.medal,
          newFlag: edit.flag
      };
  };

  const getBatchItems = (): BatchItem[] => {
      if (confirmState.type !== 'batch') return [];
      
      return filteredTeams.map(team => {
          const edit = edits[team.teamId];
          const isModified = edit?.isDirty || false;
          
          // Determine existing values based on scope
          let currentScore = '';
          let currentRank = '';
          let currentMedal = '';
          let currentFlag = '';

          if (viewScope === 'area') {
              const info = getAreaInfo(team);
              currentScore = String(info?.score && info.score > 0 ? info.score : '');
              currentRank = String(info?.rank || '');
              currentMedal = String(info?.medal || '');
          } else {
              currentScore = String(team.score > 0 ? team.score : '');
              currentRank = String(team.rank || '');
              currentMedal = String(team.medalOverride || '');
              currentFlag = String(team.flag || '');
          }

          return {
              id: team.teamId,
              teamName: team.teamName,
              score: isModified ? edit.score : currentScore,
              rank: isModified ? edit.rank : currentRank,
              medal: isModified ? edit.medal : currentMedal,
              flag: isModified ? edit.flag : currentFlag,
              isModified: isModified
          };
      });
  };

  const singleConfirmData = getSingleConfirmData();
  const batchConfirmData = getBatchItems();
  const dirtyCount = Object.keys(edits).filter(id => edits[id].isDirty && filteredTeams.some(t => t.teamId === id)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <LoadingOverlay isVisible={isLoading} />
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
        
        {/* Scope Toggle */}
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

      {viewScope === 'area' && !canScoreArea && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              <span>คุณไม่มีสิทธิ์ในการบันทึกคะแนนระดับเขตพื้นที่ (สำหรับ Admin/Area/Score เท่านั้น)</span>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Stats */}
        <div className={`rounded-xl p-6 text-white shadow-lg flex flex-col justify-between ${viewScope === 'area' ? 'bg-gradient-to-r from-purple-800 to-indigo-900' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 w-full">
                    <h3 className="text-lg font-bold mb-1 flex items-center">
                        <PieChart className="w-5 h-5 mr-2 text-white/80" />
                        ภาพรวม ({viewScope === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})
                    </h3>
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/70">ความคืบหน้า ({globalStats.scored}/{globalStats.total})</span>
                            <span className="font-bold text-white">{globalStats.percent}%</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-3">
                            <div className="bg-green-400 h-3 rounded-full transition-all duration-700" style={{ width: `${globalStats.percent}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <div className="bg-white/10 p-2 rounded-lg border border-white/10 text-center min-w-[70px]">
                        <div className="text-yellow-400 font-bold text-lg">{globalStats.gold}</div>
                        <div className="text-[10px] text-white/70 uppercase tracking-wide">Gold</div>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg border border-white/10 text-center min-w-[70px]">
                        <div className="text-gray-300 font-bold text-lg">{globalStats.silver}</div>
                        <div className="text-[10px] text-white/70 uppercase tracking-wide">Silver</div>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg border border-white/10 text-center min-w-[70px]">
                        <div className="text-orange-400 font-bold text-lg">{globalStats.bronze}</div>
                        <div className="text-[10px] text-white/70 uppercase tracking-wide">Bronze</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Representative Dashboard */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <Flag className="w-5 h-5 mr-2 text-purple-600" />
                    สถานะการคัดเลือกตัวแทน
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                    {repStats.countWithRep} / {repStats.total} รายการ
                </span>
             </div>
             <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                         <div className="text-xs text-green-600 font-medium uppercase mb-1">กำหนดตัวแทนแล้ว</div>
                         <div className="text-2xl font-bold text-green-700">{repStats.countWithRep} <span className="text-sm font-normal text-green-600">รายการ</span></div>
                     </div>
                     <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                         <div className="text-xs text-red-600 font-medium uppercase mb-1">ยังไม่มีตัวแทน</div>
                         <div className="text-2xl font-bold text-red-700">{repStats.countMissing} <span className="text-sm font-normal text-red-600">รายการ</span></div>
                     </div>
                 </div>
                 {repStats.countMissing > 0 && (
                     <div className="relative">
                         <button 
                            onClick={() => setShowMissingRepList(!showMissingRepList)}
                            className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 py-1"
                         >
                             <span>แสดงรายการที่ยังไม่มีตัวแทน (คลิกเพื่อบันทึก)</span>
                             <ChevronDown className={`w-3 h-3 transition-transform ${showMissingRepList ? 'rotate-180' : ''}`} />
                         </button>
                         {showMissingRepList && (
                             <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto p-2">
                                 {repStats.missingList.map(a => (
                                     <div 
                                        key={a.id} 
                                        onClick={() => {
                                            setSelectedCategory(a.category);
                                            setSelectedActivityId(a.id);
                                            setShowMissingRepList(false); // Close dropdown
                                        }}
                                        className="text-xs py-2 px-2 hover:bg-red-50 text-gray-700 border-b border-gray-50 last:border-0 flex items-center cursor-pointer transition-colors"
                                     >
                                         <AlertOctagon className="w-3 h-3 text-red-400 mr-2 shrink-0" />
                                         <span className="truncate flex-1 font-medium">{a.name}</span>
                                         <ArrowDownWideNarrow className="w-3 h-3 text-gray-400 ml-2" />
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 )}
             </div>
        </div>
      </div>

      {/* School Medal Table (Interactive) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center text-sm">
                  <Crown className="w-4 h-4 mr-2 text-yellow-600" /> ตารางเหรียญรางวัลแยกโรงเรียน (คลิกที่เหรียญเพื่อดูรายละเอียด)
              </h3>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-white text-gray-500 font-medium">
                      <tr>
                          <th className="px-4 py-3 text-left">โรงเรียน</th>
                          <th className="px-4 py-3 text-center text-yellow-600">ทอง</th>
                          <th className="px-4 py-3 text-center text-gray-500">เงิน</th>
                          <th className="px-4 py-3 text-center text-orange-600">ทองแดง</th>
                          <th className="px-4 py-3 text-center text-purple-600">จำนวนตัวแทน</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {schoolStats.map((s, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-medium text-gray-800">{s.name}</td>
                              <td 
                                onClick={() => handleMedalClick(s.name, 'Gold')}
                                className="px-4 py-2 text-center font-bold hover:bg-yellow-50 cursor-pointer transition-colors text-yellow-700"
                              >
                                  {s.gold}
                              </td>
                              <td 
                                onClick={() => handleMedalClick(s.name, 'Silver')}
                                className="px-4 py-2 text-center hover:bg-gray-100 cursor-pointer transition-colors text-gray-700"
                              >
                                  {s.silver}
                              </td>
                              <td 
                                onClick={() => handleMedalClick(s.name, 'Bronze')}
                                className="px-4 py-2 text-center hover:bg-orange-50 cursor-pointer transition-colors text-orange-700"
                              >
                                  {s.bronze}
                              </td>
                              <td className="px-4 py-2 text-center">
                                  {s.repCount > 0 ? (
                                      <button 
                                        onClick={() => setRepModalData({ schoolName: s.name, teams: s.repTeams })}
                                        className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold hover:bg-purple-200 transition-colors"
                                      >
                                          <Flag className="w-3 h-3 mr-1" /> {s.repCount}
                                      </button>
                                  ) : <span className="text-gray-300">-</span>}
                              </td>
                          </tr>
                      ))}
                      {schoolStats.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-gray-400">ยังไม่มีข้อมูล</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Cluster Representatives Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <h3 className="font-bold text-blue-900 flex items-center text-sm">
                  <FileBadge className="w-4 h-4 mr-2" /> สรุปโรงเรียนตัวแทนกิจกรรม (Representatives Summary)
              </h3>
              <button 
                onClick={handlePrintActivityReps}
                className="flex items-center px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-xs font-bold shadow-sm"
              >
                  <Printer className="w-3 h-3 mr-1.5" /> พิมพ์สรุปตัวแทน
              </button>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-white text-gray-500 font-medium sticky top-0 shadow-sm">
                      <tr>
                          <th className="px-4 py-2 text-left w-16">#</th>
                          <th className="px-4 py-2 text-left w-1/4">หมวดหมู่</th>
                          <th className="px-4 py-2 text-left w-1/3">กิจกรรม</th>
                          <th className="px-4 py-2 text-left">โรงเรียนตัวแทน</th>
                          <th className="px-4 py-2 text-left">ทีม</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {representativesList.length > 0 ? representativesList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30">
                              <td className="px-4 py-2 text-gray-400 text-xs">{idx + 1}</td>
                              <td className="px-4 py-2 text-gray-600 text-xs">{item.category}</td>
                              <td className="px-4 py-2 font-medium text-gray-800">{item.activity}</td>
                              <td className="px-4 py-2 text-blue-600 font-bold">{item.school}</td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{item.teamName}</td>
                          </tr>
                      )) : (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">ยังไม่มีข้อมูลตัวแทน</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

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
          <div className="space-y-4">
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
                        {/* Search */}
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
                         {/* Toggle Unscored Only */}
                         <button
                            onClick={() => setShowUnscoredOnly(!showUnscoredOnly)}
                            className={`p-2 rounded-lg border transition-colors ${showUnscoredOnly ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-300 text-gray-400 hover:text-gray-600'}`}
                            title={showUnscoredOnly ? "แสดงทั้งหมด" : "แสดงเฉพาะที่ยังไม่บันทึก"}
                         >
                            {showUnscoredOnly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </button>
                         {/* Share Top 3 */}
                         <button 
                            onClick={handleShareTop3}
                            className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap flex items-center"
                            title="แชร์ผล Top 3"
                         >
                             <Crown className="w-4 h-4" />
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
                                        {/* Auto Rank Button */}
                                        <button 
                                            onClick={handleAutoRank}
                                            className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded text-xs hover:bg-purple-100 transition-colors shadow-sm"
                                            title="คำนวณลำดับอัตโนมัติจากคะแนน"
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
                                  const cluster = data.clusters.find(c => c.ClusterID === school?.SchoolCluster);
                                  const edit = edits[team.teamId];
                                  
                                  // Determine display values based on Scope
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

                                  const displayScore = edit?.score ?? (currentScore > 0 ? String(currentScore) : '');
                                  const displayRank = edit?.rank ?? currentRank ?? '';
                                  const displayMedal = edit?.medal ?? currentMedal ?? '';
                                  const displayFlag = edit?.flag ?? currentFlag ?? '';
                                  
                                  const isDirty = edit?.isDirty;
                                  // const hasSavedScore = currentScore > 0 && !isDirty; // unused but logical

                                  // Calculate medal
                                  const calculatedMedal = calculateMedal(displayScore, displayMedal);
                                  
                                  // Score color bar calculation
                                  const numScore = parseFloat(displayScore);
                                  const scorePercent = isNaN(numScore) ? 0 : Math.min(100, Math.max(0, numScore));
                                  const scoreColor = numScore >= 80 ? 'bg-green-500' : numScore >= 70 ? 'bg-blue-500' : numScore >= 60 ? 'bg-orange-400' : 'bg-red-400';

                                  // Disable input if Area view and user has no permission
                                  const disabledInput = viewScope === 'area' && !canScoreArea;

                                  return (
                                      <tr key={team.teamId} className={`${isDirty ? "bg-blue-50/30" : (currentScore > 0 ? "bg-green-50/20" : "")}`}>
                                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{idx + 1}</td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="ml-0">
                                                  <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                                                  <div className="text-xs text-gray-500">{school?.SchoolName}</div>
                                                  <div className="text-[10px] text-blue-500 flex items-center mt-0.5">
                                                      <LayoutGrid className="w-3 h-3 mr-1" />
                                                      {cluster?.ClusterName || 'ไม่ระบุกลุ่ม'}
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                              <div className="relative">
                                                  <input 
                                                    ref={(el) => { inputRefs.current[team.teamId] = el; }}
                                                    type="number" step="0.01" min="0" max="100"
                                                    className={`w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDirty ? 'border-blue-400 bg-white' : 'border-gray-300'} ${disabledInput ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                    value={displayScore}
                                                    onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                                    placeholder="0.00"
                                                    disabled={disabledInput}
                                                  />
                                                  {displayScore && (
                                                      <div className={`absolute bottom-0 left-0 h-0.5 ${scoreColor} transition-all duration-300`} style={{ width: `${scorePercent}%`, opacity: 0.6 }}></div>
                                                  )}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                              <select 
                                                className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${disabledInput ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                value={displayMedal}
                                                onChange={(e) => handleInputChange(team.teamId, 'medal', e.target.value)}
                                                disabled={disabledInput}
                                              >
                                                  <option value="">- Auto -</option>
                                                  <option value="Gold">Gold</option>
                                                  <option value="Silver">Silver</option>
                                                  <option value="Bronze">Bronze</option>
                                                  <option value="Participant">Participant</option>
                                              </select>
                                              {(!displayMedal || displayMedal === "") && displayScore && (
                                                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none bg-white px-1">
                                                      ({calculatedMedal})
                                                  </span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                               <input 
                                                type="text" 
                                                className={`w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center ${disabledInput ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                value={displayRank}
                                                onChange={(e) => handleInputChange(team.teamId, 'rank', e.target.value)}
                                                placeholder="-"
                                                disabled={disabledInput}
                                              />
                                          </td>
                                          {viewScope === 'cluster' && (
                                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                                  <input 
                                                    type="checkbox"
                                                    className="w-5 h-5 accent-blue-600 cursor-pointer"
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
                                                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white focus:outline-none transition-all
                                                        ${(!isDirty || disabledInput) 
                                                            ? 'bg-gray-300 cursor-default opacity-50' 
                                                            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                                                        }`}
                                                  >
                                                      <Save className="w-4 h-4 mr-1" /> บันทึก
                                                  </button>
                                                  {currentScore > 0 && !isDirty && (
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

      {/* Recent Logs Section */}
      {recentLogs.length > 0 && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <History className="w-4 h-4 mr-2 text-gray-500" />
                  รายการที่บันทึกล่าสุด
              </h3>
              <div className="space-y-2">
                  {recentLogs.map(log => (
                      <div key={log.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                          <div className="min-w-0 flex-1 mr-4">
                              <div className="text-xs text-blue-500 font-medium mb-0.5 truncate">{log.activityName}</div>
                              <div className="font-medium text-gray-900 truncate">{log.teamName}</div>
                              <div className="text-xs text-gray-500 truncate flex items-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></div>
                                  {log.schoolName}
                              </div>
                          </div>
                          <div className="text-right whitespace-nowrap">
                              <span className="text-blue-600 font-bold block">{log.score} คะแนน</span>
                              <span className="text-xs text-gray-400 block mt-0.5">{log.time}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {!selectedActivityId && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
              <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>กรุณาเลือกหมวดหมู่และรายการแข่งขันเพื่อเริ่มบันทึกคะแนน</p>
          </div>
      )}

      {/* Rep Details Modal */}
      {repModalData && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
                      <h3 className="font-bold text-purple-800 flex items-center">
                          <Flag className="w-5 h-5 mr-2" />
                          รายการตัวแทนของโรงเรียน{repModalData.schoolName}
                      </h3>
                      <button onClick={() => setRepModalData(null)} className="p-1 hover:bg-purple-100 rounded-full text-purple-800"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                      <table className="min-w-full text-sm">
                          <thead>
                              <tr className="bg-gray-50 text-gray-500 font-medium">
                                  <th className="px-3 py-2 text-left">กิจกรรม</th>
                                  <th className="px-3 py-2 text-left">ทีม</th>
                                  <th className="px-3 py-2 text-center">ครู</th>
                                  <th className="px-3 py-2 text-center">นักเรียน</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {repModalData.teams.map((t, idx) => {
                                  const act = data.activities.find(a => a.id === t.activityId);
                                  let tCount = 0;
                                  let sCount = 0;
                                  try {
                                      const raw = typeof t.members === 'string' ? JSON.parse(t.members) : t.members;
                                      if (Array.isArray(raw)) sCount = raw.length;
                                      else if (raw) {
                                          tCount = raw.teachers?.length || 0;
                                          sCount = raw.students?.length || 0;
                                      }
                                  } catch {}
                                  return (
                                      <tr key={idx} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 text-gray-900">{act?.name || t.activityId}</td>
                                          <td className="px-3 py-2 text-gray-600">{t.teamName}</td>
                                          <td className="px-3 py-2 text-center">{tCount}</td>
                                          <td className="px-3 py-2 text-center">{sCount}</td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                      <button 
                        onClick={handlePrintRepSummary}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-bold"
                      >
                          <Printer className="w-4 h-4 mr-2" /> พิมพ์รายงานตัวแทน
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Medal Detail Modal */}
      {medalDetailData && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-100 bg-yellow-50 flex justify-between items-center">
                      <h3 className="font-bold text-yellow-800 flex items-center">
                          <Crown className="w-5 h-5 mr-2" />
                          {medalDetailData.medal} - {medalDetailData.schoolName}
                      </h3>
                      <button onClick={() => setMedalDetailData(null)} className="p-1 hover:bg-yellow-100 rounded-full text-yellow-800"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                      <ul className="space-y-2">
                          {medalDetailData.teams.map((t, idx) => {
                              const act = data.activities.find(a => a.id === t.activityId);
                              return (
                                  <li key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                      <div className="font-bold text-gray-800">{act?.name || t.activityId}</div>
                                      <div className="text-gray-600 text-xs mt-1">{t.teamName}</div>
                                      <div className="text-xs text-blue-600 mt-1 font-medium">คะแนน: {t.score}</div>
                                  </li>
                              );
                          })}
                      </ul>
                  </div>
              </div>
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

