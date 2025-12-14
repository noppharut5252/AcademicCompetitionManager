import React, { useState } from 'react';
import { LayoutDashboard, Users, Trophy, School, Settings, Menu, X, LogOut, Award, FileBadge, IdCard } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'ภาพรวม (Dashboard)', icon: LayoutDashboard },
    { id: 'teams', label: 'ทีมผู้เข้าแข่งขัน', icon: Users },
    { id: 'activities', label: 'รายการแข่งขัน', icon: Trophy },
    { id: 'results', label: 'ประกาศผลรางวัล', icon: Award },
    { id: 'certificates', label: 'เกียรติบัตร', icon: FileBadge },
    { id: 'idcards', label: 'บัตรประจำตัว', icon: IdCard },
    { id: 'schools', label: 'ข้อมูลโรงเรียน', icon: School },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-kanit">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <Trophy className="w-8 h-8 text-blue-600 mr-2" />
            <div>
              <span className="text-lg font-bold text-gray-900 tracking-tight block">CompManager</span>
              <span className="text-xs text-gray-500">ระบบจัดการงานศิลปหัตถกรรม</span>
            </div>
            <button 
              className="ml-auto lg:hidden text-gray-500"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsSidebarOpen(false);
                }}
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

          {/* User Profile / Logout */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center">
              <img 
                src="https://picsum.photos/40/40" 
                alt="User" 
                className="h-10 w-10 rounded-full bg-gray-200"
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Admin User</p>
                <p className="text-xs text-gray-500">แก้ไขข้อมูลส่วนตัว</p>
              </div>
              <button className="ml-auto text-gray-400 hover:text-red-500" title="ออกจากระบบ">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
            <div className="flex items-center">
                <Trophy className="w-6 h-6 text-blue-600 mr-2" />
                <span className="font-bold text-gray-900">CompManager</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;