

import React from 'react';
import { LayoutDashboard, Users, Trophy, School, Settings, LogOut, Award, FileBadge, IdCard, LogIn, UserCircle, Edit3 } from 'lucide-react';
import { logoutLiff } from '../services/liff';
import { User } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  userProfile?: User | any; // Supports both our User type and LIFF profile
}

const Layout: React.FC<LayoutProps> = ({ children, userProfile }) => {
  const isGuest = !userProfile || userProfile.isGuest;
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from current path
  const currentPath = location.pathname.substring(1) || 'dashboard';
  // Handle root case or nested paths if necessary, simpler here:
  const activeTab = currentPath.split('/')[0] || 'dashboard';

  const handleLogout = (e: React.MouseEvent) => {
      e.stopPropagation();
      localStorage.removeItem('comp_user'); // Clear session
      if (isGuest) {
          // If guest, "logout" just reloads to show login screen
          window.location.reload();
      } else {
          logoutLiff(); // This handles reloading too
      }
  };

  const handleNav = (id: string) => {
      navigate(`/${id}`);
  };

  const handleProfileClick = () => {
    if(!isGuest) {
      navigate('/profile');
    }
  };

  const userRole = userProfile?.level?.toLowerCase();
  const canScore = ['admin', 'area', 'group_admin', 'score'].includes(userRole);

  const menuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
    { id: 'teams', label: 'ทีม', icon: Users },
    { id: 'activities', label: 'รายการ', icon: Trophy },
    ...(canScore ? [{ id: 'score', label: 'บันทึกคะแนน', icon: Edit3 }] : []),
    { id: 'results', label: 'ผลรางวัล', icon: Award },
    { id: 'certificates', label: 'เกียรติบัตร', icon: FileBadge },
    { id: 'idcards', label: 'บัตร', icon: IdCard },
    { id: 'schools', label: 'โรงเรียน', icon: School },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  const mobileMenuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
    { id: 'teams', label: 'ทีม', icon: Users },
    { id: 'results', label: 'ผลรางวัล', icon: Award },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-kanit">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 cursor-pointer" onClick={() => handleNav('dashboard')}>
          <Trophy className="w-8 h-8 text-blue-600 mr-2" />
          <div>
            <span className="text-lg font-bold text-gray-900 tracking-tight block">CompManager</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                ${activeTab === item.id 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div 
            className={`flex items-center p-2 rounded-lg transition-colors ${!isGuest ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={handleProfileClick}
            title={!isGuest ? "แก้ไขข้อมูลส่วนตัว" : ""}
          >
            {userProfile?.pictureUrl || userProfile?.avatarFileId ? (
                <img 
                src={userProfile?.pictureUrl || `https://drive.google.com/thumbnail?id=${userProfile?.avatarFileId}`} 
                alt="User" 
                className="h-10 w-10 rounded-full bg-gray-200 object-cover"
                onError={(e) => {
                    // Fallback if drive image fails
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + (userProfile?.displayName || userProfile?.name || 'User');
                }}
                />
            ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <UserCircle className="w-6 h-6" />
                </div>
            )}
            
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-medium text-gray-700 truncate">
                  {userProfile?.displayName || userProfile?.name || 'Guest'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                  {isGuest ? 'Read Only' : (userProfile?.level || 'User')}
              </p>
            </div>
            <button 
                className={`ml-1 ${isGuest ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-red-500'}`}
                title={isGuest ? "เข้าสู่ระบบ" : "ออกจากระบบ"}
                onClick={handleLogout}
            >
              {isGuest ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 mb-16 md:mb-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center" onClick={() => handleNav('dashboard')}>
                <Trophy className="w-6 h-6 text-blue-600 mr-2" />
                <span className="font-bold text-gray-900 text-lg">CompManager</span>
            </div>
            <div className="flex items-center gap-2">
                 <div 
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={handleProfileClick}
                 >
                     <div className="text-right">
                        <p className="text-xs font-bold text-gray-700 max-w-[100px] truncate">{userProfile?.displayName || userProfile?.name || 'Guest'}</p>
                     </div>
                     {userProfile?.pictureUrl ? (
                        <img 
                            src={userProfile.pictureUrl} 
                            alt="User" 
                            className="h-8 w-8 rounded-full bg-gray-200"
                        />
                     ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <UserCircle className="w-6 h-6" />
                        </div>
                     )}
                 </div>
                 <button onClick={handleLogout} className="ml-1 text-gray-500">
                     {isGuest ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                 </button>
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto">
                {isGuest && (
                    <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center">
                        <UserCircle className="w-4 h-4 mr-2" />
                        คุณกำลังใช้งานในฐานะผู้เยี่ยมชม (Guest) สามารถดูข้อมูลได้เท่านั้น
                    </div>
                )}
                {children}
            </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-30 px-2 safe-area-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
        {mobileMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            className={`
              flex flex-col items-center justify-center w-full h-full space-y-1
              ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
            `}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'animate-bounce-short' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
            onClick={() => handleNav('schools')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['schools','activities','certificates','idcards','profile', 'score'].includes(activeTab) ? 'text-blue-600' : 'text-gray-400'}`}
        >
            <div className="w-6 h-6 flex items-center justify-center border-2 border-current rounded-lg">
                <div className="w-3 h-0.5 bg-current"></div>
            </div>
            <span className="text-[10px] font-medium">เมนู</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
