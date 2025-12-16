
import React, { useState, useMemo, useRef } from 'react';
import { AppData, Judge, User, Team } from '../types';
import { Search, Plus, Edit2, Trash2, Gavel, Mail, Phone, School, MapPin, Loader2, Save, X, LayoutGrid, AlertTriangle, CheckCircle, Users, Briefcase, ChevronDown, ChevronUp, AlertOctagon, UserCheck, Camera, Copy, Trophy } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import ConfirmationModal from './ConfirmationModal';
import { saveJudge, deleteJudge, uploadImage } from '../services/api';
import { resizeImage } from '../services/utils';

interface JudgesViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

interface ConflictData {
    hasConflict: boolean;
    schoolName: string;
}

const JudgesView: React.FC<JudgesViewProps> = ({ data, user, onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'management' | 'directory'>('management');
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>('area'); // Default to District Level (Area) based on prompt context
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Partial<Judge> | null>(null);
  const [isExternal, setIsExternal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // Permissions
  const canManage = ['admin', 'area', 'group_admin'].includes(user?.level?.toLowerCase() || '');
  
  // --- Derived Data & Logic ---

  const checkConflict = (judge: Judge, competingSchoolNames: Set<string>): ConflictData => {
      const judgeSchool = judge.schoolName.trim().toLowerCase();
      for (let school of competingSchoolNames) {
          if (judgeSchool === school.trim().toLowerCase()) {
              return { hasConflict: true, schoolName: school };
          }
      }
      return { hasConflict: false, schoolName: '' };
  };

  const activityGroups = useMemo(() => {
      const groups: Record<string, { 
          activityName: string, 
          judges: Judge[], 
          competingSchools: Set<string>, 
          teams: Team[],
          conflicts: number 
      }> = {};

      data.activities.forEach(act => {
          groups[act.id] = {
              activityName: act.name,
              judges: [],
              competingSchools: new Set(),
              teams: [],
              conflicts: 0
          };
      });

      // Filter teams based on viewScope
      // District Level: Only teams with Rank 1 AND Flag TRUE (RepresentativeOverride)
      data.teams.forEach(team => {
          if (groups[team.activityId]) {
              let isQualified = true;
              
              if (viewScope === 'area') {
                  const rankOne = String(team.rank) === '1';
                  const isRep = String(team.flag).toUpperCase() === 'TRUE';
                  isQualified = rankOne && isRep;
              }

              if (isQualified) {
                  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                  const schoolName = school?.SchoolName || team.schoolId;
                  groups[team.activityId].competingSchools.add(schoolName);
                  groups[team.activityId].teams.push(team);
              }
          }
      });

      // Map Judges based on current viewScope
      data.judges.forEach(judge => {
          // Strict filtering by scope
          if (judge.stageScope === viewScope && groups[judge.activityId]) {
              groups[judge.activityId].judges.push(judge);
              const conflict = checkConflict(judge, groups[judge.activityId].competingSchools);
              if (conflict.hasConflict) {
                  groups[judge.activityId].conflicts++;
              }
          }
      });

      return groups;
  }, [data.activities, data.teams, data.judges, data.schools, viewScope]);

  const dashboardStats = useMemo(() => {
      const scopedJudges = data.judges.filter(j => j.stageScope === viewScope);
      const totalJudges = scopedJudges.length;
      let externalCount = 0;
      let conflictCount = 0;
      
      scopedJudges.forEach(j => {
          const isInternal = data.schools.some(s => s.SchoolID === j.schoolId);
          if (!isInternal) externalCount++;
      });

      Object.values(activityGroups).forEach(g => {
          conflictCount += g.conflicts;
      });

      return {
          total: totalJudges,
          external: externalCount,
          conflicts: conflictCount,
          activitiesWithoutJudges: data.activities.length - Object.values(activityGroups).filter(g => g.judges.length > 0).length
      };
  }, [data.judges, activityGroups, viewScope]);

  // For "Select from Cluster" feature
  const getClusterJudgesForActivity = (activityId: string) => {
      // Find judges for this activity that are in 'cluster' scope
      return data.judges.filter(j => j.activityId === activityId && j.stageScope === 'cluster');
  };

  const filteredDirectory = useMemo(() => {
      return data.judges.filter(judge => {
          if (judge.stageScope !== viewScope) return false;
          
          const matchesSearch = 
            judge.judgeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            judge.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
          
          if (user?.level === 'group_admin') {
              const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
              if (userSchool && judge.clusterKey !== userSchool.SchoolCluster) return false;
          }
          return matchesSearch;
      });
  }, [data.judges, searchTerm, user, viewScope]);

  // --- Handlers ---

  const handleEdit = (judge: Judge) => {
      const isInternal = data.schools.some(s => s.SchoolID === judge.schoolId);
      setIsExternal(!isInternal && !!judge.schoolName);
      setEditingJudge({ ...judge });
      setIsModalOpen(true);
  };

  const handleAdd = (preSelectedActivityId?: string) => {
      setIsExternal(false);
      setEditingJudge({
          activityId: preSelectedActivityId || '',
          clusterKey: '',
          clusterLabel: '',
          schoolId: '',
          schoolName: '',
          judgeName: '',
          role: 'กรรมการ',
          phone: '',
          email: '',
          stageScope: viewScope, // Default to current view scope
          importedBy: user?.username || 'Admin',
          photoUrl: ''
      });
      setIsModalOpen(true);
  };

  const handleImportFromCluster = (clusterJudge: Judge) => {
      if (!editingJudge) return;
      // Copy details but keep current scope (which should be 'area')
      setEditingJudge({
          ...editingJudge,
          judgeName: clusterJudge.judgeName,
          schoolId: clusterJudge.schoolId,
          schoolName: clusterJudge.schoolName,
          role: clusterJudge.role,
          phone: clusterJudge.phone,
          email: clusterJudge.email,
          photoUrl: clusterJudge.photoUrl,
          clusterKey: clusterJudge.clusterKey,
          clusterLabel: clusterJudge.clusterLabel
      });
      // Detect if external based on ID
      const isInternal = data.schools.some(s => s.SchoolID === clusterJudge.schoolId);
      setIsExternal(!isInternal);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editingJudge) return;

      setIsUploading(true);
      try {
          const base64 = await resizeImage(file, 400, 400, 0.8);
          const res = await uploadImage(base64, `judge_${Date.now()}.jpg`);
          
          if (res.status === 'success' && res.fileUrl) {
              const publicUrl = `https://drive.google.com/thumbnail?id=${res.fileId}`;
              setEditingJudge({ ...editingJudge, photoUrl: publicUrl });
          } else {
              alert('อัปโหลดรูปภาพไม่สำเร็จ');
          }
      } catch (err) {
          console.error(err);
          alert('เกิดข้อผิดพลาดในการอัปโหลด');
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSave = async () => {
      if (!editingJudge?.judgeName || !editingJudge.activityId) {
          alert('กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, กิจกรรม)');
          return;
      }

      setIsSaving(true);
      
      let clusterKey = editingJudge.clusterKey || '';
      let clusterLabel = editingJudge.clusterLabel || '';
      let schoolName = editingJudge.schoolName || '';
      let schoolId = editingJudge.schoolId || '';

      if (isExternal) {
          schoolId = ''; 
      } else {
          const school = data.schools.find(s => s.SchoolID === editingJudge.schoolId);
          if (school) {
              schoolName = school.SchoolName;
              const cluster = data.clusters.find(c => c.ClusterID === school.SchoolCluster);
              clusterKey = cluster?.ClusterID || '';
              clusterLabel = cluster?.ClusterName || '';
          }
      }

      const payload: Judge = {
          ...editingJudge as Judge,
          id: editingJudge.id || `${editingJudge.activityId}_${editingJudge.judgeName}`,
          schoolId,
          schoolName,
          clusterKey,
          clusterLabel
      };

      const success = await saveJudge(payload);
      setIsSaving(false);
      
      if (success) {
          setIsModalOpen(false);
          onDataUpdate();
      } else {
          alert('บันทึกไม่สำเร็จ');
      }
  };

  const handleDelete = async () => {
      if (confirmDelete.id) {
          await deleteJudge(confirmDelete.id);
          setConfirmDelete({ isOpen: false, id: null });
          onDataUpdate();
      }
  };

  if (!canManage) {
      return <div className="text-center py-20 text-gray-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        
        {/* Top Header & Scope Toggle */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Gavel className="w-6 h-6 mr-2 text-blue-600" />
                    ทำเนียบกรรมการ (Judges)
                </h2>
                <p className="text-gray-500 text-sm mt-1">บริหารจัดการกรรมการตัดสินการแข่งขัน</p>
            </div>
            
            {/* Scope Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setViewScope('cluster')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${viewScope === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-2" /> ระดับกลุ่มเครือข่าย
                </button>
                <button
                    onClick={() => setViewScope('area')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${viewScope === 'area' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Trophy className="w-4 h-4 mr-2" /> ระดับเขตพื้นที่
                </button>
            </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('management')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'management' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-2" /> จัดการรายกิจกรรม
                </button>
                <button
                    onClick={() => setActiveTab('directory')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'directory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Users className="w-4 h-4 mr-2" /> รายชื่อรวม
                </button>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'dashboard' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <UserCheck className="w-4 h-4 mr-2" /> สารสนเทศ
                </button>
            </div>
            
            <button 
                onClick={() => handleAdd()}
                className={`flex items-center px-4 py-2 text-white rounded-lg transition-colors shadow-sm font-medium text-sm ${viewScope === 'area' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                <Plus className="w-4 h-4 mr-2" /> เพิ่มกรรมการ ({viewScope === 'area' ? 'เขต' : 'กลุ่ม'})
            </button>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2">กรรมการทั้งหมด ({viewScope})</div>
                    <div className="text-3xl font-bold text-gray-800">{dashboardStats.total} <span className="text-sm font-normal text-gray-400">คน</span></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2">กรรมการภายนอก</div>
                    <div className="text-3xl font-bold text-blue-600">{dashboardStats.external} <span className="text-sm font-normal text-gray-400">คน</span></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2">ข้อควรระวัง (Conflicts)</div>
                    <div className="text-3xl font-bold text-red-500">{dashboardStats.conflicts} <span className="text-sm font-normal text-gray-400">รายการ</span></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2">กิจกรรมที่ขาดกรรมการ</div>
                    <div className="text-3xl font-bold text-orange-500">{dashboardStats.activitiesWithoutJudges} <span className="text-sm font-normal text-gray-400">รายการ</span></div>
                </div>
            </div>
        )}

        {/* Management Content */}
        {activeTab === 'management' && (
            <div className="space-y-4">
                <div className="relative max-w-md mb-4">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                        placeholder="ค้นหากิจกรรม..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {data.activities
                    .filter(act => act.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(act => {
                        const group = activityGroups[act.id];
                        const isOpen = expandedActivity === act.id;
                        const hasJudges = group.judges.length > 0;
                        const hasConflict = group.conflicts > 0;

                        return (
                            <div key={act.id} className={`bg-white rounded-xl shadow-sm border transition-all ${hasConflict ? 'border-red-200' : 'border-gray-200'}`}>
                                <div 
                                    className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer ${isOpen ? 'bg-gray-50 rounded-t-xl' : ''}`}
                                    onClick={() => setExpandedActivity(isOpen ? null : act.id)}
                                >
                                    <div className="flex items-center flex-1">
                                        <div className={`p-2 rounded-lg mr-3 ${hasJudges ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <Gavel className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-sm md:text-base">{act.name}</h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                <span>กรรมการ ({viewScope === 'area' ? 'เขต' : 'กลุ่ม'}): <b>{group.judges.length}</b> คน</span>
                                                <span>ทีมแข่ง: <b>{group.teams.length}</b> ทีม</span>
                                                {hasConflict && (
                                                    <span className="flex items-center text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                                                        <AlertTriangle className="w-3 h-3 mr-1" /> พบความขัดแย้ง
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 md:mt-0 flex items-center gap-2">
                                        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
                                        <div className="md:col-span-1 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                                                <School className="w-3 h-3 mr-1" /> โรงเรียนที่เข้าแข่งขัน ({viewScope === 'area' ? 'Qualified Only' : 'All'})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.from(group.competingSchools).length > 0 ? Array.from(group.competingSchools).map(school => (
                                                    <span key={school} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded text-gray-600">
                                                        {school}
                                                    </span>
                                                )) : <span className="text-xs text-gray-400 italic">ไม่มีทีมเข้าแข่งขัน</span>}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center">
                                                    <UserCheck className="w-3 h-3 mr-1" /> รายชื่อกรรมการ
                                                </h4>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAdd(act.id); }}
                                                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium flex items-center"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" /> เพิ่ม
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {group.judges.map(judge => {
                                                    const conflict = checkConflict(judge, group.competingSchools);
                                                    return (
                                                        <div key={judge.id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${conflict.hasConflict ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                                            <div className="flex items-center">
                                                                <img 
                                                                    src={judge.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} 
                                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 mr-3 bg-gray-50"
                                                                    alt="Judge"
                                                                />
                                                                <div>
                                                                    <div className="font-bold text-gray-900 flex items-center">
                                                                        {judge.judgeName}
                                                                        <span className="ml-2 text-[10px] font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{judge.role}</span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                                        <Briefcase className="w-3 h-3 mr-1" /> 
                                                                        {judge.schoolName || 'ไม่ระบุสังกัด'}
                                                                        {conflict.hasConflict && (
                                                                            <span className="ml-2 text-red-600 font-bold flex items-center">
                                                                                <AlertOctagon className="w-3 h-3 mr-1" /> ตรงกับทีมแข่ง
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => handleEdit(judge)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => setConfirmDelete({ isOpen: true, id: judge.id })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {group.judges.length === 0 && (
                                                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-xs">
                                                        ยังไม่ได้กำหนดกรรมการในระดับ{viewScope === 'area' ? 'เขต' : 'กลุ่ม'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                }
            </div>
        )}

        {/* Directory Content */}
        {activeTab === 'directory' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                            placeholder="ค้นหาชื่อ, โรงเรียน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รูปถ่าย</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ - สกุล</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กิจกรรม</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สังกัด</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ติดต่อ</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredDirectory.map((judge, idx) => {
                                const activityName = data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId;
                                return (
                                    <tr key={judge.id || idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <img src={judge.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} className="w-8 h-8 rounded-full object-cover border" alt="" />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{judge.judgeName}</div>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{judge.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 line-clamp-1">{activityName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 flex items-center">
                                                {data.schools.some(s => s.SchoolID === judge.schoolId) ? <School className="w-3 h-3 mr-1 text-gray-400"/> : <Briefcase className="w-3 h-3 mr-1 text-orange-400"/>}
                                                {judge.schoolName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600 flex items-center"><Phone className="w-3 h-3 mr-1"/> {judge.phone || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEdit(judge)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit2 className="w-4 h-4"/></button>
                                            <button onClick={() => setConfirmDelete({ isOpen: true, id: judge.id })} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Edit/Add Modal */}
        {isModalOpen && editingJudge && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800">{editingJudge.id ? 'แก้ไขข้อมูลกรรมการ' : `เพิ่มกรรมการ (${viewScope === 'area' ? 'เขต' : 'กลุ่ม'})`}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-5">
                        {/* Profile Image & Import */}
                        <div className="flex flex-col items-center justify-center mb-2">
                            <div className="relative group">
                                <img 
                                    src={editingJudge.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} 
                                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-sm mb-2"
                                    alt="Judge"
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-2 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </div>
                            
                            {/* Import Button if District Scope and New Judge */}
                            {!editingJudge.id && viewScope === 'area' && editingJudge.activityId && (
                                <div className="mt-2 w-full">
                                    <div className="text-xs text-center text-gray-400 mb-2">-- หรือ --</div>
                                    <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center justify-center">
                                        <Copy className="w-3 h-3 mr-1" /> คัดเลือกจากกรรมการเดิม (ระดับกลุ่ม)
                                    </h4>
                                    <div className="flex gap-2 overflow-x-auto pb-2 px-1 justify-center">
                                        {getClusterJudgesForActivity(editingJudge.activityId).length > 0 ? (
                                            getClusterJudgesForActivity(editingJudge.activityId).map(cj => (
                                                <button
                                                    key={cj.id}
                                                    onClick={() => handleImportFromCluster(cj)}
                                                    className="flex flex-col items-center p-2 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all min-w-[80px]"
                                                >
                                                    <img src={cj.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} className="w-8 h-8 rounded-full mb-1 object-cover" />
                                                    <span className="text-[10px] text-gray-700 font-medium truncate max-w-[70px]">{cj.judgeName}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">ไม่มีข้อมูลกรรมการในระดับกลุ่มสำหรับรายการนี้</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ - นามสกุล *</label>
                            <input 
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={editingJudge.judgeName}
                                onChange={e => setEditingJudge({ ...editingJudge, judgeName: e.target.value })}
                                placeholder="เช่น นายสมชาย ใจดี"
                            />
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-blue-800">สังกัด / หน่วยงาน</label>
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        id="isExternal"
                                        checked={isExternal}
                                        onChange={(e) => setIsExternal(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <label htmlFor="isExternal" className="ml-2 text-xs text-blue-600 font-bold cursor-pointer select-none">
                                        บุคคลภายนอก (External)
                                    </label>
                                </div>
                            </div>
                            
                            {isExternal ? (
                                <div className="animate-in fade-in">
                                    <input 
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={editingJudge.schoolName}
                                        onChange={e => setEditingJudge({ ...editingJudge, schoolName: e.target.value })}
                                        placeholder="ระบุชื่อหน่วยงาน / มหาวิทยาลัย..."
                                    />
                                    <p className="text-[10px] text-blue-400 mt-1">* กรอกชื่อหน่วยงานอิสระ</p>
                                </div>
                            ) : (
                                <div className="animate-in fade-in">
                                    <SearchableSelect 
                                        options={data.schools.map(s => ({ label: s.SchoolName, value: s.SchoolID }))}
                                        value={editingJudge.schoolId || ''}
                                        onChange={val => {
                                            const school = data.schools.find(s => s.SchoolID === val);
                                            setEditingJudge({ ...editingJudge, schoolId: val, schoolName: school?.SchoolName || '' });
                                        }}
                                        placeholder="ค้นหาและเลือกโรงเรียน..."
                                        icon={<School className="w-4 h-4"/>}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                                <input 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.phone}
                                    onChange={e => setEditingJudge({ ...editingJudge, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                                <input 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.email}
                                    onChange={e => setEditingJudge({ ...editingJudge, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายการแข่งขัน *</label>
                            <SearchableSelect 
                                options={data.activities.map(a => ({ label: a.name, value: a.id }))}
                                value={editingJudge.activityId || ''}
                                onChange={val => setEditingJudge({ ...editingJudge, activityId: val })}
                                placeholder="เลือกกิจกรรม..."
                                icon={<Gavel className="w-4 h-4"/>}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">บทบาท</label>
                                <select 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.role}
                                    onChange={e => setEditingJudge({ ...editingJudge, role: e.target.value })}
                                >
                                    <option value="ประธานกรรมการ">ประธานกรรมการ</option>
                                    <option value="กรรมการ">กรรมการ</option>
                                    <option value="กรรมการและเลขา">กรรมการและเลขา</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ขอบเขต</label>
                                <select 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.stageScope}
                                    onChange={e => setEditingJudge({ ...editingJudge, stageScope: e.target.value as any })}
                                >
                                    <option value="cluster">ระดับกลุ่มเครือข่าย</option>
                                    <option value="area">ระดับเขตพื้นที่</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">ยกเลิก</button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} บันทึก
                        </button>
                    </div>
                </div>
            </div>
        )}

        <ConfirmationModal 
            isOpen={confirmDelete.isOpen}
            title="ลบข้อมูลกรรมการ"
            description="คุณต้องการลบรายชื่อกรรมการท่านนี้ใช่หรือไม่?"
            confirmLabel="ลบข้อมูล"
            confirmColor="red"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
        />
    </div>
  );
};

export default JudgesView;

