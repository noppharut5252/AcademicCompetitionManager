import React, { useState } from 'react';
import { AppData, Team } from '../types';
import { Search, Printer, Download, IdCard, FileBadge, User } from 'lucide-react';

interface DocumentsViewProps {
  data: AppData;
  type: 'certificate' | 'idcard';
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ data, type }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const teams = data.teams.filter(team => 
    team.status === 'Approved' && 
    (team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     team.teamId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const title = type === 'certificate' ? 'พิมพ์เกียรติบัตร (Certificates)' : 'พิมพ์บัตรประจำตัว (ID Cards)';
  const description = type === 'certificate' 
    ? 'ดาวน์โหลดเกียรติบัตรสำหรับทีมที่ได้รับรางวัลหรือเข้าร่วม' 
    : 'ดาวน์โหลดบัตรประจำตัวผู้เข้าแข่งขันสำหรับวันงาน';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-500">{description}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="ค้นหาทีมเพื่อพิมพ์เอกสาร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => {
            const activity = data.activities.find(a => a.id === team.activityId);
            const school = data.schools.find(s => s.SchoolID === team.schoolId);
            
            // Parsing members safely
            let members = [];
            try {
                members = JSON.parse(team.members);
            } catch {
                members = [{name: "Unknown Member"}];
            }

            return (
                <div key={team.teamId} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-gray-400">{team.teamId}</span>
                        {type === 'certificate' && team.score > 0 ? (
                             <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">มีผลรางวัล</span>
                        ) : (
                             <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">ผู้เข้าแข่งขัน</span>
                        )}
                    </div>
                    
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{team.teamName}</h3>
                    <p className="text-sm text-gray-500 mb-3">{school?.SchoolName}</p>
                    <p className="text-xs text-gray-400 mb-4">{activity?.name}</p>

                    <div className="border-t border-gray-100 pt-3 mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">สมาชิกในทีม:</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                            {members.map((m: any, idx: number) => (
                                <li key={idx} className="flex items-center">
                                    <User className="w-3 h-3 mr-2 text-gray-400" />
                                    {m.name}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button 
                        className={`w-full flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium text-white transition-colors ${type === 'certificate' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        onClick={() => alert(`จำลองการดาวน์โหลด PDF สำหรับทีม ${team.teamName}`)}
                    >
                        {type === 'certificate' ? <FileBadge className="w-4 h-4 mr-2" /> : <IdCard className="w-4 h-4 mr-2" />}
                        {type === 'certificate' ? 'ดาวน์โหลดเกียรติบัตร' : 'พิมพ์บัตรประจำตัว'}
                    </button>
                </div>
            );
        })}
        {teams.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                <Printer className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>ไม่พบทีมที่ค้นหา หรือ ทีมยังไม่ได้รับการอนุมัติ</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsView;