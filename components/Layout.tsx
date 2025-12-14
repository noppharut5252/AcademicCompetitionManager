import React from 'react';
import { LayoutDashboard, Users, Trophy, School, Settings, LogOut, Award, FileBadge, IdCard } from 'lucide-react';
import { logoutLiff } from '../services/liff';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userProfile?: any;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, userProfile }) => {
  const menuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
    { id: 'teams', label: 'ทีม', icon: Users },
    { id: 'activities', label: 'รายการ', icon: Trophy },
    { id: 'results', label: 'ผลรางวัล', icon: Award },
    { id: 'certificates', label: 'เกียรติบัตร', icon: FileBadge },
    { id: 'idcards', label: 'บัตร', icon: IdCard },
    { id: 'schools', label: 'โรงเรียน', icon: School },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  // Primary menu items for mobile bottom bar (limited to 4-5)
  const mobileMenuItems = [
    { id: 'dashboard', label: 'หน้าหลัก', icon: LayoutDashboard },
    { id: 'teams', label: 'ทีม', icon: Users },
    { id: 'results', label: 'ผลรางวัล', icon: Award },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-kanit">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Trophy className="w-8 h-8 text-blue-600 mr-2" />
          <div>
            <span className="text-lg font-bold text-gray-900 tracking-tight block">CompManager</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
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
          <div className="flex items-center">
            <img 
              src={userProfile?.pictureUrl || "https://picsum.photos/40/40"} 
              alt="User" 
              className="h-10 w-10 rounded-full bg-gray-200"
            />
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-700 truncate">{userProfile?.displayName || 'Guest'}</p>
              <p className="text-xs text-gray-500 truncate">Online</p>
            </div>
            <button 
                className="ml-auto text-gray-400 hover:text-red-500" 
                title="ออกจากระบบ"
                onClick={logoutLiff}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 mb-16 md:mb-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center">
                <Trophy className="w-6 h-6 text-blue-600 mr-2" />
                <span className="font-bold text-gray-900 text-lg">CompManager</span>
            </div>
            <div className="flex items-center gap-2">
                <img 
                  src={userProfile?.pictureUrl || "https://picsum.photos/32/32"} 
                  alt="User" 
                  className="h-8 w-8 rounded-full bg-gray-200"
                />
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-30 px-2 safe-area-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
        {mobileMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`
              flex flex-col items-center justify-center w-full h-full space-y-1
              ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
            `}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'animate-bounce-short' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        {/* More Menu Item for Mobile */}
        <button
            onClick={() => onTabChange('schools')} // Reuse schools or create a 'menu' tab
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${['schools','activities','certificates','idcards'].includes(activeTab) ? 'text-blue-600' : 'text-gray-400'}`}
        >
            <div className="w-6 h-6 flex items-center justify-center border-2 border-current rounded-lg">
                <div className="w-3 h-0.5 bg-current"></div>
            </div>
            <span className="text-[10px] font-medium">เมนู</span>
        </button>
      </nav>
      
      {/* Mobile "More" Drawer/Modal Logic could go here, for now mapping 'menu' to Schools or list all */}
      {/* Simplification: If user clicks 'Menu', we could show a full list modal. 
          For this iteration, the user can access main items via bottom bar. */}
    </div>
  );
};

export default Layout;