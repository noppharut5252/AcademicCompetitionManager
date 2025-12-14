import React, { useState } from 'react';
import { AppData, Team, TeamStatus } from '../types';
import { Search, Filter, MoreHorizontal, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TeamListProps {
  data: AppData;
}

const TeamList: React.FC<TeamListProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredTeams = data.teams.filter(team => {
    const matchesSearch = 
      team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      team.teamId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || team.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: TeamStatus) => {
    switch(status) {
      case TeamStatus.APPROVED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> อนุมัติแล้ว (Approved)</span>;
      case TeamStatus.PENDING:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/> รอตรวจสอบ (Pending)</span>;
      case TeamStatus.REJECTED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> ปฏิเสธ (Rejected)</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">รายชื่อทีมที่ลงทะเบียน</h2>
          <p className="text-gray-500">จัดการและตรวจสอบสถานะทีมผู้เข้าแข่งขัน</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="ค้นหาชื่อทีม หรือ รหัสทีม..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-gray-500" />
          <select 
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">ทุกสถานะ</option>
            {Object.values(TeamStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการ & ระดับชั้น</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โรงเรียน</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">คะแนน</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team) => {
                  const activity = data.activities.find(a => a.id === team.activityId);
                  const school = data.schools.find(s => s.SchoolID === team.schoolId);
                  const teamFiles = data.files.filter(f => f.TeamID === team.teamId);

                  return (
                    <tr key={team.teamId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {team.logoUrl ? (
                              <img className="h-10 w-10 rounded-full object-cover" src={team.logoUrl} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {team.teamName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{team.teamName}</div>
                            <div className="text-xs text-gray-500">ID: {team.teamId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{activity?.name || team.activityId}</div>
                        <div className="text-xs text-gray-500">{team.level}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{school?.SchoolName || team.schoolId}</div>
                        <div className="text-xs text-gray-500">{data.clusters.find(c => c.ClusterID === school?.SchoolCluster)?.ClusterName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(team.status)}
                        {team.statusReason && <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate">{team.statusReason}</p>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {team.score > 0 ? (
                            <span className="font-bold text-gray-900">{team.score}</span>
                        ) : (
                            <span>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <div className="flex items-center justify-end space-x-2">
                            {teamFiles.length > 0 && (
                                <button className="text-gray-400 hover:text-blue-600" title="ดูไฟล์แนบ">
                                    <FileText className="w-5 h-5" />
                                </button>
                            )}
                            <button className="text-gray-400 hover:text-gray-600" title="เมนูเพิ่มเติม">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                 <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        ไม่พบข้อมูลทีมที่ค้นหา
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamList;