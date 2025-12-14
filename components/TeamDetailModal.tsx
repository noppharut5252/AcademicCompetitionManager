import React from 'react';
import { Team, AppData, TeamStatus, AreaStageInfo } from '../types';
import { X, User, Phone, MapPin, School, FileText, Calendar, Medal, Flag, GraduationCap, Hash, LayoutGrid } from 'lucide-react';

interface TeamDetailModalProps {
  team: Team;
  data: AppData;
  onClose: () => void;
}

const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ team, data, onClose }) => {
  const activity = data.activities.find(a => a.id === team.activityId);
  
  // Improved School Lookup: Try by ID first, then by Name
  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
  
  // Improved Cluster Lookup: 
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

  // Safe parsing for Stage Info (Area Round)
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

  // Helper to construct Drive thumbnail URL
  const getPhotoUrl = (driveId: string) => `https://drive.google.com/thumbnail?id=${driveId}`;

  // Image Logic: LogoUrl -> PhotoID (as thumb) -> Fallback
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
             <img src={imageUrl} className="w-12 h-12 rounded-full object-cover border border-gray-200 bg-gray-50" alt="Logo"/>
            <div>
                <h3 className="text-xl font-bold text-gray-900">{team.teamName}</h3>
                <span className="text-sm text-gray-500">{team.teamId} • {displayStatus}</span>
                {team.flag && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        <Flag className="w-3 h-3 mr-1" /> ตัวแทนเขต
                    </span>
                )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center mb-2 text-gray-900 font-medium">
                        <School className="w-4 h-4 mr-2 text-blue-500" />
                        โรงเรียน/สังกัด
                    </div>
                    <p className="text-gray-700 text-sm ml-6 font-medium">
                        {school?.SchoolName || team.schoolId || '-'}
                    </p>
                    <div className="flex items-center ml-6 mt-1 text-gray-500 text-xs">
                        <LayoutGrid className="w-3 h-3 mr-1" />
                        <span>สังกัด: {cluster?.ClusterName || 'ไม่ระบุกลุ่มเครือข่าย'}</span>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center mb-2 text-gray-900 font-medium">
                        <AwardIcon className="w-4 h-4 mr-2 text-amber-500" />
                        รายการแข่งขัน
                    </div>
                    {activity?.category && (
                        <span className="ml-6 mb-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white text-gray-600 border border-gray-200">
                             {activity.category}
                        </span>
                    )}
                    <p className="text-gray-600 text-sm ml-6">{activity?.name || '-'}</p>
                    <p className="text-gray-400 text-xs ml-6 mt-1">ระดับ: {team.level}</p>
                </div>
            </div>

            {/* Members Section */}
            <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    สมาชิกในทีม
                </h4>
                <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                    
                    {/* Teachers */}
                    {teachers.length > 0 && (
                        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            ครูผู้ฝึกสอน (Teachers)
                        </div>
                    )}
                    {teachers.map((m: any, idx: number) => (
                        <div key={`t-${idx}`} className="p-3 text-sm flex justify-between items-center hover:bg-gray-50">
                            <div className="flex items-center">
                                {m.photoDriveId ? (
                                    <img 
                                        src={getPhotoUrl(m.photoDriveId)} 
                                        className="w-8 h-8 rounded-full object-cover mr-3 border border-gray-200" 
                                        alt="Teacher"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3 text-xs font-bold">
                                        T{idx+1}
                                    </div>
                                )}
                                <div>
                                    <div className="font-medium text-gray-700">{getFullName(m)}</div>
                                    <div className="text-xs text-gray-500">{m.phone || '-'}</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Students */}
                    {students.length > 0 && (
                         <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t border-gray-100">
                            นักเรียน (Students)
                        </div>
                    )}
                    {students.map((m: any, idx: number) => (
                        <div key={`s-${idx}`} className="p-3 text-sm flex justify-between items-center hover:bg-gray-50">
                             <div className="flex items-center">
                                {m.photoDriveId ? (
                                    <img 
                                        src={getPhotoUrl(m.photoDriveId)} 
                                        className="w-8 h-8 rounded-full object-cover mr-3 border border-gray-200" 
                                        alt="Student"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3 text-xs font-bold">
                                        S{idx+1}
                                    </div>
                                )}
                                <div>
                                    <div className="font-medium text-gray-700">{getFullName(m)}</div>
                                    <div className="text-xs text-gray-500">{m.class ? `ชั้น ${m.class}` : '-'}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {teachers.length === 0 && students.length === 0 && (
                        <p className="p-4 text-sm text-center text-gray-400">ไม่มีข้อมูลสมาชิก</p>
                    )}
                </div>
            </div>

             {/* Contact */}
             <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    ข้อมูลติดต่อ (ผู้ประสานงาน)
                </h4>
                <div className="text-sm text-gray-600 space-y-1 pl-6">
                    <p>ชื่อ: {contact.name || '-'}</p>
                    <p>เบอร์โทรศัพท์: {contact.phone || '-'}</p>
                    <p>Line ID: {contact.lineId || '-'}</p>
                </div>
            </div>

            {/* Files */}
            <div>
                 <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    ไฟล์แนบ ({files.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {files.map(f => (
                        <a 
                            key={f.FileLogID} 
                            href={f.FileUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center text-blue-600 group-hover:bg-blue-200">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="ml-3 overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">{f.FileType}</p>
                                <p className="text-xs text-gray-500">{f.Status}</p>
                            </div>
                        </a>
                    ))}
                    {files.length === 0 && <p className="text-sm text-gray-400 pl-6">ไม่มีไฟล์แนบ</p>}
                </div>
            </div>

            {/* Scores Section */}
            {(team.score > 0 || areaInfo?.score) && (
                <div className="mt-6 space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center">
                        <Medal className="w-4 h-4 mr-2" />
                        ผลการแข่งขัน
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                         {/* Cluster Round */}
                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl-lg font-bold">
                                ระดับกลุ่มเครือข่าย (Network)
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div>
                                    <span className="text-yellow-800 font-medium">คะแนนรวม</span>
                                    {team.rank && (
                                        <p className="text-sm text-yellow-700 mt-1 flex items-center font-semibold">
                                            <Hash className="w-4 h-4 mr-1"/> ลำดับ: {team.rank}
                                        </p>
                                    )}
                                </div>
                                <div className="text-3xl font-bold text-yellow-700">{team.score || '-'}</div>
                            </div>
                        </div>

                        {/* Area Round (if applicable) */}
                        {(areaInfo?.score || team.stageStatus === 'Area') && (
                             <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-bl-lg font-bold">
                                    ระดับเขตพื้นที่ (District)
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <div>
                                        <span className="text-purple-800 font-medium">คะแนนรวม</span>
                                        {areaInfo?.rank && <p className="text-xs text-purple-600 mt-1">อันดับ: {areaInfo.rank}</p>}
                                    </div>
                                    <div className="text-3xl font-bold text-purple-700">{areaInfo?.score || '-'}</div>
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