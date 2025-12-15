
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Team, TeamStatus, User } from '../types';
import { Search, Printer, IdCard, Smartphone, CheckCircle, X, ChevronLeft, ChevronRight, User as UserIcon, GraduationCap, School, MapPin, LayoutGrid, Trophy, Lock, QrCode } from 'lucide-react';

interface DocumentsViewProps {
  data: AppData;
  type: 'certificate' | 'idcard';
  user?: User | null;
}

// --- Helper for QR Code URL ---
const getQrCodeUrl = (text: string, size: number = 150) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
};

// --- Digital ID Card Component ---
const DigitalIdCard = ({ member, role, team, activity, schoolName, viewLevel }: { member: any, role: string, team: Team, activity: string, schoolName: string, viewLevel: 'cluster' | 'area' }) => {
    const getPhotoUrl = (urlOrId: string) => {
        if (!urlOrId) return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png";
        if (urlOrId.startsWith('http')) return urlOrId;
        return `https://drive.google.com/thumbnail?id=${urlOrId}`;
    };

    const imageUrl = member.image || (member.photoDriveId ? getPhotoUrl(member.photoDriveId) : getPhotoUrl(''));
    const prefix = member.prefix || '';
    const name = member.name || `${member.firstname || ''} ${member.lastname || ''}`;
    const fullName = `${prefix}${name}`.trim();
    
    // Style adjustments based on level
    const isArea = viewLevel === 'area';
    const bgGradient = isArea ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900' : 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900';
    const accentColor = isArea ? 'text-purple-400' : 'text-blue-400';
    const badgeColor = isArea ? 'bg-purple-500' : 'bg-blue-500';
    const levelText = isArea ? 'DISTRICT LEVEL' : 'CLUSTER LEVEL';
    const levelThai = isArea ? 'ระดับเขตพื้นที่การศึกษา' : 'ระดับกลุ่มเครือข่าย';

    return (
        <div className="relative w-full max-w-[340px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 mx-auto flex flex-col h-auto min-h-[550px]">
            
            {/* Header Background */}
            <div className={`absolute top-0 left-0 right-0 h-40 ${bgGradient} rounded-b-[3rem] z-0`}>
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
            </div>
            
            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center pt-8 px-6 pb-8 h-full">
                
                {/* Event Title */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-2">
                        <Trophy className="w-3 h-3 text-yellow-400" />
                        <span className="text-[10px] font-bold text-white tracking-wider uppercase">{levelText}</span>
                    </div>
                    <h2 className="text-white font-bold text-xl drop-shadow-md font-kanit">Academic Competition</h2>
                    <p className="text-white/80 text-xs font-light">{levelThai}</p>
                </div>

                {/* Photo & Badge */}
                <div className="relative mb-5 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                    <img 
                        src={imageUrl} 
                        alt={fullName}
                        className="relative w-36 h-36 rounded-full object-cover border-4 border-white shadow-xl bg-gray-100"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; }}
                    />
                    <div className={`absolute bottom-1 right-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg border-2 border-white flex items-center gap-1 uppercase tracking-wide ${role === 'Teacher' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                        {role === 'Teacher' ? <UserIcon className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                        {role === 'Teacher' ? 'Staff' : 'Student'}
                    </div>
                </div>

                {/* Name */}
                <div className="text-center mb-6 w-full">
                    <h2 className="text-gray-900 font-bold text-xl sm:text-2xl leading-tight mb-1 font-kanit break-words">{fullName}</h2>
                    <p className="text-gray-500 text-sm font-medium">{role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'ผู้เข้าแข่งขัน'}</p>
                </div>

                {/* Info Grid */}
                <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-white shadow-sm shrink-0 ${accentColor}`}>
                            <School className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">School</p>
                            <p className="text-sm font-semibold text-gray-800 leading-snug break-words">{schoolName}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-white shadow-sm shrink-0 ${accentColor}`}>
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Activity</p>
                            <p className="text-sm font-semibold text-gray-800 leading-snug break-words">{activity}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                         <div className={`p-2 rounded-lg bg-white shadow-sm shrink-0 ${accentColor}`}>
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Team ID</p>
                            <p className="text-sm font-mono font-bold text-gray-800 bg-gray-200 px-2 rounded inline-block">{team.teamId}</p>
                        </div>
                    </div>
                </div>

                {/* QR Code Footer */}
                <div className="mt-auto w-full pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
                    <div className="text-left">
                        <p className="text-[10px] text-gray-400 font-medium">SCAN FOR VERIFICATION</p>
                        <p className="text-[10px] text-gray-300">ID: {team.teamId}</p>
                    </div>
                    <div className="bg-white p-1 rounded border border-gray-100 shadow-sm">
                        <img src={getQrCodeUrl(team.teamId, 60)} alt="QR" className="w-12 h-12 opacity-90" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Digital ID Modal ---
const DigitalIdModal = ({ team, data, onClose, viewLevel }: { team: Team, data: AppData, onClose: () => void, viewLevel: 'cluster' | 'area' }) => {
    const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
    const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;

    let teachers: any[] = [];
    let students: any[] = [];

    // Decide which members to show based on viewLevel
    let memberSource = team.members;
    if (viewLevel === 'area' && team.stageInfo) {
        try {
            const areaInfo = JSON.parse(team.stageInfo);
            if (areaInfo.members) memberSource = areaInfo.members;
        } catch {}
    }

    try {
        const rawMembers = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
        if (rawMembers) {
            if (Array.isArray(rawMembers)) {
                students = rawMembers;
            } else if (typeof rawMembers === 'object') {
                teachers = Array.isArray(rawMembers.teachers) ? rawMembers.teachers : [];
                students = Array.isArray(rawMembers.students) ? rawMembers.students : [];
            }
        }
    } catch { }

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-gray-100 w-full max-w-6xl h-[95vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center font-kanit">
                            <Smartphone className="w-5 h-5 mr-2 text-blue-600" />
                            บัตรประจำตัวดิจิทัล ({viewLevel === 'area' ? 'ระดับเขตพื้นที่' : 'ระดับกลุ่มเครือข่าย'})
                        </h3>
                        <p className="text-sm text-gray-500">{team.teamName} - {school}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
                        {teachers.map((m, idx) => (
                            <DigitalIdCard key={`t-${idx}`} member={m} role="Teacher" team={team} activity={activity} schoolName={school} viewLevel={viewLevel} />
                        ))}
                        {students.map((m, idx) => (
                            <DigitalIdCard key={`s-${idx}`} member={m} role="Student" team={team} activity={activity} schoolName={school} viewLevel={viewLevel} />
                        ))}
                        {(teachers.length === 0 && students.length === 0) && (
                            <div className="col-span-full text-center py-20 text-gray-400">
                                ไม่พบข้อมูลสมาชิกในทีม
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main View Component ---

const DocumentsView: React.FC<DocumentsViewProps> = ({ data, type, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedTeamForDigital, setSelectedTeamForDigital] = useState<Team | null>(null);
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');

  const title = type === 'certificate' ? 'พิมพ์เกียรติบัตร (Certificates)' : 'พิมพ์บัตรประจำตัว (ID Cards)';
  const description = type === 'certificate' 
    ? 'ดาวน์โหลดเกียรติบัตรสำหรับทีมที่ได้รับรางวัล' 
    : 'พิมพ์บัตรประจำตัวผู้เข้าแข่งขันและครูผู้ฝึกสอน หรือแสดงบัตรดิจิทัล';

  // Helper: Count Members
  const getMemberCounts = (team: Team) => {
      let tCount = 0;
      let sCount = 0;
      
      let memberSource = team.members;
      if (viewLevel === 'area' && team.stageInfo) {
          try {
              const areaInfo = JSON.parse(team.stageInfo);
              if (areaInfo.members) memberSource = areaInfo.members;
          } catch {}
      }

      try {
          const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
          if (Array.isArray(raw)) {
              sCount = raw.length;
          } else if (raw && typeof raw === 'object') {
              tCount = Array.isArray(raw.teachers) ? raw.teachers.length : 0;
              sCount = Array.isArray(raw.students) ? raw.students.length : 0;
          }
      } catch {}
      return { tCount, sCount };
  };

  // Filter Logic
  const filteredTeams = useMemo(() => {
    return data.teams.filter(team => {
        if (user && user.SchoolID) {
            const isSchoolUser = user.level === 'school_admin' || user.level === 'user';
            if (isSchoolUser) {
                const teamSchool = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
                const isMySchool = team.schoolId === user.SchoolID || teamSchool?.SchoolName === userSchool?.SchoolName;
                if (!isMySchool) return false;
            }
        }
        
        if (type === 'certificate') {
             const hasClusterScore = team.score > 0;
             let hasAreaScore = false;
             try {
                if(team.stageInfo) {
                    const info = JSON.parse(team.stageInfo);
                    hasAreaScore = info.score > 0;
                }
             } catch {}

             if (viewLevel === 'cluster' && !hasClusterScore) return false;
             if (viewLevel === 'area' && !hasAreaScore) return false;
        }

        const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
        const activity = data.activities.find(a => a.id === team.activityId);
        const term = searchTerm.toLowerCase();
        
        return (
            team.teamName.toLowerCase().includes(term) || 
            team.teamId.toLowerCase().includes(term) ||
            (school && school.SchoolName.toLowerCase().includes(term)) ||
            (activity && activity.name.toLowerCase().includes(term))
        );
    });
  }, [data.teams, data.schools, data.activities, searchTerm, type, user, viewLevel]);

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrint = (team: Team) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
      const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;
      
      const levelTitle = viewLevel === 'area' ? 'ระดับเขตพื้นที่การศึกษา' : 'ระดับกลุ่มเครือข่าย';
      const levelSubtitle = viewLevel === 'area' ? 'District Level' : 'Cluster Level';
      const headerColor = viewLevel === 'area' ? '#581c87' : '#1e40af'; // Purple vs Blue

      // 1. Prepare Data List
      let allMembers: any[] = [];
      let memberSource = team.members;
      
      if (viewLevel === 'area' && team.stageInfo) {
          try {
              const areaInfo = JSON.parse(team.stageInfo);
              if (areaInfo.members) memberSource = areaInfo.members;
          } catch {}
      }

      try {
          const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
          if (Array.isArray(raw)) {
              allMembers = raw.map(m => ({ ...m, role: 'Student' }));
          } else if (raw && typeof raw === 'object') {
              const teachers = (Array.isArray(raw.teachers) ? raw.teachers : []).map((m: any) => ({ ...m, role: 'Teacher' }));
              const students = (Array.isArray(raw.students) ? raw.students : []).map((m: any) => ({ ...m, role: 'Student' }));
              allMembers = [...teachers, ...students];
          }
      } catch {}

      // 2. Chunk members into groups of 4 (for 4 cards per A4 page)
      const pages = [];
      for (let i = 0; i < allMembers.length; i += 4) {
          pages.push(allMembers.slice(i, i + 4));
      }

      const qrUrl = getQrCodeUrl(team.teamId, 100);

      const htmlContent = `
        <html>
          <head>
            <title>Print ID Cards - ${team.teamName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600;700&display=swap" rel="stylesheet">
            <style>
              @page { size: A4; margin: 0; }
              body { 
                font-family: 'Kanit', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: #eee;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
              }
              .page {
                width: 210mm;
                height: 296mm; /* Slightly less than 297mm to prevent overflow */
                background: white;
                margin: 0 auto;
                page-break-after: always;
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                padding: 10mm;
                box-sizing: border-box;
                gap: 5mm;
              }
              .card {
                border: 1px dashed #ccc;
                border-radius: 8px;
                overflow: hidden;
                position: relative;
                display: flex;
                flex-direction: column;
                background: white;
              }
              .card-header {
                background: ${headerColor};
                color: white;
                padding: 15px 10px;
                text-align: center;
                height: 70px;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              .card-header h1 { margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
              .card-header p { margin: 2px 0 0; font-size: 9pt; opacity: 0.9; }
              
              .card-body {
                padding: 15px;
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              .role-badge {
                display: inline-block;
                padding: 4px 15px;
                border-radius: 20px;
                font-size: 10pt;
                font-weight: bold;
                margin-bottom: 10px;
                text-transform: uppercase;
              }
              .role-teacher { background: #e0e7ff; color: #3730a3; }
              .role-student { background: #dcfce7; color: #166534; }
              
              .name { font-size: 16pt; font-weight: bold; color: #000; margin-bottom: 5px; line-height: 1.2; }
              .school { font-size: 11pt; color: #555; margin-bottom: 5px; font-weight: 500; }
              .team { font-size: 10pt; color: #777; margin-bottom: 15px; }
              
              .activity-box {
                width: 100%;
                border-top: 1px solid #eee;
                padding-top: 10px;
                margin-top: auto;
              }
              .activity-name { font-size: 11pt; color: #333; font-weight: 600; }

              .footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: #f9fafb;
                border-top: 1px solid #eee;
              }
              .footer-text { text-align: left; }
              .qr-code { width: 50px; height: 50px; }
              
              @media print {
                body { background: white; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="padding: 20px; text-align: center; background: #333; color: white; position: sticky; top: 0; z-index: 999;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; font-weight: bold; cursor: pointer; background: #fff; border: none; border-radius: 5px;">🖨️ Print Now (A4)</button>
                <div style="margin-top: 5px; font-size: 12px;">Ensure "Background graphics" is enabled in print settings</div>
            </div>

            ${pages.map(pageMembers => `
              <div class="page">
                ${pageMembers.map((m: any) => {
                    const prefix = m.prefix || '';
                    const name = m.name || `${m.firstname || ''} ${m.lastname || ''}`;
                    const fullName = `${prefix}${name}`.trim();
                    const roleLabel = m.role === 'Teacher' ? 'ครูผู้ฝึกสอน (Teacher)' : 'ผู้เข้าแข่งขัน (Student)';
                    const roleClass = m.role === 'Teacher' ? 'role-teacher' : 'role-student';

                    return `
                      <div class="card">
                        <div class="card-header">
                          <h1>ID CARD</h1>
                          <p>${levelTitle}</p>
                        </div>
                        <div class="card-body">
                          <div class="${roleClass} role-badge">${m.role}</div>
                          <div class="name">${fullName}</div>
                          <div class="school">${school}</div>
                          <div class="team">ทีม: ${team.teamName}</div>
                          
                          <div class="activity-box">
                             <div class="activity-name">${activity}</div>
                          </div>
                        </div>
                        <div class="footer">
                            <div class="footer-text">
                                <div style="font-size: 8pt; font-weight: bold; color: #555;">ID: ${team.teamId}</div>
                                <div style="font-size: 7pt; color: #888;">Academic Competition</div>
                            </div>
                            <img src="${qrUrl}" class="qr-code" />
                        </div>
                      </div>
                    `;
                }).join('')}
              </div>
            `).join('')}
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {selectedTeamForDigital && (
          <DigitalIdModal team={selectedTeamForDigital} data={data} onClose={() => setSelectedTeamForDigital(null)} viewLevel={viewLevel} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                {type === 'certificate' ? <CheckCircle className="w-6 h-6 mr-2 text-green-600" /> : <IdCard className="w-6 h-6 mr-2 text-blue-600" />}
                {title}
            </h2>
            <p className="text-gray-500 text-sm mt-1">{description}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             {/* Level Toggle */}
             <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                <button
                    onClick={() => setViewLevel('cluster')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-1.5" />
                    ระดับกลุ่มฯ
                </button>
                <button
                    onClick={() => setViewLevel('area')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Trophy className="w-4 h-4 mr-1.5" />
                    ระดับเขตฯ
                </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    placeholder="ค้นหาชื่อทีม, โรงเรียน..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>
        </div>
      </div>

      {/* User Info Badge if School Admin */}
      {(user?.level === 'school_admin' || user?.level === 'user') && user.SchoolID && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center text-blue-700 text-sm">
               <School className="w-4 h-4 mr-2" />
               แสดงข้อมูลเฉพาะ: <span className="font-bold ml-1">{data.schools.find(s => s.SchoolID === user.SchoolID)?.SchoolName || user.SchoolID}</span>
          </div>
      )}

      {/* Mobile View (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
          {paginatedTeams.map(team => {
              const activity = data.activities.find(a => a.id === team.activityId);
              const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
              const { tCount, sCount } = getMemberCounts(team);

              return (
                  <div key={team.teamId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                      {/* Level Indicator Strip */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${viewLevel === 'area' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-2 pl-2">
                          <h3 className="font-bold text-gray-900 line-clamp-1 font-kanit">{team.teamName}</h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{team.teamId}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 flex items-center pl-2"><School className="w-3 h-3 mr-1.5"/> {school?.SchoolName}</p>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-1 pl-2">{activity?.name}</p>
                      
                      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg ml-2">
                          <div className="flex items-center"><UserIcon className="w-3 h-3 mr-1 text-indigo-500"/> ครู: {tCount}</div>
                          <div className="flex items-center"><GraduationCap className="w-3 h-3 mr-1 text-green-500"/> นักเรียน: {sCount}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pl-2">
                          {type === 'idcard' && (
                              <button 
                                onClick={() => setSelectedTeamForDigital(team)}
                                className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-colors ${viewLevel === 'area' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                              >
                                  <Smartphone className="w-4 h-4 mr-1.5" /> Digital ID
                              </button>
                          )}
                          <button 
                            onClick={() => handlePrint(team)}
                            className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors ${type === 'idcard' ? (viewLevel === 'area' ? 'bg-purple-600 hover:bg-purple-700 col-span-1' : 'bg-blue-600 hover:bg-blue-700 col-span-1') : 'bg-green-600 hover:bg-green-700 col-span-2'}`}
                          >
                              <Printer className="w-4 h-4 mr-1.5" /> พิมพ์{type === 'certificate' ? 'เกียรติบัตร' : 'บัตร'}
                          </button>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className={viewLevel === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการแข่งขัน</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โรงเรียน</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สมาชิก ({viewLevel === 'area' ? 'เขต' : 'กลุ่ม'})</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ดำเนินการ</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedTeams.map((team) => {
                          const activity = data.activities.find(a => a.id === team.activityId);
                          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                          const { tCount, sCount } = getMemberCounts(team);

                          return (
                              <tr key={team.teamId} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900 font-kanit">{team.teamName}</div>
                                      <div className="text-xs text-gray-500 font-mono">{team.teamId}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900 max-w-[200px] truncate" title={activity?.name}>{activity?.name}</div>
                                      <div className="text-xs text-gray-500">{team.level}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{school?.SchoolName}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <div className="text-xs text-gray-600 flex justify-center gap-3">
                                          <span className="flex items-center bg-indigo-50 px-2 py-1 rounded border border-indigo-100 text-indigo-700" title="ครู"><UserIcon className="w-3 h-3 mr-1"/> {tCount}</span>
                                          <span className="flex items-center bg-green-50 px-2 py-1 rounded border border-green-100 text-green-700" title="นักเรียน"><GraduationCap className="w-3 h-3 mr-1"/> {sCount}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <div className="flex items-center justify-end gap-2">
                                          {type === 'idcard' && (
                                              <button 
                                                onClick={() => setSelectedTeamForDigital(team)}
                                                className={`flex items-center px-3 py-1.5 border rounded-lg transition-colors shadow-sm ${viewLevel === 'area' ? 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                              >
                                                  <Smartphone className="w-4 h-4 mr-1.5" />
                                                  Digital ID
                                              </button>
                                          )}
                                          <button 
                                            onClick={() => handlePrint(team)}
                                            className="flex items-center px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
                                          >
                                              <Printer className="w-4 h-4 mr-1.5" />
                                              พิมพ์
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {paginatedTeams.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/50">
                                  <Printer className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                  <p>ไม่พบข้อมูลทีมสำหรับพิมพ์เอกสาร</p>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
              <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                  ก่อนหน้า
              </button>
              <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                  ถัดไป
              </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                  <p className="text-sm text-gray-700">
                      แสดง <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTeams.length)}</span> จาก <span className="font-medium">{filteredTeams.length}</span> รายการ
                  </p>
              </div>
              <div className="flex items-center gap-2">
                  <select
                      className="block rounded-md border-gray-300 py-1.5 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  >
                      <option value={12}>12 / หน้า</option>
                      <option value={24}>24 / หน้า</option>
                      <option value={48}>48 / หน้า</option>
                  </select>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                  </nav>
              </div>
          </div>
      </div>
    </div>
  );
};

export default DocumentsView;

