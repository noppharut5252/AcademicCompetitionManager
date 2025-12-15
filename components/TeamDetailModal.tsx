
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Team, AppData, AreaStageInfo, User } from '../types';
import { X, User as UserIcon, Phone, School, FileText, Medal, Flag, LayoutGrid, Users, Hash, Trophy, Edit3, Save, Loader2, Camera, Upload, Clock, CheckCircle, AlertCircle, Info, ChevronDown, Plus, Trash2, History, ArrowDown, Copy } from 'lucide-react';
import { updateTeamDetails, uploadImage } from '../services/api';
import { resizeImage, formatDeadline } from '../services/utils';
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

// Smart parser for level strings like "ป.1-ป.6,อ.1-อ.3,,ม.1-ม.3"
const parseLevelConfig = (configStr: string): string[] => {
    if (!configStr) return DEFAULT_CLASS_OPTIONS;

    const options: Set<string> = new Set();
    const parts = configStr.split(',').map(s => s.trim()).filter(s => s);

    const addRange = (prefix: string, start: number, end: number) => {
        for (let i = start; i <= end; i++) {
            options.add(`${prefix}${i}`);
        }
    };

    const processPart = (part: string) => {
        // Handle "X.1-Y.3" or "X.1-3" ranges
        const rangeMatch = part.match(/^([^\d]+)(\d+)-([^\d]*)(\d+)$/);
        
        if (rangeMatch) {
            const prefix1 = rangeMatch[1];
            const start = parseInt(rangeMatch[2]);
            const prefix2 = rangeMatch[3] || prefix1; // if 2nd prefix missing, use 1st
            const end = parseInt(rangeMatch[4]);

            // Normalize prefixes for display
            let cleanPrefix = prefix1.replace('ป.', 'ป.').replace('ม.', 'ม.').replace('อ.', 'อนุบาล ').replace('ปวช.', 'ปวช.').replace('ปวส.', 'ปวส.');
            if (cleanPrefix.includes('อนุบาล')) cleanPrefix = "อนุบาล "; // Ensure spacing

            if (prefix1 === prefix2 || !rangeMatch[3]) {
                 addRange(cleanPrefix, start, end);
            } else {
                // If prefixes differ (rare "ป.6-ม.1"), add explicit logic if needed, but usually same level type
                // Just fallback to simple add
                options.add(part); 
            }
        } else {
            // Single items or simpler patterns
            let display = part.replace('อ.', 'อนุบาล ');
            // If it's just "ป.1" -> add
            options.add(display);
        }
    };

    parts.forEach(processPart);

    // If parsing failed to produce options (e.g. complex text), allow defaults to be safe, 
    // or if it produced some, sort them roughly?
    if (options.size === 0) return DEFAULT_CLASS_OPTIONS;

    // Sort based on logical order
    const order = ["อนุบาล", "ป.", "ม.", "ปวช.", "ปวส."];
    return Array.from(options).sort((a, b) => {
        const aIdx = order.findIndex(o => a.startsWith(o));
        const bIdx = order.findIndex(o => b.startsWith(o));
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.localeCompare(b, undefined, { numeric: true });
    });
};

// Internal Toast Component for Modal
const ModalToast = ({ message, type, isVisible }: { message: string, type: 'success' | 'error', isVisible: boolean }) => {
    if (!isVisible) return null;
    return (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-[70] flex items-center px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-5 fade-in duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            <span className="font-medium text-sm">{message}</span>
        </div>
    );
};

