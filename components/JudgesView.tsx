
import React, { useState, useMemo } from 'react';
import { AppData, Judge, User } from '../types';
import { Search, Plus, Edit2, Trash2, Gavel, Mail, Phone, School, MapPin, Loader2, Save, X } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import ConfirmationModal from './ConfirmationModal';
import { saveJudge, deleteJudge } from '../services/api';

interface JudgesViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

const JudgesView: React.FC<JudgesViewProps> = ({ data, user, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('All');
  const [selectedActivity, setSelectedActivity] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Partial<Judge> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

  // Permissions
  const canManage = ['admin', 'area', 'group_admin'].includes(user?.level?.toLowerCase() || '');
  
  if (!canManage) {
      return <div className="text-center py-20 text-gray-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  // Filter Logic
  const filteredJudges = useMemo(() => {
      return (data.judges || []).filter(judge => {
          const matchesSearch = 
            judge.judgeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            judge.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            judge.email.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCluster = selectedCluster === 'All' || judge.clusterKey === selectedCluster;
          const matchesActivity = selectedActivity === 'All' || judge.activityId === selectedActivity;
          
          // Role based filtering
          if (user?.level === 'group_admin') {
              const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
              if (userSchool && judge.clusterKey !== userSchool.SchoolCluster) return false;
          }

          return matchesSearch && matchesCluster && matchesActivity;
      });
  }, [data.judges, searchTerm, selectedCluster, selectedActivity, user, data.schools]);

  const handleEdit = (judge: Judge) => {
      setEditingJudge({ ...judge });
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      setEditingJudge({
          activityId: '',
          clusterKey: '',
          clusterLabel: '',
          schoolId: '',
          schoolName: '',
          judgeName: '',
          role: 'กรรมการ',
          phone: '',
          email: '',
          stageScope: 'cluster',
          importedBy: user?.username || 'Admin'
      });
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!editingJudge?.judgeName || !editingJudge.activityId) {
          alert('กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, กิจกรรม)');
          return;
      }

      setIsSaving(true);
      // Auto-fill related names
      const activity = data.activities.find(a => a.id === editingJudge.activityId);
      const school = data.schools.find(s => s.SchoolID === editingJudge.schoolId);
      const cluster = school ? data.clusters.find(c => c.ClusterID === school.SchoolCluster) : null;

      const payload: Judge = {
          ...editingJudge as Judge,
          // Generate internal ID on save if not present (though backend generates row)
          id: editingJudge.id || `${editingJudge.activityId}_${editingJudge.judgeName}`,
          schoolName: school?.SchoolName || editingJudge.schoolName || '',
          clusterKey: cluster?.ClusterID || editingJudge.clusterKey || '',
          clusterLabel: cluster?.ClusterName || editingJudge.clusterLabel || ''
      };

      const success = await saveJudge(payload);
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
          await deleteJudge(confirmDelete.id);
          setConfirmDelete({ isOpen: false, id: null });
          onDataUpdate();
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Gavel className="w-6 h-6 mr-2 text-blue-600" />
                    ทำเนียบกรรมการ (Judges)
                </h2>
                <p className="text-gray-500 text-sm mt-1">จัดการรายชื่อและข้อมูลติดต่อกรรมการตัดสินการแข่งขัน</p>
            </div>
            <button 
                onClick={handleAdd}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
            >
                <Plus className="w-4 h-4 mr-2" /> เพิ่มกรรมการ
            </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                    placeholder="ค้นหาชื่อ, โรงเรียน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <select 
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none"
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
            >
                <option value="All">ทุกกิจกรรม</option>
                {data.activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {user?.level !== 'group_admin' && (
                <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:outline-none"
                    value={selectedCluster}
                    onChange={(e) => setSelectedCluster(e.target.value)}
                >
                    <option value="All">ทุกกลุ่มเครือข่าย</option>
                    {data.clusters.map(c => <option key={c.ClusterID} value={c.ClusterID}>{c.ClusterName}</option>)}
                </select>
            )}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ - สกุล</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่ง/กิจกรรม</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สังกัด</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ติดต่อ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredJudges.map((judge, idx) => {
                            const activityName = data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId;
                            const isHead = judge.role.includes('ประธาน');
                            // Use index as fallback key if id is missing or duplicate
                            const rowKey = judge.id || `judge-${idx}`;
                            return (
                                <tr key={rowKey} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{judge.judgeName}</div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isHead ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {judge.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 line-clamp-1">{activityName}</div>
                                        <div className="text-xs text-gray-500">{judge.stageScope === 'area' ? 'ระดับเขตพื้นที่' : 'ระดับกลุ่มเครือข่าย'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 flex items-center"><School className="w-3 h-3 mr-1 text-gray-400"/> {judge.schoolName}</div>
                                        <div className="text-xs text-gray-500 flex items-center"><MapPin className="w-3 h-3 mr-1 text-gray-400"/> {judge.clusterLabel}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-600 flex items-center"><Phone className="w-3 h-3 mr-1"/> {judge.phone || '-'}</div>
                                        <div className="text-xs text-gray-500 flex items-center"><Mail className="w-3 h-3 mr-1"/> {judge.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(judge)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit2 className="w-4 h-4"/></button>
                                        <button onClick={() => setConfirmDelete({ isOpen: true, id: judge.id })} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredJudges.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">ไม่พบรายชื่อกรรมการ</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Modal */}
        {isModalOpen && editingJudge && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800">{editingJudge.id ? 'แก้ไขข้อมูล' : 'เพิ่มกรรมการใหม่'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ - นามสกุล *</label>
                            <input 
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={editingJudge.judgeName}
                                onChange={e => setEditingJudge({ ...editingJudge, judgeName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                                <input 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.phone}
                                    onChange={e => setEditingJudge({ ...editingJudge, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                                <input 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.email}
                                    onChange={e => setEditingJudge({ ...editingJudge, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายการแข่งขัน *</label>
                            <SearchableSelect 
                                options={data.activities.map(a => ({ label: a.name, value: a.id }))}
                                value={editingJudge.activityId || ''}
                                onChange={val => setEditingJudge({ ...editingJudge, activityId: val })}
                                placeholder="เลือกกิจกรรม..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">โรงเรียน / สังกัด</label>
                            <SearchableSelect 
                                options={data.schools.map(s => ({ label: s.SchoolName, value: s.SchoolID }))}
                                value={editingJudge.schoolId || ''}
                                onChange={val => setEditingJudge({ ...editingJudge, schoolId: val })}
                                placeholder="เลือกโรงเรียน..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">บทบาท</label>
                                <select 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.role}
                                    onChange={e => setEditingJudge({ ...editingJudge, role: e.target.value })}
                                >
                                    <option value="ประธานกรรมการ">ประธานกรรมการ</option>
                                    <option value="กรรมการ">กรรมการ</option>
                                    <option value="กรรมการและเลขา">กรรมการและเลขา</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ขอบเขต</label>
                                <select 
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editingJudge.stageScope}
                                    onChange={e => setEditingJudge({ ...editingJudge, stageScope: e.target.value as any })}
                                >
                                    <option value="cluster">ระดับกลุ่มเครือข่าย</option>
                                    <option value="area">ระดับเขตพื้นที่</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">ยกเลิก</button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} บันทึก
                        </button>
                    </div>
                </div>
            </div>
        )}

        <ConfirmationModal 
            isOpen={confirmDelete.isOpen}
            title="ลบข้อมูลกรรมการ"
            description="คุณต้องการลบรายชื่อกรรมการท่านนี้ใช่หรือไม่?"
            confirmLabel="ลบข้อมูล"
            confirmColor="red"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
        />
    </div>
  );
};

export default JudgesView;
