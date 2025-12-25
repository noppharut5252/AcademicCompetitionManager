
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Team, AppData, AreaStageInfo, User, TeamStatus } from '../types';
import { X, User as UserIcon, Phone, School, FileText, Medal, Flag, LayoutGrid, Users, Hash, Trophy, Edit3, Save, Loader2, Camera, Upload, Clock, CheckCircle, AlertCircle, Info, ChevronDown, Plus, Trash2, History, ArrowDown, Copy, Printer, ShieldCheck, Eye, Maximize2, PenTool, Check, Share2, MapPin, Calendar, ArrowRightLeft, Sparkles } from 'lucide-react';
import { updateTeamDetails, uploadImage } from '../services/api';
import { resizeImage, formatDeadline } from '../services/utils';
import { shareScoreResult } from '../services/liff';
import ConfirmationModal from './ConfirmationModal';

interface TeamDetailModalProps {
  team: Team;
  data: AppData;
  onClose: () => void;
  canEdit?: boolean;
  onSaveSuccess?: () => void;
  viewLevel?: 'cluster' | 'area';
  currentUser?: User | null;
}

const DEFAULT_CLASS_OPTIONS = [
  "อนุบาล 1", "อนุบาล 2", "อนุบาล 3",
  "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
  "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6",
  "ปวช.1", "ปวช.2", "ปวช.3",
  "ปวส.1", "ปวส.2"
];

// --- Helper Functions ---

// PDPA Masking Function
const maskData = (text: string, type: 'phone' | 'line', isVisible: boolean) => {
    if (isVisible || !text) return text;
    if (type === 'phone' && text.length >= 9) {
        return text.substring(0, 3) + '-XXX-' + text.substring(text.length - 4);
    }
    if (type === 'line') {
        return text.length > 2 ? text.substring(0, 2) + '****' : '****';
    }
    return text;
};

// Define getAreaInfo helper if needed locally or remove usage if duplicated
const getAreaInfo = (team: Team): AreaStageInfo | null => {
    try {
        return JSON.parse(team.stageInfo);
    } catch {
        return null;
    }
};

// Calculate Medal Logic
const calculateMedal = (score: number) => {
    if (score >= 80) return 'Gold';
    if (score >= 70) return 'Silver';
    if (score >= 60) return 'Bronze';
    return 'Participant';
};

// --- Sub-Components ---

const ModalToast = ({ message, type, isVisible }: { message: string, type: 'success' | 'error', isVisible: boolean }) => {
    if (!isVisible) return null;
    return (
        <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-[70] flex items-center px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-5 fade-in duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            <span className="font-medium text-sm">{message}</span>
        </div>
    );
};

const PrefixInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const options = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว', 'นาง', 'ว่าที่ร้อยตรี'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full sm:w-28 shrink-0" ref={wrapperRef}>
            <div className="relative">
                <input 
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none pr-6 bg-gray-50 focus:bg-white"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder || "คำนำหน้า"}
                />
                <button type="button" className="absolute right-1 top-2.5 text-gray-400 hover:text-gray-600" onClick={() => setIsOpen(!isOpen)}>
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-40 overflow-auto">
                    {options.map(opt => (
                        <div key={opt} className="px-3 py-1.5 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => { onChange(opt); setIsOpen(false); }}>{opt}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

const StatusTimeline = ({ status, hasScore }: { status: string, hasScore: boolean }) => {
    const steps = [
        { id: 'Pending', label: 'ลงทะเบียน', icon: CheckCircle },
        { id: 'Checking', label: 'รอตรวจสอบ', icon: Clock },
        { id: 'Approved', label: 'อนุมัติ', icon: ShieldCheck },
        { id: 'Scored', label: 'ประกาศผล', icon: Trophy }
    ];

    let activeIndex = 0;
    if (status === 'Approved' || status === '1' || status === TeamStatus.APPROVED) activeIndex = 2;
    else if (status === 'Pending' || status === '0' || status === TeamStatus.PENDING) activeIndex = 1;
    
    if ((status === 'Approved' || status === '1' || status === TeamStatus.APPROVED) && hasScore) activeIndex = 3;
    if (status === 'Rejected' || status === '2' || status === TeamStatus.REJECTED) activeIndex = 1;

    const isRejected = status === 'Rejected' || status === '2' || status === TeamStatus.REJECTED;

    return (
        <div className="flex items-center justify-between w-full max-w-lg mx-auto mb-6 px-4 relative">
            <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-gray-200 -z-10"></div>
            <div className="absolute left-4 h-0.5 bg-green-500 -z-10 transition-all duration-500" style={{ right: `${100 - (activeIndex / 3) * 100}%` }}></div>

            {steps.map((step, idx) => {
                const isActive = idx <= activeIndex;
                const isCurrent = idx === activeIndex;
                let colorClass = isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400';
                if (isRejected && idx === activeIndex) colorClass = 'bg-red-500 text-white';

                return (
                    <div key={step.id} className="flex flex-col items-center gap-1 bg-white px-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${colorClass} ${isCurrent ? 'ring-4 ring-white shadow-md scale-110' : ''}`}>
                            <step.icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-medium ${isActive ? (isRejected && isCurrent ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}>
                            {isRejected && idx === activeIndex ? 'ถูกปฏิเสธ' : step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, data, onClose, canEdit = false, onSaveSuccess, viewLevel = 'cluster', currentUser }) => {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'results' | 'files'>('info');
  const [memberViewMode, setMemberViewMode] = useState<'current' | 'compare'>('current');
  
  // Logic & Data States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingState, setUploadingState] = useState<{ id: string, loading: boolean }>({ id: '', loading: false });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Modals & Popups
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error', show: boolean }>({ msg: '', type: 'success', show: false });
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean, type: 'teacher' | 'student', index: number }>({ show: false, type: 'teacher', index: -1 });
  const [imageZoom, setImageZoom] = useState<string | null>(null);

  // Form Data
  const [editTeamName, setEditTeamName] = useState(team.teamName);
  const [editContact, setEditContact] = useState<any>({});
  const [editTeachers, setEditTeachers] = useState<any[]>([]);
  const [editStudents, setEditStudents] = useState<any[]>([]);

  // Original Cluster Members (For comparison)
  const [clusterTeachers, setClusterTeachers] = useState<any[]>([]);
  const [clusterStudents, setClusterStudents] = useState<any[]>([]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const getPhotoUrl = (driveId: string) => `https://drive.google.com/thumbnail?id=${driveId}`;
  
  // Context
  const isAreaContext = viewLevel === 'area';
  const activity = (data.activities || []).find(a => a.id === team.activityId);
  const school = (data.schools || []).find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
  const cluster = (data.clusters || []).find(c => c.ClusterID === school?.SchoolCluster);
  const files = (data.files || []).filter(f => f.TeamID === team.teamId);
  const rawStatus = String(team.status);
  const displayStatus = (rawStatus === '1' || rawStatus === TeamStatus.APPROVED) ? 'Approved' : (rawStatus === '2' || rawStatus === '-1' || rawStatus === TeamStatus.REJECTED) ? 'Rejected' : 'Pending';
  
  // Parse Area Info
  let areaInfo: AreaStageInfo | null = null;
  try { if (team.stageInfo) areaInfo = JSON.parse(team.stageInfo); } catch { }
  const hasAreaScore = areaInfo && (areaInfo.score > 0 || areaInfo.score === -1);

  // Initialization
  useEffect(() => {
      let nameToUse = team.teamName;
      let contactToUse = team.contact;
      let membersToUse = team.members;

      // 1. Always load Cluster Members for Comparison
      try {
          const rawClusterMembers = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
          const process = (m: any) => ({ ...m, image: m.image || (m.photoDriveId ? getPhotoUrl(m.photoDriveId) : '') });
          if (rawClusterMembers) {
              if (Array.isArray(rawClusterMembers)) {
                  setClusterStudents(rawClusterMembers.map(process));
              } else if (typeof rawClusterMembers === 'object') {
                  setClusterTeachers((Array.isArray(rawClusterMembers.teachers) ? rawClusterMembers.teachers : []).map(process));
                  setClusterStudents((Array.isArray(rawClusterMembers.students) ? rawClusterMembers.students : []).map(process));
              }
          }
      } catch { }

      // 2. Load Current View Data
      if (isAreaContext && team.stageInfo) {
          try {
              const areaData = JSON.parse(team.stageInfo);
              if (areaData.name) nameToUse = areaData.name;
              if (areaData.contact) contactToUse = areaData.contact;
              if (areaData.members) membersToUse = areaData.members;
          } catch(e) {}
      }

      setEditTeamName(nameToUse);
      try { setEditContact(typeof contactToUse === 'string' ? JSON.parse(contactToUse) : contactToUse || {}); } catch { setEditContact({}); }
      try {
        const rawMembers = typeof membersToUse === 'string' ? JSON.parse(membersToUse) : membersToUse;
        const process = (m: any) => ({ ...m, image: m.image || (m.photoDriveId ? getPhotoUrl(m.photoDriveId) : '') });
        if (rawMembers) {
            if (Array.isArray(rawMembers)) {
                setEditStudents(rawMembers.map(process));
            } else if (typeof rawMembers === 'object') {
                setEditTeachers((Array.isArray(rawMembers.teachers) ? rawMembers.teachers : []).map(process));
                setEditStudents((Array.isArray(rawMembers.students) ? rawMembers.students : []).map(process));
            }
        }
      } catch { setEditTeachers([]); setEditStudents([]); }
  }, [team, isAreaContext]);

  // Actions
  const handleSave = async () => {
      if (uploadingState.loading) return;
      setIsSaving(true);
      const prepare = (m: any) => {
          const { image, fileId, ...rest } = m; 
          return fileId ? { ...rest, photoDriveId: fileId } : rest;
      };
      const payload = {
          teamId: team.teamId,
          teamName: editTeamName,
          contact: JSON.stringify(editContact),
          members: JSON.stringify({ teachers: editTeachers.map(prepare), students: editStudents.map(prepare) }),
          isArea: isAreaContext,
          lastEditedBy: currentUser?.name || currentUser?.username || 'Unknown',
          lastEditedAt: new Date().toISOString()
      };
      const success = await updateTeamDetails(payload);
      setIsSaving(false);
      if (success) {
          showNotification('บันทึกสำเร็จ', 'success');
          setHasUnsavedChanges(false);
          setIsEditing(false);
          if (onSaveSuccess) onSaveSuccess();
      } else {
          showNotification('บันทึกไม่สำเร็จ', 'error');
      }
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
      setToast({ msg, type, show: true });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handlePrintApplication = () => {
      const w = window.open('', '_blank');
      if (!w) return;
      
      // Find Schedule Info
      let dateStr = '................................';
      let placeStr = '................................';
      
      if (data.venues) {
          for (const v of data.venues) {
              const schedules = v.scheduledActivities?.filter(s => s.activityId === team.activityId) || [];
              
              // Filter based on view context (Area vs Cluster)
              const match = schedules.find(s => {
                  if (isAreaContext) return s.level === 'area';
                  // For cluster view, accept 'cluster' or undefined level (legacy/default)
                  return s.level === 'cluster' || !s.level;
              });

              if (match) {
                  placeStr = `${v.name} ${match.building || ''} ${match.room || ''}`;
                  dateStr = `${match.date || ''} ${match.timeRange || ''}`;
                  break;
              }
          }
      }

      // Simple Print Template with Date and Place
      w.document.write(`
        <html><head><title>ใบรายงานตัว - ${editTeamName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Sarabun', sans-serif; padding: 20px; font-size: 14px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .content { margin-bottom: 15px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; text-align: center; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; }
            .box { width: 40%; text-align: center; }
            .line { border-bottom: 1px dotted #000; height: 30px; margin-bottom: 5px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        </style>
        </head><body>
            <div class="header">
                <h1>ใบรายงานตัวเข้าแข่งขัน (Registration Form)</h1>
                <h2>งานศิลปหัตถกรรมนักเรียน (${isAreaContext ? 'ระดับเขตพื้นที่' : 'ระดับกลุ่มเครือข่าย'})</h2>
            </div>
            <div class="content">
                <div class="meta-row">
                    <div><strong>รายการ:</strong> ${activity?.name}</div>
                    <div><strong>รหัสทีม:</strong> ${team.teamId}</div>
                </div>
                <div class="meta-row">
                    <div><strong>ทีม:</strong> ${editTeamName}</div>
                    <div><strong>โรงเรียน:</strong> ${school?.SchoolName || team.schoolId}</div>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
                    <strong>วันที่แข่งขัน:</strong> ${dateStr}<br/>
                    <strong>สถานที่:</strong> ${placeStr}
                </div>
            </div>
            <h3>รายชื่อผู้เข้าแข่งขัน</h3>
            <table>
                <thead><tr><th style="width: 50px;">ที่</th><th>ชื่อ-สกุล</th><th>สถานะ</th><th style="width: 150px;">ลายมือชื่อ</th></tr></thead>
                <tbody>
                    ${editTeachers.map((t, i) => `<tr><td style="text-align: center;">${i+1}</td><td>${t.prefix || ''}${t.name}</td><td>ครูผู้ฝึกสอน</td><td></td></tr>`).join('')}
                    ${editStudents.map((s, i) => `<tr><td style="text-align: center;">${i+1}</td><td>${s.prefix || ''}${s.name}</td><td>นักเรียน</td><td></td></tr>`).join('')}
                </tbody>
            </table>
            <div class="footer">
                <div class="box"><div class="line"></div>ลงชื่อ ครูผู้ควบคุมทีม</div>
                <div class="box"><div class="line"></div>ลงชื่อ เจ้าหน้าที่รับรายงานตัว</div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
        </body></html>
      `);
      w.document.close();
  };

  const handleCopyId = () => {
      navigator.clipboard.writeText(team.teamId);
      showNotification('คัดลอกรหัสทีมแล้ว', 'success');
  };

  // --- Render Sections ---

  const renderInfoTab = () => (
      <div className="space-y-4 animate-in fade-in">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-blue-800 flex items-center">
                      <School className="w-4 h-4 mr-2"/> ข้อมูลโรงเรียน
                  </h4>
                  <span className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded border border-blue-200">{team.teamId}</span>
              </div>
              <div className="text-sm text-gray-700 font-medium">{school?.SchoolName || team.schoolId}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center">
                  <LayoutGrid className="w-3 h-3 mr-1"/> {cluster?.ClusterName || '-'}
              </div>
          </div>

          <div className="space-y-3">
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ชื่อทีม (Team Name)</label>
                  {isEditing ? (
                      <input 
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          value={editTeamName}
                          onChange={(e) => setEditTeamName(e.target.value)}
                      />
                  ) : (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm font-bold text-gray-800 border border-gray-200">
                          {editTeamName}
                      </div>
                  )}
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">ผู้ประสานงาน (Contact)</label>
                  {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input 
                              className="border rounded-lg px-3 py-2 text-sm"
                              placeholder="ชื่อผู้ติดต่อ"
                              value={editContact.name || ''}
                              onChange={(e) => setEditContact({...editContact, name: e.target.value})}
                          />
                          <input 
                              className="border rounded-lg px-3 py-2 text-sm"
                              placeholder="เบอร์โทร"
                              value={editContact.phone || ''}
                              onChange={(e) => setEditContact({...editContact, phone: e.target.value})}
                          />
                      </div>
                  ) : (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-200 flex flex-col sm:flex-row sm:justify-between gap-2">
                          <span className="font-medium flex items-center"><UserIcon className="w-3.5 h-3.5 mr-2 text-gray-400"/> {editContact.name || '-'}</span>
                          <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-2 text-gray-400"/> {maskData(editContact.phone || '-', 'phone', canEdit)}</span>
                      </div>
                  )}
              </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-2">
              <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide flex items-center">
                  <Info className="w-3 h-3 mr-1"/> รายละเอียดกิจกรรม
              </h4>
              <div className="bg-white border border-gray-200 rounded-xl p-3 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div>
                      <span className="block text-xs text-gray-400 mb-0.5">รายการ</span>
                      <span className="font-medium text-gray-800">{activity?.name}</span>
                  </div>
                  <div>
                      <span className="block text-xs text-gray-400 mb-0.5">ระดับชั้น</span>
                      <span className="font-medium text-gray-800">{team.level}</span>
                  </div>
                  <div>
                      <span className="block text-xs text-gray-400 mb-0.5">หมวดหมู่</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {activity?.category}
                      </span>
                  </div>
                  <div>
                      <span className="block text-xs text-gray-400 mb-0.5">ประเภท</span>
                      <span className="font-medium text-gray-800">{activity?.mode === 'Team' ? 'ทีม' : 'เดี่ยว'}</span>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderMembersTab = () => {
      const reqTeachers = activity?.reqTeachers || 0;
      const reqStudents = activity?.reqStudents || 0;

      // Determine view mode lists
      const showComparison = isAreaContext && memberViewMode === 'compare';
      
      const renderPersonList = (type: 'teacher' | 'student', list: any[], title: string, req: number, comparisonList: any[] = []) => (
          <div className="mb-6">
              <div className="flex justify-between items-center mb-3 border-b pb-2">
                  <h5 className="text-sm font-bold text-gray-700 flex items-center">
                      {type === 'teacher' ? <UserIcon className="w-4 h-4 mr-2"/> : <Users className="w-4 h-4 mr-2"/>}
                      {title} 
                      <span className="ml-2 text-xs font-normal text-gray-500">({list.length}/{req})</span>
                  </h5>
                  {isEditing && list.length < req && (
                      <button onClick={() => type === 'teacher' ? setEditTeachers([...editTeachers, { name: '', prefix: '' }]) : setEditStudents([...editStudents, { name: '', prefix: '' }])} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center">
                          <Plus className="w-3 h-3 mr-1"/> เพิ่มรายชื่อ
                      </button>
                  )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                  {list.map((m, idx) => {
                      // Check difference if in compare mode
                      let isDiff = false;
                      let originalName = '';
                      if (showComparison) {
                          const original = comparisonList[idx];
                          if (!original || original.name !== m.name || original.prefix !== m.prefix) {
                              isDiff = true;
                              originalName = original ? `${original.prefix || ''}${original.name}` : '(ไม่มีข้อมูลเดิม)';
                          }
                      }

                      return (
                          <div key={idx} className={`flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm relative group ${isDiff ? 'border-orange-300 ring-1 ring-orange-100' : 'border-gray-200'}`}>
                              <div className="relative shrink-0 cursor-pointer" onClick={() => m.image && setImageZoom(m.image)}>
                                  {m.image ? (
                                      <img src={m.image} className="w-12 h-12 rounded-full object-cover border" alt="Avatar"/>
                                  ) : (
                                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold border">{type === 'teacher' ? 'T' : 'S'}{idx+1}</div>
                                  )}
                                  {m.image && <div className="absolute inset-0 bg-black/0 hover:bg-black/20 rounded-full transition-colors flex items-center justify-center"><Maximize2 className="w-4 h-4 text-white opacity-0 hover:opacity-100"/></div>}
                                  {isEditing && (
                                      <label className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow border cursor-pointer hover:text-blue-600">
                                          <Camera className="w-3 h-3" />
                                          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                              if (!e.target.files?.[0]) return;
                                              setUploadingState({ id: `${type}-${idx}`, loading: true });
                                              try {
                                                  const base64 = await resizeImage(e.target.files[0]);
                                                  const res = await uploadImage(base64, `avatar_${team.teamId}_${type}_${idx}.jpg`);
                                                  if (res.status === 'success') {
                                                      const newList = [...list];
                                                      newList[idx] = { ...newList[idx], image: getPhotoUrl(res.fileId), fileId: res.fileId };
                                                      type === 'teacher' ? setEditTeachers(newList) : setEditStudents(newList);
                                                  }
                                              } finally { setUploadingState({ id: '', loading: false }); }
                                          }}/>
                                      </label>
                                  )}
                              </div>
                              
                              <div className="flex-1 space-y-1">
                                  {isEditing ? (
                                      <div className="flex gap-2">
                                          <PrefixInput value={m.prefix || ''} onChange={val => { const n = [...list]; n[idx].prefix = val; type === 'teacher' ? setEditTeachers(n) : setEditStudents(n); }} />
                                          <input className="flex-1 border rounded px-2 py-2 text-sm bg-gray-50 focus:bg-white" placeholder="ชื่อ-สกุล" value={m.name} onChange={e => { const n = [...list]; n[idx].name = e.target.value; type === 'teacher' ? setEditTeachers(n) : setEditStudents(n); }} />
                                      </div>
                                  ) : (
                                      <div>
                                          <p className="text-sm font-bold text-gray-900">{m.prefix}{m.name}</p>
                                          {isDiff && (
                                              <div className="text-[10px] text-orange-600 flex items-center mt-0.5 bg-orange-50 px-1.5 rounded w-fit border border-orange-100">
                                                  <Info className="w-3 h-3 mr-1"/> เดิม: {originalName}
                                              </div>
                                          )}
                                      </div>
                                  )}
                                  {/* Only show Phone for Teachers */}
                                  {type === 'teacher' && (
                                      isEditing ? (
                                          <input className="w-full border rounded px-2 py-1 text-xs" placeholder="เบอร์โทร" value={m.phone || ''} onChange={e => { const n = [...list]; n[idx].phone = e.target.value; setEditTeachers(n); }} />
                                      ) : <p className="text-xs text-gray-500 flex items-center">{maskData(m.phone || '-', 'phone', canEdit)} {!canEdit && m.phone && <ShieldCheck className="w-3 h-3 ml-1 text-green-500"/>}</p>
                                  )}
                              </div>
                              {isEditing && (
                                  <button onClick={() => { setConfirmDelete({ show: true, type, index: idx }); }} className="text-gray-400 hover:text-red-500 p-2">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      );

      return (
          <div className="animate-in fade-in">
              {isAreaContext && (
                  <div className="flex justify-end mb-4">
                      <button 
                          onClick={() => setMemberViewMode(memberViewMode === 'current' ? 'compare' : 'current')}
                          className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center border transition-all ${memberViewMode === 'compare' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                          <ArrowRightLeft className="w-3 h-3 mr-1.5" />
                          {memberViewMode === 'compare' ? 'ซ่อนข้อมูลเปรียบเทียบ' : 'เปรียบเทียบกับระดับกลุ่มฯ'}
                      </button>
                  </div>
              )}

              {renderPersonList('teacher', editTeachers, 'ครูผู้ฝึกสอน', reqTeachers, clusterTeachers)}
              {renderPersonList('student', editStudents, 'นักเรียน', reqStudents, clusterStudents)}
          </div>
      );
  };

  const renderResultsTab = () => {
      let score = 0;
      let medal = '';
      let rank = '';
      
      if (isAreaContext) {
          score = areaInfo?.score || 0;
          rank = areaInfo?.rank || '';
          medal = areaInfo?.medal || '';
      } else {
          score = team.score;
          rank = team.rank;
          medal = team.medalOverride || '';
      }

      const hasScore = score > 0 || score === -1;

      // Auto-calculate medal if score exists but no medal
      if (!medal && score > 0) {
          medal = calculateMedal(score);
      }

      const lowerMedal = (medal || '').toLowerCase();
      
      // Determine Styles
      let bgGradient = 'from-gray-100 to-gray-200';
      let textColor = 'text-gray-600';
      let iconColor = 'text-gray-400';
      let medalIcon = <Medal className="w-12 h-12 text-gray-400" />;

      if (lowerMedal.includes('gold')) {
          bgGradient = 'from-yellow-400 to-amber-500';
          textColor = 'text-white';
          iconColor = 'text-yellow-100';
          medalIcon = <Medal className="w-16 h-16 text-white drop-shadow-md" />;
      } else if (lowerMedal.includes('silver')) {
          bgGradient = 'from-gray-300 to-slate-400';
          textColor = 'text-white';
          iconColor = 'text-gray-100';
          medalIcon = <Medal className="w-16 h-16 text-white drop-shadow-md" />;
      } else if (lowerMedal.includes('bronze')) {
          bgGradient = 'from-orange-400 to-red-500';
          textColor = 'text-white';
          iconColor = 'text-orange-100';
          medalIcon = <Medal className="w-16 h-16 text-white drop-shadow-md" />;
      } else if (hasScore && score > 0) {
          bgGradient = 'from-blue-500 to-indigo-600';
          textColor = 'text-white';
          iconColor = 'text-blue-200';
          medalIcon = <Trophy className="w-16 h-16 text-white drop-shadow-md" />;
      }

      return (
          <div className="animate-in fade-in py-4">
              <div className={`rounded-2xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br ${bgGradient} text-white mb-6 transition-all duration-500`}>
                  <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12 scale-150 pointer-events-none">
                      <Trophy className="w-64 h-64" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="mb-4 animate-bounce">
                          {medalIcon}
                      </div>
                      
                      <h3 className={`text-sm font-bold uppercase tracking-widest mb-1 opacity-90 ${textColor}`}>
                          {isAreaContext ? 'ผลการแข่งขันระดับเขตพื้นที่' : 'ผลการแข่งขันระดับกลุ่มเครือข่าย'}
                      </h3>
                      
                      {hasScore ? (
                          <>
                              <div className={`text-6xl font-black mb-2 drop-shadow-sm ${textColor}`}>
                                  {score === -1 ? '-' : score}
                              </div>
                              <div className={`text-2xl font-bold mb-6 ${textColor}`}>
                                  {medal === 'Gold' ? 'เหรียญทอง' : medal === 'Silver' ? 'เหรียญเงิน' : medal === 'Bronze' ? 'เหรียญทองแดง' : medal || 'เข้าร่วม'}
                              </div>
                              {rank && (
                                  <div className="inline-block bg-black/20 backdrop-blur-md rounded-full px-6 py-2 text-sm font-bold border border-white/20">
                                      ลำดับที่ {rank}
                                  </div>
                              )}
                          </>
                      ) : (
                          <div className="py-8 text-white/70 font-medium">
                              รอผลการตัดสิน
                          </div>
                      )}
                  </div>
              </div>

              {hasScore && (
                  <button 
                      onClick={handleShareResult}
                      disabled={isSharing}
                      className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white py-3 rounded-xl font-bold shadow-md flex items-center justify-center transition-colors active:scale-95"
                  >
                      {isSharing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Share2 className="w-5 h-5 mr-2" />}
                      แชร์ผลงาน (Share Result)
                  </button>
              )}
          </div>
      );
  };

  const renderFilesTab = () => (
      <div className="space-y-4 animate-in fade-in">
          {files.length > 0 ? files.map(f => (
              <a key={f.FileLogID} href={f.FileUrl} target="_blank" className="flex items-center p-3 bg-white border rounded-xl hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{f.FileType}</div>
                      <div className="text-xs text-gray-500">{f.Status}</div>
                  </div>
                  <ArrowDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              </a>
          )) : <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">ไม่มีไฟล์แนบ</div>}
      </div>
  );

  // New function to handle sharing logic inside component
  const handleShareResult = async () => {
      setIsSharing(true);
      try {
          // Prepare Data
          const activityName = activity?.name || team.activityId;
          const schoolName = school?.SchoolName || team.schoolId;
          let scoreVal = team.score;
          let medalVal = team.medalOverride;
          let rankVal = team.rank;

          if (isAreaContext && areaInfo) {
              scoreVal = areaInfo.score || 0;
              medalVal = areaInfo.medal || '';
              rankVal = areaInfo.rank || '';
          }

          // Auto-calculate for sharing if missing
          if (!medalVal && scoreVal > 0) {
              medalVal = calculateMedal(scoreVal);
          }

          // Trigger Service
          await shareScoreResult(
              editTeamName, 
              schoolName, 
              activityName, 
              scoreVal === -1 ? '-' : scoreVal, 
              medalVal, 
              rankVal, 
              team.teamId
          );
          showNotification('เปิดแอป LINE เรียบร้อยแล้ว', 'success');
      } catch (e) {
          showNotification('ไม่สามารถแชร์ได้', 'error');
      } finally {
          setIsSharing(false);
      }
  };

  return (
    <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            
            {/* Image Zoom Modal */}
            {imageZoom && (
                <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); setImageZoom(null); }}>
                    <img src={imageZoom} className="max-w-full max-h-full rounded shadow-2xl animate-in zoom-in duration-300" />
                    <button className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full hover:bg-white/30"><X className="w-6 h-6"/></button>
                </div>
            )}

            <ModalToast message={toast.msg} type={toast.type} isVisible={toast.show} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-100 relative">
                    <StatusTimeline status={displayStatus} hasScore={team.score > 0 || hasAreaScore || false} />
                    
                    <div className="flex justify-between items-start mt-4">
                        <div className="flex-1 min-w-0 pr-4">
                            {isEditing ? (
                                <input className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none w-full" value={editTeamName} onChange={e => setEditTeamName(e.target.value)} />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-gray-900 line-clamp-1">{editTeamName}</h2>
                                    <button onClick={handleCopyId} className="text-gray-400 hover:text-blue-500 transition-colors shrink-0" title="Copy Team ID"><Copy className="w-4 h-4" /></button>
                                </div>
                            )}
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{team.teamId}</span>
                                {displayStatus === 'Approved' && <span className="text-green-600 flex items-center text-xs"><CheckCircle className="w-3 h-3 mr-1"/> อนุมัติแล้ว</span>}
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {!isEditing && <button onClick={handlePrintApplication} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="พิมพ์ใบรายงานตัว"><Printer className="w-5 h-5" /></button>}
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 mt-6 border-b border-gray-100 text-sm font-medium overflow-x-auto no-scrollbar">
                        {[
                            { id: 'info', label: 'ข้อมูลทั่วไป' },
                            { id: 'members', label: 'สมาชิก' },
                            { id: 'results', label: 'ผลการแข่งขัน' },
                            { id: 'files', label: 'เอกสารแนบ' },
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-3 relative transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                                {tab.label}
                                {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {activeTab === 'info' && renderInfoTab()}
                    {activeTab === 'members' && renderMembersTab()}
                    {activeTab === 'results' && renderResultsTab()}
                    {activeTab === 'files' && renderFilesTab()}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center shrink-0">
                    {!canEdit ? (
                        <div className="text-xs text-gray-400 flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-1 text-green-500" /> PDPA Protected Mode
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400">
                            {team.lastEditedBy ? `แก้ไขล่าสุดโดย ${team.lastEditedBy}` : ''}
                        </div>
                    )}

                    {canEdit && (
                        <div className="flex gap-3">
                            {isEditing ? (
                                <>
                                    <button onClick={() => { setIsEditing(false); setHasUnsavedChanges(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">ยกเลิก</button>
                                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm flex items-center disabled:opacity-70">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} บันทึก
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm flex items-center">
                                    <Edit3 className="w-4 h-4 mr-2"/> แก้ไขข้อมูล
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Delete Confirmation */}
        <ConfirmationModal 
            isOpen={confirmDelete.show}
            title={`ลบรายชื่อ${confirmDelete.type === 'teacher' ? 'ครู' : 'นักเรียน'}`}
            description="คุณต้องการลบรายชื่อนี้ใช่หรือไม่?"
            confirmLabel="ลบออก"
            confirmColor="red"
            onConfirm={() => {
                if (confirmDelete.type === 'teacher') {
                    const n = [...editTeachers]; n.splice(confirmDelete.index, 1); setEditTeachers(n);
                } else {
                    const n = [...editStudents]; n.splice(confirmDelete.index, 1); setEditStudents(n);
                }
                setConfirmDelete({ show: false, type: 'teacher', index: -1 });
            }}
            onCancel={() => setConfirmDelete({ show: false, type: 'teacher', index: -1 })}
        />
    </>
  );
};

export default TeamDetailModal;
