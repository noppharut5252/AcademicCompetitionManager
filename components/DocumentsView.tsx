
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Team, TeamStatus } from '../types';
import { Search, Printer, IdCard, Smartphone, CheckCircle, X, ChevronLeft, ChevronRight, User as UserIcon, GraduationCap, School, MapPin } from 'lucide-react';

interface DocumentsViewProps {
  data: AppData;
  type: 'certificate' | 'idcard';
}

// --- Digital ID Card Component ---
const DigitalIdCard = ({ member, role, team, activity, schoolName }: { member: any, role: string, team: Team, activity: string, schoolName: string }) => {
    const getPhotoUrl = (urlOrId: string) => {
        if (!urlOrId) return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png";
        if (urlOrId.startsWith('http')) return urlOrId;
        return `https://drive.google.com/thumbnail?id=${urlOrId}`;
    };

    const imageUrl = member.image || (member.photoDriveId ? getPhotoUrl(member.photoDriveId) : getPhotoUrl(''));
    const prefix = member.prefix || '';
    const name = member.name || `${member.firstname || ''} ${member.lastname || ''}`;
    const fullName = `${prefix}${name}`.trim();

    return (
        <div className="relative w-full max-w-[320px] aspect-[3/4.5] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 mx-auto transform transition-transform hover:scale-[1.02] duration-300">
            {/* Header / Lanyard Hole Design */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-600 to-blue-800 rounded-b-[50%] z-0"></div>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-white/20 rounded-full z-10"></div>
            
            {/* Card Content */}
            <div className="relative z-10 flex flex-col items-center pt-8 px-6 h-full pb-6">
                
                {/* Event Name */}
                <div className="text-center mb-4">
                    <h3 className="text-white text-xs font-medium opacity-90 tracking-wider uppercase">บัตรประจำตัวผู้เข้าแข่งขัน</h3>
                    <h2 className="text-white font-bold text-lg drop-shadow-md">Academic Competition</h2>
                </div>

                {/* Photo */}
                <div className="relative w-32 h-32 mb-4">
                    <div className="absolute inset-0 bg-white rounded-full opacity-30 blur-sm transform scale-105"></div>
                    <img 
                        src={imageUrl} 
                        alt={fullName}
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg bg-gray-200"
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; }}
                    />
                    <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${role === 'Teacher' ? 'bg-indigo-500' : 'bg-green-500'}`}>
                        {role === 'Teacher' ? <UserIcon className="w-4 h-4 text-white" /> : <GraduationCap className="w-4 h-4 text-white" />}
                    </div>
                </div>

                {/* Name & Role */}
                <div className="text-center mb-6">
                    <h2 className="text-gray-900 font-bold text-xl leading-tight mb-1">{fullName}</h2>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${role === 'Teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                        {role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'นักเรียน / ผู้เข้าแข่งขัน'}
                    </span>
                </div>

                {/* Details */}
                <div className="w-full space-y-3 mt-auto mb-4">
                    <div className="flex items-start text-sm text-gray-600">
                        <School className="w-4 h-4 mr-3 text-blue-500 mt-0.5 shrink-0" />
                        <span className="font-medium text-gray-800 leading-snug">{schoolName}</span>
                    </div>
                    <div className="flex items-start text-sm text-gray-600">
                        <IdCard className="w-4 h-4 mr-3 text-blue-500 mt-0.5 shrink-0" />
                        <span className="leading-snug">{activity}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-3 text-blue-500 shrink-0" />
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">Team ID: {team.teamId}</span>
                    </div>
                </div>

                {/* Footer Barcode Simulation */}
                <div className="w-full pt-4 border-t border-dashed border-gray-300">
                    <div className="h-8 bg-gray-800 rounded opacity-10"></div>
                    <p className="text-[10px] text-center text-gray-400 mt-1">Authorized Digital ID</p>
                </div>
            </div>
        </div>
    );
};

// --- Digital ID Modal ---
const DigitalIdModal = ({ team, data, onClose }: { team: Team, data: AppData, onClose: () => void }) => {
    const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
    const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;

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
    } catch { }

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-gray-100 w-full max-w-4xl h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <Smartphone className="w-5 h-5 mr-2 text-blue-600" />
                            บัตรประจำตัวดิจิทัล (Digital ID)
                        </h3>
                        <p className="text-sm text-gray-500">{team.teamName} - {school}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1 bg-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                        {teachers.map((m, idx) => (
                            <DigitalIdCard key={`t-${idx}`} member={m} role="Teacher" team={team} activity={activity} schoolName={school} />
                        ))}
                        {students.map((m, idx) => (
                            <DigitalIdCard key={`s-${idx}`} member={m} role="Student" team={team} activity={activity} schoolName={school} />
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

const DocumentsView: React.FC<DocumentsViewProps> = ({ data, type }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedTeamForDigital, setSelectedTeamForDigital] = useState<Team | null>(null);

  const title = type === 'certificate' ? 'พิมพ์เกียรติบัตร (Certificates)' : 'พิมพ์บัตรประจำตัว (ID Cards)';
  const description = type === 'certificate' 
    ? 'ดาวน์โหลดเกียรติบัตรสำหรับทีมที่ได้รับรางวัล' 
    : 'พิมพ์บัตรประจำตัวผู้เข้าแข่งขันและครูผู้ฝึกสอน หรือแสดงบัตรดิจิทัล';

  // Helper: Count Members
  const getMemberCounts = (team: Team) => {
      let tCount = 0;
      let sCount = 0;
      try {
          const raw = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
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
        // Condition: Approved Only for IDs
        const statusStr = String(team.status);
        if (statusStr !== '1' && statusStr !== TeamStatus.APPROVED) return false;
        
        // For Certificates: Must have score/rank (Logic can be adjusted)
        if (type === 'certificate') {
             const hasScore = team.score > 0 || (team.stageInfo && JSON.parse(team.stageInfo)?.score > 0);
             if (!hasScore) return false;
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
  }, [data.teams, data.schools, data.activities, searchTerm, type]);

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrint = (team: Team) => {
      // Simulate Printing - In real app, generate PDF or open print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
      const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;
      const { tCount, sCount } = getMemberCounts(team);

      printWindow.document.write(`
        <html>
          <head>
            <title>Print ID Cards - ${team.teamName}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              .card { border: 1px solid #ddd; width: 300px; height: 450px; display: inline-block; margin: 10px; padding: 20px; text-align: center; page-break-inside: avoid; vertical-align: top; }
              .header { font-weight: bold; margin-bottom: 10px; }
              .role { background: #eee; padding: 5px; border-radius: 4px; display: inline-block; margin: 10px 0; font-weight: bold; font-size: 12px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="no-print" style="margin-bottom: 20px; padding: 10px; background: #eee;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨️ Print Now</button>
                <span>&nbsp; (จำนวน: ครู ${tCount}, นักเรียน ${sCount})</span>
            </div>
            ${Array.from({length: tCount}).map((_, i) => `
                <div class="card">
                    <div class="header">ID CARD</div>
                    <h3>${team.teamName}</h3>
                    <p>${school}</p>
                    <div class="role">TEACHER</div>
                    <p>${activity}</p>
                    <p style="font-size: 10px; color: #666; margin-top: 50px;">Digital Signature</p>
                </div>
            `).join('')}
            ${Array.from({length: sCount}).map((_, i) => `
                <div class="card">
                    <div class="header">ID CARD</div>
                    <h3>${team.teamName}</h3>
                    <p>${school}</p>
                    <div class="role">STUDENT</div>
                    <p>${activity}</p>
                    <p style="font-size: 10px; color: #666; margin-top: 50px;">Digital Signature</p>
                </div>
            `).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {selectedTeamForDigital && (
          <DigitalIdModal team={selectedTeamForDigital} data={data} onClose={() => setSelectedTeamForDigital(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
                {type === 'certificate' ? <CheckCircle className="w-6 h-6 mr-2 text-green-600" /> : <IdCard className="w-6 h-6 mr-2 text-blue-600" />}
                {title}
            </h2>
            <p className="text-gray-500 text-sm mt-1">{description}</p>
        </div>
        
        <div className="relative w-full md:w-80">
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

      {/* Mobile View (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
          {paginatedTeams.map(team => {
              const activity = data.activities.find(a => a.id === team.activityId);
              const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
              const { tCount, sCount } = getMemberCounts(team);

              return (
                  <div key={team.teamId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-900 line-clamp-1">{team.teamName}</h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{team.teamId}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1 flex items-center"><School className="w-3 h-3 mr-1.5"/> {school?.SchoolName}</p>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-1">{activity?.name}</p>
                      
                      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                          <div className="flex items-center"><UserIcon className="w-3 h-3 mr-1 text-indigo-500"/> ครู: {tCount}</div>
                          <div className="flex items-center"><GraduationCap className="w-3 h-3 mr-1 text-green-500"/> นักเรียน: {sCount}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                          {type === 'idcard' && (
                              <button 
                                onClick={() => setSelectedTeamForDigital(team)}
                                className="flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                              >
                                  <Smartphone className="w-4 h-4 mr-1.5" /> Digital ID
                              </button>
                          )}
                          <button 
                            onClick={() => handlePrint(team)}
                            className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors ${type === 'idcard' ? 'bg-blue-600 hover:bg-blue-700 col-span-1' : 'bg-green-600 hover:bg-green-700 col-span-2'}`}
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
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการแข่งขัน</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โรงเรียน</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนสมาชิก</th>
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
                                      <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
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
                                                className="flex items-center px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
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
