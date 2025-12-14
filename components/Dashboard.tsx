import React, { useState, useMemo } from 'react';
import { AppData, Announcement, User } from '../types';
import { Users, School, Trophy, FileText, Megaphone, Plus, Book, Calendar, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import StatCard from './StatCard';
import { getTeamCountByStatus, getTeamsByActivity } from '../services/api';

interface DashboardProps {
  data: AppData;
  user?: User | null;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const Dashboard: React.FC<DashboardProps> = ({ data, user }) => {
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  const [showAddNews, setShowAddNews] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'news' | 'manual'>('news');
  const [newLink, setNewLink] = useState('');

  // Filter teams based on view level
  const filteredTeams = useMemo(() => {
    if (viewLevel === 'area') {
        // Show only teams that made it to the Area level
        return data.teams.filter(t => t.stageStatus === 'Area' || t.flag === 'TRUE');
    }
    return data.teams;
  }, [data.teams, viewLevel]);

  // Recalculate Stats for current view
  const statusData = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTeams.forEach(team => {
        counts[team.status] = (counts[team.status] || 0) + 1;
      });
      return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredTeams]);

  // Unique schools in the filtered list
  const uniqueSchoolCount = useMemo(() => {
      return new Set(filteredTeams.map(t => t.schoolId)).size;
  }, [filteredTeams]);

   // Unique activities in the filtered list
   const uniqueActivityCount = useMemo(() => {
    return new Set(filteredTeams.map(t => t.activityId)).size;
   }, [filteredTeams]);


  const handleAddNews = async (e: React.FormEvent) => {
      e.preventDefault();
      // Call Backend (Mocking the fetch here as direct API call isn't fully set up in api.ts yet for this specific action in the prompt context, 
      // but in real app use fetch to the script URL)
      const API_URL = "https://script.google.com/macros/s/AKfycbyYcf6m-3ypN3aX8F6prN0BLQcz0JyW0gj3Tq8dJyMs54gaTXSv_1uytthNu9H4CmMy/exec";
      try {
          await fetch(`${API_URL}?action=addAnnouncement&title=${encodeURIComponent(newTitle)}&content=${encodeURIComponent(newContent)}&type=${newType}&link=${encodeURIComponent(newLink)}&author=${user?.name || 'Admin'}`, {
              method: 'POST',
              mode: 'no-cors' // Google Apps Script simple trigger limitation workaround
          });
          alert('เพิ่มข้อมูลสำเร็จ! (กรุณารีเฟรชหน้าเว็บเพื่อดูข้อมูลล่าสุด)');
          setShowAddNews(false);
          setNewTitle('');
          setNewContent('');
      } catch (err) {
          alert('เกิดข้อผิดพลาดในการบันทึก');
      }
  };

  const isAdmin = user?.level === 'admin';
  const announcements = data.announcements || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
            <h1 className="text-3xl font-bold mb-2">ยินดีต้อนรับสู่ CompManager</h1>
            <p className="text-blue-100 opacity-90">ระบบบริหารจัดการการแข่งขันวิชาการแบบครบวงจร</p>
        </div>
        
        {/* Level Selector */}
        <div className="bg-white/10 p-1 rounded-xl backdrop-blur-sm flex">
            <button
                onClick={() => setViewLevel('cluster')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-white hover:bg-white/20'}`}
            >
                ระดับกลุ่มเครือข่าย
            </button>
            <button
                onClick={() => setViewLevel('area')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-white hover:bg-white/20'}`}
            >
                ระดับเขตพื้นที่
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: News & Manuals */}
          <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                      <Megaphone className="w-6 h-6 mr-2 text-orange-500" />
                      ข่าวประชาสัมพันธ์และคู่มือ
                  </h2>
                  {isAdmin && (
                      <button 
                        onClick={() => setShowAddNews(true)}
                        className="flex items-center px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                          <Plus className="w-4 h-4 mr-1" /> เพิ่มข่าว/คู่มือ
                      </button>
                  )}
              </div>

              {/* News Feed */}
              <div className="space-y-4">
                  {announcements.length > 0 ? (
                      announcements.map((item) => (
                          <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                              <div className={`absolute top-0 left-0 w-1 h-full ${item.type === 'manual' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                              <div className="flex justify-between items-start mb-2">
                                  <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold tracking-wider ${item.type === 'manual' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {item.type === 'manual' ? 'Manual' : 'News'}
                                  </span>
                                  <span className="text-xs text-gray-400 flex items-center">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {new Date(item.date).toLocaleDateString('th-TH')}
                                  </span>
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                              <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-3">
                                  {item.content}
                              </p>
                              {item.link && (
                                  <a href={item.link} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center mt-2">
                                      {item.type === 'manual' ? <Book className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                                      {item.type === 'manual' ? 'เปิดคู่มือ' : 'อ่านเพิ่มเติม'}
                                  </a>
                              )}
                          </div>
                      ))
                  ) : (
                      <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                          ยังไม่มีข่าวประชาสัมพันธ์
                      </div>
                  )}
              </div>
          </div>

          {/* Right Column: Stats Overview (Dynamic based on viewLevel) */}
          <div className="space-y-6">
             <h2 className="text-xl font-bold text-gray-800">
                 สถิติ ({viewLevel === 'cluster' ? 'Network' : 'District'})
             </h2>
             
             <div className="grid grid-cols-1 gap-4">
                <StatCard 
                    title="ทีมทั้งหมด" 
                    value={filteredTeams.length} 
                    icon={Users} 
                    colorClass="bg-blue-500" 
                />
                <StatCard 
                    title="โรงเรียน" 
                    value={uniqueSchoolCount} 
                    icon={School} 
                    colorClass="bg-indigo-500" 
                />
                <StatCard 
                    title="รายการแข่งขัน" 
                    value={uniqueActivityCount} 
                    icon={Trophy} 
                    colorClass="bg-amber-500" 
                />
             </div>

             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">สถานะการลงทะเบียน</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip contentStyle={{fontFamily: 'Kanit', fontSize: '12px'}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
             </div>
          </div>
      </div>

      {/* Admin Add News Modal */}
      {showAddNews && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">เพิ่มข่าว/คู่มือ</h3>
                  <form onSubmit={handleAddNews} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
                          <input type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newType} onChange={e => setNewType(e.target.value as any)}>
                              <option value="news">ข่าวประชาสัมพันธ์</option>
                              <option value="manual">คู่มือการใช้งาน</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                          <textarea required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" value={newContent} onChange={e => setNewContent(e.target.value)}></textarea>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ลิงก์ (ถ้ามี)</label>
                          <input type="url" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." value={newLink} onChange={e => setNewLink(e.target.value)} />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setShowAddNews(false)} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">บันทึก</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;