// Helper: Custom Input with Dropdown for Prefix
const PrefixInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const options = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว', 'นาง', 'ว่าที่ร้อยตรี'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full sm:w-28 shrink-0" ref={wrapperRef}>
            <div className="relative">
                <input 
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none pr-6"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder || "คำนำหน้า"}
                />
                <button 
                    type="button"
                    className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-40 overflow-auto">
                    {options.map(opt => (
                        <div 
                            key={opt}
                            className="px-3 py-1.5 text-sm hover:bg-gray-100 cursor-pointer"
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, data, onClose, canEdit = false, onSaveSuccess, viewLevel = 'cluster', currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingState, setUploadingState] = useState<{ id: string, loading: boolean }>({ id: '', loading: false });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Notification State
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error', show: boolean }>({ msg: '', type: 'success', show: false });
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean, type: 'teacher' | 'student', index: number }>({ show: false, type: 'teacher', index: -1 });
  const [transferConfirm, setTransferConfirm] = useState<{ show: boolean, previewData: any }>({ show: false, previewData: null });
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Form States
  const [editTeamName, setEditTeamName] = useState(team.teamName);
  const [displayTeamName, setDisplayTeamName] = useState(''); // New state for instant update
  const [editContact, setEditContact] = useState<any>({});
  const [editTeachers, setEditTeachers] = useState<any[]>([]);
  const [editStudents, setEditStudents] = useState<any[]>([]);

  // Refs for file inputs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getPhotoUrl = (driveId: string) => `https://drive.google.com/thumbnail?id=${driveId}`;

  // Use viewLevel to determine if we should load/edit Area data.
  // We prioritize viewLevel 'area'. If user is in Area view, they likely want to edit Area info.
  // Fallback check: if team is officially flagged as Area, we also treat it as Area context if needed, but viewLevel is explicit.
  const isAreaContext = viewLevel === 'area';

  const activity = data.activities.find(a => a.id === team.activityId);
  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
  const cluster = data.clusters.find(c => c.ClusterID === school?.SchoolCluster);
  const files = data.files.filter(f => f.TeamID === team.teamId);

  // Dynamic Level Options from Team's specific level column
  const levelOptions = useMemo(() => parseLevelConfig(team.level || ''), [team.level]);

  useEffect(() => {
      // Logic: If Area Context, load data from 'stageInfo'. If not, use standard columns.
      let nameToUse = team.teamName;
      let contactToUse = team.contact;
      let membersToUse = team.members;

      if (isAreaContext && team.stageInfo) {
          try {
              const areaData = JSON.parse(team.stageInfo);
              // Use Area data if available, otherwise fallback to team data (might be first time entering area stage)
              if (areaData.name) nameToUse = areaData.name;
              if (areaData.contact) contactToUse = areaData.contact;
              if (areaData.members) membersToUse = areaData.members;
          } catch(e) { console.error("Error parsing Area Info", e); }
      }

      setEditTeamName(nameToUse);
      setDisplayTeamName(nameToUse); // Initialize display name
      
      // Parse Contact
      try {
        const parsed = typeof contactToUse === 'string' ? JSON.parse(contactToUse) : contactToUse;
        setEditContact(parsed || {});
      } catch { setEditContact({}); }

      // Parse Members
      try {
        const rawMembers = typeof membersToUse === 'string' ? JSON.parse(membersToUse) : membersToUse;
        
        // Process existing photoDriveId to displayable image URL
        const processMember = (m: any) => ({
            ...m,
            image: m.image || (m.photoDriveId ? getPhotoUrl(m.photoDriveId) : '')
        });

        if (rawMembers) {
            if (Array.isArray(rawMembers)) {
                // Legacy format (array of students)
                setEditStudents(rawMembers.map(processMember));
                setEditTeachers([]);
            } else if (typeof rawMembers === 'object') {
                // New format { teachers: [], students: [] }
                setEditTeachers((Array.isArray(rawMembers.teachers) ? rawMembers.teachers : []).map(processMember));
                setEditStudents((Array.isArray(rawMembers.students) ? rawMembers.students : []).map(processMember));
            }
        }
      } catch { setEditTeachers([]); setEditStudents([]); }
  }, [team, isAreaContext]);

  // Safe parsing for Stage Info (for display purposes)
  let areaInfo: AreaStageInfo | null = null;
  try {
    if (team.stageInfo) {
        areaInfo = JSON.parse(team.stageInfo);
    }
  } catch { areaInfo = null; }

  const getFullName = (p: any) => {
      const prefix = p.prefix || '';
      const name = p.name || `${p.firstname || ''} ${p.lastname || ''}`;
      return `${prefix} ${name}`.trim();
  }

  const imageUrl = (team.logoUrl && team.logoUrl.startsWith('http'))
    ? team.logoUrl 
    : team.teamPhotoId 
        ? getPhotoUrl(team.teamPhotoId) 
        : "https://cdn-icons-png.flaticon.com/512/3135/3135768.png";

  const normalizeStatus = (status: string) => {
    if (status === '1') return 'Approved';
    if (status === '0') return 'Pending';
    if (status === '2' || status === '-1') return 'Rejected';
    return status;
  };

  const displayStatus = normalizeStatus(team.status);

  // Deadline Logic
  const hasDeadline = team.editDeadline && new Date(team.editDeadline) > new Date();
  const deadlineText = hasDeadline ? formatDeadline(team.editDeadline!) : '';

  const showNotification = (msg: string, type: 'success' | 'error') => {
      setToast({ msg, type, show: true });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleClose = () => {
      if (hasUnsavedChanges) {
          setShowCloseConfirm(true);
      } else {
          onClose();
      }
  };

  const confirmClose = () => {
      setShowCloseConfirm(false);
      onClose();
  };

  // --- Edit Handlers ---

  const handleTeacherChange = (index: number, field: string, value: string) => {
      setHasUnsavedChanges(true);
      const newTeachers = [...editTeachers];
      newTeachers[index] = { ...newTeachers[index], [field]: value };
      setEditTeachers(newTeachers);
  };

  const handleStudentChange = (index: number, field: string, value: string) => {
      setHasUnsavedChanges(true);
      const newStudents = [...editStudents];
      newStudents[index] = { ...newStudents[index], [field]: value };
      setEditStudents(newStudents);
  };

  const handleAddTeacher = () => {
      setHasUnsavedChanges(true);
      setEditTeachers([...editTeachers, { name: '', phone: '', prefix: '' }]);
  };

  const handleRemoveTeacher = (index: number) => {
      setConfirmDelete({ show: true, type: 'teacher', index });
  };

  const handleAddStudent = () => {
      setHasUnsavedChanges(true);
      setEditStudents([...editStudents, { name: '', class: '', prefix: '' }]);
  };

  const handleRemoveStudent = (index: number) => {
      setConfirmDelete({ show: true, type: 'student', index });
  };

  const executeDelete = () => {
      setHasUnsavedChanges(true);
      if (confirmDelete.type === 'teacher') {
          const newTeachers = [...editTeachers];
          newTeachers.splice(confirmDelete.index, 1);
          setEditTeachers(newTeachers);
      } else {
          const newStudents = [...editStudents];
          newStudents.splice(confirmDelete.index, 1);
          setEditStudents(newStudents);
      }
      setConfirmDelete({ show: false, type: 'teacher', index: -1 });
  };

  // Logic to parse cluster members for transfer
  const handleTransferFromCluster = () => {
      let clusterMembers = { teachers: [], students: [] };
      try {
          const raw = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
          
          if (Array.isArray(raw)) {
              // Legacy array (students only)
              clusterMembers.students = raw;
          } else if (typeof raw === 'object' && raw !== null) {
              clusterMembers.teachers = Array.isArray(raw.teachers) ? raw.teachers : [];
              clusterMembers.students = Array.isArray(raw.students) ? raw.students : [];
          }
          
          setTransferConfirm({ 
              show: true, 
              previewData: {
                  ...clusterMembers,
                  name: team.teamName // Include Team Name in preview data
              } 
          });

      } catch (e) {
          showNotification('ไม่สามารถอ่านข้อมูลระดับกลุ่มฯ ได้', 'error');
      }
  };

  const executeTransfer = () => {
      if (transferConfirm.previewData) {
          const { teachers, students, name } = transferConfirm.previewData;
          // Process images for display
          const process = (list: any[]) => list.map(m => ({
              ...m,
              image: m.image || (m.photoDriveId ? getPhotoUrl(m.photoDriveId) : '')
          }));

          setEditTeachers(process(teachers));
          setEditStudents(process(students));
          
          if (name) {
              setEditTeamName(name); // Update Team Name
          }

          setHasUnsavedChanges(true);
          setTransferConfirm({ show: false, previewData: null });
          showNotification('ดึงข้อมูลเรียบร้อยแล้ว (กรุณากดบันทึก)', 'success');
      }
  };

  const handleImageUpload = async (index: number, type: 'teacher' | 'student', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const uploadId = `${type}-${index}`;
      setUploadingState({ id: uploadId, loading: true });

      try {
          // Resize image to max 400x400px and compress
          const base64Image = await resizeImage(file);
          
          // Upload to Server immediately
          const response = await uploadImage(base64Image, `avatar_${team.teamId}_${type}_${index}.jpg`);

          if (response.status === 'success' && response.fileId) {
                // Construct the full URL using the fileId
                const fileUrl = getPhotoUrl(response.fileId); 
                
                if (type === 'teacher') {
                    const newTeachers = [...editTeachers];
                    // We store the DRIVE ID (in fileId field for saving later) and URL (in image field for display)
                    newTeachers[index] = { ...newTeachers[index], image: fileUrl, fileId: response.fileId };
                    setEditTeachers(newTeachers);
                } else {
                    const newStudents = [...editStudents];
                    newStudents[index] = { ...newStudents[index], image: fileUrl, fileId: response.fileId };
                    setEditStudents(newStudents);
                }
                showNotification('อัปโหลดรูปภาพสำเร็จ (กรุณากดบันทึก)', 'success');
                setHasUnsavedChanges(true);
          } else {
                throw new Error(response.message || 'Upload failed');
          }

      } catch (err) {
          console.error(err);
          showNotification('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', 'error');
      } finally {
          setUploadingState({ id: '', loading: false });
          // Reset file input
          if (fileInputRefs.current[uploadId]) {
              fileInputRefs.current[uploadId]!.value = '';
          }
      }
  };

  const triggerFileInput = (id: string) => {
      fileInputRefs.current[id]?.click();
  };

  const handleContactChange = (field: string, value: string) => {
      setHasUnsavedChanges(true);
      setEditContact(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      if (uploadingState.loading) {
          showNotification('กำลังอัปโหลดรูปภาพ กรุณารอสักครู่', 'error');
          return;
      }

      setIsSaving(true);

      // Prepare members for saving: consolidate fileId into photoDriveId and remove temporary fields
      const prepareForSave = (m: any) => {
          const { image, fileId, ...rest } = m; 
          const updatedMember = { ...rest };
          
          // If a new fileId exists from upload, update photoDriveId
          if (fileId) {
              updatedMember.photoDriveId = fileId;
          }
          // If no new upload, existing photoDriveId (if any) in 'rest' is preserved.
          
          return updatedMember;
      };

      const payload = {
          teamId: team.teamId,
          teamName: editTeamName,
          contact: JSON.stringify(editContact),
          members: JSON.stringify({ 
              teachers: editTeachers.map(prepareForSave), 
              students: editStudents.map(prepareForSave) 
          }),
          isArea: isAreaContext, // Flag to tell backend to update area columns based on view context
          lastEditedBy: currentUser?.name || currentUser?.username || 'Unknown User',
          lastEditedAt: new Date().toISOString()
      };

      const success = await updateTeamDetails(payload);
      setIsSaving(false);
      
      if (success) {
          showNotification('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
          setDisplayTeamName(editTeamName); // Instant update UI
          setHasUnsavedChanges(false);
          setIsEditing(false);
          if (onSaveSuccess) onSaveSuccess();
      } else {
          showNotification('บันทึกข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง', 'error');
      }
  };

  // Helper to render member avatar
  const MemberAvatar = ({ member, index, type }: { member: any, index: number, type: 'teacher' | 'student' }) => {
      const inputId = `${type}-${index}`;
      const isUploading = uploadingState.loading && uploadingState.id === inputId;
      const hasImage = !!member.image;
      
      return (
          <div className="relative shrink-0">
              {isUploading ? (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 border border-gray-200">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  </div>
              ) : hasImage ? (
                  <img 
                    src={member.image} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; }}
                  />
              ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold border ${type === 'teacher' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-green-100 text-green-600 border-green-200'}`}>
                      {type === 'teacher' ? 'T' : 'S'}{index + 1}
                  </div>
              )}

              {isEditing && !isUploading && (
                  <>
                      <button 
                        onClick={() => triggerFileInput(inputId)}
                        className="absolute -bottom-1 -right-1 bg-white border border-gray-300 rounded-full p-1 text-gray-500 hover:text-blue-600 hover:border-blue-400 shadow-sm transition-all"
                        title="อัปโหลดรูปภาพ"
                      >
                          <Camera className="w-3 h-3" />
                      </button>
                      <input 
                        ref={(el) => { fileInputRefs.current[inputId] = el; }}
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(index, type, e)}
                      />
                  </>
              )}
          </div>
      );
  };

  const reqTeachers = activity?.reqTeachers || 0;
  const reqStudents = activity?.reqStudents || 0;

  return (
    <>
        {/* Shared Confirmation Modal - Rendered outside to prevent parent click propagation closing */}
        <ConfirmationModal 
            isOpen={confirmDelete.show}
            title={`ลบ${confirmDelete.type === 'teacher' ? 'ครูผู้ฝึกสอน' : 'นักเรียน'}`}
            description={`คุณต้องการลบรายชื่อ${confirmDelete.type === 'teacher' ? 'ครู' : 'นักเรียน'}ลำดับที่ ${confirmDelete.index + 1} ใช่หรือไม่?`}
            confirmLabel="ยืนยันการลบ"
            confirmColor="red"
            actionType="removeMember"
            onConfirm={executeDelete}
            onCancel={() => setConfirmDelete({ show: false, type: 'teacher', index: -1 })}
        />

        {/* Transfer Confirmation Modal */}
        <ConfirmationModal
            isOpen={transferConfirm.show}
            title="ยืนยันการดึงข้อมูลจากระดับกลุ่มฯ"
            description="การดึงข้อมูลจะทับข้อมูลชื่อทีมและสมาชิกปัจจุบันในระดับเขตพื้นที่ คุณต้องการดำเนินการต่อหรือไม่?"
            confirmLabel="ยืนยันการดึงข้อมูล"
            confirmColor="blue"
            onConfirm={executeTransfer}
            onCancel={() => setTransferConfirm({ show: false, previewData: null })}
        >
            {transferConfirm.previewData && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-left mt-3">
                    <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center">
                        <Info className="w-4 h-4 mr-1"/> ข้อมูลที่จะถูกดึงมา:
                    </h4>
                    <ul className="text-sm text-blue-700 list-disc list-inside">
                        <li>ชื่อทีม: <b>{transferConfirm.previewData.name}</b></li>
                        <li>ครูผู้ฝึกสอน: <b>{transferConfirm.previewData.teachers?.length || 0}</b> คน</li>
                        <li>นักเรียน: <b>{transferConfirm.previewData.students?.length || 0}</b> คน</li>
                    </ul>
                </div>
            )}
        </ConfirmationModal>

        {/* Unsaved Changes Confirmation Modal */}
        <ConfirmationModal
            isOpen={showCloseConfirm}
            title="มีข้อมูลที่ยังไม่ได้บันทึก"
            description="คุณมีการแก้ไขข้อมูลที่ยังไม่ได้บันทึก หากปิดหน้าต่างนี้ข้อมูลจะสูญหาย ต้องการปิดหรือไม่?"
            confirmLabel="ปิดหน้าต่าง (ไม่บันทึก)"
            confirmColor="red"
            onConfirm={confirmClose}
            onCancel={() => setShowCloseConfirm(false)}
        />

        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
        >
        {/* Toast Notification */}
        <ModalToast message={toast.msg} type={toast.type} isVisible={toast.show} />

        <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            
            {/* Header - Sticky */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm relative">
            
            <div className="flex items-center gap-4 overflow-hidden flex-1">
                <img src={imageUrl} className="w-14 h-14 rounded-xl object-cover border border-gray-200 bg-gray-50 shrink-0 shadow-sm" alt="Logo"/>
                <div className="min-w-0 flex-1">
                    {isEditing ? (
                        <div className="flex flex-col">
                            {isAreaContext && <span className="text-[10px] text-purple-600 font-bold mb-1 bg-purple-50 px-2 py-0.5 rounded self-start border border-purple-100 flex items-center"><Trophy className="w-3 h-3 mr-1"/> กำลังแก้ไขข้อมูลระดับเขตพื้นที่</span>}
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-lg font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={editTeamName}
                                onChange={(e) => { setHasUnsavedChanges(true); setEditTeamName(e.target.value); }}
                                placeholder={isAreaContext ? "ชื่อทีม (ระดับเขต)..." : "ชื่อทีม..."}
                            />
                        </div>
                    ) : (
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                            {/* Use local state for instant updates */}
                            {displayTeamName}
                        </h3>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className="shrink-0 bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{team.teamId}</span>
                        <span className={`font-medium px-2 py-0.5 rounded text-xs flex items-center ${displayStatus === 'Approved' ? 'bg-green-100 text-green-700' : displayStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'}`}>
                            {displayStatus === 'Approved' && <CheckCircle className="w-3 h-3 mr-1"/>}
                            {displayStatus === 'Pending' && <Clock className="w-3 h-3 mr-1"/>}
                            {displayStatus}
                        </span>
                        {(team.stageStatus === 'Area' || team.flag === 'TRUE') && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 shrink-0">
                                <Flag className="w-3 h-3 mr-1" /> ตัวแทนเขต
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 ml-2">
                {canEdit && !isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center text-sm font-medium shadow-sm hover:shadow-md"
                    >
                        <Edit3 className="w-4 h-4 sm:mr-1.5" /> 
                        <span className="hidden sm:inline">แก้ไขข้อมูล</span>
                    </button>
                )}
                {isEditing && (
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || uploadingState.loading}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 font-bold shadow-md transition-all"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                        บันทึก
                    </button>
                )}
                <button onClick={handleClose} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors shrink-0">
                    <X className="w-6 h-6" />
                </button>
            </div>
            </div>

            {/* Deadline Alert Banner */}
            {hasDeadline && displayStatus === 'Pending' && (
                <div className="bg-orange-50 border-b border-orange-100 px-6 py-2 text-xs font-medium text-orange-800 flex items-center justify-center animate-pulse">
                    <Clock className="w-3.5 h-3.5 mr-2" />
                    เปิดให้แก้ไขข้อมูลได้ถึง: {deadlineText}
                </div>
            )}

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                
                {/* Scores Section */}
                {(team.score > 0 || (team.stageStatus === 'Area' || team.flag === 'TRUE')) && !isEditing && (
                    <div className="mb-6">
                        <h4 className="font-semibold text-gray-800 flex items-center mb-3 text-sm uppercase tracking-wide">
                            <Medal className="w-4 h-4 mr-2 text-amber-500" />
                            ผลการแข่งขัน (Competition Result)
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Area Round (Priority Display) */}
                            {(team.stageStatus === 'Area' || team.flag === 'TRUE') && (
                                <div className="p-4 bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg rounded-xl relative overflow-hidden ring-1 ring-white/20">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Trophy className="w-24 h-24" />
                                    </div>
                                    <div className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-2 flex items-center">
                                        <Trophy className="w-3 h-3 mr-1" /> ระดับเขตพื้นที่ (District)
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <div>
                                            {areaInfo?.rank ? (
                                                <div className="text-lg font-bold text-white mb-1">อันดับที่ {areaInfo.rank}</div>
                                            ) : (
                                                <div className="text-sm text-purple-100">รอประกาศผล</div>
                                            )}
                                            {areaInfo?.medal && <div className="text-xs text-white font-bold px-2 py-1 bg-white/20 rounded inline-block backdrop-blur-sm">{areaInfo.medal}</div>}
                                        </div>
                                        <div className="text-4xl font-black text-white tracking-tight">{areaInfo?.score > 0 ? areaInfo.score : '-'}</div>
                                    </div>
                                </div>
                            )}

                            {/* Cluster Round */}
                            <div className="p-4 bg-white border border-gray-200 rounded-xl relative overflow-hidden shadow-sm">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                                    <LayoutGrid className="w-3 h-3 mr-1" /> ระดับกลุ่มเครือข่าย
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        {team.rank && (
                                            <div className="flex items-center text-gray-800 font-bold mt-1 text-lg">
                                                <Hash className="w-4 h-4 mr-1 text-gray-400"/> ลำดับที่ {team.rank}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-400 mt-1">{cluster?.ClusterName || 'Network Level'}</div>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-700">{team.score || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                        <div className="relative z-10">
                            <div className="flex items-center mb-2 text-blue-900 font-semibold text-sm">
                                <School className="w-4 h-4 mr-2 text-blue-500" />
                                ข้อมูลโรงเรียน
                            </div>
                            <p className="text-gray-800 font-medium ml-6 line-clamp-1">
                                {school?.SchoolName || team.schoolId || '-'}
                            </p>
                            <div className="flex items-center ml-6 mt-1 text-gray-500 text-xs">
                                <LayoutGrid className="w-3 h-3 mr-1" />
                                <span>{cluster?.ClusterName || 'ไม่ระบุกลุ่มเครือข่าย'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                        <div className="relative z-10">
                            <div className="flex items-center mb-2 text-amber-900 font-semibold text-sm">
                                <AwardIcon className="w-4 h-4 mr-2 text-amber-500" />
                                รายการแข่งขัน
                            </div>
                            <div className="ml-6">
                                {activity?.category && (
                                    <span className="inline-block px-2 py-0.5 mb-1 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                        {activity.category}
                                    </span>
                                )}
                                <p className="text-gray-800 font-medium line-clamp-1">{activity?.name || '-'}</p>
                                <p className="text-gray-500 text-xs mt-1">ระดับชั้น: {team.level}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members Section */}
                <div>
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center pb-2 border-b border-gray-200 justify-between flex-wrap gap-2">
                        <div className="flex items-center">
                            <Users className="w-5 h-5 mr-2 text-gray-600" />
                            สมาชิกในทีม {isAreaContext && <span className="text-purple-600 text-xs ml-2 font-normal">(ระดับเขตพื้นที่)</span>}
                            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                {editTeachers.length + editStudents.length} คน
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing && isAreaContext && (
                                <button 
                                    type="button"
                                    onClick={handleTransferFromCluster}
                                    className="text-[10px] sm:text-xs flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors font-medium border border-blue-200"
                                >
                                    <Copy className="w-3 h-3 mr-1" /> ดึงข้อมูลจากระดับกลุ่มฯ
                                </button>
                            )}
                            {team.lastEditedBy && !isEditing && (
                                <div className="flex items-center text-[10px] text-gray-400 font-normal">
                                    <History className="w-3 h-3 mr-1" />
                                    แก้ไขล่าสุด: {formatDeadline(team.lastEditedAt || '')} โดย {team.lastEditedBy}
                                </div>
                            )}
                        </div>
                    </h4>

                    {/* Teachers */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
                                ครูผู้ฝึกสอน ({editTeachers.length}/{reqTeachers})
                            </h5>
                            {isEditing && editTeachers.length < reqTeachers && (
                                <button 
                                    onClick={handleAddTeacher}
                                    className="text-xs flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> เพิ่มครู
                                </button>
                            )}
                        </div>
                        {editTeachers.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {editTeachers.map((m: any, idx: number) => (
                                    <div key={`t-${idx}`} className="flex items-center p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative group">
                                        <MemberAvatar member={m} index={idx} type="teacher" />
                                        
                                        <div className="ml-3 min-w-0 flex-1">
                                            {isEditing ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex gap-2">
                                                        <PrefixInput 
                                                            value={m.prefix || ''}
                                                            onChange={(val) => handleTeacherChange(idx, 'prefix', val)}
                                                        />
                                                        <input 
                                                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                                                            placeholder="ชื่อ-สกุล"
                                                            value={m.name} 
                                                            onChange={(e) => handleTeacherChange(idx, 'name', e.target.value)}
                                                        />
                                                    </div>
                                                    <input 
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none" 
                                                        placeholder="เบอร์โทร"
                                                        value={m.phone} 
                                                        onChange={(e) => handleTeacherChange(idx, 'phone', e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{getFullName(m)}</p>
                                                    <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                                        <Phone className="w-3 h-3 mr-1" /> {m.phone || '-'}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        {isEditing && (
                                            <button 
                                                onClick={() => handleRemoveTeacher(idx)}
                                                className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 shadow-sm border border-red-200 hover:bg-red-200 z-10"
                                                title="ลบรายชื่อ"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                                ยังไม่มีข้อมูลครูผู้ฝึกสอน
                            </div>
                        )}
                    </div>

                    {/* Students */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
                                นักเรียน ({editStudents.length}/{reqStudents})
                            </h5>
                            {isEditing && editStudents.length < reqStudents && (
                                <button 
                                    onClick={handleAddStudent}
                                    className="text-xs flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> เพิ่มนักเรียน
                                </button>
                            )}
                        </div>
                        {editStudents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {editStudents.map((m: any, idx: number) => (
                                    <div key={`s-${idx}`} className="flex items-center p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative group">
                                        <MemberAvatar member={m} index={idx} type="student" />
                                        
                                        <div className="ml-3 min-w-0 flex-1">
                                            {isEditing ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex gap-2">
                                                        <PrefixInput 
                                                            value={m.prefix || ''}
                                                            onChange={(val) => handleStudentChange(idx, 'prefix', val)}
                                                        />
                                                        <input 
                                                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                                                            placeholder="ชื่อ-สกุล"
                                                            value={m.name} 
                                                            onChange={(e) => handleStudentChange(idx, 'name', e.target.value)}
                                                        />
                                                    </div>
                                                    <select 
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none" 
                                                        value={m.class || ''} 
                                                        onChange={(e) => handleStudentChange(idx, 'class', e.target.value)}
                                                    >
                                                        <option value="">-- เลือกระดับชั้น --</option>
                                                        {levelOptions.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{getFullName(m)}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {m.class ? `ชั้น ${m.class}` : 'นักเรียน'}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        {isEditing && (
                                            <button 
                                                onClick={() => handleRemoveStudent(idx)}
                                                className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 shadow-sm border border-red-200 hover:bg-red-200 z-10"
                                                title="ลบรายชื่อ"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                                ยังไม่มีข้อมูลนักเรียน
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    {/* Contact */}
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center text-sm uppercase tracking-wide">
                            <Phone className="w-4 h-4 mr-2" />
                            ผู้ประสานงาน (Coordinator)
                        </h4>
                        <div className="text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            {isEditing ? (
                                <div className="grid gap-y-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">ชื่อผู้ประสานงาน</label>
                                        <input 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                                            placeholder="ชื่อผู้ประสานงาน"
                                            value={editContact.name || ''} 
                                            onChange={(e) => handleContactChange('name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">เบอร์โทร</label>
                                        <input 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                                            placeholder="เบอร์โทร"
                                            value={editContact.phone || ''} 
                                            onChange={(e) => handleContactChange('phone', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">Line ID</label>
                                        <input 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                                            placeholder="Line ID"
                                            value={editContact.lineId || ''} 
                                            onChange={(e) => handleContactChange('lineId', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-[80px_1fr] gap-y-2">
                                    <span className="text-gray-400">ชื่อ:</span>
                                    <span className="font-medium text-gray-900">{editContact.name || '-'}</span>
                                    <span className="text-gray-400">โทร:</span>
                                    <span className="font-medium text-gray-900">{editContact.phone || '-'}</span>
                                    <span className="text-gray-400">Line ID:</span>
                                    <span className="font-medium text-gray-900">{editContact.lineId || '-'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Files */}
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center text-sm uppercase tracking-wide">
                            <FileText className="w-4 h-4 mr-2" />
                            ไฟล์แนบ ({files.length})
                        </h4>
                        <div className="space-y-2">
                            {files.map(f => (
                                <a 
                                    key={f.FileLogID} 
                                    href={f.FileUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center p-3 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-colors group shadow-sm"
                                >
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 shrink-0 transition-colors">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="ml-3 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{f.FileType}</p>
                                        <p className="text-[10px] text-gray-500">{f.Status}</p>
                                    </div>
                                </a>
                            ))}
                            {files.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                                    <p className="text-sm text-gray-400 italic">ไม่มีไฟล์แนบ</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    </>
  );
};

const AwardIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default TeamDetailModal;

