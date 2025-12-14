
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, Team } from '../types';
import { updateTeamResult } from '../services/api';
import { shareScoreResult, shareTop3Result } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Trophy, Search, ChevronRight, Share2, AlertTriangle, Calculator, X, Copy, PieChart, Check, ChevronDown, Flag, History, Loader2, ListChecks, Edit2, Crown, LayoutGrid, AlertOctagon, Wand2, Eye, EyeOff, ArrowDownWideNarrow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
                    <h3 className="text-lg font-bold text-gray-800">ยืนยันการบันทึก</h3>
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
                            <div className="flex justify-between">
                                <span className="text-gray-500">ตัวแทน (Q):</span>
                                <span className={`font-medium ${props.newFlag === 'TRUE' ? 'text-green-600' : 'text-gray-400'}`}>
                                    {props.newFlag === 'TRUE' ? 'ใช่' : 'ไม่ใช่'}
                                </span>
                            </div>
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
                                         <th className="px-3 py-2 text-center font-medium text-gray-500 bg-gray-50 w-20">Q</th>
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
                                                 <td className="px-3 py-2 text-center">
                                                    {String(item.flag).toUpperCase() === 'TRUE' ? (
                                                        <div className="flex justify-center"><Check className="w-4 h-4 text-green-600" /></div>
                                                    ) : <span className="text-gray-300">-</span>}
                                                 </td>
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

