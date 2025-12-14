import React from 'react';
import { AppData, Activity } from '../types';
import { Users, Calendar, GraduationCap } from 'lucide-react';

interface ActivityListProps {
  data: AppData;
}

const ActivityList: React.FC<ActivityListProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">รายการแข่งขัน (Activities)</h2>
        <p className="text-gray-500">เลือกดูรายละเอียดและเกณฑ์การแข่งขัน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.activities.map((activity) => (
          <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  {activity.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${activity.mode === 'Team' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                  {activity.mode === 'Team' ? 'ประเภททีม' : 'ประเภทเดี่ยว'}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 h-14">{activity.name}</h3>
              
              <div className="space-y-3 mt-4">
                 <div className="flex items-center text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">
                        {(() => {
                            try {
                                const levels = JSON.parse(activity.levels);
                                return Array.isArray(levels) ? levels.join(', ') : activity.levels;
                            } catch {
                                return activity.levels;
                            }
                        })()}
                    </span>
                 </div>
                 <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <span>ครู: {activity.reqTeachers}, นักเรียน: {activity.reqStudents} คน</span>
                 </div>
                 <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>ปิดรับสมัคร: {activity.registrationDeadline}</span>
                 </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">รับสูงสุด: {activity.maxTeams} ทีม</span>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                    ดูรายละเอียด &rarr;
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityList;