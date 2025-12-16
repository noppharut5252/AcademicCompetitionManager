
import React, { useState, useMemo } from 'react';
import { AppData, Announcement, User, AreaStageInfo } from '../types';
import { Users, School, Trophy, Megaphone, Plus, Book, Calendar, ChevronRight, Gavel, MapPin, Award, FileText, Smartphone, Loader2, PieChart, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import StatCard from './StatCard';
import { useNavigate } from 'react-router-dom';
import { addAnnouncement } from '../services/api';

interface DashboardProps {
  data: AppData;
  user?: User | null;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];
const MEDAL_COLORS = { 'Gold': '#FFD700', 'Silver': '#C0C0C0', 'Bronze': '#CD7F32', 'Participant': '#3B82F6' };

const Dashboard: React.FC<DashboardProps> = ({ data, user }) => {
  const navigate = useNavigate();
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  const [showAddNews, setShowAddNews] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'news' | 'manual'>('news');
  const [newLink, setNewLink] = useState('');
  const [isAddingNews, setIsAddingNews] = useState(false);

  // Helper to check Area Status
  const isAreaTeam = (team: any) => {
      // Logic: Explicit StageStatus OR Flag (Representative)
      const isExplicitArea = team.stageStatus === 'Area';
      const isRep = String(team.flag).trim().toUpperCase() === 'TRUE';
      return isExplicitArea || isRep;
  };

  const getAreaInfo = (team: any): AreaStageInfo | null => {
      try { return JSON.parse(team.stageInfo); } catch { return null; }
  };

  // Filter teams based on view level
  const filteredTeams = useMemo(() => {
    if (viewLevel === 'area') {
        return data.teams.filter(t => isAreaTeam(t));
    }
    return data.teams;
  }, [data.teams, viewLevel]);

  // Dynamic Chart Data based on View Level
  const chartData = useMemo(() => {
      if (viewLevel === 'area') {
          // AREA VIEW: Show Medal Distribution
          const counts: Record<string, number> = { 'Gold': 0, 'Silver': 0, 'Bronze': 0, 'Participant': 0 };
          filteredTeams.forEach(team => {
              const info = getAreaInfo(team);
              // Priority: Manual Medal -> Score Calculation -> Participant
              let medal = info?.medal || team.medalOverride;
              if (!medal) {
                  const score = info?.score || 0;
                  if (score >= 80) medal = 'Gold';
                  else if (score >= 70) medal = 'Silver';
                  else if (score >= 60) medal = 'Bronze';
                  else medal = 'Participant';
              }
              // Normalize medal string
              if (medal.includes('Gold')) counts['Gold']++;
              else if (medal.includes('Silver')) counts['Silver']++;
              else if (medal.includes('Bronze')) counts['Bronze']++;
              else counts['Participant']++;
          });
          return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
      } else {
          // CLUSTER VIEW: Show Registration Status
          const counts: Record<string, number> = {};
          filteredTeams.forEach(team => {
            const rawStatus = String(team.status);
            let statusLabel = rawStatus;
            
            if (rawStatus === '1' || rawStatus === 'Approved') statusLabel = 'อนุมัติ';
            else if (rawStatus === '0' || rawStatus === 'Pending') statusLabel = 'รอตรวจ';
            else if (rawStatus === '2' || rawStatus === '-1' || rawStatus === 'Rejected') statusLabel = 'แก้ไข';
            
            counts[statusLabel] = (counts[statusLabel] || 0) + 1;
          });
          return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
      }
  }, [filteredTeams, viewLevel]);

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
      setIsAddingNews(true);
      try {
          const success = await addAnnouncement(newTitle, newContent, newType, newLink, user?.name || 'Admin');
          if (success) {
              alert('เพิ่มข้อมูลสำเร็จ! (กรุณารีเฟรชหน้าเว็บเพื่อดูข้อมูลล่าสุด)');
              setShowAddNews(false);
              setNewTitle('');
              setNewContent('');
              setNewLink('');
          } else {
              alert('เกิดข้อผิดพลาดในการบันทึก');
          }
      } catch (err) {
          alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      } finally {
          setIsAddingNews(false);
      }
  };

  const isAdmin = user?.level === 'admin';
  const newsList = (data.announcements || []).filter(a => a.type !== 'manual');
  const manualList = (data.announcements || []).filter(a => a.type === 'manual');

  const QuickMenuItem = ({ icon: Icon, label, to, color }: { icon: any, label: string, to: string, color: string }) => (
      <div 
        onClick={() => navigate(to)}
        className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer"
      >
          <div className={`p-3 rounded-full ${color} text-white mb-2 shadow-md`}>
              <Icon className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-gray-700 text-center leading-tight">{label}</span>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Hero / Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-40 h-40" />
        </div>
        <div className="relative z-10 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">ยินดีต้อนรับสู่ CompManager</h1>
            <p className="text-blue-100 opacity-90 text-sm md:text-base">ระบบบริหารจัดการการแข่งขันวิชาการแบบครบวงจร</p>
            {user && !user.isGuest && (
                <div className="mt-4 inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-medium text-white border border-white/30">
                    <Users className="w-3 h-3 mr-2" /> สวัสดี, {user.displayName || user.name}
                </div>
            )}
        </div>
        
        {/* Level Selector */}
        <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-md flex relative z-10">
            <button
                onClick={() => setViewLevel('cluster')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-white/80 hover:bg-white/10'}`}
            >
                ระดับกลุ่มฯ
            </button>
            <button
                onClick={() => setViewLevel('area')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'}`}
            >
                ระดับเขตฯ
            </button>
        </div>
      </div>

      {/* Mobile Quick Menu (Only on small screens) */}
      <div className="grid grid-cols-4 gap-3 md:hidden">
          <QuickMenuItem icon={Users} label="ทีมแข่งขัน" to="/teams" color="bg-blue-500" />
          <QuickMenuItem icon={Award} label="ผลรางวัล" to="/results" color="bg-yellow-500" />
          <QuickMenuItem icon={MapPin} label="สนามแข่ง" to="/venues" color="bg-emerald-500" />
          <QuickMenuItem icon={Gavel} label="กรรมการ" to="/judges" color="bg-purple-500" />
          <QuickMenuItem icon={FileText} label="เกียรติบัตร" to="/certificates" color="bg-indigo-500" />
          <QuickMenuItem icon={Smartphone} label="Digital ID" to="/idcards" color="bg-pink-500" />
          <QuickMenuItem icon={School} label="โรงเรียน" to="/schools" color="bg-cyan-500" />
          <QuickMenuItem icon={Trophy} label="รายการ" to="/activities" color="bg-orange-500" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
            title={viewLevel === 'area' ? "ทีมระดับเขต (Area Teams)" : "ทีมทั้งหมด (All Teams)"}
            value={filteredTeams.length} 
            icon={Users} 
            colorClass="bg-blue-500"
            description={`ในรอบ${viewLevel === 'cluster' ? 'กลุ่มเครือข่าย' : 'เขตพื้นที่'}`} 
        />
        <StatCard 
            title="โรงเรียนที่เข้าร่วม" 
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
        
        {/* Dynamic Chart Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center justify-between">
             <div className="h-20 w-20">
                <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={viewLevel === 'area' ? (MEDAL_COLORS[entry.name as keyof typeof MEDAL_COLORS] || '#3B82F6') : COLORS[index % COLORS.length]} 
                                />
                            ))}
                        </Pie>
                    </RePieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex-1 ml-4">
                 <p className="text-xs font-bold text-gray-500 uppercase">
                     {viewLevel === 'area' ? 'สรุปเหรียญรางวัล' : 'สถานะการสมัคร'}
                 </p>
                 <div className="flex flex-wrap gap-2 mt-1">
                     {chartData.map((entry, idx) => (
                         <div key={idx} className="flex items-center text-[10px] text-gray-600">
                             <div 
                                className="w-2 h-2 rounded-full mr-1" 
                                style={{ backgroundColor: viewLevel === 'area' ? (MEDAL_COLORS[entry.name as keyof typeof MEDAL_COLORS] || '#3B82F6') : COLORS[idx % COLORS.length] }}
                             ></div>
                             {entry.name}: {entry.value}
                         </div>
                     ))}
                 </div>
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: News */}
          <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                      <Megaphone className="w-6 h-6 mr-2 text-orange-500" />
                      ข่าวประชาสัมพันธ์
                  </h2>
                  {isAdmin && (
                      <button 
                        onClick={() => setShowAddNews(true)}
                        className="flex items-center px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                          <Plus className="w-4 h-4 mr-1" /> เพิ่มข่าว
                      </button>
                  )}
              </div>

              <div className="space-y-4">
                  {newsList.length > 0 ? (
                      newsList.map((item) => (
                          <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                              <div className="flex justify-between items-start mb-2 pl-3">
                                  <span className="text-xs text-gray-400 flex items-center bg-gray-50 px-2 py-1 rounded-full">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {new Date(item.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </span>
                              </div>
                              <div className="pl-3">
                                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                  <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                      {item.content}
                                  </p>
                                  {item.link && (
                                      <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mt-1">
                                          อ่านเพิ่มเติม <ChevronRight className="w-4 h-4 ml-1" />
                                      </a>
                                  )}
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          ยังไม่มีข่าวประชาสัมพันธ์
                      </div>
                  )}
              </div>
          </div>

          {/* Right Column: Manuals & Links */}
          <div className="space-y-6">
             <h2 className="text-xl font-bold text-gray-800 flex items-center">
                 <Book className="w-6 h-6 mr-2 text-green-600" />
                 คู่มือการใช้งาน
             </h2>
             
             <div className="grid grid-cols-1 gap-4">
                {manualList.length > 0 ? (
                    manualList.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-green-200 transition-colors group">
                            <div className="flex items-start">
                                <div className="p-3 bg-green-50 text-green-600 rounded-lg mr-3 group-hover:bg-green-100 transition-colors">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-green-700 transition-colors">{item.title}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-2">{item.content}</p>
                                    {item.link && (
                                        <a href={item.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-green-600 mt-2 inline-block hover:underline">
                                            เปิดคู่มือ &rarr;
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                        ยังไม่มีคู่มือ
                    </div>
                )}
             </div>

             {/* Quick Links / Resources Placeholder */}
             <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
                 <h3 className="font-bold text-indigo-800 mb-3 text-sm">แหล่งข้อมูลเพิ่มเติม</h3>
                 <ul className="space-y-2 text-sm text-indigo-600">
                     <li>• เกณฑ์การแข่งขันศิลปหัตถกรรม ครั้งที่ 71</li>
                     <li>• ปฏิทินการดำเนินงาน</li>
                     <li>• ติดต่อฝ่ายเทคนิค</li>
                 </ul>
             </div>
          </div>
      </div>

      {/* Admin Add News Modal */}
      {showAddNews && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Plus className="w-5 h-5 mr-2 text-blue-600" />
                      เพิ่มข่าว/คู่มือ
                  </h3>
                  <form onSubmit={handleAddNews} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
                          <input type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
                          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={newType} onChange={e => setNewType(e.target.value as any)}>
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
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-4">
                          <button type="button" onClick={() => setShowAddNews(false)} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg font-medium">ยกเลิก</button>
                          <button type="submit" disabled={isAddingNews} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-bold shadow-sm flex items-center disabled:opacity-70">
                              {isAddingNews && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              บันทึก
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;

