import React from 'react';
import { Team, AppData, AreaStageInfo } from '../types';
import { X, User, Phone, School, FileText, Medal, Flag, LayoutGrid, Users, Hash } from 'lucide-react';

interface TeamDetailModalProps {
  team: Team;
  data: AppData;
  onClose: () => void;
}

const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, data, onClose }) => {
  const activity = data.activities.find(a => a.id === team.activityId);
  
  // Improved School Lookup
  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
  const cluster = data.clusters.find(c => c.ClusterID === school?.SchoolCluster);
  const files = data.files.filter(f => f.TeamID === team.teamId);

  // Parse Members JSON
  let teachers: any[] = [];
  let students: any[] = [];
  
  try {
    const rawMembers = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
    
    if (rawMembers) {
        if (Array.isArray(rawMembers)) {
            students = rawMembers;
        } else if (typeof rawMembers === 'object') {
            teachers = Array.isArray(rawMembers.teachers) ? rawMembers.teachers : [];
            students = Array.isArray(rawMembers.students) ? rawMembers.students : [];
        }
    }
  } catch (e) {
    console.error("Failed to parse members", e);
  }
  
  // Safe parsing for contact
  let contact: any = {};
  try {
    const parsed = typeof team.contact === 'string' ? JSON.parse(team.contact) : team.contact;
    contact = parsed || {};
  } catch { contact = {}; }

  // Safe parsing for Stage Info
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
          <div className="flex items-center gap-4 overflow-hidden">
             <img src={imageUrl} className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0" alt="Logo"/>
            <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-900 truncate">{team.teamName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 overflow-hidden">
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
            
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

            {/* Members Section - Improved Grid Layout */}
            <div>
                <h4 className="font-bold text-gray-800 mb-4 flex items-center sticky top-0 bg-white py-2 z-10 border-b border-gray-50">
                    <Users className="w-5 h-5 mr-2 text-gray-600" />
                    สมาชิกในทีม
                    <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {teachers.length + students.length} คน
                    </span>
                </h4>

                {/* Teachers */}
                {teachers.length > 0 && (
                    <div className="mb-4">
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-1">ครูผู้ฝึกสอน ({teachers.length})</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {teachers.map((m: any, idx: number) => (
                                <div key={`t-${idx}`} className="flex items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                                    {m.photoDriveId ? (
                                        <img 
                                            src={getPhotoUrl(m.photoDriveId)} 
                                            className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200 bg-gray-100" 
                                            alt="Teacher"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3 text-xs font-bold shrink-0">
                                            T{idx+1}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{getFullName(m)}</p>
                                        <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                            <Phone className="w-3 h-3 mr-1" /> {m.phone || '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Students */}
                {students.length > 0 && (
                     <div>
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-1">นักเรียน ({students.length})</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {students.map((m: any, idx: number) => (
                                <div key={`s-${idx}`} className="flex items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-green-300 transition-colors">
                                    {m.photoDriveId ? (
                                        <img 
                                            src={getPhotoUrl(m.photoDriveId)} 
                                            className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200 bg-gray-100" 
                                            alt="Student"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3 text-xs font-bold shrink-0">
                                            S{idx+1}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{getFullName(m)}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {m.class ? `ชั้น ${m.class}` : 'นักเรียน'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {teachers.length === 0 && students.length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">ไม่มีข้อมูลสมาชิก</p>
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
                        <div className="grid grid-cols-[80px_1fr] gap-y-2">
                            <span className="text-gray-400">ชื่อ:</span>
                            <span className="font-medium text-gray-900">{contact.name || '-'}</span>
                            <span className="text-gray-400">โทร:</span>
                            <span className="font-medium text-gray-900">{contact.phone || '-'}</span>
                            <span className="text-gray-400">Line ID:</span>
                            <span className="font-medium text-gray-900">{contact.lineId || '-'}</span>
                        </div>
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

            {/* Scores Section */}
            {(team.score > 0 || areaInfo?.score) && (
                <div className="pt-4 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-800 flex items-center mb-3">
                        <Medal className="w-4 h-4 mr-2 text-amber-500" />
                        ผลการแข่งขัน
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         {/* Cluster Round */}
                        <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 rounded-xl relative overflow-hidden">
                            <div className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">ระดับกลุ่มเครือข่าย</div>
                            <div className="flex justify-between items-end">
                                <div>
                                    {team.rank && (
                                        <div className="flex items-center text-yellow-700 font-bold mt-1">
                                            <Hash className="w-4 h-4 mr-1"/> ลำดับที่ {team.rank}
                                        </div>
                                    )}
                                </div>
                                <div className="text-4xl font-bold text-yellow-600">{team.score || '-'}</div>
                            </div>
                        </div>

                        {/* Area Round (if applicable) */}
                        {(areaInfo?.score || team.stageStatus === 'Area') && (
                             <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl relative overflow-hidden">
                                <div className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">ระดับเขตพื้นที่</div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        {areaInfo?.rank && <div className="text-sm text-purple-700 font-bold">อันดับที่ {areaInfo.rank}</div>}
                                        {areaInfo?.medal && <div className="text-xs text-purple-500 mt-1">{areaInfo.medal}</div>}
                                    </div>
                                    <div className="text-4xl font-bold text-purple-600">{areaInfo?.score || '-'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
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
