
// ... existing imports
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppData, User, Activity } from '../types';
import { getAllUsers, saveUserAdmin, deleteUser } from '../services/api';
import { Search, Plus, Edit2, Trash2, User as UserIcon, Shield, School, CheckCircle, X, Save, Lock, Loader2, RefreshCw, AlertTriangle, Phone, Mail, MoreHorizontal, Eye, EyeOff, Copy, Download, Upload, CheckSquare, Square, FileText, LayoutGrid, MessageCircle, Link as LinkIcon, KeyRound, Filter, Smartphone, Monitor } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import ConfirmationModal from './ConfirmationModal';

interface UserManagementProps {
  data: AppData;
  currentUser?: User | null;
}

const getRoleLevel = (role: string = '') => {
    switch (role.toLowerCase()) {
        case 'admin': return 5;
        case 'area': return 4;
        case 'group_admin': return 3;
        case 'school_admin': return 2;
        case 'score': return 1;
        case 'user': return 1;
        default: return 0;
    }
};

const UserManagement: React.FC<UserManagementProps> = ({ data, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [clusterFilter, setClusterFilter] = useState('All'); 
  const [lineFilter, setLineFilter] = useState<'All' | 'Connected' | 'NotConnected'>('All');
  const [activityFilter, setActivityFilter] = useState('All'); // New: Activity Filter
  
  // Selection State (Bulk Actions)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false); // New: Bulk Assign Modal
  const [bulkActivities, setBulkActivities] = useState<string[]>([]); // New: Selected Activities for Bulk
  
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, ids: string[] }>({ isOpen: false, ids: [] });
  const [confirmReset, setConfirmReset] = useState<{ isOpen: boolean, user: User | null }>({ isOpen: false, user: null }); // New: Reset Confirm
  
  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  
  // Credential Modal (Post-Create/Reset)
  const [createdCredential, setCreatedCredential] = useState<{username: string, password: string} | null>(null);

  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Permissions & Context
  const userRole = currentUser?.level?.toLowerCase() || 'user';
  const myLevel = getRoleLevel(userRole);
  const isAdminOrArea = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const isSchoolAdmin = userRole === 'school_admin';

  const userClusterId = useMemo(() => {
      if (!currentUser?.SchoolID) return null;
      const school = data.schools.find(s => s.SchoolID === currentUser.SchoolID);
      return school?.SchoolCluster;
  }, [currentUser, data.schools]);

  useEffect(() => {
      fetchUsers();
  }, []);

  const fetchUsers = async () => {
      setLoading(true);
      const res = await getAllUsers();
      setUsers(res);
      setLoading(false);
      setSelectedUserIds(new Set()); // Reset selection
  };

  // --- Filtering & Scope ---
  const scopedUsers = useMemo(() => {
      return users.filter(u => {
          if (isAdminOrArea) return true;
          if (isGroupAdmin) {
              const uSchool = data.schools.find(s => s.SchoolID === u.SchoolID);
              return uSchool?.SchoolCluster === userClusterId;
          }
          if (isSchoolAdmin) {
              return u.SchoolID === currentUser?.SchoolID;
          }
          return false;
      });
  }, [users, isAdminOrArea, isGroupAdmin, isSchoolAdmin, userClusterId, currentUser, data.schools]);

  const filteredUsers = useMemo(() => {
      return scopedUsers.filter(u => {
          const matchesSearch = 
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.SchoolID || '').toLowerCase().includes(searchTerm.toLowerCase());
          
          const matchesRole = roleFilter === 'All' || u.level === roleFilter;
          
          // Cluster Filter
          let matchesCluster = true;
          if (clusterFilter !== 'All') {
              const uSchool = data.schools.find(s => s.SchoolID === u.SchoolID);
              matchesCluster = uSchool?.SchoolCluster === clusterFilter;
          }

          // Line Connection Filter
          let matchesLine = true;
          if (lineFilter !== 'All') {
              const hasLine = !!u.userline_id;
              if (lineFilter === 'Connected') matchesLine = hasLine;
              if (lineFilter === 'NotConnected') matchesLine = !hasLine;
          }

          // Activity Filter (New)
          let matchesActivity = true;
          if (activityFilter !== 'All') {
              matchesActivity = u.assignedActivities?.includes(activityFilter) || false;
          }

          return matchesSearch && matchesRole && matchesCluster && matchesLine && matchesActivity;
      });
  }, [scopedUsers, searchTerm, roleFilter, clusterFilter, lineFilter, activityFilter, data.schools]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Options ---
  const filterRoleOptions = [
      { value: 'Admin', label: 'Admin' },
      { value: 'Area', label: 'Area Admin' },
      { value: 'Group_Admin', label: 'Group Admin' },
      { value: 'School_Admin', label: 'School Admin' },
      { value: 'score', label: 'Score Entry' },
      { value: 'User', label: 'User' }
  ];

  const assignableRoles = useMemo(() => {
      const allRoles = [
          { value: 'Admin', label: 'Admin (ผู้ดูแลระบบสูงสุด)', color: 'bg-purple-100 text-purple-800' },
          { value: 'Area', label: 'Area Admin (เขตพื้นที่)', color: 'bg-indigo-100 text-indigo-800' },
          { value: 'Group_Admin', label: 'Group Admin (ประธานกลุ่มฯ)', color: 'bg-blue-100 text-blue-800' },
          { value: 'School_Admin', label: 'School Admin (แอดมินโรงเรียน)', color: 'bg-cyan-100 text-cyan-800' },
          { value: 'score', label: 'Score Entry (กรรมการบันทึกคะแนน)', color: 'bg-orange-100 text-orange-800' },
          { value: 'User', label: 'User (ผู้ใช้งานทั่วไป)', color: 'bg-gray-100 text-gray-800' }
      ];
      return allRoles.filter(roleOption => getRoleLevel(roleOption.value) < myLevel);
  }, [myLevel]);

  const schoolOptions = useMemo(() => {
      let list = data.schools;
      if (isGroupAdmin) list = list.filter(s => s.SchoolCluster === userClusterId);
      else if (isSchoolAdmin) list = list.filter(s => s.SchoolID === currentUser?.SchoolID);
      return list.map(s => ({ label: s.SchoolName, value: s.SchoolID }));
  }, [data.schools, isGroupAdmin, isSchoolAdmin, userClusterId, currentUser]);

  const activityOptions = useMemo(() => {
      return data.activities.map(a => ({ label: a.name, value: a.id }));
  }, [data.activities]);

  // --- Handlers: Select ---
  const handleSelectAll = () => {
      if (selectedUserIds.size === paginatedUsers.length) {
          setSelectedUserIds(new Set());
      } else {
          setSelectedUserIds(new Set(paginatedUsers.map(u => u.userid)));
      }
  };

  const handleSelectUser = (id: string) => {
      const newSet = new Set(selectedUserIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedUserIds(newSet);
  };

  // --- Handlers: CRUD ---
  const handleAdd = () => {
      setEditingUser({
          userid: '',
          username: '',
          password: '',
          name: '',
          surname: '',
          level: 'user',
          SchoolID: isSchoolAdmin ? currentUser?.SchoolID : '',
          email: '',
          tel: '',
          assignedActivities: []
      });
      setShowPassword(false);
      setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
      if (user.userid === currentUser?.userid) {
          alert("กรุณาแก้ไขข้อมูลส่วนตัวของคุณที่เมนู 'ข้อมูลส่วนตัว (Profile)'");
          return;
      }
      if (getRoleLevel(user.level) >= myLevel) {
          alert("คุณไม่มีสิทธิ์แก้ไขผู้ใช้งานที่มีระดับเท่ากันหรือสูงกว่า");
          return;
      }
      setEditingUser({ ...user, password: '' });
      setShowPassword(false);
      setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser.username || !editingUser.name) {
          alert('กรุณากรอกข้อมูลให้ครบถ้วน');
          return;
      }
      if (editingUser.level && getRoleLevel(editingUser.level) >= myLevel) {
          alert("คุณไม่สามารถกำหนดสิทธิ์ที่สูงกว่าหรือเท่ากับตนเองได้");
          return;
      }

      setIsSaving(true);
      try {
          const res = await saveUserAdmin(editingUser);
          if (res.status === 'success') {
              setIsModalOpen(false);
              
              if (editingUser.password) {
                  setCreatedCredential({
                      username: editingUser.username,
                      password: editingUser.password
                  });
              }
              fetchUsers();
          } else {
              alert('บันทึกไม่สำเร็จ: ' + res.message);
          }
      } catch (err) {
          alert('เกิดข้อผิดพลาด');
      } finally {
          setIsSaving(false);
      }
  };

  // --- Quick Password Reset ---
  const handleQuickReset = (user: User) => {
      if (getRoleLevel(user.level) >= myLevel) {
          alert("คุณไม่มีสิทธิ์รีเซ็ตรหัสผ่านผู้ใช้งานที่มีระดับเท่ากันหรือสูงกว่า");
          return;
      }
      setConfirmReset({ isOpen: true, user });
  };

  const executeQuickReset = async () => {
      const user = confirmReset.user;
      if (!user) return;

      setIsSaving(true);
      const newPassword = Math.random().toString(36).slice(-8); // Generate 8 char random password
      
      try {
          const res = await saveUserAdmin({ ...user, password: newPassword });
          if (res.status === 'success') {
              setConfirmReset({ isOpen: false, user: null });
              setCreatedCredential({
                  username: user.username,
                  password: newPassword
              });
              fetchUsers();
          } else {
              alert('รีเซ็ตไม่สำเร็จ: ' + res.message);
          }
      } catch (err) {
          alert('เกิดข้อผิดพลาด');
      } finally {
          setIsSaving(false);
      }
  };

  // --- Bulk Assign Activities ---
  const handleBulkAssignOpen = () => {
      setBulkActivities([]);
      setIsBulkAssignOpen(true);
  };

  const handleBulkAssignToggle = (actId: string) => {
      if (bulkActivities.includes(actId)) {
          setBulkActivities(bulkActivities.filter(id => id !== actId));
      } else {
          setBulkActivities([...bulkActivities, actId]);
      }
  };

  const executeBulkAssign = async () => {
      if (bulkActivities.length === 0) {
          alert('กรุณาเลือกกิจกรรมอย่างน้อย 1 รายการ');
          return;
      }
      
      setIsSaving(true);
      try {
          // Iterate selected users and update assignedActivities
          const updatePromises = Array.from(selectedUserIds).map(userId => {
              const user = users.find(u => u.userid === userId);
              if (!user) return Promise.resolve();
              
              const currentActivities = new Set(user.assignedActivities || []);
              bulkActivities.forEach(id => currentActivities.add(id));
              
              const updatedUser = { 
                  ...user, 
                  assignedActivities: Array.from(currentActivities),
                  password: '' // Ensure we don't accidentally reset password
              };
              
              return saveUserAdmin(updatedUser);
          });

          await Promise.all(updatePromises);
          
          setIsBulkAssignOpen(false);
          setBulkActivities([]);
          setSelectedUserIds(new Set()); // Clear selection
          alert(`กำหนดกิจกรรมให้ผู้ใช้ ${selectedUserIds.size} คน เรียบร้อยแล้ว`);
          fetchUsers();

      } catch (err) {
          alert('เกิดข้อผิดพลาดในการบันทึกแบบกลุ่ม');
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteConfirm = () => {
      const ids = Array.from(selectedUserIds);
      if (ids.length === 0) return;
      
      const forbidden = users.filter(u => ids.includes(u.userid) && getRoleLevel(u.level) >= myLevel);
      if (forbidden.length > 0) {
          alert("มีผู้ใช้งานบางคนที่คุณไม่มีสิทธิ์ลบ กรุณาตรวจสอบ");
          return;
      }

      setConfirmDelete({ isOpen: true, ids });
  };

  const handleDeleteExecute = async () => {
      setIsSaving(true);
      for (const id of confirmDelete.ids) {
          await deleteUser(id);
      }
      setIsSaving(false);
      setConfirmDelete({ isOpen: false, ids: [] });
      fetchUsers();
  };

  // --- Handlers: Import/Export (Existing) ---
  const handleExportCSV = () => {
      const headers = ['Username', 'Name', 'Surname', 'Role', 'SchoolID', 'Phone', 'Email', 'LineStatus'];
      const rows = filteredUsers.map(u => [
          u.username, u.name, u.surname, u.level, u.SchoolID, u.tel, u.email, u.userline_id ? 'Connected' : 'Not Connected'
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n');
      
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
          const text = evt.target?.result as string;
          const lines = text.split('\n');
          const promises = [];
          
          setIsSaving(true); 
          
          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
              if (cols.length < 5) continue;

              const newUser: Partial<User> = {
                  username: cols[0],
                  password: cols[1],
                  name: cols[2],
                  surname: cols[3],
                  level: cols[4] || 'user',
                  SchoolID: cols[5] || '',
                  email: cols[6] || '',
                  tel: cols[7] || ''
              };
              
              if (getRoleLevel(newUser.level) < myLevel) {
                  promises.push(saveUserAdmin(newUser));
              }
          }

          await Promise.all(promises);
          setIsSaving(false);
          alert(`นำเข้าข้อมูลเรียบร้อยแล้ว (${promises.length} รายการ)`);
          fetchUsers();
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleActivityToggleEdit = (actId: string) => {
      const current = new Set(editingUser.assignedActivities || []);
      if (current.has(actId)) current.delete(actId);
      else current.add(actId);
      setEditingUser({ ...editingUser, assignedActivities: Array.from(current) });
  };

  const getRoleBadge = (role: string) => {
      const r = assignableRoles.find(ar => ar.value === role) || { label: role, color: 'bg-gray-100 text-gray-600' };
      let colorClass = r.color;
      if (role === 'admin') colorClass = 'bg-purple-100 text-purple-800';
      else if (role === 'area') colorClass = 'bg-indigo-100 text-indigo-800';
      else if (role === 'group_admin') colorClass = 'bg-blue-100 text-blue-800';

      return <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${colorClass}`}>{role}</span>;
  };

  return (
      <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20">
          
          {/* Header */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center font-kanit">
                      <UserIcon className="w-5 h-5 md:w-6 md:h-6 mr-2 text-purple-600" />
                      จัดการผู้ใช้งาน (User Management)
                  </h2>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                      {filteredUsers.length} Users found
                  </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportFile} />
                  <button onClick={handleImportClick} className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium border border-gray-200">
                      <Upload className="w-4 h-4 mr-2" /> Import CSV
                  </button>
                  <button onClick={handleExportCSV} className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium border border-gray-200">
                      <Download className="w-4 h-4 mr-2" /> Export CSV
                  </button>
                  <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium text-sm">
                      <Plus className="w-4 h-4 mr-2" /> เพิ่มผู้ใช้งาน
                  </button>
              </div>
          </div>

          {/* Controls & Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row gap-3 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute inset-y-0 left-3 flex items-center pointer-events-none h-4 w-4 text-gray-400" />
                      <input
                          type="text"
                          className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                          placeholder="ค้นหาชื่อ, Username..."
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      />
                  </div>
                  
                  {/* Cluster Filter */}
                  <div className="w-full md:w-72">
                      <SearchableSelect 
                          options={[{ label: 'ทุกกลุ่มเครือข่าย', value: 'All' }, ...data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                          value={clusterFilter}
                          onChange={(val) => { setClusterFilter(val); setCurrentPage(1); }}
                          placeholder="กรองกลุ่มเครือข่าย"
                          disabled={isGroupAdmin} 
                          icon={<LayoutGrid className="w-3 h-3" />}
                      />
                  </div>

                  {/* Role Filter */}
                  <div className="w-full md:w-36">
                      <select 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white cursor-pointer"
                          value={roleFilter}
                          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                      >
                          <option value="All">ทุกสิทธิ์</option>
                          {filterRoleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                  </div>

                  {/* Activity Filter (Conditional for Score Role Context mainly) */}
                  <div className="w-full md:w-72">
                      <SearchableSelect
                          options={[{ label: 'ทุกกิจกรรม (All Activities)', value: 'All' }, ...activityOptions]}
                          value={activityFilter}
                          onChange={(val) => { setActivityFilter(val); setCurrentPage(1); }}
                          placeholder="กรองตามกิจกรรมที่รับผิดชอบ"
                          icon={<Filter className="w-3 h-3" />}
                      />
                  </div>

                  {/* LINE Connection Filter */}
                  <div className="w-full md:w-40">
                      <select 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white cursor-pointer"
                          value={lineFilter}
                          onChange={(e) => { setLineFilter(e.target.value as any); setCurrentPage(1); }}
                      >
                          <option value="All">LINE Status</option>
                          <option value="Connected">Connected</option>
                          <option value="NotConnected">Not Connected</option>
                      </select>
                  </div>
              </div>

              {/* Bulk Action Bar */}
              <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                      <button onClick={handleSelectAll} className="flex items-center text-gray-600 hover:text-blue-600 font-medium text-sm px-2">
                          {selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0 ? <CheckSquare className="w-5 h-5 mr-1 text-blue-600"/> : <Square className="w-5 h-5 mr-1"/>}
                          เลือกทั้งหมดในหน้านี้
                      </button>
                      {selectedUserIds.size > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                              {selectedUserIds.size} รายการ
                          </span>
                      )}
                  </div>
                  
                  <div className="flex gap-2">
                      {selectedUserIds.size > 0 && (
                          <>
                              <button 
                                  onClick={handleBulkAssignOpen}
                                  className="flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-xs font-bold transition-all shadow-sm"
                              >
                                  <CheckSquare className="w-4 h-4 mr-1.5 text-orange-500" />
                                  กำหนดกิจกรรม (Assign)
                              </button>
                              <button 
                                  onClick={handleDeleteConfirm}
                                  className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-xs font-bold border border-red-100 transition-all"
                              >
                                  <Trash2 className="w-4 h-4 mr-1.5" /> 
                                  ลบ ({selectedUserIds.size})
                              </button>
                          </>
                      )}
                      <button onClick={fetchUsers} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg border border-gray-300 bg-white" title="Refresh">
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                  </div>
              </div>

              {loading ? (
                  <div className="flex justify-center py-20 text-gray-400">
                      <Loader2 className="w-10 h-10 animate-spin" />
                  </div>
              ) : (
                  <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto mt-4">
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                  <tr>
                                      <th className="px-4 py-3 w-10 text-center">#</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ใช้งาน</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">บทบาท</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">โรงเรียน</th>
                                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                  </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                  {paginatedUsers.map((u) => {
                                      const schoolName = data.schools.find(s => s.SchoolID === u.SchoolID)?.SchoolName || u.SchoolID;
                                      const isMe = u.userid === currentUser?.userid;
                                      const canModify = !isMe && getRoleLevel(u.level) < myLevel;
                                      const isSelected = selectedUserIds.has(u.userid);
                                      const isLineConnected = !!u.userline_id;

                                      return (
                                          <tr key={u.userid} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}>
                                              <td className="px-4 py-4 text-center" onClick={() => canModify && handleSelectUser(u.userid)}>
                                                  {canModify ? (
                                                      <div className={`cursor-pointer ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>
                                                          {isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                                                      </div>
                                                  ) : (
                                                      <div className="w-5 h-5 mx-auto"></div>
                                                  )}
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap">
                                                  <div className="flex items-center">
                                                      <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold border mr-3 text-sm overflow-hidden">
                                                          {u.avatarFileId ? (
                                                              <img src={`https://drive.google.com/thumbnail?id=${u.avatarFileId}`} className="w-full h-full object-cover" />
                                                          ) : u.name?.charAt(0) || 'U'}
                                                      </div>
                                                      <div>
                                                          <div className="text-sm font-bold text-gray-900 flex items-center">
                                                              {u.name} {u.surname} 
                                                              {isMe && <span className="text-[10px] text-blue-600 bg-blue-100 px-1 rounded ml-1">(You)</span>}
                                                              {isLineConnected && (
                                                                  <span className="ml-1.5 text-[#06C755]" title="Linked with LINE">
                                                                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                                                  </span>
                                                              )}
                                                          </div>
                                                          <div className="text-xs text-gray-500">@{u.username}</div>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap">
                                                  {getRoleBadge(u.level)}
                                                  {u.level === 'score' && (
                                                      <div className="text-[10px] text-gray-400 mt-1 flex items-center">
                                                          <CheckSquare className="w-3 h-3 mr-1" />
                                                          {u.assignedActivities?.length || 0} activities
                                                      </div>
                                                  )}
                                              </td>
                                              <td className="px-6 py-4 text-sm text-gray-600">
                                                  <div className="truncate max-w-[200px]">{schoolName || '-'}</div>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                  {canModify && (
                                                      <div className="flex justify-end gap-2">
                                                          <button onClick={() => handleQuickReset(u)} className="p-1.5 text-orange-500 bg-orange-50 rounded hover:bg-orange-100 border border-orange-200" title="Reset Password">
                                                              <KeyRound className="w-4 h-4" />
                                                          </button>
                                                          <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 border border-blue-200" title="Edit">
                                                              <Edit2 className="w-4 h-4" />
                                                          </button>
                                                          <button onClick={() => setConfirmDelete({ isOpen: true, ids: [u.userid] })} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 border border-red-200" title="Delete">
                                                              <Trash2 className="w-4 h-4" />
                                                          </button>
                                                      </div>
                                                  )}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3 mt-4">
                          {paginatedUsers.map((u) => {
                              const schoolName = data.schools.find(s => s.SchoolID === u.SchoolID)?.SchoolName || u.SchoolID;
                              const isMe = u.userid === currentUser?.userid;
                              const canModify = !isMe && getRoleLevel(u.level) < myLevel;
                              const isSelected = selectedUserIds.has(u.userid);
                              const isLineConnected = !!u.userline_id;

                              return (
                                  <div 
                                      key={u.userid} 
                                      className={`bg-white rounded-xl border shadow-sm relative overflow-hidden transition-all ${isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-200'}`}
                                      onClick={() => canModify && handleSelectUser(u.userid)}
                                  >
                                      <div className="p-4 flex items-start gap-4">
                                          {/* Checkbox (Left side for list feel) */}
                                          {canModify && (
                                              <div className="shrink-0 mt-1">
                                                  {isSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-gray-300" />}
                                              </div>
                                          )}
                                          
                                          {/* Avatar */}
                                          <div className="shrink-0 relative">
                                              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold border text-sm overflow-hidden">
                                                  {u.avatarFileId ? (
                                                      <img src={`https://drive.google.com/thumbnail?id=${u.avatarFileId}`} className="w-full h-full object-cover" />
                                                  ) : u.name?.charAt(0) || 'U'}
                                              </div>
                                              {isLineConnected && (
                                                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                      <MessageCircle className="w-4 h-4 text-[#06C755] fill-current" />
                                                  </div>
                                              )}
                                          </div>

                                          {/* Content */}
                                          <div className="flex-1 min-w-0">
                                              <div className="flex justify-between items-start">
                                                  <div>
                                                      <h4 className="font-bold text-gray-900 text-sm truncate pr-2">{u.name} {u.surname}</h4>
                                                      <div className="text-xs text-gray-500">@{u.username}</div>
                                                  </div>
                                                  {/* Role Badge */}
                                                  <div className="shrink-0">
                                                      {getRoleBadge(u.level)}
                                                  </div>
                                              </div>
                                              
                                              <div className="mt-2 text-xs text-gray-600 flex items-center">
                                                  <School className="w-3 h-3 mr-1.5 text-gray-400 shrink-0"/> 
                                                  <span className="truncate">{schoolName || '-'}</span>
                                              </div>
                                              {u.level === 'score' && (
                                                  <div className="mt-1.5 flex items-center">
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100">
                                                          <CheckSquare className="w-3 h-3 mr-1"/> รับผิดชอบ {u.assignedActivities?.length || 0} รายการ
                                                      </span>
                                                  </div>
                                              )}
                                          </div>
                                      </div>

                                      {/* Actions Footer */}
                                      {canModify && (
                                          <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                              <button onClick={() => handleQuickReset(u)} className="p-1.5 bg-white border border-gray-200 text-orange-500 rounded-lg hover:bg-orange-50 shadow-sm">
                                                  <KeyRound className="w-4 h-4" />
                                              </button>
                                              <button onClick={() => handleEdit(u)} className="p-1.5 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-blue-50 shadow-sm">
                                                  <Edit2 className="w-4 h-4" />
                                              </button>
                                              <button onClick={() => setConfirmDelete({ isOpen: true, ids: [u.userid] })} className="p-1.5 bg-white border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 shadow-sm">
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 px-2">
                      <div className="text-xs text-gray-500">หน้า {currentPage} / {totalPages}</div>
                      <div className="flex gap-2">
                          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs">ก่อนหน้า</button>
                          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-xs">ถัดไป</button>
                      </div>
                  </div>
              )}
          </div>

          {/* Edit/Add Modal */}
          {isModalOpen && (
              <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                          <h3 className="font-bold text-gray-800 flex items-center">
                              {editingUser.userid ? <Edit2 className="w-5 h-5 mr-2 text-blue-600"/> : <Plus className="w-5 h-5 mr-2 text-blue-600"/>}
                              {editingUser.userid ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                          </h3>
                          <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                          {/* Login Info */}
                          <div className="space-y-4">
                              <h4 className="text-sm font-bold text-gray-900 border-b pb-1 mb-2">ข้อมูลเข้าระบบ</h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Username *</label>
                                      <input 
                                          required
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                          value={editingUser.username} 
                                          onChange={e => setEditingUser({...editingUser, username: e.target.value})} 
                                          placeholder="Username"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Password {editingUser.userid && '(เว้นว่างหากไม่เปลี่ยน)'}</label>
                                      <div className="relative">
                                          <input 
                                              type={showPassword ? "text" : "password"}
                                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-10" 
                                              value={editingUser.password} 
                                              onChange={e => setEditingUser({...editingUser, password: e.target.value})} 
                                              placeholder={editingUser.userid ? "New Password" : "Password"}
                                              required={!editingUser.userid}
                                          />
                                          <button 
                                              type="button"
                                              onClick={() => setShowPassword(!showPassword)}
                                              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                          >
                                              {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Personal Info */}
                          <div className="space-y-4">
                              <h4 className="text-sm font-bold text-gray-900 border-b pb-1 mb-2">ข้อมูลส่วนตัว</h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อ (Name) *</label>
                                      <input 
                                          required
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                          value={editingUser.name} 
                                          onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">นามสกุล (Surname)</label>
                                      <input 
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                          value={editingUser.surname} 
                                          onChange={e => setEditingUser({...editingUser, surname: e.target.value})} 
                                      />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">เบอร์โทร</label>
                                      <input 
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                          value={editingUser.tel} 
                                          onChange={e => setEditingUser({...editingUser, tel: e.target.value})} 
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">อีเมล</label>
                                      <input 
                                          type="email"
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                          value={editingUser.email} 
                                          onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                                      />
                                  </div>
                              </div>
                              
                              {/* Show Connection Status in Edit Mode */}
                              {editingUser.userid && (
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      <div className="flex items-center justify-between text-sm">
                                          <span className="font-bold text-gray-600">การเชื่อมต่อ LINE</span>
                                          {editingUser.userline_id ? (
                                              <span className="text-green-600 font-bold flex items-center">
                                                  <MessageCircle className="w-4 h-4 mr-1 fill-current" /> เชื่อมต่อแล้ว
                                              </span>
                                          ) : (
                                              <span className="text-gray-400 flex items-center">
                                                  <LinkIcon className="w-3 h-3 mr-1" /> ไม่ได้เชื่อมต่อ
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* Role & Permission */}
                          <div className="space-y-4">
                              <h4 className="text-sm font-bold text-gray-900 border-b pb-1 mb-2">สิทธิ์การใช้งาน</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">Role *</label>
                                      <select 
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                          value={editingUser.level}
                                          onChange={e => setEditingUser({...editingUser, level: e.target.value})}
                                      >
                                          {assignableRoles.length > 0 ? (
                                              assignableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)
                                          ) : (
                                              <option value="" disabled>ไม่มีสิทธิ์สร้างผู้ใช้ใหม่</option>
                                          )}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 mb-1">สังกัดโรงเรียน</label>
                                      {isSchoolAdmin ? (
                                          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed">
                                              {data.schools.find(s => s.SchoolID === currentUser?.SchoolID)?.SchoolName} (Locked)
                                          </div>
                                      ) : (
                                          <SearchableSelect 
                                              options={schoolOptions}
                                              value={editingUser.SchoolID || ''}
                                              onChange={val => setEditingUser({...editingUser, SchoolID: val})}
                                              placeholder="ค้นหาโรงเรียน..."
                                              icon={<School className="w-3 h-3"/>}
                                          />
                                      )}
                                  </div>
                              </div>

                              {/* Activity Assignment Section (Only for Score Role) */}
                              {editingUser.level === 'score' && (
                                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                      <label className="block text-xs font-bold text-orange-800 mb-3 flex items-center">
                                          <CheckSquare className="w-4 h-4 mr-2" />
                                          เลือกกิจกรรมที่รับผิดชอบ (Assigned Activities)
                                      </label>
                                      <div className="max-h-40 overflow-y-auto border border-orange-200 rounded-lg bg-white p-2 space-y-1">
                                          {data.activities.map(act => (
                                              <div key={act.id} className="flex items-center p-2 hover:bg-orange-50 rounded cursor-pointer" onClick={() => handleActivityToggleEdit(act.id)}>
                                                  <div className={`w-4 h-4 border rounded mr-3 flex items-center justify-center ${editingUser.assignedActivities?.includes(act.id) ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'}`}>
                                                      {editingUser.assignedActivities?.includes(act.id) && <CheckCircle className="w-3 h-3" />}
                                                  </div>
                                                  <div className="text-xs text-gray-700">
                                                      <span className="font-bold mr-1">{act.name}</span>
                                                      <span className="text-gray-400">({act.category})</span>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                      <p className="text-[10px] text-orange-600 mt-2 text-right">เลือก {editingUser.assignedActivities?.length || 0} รายการ</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="pt-4 p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">ยกเลิก</button>
                          <button 
                              type="button"
                              onClick={handleSave} 
                              disabled={isSaving || assignableRoles.length === 0}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center disabled:opacity-70"
                          >
                              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              บันทึกข้อมูล
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Bulk Assign Modal */}
          {isBulkAssignOpen && (
              <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                      <div className="p-4 border-b border-gray-100 bg-orange-50 flex justify-between items-center">
                          <div>
                              <h3 className="font-bold text-orange-800 flex items-center">
                                  <CheckSquare className="w-5 h-5 mr-2" />
                                  กำหนดกิจกรรมแบบกลุ่ม ({selectedUserIds.size} คน)
                              </h3>
                              <p className="text-xs text-orange-600 mt-1">เลือกกิจกรรมที่ต้องการมอบหมายให้ผู้ใช้ที่เลือกทั้งหมด</p>
                          </div>
                          <button onClick={() => setIsBulkAssignOpen(false)} className="p-1 hover:bg-orange-100 rounded-full text-orange-800 transition-colors"><X className="w-5 h-5"/></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4">
                          <div className="grid grid-cols-1 gap-2">
                              {data.activities.map(act => (
                                  <div 
                                      key={act.id} 
                                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${bulkActivities.includes(act.id) ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 hover:border-orange-200'}`}
                                      onClick={() => handleBulkAssignToggle(act.id)}
                                  >
                                      <div className={`w-5 h-5 border rounded mr-3 flex items-center justify-center shrink-0 ${bulkActivities.includes(act.id) ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white'}`}>
                                          {bulkActivities.includes(act.id) && <CheckCircle className="w-3.5 h-3.5" />}
                                      </div>
                                      <div>
                                          <div className="text-sm font-bold text-gray-800">{act.name}</div>
                                          <div className="text-xs text-gray-500">{act.category}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                          <span className="text-xs text-gray-500">เลือกแล้ว {bulkActivities.length} กิจกรรม</span>
                          <div className="flex gap-2">
                              <button onClick={() => setIsBulkAssignOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">ยกเลิก</button>
                              <button 
                                  onClick={executeBulkAssign}
                                  disabled={isSaving || bulkActivities.length === 0}
                                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-bold flex items-center disabled:opacity-50"
                              >
                                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                  บันทึกข้อมูล ({selectedUserIds.size})
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* Credentials Modal (Success) */}
          {createdCredential && (
              <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">ดำเนินการสำเร็จ</h3>
                      <p className="text-sm text-gray-500 mb-6">กรุณาส่งข้อมูลการเข้าสู่ระบบใหม่ให้ผู้ใช้งาน</p>
                      
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left">
                          <div className="mb-2">
                              <span className="text-xs text-gray-400 font-bold uppercase">Username</span>
                              <div className="font-mono text-gray-800 font-bold text-lg">{createdCredential.username}</div>
                          </div>
                          <div>
                              <span className="text-xs text-gray-400 font-bold uppercase">New Password</span>
                              <div className="font-mono text-gray-800 font-bold text-lg">{createdCredential.password}</div>
                          </div>
                      </div>

                      <button 
                          onClick={() => {
                              navigator.clipboard.writeText(`Username: ${createdCredential.username}\nPassword: ${createdCredential.password}\nLogin at: ${window.location.origin}`);
                              alert('คัดลอกเรียบร้อย');
                          }}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center mb-3"
                      >
                          <Copy className="w-4 h-4 mr-2" /> คัดลอก (Copy)
                      </button>
                      <button onClick={() => setCreatedCredential(null)} className="text-gray-500 text-sm hover:underline">ปิดหน้าต่าง</button>
                  </div>
              </div>
          )}

          {/* Confirm Reset Modal */}
          <ConfirmationModal 
              isOpen={confirmReset.isOpen}
              title="รีเซ็ตรหัสผ่าน"
              description={`คุณต้องการรีเซ็ตรหัสผ่านของ "${confirmReset.user?.name}" ใช่หรือไม่? รหัสผ่านใหม่จะถูกสุ่มและแสดงให้คุณเห็น`}
              confirmLabel="ยืนยันการรีเซ็ต"
              confirmColor="orange"
              onConfirm={executeQuickReset}
              onCancel={() => setConfirmReset({ isOpen: false, user: null })}
              isLoading={isSaving}
          />

          <ConfirmationModal 
              isOpen={confirmDelete.isOpen}
              title={`ยืนยันการลบ ${confirmDelete.ids.length} รายการ`}
              description="คุณต้องการลบผู้ใช้งานเหล่านี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
              confirmLabel="ลบข้อมูล"
              confirmColor="red"
              onConfirm={handleDeleteExecute}
              onCancel={() => setConfirmDelete({ isOpen: false, ids: [] })}
              isLoading={isSaving}
          />
      </div>
  );
};

export default UserManagement;
