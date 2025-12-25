
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, School, User, RegistrationMode } from '../types';
import { School as SchoolIcon, Plus, Edit2, Trash2, Search, Save, X, Loader2, LayoutGrid, Lock, Filter } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import ConfirmationModal from './ConfirmationModal';
import { saveSchool, deleteSchool } from '../services/api';

interface SchoolManagementProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ data, user, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clusterFilter, setClusterFilter] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSchool, setEditingSchool] = useState<Partial<School>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

  // Permissions
  const role = user?.level?.toLowerCase() || '';
  const isAdminOrArea = role === 'admin' || role === 'area';
  const isGroupAdmin = role === 'group_admin';
  const canManage = isAdminOrArea || isGroupAdmin;

  // Determine user's cluster context
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  useEffect(() => {
      // If group admin, lock filter to their cluster
      if (isGroupAdmin && userClusterID) {
          setClusterFilter(userClusterID);
      }
  }, [isGroupAdmin, userClusterID]);

  const filteredSchools = useMemo(() => {
      return (data.schools || []).filter(s => {
          const matchesSearch = s.SchoolName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                s.SchoolID.toLowerCase().includes(searchTerm.toLowerCase());
          
          let matchesCluster = true;
          if (isGroupAdmin) {
              matchesCluster = s.SchoolCluster === userClusterID;
          } else if (clusterFilter) {
              matchesCluster = s.SchoolCluster === clusterFilter;
          }

          return matchesSearch && matchesCluster;
      }).sort((a, b) => {
          // Sort by Cluster then Name
          if (a.SchoolCluster !== b.SchoolCluster) return a.SchoolCluster.localeCompare(b.SchoolCluster);
          return a.SchoolName.localeCompare(b.SchoolName);
      });
  }, [data.schools, searchTerm, clusterFilter, isGroupAdmin, userClusterID]);

  const handleAdd = () => {
      setEditingSchool({
          SchoolID: '',
          SchoolName: '',
          SchoolCluster: isGroupAdmin ? userClusterID : (data.clusters[0]?.ClusterID || ''),
          RegistrationMode: RegistrationMode.SELF,
          AssignedActivities: []
      });
      setIsModalOpen(true);
  };

  const handleEdit = (school: School) => {
      setEditingSchool({ ...school });
      setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingSchool.SchoolID || !editingSchool.SchoolName) {
          alert('กรุณากรอกข้อมูลให้ครบถ้วน');
          return;
      }

      setIsSaving(true);
      // Ensure AssignmentActivities is string[] or undefined, backend handles join
      const success = await saveSchool(editingSchool as School);
      setIsSaving(false);

      if (success) {
          setIsModalOpen(false);
          onDataUpdate();
      } else {
          alert('บันทึกไม่สำเร็จ');
      }
  };

  const handleDelete = async () => {
      if (confirmDelete.id) {
          setIsSaving(true);
          const success = await deleteSchool(confirmDelete.id);
          setIsSaving(false);
          setConfirmDelete({ isOpen: false, id: null });
          
          if (success) {
              onDataUpdate();
          } else {
              alert('ลบข้อมูลไม่สำเร็จ');
          }
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                    <SchoolIcon className="w-6 h-6 mr-2 text-blue-600" />
                    ข้อมูลโรงเรียน (Schools)
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    {canManage ? 'จัดการข้อมูลโรงเรียนในระบบ' : 'รายชื่อโรงเรียนที่เข้าร่วม'}
                </p>
            </div>
            
            {canManage && (
                <button 
                    onClick={handleAdd}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                >
                    <Plus className="w-4 h-4 mr-2" /> เพิ่มโรงเรียนใหม่
                </button>
            )}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute inset-y-0 left-3 flex items-center pointer-events-none h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                    placeholder="ค้นหาชื่อโรงเรียน หรือ รหัส..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {!isGroupAdmin && (
                <div className="w-full md:w-64">
                    <SearchableSelect 
                        options={[{ label: 'ทุกกลุ่มเครือข่าย', value: '' }, ...(data.clusters || []).map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                        value={clusterFilter}
                        onChange={setClusterFilter}
                        placeholder="กรองตามกลุ่มเครือข่าย"
                        icon={<LayoutGrid className="h-4 w-4" />}
                    />
                </div>
            )}
        </div>

        {/* List View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รหัสโรงเรียน</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่อโรงเรียน</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">กลุ่มเครือข่าย</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รูปแบบการสมัคร</th>
                            {canManage && <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSchools.map(school => {
                            const clusterName = (data.clusters || []).find(c => c.ClusterID === school.SchoolCluster)?.ClusterName || school.SchoolCluster;
                            return (
                                <tr key={school.SchoolID} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{school.SchoolID}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{school.SchoolName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                            {clusterName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {school.RegistrationMode === 'group_assigned' ? 'ลงทะเบียนโดยกลุ่มฯ' : 'ลงทะเบียนเอง'}
                                    </td>
                                    {canManage && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(school)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded hover:bg-blue-100">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setConfirmDelete({ isOpen: true, id: school.SchoolID })} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded hover:bg-red-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {filteredSchools.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">ไม่พบข้อมูลโรงเรียน</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
                {filteredSchools.map(school => {
                    const clusterName = (data.clusters || []).find(c => c.ClusterID === school.SchoolCluster)?.ClusterName || school.SchoolCluster;
                    return (
                        <div key={school.SchoolID} className="p-4 flex justify-between items-start">
                            <div>
                                <div className="font-bold text-gray-900">{school.SchoolName}</div>
                                <div className="text-xs text-gray-500 mt-1 font-mono">ID: {school.SchoolID}</div>
                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-2 inline-block border border-blue-100">
                                    {clusterName}
                                </div>
                            </div>
                            {canManage && (
                                <div className="flex flex-col gap-2 ml-4">
                                    <button onClick={() => handleEdit(school)} className="p-2 bg-gray-100 text-blue-600 rounded-lg">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setConfirmDelete({ isOpen: true, id: school.SchoolID })} className="p-2 bg-gray-100 text-red-600 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredSchools.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">ไม่พบข้อมูลโรงเรียน</div>
                )}
            </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <SchoolIcon className="w-5 h-5 mr-2 text-blue-600"/>
                            {editingSchool.SchoolID && data.schools.some(s => s.SchoolID === editingSchool.SchoolID) ? 'แก้ไขข้อมูลโรงเรียน' : 'เพิ่มโรงเรียนใหม่'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสโรงเรียน (School ID) *</label>
                            <input 
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={editingSchool.SchoolID} 
                                onChange={e => setEditingSchool({...editingSchool, SchoolID: e.target.value})} 
                                placeholder="เช่น 10xxxxxxxx"
                                // Lock ID editing if user is Group Admin (to prevent breaking refs), unless new
                                // Actually better to allow edit but warn. For simplicity, allow.
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโรงเรียน (School Name) *</label>
                            <input 
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={editingSchool.SchoolName} 
                                onChange={e => setEditingSchool({...editingSchool, SchoolName: e.target.value})} 
                                placeholder="ชื่อโรงเรียน..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มเครือข่าย (Cluster)</label>
                            <select 
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                                value={editingSchool.SchoolCluster}
                                onChange={e => setEditingSchool({...editingSchool, SchoolCluster: e.target.value})}
                                disabled={isGroupAdmin} // Group Admin cannot change cluster of a school outside their scope usually
                            >
                                {data.clusters.map(c => (
                                    <option key={c.ClusterID} value={c.ClusterID}>{c.ClusterName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รูปแบบการลงทะเบียน</label>
                            <select 
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={editingSchool.RegistrationMode}
                                onChange={e => setEditingSchool({...editingSchool, RegistrationMode: e.target.value as any})}
                            >
                                <option value="self">ลงทะเบียนเอง (Self)</option>
                                <option value="group_assigned">ลงทะเบียนโดยกลุ่มฯ (Group Assigned)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                * <b>Self</b>: โรงเรียน Login มาเพิ่มทีมเองได้<br/>
                                * <b>Group Assigned</b>: เฉพาะ Admin/Group Admin เท่านั้นที่เพิ่มทีมให้ได้
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">ยกเลิก</button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
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
            title="ยืนยันการลบโรงเรียน"
            description="คุณต้องการลบข้อมูลโรงเรียนนี้ใช่หรือไม่? การกระทำนี้อาจส่งผลต่อทีมที่สังกัดโรงเรียนนี้"
            confirmLabel="ลบข้อมูล"
            confirmColor="red"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
            isLoading={isSaving}
        />
    </div>
  );
};

export default SchoolManagement;
