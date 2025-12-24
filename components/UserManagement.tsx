
import React, { useState, useEffect, useMemo } from 'react';
import { AppData, User } from '../types';
import { getAllUsers, saveUserAdmin, deleteUser } from '../services/api';
import { Search, Plus, Edit2, Trash2, User as UserIcon, Shield, School, CheckCircle, X, Save, Lock, Loader2, RefreshCw, AlertTriangle, Phone, Mail, MoreHorizontal } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Determine Current User Scope & Level
  const userRole = currentUser?.level?.toLowerCase() || 'user';
  const myLevel = getRoleLevel(userRole);
  
  const isAdminOrArea = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const isSchoolAdmin = userRole === 'school_admin';

  // Find User's Cluster (for Group Admin)
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
  };

  // Filter Users based on Scope
  const scopedUsers = useMemo(() => {
      return users.filter(u => {
          // 1. Admin/Area sees all
          if (isAdminOrArea) return true;

          // 2. Group Admin sees users in their cluster
          if (isGroupAdmin) {
              const uSchool = data.schools.find(s => s.SchoolID === u.SchoolID);
              // Strict mode: Must match cluster
              return uSchool?.SchoolCluster === userClusterId;
          }

          // 3. School Admin sees users in their school
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
          
          return matchesSearch && matchesRole;
      });
  }, [scopedUsers, searchTerm, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Available Roles for Creation based on permissions (Strict Hierarchy)
  const availableRoles = useMemo(() => {
      const allRoles = [
          { value: 'admin', label: 'Admin (ผู้ดูแลระบบสูงสุด)', color: 'bg-purple-100 text-purple-800' },
          { value: 'area', label: 'Area Admin (เขตพื้นที่)', color: 'bg-indigo-100 text-indigo-800' },
          { value: 'group_admin', label: 'Group Admin (ประธานกลุ่มฯ)', color: 'bg-blue-100 text-blue-800' },
          { value: 'school_admin', label: 'School Admin (แอดมินโรงเรียน)', color: 'bg-cyan-100 text-cyan-800' },
          { value: 'score', label: 'Score Entry (กรรมการบันทึกคะแนน)', color: 'bg-orange-100 text-orange-800' },
          { value: 'user', label: 'User (ผู้ใช้งานทั่วไป)', color: 'bg-gray-100 text-gray-800' }
      ];

      // Rule: Can only create roles STRICTLY LOWER than self
      return allRoles.filter(roleOption => getRoleLevel(roleOption.value) < myLevel);
  }, [myLevel]);

  // Available Schools for Creation
  const schoolOptions = useMemo(() => {
      let list = data.schools;
      if (isGroupAdmin) {
          list = list.filter(s => s.SchoolCluster === userClusterId);
      } else if (isSchoolAdmin) {
          list = list.filter(s => s.SchoolID === currentUser?.SchoolID);
      }
      return list.map(s => ({ label: s.SchoolName, value: s.SchoolID }));
  }, [data.schools, isGroupAdmin, isSchoolAdmin, userClusterId, currentUser]);

  const handleAdd = () => {
      setEditingUser({
          userid: '',
          username: '',
          password: '',
          name: '',
          surname: '',
          level: 'user', // Default to lowest safe role
          SchoolID: isSchoolAdmin ? currentUser?.SchoolID : '', // Auto-set school for School Admin
          email: '',
          tel: ''
      });
      setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
      if (user.userid === currentUser?.userid) {
          alert("กรุณาแก้ไขข้อมูลส่วนตัวของคุณที่เมนู 'ข้อมูลส่วนตัว (Profile)'");
          return;
      }
      
      // Strict Hierarchy Check for Edit
      if (getRoleLevel(user.level) >= myLevel) {
          alert("คุณไม่มีสิทธิ์แก้ไขผู้ใช้งานที่มีระดับเท่ากันหรือสูงกว่า");
          return;
      }

      setEditingUser({ ...user, password: '' }); // Don't show password
      setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser.username || !editingUser.name) {
          alert('กรุณากรอกข้อมูลให้ครบถ้วน');
          return;
      }

      // Security Check on Save (Prevent escalation)
      if (editingUser.level && getRoleLevel(editingUser.level) >= myLevel) {
          alert("คุณไม่สามารถกำหนดสิทธิ์ที่สูงกว่าหรือเท่ากับตนเองได้");
          return;
      }

      setIsSaving(true);
      try {
          const res = await saveUserAdmin(editingUser);
          if (res.status === 'success') {
              setIsModalOpen(false);
              fetchUsers(); // Refresh list
          } else {
              alert('บันทึกไม่สำเร็จ: ' + res.message);
          }
      } catch (err) {
          alert('เกิดข้อผิดพลาด');
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async () => {
      if (confirmDelete.id) {
          const targetUser = users.find(u => u.userid === confirmDelete.id);
          if (targetUser && getRoleLevel(targetUser.level) >= myLevel) {
              alert("คุณไม่มีสิทธิ์ลบผู้ใช้งานระดับนี้");
              setConfirmDelete({ isOpen: false, id: null });
              return;
          }

          setIsSaving(true);
          const success = await deleteUser(confirmDelete.id);
          setIsSaving(false);
          setConfirmDelete({ isOpen: false, id: null });
          if (success) {
              fetchUsers();
          } else {
              alert('ลบผู้ใช้งานไม่สำเร็จ');
          }
      }
  };

  const getRoleBadge = (role: string) => {
      const allRoles = [
          { value: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-800' },
          { value: 'area', label: 'Area Admin', color: 'bg-indigo-100 text-indigo-800' },
          { value: 'group_admin', label: 'Group Admin', color: 'bg-blue-100 text-blue-800' },
          { value: 'school_admin', label: 'School Admin', color: 'bg-cyan-100 text-cyan-800' },
          { value: 'score', label: 'Score', color: 'bg-orange-100 text-orange-800' },
          { value: 'user', label: 'User', color: 'bg-gray-100 text-gray-800' }
      ];
      const r = allRoles.find(r => r.value === role);
      return (
          <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold ${r?.color || 'bg-gray-100 text-gray-600'}`}>
              {r?.label || role}
          </span>
      );
  };

  return (
      <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20">
          
          {/* Header */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center font-kanit">
                      <UserIcon className="w-5 h-5 md:w-6 md:h-6 mr-2 text-purple-600" />
                      จัดการผู้ใช้งาน (User Management)
                  </h2>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                      {isAdminOrArea ? 'บริหารจัดการบัญชีผู้ใช้ทั้งหมด' : 
                       isGroupAdmin ? 'บริหารจัดการผู้ใช้ในกลุ่มเครือข่ายของท่าน' : 
                       'บริหารจัดการผู้ใช้ในโรงเรียนของท่าน'}
                  </p>
              </div>
              <button 
                  onClick={handleAdd}
                  className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
              >
                  <Plus className="w-4 h-4 mr-2" /> เพิ่มผู้ใช้งานใหม่
              </button>
          </div>

          {/* Controls */}
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between gap-3 mb-4 md:mb-6">
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                          <Search className="absolute inset-y-0 left-3 flex items-center pointer-events-none h-4 w-4 text-gray-400" />
                          <input
                              type="text"
                              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                              placeholder="ค้นหาชื่อ, Username..."
                              value={searchTerm}
                              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                          />
                      </div>
                      <select 
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 outline-none bg-white w-full md:w-auto"
                          value={roleFilter}
                          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                      >
                          <option value="All">ทุกสิทธิ์การใช้งาน</option>
                          {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label.split('(')[0]}</option>)}
                      </select>
                  </div>
                  <button onClick={fetchUsers} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg self-end md:self-auto" title="Refresh">
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
              </div>

              {loading ? (
                  <div className="flex justify-center py-20 text-gray-400">
                      <Loader2 className="w-10 h-10 animate-spin" />
                  </div>
              ) : (
                  <>
                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3">
                          {paginatedUsers.map((u) => {
                              const schoolName = data.schools.find(s => s.SchoolID === u.SchoolID)?.SchoolName || u.SchoolID;
                              const isMe = u.userid === currentUser?.userid;
                              const canModify = !isMe && getRoleLevel(u.level) < myLevel;

                              return (
                                  <div key={u.userid} className={`bg-white border rounded-xl p-4 shadow-sm relative ${isMe ? 'border-blue-300 bg-blue-50/20' : 'border-gray-200'}`}>
                                      <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 shrink-0">
                                                  {u.pictureUrl || u.avatarFileId ? (
                                                      <img className="h-10 w-10 rounded-full object-cover border" src={u.pictureUrl || `https://drive.google.com/thumbnail?id=${u.avatarFileId}`} alt="" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${u.name}&background=random`; }} />
                                                  ) : (
                                                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold border">{u.name?.charAt(0) || 'U'}</div>
                                                  )}
                                              </div>
                                              <div>
                                                  <div className="text-sm font-bold text-gray-900 line-clamp-1">{u.name} {u.surname}</div>
                                                  <div className="text-xs text-gray-500">@{u.username}</div>
                                              </div>
                                          </div>
                                          {isMe && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">คุณ</span>}
                                      </div>
                                      
                                      <div className="mt-3 flex flex-wrap gap-2 items-center">
                                          {getRoleBadge(u.level)}
                                          <div className="text-xs text-gray-500 flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100 max-w-full">
                                              <School className="w-3 h-3 mr-1 shrink-0" />
                                              <span className="truncate">{schoolName || '-'}</span>
                                          </div>
                                      </div>

                                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                          <div className="flex flex-col">
                                              <span className="flex items-center"><Phone className="w-3 h-3 mr-1"/> {u.tel || '-'}</span>
                                          </div>
                                          
                                          {canModify ? (
                                              <div className="flex gap-2">
                                                  <button onClick={() => handleEdit(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit2 className="w-4 h-4"/></button>
                                                  <button onClick={() => setConfirmDelete({ isOpen: true, id: u.userid })} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4"/></button>
                                              </div>
                                          ) : (
                                              !isMe && <span className="text-gray-300 italic flex items-center"><Lock className="w-3 h-3 mr-1"/> Locked</span>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                  <tr>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้งาน</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">บทบาท (Role)</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สังกัด / โรงเรียน</th>
                                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">การติดต่อ</th>
                                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                  </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                  {paginatedUsers.map((u) => {
                                      const schoolName = data.schools.find(s => s.SchoolID === u.SchoolID)?.SchoolName || u.SchoolID;
                                      const isMe = u.userid === currentUser?.userid;
                                      const canModify = !isMe && getRoleLevel(u.level) < myLevel;

                                      return (
                                          <tr key={u.userid} className={`hover:bg-gray-50 transition-colors ${isMe ? 'bg-blue-50/30' : ''}`}>
                                              <td className="px-6 py-4 whitespace-nowrap">
                                                  <div className="flex items-center">
                                                      <div className="h-10 w-10 flex-shrink-0">
                                                          {u.pictureUrl || u.avatarFileId ? (
                                                              <img className="h-10 w-10 rounded-full object-cover border" src={u.pictureUrl || `https://drive.google.com/thumbnail?id=${u.avatarFileId}`} alt="" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${u.name}&background=random`; }} />
                                                          ) : (
                                                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold border">{u.name?.charAt(0) || 'U'}</div>
                                                          )}
                                                      </div>
                                                      <div className="ml-4">
                                                          <div className="text-sm font-medium text-gray-900">{u.name} {u.surname} {isMe && <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded ml-1">(คุณ)</span>}</div>
                                                          <div className="text-xs text-gray-500">@{u.username}</div>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap">
                                                  {getRoleBadge(u.level)}
                                              </td>
                                              <td className="px-6 py-4">
                                                  <div className="text-sm text-gray-900 truncate max-w-[200px]">{schoolName || '-'}</div>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  <div className="flex items-center"><Phone className="w-3 h-3 mr-1"/> {u.tel || '-'}</div>
                                                  <div className="text-xs flex items-center mt-0.5"><Mail className="w-3 h-3 mr-1"/> {u.email || '-'}</div>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                  <div className="flex justify-end gap-2">
                                                      {canModify && (
                                                          <>
                                                            <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded hover:bg-blue-100"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => setConfirmDelete({ isOpen: true, id: u.userid })} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                                                          </>
                                                      )}
                                                      {!canModify && !isMe && <span className="text-gray-300 italic"><Lock className="w-4 h-4 inline" /></span>}
                                                      {isMe && <span className="text-xs text-gray-400 italic">Profile</span>}
                                                  </div>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-600">
                          หน้า {currentPage} จาก {totalPages}
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm bg-white">ก่อนหน้า</button>
                          <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm bg-white">ถัดไป</button>
                      </div>
                  </div>
              )}
          </div>

          {/* Edit/Add Modal */}
          {isModalOpen && (
              <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                          <h3 className="font-bold text-gray-800 flex items-center">
                              {editingUser.userid ? <Edit2 className="w-5 h-5 mr-2 text-blue-600"/> : <Plus className="w-5 h-5 mr-2 text-blue-600"/>}
                              {editingUser.userid ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                          </h3>
                          <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                      </div>
                      
                      <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
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
                                  <input 
                                      type="password"
                                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                      value={editingUser.password} 
                                      onChange={e => setEditingUser({...editingUser, password: e.target.value})} 
                                      placeholder={editingUser.userid ? "New Password" : "Password"}
                                      required={!editingUser.userid}
                                  />
                              </div>
                          </div>

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

                          <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">สิทธิ์การใช้งาน (Role) *</label>
                              <select 
                                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                  value={editingUser.level}
                                  onChange={e => setEditingUser({...editingUser, level: e.target.value})}
                              >
                                  {availableRoles.length > 0 ? (
                                      availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)
                                  ) : (
                                      <option value="" disabled>ไม่มีสิทธิ์สร้างผู้ใช้ใหม่</option>
                                  )}
                              </select>
                              {availableRoles.length === 0 && <p className="text-xs text-red-500 mt-1">คุณไม่มีสิทธิ์สร้างผู้ใช้ระดับรองลงไป</p>}
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">สังกัดโรงเรียน</label>
                              {isSchoolAdmin ? (
                                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed">
                                      {data.schools.find(s => s.SchoolID === currentUser?.SchoolID)?.SchoolName || currentUser?.SchoolID} (Locked)
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

                          <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">ยกเลิก</button>
                              <button 
                                  type="submit" 
                                  disabled={isSaving || availableRoles.length === 0}
                                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center disabled:opacity-70"
                              >
                                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                  บันทึก
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          <ConfirmationModal 
              isOpen={confirmDelete.isOpen}
              title="ยืนยันการลบผู้ใช้งาน"
              description="คุณต้องการลบผู้ใช้งานรายนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
              confirmLabel="ลบผู้ใช้งาน"
              confirmColor="red"
              onConfirm={handleDelete}
              onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
              isLoading={isSaving}
          />
      </div>
  );
};

export default UserManagement;
