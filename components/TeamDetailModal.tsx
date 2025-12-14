
import React, { useState } from 'react';
import { Team, AppData, AreaStageInfo } from '../types';
import { X, User, Phone, School, FileText, Medal, Flag, LayoutGrid, Users, Hash, Trophy, Edit3, Save, Loader2 } from 'lucide-react';
import { updateTeamDetails } from '../services/api';

interface TeamDetailModalProps {
  team: Team;
  data: AppData;
  onClose: () => void;
  canEdit?: boolean;
}

const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, data, onClose, canEdit = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form States
  const [editTeamName, setEditTeamName] = useState(team.teamName);
  const [editContact, setEditContact] = useState<any>({});
  const [editTeachers, setEditTeachers] = useState<any[]>([]);
  const [editStudents, setEditStudents] = useState<any[]>([]);

  // Init Data logic (Moved inside effect or just immediate)
  // We initialize state only once when modal opens, but since props don't change for the same open instance usually:
  React.useEffect(() => {
      setEditTeamName(team.teamName);
      
      // Parse Contact
      try {
        const parsed = typeof team.contact === 'string' ? JSON.parse(team.contact) : team.contact;
        setEditContact(parsed || {});
      } catch { setEditContact({}); }

      // Parse Members
      try {
        const rawMembers = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
        if (rawMembers) {
            if (Array.isArray(rawMembers)) {
                setEditStudents(rawMembers);
                setEditTeachers([]);
            } else if (typeof rawMembers === 'object') {
                setEditTeachers(Array.isArray(rawMembers.teachers) ? rawMembers.teachers : []);
                setEditStudents(Array.isArray(rawMembers.students) ? rawMembers.students : []);
            }
        }
      } catch { setEditTeachers([]); setEditStudents([]); }
  }, [team]);

  const activity = data.activities.find(a => a.id === team.activityId);
  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
  const cluster = data.clusters.find(c => c.ClusterID === school?.SchoolCluster);
  const files = data.files.filter(f => f.TeamID === team.teamId);

  // Safe parsing for Stage Info (View Only)
  let areaInfo: AreaStageInfo | null = null;
  try {
    if (team.stageInfo) {
        areaInfo = JSON.parse(team.stageInfo);
    }
  } catch { areaInfo = null; }

  const getFullName = (p: any) => {
      const prefix = p.prefix || '';
      const name = p.name || `${p.firstname || ''} ${p.lastname || ''}`;
      return `${prefix}${name}`.trim();
  }

  const getPhotoUrl = (driveId: string) => `https://drive.google.com/thumbnail?id=${driveId}`;

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
  const isAreaLevel = team.stageStatus === 'Area' || team.flag === 'TRUE';

  // --- Edit Handlers ---

  const handleTeacherChange = (index: number, field: string, value: string) => {
      const newTeachers = [...editTeachers];
      newTeachers[index] = { ...newTeachers[index], [field]: value };
      setEditTeachers(newTeachers);
  };

  const handleStudentChange = (index: number, field: string, value: string) => {
      const newStudents = [...editStudents];
      newStudents[index] = { ...newStudents[index], [field]: value };
      setEditStudents(newStudents);
  };

  const handleContactChange = (field: string, value: string) => {
      setEditContact(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
      setIsSaving(true);
      const payload = {
          teamId: team.teamId,
          teamName: editTeamName,
          contact: JSON.stringify(editContact),
          members: JSON.stringify({ teachers: editTeachers, students: editStudents })
      };

      const success = await updateTeamDetails(payload);
      setIsSaving(false);
      
      if (success) {
          alert('บันทึกข้อมูลสำเร็จ (กรุณารีเฟรชหน้าเว็บเพื่อดูข้อมูลล่าสุด)');
          setIsEditing(false);
          // Ideally, we trigger a refresh in parent, but for now prompt user or simple close
          // onClose(); 
      } else {
          alert('บันทึกข้อมูลล้มเหลว');
      }
  };

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Sticky */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4 overflow-hidden flex-1">
             <img src={imageUrl} className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0" alt="Logo"/>
            <div className="min-w-0 flex-1">
                {isEditing ? (
                    <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded px-2 py-1 text-lg font-bold text-gray-900" 
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                    />
                ) : (
                    <h3 className="text-xl font-bold text-gray-900 truncate">{team.teamName}</h3>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden mt-1">
                    <span className="shrink-0">{team.teamId}</span>
                    <span className="text-gray-300">•</span>
                    <span className={`font-medium ${displayStatus === 'Approved' ? 'text-green-600' : displayStatus === 'Pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {displayStatus}
                    </span>
                    {team.flag && (
                        <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 shrink-0">
                            <Flag className="w-3 h-3 mr-1" /> ตัวแทนกลุ่มฯ
                        </span>
                    )}
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                  <button onClick={() => setIsEditing(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center text-sm font-medium">
                      <Edit3 className="w-4 h-4 mr-1" /> แก้ไข
                  </button>
              )}
              {isEditing && (
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                  >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                      บันทึก
                  </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                <X className="w-6 h-6 text-gray-500" />
              </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
            
             {/* Scores Section */}
             {(team.score > 0 || isAreaLevel) && !isEditing && (
                <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 flex items-center mb-3">
                        <Medal className="w-4 h-4 mr-2 text-amber-500" />
                        ผลการแข่งขัน
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Area Round (Priority Display) */}
                        {isAreaLevel && (
                             <div className="p-4 bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md rounded-xl relative overflow-hidden ring-1 ring-purple-200">
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
                                        {areaInfo?.medal && <div className="text-sm text-purple-200 font-medium px-2 py-0.5 bg-white/20 rounded inline-block">{areaInfo.medal}</div>}
                                    </div>
                                    <div className="text-4xl font-bold text-white">{areaInfo?.score > 0 ? areaInfo.score : '-'}</div>
                                </div>
                            </div>
                        )}

                         {/* Cluster Round */}
                        <div className="p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl relative overflow-hidden">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                                <LayoutGrid className="w-3 h-3 mr-1" /> ระดับกลุ่มเครือข่าย
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    {team.rank && (
                                        <div className="flex items-center text-gray-700 font-bold mt-1">
                                            <Hash className="w-4 h-4 mr-1"/> ลำดับที่ {team.rank}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 mt-1">{cluster?.ClusterName || 'Network Level'}</div>
                                </div>
                                <div className="text-3xl font-bold text-gray-600">{team.score || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="flex items-center mb-2 text-blue-900 font-semibold">
                        <School className="w-4 h-4 mr-2 text-blue-500" />
                        ข้อมูลโรงเรียน
                    </div>
                    <p className="text-gray-800 text-sm ml-6 font-medium line-clamp-1">
                        {school?.SchoolName || team.schoolId || '-'}
                    </p>
                    <div className="flex items-center ml-6 mt-1 text-gray-500 text-xs">
                        <LayoutGrid className="w-3 h-3 mr-1" />
                        <span>{cluster?.ClusterName || 'ไม่ระบุกลุ่มเครือข่าย'}</span>
                    </div>
                </div>
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                    <div className="flex items-center mb-2 text-amber-900 font-semibold">
                        <AwardIcon className="w-4 h-4 mr-2 text-amber-500" />
                        รายการแข่งขัน
                    </div>
                    <div className="ml-6">
                        {activity?.category && (
                            <span className="inline-block px-2 py-0.5 mb-1 rounded text-[10px] font-medium bg-white text-gray-600 border border-gray-200">
                                {activity.category}
                            </span>
                        )}
                        <p className="text-gray-800 text-sm font-medium line-clamp-1">{activity?.name || '-'}</p>
                        <p className="text-gray-500 text-xs mt-1">ระดับชั้น: {team.level}</p>
                    </div>
                </div>
            </div>

            {/* Members Section */}
            <div>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center sticky top-0 bg-white py-2 z-10 border-b border-gray-50">
                    <Users className="w-5 h-5 mr-2 text-gray-600" />
                    สมาชิกในทีม
                    <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {editTeachers.length + editStudents.length} คน
                    </span>
                </h4>

                {/* Teachers */}
                {editTeachers.length > 0 && (
                    <div className="mb-4">
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-1">ครูผู้ฝึกสอน ({editTeachers.length})</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {editTeachers.map((m: any, idx: number) => (
                                <div key={`t-${idx}`} className="flex items-start p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3 text-xs font-bold shrink-0 mt-1">
                                        T{idx+1}
                                    </div>
                                    <div className="min-w-0 w-full">
                                        {isEditing ? (
                                            <div className="space-y-1">
                                                <input 
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm" 
                                                    placeholder="ชื่อ-สกุล"
                                                    value={m.name} 
                                                    onChange={(e) => handleTeacherChange(idx, 'name', e.target.value)}
                                                />
                                                <input 
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs" 
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
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Students */}
                {editStudents.length > 0 && (
                     <div>
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-1">นักเรียน ({editStudents.length})</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {editStudents.map((m: any, idx: number) => (
                                <div key={`s-${idx}`} className="flex items-start p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3 text-xs font-bold shrink-0 mt-1">
                                        S{idx+1}
                                    </div>
                                    <div className="min-w-0 w-full">
                                        {isEditing ? (
                                            <div className="space-y-1">
                                                <input 
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm" 
                                                    placeholder="ชื่อ-สกุล"
                                                    value={m.name} 
                                                    onChange={(e) => handleStudentChange(idx, 'name', e.target.value)}
                                                />
                                                <input 
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs" 
                                                    placeholder="ระดับชั้น"
                                                    value={m.class} 
                                                    onChange={(e) => handleStudentChange(idx, 'class', e.target.value)}
                                                />
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
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                {/* Contact */}
                <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        ผู้ประสานงาน
                    </h4>
                    <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        {isEditing ? (
                            <div className="grid gap-y-2">
                                <input 
                                    className="w-full border border-gray-300 rounded px-2 py-1" 
                                    placeholder="ชื่อผู้ประสานงาน"
                                    value={editContact.name || ''} 
                                    onChange={(e) => handleContactChange('name', e.target.value)}
                                />
                                <input 
                                    className="w-full border border-gray-300 rounded px-2 py-1" 
                                    placeholder="เบอร์โทร"
                                    value={editContact.phone || ''} 
                                    onChange={(e) => handleContactChange('phone', e.target.value)}
                                />
                                <input 
                                    className="w-full border border-gray-300 rounded px-2 py-1" 
                                    placeholder="Line ID"
                                    value={editContact.lineId || ''} 
                                    onChange={(e) => handleContactChange('lineId', e.target.value)}
                                />
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
                     <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
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
                                className="flex items-center p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                            >
                                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 group-hover:bg-blue-200 shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="ml-3 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{f.FileType}</p>
                                    <p className="text-[10px] text-gray-500">{f.Status}</p>
                                </div>
                            </a>
                        ))}
                        {files.length === 0 && <p className="text-sm text-gray-400 italic">ไม่มีไฟล์แนบ</p>}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const AwardIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default TeamDetailModal;