// --- Searchable Select Component ---
interface SearchableSelectProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
      opt.label.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
        <div 
            className={`w-full bg-white border rounded-lg py-2.5 pl-3 pr-10 text-sm shadow-sm cursor-pointer flex items-center justify-between
                ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-gray-400'}
                ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
            `}
            onClick={() => !disabled && setIsOpen(!isOpen)}
        >
            <span className={`block truncate ${!value ? 'text-gray-500' : 'text-gray-900'}`}>
                {value ? selectedLabel : placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
               {icon || <ChevronDown className="h-4 w-4" />}
            </span>
        </div>

        {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        placeholder="ค้นหา..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                        <div
                            key={opt.value}
                            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 hover:text-blue-900 ${value === opt.value ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-900'}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                                setFilterText('');
                            }}
                        >
                            <span className="block truncate">{opt.label}</span>
                            {value === opt.value && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                                    <Check className="h-4 w-4" />
                                </span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="cursor-default select-none relative py-2 px-4 text-gray-500 italic text-center">
                        ไม่พบข้อมูล
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

// --- Main Component ---

const ScoreEntry: React.FC<ScoreEntryProps> = ({ data, user, onDataUpdate }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, type: 'single' | 'batch', teamId: string | null }>({ isOpen: false, type: 'single', teamId: null });
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean }>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [showMissingRepList, setShowMissingRepList] = useState(false);
  const [showUnscoredOnly, setShowUnscoredOnly] = useState(false);

  // References for keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

  // 1. Check Permissions
  const role = user?.level?.toLowerCase();
  const allowedRoles = ['admin', 'area', 'group_admin', 'score'];
  
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

  // Representative Stats Calculation
  const repStats = useMemo(() => {
      const activityIds = new Set(availableActivities.map(a => a.id));
      const activitiesWithRep = new Set(
          allAuthorizedTeams
            .filter(t => String(t.flag).toUpperCase() === 'TRUE')
            .map(t => t.activityId)
            .filter(id => activityIds.has(id))
      );
      const missingActivities = availableActivities.filter(a => !activitiesWithRep.has(a.id));
      return {
          total: availableActivities.length,
          countWithRep: activitiesWithRep.size,
          countMissing: missingActivities.length,
          missingList: missingActivities
      };
  }, [availableActivities, allAuthorizedTeams]);


  // Global Dashboard Stats
  const globalStats = useMemo(() => {
      const total = allAuthorizedTeams.length;
      const scored = allAuthorizedTeams.filter(t => t.score > 0).length;
      const pending = total - scored;
      const gold = allAuthorizedTeams.filter(t => t.score >= 80).length;
      const silver = allAuthorizedTeams.filter(t => t.score >= 70 && t.score < 80).length;
      const bronze = allAuthorizedTeams.filter(t => t.score >= 60 && t.score < 70).length;
      const percent = total > 0 ? Math.round((scored / total) * 100) : 0;
      return { total, scored, pending, percent, gold, silver, bronze };
  }, [allAuthorizedTeams]);

  // Activity Specific Filtering
  const filteredActivities = useMemo(() => {
      if (!selectedCategory) return [];
      return availableActivities.filter(a => a.category === selectedCategory);
  }, [selectedCategory, availableActivities]);

  const filteredTeams = useMemo(() => {
      if (!selectedActivityId) return [];
      let teams = allAuthorizedTeams.filter(t => t.activityId === selectedActivityId);
      
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
            return t.score <= 0;
        });
      }

      return teams.sort((a, b) => b.score - a.score); 
  }, [allAuthorizedTeams, selectedActivityId, searchTerm, showUnscoredOnly, edits]);

  // Activity Progress
  const activityProgress = useMemo(() => {
      const allInActivity = allAuthorizedTeams.filter(t => t.activityId === selectedActivityId);
      const total = allInActivity.length;
      const recorded = allInActivity.filter(t => t.score > 0).length;
      const percent = total > 0 ? Math.round((recorded / total) * 100) : 0;
      return { total, recorded, percent };
  }, [allAuthorizedTeams, selectedActivityId]);

  // --- Handlers ---

  const handleInputChange = (teamId: string, field: 'score' | 'rank' | 'medal' | 'flag', value: string) => {
      setEdits(prev => {
          const team = data.teams.find(t => t.teamId === teamId);
          if (!team) return prev;

          const baseState = {
              score: prev[teamId]?.score ?? String(team.score > 0 ? team.score : ''),
              rank: prev[teamId]?.rank ?? String(team.rank || ''),
              medal: prev[teamId]?.medal ?? String(team.medalOverride || ''),
              flag: prev[teamId]?.flag ?? String(team.flag || ''),
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
        const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
        const clusterId = school?.SchoolCluster || 'Unassigned';
        if (!teamsByCluster[clusterId]) teamsByCluster[clusterId] = [];
        teamsByCluster[clusterId].push(team);
    });

    const newEdits: typeof edits = {};

    // 2. Process each cluster independently
    Object.values(teamsByCluster).forEach(clusterTeams => {
        // Prepare score list
        const teamsWithScores = clusterTeams.map(team => {
            const edit = edits[team.teamId];
            const score = edit?.score ? parseFloat(edit.score) : team.score;
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
                const baseTeam = data.teams.find(t => t.teamId === teamId);
                
                // Add to edits if changed
                if (prevEdit?.rank !== rankStr && baseTeam?.rank !== rankStr) {
                    newEdits[teamId] = {
                        score: prevEdit?.score ?? String(baseTeam?.score > 0 ? baseTeam.score : ''),
                        rank: rankStr,
                        medal: prevEdit?.medal ?? String(baseTeam?.medalOverride || ''),
                        flag: prevEdit?.flag ?? String(baseTeam?.flag || ''),
                        isDirty: true
                    };
                }
            }
        }
    });

    setEdits(prev => ({ ...prev, ...newEdits }));
    showToast('คำนวณลำดับ (แยกตามกลุ่มเครือข่าย) เรียบร้อยแล้ว (กรุณากดบันทึก)', 'info');
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
        const finalFlag = edit.flag === 'undefined' ? '' : edit.flag;
        return await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag);
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
         const scoreA = edits[a.teamId]?.score ? parseFloat(edits[a.teamId].score) : a.score;
         const scoreB = edits[b.teamId]?.score ? parseFloat(edits[b.teamId].score) : b.score;
         return scoreB - scoreA;
    });

    const top3 = sorted.slice(0, 3).map((t, index) => {
        const edit = edits[t.teamId];
        const score = edit?.score ?? String(t.score);
        const manualMedal = edit?.medal ?? t.medalOverride;
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

          return {
              id: team.teamId,
              teamName: team.teamName,
              score: isModified ? edit.score : String(team.score > 0 ? team.score : ''),
              rank: isModified ? edit.rank : team.rank,
              medal: isModified ? edit.medal : team.medalOverride,
              flag: isModified ? edit.flag : team.flag,
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
      
      <div>
        <h2 className="text-2xl font-bold text-gray-800">บันทึกผลการแข่งขัน (Score Entry)</h2>
        <p className="text-gray-500">จัดการคะแนนและประกาศผลรางวัล</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Stats */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg flex flex-col justify-between">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 w-full">
                    <h3 className="text-lg font-bold mb-1 flex items-center">
                        <PieChart className="w-5 h-5 mr-2 text-blue-400" />
                        ภาพรวมการบันทึกคะแนน
                    </h3>
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300">ความคืบหน้า ({globalStats.scored}/{globalStats.total})</span>
                            <span className="font-bold text-blue-400">{globalStats.percent}%</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-3">
                            <div className="bg-blue-500 h-3 rounded-full transition-all duration-700" style={{ width: `${globalStats.percent}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50 text-center min-w-[70px]">
                        <div className="text-yellow-400 font-bold text-lg">{globalStats.gold}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Gold</div>
                    </div>
                    <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50 text-center min-w-[70px]">
                        <div className="text-slate-300 font-bold text-lg">{globalStats.silver}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Silver</div>
                    </div>
                    <div className="bg-slate-700/50 p-2 rounded-lg border border-slate-600/50 text-center min-w-[70px]">
                        <div className="text-orange-400 font-bold text-lg">{globalStats.bronze}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">Bronze</div>
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
                             <span>แสดงรายการที่ยังไม่มีตัวแทน</span>
                             <ChevronDown className={`w-3 h-3 transition-transform ${showMissingRepList ? 'rotate-180' : ''}`} />
                         </button>
                         {showMissingRepList && (
                             <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto p-2">
                                 {repStats.missingList.map(a => (
                                     <div key={a.id} className="text-xs py-1.5 px-2 hover:bg-gray-50 text-gray-700 border-b border-gray-50 last:border-0 flex items-center">
                                         <AlertOctagon className="w-3 h-3 text-red-400 mr-2 shrink-0" />
                                         <span className="truncate">{a.name}</span>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 )}
             </div>
        </div>
      </div>

      {/* Selection Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. เลือกหมวดหมู่</label>
              <SearchableSelect 
                options={availableCategories.map(cat => ({ label: cat, value: cat }))}
                value={selectedCategory}
                onChange={(val) => { setSelectedCategory(val); setSelectedActivityId(''); }}
                placeholder="-- ค้นหาหมวดหมู่ --"
                icon={<Filter className="h-4 w-4" />}
              />
          </div>
          <div>
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
      </div>

      {/* Table Section */}
      {selectedActivityId && (
          <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div className="w-full md:w-1/2">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-gray-700">รายการนี้บันทึกแล้ว</span>
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
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">#</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">คะแนน</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">เหรียญ</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">ลำดับ</th>
                                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ตัวแทน (Q)</th>
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
                                  const edit = edits[team.teamId];
                                  
                                  const displayScore = edit?.score ?? (team.score > 0 ? String(team.score) : '');
                                  const displayRank = edit?.rank ?? team.rank ?? '';
                                  const displayMedal = edit?.medal ?? team.medalOverride ?? '';
                                  const displayFlag = edit?.flag ?? team.flag ?? '';
                                  
                                  const isDirty = edit?.isDirty;
                                  const hasSavedScore = team.score > 0 && !isDirty;

                                  // Calculate medal
                                  const calculatedMedal = calculateMedal(displayScore, displayMedal);
                                  
                                  // Score color bar calculation
                                  const numScore = parseFloat(displayScore);
                                  const scorePercent = isNaN(numScore) ? 0 : Math.min(100, Math.max(0, numScore));
                                  const scoreColor = numScore >= 80 ? 'bg-green-500' : numScore >= 70 ? 'bg-blue-500' : numScore >= 60 ? 'bg-orange-400' : 'bg-red-400';

                                  return (
                                      <tr key={team.teamId} className={`${isDirty ? "bg-blue-50/30" : hasSavedScore ? "bg-green-50/20" : ""}`}>
                                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{idx + 1}</td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="ml-0">
                                                  <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                                                  <div className="text-xs text-gray-500">{school?.SchoolName}</div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                              <div className="relative">
                                                  <input 
                                                    ref={(el) => { inputRefs.current[team.teamId] = el; }}
                                                    type="number" step="0.01" min="0" max="100"
                                                    className={`w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDirty ? 'border-blue-400 bg-white' : 'border-gray-300'}`}
                                                    value={displayScore}
                                                    onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                                    placeholder="0.00"
                                                  />
                                                  {displayScore && (
                                                      <div className={`absolute bottom-0 left-0 h-0.5 ${scoreColor} transition-all duration-300`} style={{ width: `${scorePercent}%`, opacity: 0.6 }}></div>
                                                  )}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap relative">
                                              <select 
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={displayMedal}
                                                onChange={(e) => handleInputChange(team.teamId, 'medal', e.target.value)}
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
                                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center"
                                                value={displayRank}
                                                onChange={(e) => handleInputChange(team.teamId, 'rank', e.target.value)}
                                                placeholder="-"
                                              />
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-center">
                                              <input 
                                                type="checkbox"
                                                className="w-5 h-5 accent-blue-600 cursor-pointer"
                                                checked={String(displayFlag).toUpperCase() === 'TRUE'}
                                                onChange={(e) => handleInputChange(team.teamId, 'flag', e.target.checked ? 'TRUE' : '')}
                                              />
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-right">
                                              <div className="flex items-center justify-end space-x-2">
                                                  <button 
                                                    disabled={!isDirty}
                                                    onClick={() => initiateSave(team.teamId)}
                                                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white focus:outline-none transition-all
                                                        ${!isDirty 
                                                            ? 'bg-gray-300 cursor-default opacity-50' 
                                                            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                                                        }`}
                                                  >
                                                      <Save className="w-4 h-4 mr-1" /> บันทึก
                                                  </button>
                                                  {hasSavedScore && (
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
                                  <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500">ไม่พบข้อมูลทีมในรายการนี้</td></tr>
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
              onConfirm={handleConfirmSave}
              onCancel={() => setConfirmState({ isOpen: false, type: 'single', teamId: null })}
          />
      )}
    </div>
  );
};

export default ScoreEntry;

