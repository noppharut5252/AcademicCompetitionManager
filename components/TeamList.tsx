
import React, { useState, useMemo } from 'react';
import { AppData, Team, TeamStatus, User, AreaStageInfo } from '../types';
import { Search, Filter, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Eye, Trophy, Medal, Hash, LayoutGrid, Users, Award, School, Printer, FileText, Star, Crown, Zap, Edit, Trash2 } from 'lucide-react';
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
  const [quickFilter, setQuickFilter] = useState<'all' | 'gold' | 'qualified'>('all'); // New Quick Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [viewRound, setViewRound] = useState<'cluster' | 'area'>('area');

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(data.activities.map(a => a.category))).sort();
  }, [data.activities]);

  // Extract clusters for filter
  const clusters = useMemo(() => {
    return data.clusters.sort((a, b) => a.ClusterName.localeCompare(b.ClusterName));
  }, [data.clusters]);

  // Helper to normalize status
  const normalizeStatus = (status: string) => {
    if (status === '1') return TeamStatus.APPROVED;
    if (status === '0') return TeamStatus.PENDING;
    if (status === '2' || status === '-1') return TeamStatus.REJECTED;
    return status;
  };

  const getAreaInfo = (stageInfo: string): AreaStageInfo | null => {
    try {
        return JSON.parse(stageInfo);
    } catch {
        return null;
    }
  };

  // Logic to determine if a team is considered "Qualified" for Area Round
  // Strict Rules: Rank 1 AND Flag (RepresentativeOverride) is TRUE
  const isTeamQualifiedForArea = (team: Team) => {
      const r = String(team.rank || '').trim();
      const f = String(team.flag || '').trim().toUpperCase();
      return r === '1' && f === 'TRUE';
  };

  // --- Dynamic Dashboard Stats Logic ---
  const dashboardStats = useMemo(() => {
      if (!user) return null;

      let scopeTeams: Team[] = [];
      let title = "";
      let icon = Users;
      let bgGradient = "from-blue-600 to-indigo-700";

      const role = user.level?.toLowerCase();

      // 1. Determine Scope
      if (role === 'admin' || role === 'area') {
          scopeTeams = data.teams;
          title = "ภาพรวมระดับเขตพื้นที่ (District Overview)";
          icon = Trophy;
          bgGradient = "from-purple-600 to-indigo-600";
      } else if (role === 'group_admin') {
          const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
          const clusterId = userSchool?.SchoolCluster;
          const cluster = data.clusters.find(c => c.ClusterID === clusterId);
          if (cluster) {
              scopeTeams = data.teams.filter(t => {
                  const teamSchool = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                  return teamSchool && teamSchool.SchoolCluster === clusterId;
              });
              title = `ภาพรวม ${cluster.ClusterName}`;
              icon = LayoutGrid;
              bgGradient = "from-blue-600 to-cyan-600";
          }
      } else if (role === 'school_admin' || role === 'user') {
          // Both School Admin and User see School Overview
          const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
          if (userSchool) {
               scopeTeams = data.teams.filter(t => 
                  t.schoolId === user.SchoolID || 
                  t.schoolId === userSchool.SchoolName
              );
              title = `ภาพรวม ${userSchool.SchoolName}`;
              icon = School;
              bgGradient = "from-emerald-600 to-teal-600";
          }
      } else {
          return null;
      }

      if (!title) return null;

      // 2. Calculate Stats based on Scope & ViewRound
      let gold = 0;
      let silver = 0;
      let bronze = 0;
      
      // For Top Schools Calculation
      const schoolScores: Record<string, number> = {};

      // Filter scopeTeams based on ViewRound for display consistency
      // UPDATED: Using strict isTeamQualifiedForArea for Area view to match counts
      const displayTeams = viewRound === 'area' 
        ? scopeTeams.filter(t => isTeamQualifiedForArea(t)) 
        : scopeTeams;

      // Calculate unique activities count
      const activitiesCount = new Set(displayTeams.map(t => t.activityId)).size;

      displayTeams.forEach(t => {
          let score = 0;
          if (viewRound === 'cluster') {
              score = t.score;
          } else {
              const info = getAreaInfo(t.stageInfo);
              score = info?.score || 0;
          }

          if (score >= 80) gold++;
          else if (score >= 70) silver++;
          else if (score >= 60) bronze++;

          // Aggregate School Scores for Top Schools (Area View mainly)
          if (viewRound === 'area' && score > 0) {
              const sName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
              schoolScores[sName] = (schoolScores[sName] || 0) + score;
          }
      });

      // Get Top 3 Schools
      const topSchools = Object.entries(schoolScores)
          .map(([name, score]) => ({ name, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

      return {
          title,
          icon,
          bgGradient,
          total: displayTeams.length,
          activities: activitiesCount,
          pending: displayTeams.filter(t => normalizeStatus(t.status) === TeamStatus.PENDING).length,
          approved: displayTeams.filter(t => normalizeStatus(t.status) === TeamStatus.APPROVED).length,
          // Qualified logic: Rank 1 AND Flag TRUE (Case insensitive check)
          qualified: scopeTeams.filter(t => isTeamQualifiedForArea(t)).length, 
          medals: { gold, silver, bronze },
          topSchools
      };
  }, [data.teams, data.schools, data.clusters, user, viewRound]);


  // RBAC & Logic Filtering for the List
  const filteredTeams = useMemo(() => {
    let teams = data.teams;
    const isGuest = !user || user.isGuest;

    // 1. Permission Filtering
    if (isGuest) {
        // Guests see everything
    } else if (user) {
        const role = user.level?.toLowerCase();
        if (role === 'admin' || role === 'area') {
            // See ALL
        } else if (role === 'group_admin') {
            const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
            if (userSchool) {
                const userClusterId = userSchool.SchoolCluster;
                teams = teams.filter(t => {
                    const teamSchool = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                    return teamSchool && teamSchool.SchoolCluster === userClusterId;
                });
            } else { teams = []; }
        } else if (role === 'school_admin' || role === 'user') {
            // For Standard User: Now sees ALL teams in their school
            const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
            if (userSchool) {
                teams = teams.filter(t => t.schoolId === user.SchoolID || t.schoolId === userSchool.SchoolName);
            } else { 
                // Fallback if User has no SchoolID yet -> Only see own created teams
                if (role === 'user') {
                     teams = teams.filter(t => t.createdBy === user.userid);
                } else {
                     teams = teams.filter(t => t.schoolId === user.SchoolID); 
                }
            }
        } else if (role === 'score') {
            const allowedActivities = user.assignedActivities || [];
            teams = teams.filter(t => allowedActivities.includes(t.activityId));
        }
    }

    // 2. Round Filtering
    // UPDATED: Using strict isTeamQualifiedForArea for Area view
    if (viewRound === 'area') {
        teams = teams.filter(team => isTeamQualifiedForArea(team));
    }

    // 3. Search & Filters & Quick Filters
    return teams.filter(team => {
      const activity = data.activities.find(a => a.id === team.activityId);
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

      // Quick Filter Logic
      let matchesQuickFilter = true;
      if (quickFilter === 'gold') {
          // Check score based on viewRound
          const score = viewRound === 'cluster' ? team.score : (getAreaInfo(team.stageInfo)?.score || 0);
          matchesQuickFilter = score >= 80;
      } else if (quickFilter === 'qualified') {
          // Strict logic for Qualified Filter: Rank 1 AND Flag TRUE
          matchesQuickFilter = isTeamQualifiedForArea(team);
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesCluster && matchesQuickFilter;
    });
  }, [data.teams, data.schools, data.activities, data.clusters, user, searchTerm, statusFilter, categoryFilter, clusterFilter, viewRound, quickFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    switch(status) {
      case TeamStatus.APPROVED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> อนุมัติ</span>;
      case TeamStatus.PENDING:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200"><Clock className="w-3 h-3 mr-1"/> รอตรวจ</span>;
      case TeamStatus.REJECTED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200"><XCircle className="w-3 h-3 mr-1"/> ปฏิเสธ</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getTeamImageUrl = (team: Team) => {
    if (team.logoUrl && team.logoUrl.startsWith('http')) return team.logoUrl;
    if (team.teamPhotoId) return `https://drive.google.com/thumbnail?id=${team.teamPhotoId}`;
    return "https://cdn-icons-png.flaticon.com/512/3135/3135768.png"; 
  };

  const isGroupAdmin = user?.level === 'group_admin';
  const isSchoolAdmin = user?.level === 'school_admin';

  // Helper to check ownership
  const isTeamOwner = (team: Team) => {
      if (!user) return false;
      return team.createdBy === user.userid;
  }

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Styles for Printing */}
      <style>{`
        @media print {
            body {
                visibility: hidden;
            }
            #printable-content, #printable-content * {
                visibility: visible;
            }
            #printable-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white;
                padding: 20px;
            }
            @page {
                size: A4 landscape;
                margin: 1cm;
            }
            /* Hide URL printing on browsers that support it */
            @media print {
                a[href]:after {
                    content: none !important;
                }
            }
        }
      `}</style>

      {/* Enhanced Dashboard Stats */}
      {dashboardStats && (
        <div className={`bg-gradient-to-r ${dashboardStats.bgGradient} rounded-2xl p-6 text-white shadow-lg mb-6 transition-all duration-300`}>
            {/* ... Existing Dashboard Content ... */}
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold flex items-center">
                    <dashboardStats.icon className="w-6 h-6 mr-2" />
                    {dashboardStats.title}
                </h3>
                <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm">
                    {viewRound === 'cluster' ? 'ผลงานระดับกลุ่มฯ' : 'ผลงานระดับเขตฯ'}
                </div>
            </div>

            {/* Area View: Focus on Medals & Top Schools */}
            {viewRound === 'area' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Medals */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                         <h4 className="text-white/80 text-sm mb-4 font-semibold flex items-center">
                             <Award className="w-4 h-4 mr-2"/> สรุปเหรียญรางวัลรวม
                         </h4>
                         <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30 flex flex-col items-center">
                                <Medal className="w-8 h-8 text-yellow-300 mb-1 drop-shadow-sm" />
                                <span className="text-2xl font-bold text-white">{dashboardStats.medals.gold}</span>
                                <span className="text-xs text-yellow-100">Gold</span>
                            </div>
                            <div className="p-3 bg-gray-400/20 rounded-lg border border-gray-300/30 flex flex-col items-center">
                                <Medal className="w-8 h-8 text-gray-300 mb-1 drop-shadow-sm" />
                                <span className="text-2xl font-bold text-white">{dashboardStats.medals.silver}</span>
                                <span className="text-xs text-gray-100">Silver</span>
                            </div>
                            <div className="p-3 bg-orange-500/20 rounded-lg border border-orange-400/30 flex flex-col items-center">
                                <Medal className="w-8 h-8 text-orange-300 mb-1 drop-shadow-sm" />
                                <span className="text-2xl font-bold text-white">{dashboardStats.medals.bronze}</span>
                                <span className="text-xs text-orange-100">Bronze</span>
                            </div>
                         </div>
                         <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                             <div className="flex flex-col">
                                <span className="text-xs text-white/70">รายการแข่งขัน</span>
                                <span className="text-lg font-bold">{dashboardStats.activities}</span>
                             </div>
                             <div className="flex flex-col text-right">
                                <span className="text-xs text-white/70">ทีมทั้งหมด</span>
                                <span className="text-lg font-bold">{dashboardStats.total}</span>
                             </div>
                         </div>
                    </div>

                    {/* Right: Top Schools */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                         <h4 className="text-white/80 text-sm mb-4 font-semibold flex items-center">
                             <Crown className="w-4 h-4 mr-2 text-yellow-300"/> Top 3 โรงเรียนยอดเยี่ยม (คะแนนรวม)
                         </h4>
                         <div className="space-y-3">
                             {dashboardStats.topSchools.map((school, idx) => (
                                 <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                     <div className="flex items-center">
                                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : 'bg-orange-400 text-orange-900'}`}>
                                             {idx + 1}
                                         </div>
                                         <span className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]">{school.name}</span>
                                     </div>
                                     <span className="font-bold text-sm bg-white/10 px-2 py-0.5 rounded">{school.score}</span>
                                 </div>
                             ))}
                             {dashboardStats.topSchools.length === 0 && (
                                 <p className="text-center text-white/50 text-xs py-4">ยังไม่มีข้อมูลคะแนน</p>
                             )}
                         </div>
                    </div>
                </div>
            ) : (
                /* Cluster View: Standard Layout + Qualified Card */
                <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <p className="text-white/80 text-sm mb-1">ทีมทั้งหมด</p>
                            <div className="flex items-center">
                                <Users className="w-5 h-5 mr-2 opacity-80" />
                                <span className="text-2xl font-bold">{dashboardStats.total}</span>
                            </div>
                        </div>
                        
                        {/* New Activities Card */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <p className="text-blue-100 text-sm mb-1">รายการแข่งขัน</p>
                            <div className="flex items-center text-blue-200">
                                <Trophy className="w-5 h-5 mr-2 opacity-80" />
                                <span className="text-2xl font-bold">{dashboardStats.activities}</span>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <p className="text-yellow-100 text-sm mb-1">รอตรวจสอบ</p>
                            <div className="flex items-center text-yellow-300">
                                <Clock className="w-5 h-5 mr-2 opacity-80" />
                                <span className="text-2xl font-bold">{dashboardStats.pending}</span>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <p className="text-green-100 text-sm mb-1">อนุมัติแล้ว</p>
                            <div className="flex items-center text-green-300">
                                <CheckCircle className="w-5 h-5 mr-2 opacity-80" />
                                <span className="text-2xl font-bold">{dashboardStats.approved}</span>
                            </div>
                        </div>

                        {/* Qualified Card (Cluster ONLY) */}
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/40 ring-2 ring-white/20 shadow-inner">
                            <p className="text-purple-100 text-sm mb-1 font-semibold">ตัวแทนไปแข่งระดับเขต</p>
                            <div className="flex items-center text-white">
                                <Award className="w-6 h-6 mr-2 text-yellow-300 animate-pulse" />
                                <span className="text-3xl font-bold">{dashboardStats.qualified}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
                         <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-500/20 border border-yellow-400/30">
                             <Medal className="w-5 h-5 text-yellow-300 mb-1" />
                             <span className="text-xl font-bold text-white">{dashboardStats.medals.gold}</span>
                         </div>
                         <div className="flex flex-col items-center p-2 rounded-lg bg-gray-400/20 border border-gray-400/30">
                             <Medal className="w-5 h-5 text-gray-300 mb-1" />
                             <span className="text-xl font-bold text-white">{dashboardStats.medals.silver}</span>
                         </div>
                         <div className="flex flex-col items-center p-2 rounded-lg bg-orange-500/20 border border-orange-400/30">
                             <Medal className="w-5 h-5 text-orange-300 mb-1" />
                             <span className="text-xl font-bold text-white">{dashboardStats.medals.bronze}</span>
                         </div>
                    </div>
                </>
            )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">รายชื่อทีม (Teams)</h2>
          <p className="text-gray-500">
             ข้อมูลทีม <span className="font-semibold text-blue-600">{filteredTeams.length}</span> ทีม 
          </p>
        </div>
        
        <div className="flex gap-2">
            {/* Round Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg shadow-inner">
                <button
                    onClick={() => { setViewRound('area'); setCurrentPage(1); setQuickFilter('all'); }}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${viewRound === 'area' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    ระดับเขตพื้นที่
                </button>
                <button
                    onClick={() => { setViewRound('cluster'); setCurrentPage(1); setQuickFilter('all'); }}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${viewRound === 'cluster' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    ระดับกลุ่มเครือข่าย
                </button>
            </div>

            {/* Print Button */}
             <button 
                onClick={handlePrintSummary} 
                className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                title="พิมพ์สรุปข้อมูล"
            >
                <Printer className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">พิมพ์สรุป</span>
            </button>
        </div>
      </div>

      {/* Filters & Quick Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        
        {/* Quick Filter Buttons */}
        <div className="flex gap-2 pb-2 border-b border-gray-50 overflow-x-auto no-scrollbar">
            <button
                onClick={() => setQuickFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center ${quickFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
                <LayoutGrid className="w-3 h-3 mr-1.5" /> ทั้งหมด
            </button>
            <button
                onClick={() => setQuickFilter('gold')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center ${quickFilter === 'gold' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'}`}
            >
                <Star className="w-3 h-3 mr-1.5 fill-current" /> เหรียญทอง (80+)
            </button>
            <button
                onClick={() => setQuickFilter('qualified')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center ${quickFilter === 'qualified' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'}`}
            >
                <Zap className="w-3 h-3 mr-1.5 fill-current" /> ตัวแทน/Qualified
            </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                    placeholder="ค้นหาชื่อทีม, โรงเรียน, กลุ่มเครือข่าย..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {(!isGroupAdmin && !isSchoolAdmin) && (
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
                )}

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

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {paginatedTeams.map((team) => {
            const activity = data.activities.find(a => a.id === team.activityId);
            const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
            const cluster = school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster) : null;
            const areaInfo = getAreaInfo(team.stageInfo);
            const imageUrl = getTeamImageUrl(team);
            const showScore = viewRound === 'cluster' ? team.score : areaInfo?.score;
            const showRank = viewRound === 'cluster' ? team.rank : (areaInfo?.rank || areaInfo?.medal);
            const owner = isTeamOwner(team);

            return (
                <div 
                    key={team.teamId} 
                    onClick={() => setSelectedTeam(team)}
                    className={`bg-white p-4 rounded-xl shadow-sm border ${owner ? 'border-l-4 border-l-blue-500 border-gray-100' : 'border-gray-100'} flex items-start space-x-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]`}
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
                            <div className="flex items-center gap-2">
                                {owner && (
                                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                        My Team
                                    </span>
                                )}
                                <span className="text-xs text-gray-400">
                                    <ChevronRight className="w-3 h-3" />
                                </span>
                            </div>
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

      {/* Desktop Table */}
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
                  const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                  const cluster = school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster) : null;
                  const teamFiles = data.files.filter(f => f.TeamID === team.teamId);
                  const areaInfo = getAreaInfo(team.stageInfo);
                  const imageUrl = getTeamImageUrl(team);
                  
                  const showScore = viewRound === 'cluster' ? team.score : areaInfo?.score;
                  const showRank = viewRound === 'cluster' ? team.rank : (areaInfo?.rank || areaInfo?.medal);
                  const owner = isTeamOwner(team);

                  return (
                    <tr 
                        key={team.teamId} 
                        className={`hover:bg-gray-50 transition-colors cursor-pointer group ${owner ? 'bg-blue-50/20' : ''}`}
                        onClick={() => setSelectedTeam(team)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                              <img className="h-10 w-10 rounded-full object-cover border border-gray-100 group-hover:border-blue-300 transition-colors" src={imageUrl} alt="" />
                              {owner && (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
                                  </span>
                              )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex items-center">
                                {viewRound === 'area' && areaInfo?.name ? areaInfo.name : team.teamName}
                                {owner && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">YOU</span>}
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
                            {owner ? (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); /* Add edit logic */ }} 
                                        className="text-blue-500 hover:text-blue-600 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                        title="แก้ไข"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); /* Add delete logic */ }}
                                        className="text-red-500 hover:text-red-600 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition-colors"
                                        title="ลบ"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <button className="text-gray-400 hover:text-blue-500 transition-colors">
                                    <Eye className="w-4 h-4" />
                                </button>
                            )}
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

      {/* Pagination Controls */}
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

      {/* Hidden Print Section (Visible only when printing) */}
      <div id="printable-content" className="hidden">
        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">สรุปข้อมูลทีมผู้เข้าแข่งขัน</h1>
            <p className="text-gray-500">
                {viewRound === 'area' ? 'ระดับเขตพื้นที่การศึกษา' : 'ระดับกลุ่มเครือข่าย'} | ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}
            </p>
        </div>
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b-2 border-gray-300">
                    <th className="py-2 px-2 text-sm font-bold text-gray-700 w-12">#</th>
                    <th className="py-2 px-2 text-sm font-bold text-gray-700">ทีม</th>
                    <th className="py-2 px-2 text-sm font-bold text-gray-700">โรงเรียน / กลุ่มฯ</th>
                    <th className="py-2 px-2 text-sm font-bold text-gray-700">รายการแข่งขัน</th>
                    <th className="py-2 px-2 text-sm font-bold text-gray-700 text-center">สถานะ</th>
                    <th className="py-2 px-2 text-sm font-bold text-gray-700 text-right">คะแนน</th>
                </tr>
            </thead>
            <tbody>
                {filteredTeams.map((team, idx) => {
                    const activity = data.activities.find(a => a.id === team.activityId);
                    const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                    const cluster = school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster) : null;
                    const areaInfo = getAreaInfo(team.stageInfo);
                    
                    const showScore = viewRound === 'cluster' ? team.score : areaInfo?.score;
                    const showRank = viewRound === 'cluster' ? team.rank : (areaInfo?.rank || areaInfo?.medal);

                    return (
                        <tr key={team.teamId} className="border-b border-gray-200">
                            <td className="py-2 px-2 text-sm text-gray-600">{idx + 1}</td>
                            <td className="py-2 px-2 text-sm text-gray-900">
                                <div className="font-bold">{viewRound === 'area' && areaInfo?.name ? areaInfo.name : team.teamName}</div>
                                <div className="text-xs text-gray-500">{team.teamId}</div>
                            </td>
                            <td className="py-2 px-2 text-sm text-gray-600">
                                <div>{school?.SchoolName}</div>
                                <div className="text-xs text-gray-400">{cluster?.ClusterName}</div>
                            </td>
                            <td className="py-2 px-2 text-sm text-gray-600">
                                <div>{activity?.name}</div>
                                <div className="text-xs text-gray-400">{team.level}</div>
                            </td>
                            <td className="py-2 px-2 text-sm text-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                    normalizeStatus(team.status) === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                    normalizeStatus(team.status) === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    {normalizeStatus(team.status)}
                                </span>
                            </td>
                            <td className="py-2 px-2 text-sm text-right font-medium text-gray-900">
                                <div>{showScore > 0 ? showScore : '-'}</div>
                                {showRank && <div className="text-xs text-gray-500">#{showRank}</div>}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        <div className="mt-4 text-xs text-gray-400 text-right">
            พิมพ์จากระบบ CompManager
        </div>
      </div>

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

