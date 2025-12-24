
import React, { useState, useEffect } from 'react';
import { AppData, User, AppConfig } from '../types';
import { Save, Loader2, Lock, Eye, EyeOff, LayoutDashboard, MonitorPlay, Users, MapPin, Trophy, Edit3, Award, Printer, FileBadge, IdCard, Gavel, Megaphone, School, UserCog } from 'lucide-react';
import { saveAppConfig } from '../services/api';

interface SettingsViewProps {
  data: AppData;
  user?: User | null;
  onDataUpdate: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ data, user, onDataUpdate }) => {
  // Use same defaults as Layout to ensure consistency
  const defaults: AppConfig = {
      menu_live: true, menu_teams: true, menu_venues: true, menu_activities: true,
      menu_score: true, menu_results: true, menu_documents: true, menu_certificates: true,
      menu_idcards: true, menu_judges: true, menu_announcements: true, menu_schools: true, menu_users: true
  };

  const [config, setConfig] = useState<AppConfig>({ ...defaults, ...(data.appConfig || {}) });
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const role = user?.level?.toLowerCase();
  const isAdminOrArea = role === 'admin' || role === 'area';

  useEffect(() => {
      // Re-merge when data updates
      setConfig({ ...defaults, ...(data.appConfig || {}) });
  }, [data.appConfig]);

  if (!isAdminOrArea) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Lock className="w-16 h-16 mb-4 text-gray-300" />
              <h2 className="text-xl font-bold text-gray-700">จำกัดสิทธิ์การเข้าถึง</h2>
              <p className="text-sm">เฉพาะผู้ดูแลระบบ (Admin/Area) เท่านั้นที่สามารถตั้งค่าระบบได้</p>
          </div>
      );
  }

  const handleToggle = (key: keyof AppConfig) => {
      setConfig(prev => ({ ...prev, [key]: !prev[key] }));
      setMessage(null);
  };

  const handleSave = async () => {
      setIsSaving(true);
      setMessage(null);
      try {
          const success = await saveAppConfig(config);
          if (success) {
              setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
              onDataUpdate();
          } else {
              setMessage({ type: 'error', text: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' });
          }
      } catch (e) {
          setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
      } finally {
          setIsSaving(false);
      }
  };

  const menuItems = [
      { key: 'menu_live', label: 'Live Score', icon: MonitorPlay },
      { key: 'menu_teams', label: 'ทีม (Teams)', icon: Users },
      { key: 'menu_venues', label: 'สนาม/วันแข่ง (Venues)', icon: MapPin },
      { key: 'menu_activities', label: 'รายการ (Activities)', icon: Trophy },
      { key: 'menu_score', label: 'บันทึกคะแนน (Score Entry)', icon: Edit3 },
      { key: 'menu_results', label: 'ผลรางวัล (Results)', icon: Award },
      { key: 'menu_documents', label: 'เอกสารการแข่งขัน (Documents)', icon: Printer },
      { key: 'menu_certificates', label: 'เกียรติบัตร (Certificates)', icon: FileBadge },
      { key: 'menu_idcards', label: 'บัตรประจำตัว (ID Cards)', icon: IdCard },
      { key: 'menu_judges', label: 'ทำเนียบกรรมการ (Judges)', icon: Gavel },
      { key: 'menu_announcements', label: 'ข่าว/คู่มือ (Announcements)', icon: Megaphone },
      { key: 'menu_schools', label: 'โรงเรียน (Schools)', icon: School },
      { key: 'menu_users', label: 'ผู้ใช้งาน (Users)', icon: UserCog },
  ];

  return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="mb-6 border-b border-gray-100 pb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                      <LayoutDashboard className="w-6 h-6 mr-2 text-blue-600" />
                      ตั้งค่าการแสดงผลเมนู (Menu Visibility)
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">กำหนดเมนูที่ต้องการให้ผู้ใช้งานทั่วไปมองเห็น (Admin/Area จะมองเห็นทุกเมนูเสมอ)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => {
                      const isVisible = config[item.key as keyof AppConfig] !== false; // Treat undefined as true
                      return (
                          <div 
                              key={item.key} 
                              className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${isVisible ? 'bg-white border-gray-200 hover:border-blue-300 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                              onClick={() => handleToggle(item.key as keyof AppConfig)}
                          >
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${isVisible ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                      <item.icon className="w-5 h-5" />
                                  </div>
                                  <span className="font-medium text-sm text-gray-700">{item.label}</span>
                              </div>
                              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isVisible ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isVisible ? 'translate-x-4' : 'translate-x-0'}`}></div>
                              </div>
                          </div>
                      );
                  })}
              </div>

              {message && (
                  <div className={`mt-6 p-3 rounded-lg text-sm font-medium flex items-center justify-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {message.type === 'success' ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                      {message.text}
                  </div>
              )}

              <div className="mt-8 flex justify-end">
                  <button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-bold flex items-center disabled:opacity-70"
                  >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      บันทึกการตั้งค่า
                  </button>
              </div>
          </div>
      </div>
  );
};

export default SettingsView;
