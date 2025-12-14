import React, { useState, useMemo } from 'react';
import { AppData, Team, TeamStatus, User, AreaStageInfo } from '../types';
import { Search, Filter, MoreHorizontal, FileText, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Eye, Trophy, Medal, Hash, Image as ImageIcon, LayoutGrid } from 'lucide-react';
import TeamDetailModal from './TeamDetailModal';

interface TeamListProps {
  data: AppData;
  user?: User | null;
}

const ITEMS_PER_PAGE = 20;

const TeamList: React.FC<TeamListProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [clusterFilter, setClusterFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  // Default to 'area' as requested
  const [viewRound, setViewRound] = useState<'cluster' | 'area'>('area');

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(data.activities.map(a => a.category))).sort();
  }, [data.activities]);

  // Extract clusters for filter
  const clusters = useMemo(() => {
    return data.clusters.sort((a, b) => a.ClusterName.localeCompare(b.ClusterName));
  }, [data.clusters]);

  // Helper to normalize status (handle numeric codes if present)
  const normalizeStatus = (status: string) => {
    if (status === '1') return TeamStatus.APPROVED;
    if (status === '0') return TeamStatus.PENDING;
    if (status === '2' || status === '-1') return TeamStatus.REJECTED;
    return status;
  };

  // RBAC & Logic Filtering
  const filteredTeams = useMemo(() => {
    let teams = data.teams;
    const isGuest = !user || user.isGuest;

    // 1. Permission Filtering
    if (isGuest) {
        // Guests see everything (read-only)
    } else if (user) {
        const role = user.level?.toLowerCase();

        if (role === 'admin' || role === 'area') {
            // See ALL
        } else if (role === 'group_admin') {
            // See only teams in their cluster
            const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
            if (userSchool) {
                const userClusterId = userSchool.SchoolCluster;
                teams = teams.filter(t => {
                    const teamSchool = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                    return teamSchool && teamSchool.SchoolCluster === userClusterId;
                });
            } else {
                teams = [];
            }
        } else if (role === 'school_admin') {
            // See only teams in their school
            teams = teams.filter(t => t.schoolId === user.SchoolID);
        } else if (role === 'user') {
            // See only teams created by themselves
            teams = teams.filter(t => t.createdBy === user.userid);
        } else if (role === 'score') {
            // See teams in assigned activities
            const allowedActivities = user.assignedActivities || [];
            teams = teams.filter(t => allowedActivities.includes(t.activityId));
        }
    }

    // 2. Round Filtering (Cluster vs Area)
    if (viewRound === 'area') {
        teams = teams.filter(team => {
            const isRepresentative = String(team.flag).toLowerCase() === 'true';
            const isAreaStage = String(team.stageStatus).toLowerCase() === 'area';
            return isRepresentative || isAreaStage;
        });
    }

    // 3. Search & Status & Category & Cluster Filtering
    return teams.filter(team => {
      const activity = data.activities.find(a => a.id === team.activityId);
      // Improved school lookup to support ID or Name
      const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const cluster = school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster) : null;
      const normalizedStatus = normalizeStatus(team.status);
      
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        team.teamName.toLowerCase().includes(term) || 
        team.teamId.toLowerCase().includes(term) ||
        (school && school.SchoolName.toLowerCase().includes(term)) ||
        (cluster && cluster.ClusterName.toLowerCase().includes(term));
      
      const matchesStatus = statusFilter === 'All' || normalizedStatus === statusFilter;
      const matchesCategory = categoryFilter === 'All' || (activity && activity.category === categoryFilter);
      const matchesCluster = clusterFilter === 'All' || (cluster && cluster.ClusterID === clusterFilter);

      return matchesSearch && matchesStatus && matchesCategory && matchesCluster;
    });
  }, [data.teams, data.schools, data.activities, data.clusters, user, searchTerm, statusFilter, categoryFilter, clusterFilter, viewRound]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    switch(status) {
      case TeamStatus.APPROVED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> อนุมัติ</span>;
      case TeamStatus.PENDING:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/> รอตรวจ</span>;
      case TeamStatus.REJECTED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> ปฏิเสธ</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getAreaInfo = (stageInfo: string): AreaStageInfo | null => {
    try {
        return JSON.parse(stageInfo);
    } catch {
        return null;
    }
  };

  const getTeamImageUrl = (team: Team) => {
    // Priority: LogoUrl -> PhotoID (as thumb) -> Fallback
    if (team.logoUrl && team.logoUrl.startsWith('http')) return team.logoUrl;
    if (team.teamPhotoId) return `https://drive.google.com/thumbnail?id=${team.teamPhotoId}`;
    // Fallback image (Golden Trophy Icon)
    return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; 
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">รายชื่อทีม (Teams)</h2>
          <p className="text-gray-500">
             แสดงข้อมูลทีม {viewRound === 'area' ? 'รอบระดับเขตพื้นที่' : 'ทั้งหมด'} {filteredTeams.length} ทีม 
             {user && !user.isGuest && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">สิทธิ์: {user.level}</span>}
          </p>
        </div>
        
        {/* Round Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
            <button
                onClick={() => { setViewRound('area'); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewRound === 'area' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                ระดับเขตพื้นที่ (District)
            </button>
            <button
                onClick={() => { setViewRound('cluster'); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewRound === 'cluster' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                ระดับกลุ่มเครือข่าย (Network)
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        
        {/* Row 1: Search and Cluster/Category Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="ค้นหาชื่อทีม, โรงเรียน, กลุ่มเครือข่าย..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                 {/* Cluster Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <LayoutGrid className="w-5 h-5 text-gray-500 hidden sm:block" />
                    <select 
                        className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                        value={clusterFilter}
                        onChange={(e) => { setClusterFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">ทุกกลุ่มเครือข่าย</option>
                        {clusters.map(c => (
                        <option key={c.ClusterID} value={c.ClusterID}>{c.ClusterName}</option>
                        ))}
                    </select>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-5 h-5 text-gray-500 hidden sm:block" />
                    <select 
                        className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">ทุกหมวดหมู่</option>
                        {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select 
                        className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="All">ทุกสถานะ</option>
                        {Object.values(TeamStatus).map(s => (
                        <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
      </div>

      {/* Mobile Cards (Visible on Small Screens) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {paginatedTeams.map((team) => {
            const activity = data.activities.find(a => a.id === team.activityId);
            // Improved lookup
            const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
            const cluster = school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster) : null;
            const areaInfo = getAreaInfo(team.stageInfo);
            const imageUrl = getTeamImageUrl(team);
            const showScore = viewRound === 'cluster' ? team.score : areaInfo?.score;
            const showRank = viewRound === 'cluster' ? team.rank : (areaInfo?.rank || areaInfo?.medal);

            return (
                <div 
                    key={team.teamId} 
                    onClick={() => setSelectedTeam(team)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                    <div className="flex-shrink-0">
                        <img className="h-16 w-16 rounded-lg object-cover border border-gray-100" src={imageUrl} alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-gray-900 truncate">
                                {viewRound === 'area' && areaInfo?.name ? areaInfo.name : team.teamName}
                            </h3>
                            {getStatusBadge(team.status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">{school?.SchoolName}</p>
                         <p className="text-[10px] text-gray-400 mt-0.5 truncate flex items-center">
                            <LayoutGrid className="w-3 h-3 mr-1"/> {cluster?.ClusterName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{activity?.name}</p>
                        
                        <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
                            <div className="flex items-center space-x-2">
                                <span className={`text-sm font-bold ${viewRound === 'area' ? 'text-purple-600' : 'text-gray-700'}`}>
                                    {showScore ? `${showScore} คะแนน` : '-'}
                                </span>
                                {showRank && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        #{showRank}
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-blue-500 flex items-center">
                                ดูรายละเอียด <ChevronRight className="w-3 h-3 ml-1" />
                            </span>
                        </div>
                    </div>
                </div>
            );
        })}
        {paginatedTeams.length === 0 && (
            <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                ไม่พบข้อมูลทีมที่ค้นหา
            </div>
        )}
      </div>

      {/* Desktop Table (Hidden on Small Screens) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={viewRound === 'cluster' ? 'bg-gray-50' : 'bg-purple-50'}>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทีม (Team)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมวดหมู่ & รายการ</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">โรงเรียน / กลุ่มเครือข่าย</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {viewRound === 'cluster' ? 'คะแนน / ลำดับ (Score/Rank)' : 'คะแนนเขต / ผล'}
                </th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTeams.length > 0 ? (
                paginatedTeams.map((team) => {
                  const activity = data.activities.find(a => a.id === team.activityId);
                  // Improved lookup
                  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                  const cluster = school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster) : null;
                  const teamFiles = data.files.filter(f => f.TeamID === team.teamId);
                  const areaInfo = getAreaInfo(team.stageInfo);
                  const imageUrl = getTeamImageUrl(team);
                  
                  // Score Display Logic
                  const showScore = viewRound === 'cluster' ? team.score : areaInfo?.score;
                  const showRank = viewRound === 'cluster' ? team.rank : (areaInfo?.rank || areaInfo?.medal);

                  return (
                    <tr 
                        key={team.teamId} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedTeam(team)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                              <img className="h-10 w-10 rounded-full object-cover border border-gray-100" src={imageUrl} alt="" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                                {viewRound === 'area' && areaInfo?.name ? areaInfo.name : team.teamName}
                            </div>
                            <div className="text-xs text-gray-500">ID: {team.teamId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex flex-col">
                            {activity?.category && (
                                <span className="inline-flex self-start items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 mb-1 border border-blue-100">
                                    {activity.category}
                                </span>
                            )}
                            <div className="text-sm text-gray-900 max-w-[180px] truncate" title={activity?.name}>{activity?.name || team.activityId}</div>
                            <div className="text-xs text-gray-500">{team.level}</div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 max-w-[150px] truncate" title={school?.SchoolName}>{school?.SchoolName || team.schoolId}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                            <LayoutGrid className="w-3 h-3 mr-1 text-gray-400"/>
                            {cluster?.ClusterName || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(team.status)}
                        {viewRound === 'area' && team.stageStatus === 'Area' && (
                             <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                ระดับเขตพื้นที่
                             </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                            {showScore !== undefined && showScore !== null ? (
                                <span className={`font-bold text-base ${viewRound === 'area' ? 'text-purple-700' : 'text-gray-900'}`}>
                                    {showScore > 0 ? showScore : '-'}
                                </span>
                            ) : (
                                <span className="text-gray-400 text-xs">-</span>
                            )}
                            {showRank && showRank !== "null" && showRank !== "" && (
                                <span className="text-xs text-gray-600 flex items-center mt-1 font-medium bg-gray-100 px-1.5 py-0.5 rounded self-start">
                                    <Hash className="w-3 h-3 mr-1" /> {showRank}
                                </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <div className="flex items-center justify-end space-x-2">
                            {teamFiles.length > 0 && (
                                <div className="text-gray-400" title="มีไฟล์แนบ">
                                    <FileText className="w-4 h-4" />
                                </div>
                            )}
                            <button className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-full">
                                <Eye className="w-4 h-4" />
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

      {/* Pagination Controls (Shared) */}
      {filteredTeams.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-xl shadow-sm">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            แสดง <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> ถึง <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredTeams.length)}</span> จาก <span className="font-medium">{filteredTeams.length}</span> รายการ
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <span className="sr-only">Previous</span>
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                หน้า {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <span className="sr-only">Next</span>
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </nav>
                    </div>
                </div>
                 {/* Mobile Pagination */}
                 <div className="flex items-center justify-between w-full sm:hidden">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        ก่อนหน้า
                    </button>
                    <span className="text-sm text-gray-700">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        ถัดไป
                    </button>
                </div>
            </div>
        )}

      {/* Modal */}
      {selectedTeam && (
          <TeamDetailModal 
            team={selectedTeam} 
            data={data} 
            onClose={() => setSelectedTeam(null)} 
          />
      )}
    </div>
  );
};

export default TeamList;