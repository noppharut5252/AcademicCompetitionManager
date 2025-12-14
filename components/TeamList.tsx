
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Team, TeamStatus, User, AreaStageInfo } from '../types';
import { Search, Filter, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Eye, Trophy, Medal, Hash, LayoutGrid, Users, Award, School, Printer, FileText, Star, Crown, Zap, Edit, Trash2, Plus, Square, CheckSquare, Loader2, AlertTriangle, Info, X, Calendar } from 'lucide-react';
import TeamDetailModal from './TeamDetailModal';
import { updateTeamStatus, deleteTeam } from '../services/api';
import { formatDeadline } from '../services/utils';

interface TeamListProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

// --- Sub-Components for Beautiful UI ---

const Toast = ({ message, type, isVisible, onClose }: { message: string, type: 'success' | 'error' | 'info', isVisible: boolean, onClose: () => void }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const styles = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white'
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />
    };

    return (
        <div className={`fixed top-6 right-6 z-[100] flex items-center p-4 rounded-xl shadow-xl transition-all duration-500 transform translate-y-0 ${styles[type]} animate-in slide-in-from-top-5 fade-in`}>
            <div className="mr-3">{icons[type]}</div>
            <div className="font-medium text-sm">{message}</div>
            <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, title, description, confirmLabel, confirmColor, onConfirm, onCancel, isLoading, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 transition-all">
                <div className="p-6 text-center">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${confirmColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg leading-6 font-bold text-gray-900">{title}</h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                    {children}
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        disabled={isLoading}
                        className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${
                            confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 
                            confirmColor === 'green' ? 'bg-green-600 hover:bg-green-700' :
                            confirmColor === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' :
                            'bg-blue-600 hover:bg-blue-700'
                        } disabled:opacity-50`}
                        onClick={onConfirm}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmLabel}
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const ITEMS_PER_PAGE = 20;

const TeamList: React.FC<TeamListProps> = ({ data, user, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [clusterFilter, setClusterFilter] = useState<string>('All');
  const [quickFilter, setQuickFilter] = useState<'all' | 'gold' | 'qualified'>('all'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [viewRound, setViewRound] = useState<'cluster' | 'area'>('area');
  
  // Bulk Action State
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Toast & Modal State
  const [toast, setToast] = useState({ message: '', type: 'info' as 'success' | 'error' | 'info', isVisible: false });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, action: string, statusValue: string, title: string, desc: string, color: string, teamId?: string }>({
      isOpen: false, action: '', statusValue: '', title: '', desc: '', color: 'blue'
  });
  
  // New: Deadline for Pending Status
  const [editDeadline, setEditDeadline] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

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

  const isTeamQualifiedForArea = (team: Team) => {
      const r = String(team.rank || '').trim();
      const f = String(team.flag || '').trim().toUpperCase();
      return r === '1' && f === 'TRUE';
  };

  // Permissions Check
  const role = user?.level?.toLowerCase();
  const isSuperUser = role === 'admin' || role === 'area';
  const isGroupAdmin = role === 'group_admin';
  const isSchoolAdmin = role === 'school_admin';

  // Helper: Check if team is currently editable by user
  const isWithinDeadline = (team: Team) => {
      if (!team.editDeadline) return true; // No deadline = open
      const now = new Date();
      const deadline = new Date(team.editDeadline);
      return now < deadline;
  };

  const canEditTeam = (team: Team) => {
      if (!user || user.isGuest) return false;
      if (isSuperUser) return true;

      const currentStatus = normalizeStatus(team.status);
      
      // User/SchoolAdmin/GroupAdmin can only edit if Pending AND (No deadline or Within deadline)
      if (currentStatus !== TeamStatus.PENDING) return false;
      if (!isWithinDeadline(team)) return false;

      if (isGroupAdmin) {
          const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
          const teamSchool = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          return userSchool && teamSchool && userSchool.SchoolCluster === teamSchool.SchoolCluster;
      }

      if (isSchoolAdmin) {
          const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
          return team.schoolId === user.SchoolID || (userSchool && team.schoolId === userSchool.SchoolName);
      }

      if (role === 'user') {
          return team.createdBy === user.userid;
      }

      return false;
  };

  // --- Dynamic Dashboard Stats Logic ---
  const dashboardStats = useMemo(() => {
      if (!user) return null;

      let scopeTeams: Team[] = [];
      let title = "";
      let icon = Users;
      let bgGradient = "from-blue-600 to-indigo-700";

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

      let gold = 0;
      let silver = 0;
      let bronze = 0;
      const schoolScores: Record<string, number> = {};
      const displayTeams = viewRound === 'area' 
        ? scopeTeams.filter(t => isTeamQualifiedForArea(t)) 
        : scopeTeams;
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

          if (viewRound === 'area' && score > 0) {
              const sName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
              schoolScores[sName] = (schoolScores[sName] || 0) + score;
          }
      });

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
          qualified: scopeTeams.filter(t => isTeamQualifiedForArea(t)).length, 
          medals: { gold, silver, bronze },
          topSchools
      };
  }, [data.teams, data.schools, data.clusters, user, viewRound, role]);

  const filteredTeams = useMemo(() => {
    let teams = data.teams;
    const isGuest = !user || user.isGuest;

    if (isGuest) {
    } else if (user) {
        if (role === 'admin' || role === 'area') {
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
            const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
            if (user.SchoolID) {
                teams = teams.filter(t => 
                    t.schoolId === user.SchoolID || 
                    (userSchool && t.schoolId === userSchool.SchoolName)
                );
            } else { 
                teams = teams.filter(t => t.createdBy === user.userid);
            }
        } else if (role === 'score') {
            const allowedActivities = user.assignedActivities || [];
            teams = teams.filter(t => allowedActivities.includes(t.activityId));
        }
    }

    if (viewRound === 'area') {
        teams = teams.filter(team => isTeamQualifiedForArea(team));
    }

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

      let matchesQuickFilter = true;
      if (quickFilter === 'gold') {
          const score = viewRound === 'cluster' ? team.score : (getAreaInfo(team.stageInfo)?.score || 0);
          matchesQuickFilter = score >= 80;
      } else if (quickFilter === 'qualified') {
          matchesQuickFilter = isTeamQualifiedForArea(team);
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesCluster && matchesQuickFilter;
    });
  }, [data.teams, data.schools, data.activities, data.clusters, user, searchTerm, statusFilter, categoryFilter, clusterFilter, viewRound, quickFilter, role]);

  const totalPages = Math.ceil(filteredTeams.length / ITEMS_PER_PAGE);
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (team: Team) => {
    const status = normalizeStatus(team.status);
    const hasDeadline = team.editDeadline && new Date(team.editDeadline) > new Date();
    
    switch(status) {
      case TeamStatus.APPROVED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle className="w-3 h-3 mr-1"/> อนุมัติ</span>;
      case TeamStatus.PENDING:
        return (
            <div className="flex flex-col items-start gap-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
                    <Clock className="w-3 h-3 mr-1"/> รอตรวจ
                </span>
                {hasDeadline && (
                    <span className="text-[10px] text-orange-600 flex items-center bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                        <Clock className="w-3 h-3 mr-1" />
                        ถึง {formatDeadline(team.editDeadline!)}
                    </span>
                )}
            </div>
        );
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

  // --- Bulk Actions Logic ---

  const handleSelectAll = () => {
      if (selectedTeamIds.size === paginatedTeams.length) {
          setSelectedTeamIds(new Set());
      } else {
          setSelectedTeamIds(new Set(paginatedTeams.map(t => t.teamId)));
      }
  };

  const handleSelectTeam = (id: string) => {
      const newSelected = new Set(selectedTeamIds);
      if (newSelected.has(id)) {
          newSelected.delete(id);
      } else {
          newSelected.add(id);
      }
      setSelectedTeamIds(newSelected);
  };

  // Open Modal for Confirmation
  const promptAction = (actionType: 'updateStatus' | 'delete', status: string = '', teamId: string | null = null) => {
      
      let targetIds = teamId ? [teamId] : Array.from(selectedTeamIds);
      if (targetIds.length === 0) return;

      let title = '';
      let desc = '';
      let color = 'blue';
      
      if (actionType === 'delete') {
          title = 'ยืนยันการลบทีม (Delete)';
          desc = `คุณต้องการลบข้อมูลจำนวน ${targetIds.length} ทีม ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้`;
          color = 'red';
      } else if (status === '1') {
          title = 'ยืนยันการอนุมัติ (Approve)';
          desc = `คุณต้องการอนุมัติทีมจำนวน ${targetIds.length} ทีม ใช่หรือไม่?`;
          color = 'green';
      } else if (status === '2') {
          title = 'ยืนยันการปฏิเสธ (Reject)';
          desc = `คุณต้องการปฏิเสธทีมจำนวน ${targetIds.length} ทีม ใช่หรือไม่?`;
          color = 'red';
      } else if (status === '0') {
          title = 'ตั้งสถานะรอตรวจสอบ (Set Pending)';
          desc = `คุณต้องการเปลี่ยนสถานะเป็น "รอตรวจสอบ" จำนวน ${targetIds.length} ทีม ใช่หรือไม่?`;
          color = 'yellow';
      }

      setEditDeadline(''); // Reset deadline
      setConfirmModal({
          isOpen: true,
          action: actionType,
          statusValue: status,
          title,
          desc,
          color,
          teamId: teamId || undefined
      });
  };

  // Actual Execute Function
  const executeAction = async () => {
      setIsUpdatingStatus(true);
      try {
          const action = confirmModal.action;
          const status = confirmModal.statusValue;
          const targetIds = confirmModal.teamId ? [confirmModal.teamId] : Array.from(selectedTeamIds);

          if (action === 'delete') {
              const updates = targetIds.map(id => deleteTeam(id));
              await Promise.all(updates);
          } else {
              // Passing deadline only if status is pending
              const updates = targetIds.map(id => updateTeamStatus(id, status, '', status === '0' ? editDeadline : ''));
              await Promise.all(updates);
          }
          
          setSelectedTeamIds(new Set());
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          showToast('ดำเนินการสำเร็จ (กำลังรีเฟรช...)', 'success');
          
          // Trigger data update
          onDataUpdate();

      } catch (err) {
          showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
      } finally {
          setIsUpdatingStatus(false);
      }
  };

  const handlePrintSummary = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const date = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const scopeTitle = dashboardStats?.title || 'สรุปข้อมูลการแข่งขัน';
      const roundTitle = viewRound === 'cluster' ? 'ระดับกลุ่มเครือข่าย' : 'ระดับเขตพื้นที่';

      const teamsByActivity: Record<string, Team[]> = {};
      filteredTeams.forEach(t => {
          const actName = data.activities.find(a => a.id === t.activityId)?.name || t.activityId;
          if (!teamsByActivity[actName]) teamsByActivity[actName] = [];
          teamsByActivity[actName].push(t);
      });

      const htmlContent = `
        <html>
        <head>
            <title>Summary Report</title>
            <style>
                body { font-family: 'Sarabun', 'Kanit', sans-serif; padding: 20px; }
                h1, h2 { text-align: center; margin-bottom: 10px; }
                .meta { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .activity-header { background-color: #e6f3ff; font-weight: bold; font-size: 14px; }
                .status-approved { color: green; }
                .status-pending { color: orange; }
                @media print {
                    .no-print { display: none; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600&family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
        </head>
        <body>
            <h1>รายงานสรุปข้อมูลการแข่งขัน</h1>
            <h2>${scopeTitle} (${roundTitle})</h2>
            <div class="meta">ข้อมูล ณ วันที่ ${date} | จำนวนทีมทั้งหมด: ${filteredTeams.length} ทีม</div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">#</th>
                        <th style="width: 30%">ชื่อทีม</th>
                        <th style="width: 25%">โรงเรียน</th>
                        <th style="width: 15%">สถานะ</th>
                        <th style="width: 15%">ผลการแข่งขัน</th>
                        <th style="width: 10%">หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(teamsByActivity).map(([actName, teams]) => `
                        <tr class="activity-header"><td colspan="6">${actName} (${teams.length} ทีม)</td></tr>
                        ${teams.map((t, idx) => {
                             const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                             const rawScore = viewRound === 'cluster' ? t.score : getAreaInfo(t.stageInfo)?.score;
                             const displayScore = (typeof rawScore === 'number' && rawScore > 0) ? rawScore : '-';
                             return `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${t.teamName}</td>
                                    <td>${school?.SchoolName || t.schoolId}</td>
                                    <td class="${t.status === 'Approved' ? 'status-approved' : 'status-pending'}">${normalizeStatus(t.status)}</td>
                                    <td>${displayScore}</td>
                                    <td>${t.flag === 'TRUE' ? 'ตัวแทนเขต' : ''}</td>
                                </tr>
                             `;
                        }).join('')}
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 30px; text-align: right; font-size: 12px;">
                ผู้พิมพ์รายงาน: ${user?.name || user?.username || 'Guest'}
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  const isAllSelected = paginatedTeams.length > 0 && selectedTeamIds.size === paginatedTeams.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Notifications */}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.desc}
        confirmLabel="ยืนยัน"
        confirmColor={confirmModal.color}
        onConfirm={executeAction}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isLoading={isUpdatingStatus}
      >
          {confirmModal.statusValue === '0' && isSuperUser && (
              <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-left border border-yellow-100">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-500" />
                      กำหนดเวลาสิ้นสุดการแก้ไข (Deadline)
                  </label>
                  <input 
                    type="datetime-local" 
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">* หากไม่ระบุ ผู้ใช้จะสามารถแก้ไขได้ตลอดเวลาจนกว่าจะเปลี่ยนสถานะ</p>
              </div>
          )}
      </ConfirmationModal>

      {/* Enhanced Dashboard Stats */}
      {dashboardStats && (
        <div className={`bg-gradient-to-r ${dashboardStats.bgGradient} rounded-2xl p-6 text-white shadow-lg mb-6 transition-all duration-300`}>
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold flex items-center">
                    <dashboardStats.icon className="w-6 h-6 mr-2" />
                    {dashboardStats.title}
                </h3>
                <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm">
                    {viewRound === 'cluster' ? 'ผลงานระดับกลุ่มฯ' : 'ผลงานระดับเขตฯ'}
                </div>
            </div>

            {viewRound === 'area' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </div>

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
                <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <p className="text-white/80 text-sm mb-1">ทีมทั้งหมด</p>
                            <div className="flex items-center">
                                <Users className="w-5 h-5 mr-2 opacity-80" />
                                <span className="text-2xl font-bold">{dashboardStats.total}</span>
                            </div>
                        </div>
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
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/40 ring-2 ring-white/20 shadow-inner">
                            <p className="text-purple-100 text-sm mb-1 font-semibold">ตัวแทนไปแข่งระดับเขต</p>
                            <div className="flex items-center text-white">
                                <Award className="w-6 h-6 mr-2 text-yellow-300 animate-pulse" />
                                <span className="text-3xl font-bold">{dashboardStats.qualified}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
      )}

      {/* Enhanced Bulk Action Bar (Sticky) */}
      {isSuperUser && selectedTeamIds.size > 0 && (
          <div className="sticky top-14 z-20 bg-white border border-blue-200 shadow-xl rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm flex items-center">
                      <CheckSquare className="w-4 h-4 mr-1.5" />
                      {selectedTeamIds.size}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">รายการที่เลือก</span>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => promptAction('updateStatus', '1')}
                    disabled={isUpdatingStatus}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all hover:shadow-md disabled:opacity-50"
                  >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      อนุมัติ (Approve)
                  </button>
                  <button 
                    onClick={() => promptAction('updateStatus', '0')}
                    disabled={isUpdatingStatus}
                    className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-all hover:shadow-md disabled:opacity-50"
                  >
                      <Clock className="w-4 h-4 mr-1.5" />
                      รอตรวจ (Pending)
                  </button>
                  <button 
                    onClick={() => promptAction('updateStatus', '2')}
                    disabled={isUpdatingStatus}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all hover:shadow-md disabled:opacity-50"
                  >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      ปฏิเสธ (Reject)
                  </button>
              </div>
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
            {/* Add Team Button */}
            {user && !user.isGuest && (['school_admin', 'user', 'admin'].includes(role || '')) && (
                <button 
                    onClick={() => alert("ระบบลงทะเบียนทีมยังไม่เปิดใช้งานในส่วนนี้")} 
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">ลงทะเบียนทีม</span>
                </button>
            )}

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
            const canEdit = canEditTeam(team);

            return (
                <div 
                    key={team.teamId} 
                    onClick={() => setSelectedTeam(team)}
                    className={`bg-white p-4 rounded-xl shadow-sm border ${canEdit ? 'border-l-4 border-l-blue-500 border-gray-100' : 'border-gray-100'} flex items-start space-x-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]`}
                >
                    <div className="flex-shrink-0">
                        <img className="h-16 w-16 rounded-lg object-cover border border-gray-100" src={imageUrl} alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-gray-900 truncate">
                                {viewRound === 'area' && areaInfo?.name ? areaInfo.name : team.teamName}
                            </h3>
                            {getStatusBadge(team)}
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
                                {canEdit && (
                                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                                        Edit
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
                {isSuperUser && (
                    <th className="px-3 py-3 w-10 text-center">
                        <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
                            {isAllSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                    </th>
                )}
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
                  const canEdit = canEditTeam(team);
                  const isSelected = selectedTeamIds.has(team.teamId);

                  return (
                    <tr 
                        key={team.teamId} 
                        className={`hover:bg-gray-50 transition-colors cursor-pointer group ${canEdit ? 'bg-blue-50/20' : ''}`}
                        onClick={() => setSelectedTeam(team)}
                    >
                      {isSuperUser && (
                          <td className="px-3 py-4 text-center" onClick={(e) => { e.stopPropagation(); handleSelectTeam(team.teamId); }}>
                              <div className={`cursor-pointer ${isSelected ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}>
                                  {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </div>
                          </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                              <img className="h-10 w-10 rounded-full object-cover border border-gray-100 group-hover:border-blue-300 transition-colors" src={imageUrl} alt="" />
                              {canEdit && (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
                                  </span>
                              )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex items-center">
                                {viewRound === 'area' && areaInfo?.name ? areaInfo.name : team.teamName}
                                {canEdit && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">EDIT</span>}
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
                        {getStatusBadge(team)}
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
                            {canEdit ? (
                                <>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedTeam(team); }} 
                                        className="text-blue-500 hover:text-blue-600 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                        title="แก้ไข"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); promptAction('delete', '', team.teamId); }}
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
                    <td colSpan={isSuperUser ? 7 : 6} className="px-6 py-10 text-center text-gray-500">
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
        {/* ... (Existing Print Logic) ... */}
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

      {/* Modal - Pass canEdit status and update handler */}
      {selectedTeam && (
          <TeamDetailModal 
            team={selectedTeam} 
            data={data} 
            onClose={() => setSelectedTeam(null)} 
            canEdit={canEditTeam(selectedTeam)}
            onSaveSuccess={onDataUpdate}
          />
      )}
    </div>
  );
};

export default TeamList;

