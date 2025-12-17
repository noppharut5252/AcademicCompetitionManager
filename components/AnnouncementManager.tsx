
import React, { useState, useRef } from 'react';
import { AppData, User, Announcement, AnnouncementAttachment } from '../types';
import { Megaphone, Plus, Edit2, Trash2, Link as LinkIcon, Save, X, FileText, Loader2, Calendar, LayoutGrid, Trophy, Paperclip, Image as ImageIcon } from 'lucide-react';
import { addAnnouncement, updateAnnouncement, deleteAnnouncement, uploadImage } from '../services/api';
import { resizeImage } from '../services/utils';
import ConfirmationModal from './ConfirmationModal';
import SearchableSelect from './SearchableSelect';

interface AnnouncementManagerProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ data, user, onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState<'district' | 'cluster'>('district'); 
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>(''); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Edit State
  const [editingItem, setEditingItem] = useState<Partial<Announcement>>({
      title: '', content: '', type: 'news', link: '', clusterId: '', attachments: '[]'
  });
  const [attachments, setAttachments] = useState<AnnouncementAttachment[]>([]);
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission Check
  const userRole = user?.level?.toLowerCase() || '';
  const isAdminOrArea = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const canManage = isAdminOrArea || isGroupAdmin;
  
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  // Filter Logic for List
  const filteredList = data.announcements.filter(a => {
      // Tab Filtering
      if (activeTab === 'district') {
          return !a.clusterId; // Empty clusterId = District
      } else {
          // Cluster Tab
          if (!a.clusterId) return false;
          // Apply User/Filter Logic
          if (isGroupAdmin) return a.clusterId === userClusterID;
          if (selectedClusterFilter) return a.clusterId === selectedClusterFilter;
          return true; // Admin viewing all clusters
      }
  });

  const canEditItem = (item: Announcement) => {
      if (isAdminOrArea) return true;
      if (isGroupAdmin) {
          // Can only edit if it belongs to their cluster
          return item.clusterId === userClusterID;
      }
      return false;
  };

  const handleEdit = (item: Announcement) => {
      setEditingItem(item);
      try {
          const parsed = item.attachments ? JSON.parse(item.attachments) : [];
          setAttachments(parsed);
      } catch { setAttachments([]); }
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      setEditingItem({ 
          title: '', 
          content: '', 
          type: 'news', 
          link: '', 
          clusterId: activeTab === 'cluster' ? (isGroupAdmin ? userClusterID : selectedClusterFilter) : '',
          attachments: '[]'
      });
      setAttachments([]);
      setIsModalOpen(true);
  };

  const handleDelete = async () => {
      if (confirmDelete.id) {
          setIsSaving(true); 
          const success = await deleteAnnouncement(confirmDelete.id);
          setIsSaving(false);
          setConfirmDelete({ isOpen: false, id: null });
          if (success) {
              alert('ลบข้อมูลเรียบร้อย');
              onDataUpdate();
          } else {
              alert('ลบข้อมูลไม่สำเร็จ');
          }
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          let base64 = '';
          let mimeType = file.type;
          
          if (file.type.startsWith('image/')) {
              // Resize images
              base64 = await resizeImage(file, 1024, 1024, 0.8);
              mimeType = 'image/jpeg';
          } else {
              // Read other files as base64
              const reader = new FileReader();
              base64 = await new Promise((resolve) => {
                  reader.onload = (e) => resolve(e.target?.result as string);
                  reader.readAsDataURL(file);
              });
          }

          const res = await uploadImage(base64, `news_${Date.now()}_${file.name}`, mimeType);
          
          if (res.status === 'success' && res.fileUrl) {
              const newAttach: AnnouncementAttachment = {
                  type: file.type.startsWith('image/') ? 'image' : 'file',
                  url: res.fileUrl,
                  name: file.name
              };
              setAttachments([...attachments, newAttach]);
          } else {
              alert('Upload failed: ' + res.message);
          }
      } catch (err) {
          alert('Error uploading file');
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const removeAttachment = (index: number) => {
      setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          let success = false;
          if (editingItem.id) {
              const finalItem = {
                  ...editingItem,
                  attachments: JSON.stringify(attachments)
              };
              success = await updateAnnouncement(finalItem);
          } else {
              success = await addAnnouncement(
                  editingItem.title || '', 
                  editingItem.content || '', 
                  (editingItem.type as 'news' | 'manual') || 'news', 
                  editingItem.link || '', 
                  user?.name || 'Admin',
                  editingItem.clusterId || '',
                  attachments
              );
          }

          if (success) {
              alert('บันทึกข้อมูลเรียบร้อย');
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
              <p className="text-gray-500 text-sm mt-1">เพิ่ม แก้ไข ข่าวสารระดับเขตและกลุ่มเครือข่าย</p>
          </div>
          
          <div className="flex gap-2">
              {/* Level Toggle */}
              <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
                  <button
                      onClick={() => setActiveTab('district')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'district' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <Trophy className="w-4 h-4 mr-2" /> ระดับเขต
                  </button>
                  <button
                      onClick={() => setActiveTab('cluster')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center ${activeTab === 'cluster' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <LayoutGrid className="w-4 h-4 mr-2" /> ระดับกลุ่ม
                  </button>
              </div>
          </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {activeTab === 'cluster' && isAdminOrArea && (
              <div className="w-full md:w-64">
                  <SearchableSelect 
                      options={[{ label: 'ทุกกลุ่มเครือข่าย', value: '' }, ...data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                      value={selectedClusterFilter}
                      onChange={setSelectedClusterFilter}
                      placeholder="กรองตามกลุ่ม..."
                      icon={<LayoutGrid className="w-4 h-4"/>}
                  />
              </div>
          )}
          
          {/* Add Button - Disable if Admin on Cluster tab without selecting, or Group Admin on District Tab */}
          {(
              (activeTab === 'district' && isAdminOrArea) ||
              (activeTab === 'cluster' && (isGroupAdmin || (isAdminOrArea && selectedClusterFilter)))
          ) && (
              <button 
                  onClick={handleAdd}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm ml-auto"
              >
                  <Plus className="w-4 h-4 mr-2" /> เพิ่มข่าวใหม่ ({activeTab === 'district' ? 'เขต' : 'กลุ่ม'})
              </button>
          )}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
          {filteredList.length > 0 ? filteredList.map(item => {
              const clusterName = item.clusterId ? data.clusters.find(c => c.ClusterID === item.clusterId)?.ClusterName : 'ระดับเขตพื้นที่';
              const editable = canEditItem(item);
              let attachCount = 0;
              try { attachCount = JSON.parse(item.attachments || '[]').length; } catch {}

              return (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow group relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.clusterId ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                      
                      <div className="flex-1 pl-2">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.type === 'news' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                  {item.type === 'news' ? 'NEWS' : 'MANUAL'}
                              </span>
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center">
                                  {item.clusterId ? <LayoutGrid className="w-3 h-3 mr-1"/> : <Trophy className="w-3 h-3 mr-1"/>}
                                  {clusterName}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(item.date).toLocaleDateString('th-TH')}
                              </span>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                          
                          <div className="flex flex-wrap gap-3 mt-3 text-xs text-blue-500">
                              {item.link && (
                                  <a href={item.link} target="_blank" className="hover:underline inline-flex items-center">
                                      <LinkIcon className="w-3 h-3 mr-1" /> ลิงก์แนบ
                                  </a>
                              )}
                              {attachCount > 0 && (
                                  <span className="inline-flex items-center text-gray-500">
                                      <Paperclip className="w-3 h-3 mr-1" /> {attachCount} ไฟล์แนบ
                                  </span>
                              )}
                          </div>
                      </div>
                      
                      {editable && (
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
                      )}
                  </div>
              );
          }) : (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-gray-500">ไม่พบข่าวสารในส่วนนี้</p>
              </div>
          )}
      </div>

      {/* Edit/Add Modal */}
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
                      {/* Context Display */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-center mb-2">
                          {editingItem.clusterId ? (
                              <><LayoutGrid className="w-4 h-4 mr-2"/> โพสต์ลง: <b>{data.clusters.find(c => c.ClusterID === editingItem.clusterId)?.ClusterName}</b></>
                          ) : (
                              <><Trophy className="w-4 h-4 mr-2"/> โพสต์ลง: <b>ระดับเขตพื้นที่ (ส่วนกลาง)</b></>
                          )}
                      </div>

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
                              className="w-full border rounded-lg px-3 py-2 text-sm h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none" 
                              value={editingItem.content} 
                              onChange={e => setEditingItem({...editingItem, content: e.target.value})} 
                              placeholder="รายละเอียด..."
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ลิงก์แนบ (Optional)</label>
                          <input 
                              type="url"
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                              value={editingItem.link} 
                              onChange={e => setEditingItem({...editingItem, link: e.target.value})} 
                              placeholder="https://..."
                          />
                      </div>

                      {/* Attachment Section */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ไฟล์แนบ (รูปภาพ/เอกสาร)</label>
                          <div className="space-y-2 mb-2">
                              {attachments.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                                      <div className="flex items-center overflow-hidden">
                                          {file.type === 'image' ? <ImageIcon className="w-4 h-4 mr-2 text-blue-500"/> : <FileText className="w-4 h-4 mr-2 text-gray-500"/>}
                                          <a href={file.url} target="_blank" className="truncate hover:underline text-blue-600">{file.name}</a>
                                      </div>
                                      <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-3 h-3"/></button>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="flex items-center gap-2">
                              <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  className="hidden" 
                                  onChange={handleFileUpload}
                              />
                              <button 
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isUploading}
                                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-200 text-xs flex items-center"
                              >
                                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Paperclip className="w-3 h-3 mr-1"/>}
                                  อัปโหลดไฟล์
                              </button>
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
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

