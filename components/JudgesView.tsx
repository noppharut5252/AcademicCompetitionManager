
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, Judge, User, Team, JudgeConfig } from '../types';
import { Search, Plus, Edit2, Trash2, Gavel, Mail, Phone, School, MapPin, Loader2, Save, X, LayoutGrid, AlertTriangle, CheckCircle, Users, Briefcase, ChevronDown, ChevronUp, AlertOctagon, UserCheck, Camera, Copy, Trophy, Filter, Layers, ChevronRight, Hash, Eye, EyeOff, ChevronsUpDown, ChevronLeft, ListChecks, ArrowRight, Import, AlertCircle, Printer, FileText, Files, Settings, ScrollText, ArrowUpFromLine, ArrowDownToLine, MoveHorizontal } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import ConfirmationModal from './ConfirmationModal';
import { saveJudge, deleteJudge, uploadImage, getJudgeConfig, saveJudgeConfig } from '../services/api';
import { resizeImage } from '../services/utils';
import QRCode from 'qrcode';

interface JudgesViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

interface ConflictData {
    hasConflict: boolean;
    schoolName: string;
}

interface JudgeAssignment {
    tempId: string;
    activityId: string;
    activityName: string;
    role: string;
    stageScope: 'cluster' | 'area';
    clusterKey: string;
    clusterLabel: string;
}

// Helper to sort judges by role priority
const sortJudgesByRole = (judges: Judge[]) => {
    const getPriority = (role: string) => {
        const r = role.trim();
        if (r.includes('ประธาน')) return 1;
        if (r === 'กรรมการ') return 2;
        if (r.includes('เลขา')) return 3;
        return 4; // Others
    };

    return [...judges].sort((a, b) => {
        const pA = getPriority(a.role);
        const pB = getPriority(b.role);
        if (pA !== pB) return pA - pB;
        return a.judgeName.localeCompare(b.judgeName);
    });
};

