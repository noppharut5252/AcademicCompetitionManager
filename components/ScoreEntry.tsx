
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, Team } from '../types';
import { updateTeamResult } from '../services/api';
import { shareScoreResult } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Trophy, Search, ChevronRight, Share2, AlertTriangle, Calculator, X, Copy, PieChart, Check, ChevronDown, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Types & Interfaces ---

interface ScoreEntryProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

interface ConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    teamName: string;
    newScore: string;
    newRank: string;
    newMedal: string;
    newFlag: string;
}

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
    onClose: () => void;
}

// --- Searchable Select Component (Select2 style) ---
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

// --- Sub-Components ---

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

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onConfirm, onCancel, teamName, newScore, newRank, newMedal, newFlag }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center text-amber-500 mb-2">
                    <AlertTriangle className="w-6 h-6 mr-2" />
                    <h3 className="text-lg font-bold text-gray-800">ยืนยันการบันทึก</h3>
                </div>
                <p className="text-gray-600 text-sm">กรุณาตรวจสอบความถูกต้องของข้อมูลทีม <br/><span className="font-bold text-gray-800">{teamName}</span></p>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">คะแนน:</span>
                        <span className="font-bold text-blue-600 text-lg">{newScore}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">เหรียญรางวัล:</span>
                        <span className="font-medium text-gray-900">{newMedal || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">ลำดับที่:</span>
                        <span className="font-medium text-gray-900">{newRank || '-'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500">สถานะตัวแทน (Q):</span>
                        <span className={`font-medium ${newFlag === 'TRUE' ? 'text-green-600' : 'text-gray-400'}`}>
                            {newFlag === 'TRUE' ? 'ใช่' : 'ไม่ใช่'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">ยกเลิก</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">ยืนยัน</button>
                </div>
            </div>
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
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, teamId: string | null }>({ isOpen: false, teamId: null });
  // Include flag in edits state
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, flag: string, isDirty: boolean, isSaving: boolean }>>({});

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

  // 2. Data Filtering & Stats
  const { availableCategories, availableActivities, allAuthorizedTeams } = useMemo(() => {
      let validActivities = data.activities;
      
      // Filter activities by Role
      if (role === 'score') {
          const assigned = user.assignedActivities || [];
          validActivities = validActivities.filter(a => assigned.includes(a.id));
      }

      // Filter teams by Group Admin Cluster
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

      // Count teams per activity
      const teamCountsByActivity: Record<string, number> = {};
      relevantTeams.forEach(t => {
          teamCountsByActivity[t.activityId] = (teamCountsByActivity[t.activityId] || 0) + 1;
      });

      const activeActivities = validActivities.filter(a => (teamCountsByActivity[a.id] || 0) > 0);
      const categories = Array.from(new Set(activeActivities.map(a => a.category))).sort();
      
      // Filter teams to only those in valid activities
      const authorizedTeams = relevantTeams.filter(t => activeActivities.some(a => a.id === t.activityId));

      return { 
          availableCategories: categories, 
          availableActivities: activeActivities,
          allAuthorizedTeams: authorizedTeams
      };
  }, [data.activities, data.teams, data.schools, role, user]);

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
      return teams.sort((a, b) => b.score - a.score); // Sort by saved score
  }, [allAuthorizedTeams, selectedActivityId, searchTerm]);

  // Activity Specific Progress
  const activityProgress = useMemo(() => {
      const total = filteredTeams.length;
      const recorded = filteredTeams.filter(t => t.score > 0).length;
      const percent = total > 0 ? Math.round((recorded / total) * 100) : 0;
      return { total, recorded, percent };
  }, [filteredTeams]);

  // Handlers
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

          const newState = { ...baseState, [field]: value, isDirty: true, isSaving: false };
          
          if (field === 'score') {
              const numScore = parseFloat(value);
              if (!isNaN(numScore)) {
                  if (numScore >= 80) newState.medal = 'Gold';
                  else if (numScore >= 70) newState.medal = 'Silver';
                  else if (numScore >= 60) newState.medal = 'Bronze';
                  else newState.medal = 'Participant';
              } else {
                  newState.medal = '';
              }
          }

          return { ...prev, [teamId]: newState };
      });
  };

  const initiateSave = (teamId: string) => {
      const edit = edits[teamId];
      // Validation: Check if score is within range 0-100
      if(edit) {
        const score = parseFloat(edit.score);
        if(!isNaN(score) && (score < 0 || score > 100)) {
            showToast('คะแนนต้องอยู่ระหว่าง 0 - 100', 'error');
            return;
        }
      }
      setConfirmState({ isOpen: true, teamId });
  };

  const handleConfirmSave = async () => {
      const teamId = confirmState.teamId;
      if (!teamId) return;

      setConfirmState({ isOpen: false, teamId: null });

      const edit = edits[teamId];
      if (!edit || !edit.isDirty) return;

      setEdits(prev => ({ ...prev, [teamId]: { ...edit, isSaving: true } }));

      const finalScore = parseFloat(edit.score) || 0;
      const finalRank = edit.rank === 'undefined' ? '' : edit.rank;
      const finalMedal = edit.medal === 'undefined' ? '' : edit.medal;
      const finalFlag = edit.flag === 'undefined' ? '' : edit.flag;

      const success = await updateTeamResult(teamId, finalScore, finalRank, finalMedal, finalFlag);

      if (success) {
          onDataUpdate(); 
          setEdits(prev => {
              const { [teamId]: _, ...rest } = prev;
              return rest;
          });
          showToast('บันทึกคะแนนเรียบร้อยแล้ว', 'success');
      } else {
          setEdits(prev => ({ ...prev, [teamId]: { ...edit, isSaving: false } }));
          showToast('บันทึกข้อมูลล้มเหลว กรุณาลองใหม่', 'error');
      }
  };

  const handleShare = async (team: Team) => {
     const activityName = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
     const schoolName = data.schools.find(s => s.SchoolID === team.schoolId)?.SchoolName || team.schoolId;
     const medal = team.medalOverride || (team.score >= 80 ? 'Gold' : team.score >= 70 ? 'Silver' : team.score >= 60 ? 'Bronze' : 'Participant');
     
     const result = await shareScoreResult(team.teamName, schoolName, activityName, team.score, medal, team.rank);
     
     if (result.success) {
         if (result.method === 'copy') {
             showToast('คัดลอกผลการแข่งขันแล้ว', 'success');
         } else if (result.method === 'share') {
             // Web share doesn't always guarantee success callback accurately in all browsers
         }
     } else {
         showToast('ไม่สามารถแชร์ข้อมูลได้', 'error');
     }
  };

  const getConfirmData = () => {
      const teamId = confirmState.teamId;
      if (!teamId) return null;
      const team = data.teams.find(t => t.teamId === teamId);
      const edit = edits[teamId];
      if (!team || !edit) return null;

      return {
          teamName: team.teamName,
          newScore: edit.score,
          newRank: edit.rank,
          newMedal: edit.medal,
          newFlag: edit.flag
      };
  };

  const confirmData = getConfirmData();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({...prev, isVisible: false}))} />
      
      <div>
        <h2 className="text-2xl font-bold text-gray-800">บันทึกผลการแข่งขัน (Score Entry)</h2>
        <p className="text-gray-500">จัดการคะแนนและประกาศผลรางวัล</p>
      </div>

      {/* 1. Global Progress Dashboard */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1 w-full">
                  <h3 className="text-lg font-bold mb-1 flex items-center">
                      <PieChart className="w-5 h-5 mr-2 text-blue-400" />
                      ภาพรวมการบันทึกคะแนน
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">สถานะการบันทึกคะแนนของทีมที่คุณดูแลทั้งหมด</p>
                  
                  <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                          <span className="text-slate-300">ความคืบหน้า ({globalStats.scored}/{globalStats.total})</span>
                          <span className="font-bold text-blue-400">{globalStats.percent}%</span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-3">
                          <div 
                            className="bg-blue-500 h-3 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${globalStats.percent}%` }}
                          ></div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 text-center min-w-[80px]">
                      <div className="text-yellow-400 font-bold text-xl">{globalStats.gold}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">Gold</div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 text-center min-w-[80px]">
                      <div className="text-slate-300 font-bold text-xl">{globalStats.silver}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">Silver</div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 text-center min-w-[80px]">
                      <div className="text-orange-400 font-bold text-xl">{globalStats.bronze}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">Bronze</div>
                  </div>
              </div>
          </div>
      </div>

      {/* 2. Selection Card with Searchable Selects */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. เลือกหมวดหมู่ (Category)</label>
              <SearchableSelect 
                options={availableCategories.map(cat => ({ label: cat, value: cat }))}
                value={selectedCategory}
                onChange={(val) => { setSelectedCategory(val); setSelectedActivityId(''); }}
                placeholder="-- ค้นหาหมวดหมู่ --"
                icon={<Filter className="h-4 w-4" />}
              />
          </div>

          <div>
              <label className={`block text-sm font-medium mb-2 ${!selectedCategory ? 'text-gray-400' : 'text-gray-700'}`}>2. เลือกรายการแข่งขัน (Activity)</label>
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

      {/* 3. Table Section */}
      {selectedActivityId && (
          <div className="space-y-4">
              {/* Activity Toolbar */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div className="w-full md:w-1/2">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-gray-700">รายการนี้บันทึกแล้ว</span>
                            <span className="text-xs text-gray-500">{activityProgress.recorded} / {activityProgress.total} ทีม ({activityProgress.percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${activityProgress.percent}%` }}></div>
                        </div>
                   </div>

                   <div className="w-full md:w-auto relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                            placeholder="ค้นหาชื่อทีม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                   </div>
              </div>

              {/* Data Table */}
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
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
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
                                  const isSaving = edit?.isSaving;
                                  const hasSavedScore = team.score > 0 && !isDirty;

                                  return (
                                      <tr key={team.teamId} className={`${isDirty ? "bg-blue-50/30" : hasSavedScore ? "bg-green-50/20" : ""}`}>
                                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{idx + 1}</td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex items-center">
                                                  <div className="ml-0">
                                                      <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                                                      <div className="text-xs text-gray-500">{school?.SchoolName}</div>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <input 
                                                type="number" 
                                                step="0.01"
                                                className={`w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDirty ? 'border-blue-400 bg-white' : 'border-gray-300'}`}
                                                value={displayScore}
                                                onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                                placeholder="0.00"
                                                min="0"
                                                max="100"
                                              />
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
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
                                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                checked={displayFlag === 'TRUE'}
                                                onChange={(e) => handleInputChange(team.teamId, 'flag', e.target.checked ? 'TRUE' : '')}
                                                title="ทำเครื่องหมายว่าเป็นตัวแทนไปแข่งระดับเขต"
                                              />
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-right">
                                              <div className="flex items-center justify-end space-x-2">
                                                  <button 
                                                    disabled={!isDirty || isSaving}
                                                    onClick={() => initiateSave(team.teamId)}
                                                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white focus:outline-none transition-all
                                                        ${!isDirty 
                                                            ? 'bg-gray-300 cursor-default opacity-50' 
                                                            : isSaving ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                                                        }`}
                                                  >
                                                      {isSaving ? '...' : <><Save className="w-4 h-4 mr-1" /> บันทึก</>}
                                                  </button>
                                                  
                                                  {/* Share Button */}
                                                  {hasSavedScore && (
                                                      <button 
                                                        onClick={() => handleShare(team)}
                                                        className="p-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors border border-green-200"
                                                        title="แชร์ผล"
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
                                  <tr>
                                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                          ไม่พบข้อมูลทีมในรายการนี้
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
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
      {confirmState.isOpen && confirmData && (
          <ConfirmModal 
              isOpen={confirmState.isOpen}
              teamName={confirmData.teamName}
              newScore={confirmData.newScore}
              newRank={confirmData.newRank}
              newMedal={confirmData.newMedal}
              newFlag={confirmData.newFlag}
              onConfirm={handleConfirmSave}
              onCancel={() => setConfirmState({ isOpen: false, teamId: null })}
          />
      )}
    </div>
  );
};

export default ScoreEntry;

