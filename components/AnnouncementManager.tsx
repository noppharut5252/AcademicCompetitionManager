
import React, { useState, useRef } from 'react';
import { AppData, User, Announcement, Attachment } from '../types';
import { Megaphone, Plus, Edit2, Trash2, Link as LinkIcon, Save, X, FileText, Loader2, Calendar, LayoutGrid, Trophy, Paperclip, Image as ImageIcon } from 'lucide-react';
import { addAnnouncement, updateAnnouncement, deleteAnnouncement, uploadFile } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import { fileToBase64 } from '../services/utils';

interface AnnouncementManagerProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ data, user, onDataUpdate }) => {
  const [activeScope, setActiveScope] = useState<'area' | 'cluster'>('area');
  const [activeType, setActiveType] = useState<'all' | 'news' | 'manual'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingItem, setEditingItem] = useState<Partial<Announcement>>({
      title: '', content: '', type: 'news', link: '', clusterId: 'area', attachments: []
  });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission Check
  const userRole = user?.level?.toLowerCase() || '';
  const canManage = ['admin', 'area', 'group_admin'].includes(userRole);
  const isGroupAdmin = userRole === 'group_admin';
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  const filteredList = data.announcements.filter(a => {
      // Filter by Type
      if (activeType !== 'all' && a.type !== activeType) return false;
      
      // Filter by Scope
      if (activeScope === 'area') {
          return !a.clusterId || a.clusterId === 'area';
      } else {
          // If viewing specific cluster (Admin select or Group Admin locked)
          if (isGroupAdmin) return a.clusterId === userClusterID;
          // Admin viewing cluster scope - show all non-area? Or specific?
          // Let's list all cluster news if admin
          return a.clusterId && a.clusterId !== 'area';
      }
  });

  const handleEdit = (item: Announcement) => {
      setEditingItem(item);
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      // Set default clusterId based on scope
      let defaultClusterId = 'area';
      if (activeScope === 'cluster') {
          if (isGroupAdmin && userClusterID) {
              defaultClusterId = userClusterID;
          } else {
              // Admin creating for cluster, default to first available or require selection
              defaultClusterId = data.clusters[0]?.ClusterID || ''; 
          }
      }

      setEditingItem({ 
          title: '', 
          content: '', 
          type: 'news', 
          link: '', 
          clusterId: defaultClusterId, 
          attachments: [] 
      });
      setIsModalOpen(true);
  };

  const handleDelete = async () => {
      if (confirmDelete.id) {
          setIsSaving(true); // Reusing saving state for loading
          const success = await deleteAnnouncement(confirmDelete.id);
          setIsSaving(false);
          setConfirmDelete({ isOpen: false, id: null });
          if (success) {
              onDataUpdate();
          } else {
              alert('ลบข้อมูลไม่สำเร็จ');
          }
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      const newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
              const base64 = await fileToBase64(file);
              const res = await uploadFile(base64, file.name, file.type);
              
              if (res.status === 'success' && res.fileUrl) {
                  newAttachments.push({
                      name: file.name,
                      url: res.fileUrl, // This might be viewing link
                      type: file.type,
                      id: res.fileId
                  });
              }
          } catch(e) {
              console.error(e);
          }
      }

      setEditingItem(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...newAttachments]
      }));
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
      setEditingItem(prev => {
          const newAtt = [...(prev.attachments || [])];
          newAtt.splice(index, 1);
          return { ...prev, attachments: newAtt };
      });
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          let success = false;
          if (editingItem.id) {
              success = await updateAnnouncement(editingItem);
          } else {
              success = await addAnnouncement(
                  editingItem.title!, 
                  editingItem.content!, 
                  editingItem.type as any, 
                  editingItem.link || '', 
                  user?.name || 'Admin',
                  editingItem.clusterId || 'area',
                  editingItem.attachments
              );
          }

          if (success) {
              setIsModalOpen(false);
              onDataUpdate();
          } else {
              alert('เกิดข้อผิดพลาดในการบันทึก');
          }
      } catch (err) {
          alert('Error: ' + err);
      } finally {
          setIsSaving(false);
      }
  };

  if (!canManage) {
      return <div className="p-8 text-center text-gray-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Megaphone className="w-6 h-6 mr-2 text-orange-500" />
                  จัดการข่าวและคู่มือ (Announcements)
              </h2>
              <p className="text-gray-500 text-sm mt-1">เพิ่ม แก้ไข หรือลบข่าวประชาสัมพันธ์และคู่มือการใช้งาน</p>
          </div>
          <button 
              onClick={handleAdd}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
          >
              <Plus className="w-4 h-4 mr-2" /> เพิ่มรายการใหม่
          </button>
      </div>

      {/* Scope Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button
              onClick={() => setActiveScope('area')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeScope === 'area' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <Trophy className="w-4 h-4 mr-2" /> ระดับเขตพื้นที่
          </button>
          <button
              onClick={() => setActiveScope('cluster')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeScope === 'cluster' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              <LayoutGrid className="w-4 h-4 mr-2" /> ระดับกลุ่มเครือข่าย
          </button>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveType('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeType === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>ทั้งหมด</button>
          <button onClick={() => setActiveType('news')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeType === 'news' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-200'}`}>ข่าวประชาสัมพันธ์</button>
          <button onClick={() => setActiveType('manual')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${activeType === 'manual' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-600 border-green-200'}`}>คู่มือการใช้งาน</button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
          {filteredList.length > 0 ? filteredList.map(item => {
              const clusterName = item.clusterId === 'area' ? 'เขตพื้นที่' : data.clusters.find(c => c.ClusterID === item.clusterId)?.ClusterName || item.clusterId;
              return (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow group relative overflow-hidden">
                      {/* Left border indicator */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.clusterId === 'area' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex-1 pl-2">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.type === 'news' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                  {item.type === 'news' ? 'NEWS' : 'MANUAL'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.clusterId === 'area' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                  {clusterName}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center ml-auto md:ml-0">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(item.date).toLocaleDateString('th-TH')}
                              </span>
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                          
                          {/* Attachments Indicator */}
                          {item.attachments && item.attachments.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                  {item.attachments.map((att, idx) => (
                                      <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center">
                                          {att.type.includes('image') ? <ImageIcon className="w-3 h-3 mr-1"/> : <FileText className="w-3 h-3 mr-1"/>}
                                          {att.name}
                                      </span>
                                  ))}
                              </div>
                          )}

                          {item.link && (
                              <a href={item.link} target="_blank" className="text-xs text-blue-500 hover:underline mt-2 inline-flex items-center">
                                  <LinkIcon className="w-3 h-3 mr-1" /> {item.link}
                              </a>
                          )}
                      </div>
                      <div className="flex md:flex-col items-center justify-end gap-2 md:border-l md:border-gray-100 md:pl-4">
                          <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                          >
                              <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={() => setConfirmDelete({ isOpen: true, id: item.id })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              );
          }) : (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-gray-500">ไม่พบรายการ</p>
              </div>
          )}
      </div>

      {/* Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 flex items-center">
                          {editingItem.id ? <Edit2 className="w-5 h-5 mr-2 text-blue-600"/> : <Plus className="w-5 h-5 mr-2 text-blue-600"/>}
                          {editingItem.id ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                      {/* Scope Selector (Only visible if Admin and not locked to group) */}
                      {!isGroupAdmin && (
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">เป้าหมาย (Scope)</label>
                              <select 
                                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                  value={editingItem.clusterId === 'area' ? 'area' : 'cluster'}
                                  onChange={e => {
                                      const val = e.target.value;
                                      setEditingItem({
                                          ...editingItem,
                                          clusterId: val === 'area' ? 'area' : (data.clusters[0]?.ClusterID || '')
                                      });
                                  }}
                              >
                                  <option value="area">ระดับเขตพื้นที่ (Area)</option>
                                  <option value="cluster">ระดับกลุ่มเครือข่าย (Cluster)</option>
                              </select>
                          </div>
                      )}

                      {/* Cluster Selector (If scope is cluster) */}
                      {editingItem.clusterId !== 'area' && (
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">เลือกกลุ่มเครือข่าย</label>
                              <select 
                                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                                  value={editingItem.clusterId}
                                  onChange={e => setEditingItem({...editingItem, clusterId: e.target.value})}
                                  disabled={isGroupAdmin} // Group admin cannot change cluster
                              >
                                  {data.clusters.map(c => (
                                      <option key={c.ClusterID} value={c.ClusterID}>{c.ClusterName}</option>
                                  ))}
                              </select>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ (Title)</label>
                          <input 
                              required
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                              value={editingItem.title} 
                              onChange={e => setEditingItem({...editingItem, title: e.target.value})} 
                              placeholder="หัวข้อข่าว..."
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท (Type)</label>
                          <select 
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              value={editingItem.type}
                              onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}
                          >
                              <option value="news">ข่าวประชาสัมพันธ์</option>
                              <option value="manual">คู่มือการใช้งาน</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (Content)</label>
                          <textarea 
                              required
                              className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" 
                              value={editingItem.content} 
                              onChange={e => setEditingItem({...editingItem, content: e.target.value})} 
                              placeholder="รายละเอียด..."
                          />
                      </div>
                      
                      {/* File Upload Section */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                              <span>ไฟล์แนบ (Attachments)</span>
                              <span className="text-xs text-gray-400">รูปภาพ หรือ PDF</span>
                          </label>
                          
                          {/* File List */}
                          <div className="space-y-2 mb-2">
                              {editingItem.attachments?.map((att, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                                      <div className="flex items-center truncate mr-2">
                                          {att.type.includes('image') ? <ImageIcon className="w-4 h-4 mr-2 text-purple-500"/> : <FileText className="w-4 h-4 mr-2 text-red-500"/>}
                                          <span className="truncate">{att.name}</span>
                                      </div>
                                      <button type="button" onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500">
                                          <X className="w-4 h-4"/>
                                      </button>
                                  </div>
                              ))}
                          </div>

                          <div className="flex items-center gap-2">
                              <button 
                                  type="button" 
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isUploading}
                                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-200 flex items-center transition-colors"
                              >
                                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Paperclip className="w-4 h-4 mr-2"/>}
                                  เลือกไฟล์
                              </button>
                              <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  className="hidden" 
                                  multiple 
                                  accept="image/*,.pdf"
                                  onChange={handleFileUpload}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ลิงก์ภายนอก (Optional)</label>
                          <input 
                              type="url"
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                              value={editingItem.link} 
                              onChange={e => setEditingItem({...editingItem, link: e.target.value})} 
                              placeholder="https://..."
                          />
                      </div>

                      <div className="pt-4 flex justify-end gap-2">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">ยกเลิก</button>
                          <button 
                              type="submit" 
                              disabled={isSaving || isUploading}
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
          title="ยืนยันการลบ"
          description="คุณต้องการลบรายการนี้ใช่หรือไม่?"
          confirmLabel="ลบข้อมูล"
          confirmColor="red"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
          isLoading={isSaving}
      />
    </div>
  );
};

export default AnnouncementManager;
