
import React, { useState } from 'react';
import { User, AppData } from '../types';
import { User as UserIcon, Save, School, Shield, Mail, Phone, Loader2, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { linkLineAccount } from '../services/api';
import { initLiff, loginLiff } from '../services/liff';

interface ProfileViewProps {
  user: User;
  data: AppData;
  onUpdateUser: (updatedUser: User) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, data, onUpdateUser }) => {
  const [name, setName] = useState(user.name || user.displayName || '');
  const [surname, setSurname] = useState(user.surname || '');
  const [tel, setTel] = useState(user.tel || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const school = data.schools.find(s => s.SchoolID === user.SchoolID);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
       // Simulate API Call for basic profile update
       await new Promise(resolve => setTimeout(resolve, 1000));
       
       const updatedUser = { ...user, name, surname, tel };
       onUpdateUser(updatedUser);
       setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    } catch (err) {
       setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
       setIsSaving(false);
    }
  };

  const handleLinkLine = async () => {
      setIsLinking(true);
      setMessage(null);
      try {
          // 1. Check if LIFF is ready
          const liffProfile = await initLiff();
          
          if (!liffProfile) {
              // Not logged in to LINE/LIFF -> Trigger Login
              // This will redirect, so the flow stops here.
              // When they come back, they need to navigate here again to finalize (or we assume standard login flow).
              loginLiff(); 
              return;
          }

          // 2. Call Backend to link
          const success = await linkLineAccount(user.userid, liffProfile.userId);
          
          if (success) {
              const updatedUser = { ...user, userline_id: liffProfile.userId };
              onUpdateUser(updatedUser);
              setMessage({ type: 'success', text: 'เชื่อมต่อบัญชี LINE เรียบร้อยแล้ว' });
          } else {
              setMessage({ type: 'error', text: 'ไม่สามารถเชื่อมต่อบัญชีได้ หรือบัญชีนี้ถูกใช้ไปแล้ว' });
          }

      } catch (e) {
          setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE' });
      } finally {
          setIsLinking(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">ข้อมูลส่วนตัว (Profile)</h2>
        <p className="text-gray-500">จัดการข้อมูลผู้ใช้งานและตรวจสอบสถานะบัญชี</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Status */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div className="relative mb-4 group">
                    {user.pictureUrl || user.avatarFileId ? (
                        <img 
                            src={user.pictureUrl || `https://drive.google.com/thumbnail?id=${user.avatarFileId}`} 
                            alt="Profile" 
                            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-4 border-white shadow-lg">
                            <UserIcon className="w-16 h-16" />
                        </div>
                    )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{name} {surname}</h3>
                <p className="text-sm text-gray-500 mb-4">@{user.username || 'user'}</p>
                
                <div className="w-full pt-4 border-t border-gray-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center"><Shield className="w-4 h-4 mr-2" /> สิทธิ์การใช้งาน</span>
                        <span className="font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs uppercase">{user.level || 'User'}</span>
                    </div>
                </div>

                {/* LINE Connection Status */}
                <div className="w-full pt-4 mt-2 border-t border-gray-100">
                     <div className="mb-2 text-xs text-gray-400 font-medium uppercase tracking-wider text-left">LINE Connection</div>
                     {user.userline_id ? (
                         <div className="flex items-center justify-center p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                             <CheckCircle className="w-4 h-4 mr-2" />
                             เชื่อมต่อแล้ว
                         </div>
                     ) : (
                         <button 
                            onClick={handleLinkLine}
                            disabled={isLinking}
                            className="w-full flex items-center justify-center p-3 bg-[#06C755] text-white rounded-lg text-sm font-medium hover:bg-[#05b34c] transition-colors disabled:opacity-70"
                         >
                             {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                             เชื่อมต่อกับ LINE
                         </button>
                     )}
                </div>
            </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">แก้ไขข้อมูล</h3>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ (Name)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล (Surname)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">โรงเรียน / หน่วยงาน</label>
                            <div className="flex items-center w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed">
                                <School className="w-4 h-4 mr-2 text-gray-400" />
                                {school?.SchoolName || 'ไม่ระบุหน่วยงาน'}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">* หากต้องการแก้ไขข้อมูลโรงเรียน กรุณาติดต่อผู้ดูแลระบบ</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                                <div className="flex items-center w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                    {user.email || '-'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                <input 
                                    type="tel" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={tel}
                                    onChange={(e) => setTel(e.target.value)}
                                    placeholder="08xxxxxxxx"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="flex items-center px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                                บันทึกการเปลี่ยนแปลง
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
