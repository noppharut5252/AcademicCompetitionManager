import React from 'react';
import { AppData } from '../types';
import { Users, School, Trophy, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import StatCard from './StatCard';
import { getTeamCountByStatus, getTeamsByActivity } from '../services/api';

interface DashboardProps {
  data: AppData;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const statusData = getTeamCountByStatus(data);
  const activityData = getTeamsByActivity(data);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ภาพรวม (Dashboard)</h1>
          <p className="text-gray-500">สถิติและสถานะการจัดการแข่งขันวิชาการ</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="ทีมทั้งหมด" 
          value={data.teams.length} 
          icon={Users} 
          colorClass="bg-blue-500" 
          description="ลงทะเบียนในทุกรายการ"
        />
        <StatCard 
          title="โรงเรียนที่เข้าร่วม" 
          value={data.schools.length} 
          icon={School} 
          colorClass="bg-indigo-500" 
          description={`จากทั้งหมด ${data.clusters.length} เขตพื้นที่/กลุ่ม`}
        />
        <StatCard 
          title="รายการแข่งขัน" 
          value={data.activities.length} 
          icon={Trophy} 
          colorClass="bg-amber-500" 
          description="ที่เปิดรับสมัคร"
        />
        <StatCard 
          title="ไฟล์เอกสาร" 
          value={data.files.length} 
          icon={FileText} 
          colorClass="bg-emerald-500" 
          description="โครงงานและเอกสารยินยอม"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">จำนวนทีมแยกตามรายการ</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{fontFamily: 'Kanit'}} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">สถานะการลงทะเบียน</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{fontFamily: 'Kanit'}} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;