// Internal Toast Component
const Toast = ({ message, type, isVisible, onClose }: { message: string, type: 'success' | 'error' | 'info', isVisible: boolean, onClose: () => void }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const styles = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white'
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        info: <ListChecks className="w-5 h-5" />
    };

    return (
        <div className={`fixed top-6 right-6 z-[300] flex items-center p-4 rounded-xl shadow-xl transition-all duration-500 transform translate-y-0 ${styles[type]} animate-in slide-in-from-top-5 fade-in`}>
            <div className="mr-3">{icons[type]}</div>
            <div className="font-medium text-sm">{message}</div>
            <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const JudgesView: React.FC<JudgesViewProps> = ({ data, user, onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'management' | 'directory'>('management');
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>('area'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [clusterFilter, setClusterFilter] = useState<string>('');
  
  // New UI States
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set()); 
  const [quickFilter, setQuickFilter] = useState<'all' | 'external' | 'conflict' | 'missing'>('all');

  // Pagination for Directory
  const [dirPage, setDirPage] = useState(1);
  const [dirPerPage, setDirPerPage] = useState(20);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'form' | 'summary'>('form');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [showOfficialSettings, setShowOfficialSettings] = useState(false);
  const [officialConfig, setOfficialConfig] = useState<JudgeConfig>({
      officeName: 'ศูนย์เครือข่ายพัฒนาคุณภาพการศึกษา...',
      commandNumber: '1/2567',
      subject: 'แต่งตั้งคณะกรรมการตัดสินการแข่งขันงานศิลปหัตถกรรมนักเรียน ครั้งที่ 71',
      preamble: 'ด้วยศูนย์เครือข่ายพัฒนาคุณภาพการศึกษา... ได้กำหนดจัดงานศิลปหัตถกรรมนักเรียน เพื่อคัดเลือกตัวแทนเข้าร่วมการแข่งขันในระดับเขตพื้นที่การศึกษา เพื่อให้การดำเนินงานเป็นไปด้วยความเรียบร้อยและบรรลุตามวัตถุประสงค์ จึงแต่งตั้งคณะกรรมการตัดสินการแข่งขัน ดังรายชื่อต่อไปนี้',
      signerName: 'นายสมชาย ใจดี',
      signerPosition: 'ประธานศูนย์เครือข่าย...',
      dateText: `สั่ง ณ วันที่ ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      margins: { top: 20, bottom: 20, left: 20, right: 20 }
  });

  // Load official config from API
  useEffect(() => {
      const loadConfig = async () => {
          try {
              const saved = await getJudgeConfig();
              if (saved) {
                  // Merge with defaults to ensure margins exist if old config didn't have them
                  setOfficialConfig(prev => ({
                      ...prev,
                      ...saved,
                      margins: { 
                          top: saved.margins?.top ?? 20,
                          bottom: saved.margins?.bottom ?? 20,
                          left: saved.margins?.left ?? 20,
                          right: saved.margins?.right ?? 20
                      }
                  }));
              }
          } catch (e) {
              console.error("Failed to load config");
          }
      };
      loadConfig();
  }, []);

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

  // Judge Data State
  const [editingJudge, setEditingJudge] = useState<Partial<Judge> | null>(null);
  const [isExternal, setIsExternal] = useState(false);
  
  // Multi-Assignment State
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [tempAssignment, setTempAssignment] = useState<Partial<JudgeAssignment>>({
      role: 'กรรมการ',
      stageScope: 'area'
  });
  
  // Import Search State
  const [importSearch, setImportSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // Permissions
  const canManage = ['admin', 'area', 'group_admin'].includes(user?.level?.toLowerCase() || '');
  const isGroupAdmin = user?.level === 'group_admin';

  // Reset pagination when filter changes
  useEffect(() => {
      setDirPage(1);
  }, [searchTerm, clusterFilter, viewScope]);

  // Simulate loading when activity changes in modal
  useEffect(() => {
      if (isModalOpen && tempAssignment.activityId) {
          setIsLoadingCandidates(true);
          const timer = setTimeout(() => setIsLoadingCandidates(false), 500);
          return () => clearTimeout(timer);
      }
  }, [tempAssignment.activityId, isModalOpen]);

  // Helper to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

  const handleSaveOfficialConfig = async () => {
      setIsSavingConfig(true);
      try {
          const success = await saveJudgeConfig(officialConfig);
          if (success) {
              setShowOfficialSettings(false);
              showToast('บันทึกการตั้งค่าเรียบร้อย', 'success');
          } else {
              showToast('บันทึกไม่สำเร็จ', 'error');
          }
      } catch (e) {
          showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
      } finally {
          setIsSavingConfig(false);
      }
  };

  // --- Derived Data & Logic ---

  const checkConflict = (judge: Judge, competingSchoolNames: Set<string>): ConflictData => {
      const judgeSchool = judge.schoolName.trim().toLowerCase();
      if (!judgeSchool) return { hasConflict: false, schoolName: '' };

      for (let school of competingSchoolNames) {
          if (judgeSchool === school.trim().toLowerCase()) {
              return { hasConflict: true, schoolName: school };
          }
      }
      return { hasConflict: false, schoolName: '' };
  };

  // Grouping Logic
  const activityGroups = useMemo(() => {
      const groups: Record<string, { 
          activityName: string, 
          areaJudges: Judge[],
          areaSchools: Set<string>,
          areaConflicts: number,
          areaTeamCount: number,
          clusters: Record<string, {
              judges: Judge[],
              competingSchools: Set<string>,
              conflicts: number,
              teamCount: number
          }>
      }> = {};

      // 1. Initialize
      data.activities.forEach(act => {
          groups[act.id] = {
              activityName: act.name,
              areaJudges: [],
              areaSchools: new Set(),
              areaConflicts: 0,
              areaTeamCount: 0,
              clusters: {}
          };
          data.clusters.forEach(c => {
              groups[act.id].clusters[c.ClusterID] = {
                  judges: [],
                  competingSchools: new Set(),
                  conflicts: 0,
                  teamCount: 0
              };
          });
      });

      // 2. Map Teams
      data.teams.forEach(team => {
          if (!groups[team.activityId]) return;
          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          const schoolName = school?.SchoolName || team.schoolId;
          const clusterId = school?.SchoolCluster;

          const isQualified = String(team.rank) === '1' && String(team.flag).toUpperCase() === 'TRUE';
          if (isQualified) {
              groups[team.activityId].areaSchools.add(schoolName);
              groups[team.activityId].areaTeamCount++;
          }

          if (clusterId && groups[team.activityId].clusters[clusterId]) {
              groups[team.activityId].clusters[clusterId].competingSchools.add(schoolName);
              groups[team.activityId].clusters[clusterId].teamCount++;
          }
      });

      // 3. Map Judges
      data.judges.forEach(judge => {
          if (!groups[judge.activityId]) return;
          const rawScope = (judge.stageScope || '').toLowerCase().trim();
          const jClusterKey = (judge.clusterKey || '').trim();
          
          const isArea = rawScope === 'area';
          
          if (isArea) {
              groups[judge.activityId].areaJudges.push(judge);
              const conflict = checkConflict(judge, groups[judge.activityId].areaSchools);
              if (conflict.hasConflict) groups[judge.activityId].areaConflicts++;
          } else {
              if (jClusterKey) {
                  const effectiveKey = data.clusters.find(c => c.ClusterID.toLowerCase() === jClusterKey.toLowerCase())?.ClusterID || jClusterKey;
                  if (groups[judge.activityId].clusters[effectiveKey]) {
                      const cData = groups[judge.activityId].clusters[effectiveKey];
                      cData.judges.push(judge);
                      const conflict = checkConflict(judge, cData.competingSchools);
                      if (conflict.hasConflict) cData.conflicts++;
                  }
              }
          }
      });
      return groups;
  }, [data.activities, data.teams, data.judges, data.schools, data.clusters]);

  const dashboardStats = useMemo(() => {
      let total = 0;
      let external = 0;
      let conflicts = 0;
      
      data.activities.forEach(act => {
          const group = activityGroups[act.id];
          if (viewScope === 'area') {
              total += group.areaJudges.length;
              conflicts += group.areaConflicts;
              group.areaJudges.forEach(j => {
                  if (j.schoolId === '__EXTERNAL__') external++;
              });
          } else {
              Object.entries(group.clusters).forEach(([cId, cData]) => {
                  if (clusterFilter && clusterFilter !== cId) return;
                  total += cData.judges.length;
                  conflicts += cData.conflicts;
                  cData.judges.forEach(j => {
                      if (j.schoolId === '__EXTERNAL__') external++;
                  });
              });
          }
      });
      return { total, external, conflicts };
  }, [activityGroups, viewScope, clusterFilter, data.activities]);

  const getClusterJudgesForActivity = (activityId: string) => {
      // Return unique judges by name
      const candidates = data.judges.filter(j => j.activityId === activityId && j.stageScope === 'cluster');
      const unique = new Map();
      candidates.forEach(c => {
          if (!unique.has(c.judgeName)) unique.set(c.judgeName, c);
      });
      return Array.from(unique.values());
  };

  const isConflictWithArea = (judgeSchool: string, activityId: string) => {
      if (!judgeSchool || !activityId) return false;
      const group = activityGroups[activityId];
      if (!group) return false;
      
      const target = judgeSchool.trim().toLowerCase();
      if (target === 'external' || target === '__external__') return false;

      for (const s of group.areaSchools) {
          if (s.trim().toLowerCase() === target) return true;
      }
      return false;
  };

  // --- Aggregated Directory Logic ---
  const aggregatedDirectory = useMemo(() => {
      const map = new Map<string, { judge: Judge, activities: { name: string, role: string, scope: string }[] }>();

      data.judges.forEach(judge => {
          const scope = judge.stageScope || 'cluster';
          if (viewScope === 'area' && scope !== 'area') return;
          if (viewScope === 'cluster' && scope === 'area') return; 
          
          if (viewScope === 'cluster' && clusterFilter) {
              const jKey = String(judge.clusterKey || '').trim();
              const fKey = String(clusterFilter).trim();
              if (jKey.toLowerCase() !== fKey.toLowerCase()) return;
          }

          if (isGroupAdmin) {
              const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
              if (userSchool && judge.clusterKey !== userSchool.SchoolCluster) return;
          }

          const key = `${judge.judgeName.trim()}_${judge.schoolName.trim()}`;
          if (!map.has(key)) {
              map.set(key, { judge, activities: [] });
          }
          
          const actName = data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId;
          map.get(key)?.activities.push({ 
              name: actName, 
              role: judge.role,
              scope: scope
          });
      });

      let results = Array.from(map.values());
      if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          results = results.filter(item => 
              item.judge.judgeName.toLowerCase().includes(searchLower) ||
              item.judge.schoolName.toLowerCase().includes(searchLower) ||
              item.activities.some(a => a.name.toLowerCase().includes(searchLower))
          );
      }
      return results.sort((a, b) => a.judge.judgeName.localeCompare(b.judge.judgeName));
  }, [data.judges, data.activities, viewScope, clusterFilter, searchTerm, user, isGroupAdmin, data.schools]);

  const totalDirPages = Math.ceil(aggregatedDirectory.length / dirPerPage);
  const paginatedDirectory = aggregatedDirectory.slice(
      (dirPage - 1) * dirPerPage,
      dirPage * dirPerPage
  );

  const filteredActivities = useMemo(() => {
      let acts = data.activities.filter(act => act.name.toLowerCase().includes(searchTerm.toLowerCase()));
      acts = acts.filter(act => {
          const group = activityGroups[act.id];
          if (!group) return false;
          if (viewScope === 'area') {
              return group.areaTeamCount > 0 || group.areaJudges.length > 0;
          } else {
              if (clusterFilter) {
                  const cData = group.clusters[clusterFilter];
                  return cData && (cData.teamCount > 0 || cData.judges.length > 0);
              } else {
                  return Object.values(group.clusters).some(c => c.teamCount > 0 || c.judges.length > 0);
              }
          }
      });

      if (quickFilter !== 'all') {
          acts = acts.filter(act => {
              const group = activityGroups[act.id];
              let hasMatch = false;
              if (viewScope === 'area') {
                  if (quickFilter === 'conflict') hasMatch = group.areaConflicts > 0;
                  if (quickFilter === 'external') hasMatch = group.areaJudges.some(j => j.schoolId === '__EXTERNAL__');
                  if (quickFilter === 'missing') hasMatch = group.areaJudges.length === 0;
              } else {
                  const clusters = Object.values(group.clusters);
                  const relevantClusters = clusterFilter ? [group.clusters[clusterFilter]].filter(Boolean) : clusters;
                  if (quickFilter === 'conflict') hasMatch = relevantClusters.some(c => c.conflicts > 0);
                  if (quickFilter === 'external') hasMatch = relevantClusters.some(c => c.judges.some(j => j.schoolId === '__EXTERNAL__'));
                  if (quickFilter === 'missing') hasMatch = relevantClusters.some(c => c.judges.length === 0 && c.competingSchools.size > 0); 
              }
              return hasMatch;
          });
      }
      return acts;
  }, [data.activities, searchTerm, quickFilter, activityGroups, viewScope, data.schools, clusterFilter]);

  const categories = useMemo(() => {
      return Array.from(new Set(filteredActivities.map(a => a.category))).sort();
  }, [filteredActivities]);

  // --- Handlers ---

  const toggleCategory = (cat: string) => {
      const newSet = new Set(expandedCategories);
      if (newSet.has(cat)) newSet.delete(cat);
      else newSet.add(cat);
      setExpandedCategories(newSet);
  };

  const toggleAllCategories = () => {
      if (expandedCategories.size > 0) {
          setExpandedCategories(new Set()); // Collapse All
      } else {
          setExpandedCategories(new Set(categories)); // Expand All
      }
  };

  const toggleCluster = (activityId: string, clusterId: string) => {
      const key = `${activityId}-${clusterId}`;
      const newSet = new Set(collapsedClusters);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setCollapsedClusters(newSet);
  };

  // --- ADD / EDIT HANDLERS WITH MULTI-ACTIVITY SUPPORT ---

  const handleEdit = (judge: Judge) => {
      setIsExternal(judge.schoolId === '__EXTERNAL__');
      setEditingJudge({ ...judge });
      
      // For editing existing, we populate as single assignment
      setAssignments([{
          tempId: 'existing',
          activityId: judge.activityId,
          activityName: data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId,
          role: judge.role,
          stageScope: (judge.stageScope || 'cluster') as 'cluster' | 'area',
          clusterKey: judge.clusterKey,
          clusterLabel: judge.clusterLabel
      }]);
      
      setModalStep('form');
      setIsModalOpen(true);
  };

  const handleAdd = (preSelectedActivityId?: string, preSelectedCluster?: string) => {
      setIsExternal(false);
      setModalStep('form');
      setAssignments([]); // Clear assignments
      setImportSearch(''); // Reset search
      
      let initialClusterKey = preSelectedCluster || '';
      let initialClusterLabel = '';

      if (isGroupAdmin && !initialClusterKey) {
          const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
          initialClusterKey = userSchool?.SchoolCluster || '';
      }
      
      if (initialClusterKey) {
          const c = data.clusters.find(cl => cl.ClusterID === initialClusterKey);
          initialClusterLabel = c?.ClusterName || '';
      }

      setEditingJudge({
          schoolId: '',
          schoolName: '',
          judgeName: '',
          phone: '',
          email: '',
          importedBy: user?.username || 'Admin',
          photoUrl: ''
      });

      // Initialize Temp Assignment
      setTempAssignment({
          activityId: preSelectedActivityId || '',
          clusterKey: initialClusterKey,
          clusterLabel: initialClusterLabel,
          role: 'กรรมการ',
          stageScope: viewScope // Default to current view scope
      });

      setIsModalOpen(true);
  };

  const addAssignment = () => {
      if (!tempAssignment.activityId) {
          showToast('กรุณาเลือกกิจกรรม', 'error');
          return;
      }
      
      // Validate duplicates
      if (assignments.some(a => a.activityId === tempAssignment.activityId)) {
          showToast('กิจกรรมนี้ถูกเพิ่มไปแล้ว', 'error');
          return;
      }

      // Resolve Names
      const act = data.activities.find(a => a.id === tempAssignment.activityId);
      const cluster = data.clusters.find(c => c.ClusterID === tempAssignment.clusterKey);

      const newAssignment: JudgeAssignment = {
          tempId: Date.now().toString(),
          activityId: tempAssignment.activityId!,
          activityName: act?.name || tempAssignment.activityId!,
          role: tempAssignment.role || 'กรรมการ',
          stageScope: (tempAssignment.stageScope || viewScope) as 'cluster' | 'area',
          clusterKey: tempAssignment.clusterKey || '',
          clusterLabel: cluster?.ClusterName || tempAssignment.clusterLabel || ''
      };

      setAssignments([...assignments, newAssignment]);
      // Clear activity selection but keep cluster/role as convenience
      setTempAssignment(prev => ({ ...prev, activityId: '' }));
  };

  const removeAssignment = (tempId: string) => {
      setAssignments(assignments.filter(a => a.tempId !== tempId));
  };

  const handleImportFromCluster = (clusterJudge: Judge) => {
      if (!editingJudge) return;
      setEditingJudge({
          ...editingJudge,
          judgeName: clusterJudge.judgeName,
          schoolId: clusterJudge.schoolId,
          schoolName: clusterJudge.schoolName,
          phone: clusterJudge.phone,
          email: clusterJudge.email,
          photoUrl: clusterJudge.photoUrl,
      });
      setIsExternal(clusterJudge.schoolId === '__EXTERNAL__');
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
              showToast('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
          }
      } catch (err) {
          console.error(err);
          showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'error');
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleReview = () => {
      if (!editingJudge?.judgeName) {
          showToast('กรุณากรอกชื่อ-นามสกุลกรรมการ', 'error');
          return;
      }
      if (assignments.length === 0) {
          showToast('กรุณาเพิ่มกิจกรรมอย่างน้อย 1 รายการ', 'error');
          return;
      }
      setModalStep('summary');
  };

  const handleFinalSave = async () => {
      setIsSaving(true);
      
      let schoolName = editingJudge?.schoolName || '';
      let schoolId = editingJudge?.schoolId || '';

      if (isExternal) {
          schoolId = '__EXTERNAL__'; 
      } else {
          const school = data.schools.find(s => s.SchoolID === editingJudge?.schoolId);
          if (school) {
              schoolName = school.SchoolName;
          }
      }

      // Base Judge Info
      const baseJudge = {
          ...editingJudge,
          schoolId,
          schoolName
      };

      try {
          // Loop through assignments and save each
          const promises = assignments.map(assign => {
              
              let clusterKey = assign.clusterKey;
              let clusterLabel = assign.clusterLabel;

              // Ensure Cluster Columns are filled for Internal Judges regardless of Scope
              if (!isExternal && !clusterKey && schoolId) {
                   const s = data.schools.find(sc => sc.SchoolID === schoolId);
                   const c = data.clusters.find(cl => cl.ClusterID === s?.SchoolCluster);
                   if (c) {
                       clusterKey = c.ClusterID;
                       clusterLabel = c.ClusterName;
                   }
              }

              const payload: Judge = {
                  ...baseJudge as Judge,
                  id: editingJudge?.id && assignments.length === 1 ? editingJudge.id : `${assign.activityId}_${baseJudge.judgeName}`, // Use existing ID if editing single, else gen new
                  activityId: assign.activityId,
                  role: assign.role,
                  stageScope: assign.stageScope,
                  clusterKey: clusterKey || '',
                  clusterLabel: clusterLabel || ''
              };
              
              return saveJudge(payload);
          });

          await Promise.all(promises);
          
          showToast('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
          
          // Delay closing to show success state briefly
          setTimeout(() => {
              setIsSaving(false);
              setIsModalOpen(false);
              onDataUpdate();
          }, 1000);

      } catch (e) {
          console.error(e);
          showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
          setIsSaving(false);
      }
  };

  const handleDelete = async () => {
      if (confirmDelete.id) {
          setIsDeleting(true);
          await deleteJudge(confirmDelete.id);
          setIsDeleting(false);
          setConfirmDelete({ isOpen: false, id: null });
          showToast('ลบข้อมูลเรียบร้อยแล้ว', 'success');
          onDataUpdate();
      }
  };

  const handlePrintJudges = async (mode: 'continuous' | 'page-per-activity' | 'official') => {
      setIsGeneratingPrint(true);
      setShowPrintModal(false);

      // Delay to allow modal to close visually
      await new Promise(resolve => setTimeout(resolve, 500));

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          setIsGeneratingPrint(false);
          alert('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
          return;
      }

      const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const scopeTitle = viewScope === 'cluster' ? `ระดับกลุ่มเครือข่าย ${clusterFilter ? `(${data.clusters.find(c => c.ClusterID === clusterFilter)?.ClusterName})` : ''}` : 'ระดับเขตพื้นที่การศึกษา';
      
      // Generate QR Code for this specific view/filter
      let qrCodeBase64 = '';
      try {
          qrCodeBase64 = await QRCode.toDataURL(window.location.href, { margin: 1, width: 100 });
      } catch (e) {
          console.error("QR Error", e);
      }

      // Margins
      const margins = officialConfig.margins || { top: 20, bottom: 20, left: 20, right: 20 };

      // 1. Organize data: Category -> Activity -> Judges (Sorted)
      const categoryList = Array.from(new Set(data.activities.map(a => a.category))).sort();
      let htmlBodyContent = '';

      if (mode === 'official') {
          // --- Official Document Mode ---
          let allJudgesContent = '';
          categoryList.forEach(cat => {
              const activities = data.activities.filter(a => a.category === cat);
              activities.forEach(act => {
                  let judges: Judge[] = [];
                  let teamCount = 0;

                  // Reuse activityGroups logic for counts
                  const group = activityGroups[act.id];
                  if (viewScope === 'area') {
                      judges = group.areaJudges;
                      teamCount = group.areaTeamCount;
                  } else {
                      if (clusterFilter) {
                          judges = group.clusters[clusterFilter]?.judges || [];
                          teamCount = group.clusters[clusterFilter]?.teamCount || 0;
                      } else {
                          Object.values(group.clusters).forEach(c => {
                              judges = [...judges, ...c.judges];
                              teamCount += c.teamCount;
                          });
                      }
                  }

                  if (judges.length > 0) {
                      const sortedJudges = sortJudgesByRole(judges);
                      allJudgesContent += `
                        <div style="margin-bottom: 10px; font-weight: bold; page-break-inside: avoid;">
                            ${act.name} (จำนวน ${teamCount} ทีม)
                        </div>
                        <table class="official-table">
                            <tbody>
                                ${sortedJudges.map((j, idx) => `
                                    <tr>
                                        <td style="width: 50px; text-align: center; vertical-align: top;">${idx + 1}.</td>
                                        <td style="width: 250px; vertical-align: top;">${j.judgeName}</td>
                                        <td style="width: 200px; vertical-align: top;">${j.role}</td>
                                        <td style="vertical-align: top;">${j.schoolName}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <br/>
                      `;
                  }
              });
          });

          htmlBodyContent = `
            <div class="garuda-container">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Garuda_Phra_Khrut_Pha_Thira_Chao.svg/1200px-Garuda_Phra_Khrut_Pha_Thira_Chao.svg.png" class="garuda" />
            </div>
            <div class="official-header">
                คำสั่ง ${officialConfig.officeName}<br/>
                ที่ ${officialConfig.commandNumber}<br/>
                เรื่อง ${officialConfig.subject}
            </div>
            <div class="divider"></div>
            <div class="official-body">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${officialConfig.preamble}
            </div>
            <br/>
            ${allJudgesContent}
            <br/>
            <div class="official-body">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป
            </div>
            <br/>
            <div class="official-date">
                ${officialConfig.dateText}
            </div>
            <br/><br/><br/>
            <div class="official-sign">
                (${officialConfig.signerName})<br/>
                ${officialConfig.signerPosition}
            </div>
          `;

      } else if (mode === 'continuous') {
          // --- Continuous Mode ---
          htmlBodyContent += `
            <h1 class="header-main">คำสั่งแต่งตั้งคณะกรรมการตัดสินการแข่งขัน</h1>
            <h2 class="header-sub">${scopeTitle}</h2>
            <div class="meta">ข้อมูล ณ วันที่ ${date}</div>
          `;

          categoryList.forEach(cat => {
              const activities = data.activities.filter(a => a.category === cat);
              let catContent = '';
              let hasActivities = false;

              activities.forEach(act => {
                  let judges = [];
                  let teamCount = 0;
                  
                  const group = activityGroups[act.id];
                  if (viewScope === 'area') {
                      judges = group.areaJudges;
                      teamCount = group.areaTeamCount;
                  } else {
                      if (clusterFilter) {
                          judges = group.clusters[clusterFilter]?.judges || [];
                          teamCount = group.clusters[clusterFilter]?.teamCount || 0;
                      } else {
                          Object.values(group.clusters).forEach(c => {
                              judges = [...judges, ...c.judges];
                              teamCount += c.teamCount;
                          });
                      }
                  }

                  if (judges.length > 0) {
                      hasActivities = true;
                      const sortedJudges = sortJudgesByRole(judges);
                      catContent += `
                        <tr class="activity-row">
                            <td colspan="5">กิจกรรม: ${act.name} <span style="font-weight:normal; font-size: 0.9em; margin-left: 5px;">(จำนวน ${teamCount} ทีม)</span></td>
                        </tr>
                        ${sortedJudges.map((j, idx) => `
                            <tr>
                                <td class="text-center">${idx + 1}</td>
                                <td>${j.judgeName}</td>
                                <td>${j.role}</td>
                                <td>${j.schoolName}</td>
                                <td>${j.phone || ''}</td>
                            </tr>
                        `).join('')}
                      `;
                  }
              });

              if (hasActivities) {
                  htmlBodyContent += `
                    <div class="category-block">
                        <div class="category-header">หมวดหมู่: ${cat}</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 50px;" class="text-center">ที่</th>
                                    <th style="width: 30%;">ชื่อ-สกุล</th>
                                    <th style="width: 25%;">ตำแหน่ง</th>
                                    <th>สังกัด / โรงเรียน</th>
                                    <th>หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>${catContent}</tbody>
                        </table>
                    </div>
                  `;
              }
          });
          
          htmlBodyContent += `
            <div class="footer-qr">
                <img src="${qrCodeBase64}" />
                <span>สแกนเพื่อตรวจสอบรายชื่อล่าสุด</span>
            </div>
          `;

      } else {
          // --- Page Per Activity Mode ---
          let pageCount = 0;
          categoryList.forEach(cat => {
              const activities = data.activities.filter(a => a.category === cat);
              activities.forEach(act => {
                  let judges: Judge[] = [];
                  let teamCount = 0;

                  const group = activityGroups[act.id];
                  if (viewScope === 'area') {
                      judges = group.areaJudges;
                      teamCount = group.areaTeamCount;
                  } else {
                      if (clusterFilter) {
                          judges = group.clusters[clusterFilter]?.judges || [];
                          teamCount = group.clusters[clusterFilter]?.teamCount || 0;
                      } else {
                          Object.values(group.clusters).forEach(c => {
                              judges = [...judges, ...c.judges];
                              teamCount += c.teamCount;
                          });
                      }
                  }

                  if (judges.length > 0) {
                      const sortedJudges = sortJudgesByRole(judges);
                      const breakClass = pageCount > 0 ? 'page-break' : '';
                      
                      htmlBodyContent += `
                        <div class="activity-page ${breakClass}">
                            <h1 class="header-main">คำสั่งแต่งตั้งคณะกรรมการตัดสินการแข่งขัน</h1>
                            <h2 class="header-sub">${scopeTitle}</h2>
                            <div class="meta">ข้อมูล ณ วันที่ ${date}</div>
                            
                            <div class="single-activity-info">
                                <div><strong>หมวดหมู่:</strong> ${cat}</div>
                                <div><strong>กิจกรรม:</strong> ${act.name}</div>
                                <div><strong>จำนวนทีมแข่งขัน:</strong> ${teamCount} ทีม</div>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 50px;" class="text-center">ที่</th>
                                        <th style="width: 30%;">ชื่อ-สกุล</th>
                                        <th style="width: 25%;">ตำแหน่ง</th>
                                        <th>สังกัด / โรงเรียน</th>
                                        <th>หมายเหตุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedJudges.map((j, idx) => `
                                        <tr>
                                            <td class="text-center">${idx + 1}</td>
                                            <td>${j.judgeName}</td>
                                            <td>${j.role}</td>
                                            <td>${j.schoolName}</td>
                                            <td>${j.phone || ''}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            
                            <div class="footer-qr absolute-bottom">
                                <img src="${qrCodeBase64}" />
                                <span>สแกนเพื่อตรวจสอบรายชื่อล่าสุด</span>
                            </div>
                        </div>
                      `;
                      pageCount++;
                  }
              });
          });
      }

      const htmlContent = `
        <html>
        <head>
            <title>รายชื่อกรรมการตัดสิน - ${scopeTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
            <style>
                @page { margin-top: ${margins.top}mm; margin-bottom: ${margins.bottom}mm; margin-left: ${margins.left}mm; margin-right: ${margins.right}mm; }
                body { font-family: 'Sarabun', sans-serif; padding: 0; font-size: 14px; color: #000; }
                
                /* Standard Table Styles */
                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
                th { background-color: #f9fafb; font-weight: bold; }
                
                /* Official Document Styles */
                .garuda-container { text-align: center; margin-bottom: 20px; }
                .garuda { width: 3cm; height: auto; }
                .official-header { text-align: center; font-weight: bold; font-size: 16pt; line-height: 1.5; margin-bottom: 10px; }
                .divider { border-bottom: 1px solid transparent; margin-bottom: 10px; }
                .official-body { text-align: justify; font-size: 16px; line-height: 1.6; }
                .official-table { width: 100%; border: none; margin-left: 20px; }
                .official-table td { border: none; padding: 2px 5px; }
                .official-date { text-align: center; margin-top: 20px; }
                .official-sign { text-align: center; margin-top: 30px; font-weight: bold; margin-left: 50%; }

                /* Common */
                h1.header-main { text-align: center; margin: 0; padding: 5px; font-size: 18px; }
                h2.header-sub { text-align: center; margin: 0; padding: 5px; font-size: 16px; font-weight: normal; }
                .meta { text-align: center; margin-bottom: 20px; font-size: 12px; color: #666; }
                
                .category-header { background-color: #e0f2fe; padding: 8px; font-weight: bold; font-size: 16px; margin-top: 15px; border: 1px solid #ccc; border-bottom: none; }
                .text-center { text-align: center; }
                .activity-row { background-color: #f0fdf4; font-weight: bold; }
                
                .single-activity-info { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; background: #f9f9f9; border-radius: 4px; }
                .footer-qr { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 20px; color: #666; font-size: 10px; }
                .footer-qr img { width: 80px; height: 80px; margin-bottom: 5px; }
                .absolute-bottom { margin-top: 30px; }

                /* Floating Action Button for Preview */
                .no-print { position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; gap: 10px; }
                .btn-print { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-family: 'Sarabun'; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; }
                .btn-print:hover { background: #1d4ed8; }
                .btn-icon { margin-right: 5px; }

                @media print {
                    .no-print { display: none; }
                    body { -webkit-print-color-adjust: exact; padding: 0; }
                    .page-break { page-break-before: always; }
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button onclick="window.print()" class="btn-print">
                    <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    พิมพ์ / บันทึก PDF
                </button>
            </div>
            ${htmlBodyContent}
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setIsGeneratingPrint(false);
  };

  if (!canManage) {
      return <div className="text-center py-20 text-gray-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  // Candidates Calculation for Import
  const candidates = tempAssignment.activityId ? getClusterJudgesForActivity(tempAssignment.activityId) : [];
  const filteredCandidates = candidates.filter(c => 
      c.judgeName.toLowerCase().includes(importSearch.toLowerCase()) || 
      c.schoolName.toLowerCase().includes(importSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({...prev, isVisible: false}))} />
        
        {/* Top Header & Scope Toggle */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Gavel className="w-6 h-6 mr-2 text-blue-600" />
                    ทำเนียบกรรมการ (Judges)
                </h2>
                <p className="text-gray-500 text-sm mt-1">บริหารจัดการกรรมการตัดสินการแข่งขัน</p>
            </div>
            
            <div className="flex gap-2">
                {/* Scope Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => { setViewScope('cluster'); setClusterFilter(''); }}
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
        </div>

        {/* View Tabs & Filters */}
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
                    <Users className="w-4 h-4 mr-2" /> รายชื่อรวม (Directory)
                </button>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'dashboard' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <UserCheck className="w-4 h-4 mr-2" /> สารสนเทศ
                </button>
            </div>
            
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowPrintModal(true)}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm font-medium text-sm"
                >
                    <Printer className="w-4 h-4 mr-2" /> พิมพ์ใบรายชื่อ
                </button>
                <button 
                    onClick={() => handleAdd(undefined, clusterFilter)}
                    className={`flex items-center px-4 py-2 text-white rounded-lg transition-colors shadow-sm font-medium text-sm ${viewScope === 'area' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    <Plus className="w-4 h-4 mr-2" /> เพิ่มกรรมการ ({viewScope === 'area' ? 'เขต' : 'กลุ่ม'})
                </button>
            </div>
        </div>

        {/* Print Option Modal */}
        {showPrintModal && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <Printer className="w-5 h-5 mr-2 text-blue-600" /> ตัวเลือกการพิมพ์
                        </h3>
                        <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <button 
                            onClick={() => handlePrintJudges('continuous')}
                            className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                        >
                            <div className="p-3 bg-gray-100 rounded-full group-hover:bg-blue-100 mr-4">
                                <FileText className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                            </div>
                            <div>
                                <div className="font-bold text-gray-800 group-hover:text-blue-700">พิมพ์แบบรวม (Continuous)</div>
                                <div className="text-xs text-gray-500 mt-1">ประหยัดกระดาษ รายชื่อเรียงต่อกันทุกกิจกรรม เหมาะสำหรับเก็บรวบรวม</div>
                            </div>
                        </button>

                        <button 
                            onClick={() => handlePrintJudges('page-per-activity')}
                            className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                        >
                            <div className="p-3 bg-gray-100 rounded-full group-hover:bg-purple-100 mr-4">
                                <Files className="w-6 h-6 text-gray-600 group-hover:text-purple-600" />
                            </div>
                            <div>
                                <div className="font-bold text-gray-800 group-hover:text-purple-700">แยกหน้าตามกิจกรรม (One Activity per Page)</div>
                                <div className="text-xs text-gray-500 mt-1">ขึ้นหน้าใหม่ทุกกิจกรรม เหมาะสำหรับแจกจ่ายรายกิจกรรม</div>
                            </div>
                        </button>

                        <div className="relative">
                            <button 
                                onClick={() => handlePrintJudges('official')}
                                className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50 transition-all group text-left"
                            >
                                <div className="p-3 bg-gray-100 rounded-full group-hover:bg-amber-100 mr-4">
                                    <ScrollText className="w-6 h-6 text-gray-600 group-hover:text-amber-600" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800 group-hover:text-amber-700">พิมพ์คำสั่งแต่งตั้ง (Official Order)</div>
                                    <div className="text-xs text-gray-500 mt-1">รูปแบบหนังสือราชการ (ตราครุฑ) พร้อมจำนวนทีม</div>
                                </div>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowOfficialSettings(true); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 shadow-sm"
                                title="ตั้งค่ารูปแบบคำสั่ง"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {isGeneratingPrint && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                            <span className="text-sm font-medium text-gray-600">กำลังเตรียมเอกสาร...</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Official Settings Modal */}
        {showOfficialSettings && (
            <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 bg-amber-50 flex justify-between items-center">
                        <h3 className="font-bold text-amber-800 flex items-center">
                            <Settings className="w-5 h-5 mr-2" /> ตั้งค่าหนังสือคำสั่งราชการ
                        </h3>
                        <button onClick={() => setShowOfficialSettings(false)} className="p-1 hover:bg-amber-100 rounded-full text-amber-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4">
                        {/* Page Margins Settings */}
                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center">
                                <MoveHorizontal className="w-3.5 h-3.5 mr-1"/> ตั้งค่าขอบกระดาษ (Margins) - หน่วย mm
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 flex items-center"><ArrowDownToLine className="w-3 h-3 mr-1"/> ขอบบน (Top)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.top ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, top: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 flex items-center"><ArrowUpFromLine className="w-3 h-3 mr-1"/> ขอบล่าง (Bottom)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.bottom ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, bottom: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">ขอบซ้าย (Left)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.left ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, left: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">ขอบขวา (Right)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.right ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, right: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">หัวข้อคำสั่ง (Office Name)</label>
                            <input className="w-full border rounded p-2 text-sm" value={officialConfig.officeName} onChange={e => setOfficialConfig({...officialConfig, officeName: e.target.value})} placeholder="คำสั่ง ศูนย์เครือข่าย..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">เลขที่คำสั่ง (No.)</label>
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.commandNumber} onChange={e => setOfficialConfig({...officialConfig, commandNumber: e.target.value})} placeholder="ที่ .../2567" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">ข้อความวันที่ (Date)</label>
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.dateText} onChange={e => setOfficialConfig({...officialConfig, dateText: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">เรื่อง (Subject)</label>
                            <input className="w-full border rounded p-2 text-sm" value={officialConfig.subject} onChange={e => setOfficialConfig({...officialConfig, subject: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ข้อความเกริ่นนำ (Preamble)</label>
                            <textarea className="w-full border rounded p-2 text-sm h-24" value={officialConfig.preamble} onChange={e => setOfficialConfig({...officialConfig, preamble: e.target.value})} />
                        </div>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">ผู้ลงนาม (Signatory)</h4>
                            <div className="space-y-2">
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.signerName} onChange={e => setOfficialConfig({...officialConfig, signerName: e.target.value})} placeholder="ชื่อ-สกุล (ไม่ต้องมีวงเล็บ)" />
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.signerPosition} onChange={e => setOfficialConfig({...officialConfig, signerPosition: e.target.value})} placeholder="ตำแหน่ง" />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                        <button onClick={() => setShowOfficialSettings(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm">ยกเลิก</button>
                        <button 
                            onClick={handleSaveOfficialConfig} 
                            disabled={isSavingConfig}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium flex items-center"
                        >
                            {isSavingConfig && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            บันทึกการตั้งค่า
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ... (Same as before) ... */}
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
            </div>
        )}

        {/* Management Content */}
        {activeTab === 'management' && (
            <div className="space-y-4">
               {/* Search & Filters */}
               <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                            placeholder="ค้นหากิจกรรม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {viewScope === 'cluster' && !isGroupAdmin && (
                        <div className="w-full md:w-auto min-w-[300px]">
                            <SearchableSelect 
                                options={[{ label: 'ทุกกลุ่มเครือข่าย', value: '' }, ...data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                                value={clusterFilter}
                                onChange={setClusterFilter}
                                placeholder="กรองตามกลุ่มเครือข่าย"
                                icon={<Filter className="w-4 h-4"/>}
                            />
                        </div>
                    )}
                </div>

                {/* Quick Filters */}
                <div className="flex justify-between items-center pb-2">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => setQuickFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${quickFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>ทั้งหมด</button>
                        <button onClick={() => setQuickFilter('external')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${quickFilter === 'external' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`}>กรรมการภายนอก</button>
                        <button onClick={() => setQuickFilter('conflict')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${quickFilter === 'conflict' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-100 hover:bg-red-50'}`}>มีข้อขัดแย้ง (Conflict)</button>
                        <button onClick={() => setQuickFilter('missing')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${quickFilter === 'missing' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-100 hover:bg-orange-50'}`}>ยังไม่มีกรรมการ</button>
                    </div>
                    <button 
                        onClick={toggleAllCategories} 
                        className="text-xs text-blue-600 font-medium hover:underline whitespace-nowrap ml-4 flex items-center"
                    >
                        <ChevronsUpDown className="w-3 h-3 mr-1" />
                        {expandedCategories.size > 0 ? 'ย่อทั้งหมด' : 'ขยายทั้งหมด'}
                    </button>
                </div>

                {/* Activity List */}
                <div className="space-y-6">
                    {categories.map(category => {
                        const isExpanded = expandedCategories.has(category) || searchTerm !== '';
                        const categoryActivities = filteredActivities.filter(a => a.category === category);
                        if (categoryActivities.length === 0) return null;

                        return (
                            <div key={category} className="animate-in fade-in slide-in-from-bottom-2 duration-500 border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                <div 
                                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => toggleCategory(category)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-white text-blue-700 rounded-md text-xs font-bold border border-blue-100 shadow-sm flex items-center">
                                            <Layers className="w-3 h-3 mr-1.5" />
                                            {category}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            ({categoryActivities.length} รายการ)
                                        </span>
                                    </div>
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                </div>
                                
                                {isExpanded && (
                                    <div className="p-4 space-y-4 bg-white/50">
                                        {categoryActivities.map(act => {
                                            const group = activityGroups[act.id];
                                            const isOpen = expandedActivity === act.id;
                                            
                                            let judgeCount = 0;
                                            let conflictCount = 0;
                                            let teamCount = 0;

                                            if (viewScope === 'area') {
                                                judgeCount = group.areaJudges.length;
                                                conflictCount = group.areaConflicts;
                                                teamCount = group.areaTeamCount;
                                            } else {
                                                Object.entries(group.clusters).forEach(([cId, cData]) => {
                                                    if (!clusterFilter || clusterFilter === cId) {
                                                        judgeCount += cData.judges.length;
                                                        conflictCount += cData.conflicts;
                                                        teamCount += cData.teamCount;
                                                    }
                                                });
                                            }
                                            const hasConflict = conflictCount > 0;

                                            return (
                                                <div key={act.id} className={`bg-white rounded-lg shadow-sm border transition-all hover:shadow-md ${hasConflict ? 'border-red-200' : 'border-gray-200'}`}>
                                                    <div 
                                                        className={`p-3 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer ${isOpen ? 'bg-blue-50/30 rounded-t-lg' : ''}`}
                                                        onClick={() => setExpandedActivity(isOpen ? null : act.id)}
                                                    >
                                                        <div className="flex items-center flex-1 min-w-0">
                                                            <div className={`p-2 rounded-lg mr-3 shrink-0 ${judgeCount > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                <Gavel className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="font-bold text-gray-800 text-sm truncate pr-2" title={act.name}>{act.name}</h3>
                                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                                    <span className="flex items-center"><UserCheck className="w-3 h-3 mr-1"/> {judgeCount} กรรมการ</span>
                                                                    <span className="text-gray-300">|</span>
                                                                    <span className="flex items-center"><School className="w-3 h-3 mr-1"/> {teamCount} ทีม</span>
                                                                    {hasConflict && (
                                                                        <span className="flex items-center text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded ml-2">
                                                                            <AlertTriangle className="w-3 h-3 mr-1" /> พบความขัดแย้ง
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 md:mt-0 flex items-center gap-2 self-end md:self-center">
                                                            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                        </div>
                                                    </div>

                                                    {isOpen && (
                                                        <div className="p-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                                                            {viewScope === 'area' ? (
                                                                // Area View Content
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    <div className="md:col-span-1 bg-gray-50 p-4 rounded-lg border border-gray-200 h-fit">
                                                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center">
                                                                            <School className="w-3 h-3 mr-1" /> ทีมแข่งขัน (Qualified: {group.areaSchools.size})
                                                                        </h4>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {Array.from(group.areaSchools).length > 0 ? Array.from(group.areaSchools).map(school => (
                                                                                <span key={school} className="text-[10px] bg-white border border-gray-300 px-2 py-1 rounded text-gray-600">{school}</span>
                                                                            )) : <span className="text-xs text-gray-400 italic">ไม่มีทีมเข้าแข่งขัน</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="md:col-span-2">
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center"><UserCheck className="w-3 h-3 mr-1" /> รายชื่อกรรมการ (ระดับเขต)</h4>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleAdd(act.id); }} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium flex items-center"><Plus className="w-3 h-3 mr-1" /> เพิ่ม</button>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {sortJudgesByRole(group.areaJudges).map(judge => renderJudgeRow(judge, group.areaSchools))}
                                                                            {group.areaJudges.length === 0 && <div className="text-center py-6 text-gray-400 text-xs border-2 border-dashed rounded">ยังไม่มีกรรมการ</div>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // Cluster View Content
                                                                <div className="space-y-3">
                                                                    {data.clusters.map(cluster => {
                                                                        if (clusterFilter && cluster.ClusterID !== clusterFilter) return null;
                                                                        const cData = group.clusters[cluster.ClusterID];
                                                                        if (!cData || (!clusterFilter && cData.judges.length === 0 && cData.competingSchools.size === 0)) return null;
                                                                        
                                                                        const isClusterCollapsed = collapsedClusters.has(`${act.id}-${cluster.ClusterID}`);
                                                                        return (
                                                                            <div key={cluster.ClusterID} className="border border-blue-100 rounded-lg overflow-hidden">
                                                                                <div 
                                                                                    className="bg-blue-50/50 px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-blue-50"
                                                                                    onClick={() => toggleCluster(act.id, cluster.ClusterID)}
                                                                                >
                                                                                    <div className="flex items-center gap-2">
                                                                                        {isClusterCollapsed ? <ChevronRight className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
                                                                                        <span className="font-bold text-blue-800 text-xs flex items-center"><LayoutGrid className="w-3.5 h-3.5 mr-2" /> {cluster.ClusterName}</span>
                                                                                        <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-blue-100">{cData.judges.length} คน / {cData.teamCount} ทีม</span>
                                                                                    </div>
                                                                                    {!isClusterCollapsed && (
                                                                                        <button onClick={(e) => { e.stopPropagation(); handleAdd(act.id, cluster.ClusterID); }} className="text-[10px] bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center"><Plus className="w-3 h-3 mr-1" /> เพิ่ม</button>
                                                                                    )}
                                                                                </div>
                                                                                {!isClusterCollapsed && (
                                                                                    <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-blue-50 animate-in fade-in">
                                                                                        <div className="md:col-span-1 bg-white p-3 rounded-lg border border-gray-100 h-fit">
                                                                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center"><School className="w-3 h-3 mr-1" /> ทีมที่เข้าแข่งขัน ({cData.competingSchools.size})</h5>
                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                {Array.from(cData.competingSchools).length > 0 ? Array.from(cData.competingSchools).map(s => <span key={s} className="text-[10px] bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">{s}</span>) : <span className="text-[10px] text-gray-400 italic">ไม่มีทีม</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="md:col-span-2">
                                                                                            <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center"><UserCheck className="w-3 h-3 mr-1" /> รายชื่อกรรมการ</h5>
                                                                                            <div className="space-y-2">
                                                                                                {sortJudgesByRole(cData.judges).map(j => renderJudgeRow(j, cData.competingSchools))}
                                                                                                {cData.judges.length === 0 && <div className="text-xs text-gray-400 italic border-2 border-dashed border-gray-100 rounded-lg p-2 text-center">ยังไม่มีกรรมการในกลุ่มนี้</div>}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filteredActivities.length === 0 && <div className="text-center py-10 text-gray-400">ไม่พบกิจกรรมที่ค้นหา</div>}
                </div>
            </div>
        )}

        {/* Directory Content */}
        {activeTab === 'directory' && (
            // ... (Same as before) ...
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                            placeholder="ค้นหาชื่อ, โรงเรียน, กิจกรรม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {viewScope === 'cluster' && !isGroupAdmin && (
                        <div className="w-full md:w-auto min-w-[300px]">
                            <SearchableSelect 
                                options={[{ label: 'ทุกกลุ่มเครือข่าย', value: '' }, ...data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                                value={clusterFilter}
                                onChange={setClusterFilter}
                                placeholder="กรองตามกลุ่มเครือข่าย"
                                icon={<Filter className="w-4 h-4"/>}
                            />
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">กรรมการ (Judge)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-[40%]">กิจกรรมที่ตัดสิน (Assigned Activities)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สังกัด/ติดต่อ</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {paginatedDirectory.map((item, idx) => (
                                <tr key={`${item.judge.judgeName}_${idx}`} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <div className="flex items-start">
                                            <img src={item.judge.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} className="w-10 h-10 rounded-full object-cover border mr-3" alt="" />
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{item.judge.judgeName}</div>
                                                <div className="text-xs text-gray-500">{item.judge.role}</div>
                                                {viewScope === 'cluster' && <div className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 w-fit">{item.judge.clusterLabel || item.judge.clusterKey}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex flex-col gap-1">
                                            {item.activities.map((act, i) => (
                                                <div key={i} className="flex items-center text-xs text-gray-700 bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                                                    <Gavel className="w-3 h-3 mr-1.5 text-gray-400" />
                                                    <span className="font-medium">{act.name}</span>
                                                    <span className="ml-auto text-[10px] text-gray-400 border-l pl-2 border-gray-300">{act.role}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <div className="text-sm text-gray-900 flex items-center mb-1">
                                            {item.judge.schoolId !== '__EXTERNAL__' ? <School className="w-3 h-3 mr-1.5 text-gray-400"/> : <Briefcase className="w-3 h-3 mr-1.5 text-orange-400"/>}
                                            <span className="truncate max-w-[150px]">{item.judge.schoolName}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center"><Phone className="w-3 h-3 mr-1.5"/> {item.judge.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(item.judge)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไขข้อมูลหลัก"><Edit2 className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedDirectory.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">ไม่พบข้อมูลกรรมการ</td></tr>}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls ... */}
                {totalDirPages > 1 && (
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                        {/* Desktop Pagination */}
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">แสดง <span className="font-medium">{(dirPage - 1) * dirPerPage + 1}</span> ถึง <span className="font-medium">{Math.min(dirPage * dirPerPage, aggregatedDirectory.length)}</span> จาก <span className="font-medium">{aggregatedDirectory.length}</span> รายการ</p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button onClick={() => setDirPage(Math.max(1, dirPage - 1))} disabled={dirPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
                                    <button onClick={() => setDirPage(Math.min(totalDirPages, dirPage + 1))} disabled={dirPage === totalDirPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
                                </nav>
                            </div>
                        </div>
                        {/* Mobile Pagination */}
                        <div className="flex justify-between w-full sm:hidden">
                             <button onClick={() => setDirPage(Math.max(1, dirPage - 1))} disabled={dirPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">ก่อนหน้า</button>
                            <span className="text-sm text-gray-600 flex items-center">หน้า {dirPage} / {totalDirPages}</span>
                            <button onClick={() => setDirPage(Math.min(totalDirPages, dirPage + 1))} disabled={dirPage === totalDirPages} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">ถัดไป</button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Enhanced Edit/Add Modal */}
        {isModalOpen && editingJudge && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className={`bg-white rounded-xl shadow-xl w-full max-w-7xl overflow-hidden flex flex-col transition-all duration-300 relative ${modalStep === 'summary' ? 'max-h-[80vh]' : 'max-h-[90vh]'}`}>
                    
                    {/* Loading Overlay inside Modal */}
                    {isSaving && (
                        <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
                            <p className="text-gray-600 font-medium">กำลังบันทึกข้อมูลกรรมการ...</p>
                        </div>
                    )}

                    {/* Modal Header */}
                    <div className={`px-6 py-4 border-b border-gray-100 flex justify-between items-center ${modalStep === 'summary' ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center text-lg">
                                {modalStep === 'summary' ? <ListChecks className="w-5 h-5 mr-2 text-green-600" /> : (editingJudge.id ? <Edit2 className="w-5 h-5 mr-2 text-blue-600" /> : <Plus className="w-5 h-5 mr-2 text-blue-600" />)}
                                {modalStep === 'summary' ? 'ยืนยันข้อมูล (Summary)' : (editingJudge.id ? 'แก้ไขข้อมูลกรรมการ' : 'เพิ่มกรรมการใหม่')}
                            </h3>
                            {modalStep === 'summary' && <p className="text-green-700 text-xs mt-1">กรุณาตรวจสอบข้อมูลก่อนบันทึก</p>}
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-black/5 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Step 1: Input Form */}
                        {modalStep === 'form' && (
                            <>
                                {/* Left Side: Personal Info */}
                                <div className="w-full md:w-1/3 p-6 border-r border-gray-100 overflow-y-auto bg-gray-50/50">
                                    <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center uppercase tracking-wide">
                                        <UserCheck className="w-4 h-4 mr-2" /> ข้อมูลส่วนตัว
                                    </h4>
                                    <div className="space-y-4">
                                        {/* Import Candidate Strip (Only in Area Mode and New Judge) */}
                                        {!editingJudge.id && viewScope === 'area' && tempAssignment.activityId && (
                                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm">
                                                <div className="bg-blue-50/50 px-3 py-2 border-b border-blue-100 flex justify-between items-center">
                                                    <h5 className="text-[10px] font-bold text-blue-800 flex items-center">
                                                        <Import className="w-3 h-3 mr-1" /> ดึงข้อมูลกรรมการเดิม (ระดับกลุ่มฯ)
                                                    </h5>
                                                    <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                                        {candidates.length} คน
                                                    </span>
                                                </div>
                                                
                                                <div className="p-3">
                                                    {/* Search Input */}
                                                    <div className="relative mb-3">
                                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                                                        <input 
                                                            type="text"
                                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                                            placeholder="ค้นหาชื่อ หรือ โรงเรียน..."
                                                            value={importSearch}
                                                            onChange={(e) => setImportSearch(e.target.value)}
                                                        />
                                                    </div>

                                                    {/* Candidate List (Vertical) - Improved Layout */}
                                                    <div className="space-y-2 max-h-[350px] min-h-[100px] overflow-y-auto custom-scrollbar pr-1 relative">
                                                        {isLoadingCandidates ? (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                                                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                                                                <span className="text-xs text-gray-500">กำลังโหลดรายชื่อ...</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {filteredCandidates.map(cj => {
                                                                    const hasConflict = isConflictWithArea(cj.schoolName, tempAssignment.activityId || '');
                                                                    return (
                                                                        <div
                                                                            key={cj.id}
                                                                            className={`flex items-center p-2 rounded-lg border transition-all relative group
                                                                                ${hasConflict 
                                                                                    ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                                                                                    : 'bg-white border-gray-100 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                                                                                }`}
                                                                        >
                                                                            {/* Avatar */}
                                                                            <div className="relative shrink-0 mr-3">
                                                                                <img src={cj.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-white" />
                                                                                {hasConflict && (
                                                                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-red-100">
                                                                                        <AlertTriangle className="w-3 h-3 text-red-500" /> 
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            
                                                                            {/* Text Info */}
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="text-xs font-bold text-gray-800 truncate">{cj.judgeName}</div>
                                                                                <div className="text-[10px] text-gray-500 truncate flex items-center">
                                                                                    <School className="w-3 h-3 mr-1 inline" /> {cj.schoolName}
                                                                                </div>
                                                                                <div className="text-[10px] text-blue-600 truncate mt-0.5">{cj.role}</div>
                                                                            </div>

                                                                            {/* Action Button */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleImportFromCluster(cj)}
                                                                                className="ml-2 p-1.5 bg-white border border-gray-200 rounded-md text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm group-hover:visible"
                                                                                title="เลือกคนนี้"
                                                                            >
                                                                                <ArrowRight className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    )
                                                                })}
                                                                {filteredCandidates.length === 0 && (
                                                                    <div className="text-center py-6 text-gray-400 text-xs italic border-2 border-dashed border-gray-100 rounded-lg">
                                                                        ไม่พบข้อมูลกรรมการ
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Image Upload */}
                                        <div className="flex flex-col items-center justify-center mb-2">
                                            <div className="relative group">
                                                <img 
                                                    src={editingJudge.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} 
                                                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-2"
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
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ - นามสกุล *</label>
                                            <input 
                                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                value={editingJudge.judgeName}
                                                onChange={e => setEditingJudge({ ...editingJudge, judgeName: e.target.value })}
                                                placeholder="เช่น นายสมชาย ใจดี"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-xs font-medium text-gray-600">สังกัด / หน่วยงาน</label>
                                                <div className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        id="isExternal"
                                                        checked={isExternal}
                                                        onChange={(e) => setIsExternal(e.target.checked)}
                                                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                    />
                                                    <label htmlFor="isExternal" className="ml-1.5 text-[10px] text-blue-600 font-bold cursor-pointer select-none">
                                                        บุคคลภายนอก
                                                    </label>
                                                </div>
                                            </div>
                                            {isExternal ? (
                                                <input 
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                    value={editingJudge.schoolName}
                                                    onChange={e => setEditingJudge({ ...editingJudge, schoolName: e.target.value })}
                                                    placeholder="ระบุชื่อหน่วยงาน..."
                                                />
                                            ) : (
                                                <SearchableSelect 
                                                    options={data.schools.map(s => ({ label: s.SchoolName, value: s.SchoolID }))}
                                                    value={editingJudge.schoolId || ''}
                                                    onChange={val => {
                                                        const school = data.schools.find(s => s.SchoolID === val);
                                                        setEditingJudge({ ...editingJudge, schoolId: val, schoolName: school?.SchoolName || '' });
                                                    }}
                                                    placeholder="เลือกโรงเรียน..."
                                                    icon={<School className="w-3 h-3"/>}
                                                />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทร</label>
                                                <input 
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                    value={editingJudge.phone}
                                                    onChange={e => setEditingJudge({ ...editingJudge, phone: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">อีเมล</label>
                                                <input 
                                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                    value={editingJudge.email}
                                                    onChange={e => setEditingJudge({ ...editingJudge, email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Activity Assignments */}
                                <div className="w-full md:w-2/3 p-6 overflow-y-auto">
                                    <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center uppercase tracking-wide justify-between">
                                        <div className="flex items-center"><Gavel className="w-4 h-4 mr-2" /> รายการที่ตัดสิน</div>
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{assignments.length} รายการ</span>
                                    </h4>

                                    {/* Add Assignment Form */}
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-blue-800 mb-1">เลือกกิจกรรม</label>
                                                <SearchableSelect 
                                                    options={data.activities.map(a => ({ label: a.name, value: a.id }))}
                                                    value={tempAssignment.activityId || ''}
                                                    onChange={val => setTempAssignment(prev => ({ ...prev, activityId: val }))}
                                                    placeholder="ค้นหากิจกรรม..."
                                                    icon={<Trophy className="w-3 h-3"/>}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">บทบาท</label>
                                                    <select 
                                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                        value={tempAssignment.role}
                                                        onChange={e => setTempAssignment(prev => ({ ...prev, role: e.target.value }))}
                                                    >
                                                        <option value="ประธานกรรมการ">ประธานกรรมการ</option>
                                                        <option value="กรรมการ">กรรมการ</option>
                                                        <option value="กรรมการและเลขา">กรรมการและเลขา</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">ขอบเขต</label>
                                                    <select 
                                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                        value={tempAssignment.stageScope}
                                                        onChange={e => setTempAssignment(prev => ({ ...prev, stageScope: e.target.value as any }))}
                                                    >
                                                        <option value="cluster">ระดับกลุ่มเครือข่าย</option>
                                                        <option value="area">ระดับเขตพื้นที่</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {/* Cluster Select if Scope is Cluster */}
                                            {tempAssignment.stageScope === 'cluster' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">กลุ่มเครือข่าย</label>
                                                    <SearchableSelect 
                                                        options={data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))}
                                                        value={tempAssignment.clusterKey || ''}
                                                        onChange={val => {
                                                            const c = data.clusters.find(cl => cl.ClusterID === val);
                                                            setTempAssignment(prev => ({ ...prev, clusterKey: val, clusterLabel: c?.ClusterName || '' }));
                                                        }}
                                                        placeholder="เลือกกลุ่มเครือข่าย..."
                                                        disabled={isGroupAdmin} 
                                                        icon={<LayoutGrid className="w-3 h-3"/>}
                                                    />
                                                </div>
                                            )}
                                            
                                            <button 
                                                onClick={addAssignment}
                                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm"
                                            >
                                                <Plus className="w-4 h-4 mr-1.5" /> เพิ่มรายการนี้
                                            </button>
                                        </div>
                                    </div>

                                    {/* Assignments List */}
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {assignments.map((item, idx) => (
                                            <div key={item.tempId} className="flex justify-between items-start p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow group">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-800 text-sm truncate" title={item.activityName}>{item.activityName}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.role}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.stageScope === 'area' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                            {item.stageScope === 'area' ? 'ระดับเขต' : `กลุ่ม: ${item.clusterLabel || item.clusterKey}`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => removeAssignment(item.tempId)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {assignments.length === 0 && (
                                            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                                <Layers className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-xs">ยังไม่มีรายการที่เพิ่ม</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 2: Summary View */}
                        {modalStep === 'summary' && (
                            <div className="w-full flex flex-col h-full bg-white">
                                {/* Profile Summary */}
                                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center gap-4 shrink-0">
                                    <img 
                                        src={editingJudge.photoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"} 
                                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                        alt="Profile"
                                    />
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900">{editingJudge.judgeName}</h4>
                                        <p className="text-sm text-gray-600 flex items-center">
                                            {isExternal ? <Briefcase className="w-3.5 h-3.5 mr-1.5 text-orange-500" /> : <School className="w-3.5 h-3.5 mr-1.5 text-gray-500" />}
                                            {editingJudge.schoolName}
                                        </p>
                                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                            <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {editingJudge.phone || '-'}</span>
                                            <span className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {editingJudge.email || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table of Assignments */}
                                <div className="flex-1 p-6 overflow-y-auto">
                                    <h5 className="font-bold text-gray-800 mb-3 flex items-center">
                                        <ListChecks className="w-5 h-5 mr-2 text-green-600" /> 
                                        ยืนยันรายการกิจกรรมที่จะบันทึก ({assignments.length})
                                    </h5>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กิจกรรม</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาท</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ขอบเขต</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                                {assignments.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 text-gray-900 font-medium">{item.activityName}</td>
                                                        <td className="px-4 py-3 text-gray-600">{item.role}</td>
                                                        <td className="px-4 py-3">
                                                            {item.stageScope === 'area' ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">เขตพื้นที่</span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {item.clusterLabel || item.clusterKey}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                        {modalStep === 'form' ? (
                            <>
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">ยกเลิก</button>
                                <button 
                                    onClick={handleReview}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm flex items-center"
                                >
                                    ตรวจสอบ & บันทึก <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setModalStep('form')} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center">
                                    <ChevronLeft className="w-4 h-4 mr-1" /> กลับไปแก้ไข
                                </button>
                                <button 
                                    onClick={handleFinalSave}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm flex items-center disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2"/>} 
                                    ยืนยันการบันทึก
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Official Settings Modal */}
        {showOfficialSettings && (
            <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 bg-amber-50 flex justify-between items-center">
                        <h3 className="font-bold text-amber-800 flex items-center">
                            <Settings className="w-5 h-5 mr-2" /> ตั้งค่าหนังสือคำสั่งราชการ
                        </h3>
                        <button onClick={() => setShowOfficialSettings(false)} className="p-1 hover:bg-amber-100 rounded-full text-amber-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4">
                        {/* Page Margins Settings */}
                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center">
                                <MoveHorizontal className="w-3.5 h-3.5 mr-1"/> ตั้งค่าขอบกระดาษ (Margins) - หน่วย mm
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 flex items-center"><ArrowDownToLine className="w-3 h-3 mr-1"/> ขอบบน (Top)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.top ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, top: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 flex items-center"><ArrowUpFromLine className="w-3 h-3 mr-1"/> ขอบล่าง (Bottom)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.bottom ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, bottom: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">ขอบซ้าย (Left)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.left ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, left: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">ขอบขวา (Right)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border rounded p-1.5 text-sm" 
                                        value={officialConfig.margins?.right ?? 20} 
                                        onChange={e => setOfficialConfig({...officialConfig, margins: { ...officialConfig.margins!, right: parseInt(e.target.value) || 0 } })} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">หัวข้อคำสั่ง (Office Name)</label>
                            <input className="w-full border rounded p-2 text-sm" value={officialConfig.officeName} onChange={e => setOfficialConfig({...officialConfig, officeName: e.target.value})} placeholder="คำสั่ง ศูนย์เครือข่าย..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">เลขที่คำสั่ง (No.)</label>
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.commandNumber} onChange={e => setOfficialConfig({...officialConfig, commandNumber: e.target.value})} placeholder="ที่ .../2567" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">ข้อความวันที่ (Date)</label>
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.dateText} onChange={e => setOfficialConfig({...officialConfig, dateText: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">เรื่อง (Subject)</label>
                            <input className="w-full border rounded p-2 text-sm" value={officialConfig.subject} onChange={e => setOfficialConfig({...officialConfig, subject: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ข้อความเกริ่นนำ (Preamble)</label>
                            <textarea className="w-full border rounded p-2 text-sm h-24" value={officialConfig.preamble} onChange={e => setOfficialConfig({...officialConfig, preamble: e.target.value})} />
                        </div>
                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">ผู้ลงนาม (Signatory)</h4>
                            <div className="space-y-2">
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.signerName} onChange={e => setOfficialConfig({...officialConfig, signerName: e.target.value})} placeholder="ชื่อ-สกุล (ไม่ต้องมีวงเล็บ)" />
                                <input className="w-full border rounded p-2 text-sm" value={officialConfig.signerPosition} onChange={e => setOfficialConfig({...officialConfig, signerPosition: e.target.value})} placeholder="ตำแหน่ง" />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                        <button onClick={() => setShowOfficialSettings(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm">ยกเลิก</button>
                        <button 
                            onClick={handleSaveOfficialConfig} 
                            disabled={isSavingConfig}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium flex items-center"
                        >
                            {isSavingConfig && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            บันทึกการตั้งค่า
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
            isLoading={isDeleting}
        />
    </div>
  );

  // Helper to render Judge Row
  function renderJudgeRow(judge: Judge, contextSchools: Set<string>) {
      const conflict = checkConflict(judge, contextSchools);
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
                          {judge.schoolId !== '__EXTERNAL__' ? <School className="w-3 h-3 mr-1" /> : <Briefcase className="w-3 h-3 mr-1 text-orange-400" />}
                          {judge.schoolName || 'ไม่ระบุสังกัด'}
                          {/* Show Network/Cluster for context */}
                          {judge.clusterLabel && (
                              <span className="ml-2 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center">
                                  <LayoutGrid className="w-3 h-3 mr-1" /> {judge.clusterLabel}
                              </span>
                          )}
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
  }
};

export default JudgesView;

