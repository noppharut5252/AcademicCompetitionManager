import React, { useState, useMemo } from 'react';
import { AppData, Team } from '../types';
import { Search, Printer, Download, IdCard, FileBadge, User, Lock, ChevronDown, ChevronRight } from 'lucide-react';

interface DocumentsViewProps {
  data: AppData;
  type: 'certificate' | 'idcard';
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ data, type }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // 1. Filter Teams
  const filteredTeams = useMemo(() => {
    return data.teams.filter(team => {
        const school = data.schools.find(s => s.SchoolID === team.schoolId);
        const term = searchTerm.toLowerCase();
        return team.status === 'Approved' && 
        (team.teamName.toLowerCase().includes(term) || 
         team.teamId.toLowerCase().includes(term) ||
         (school && school.SchoolName.toLowerCase().includes(term)));
    });
  }, [data.teams, data.schools, searchTerm]);

  // 2. Group by Category
  const teamsByCategory = useMemo(() => {
      const groups: Record<string, Team[]> = {};
      const uniqueCategories = new Set<string>(data.activities.map(a => a.category));

      uniqueCategories.forEach(cat => {
          groups[cat] = [];
      });
      // Also add 'Uncategorized' if needed, or stick to activity categories
      
      filteredTeams.forEach(team => {
          const activity = data.activities.find(a => a.id === team.activityId);
          const cat = activity?.category || 'Uncategorized';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(team);
      });

      return groups;
  }, [filteredTeams, data.activities]);

  const toggleCategory = (cat: string) => {
      setExpandedCategories(prev => ({
          ...prev,
          [cat]: !prev[cat]
      }));
  };

  // Default expand all if searching
  React.useEffect(() => {
      if (searchTerm) {
          const allOpen: Record<string, boolean> = {};
          Object.keys(teamsByCategory).forEach(k => allOpen[k] = true);
          setExpandedCategories(allOpen);
      }
  }, [searchTerm, teamsByCategory]);

  const title = type === 'certificate' ? 'พิมพ์เกียรติบัตร (Certificates)' : 'พิมพ์บัตรประจำตัว (ID Cards)';
  const description = type === 'certificate' 
    ? 'ดาวน์โหลดเกียรติบัตรสำหรับทีมที่ได้รับรางวัลหรือเข้าร่วม (เฉพาะทีมที่มีผลคะแนน)' 
    : 'ดาวน์โหลดบัตรประจำตัวผู้เข้าแข่งขันสำหรับวันงาน';

  const getFullName = (p: any) => {
      const prefix = p.prefix || '';
      const name = p.name || `${p.firstname || ''} ${p.lastname || ''}`;
      return `${prefix}${name}`.trim();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-gray-500">{description}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="ค้นหาทีม, โรงเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(teamsByCategory).map(([category, teams]: [string, Team[]]) => {
            if (teams.length === 0) return null;
            
            const isExpanded = expandedCategories[category] !== false; // Default open? Or closed. Let's say default open.

            return (
                <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <button 
                        onClick={() => toggleCategory(category)}
                        className="w-full px-6 py-4 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                        <h3 className="font-bold text-gray-800 flex items-center">
                             <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
                             {category}
                             <span className="ml-2 text-sm font-normal text-gray-500">({teams.length} ทีม)</span>
                        </h3>
                        {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                    </button>
                    
                    {isExpanded && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                             {teams.map(team => {
                                const activity = data.activities.find(a => a.id === team.activityId);
                                const school = data.schools.find(s => s.SchoolID === team.schoolId);
                                const hasScore = team.score > 0 || (team.stageInfo && JSON.parse(team.stageInfo)?.score > 0);
                                const canPrint = type === 'idcard' || (type === 'certificate' && hasScore);

                                // Parsing members safely
                                let students: any[] = [];
                                try {
                                    const rawMembers = typeof team.members === 'string' ? JSON.parse(team.members) : team.members;
                                    if (rawMembers) {
                                        if (Array.isArray(rawMembers)) {
                                            students = rawMembers;
                                        } else if (typeof rawMembers === 'object') {
                                            if (Array.isArray(rawMembers.students)) {
                                                students = rawMembers.students;
                                            }
                                        }
                                    }
                                } catch { students = []; }
                                if (students.length === 0) students = [{name: "No Student Data"}];

                                return (
                                    <div key={team.teamId} className={`bg-white border ${canPrint ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-80'} rounded-xl p-5 hover:shadow-md transition-shadow relative`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-mono text-gray-400">{team.teamId}</span>
                                            {type === 'certificate' && hasScore ? (
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">มีผลคะแนน</span>
                                            ) : type === 'certificate' ? (
                                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">รอผลการแข่งขัน</span>
                                            ) : (
                                                 <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">ผู้เข้าแข่งขัน</span>
                                            )}
                                        </div>
                                        
                                        <h3 className="font-bold text-gray-800 text-lg mb-1">{team.teamName}</h3>
                                        <p className="text-sm text-gray-500 mb-3">{school?.SchoolName}</p>
                                        <p className="text-xs text-gray-400 mb-4">{activity?.name}</p>

                                        <div className="border-t border-gray-100 pt-3 mb-4">
                                            <p className="text-xs font-medium text-gray-500 mb-2">รายชื่อนักเรียน:</p>
                                            <ul className="text-sm text-gray-700 space-y-1">
                                                {students.map((m: any, idx: number) => (
                                                    <li key={idx} className="flex items-center truncate">
                                                        <User className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{getFullName(m)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button 
                                            disabled={!canPrint}
                                            className={`w-full flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium text-white transition-colors 
                                                ${canPrint 
                                                    ? (type === 'certificate' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700') 
                                                    : 'bg-gray-300 cursor-not-allowed'}`}
                                            onClick={() => canPrint && alert(`จำลองการดาวน์โหลด PDF สำหรับทีม ${team.teamName}`)}
                                        >
                                            {!canPrint ? <Lock className="w-4 h-4 mr-2" /> : (type === 'certificate' ? <FileBadge className="w-4 h-4 mr-2" /> : <IdCard className="w-4 h-4 mr-2" />)}
                                            {type === 'certificate' ? 'ดาวน์โหลดเกียรติบัตร' : 'พิมพ์บัตรประจำตัว'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        })}

        {filteredTeams.length === 0 && (
            <div className="py-10 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                <Printer className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>ไม่พบข้อมูลทีมสำหรับพิมพ์เอกสาร</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsView;