
import React, { useState, useMemo } from 'react';
import { AppData, User, Team } from '../types';
import { updateTeamResult } from '../services/api';
import { shareScoreResult } from '../services/liff';
import { Save, Filter, AlertCircle, CheckCircle, Lock, Trophy, Search, ChevronRight, Share2, AlertTriangle, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScoreEntryProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void; // Callback to refresh data after save
}

interface ConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    teamName: string;
    newScore: string;
    newRank: string;
    newMedal: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onConfirm, onCancel, teamName, newScore, newRank, newMedal }) => {
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
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">ยกเลิก</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">ยืนยัน</button>
                </div>
            </div>
        </div>
    );
};

const ScoreEntry: React.FC<ScoreEntryProps> = ({ data, user, onDataUpdate }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Confirmation State
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, teamId: string | null }>({ isOpen: false, teamId: null });

  // Local state for edits: { teamId: { score, rank, medal, isDirty, isSaving } }
  const [edits, setEdits] = useState<Record<string, { score: string, rank: string, medal: string, isDirty: boolean, isSaving: boolean }>>({});

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

  // 2. Logic to filter Categories and Activities based on available teams
  // Only show options that have at least one team
  const { availableCategories, availableActivities } = useMemo(() => {
      // Base allow list
      let validActivities = data.activities;
      
      // Filter by Role Permission
      if (role === 'score') {
          const assigned = user.assignedActivities || [];
          validActivities = validActivities.filter(a => assigned.includes(a.id));
      }

      // Filter by Team Existence & Group Admin Cluster
      const teamCountsByActivity: Record<string, number> = {};
      data.teams.forEach(t => {
          // If Group Admin, only count teams in their cluster
          if (role === 'group_admin') {
              const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
              const teamSchool = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
              if (!userSchool || !teamSchool || userSchool.SchoolCluster !== teamSchool.SchoolCluster) {
                  return; // Skip this team
              }
          }
          teamCountsByActivity[t.activityId] = (teamCountsByActivity[t.activityId] || 0) + 1;
      });

      // Filter activities that have > 0 teams
      const activeActivities = validActivities.filter(a => (teamCountsByActivity[a.id] || 0) > 0);

      // Extract Categories from active activities
      const categories = Array.from(new Set(activeActivities.map(a => a.category))).sort();

      return { availableCategories: categories, availableActivities: activeActivities };
  }, [data.activities, data.teams, data.schools, role, user]);

  // 3. Filter Activities based on Category Selection
  const filteredActivities = useMemo(() => {
      if (!selectedCategory) return [];
      return availableActivities.filter(a => a.category === selectedCategory);
  }, [selectedCategory, availableActivities]);

  // 4. Filter Teams for Table
  const filteredTeams = useMemo(() => {
      if (!selectedActivityId) return [];

      let teams = data.teams.filter(t => t.activityId === selectedActivityId);

      // If Group Admin, restricted to their cluster
      if (role === 'group_admin') {
          const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
          if (userSchool) {
              const clusterId = userSchool.SchoolCluster;
              teams = teams.filter(t => {
                  const teamSchool = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                  return teamSchool && teamSchool.SchoolCluster === clusterId;
              });
          } else {
              teams = []; 
          }
      }

      // Search Filter
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          teams = teams.filter(t => 
              t.teamName.toLowerCase().includes(lower) || 
              t.teamId.toLowerCase().includes(lower) ||
              t.schoolId.toLowerCase().includes(lower)
          );
      }

      // Sort by score descending (showing current standings)
      // Note: This sort is based on SAVED data, not edits, to prevent jumping rows while editing
      return teams.sort((a, b) => b.score - a.score);
  }, [data.teams, selectedActivityId, role, user, data.schools, searchTerm]);

  // 5. Progress Statistics
  const progressStats = useMemo(() => {
      const total = filteredTeams.length;
      const recorded = filteredTeams.filter(t => t.score > 0).length;
      const percent = total > 0 ? Math.round((recorded / total) * 100) : 0;
      return { total, recorded, percent };
  }, [filteredTeams]);


  // Helper to handle input changes
  const handleInputChange = (teamId: string, field: 'score' | 'rank' | 'medal', value: string) => {
      setEdits(prev => {
          const team = data.teams.find(t => t.teamId === teamId);
          if (!team) return prev;

          const baseState = {
              score: prev[teamId]?.score ?? String(team.score > 0 ? team.score : ''),
              rank: prev[teamId]?.rank ?? String(team.rank || ''),
              medal: prev[teamId]?.medal ?? String(team.medalOverride || ''),
          };

          const newState = { ...baseState, [field]: value, isDirty: true, isSaving: false };
          
          // Auto-calculate Medal based on Score
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
      setConfirmState({ isOpen: true, teamId });
  };

  const handleConfirmSave = async () => {
      const teamId = confirmState.teamId;
      if (!teamId) return;

      setConfirmState({ isOpen: false, teamId: null });

      const edit = edits[teamId];
      if (!edit || !edit.isDirty) return;

      setEdits(prev => ({ ...prev, [teamId]: { ...edit, isSaving: true } }));

      // Default rank/medal to empty string if 'undefined' string
      const finalScore = parseFloat(edit.score) || 0;
      const finalRank = edit.rank === 'undefined' ? '' : edit.rank;
      const finalMedal = edit.medal === 'undefined' ? '' : edit.medal;

      const success = await updateTeamResult(teamId, finalScore, finalRank, finalMedal);

      if (success) {
          onDataUpdate(); 
          setEdits(prev => {
              const { [teamId]: _, ...rest } = prev;
              return rest;
          });
      } else {
          setEdits(prev => ({ ...prev, [teamId]: { ...edit, isSaving: false } }));
          alert('บันทึกข้อมูลล้มเหลว กรุณาลองใหม่');
      }
  };

  const handleShare = (team: Team) => {
     // Prefer edited values if saved, else current team values
     // Since share button is usually enabled after save, we use team values from props (assuming onDataUpdate refreshed it)
     const activityName = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
     const schoolName = data.schools.find(s => s.SchoolID === team.schoolId)?.SchoolName || team.schoolId;
     
     const medal = team.medalOverride || (team.score >= 80 ? 'Gold' : team.score >= 70 ? 'Silver' : team.score >= 60 ? 'Bronze' : 'Participant');
     
     shareScoreResult(team.teamName, schoolName, activityName, team.score, medal, team.rank);
  };

  // Helper to get current edit values for Confirm Modal
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
          newMedal: edit.medal
      };
  };

  const confirmData = getConfirmData();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">บันทึกผลการแข่งขัน (Score Entry)</h2>
        <p className="text-gray-500">สำหรับกรรมการและผู้ดูแลระบบในการบันทึกคะแนนระดับกลุ่มเครือข่าย</p>
      </div>

      {/* Selection Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Level 1: Category */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. เลือกหมวดหมู่ (Category)</label>
              <div className="relative">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setSelectedActivityId(''); }}
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg shadow-sm"
                  >
                      <option value="">-- กรุณาเลือกหมวดหมู่ --</option>
                      {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                      ))}
                  </select>
                  <Filter className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
          </div>

          {/* Level 2: Activity */}
          <div>
              <label className={`block text-sm font-medium mb-2 ${!selectedCategory ? 'text-gray-400' : 'text-gray-700'}`}>2. เลือกรายการแข่งขัน (Activity)</label>
              <div className="relative">
                  <select 
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    disabled={!selectedCategory}
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg shadow-sm disabled:bg-gray-100 disabled:text-gray-400"
                  >
                      <option value="">-- กรุณาเลือกรายการ --</option>
                      {filteredActivities.map(act => (
                          <option key={act.id} value={act.id}>
                              {act.name}
                          </option>
                      ))}
                  </select>
                  <Trophy className={`absolute right-3 top-3 h-5 w-5 pointer-events-none ${!selectedCategory ? 'text-gray-300' : 'text-gray-400'}`} />
              </div>
          </div>
      </div>

      {/* Table Section */}
      {selectedActivityId && (
          <div className="space-y-4">
              {/* Toolbar & Progress */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                   <div className="w-full md:w-1/2">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-gray-700">ความคืบหน้าการบันทึก</span>
                            <span className="text-xs text-gray-500">{progressStats.recorded} / {progressStats.total} ทีม ({progressStats.percent}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressStats.percent}%` }}></div>
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

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">#</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">คะแนน (0-100)</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">เหรียญ (Auto)</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">ลำดับ</th>
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
                                                className={`w-full border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDirty ? 'border-blue-400 bg-white' : 'border-gray-300'}`}
                                                value={displayScore}
                                                onChange={(e) => handleInputChange(team.teamId, 'score', e.target.value)}
                                                placeholder="0"
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
                                                      {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-1" /> บันทึก</>}
                                                  </button>
                                                  
                                                  {/* Share Button (Only visible if saved score exists) */}
                                                  {hasSavedScore && (
                                                      <button 
                                                        onClick={() => handleShare(team)}
                                                        className="p-1.5 bg-[#06C755]/10 text-[#06C755] rounded-md hover:bg-[#06C755]/20 transition-colors"
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
                                  <tr>
                                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
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
              onConfirm={handleConfirmSave}
              onCancel={() => setConfirmState({ isOpen: false, teamId: null })}
          />
      )}
    </div>
  );
};

export default ScoreEntry;
