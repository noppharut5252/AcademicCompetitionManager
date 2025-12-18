
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppData, User, Team, Judge, PrintConfig } from '../types';
import { Printer, FileText, ClipboardList, Users, Mail, Trophy, LayoutGrid, Filter, Search, ChevronRight, School, UserCheck, CheckSquare, Square, Layers, Download, Settings, X, Save, CheckCircle, Loader2, Hash, Tag, UserRound, AlertTriangle, PrinterCheck } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { getPrintConfig, savePrintConfig } from '../services/api';

interface PrintDocumentsViewProps {
  data: AppData;
  user?: User | null;
}

type DocType = 'judge-signin' | 'competitor-signin' | 'score-sheet' | 'score-sheet-individual' | 'envelope';

const DOC_NAMES: Record<DocType, string> = {
    'judge-signin': 'ใบลงชื่อกรรมการ',
    'competitor-signin': 'ใบลงชื่อผู้เข้าแข่งขัน',
    'score-sheet': 'แบบบันทึกคะแนนรวม',
    'score-sheet-individual': 'แบบบันทึกคะแนนรายบุคคล',
    'envelope': 'ใบปะหน้าซองเอกสาร'
};

const DEFAULT_PRINT_CONFIG: PrintConfig = {
    id: '',
    scoreColsCount: 3,
    includeJudges: true,
    includeVenueDate: true,
    headerTitle: 'งานศิลปหัตถกรรมนักเรียน ครั้งที่ 72'
};

const PrintConfigModal = ({ isOpen, onClose, onSave, data, currentUser, currentConfigs }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (id: string, config: PrintConfig) => void,
    data: AppData,
    currentUser?: User | null,
    currentConfigs: Record<string, PrintConfig>
}) => {
    const isAdminOrArea = currentUser?.level === 'admin' || currentUser?.level === 'area';
    const userSchool = data.schools.find(s => s.SchoolID === currentUser?.SchoolID);
    const userClusterID = userSchool?.SchoolCluster;

    const [selectedContext, setSelectedContext] = useState<string>(isAdminOrArea ? 'area' : (userClusterID || 'area'));
    const [config, setConfig] = useState<PrintConfig>({ ...DEFAULT_PRINT_CONFIG });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const existing = currentConfigs[selectedContext];
        if (existing) {
            setConfig({ ...DEFAULT_PRINT_CONFIG, ...existing });
        } else {
            setConfig({ ...DEFAULT_PRINT_CONFIG, id: selectedContext });
        }
    }, [selectedContext, currentConfigs]);

    const handleSave = async () => {
        setIsSaving(true);
        const success = await savePrintConfig(selectedContext, config);
        setIsSaving(false);
        if (success) {
            onSave(selectedContext, config);
            onClose();
        }
    };

    if (!isOpen) return null;

    const clusterOptions = data.clusters || [];

    return (
        <div className="fixed inset-0 bg-black/50 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="text-lg font-bold flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        ตั้งค่าการพิมพ์เอกสาร
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">เลือกระดับที่ต้องการตั้งค่า</label>
                        <select 
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedContext}
                            onChange={(e) => setSelectedContext(e.target.value)}
                        >
                            <option value="area">ระดับเขตพื้นที่การศึกษา (Area)</option>
                            <optgroup label="ระดับกลุ่มเครือข่าย (Clusters)">
                                {clusterOptions.map(c => (
                                    <option key={c.ClusterID} value={c.ClusterID}>{c.ClusterName}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">หัวเรื่องเอกสาร (Header Title)</label>
                        <input 
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={config.headerTitle}
                            onChange={e => setConfig({...config, headerTitle: e.target.value})}
                            placeholder="เช่น งานศิลปหัตถกรรมนักเรียน ครั้งที่ 72"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนช่องคะแนนสำรอง (ในกรณีไม่พบรายชื่อกรรมการ)</label>
                        <input 
                            type="number" min="1" max="10"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            value={config.scoreColsCount}
                            onChange={e => setConfig({...config, scoreColsCount: parseInt(e.target.value) || 1})}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">* ระบบจะปรับช่องคะแนนตามจำนวนกรรมการที่ตัดสินจริงโดยอัตโนมัติ</p>
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                checked={config.includeJudges}
                                onChange={e => setConfig({...config, includeJudges: e.target.checked})}
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">ดึงรายชื่อกรรมการอัตโนมัติ</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                checked={config.includeVenueDate}
                                onChange={e => setConfig({...config, includeVenueDate: e.target.checked})}
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">ดึงสนามและวันที่แข่งขันอัตโนมัติ</span>
                        </label>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        บันทึกการตั้งค่า
                    </button>
                </div>
            </div>
        </div>
    );
};

const PrintDocumentsView: React.FC<PrintDocumentsViewProps> = ({ data, user }) => {
  // Role Detection
  const role = user?.level?.toLowerCase();
  const isAdminOrArea = role === 'admin' || role === 'area';
  const isGroupAdmin = role === 'group_admin';
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  // State
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>(isAdminOrArea ? 'area' : 'cluster');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [clusterFilter, setClusterFilter] = useState<string>(isGroupAdmin ? (userClusterID || '') : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [printConfigs, setPrintConfigs] = useState<Record<string, PrintConfig>>({});
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<{ isOpen: boolean, type: DocType, ids: string[] }>({ isOpen: false, type: 'judge-signin', ids: [] });

  useEffect(() => {
      const loadConfigs = async () => {
          const res = await getPrintConfig();
          setPrintConfigs(res);
      };
      loadConfigs();
  }, []);

  useEffect(() => {
      if (isAdminOrArea) {
          setViewScope('area');
      } else {
          setViewScope('cluster');
          if (userClusterID) setClusterFilter(userClusterID);
      }
  }, [user, isAdminOrArea, userClusterID]);

  const getTeamsForActivity = useCallback((activityId: string) => {
      const allTeams = data.teams || [];
      const allSchools = data.schools || [];
      let teams = allTeams.filter(t => t.activityId === activityId);
      
      if (viewScope === 'area') {
          teams = teams.filter(t => t.stageStatus === 'Area' || (String(t.rank) === '1' && String(t.flag).toUpperCase() === 'TRUE'));
      } else {
          if (clusterFilter) {
              teams = teams.filter(t => {
                  const school = allSchools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                  return school?.SchoolCluster === clusterFilter;
              });
          }
      }
      return teams.sort((a, b) => {
          const schoolA = allSchools.find(s => s.SchoolID === a.schoolId)?.SchoolName || a.schoolId;
          const schoolB = allSchools.find(s => s.SchoolID === b.schoolId)?.SchoolName || b.schoolId;
          return schoolA.localeCompare(schoolB) || a.teamName.localeCompare(b.teamName);
      });
  }, [data.teams, data.schools, viewScope, clusterFilter]);

  const getJudgesForActivity = useCallback((activityId: string) => {
      const allJudges = data.judges || [];
      let judges = allJudges.filter(j => j.activityId === activityId);
      
      if (viewScope === 'area') {
          judges = judges.filter(j => j.stageScope === 'area');
      } else {
          judges = judges.filter(j => j.stageScope !== 'area');
          if (clusterFilter) {
              judges = judges.filter(j => 
                  j.clusterKey === clusterFilter || 
                  (j.clusterLabel && j.clusterLabel.includes(clusterFilter))
              );
          }
      }

      const priority = (roleStr: string) => {
        const r = roleStr || '';
        if (r.includes('ประธาน')) return 1;
        if (r.includes('กรรมการและเลขา')) return 3;
        if (r.includes('กรรมการ')) return 2;
        return 4;
      };

      return judges.sort((a, b) => priority(a.role) - priority(b.role));
  }, [data.judges, viewScope, clusterFilter]);

  const filteredActivities = useMemo(() => {
      let acts = data.activities || [];
      if (selectedCategory !== 'All') acts = acts.filter(a => a.category === selectedCategory);
      if (searchTerm) acts = acts.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return acts.filter(act => getTeamsForActivity(act.id).length > 0);
  }, [data.activities, selectedCategory, searchTerm, getTeamsForActivity]);

  const categories = useMemo(() => {
    return Array.from(new Set((data.activities || []).map(a => a.category))).sort();
  }, [data.activities]);

  const toggleActivitySelection = (id: string) => {
    const newSet = new Set(selectedActivityIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedActivityIds(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedActivityIds.size === filteredActivities.length) {
        setSelectedActivityIds(new Set());
    } else {
        setSelectedActivityIds(new Set(filteredActivities.map(a => a.id)));
    }
  };

  const generateHTML = (activityIds: string[], type: DocType) => {
    const configKey = viewScope === 'area' ? 'area' : clusterFilter;
    const config = printConfigs[configKey] || DEFAULT_PRINT_CONFIG;
    const headerTitle = config.headerTitle || DEFAULT_PRINT_CONFIG.headerTitle;

    const isLandscape = type === 'judge-signin' || type === 'score-sheet-individual' || type === 'competitor-signin';

    let htmlContent = `
        <html>
        <head>
            <title>พิมพ์เอกสาร - ${DOC_NAMES[type]}</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { margin: 10mm; size: A4 ${isLandscape ? 'landscape' : 'portrait'}; }
                body { font-family: 'Sarabun', sans-serif; font-size: 13px; line-height: 1.3; color: #000; margin: 0; padding: 0; }
                .page { page-break-after: always; position: relative; padding-bottom: 5mm; }
                .header { text-align: center; margin-bottom: 10px; }
                .header h1 { font-size: 18px; margin: 0 0 2px 0; }
                .header h2 { font-size: 14px; margin: 0; font-weight: normal; }
                .doc-title { font-weight: bold; text-decoration: underline; margin: 8px 0; font-size: 16px; text-align: center; }
                .activity-info { margin-bottom: 10px; border: 1px solid #000; padding: 10px; border-radius: 4px; background: #fff; line-height: 1.4; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: auto; }
                th, td { border: 1px solid #000; padding: 6px 4px; text-align: left; vertical-align: middle; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 12px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                
                .signature-section { margin-top: 15px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
                .signature-box { text-align: center; width: 320px; font-weight: bold; border-top: 1px solid transparent; }
                
                .printable-content { display: flex; flex-direction: column; }
                
                .table-individual td { padding: 4px 3px; height: 32px; }
                .table-individual th { font-size: 10px; padding: 4px 2px; }

                /* Envelope Style */
                .envelope-container { border: 4px double #000; padding: 15mm; min-height: 250mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; }
                .envelope-box { border: 2px solid #000; padding: 12px 25px; font-size: 22px; font-weight: bold; margin: 15px 0; }
                .envelope-detail { font-size: 16px; margin-top: 8px; line-height: 1.6; }
                .envelope-footer { margin-top: auto; width: 100%; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; padding-top: 20px; }

                .no-print { position: fixed; top: 20px; right: 20px; z-index: 1000; }
                .btn-print { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-family: 'Sarabun'; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button onclick="window.print()" class="btn-print">🖨️ ยืนยันการพิมพ์ (${activityIds.length} รายการ)</button>
            </div>
    `;

    activityIds.forEach(activityId => {
        const act = (data.activities || []).find(a => a.id === activityId);
        if (!act) return;

        const teams = getTeamsForActivity(activityId);
        const judges = getJudgesForActivity(activityId);
        const venueInfo = config.includeVenueDate ? (data.venues || []).find(v => (v.scheduledActivities || []).some(s => s.activityId === activityId)) : null;
        const schedule = venueInfo?.scheduledActivities?.find(s => s.activityId === activityId);
        const clusterLabel = (data.clusters.find(c => c.ClusterID === clusterFilter)?.ClusterName || '');

        const chairperson = judges.find(j => j.role.includes('ประธาน'));
        const chairName = chairperson ? chairperson.judgeName : '..........................................................';

        if (type === 'score-sheet-individual') {
            judges.forEach(judge => {
                htmlContent += `
                    <div class="page">
                        <div class="header">
                            <h1>${headerTitle}</h1>
                            <h2>ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${clusterLabel})`}</h2>
                        </div>
                        <div class="doc-title">แบบบันทึกคะแนนการแข่งขัน (สำหรับกรรมการรายบุคคล)</div>
                        <div class="activity-info">
                            <strong>กิจกรรม:</strong> ${act.name}<br/>
                            <strong>กรรมการ:</strong> ${judge.judgeName} (${judge.role}) สังกัด ${judge.schoolName}<br/>
                            ${config.includeVenueDate && schedule ? `<strong>สถานที่:</strong> ${venueInfo?.name} ${schedule.room || ''} | <strong>วันที่:</strong> ${schedule.date}` : ''}
                        </div>
                        
                        <div class="printable-content">
                            <table class="table-individual">
                                <thead>
                                    <tr>
                                        <th rowSpan="2" style="width: 40px;">ที่</th>
                                        <th rowSpan="2">ชื่อทีม / โรงเรียน</th>
                                        <th colSpan="10">เกณฑ์คะแนน</th>
                                        <th rowSpan="2" style="width: 80px;">รวม (100)</th>
                                    </tr>
                                    <tr>
                                        ${Array.from({length: 10}).map((_, i) => `<th style="width: 35px; font-size: 9px;">ข้อ ${i+1}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${teams.map((t, idx) => {
                                        const schoolName = (data.schools || []).find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
                                        return `
                                            <tr>
                                                <td class="text-center">${idx + 1}</td>
                                                <td>
                                                    <strong>${t.teamName}</strong><br/>
                                                    <small style="font-size: 9px;">${schoolName}</small>
                                                </td>
                                                ${Array.from({length: 10}).map(() => `<td></td>`).join('')}
                                                <td></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                            
                            <div style="margin-top: 5px; border: 1px solid #000; padding: 6px; font-size: 11px; page-break-inside: avoid;">
                                <strong>คำชี้แจง:</strong> 1. โปรดให้คะแนนตามเกณฑ์ที่กำหนด 2. ห้ามมีรอยขูด ลบ หรือแก้ไขโดยไม่มีการเซ็นกำกับ 3. สรุปคะแนนรวมให้ถูกต้อง
                            </div>

                            <div class="signature-section">
                                <div class="signature-box">
                                    ลงชื่อ..........................................................กรรมการ<br/>
                                    (${judge.judgeName})
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else if (type === 'competitor-signin') {
            // แยกใบลงชื่อ ครู และ นักเรียน
            ['นักเรียน', 'ครูผู้ฝึกสอน'].forEach(memberType => {
                htmlContent += `
                    <div class="page">
                        <div class="header">
                            <h1>${headerTitle}</h1>
                            <h2>ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${clusterLabel})`}</h2>
                        </div>
                        <div class="doc-title">บัญชีลงชื่อผู้เข้าแข่งขัน (ประเภท${memberType})</div>
                        <div class="activity-info">
                            <strong>กิจกรรม:</strong> ${act.name}<br/>
                            ${config.includeVenueDate && schedule ? `<strong>สถานที่:</strong> ${venueInfo?.name} ${schedule.room || ''} | <strong>วันที่:</strong> ${schedule.date} (${schedule.timeRange})` : ''}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style="width: 40px;">ที่</th>
                                    <th rowSpan="2" style="width: 220px;">ชื่อทีม / โรงเรียน</th>
                                    <th rowSpan="2">รายชื่อสมาชิก</th>
                                    <th colSpan="2" style="text-align: center;">ลงเวลามา</th>
                                    <th colSpan="2" style="text-align: center;">ลงเวลากลับ</th>
                                </tr>
                                <tr>
                                    <th style="width: 70px;">เวลา</th>
                                    <th style="width: 100px;">ลายมือชื่อ</th>
                                    <th style="width: 70px;">เวลา</th>
                                    <th style="width: 100px;">ลายมือชื่อ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${teams.flatMap((t, tIdx) => {
                                    const schoolName = (data.schools || []).find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
                                    let members: any[] = [];
                                    try {
                                        const raw = typeof t.members === 'string' ? JSON.parse(t.members) : t.members;
                                        if (memberType === 'นักเรียน') {
                                            if (Array.isArray(raw)) members = raw;
                                            else if (raw && raw.students) members = raw.students;
                                        } else {
                                            if (raw && raw.teachers) members = raw.teachers;
                                        }
                                    } catch(e) {}
                                    
                                    if (members.length === 0) return [];

                                    return members.map((m, mIdx) => `
                                        <tr>
                                            ${mIdx === 0 ? `<td class="text-center" rowSpan="${members.length}">${tIdx + 1}</td>` : ''}
                                            ${mIdx === 0 ? `<td rowSpan="${members.length}"><strong>${t.teamName}</strong><br/><small>${schoolName}</small></td>` : ''}
                                            <td>${m.prefix || ''}${m.name || (m.firstname + ' ' + m.lastname)}</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    `);
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });
        } else {
            htmlContent += `<div class="page">`;
            
            if (type === 'envelope') {
                htmlContent += `
                    <div class="envelope-container">
                        <div class="header">
                            <h1>${headerTitle}</h1>
                            <h2>ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${clusterLabel})`}</h2>
                        </div>
                        <div class="doc-title">ใบปะหน้าซองเอกสารการแข่งขัน</div>
                        <div class="envelope-box">กิจกรรม: ${act.name}</div>
                        <div class="envelope-detail">
                            <strong>ระดับชั้น:</strong> ${act.levels || '-'}<br/>
                            <strong>สถานที่แข่งขัน:</strong> ${venueInfo?.name || 'ยังไม่กำหนด'} ${schedule?.room || ''}<br/>
                            <strong>วันที่แข่งขัน:</strong> ${schedule?.date || '-'} (${schedule?.timeRange || 'ตารางรวม'})<br/>
                        </div>
                        <div style="margin: 30px 0; border: 1px solid #000; padding: 15px; width: 85%;">
                            <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">ข้อมูลสรุป</div>
                            <table style="width:100%; border:none;">
                                <tr style="border:none;"><td style="border:none; font-size:16px;">จำนวนทีมเข้าแข่งขันทั้งหมด:</td><td style="border:none; font-size:20px; font-weight:bold;">${teams.length} ทีม</td></tr>
                                <tr style="border:none;"><td style="border:none; font-size:16px;">จำนวนกรรมการตัดสิน:</td><td style="border:none; font-size:20px; font-weight:bold;">${judges.length} ท่าน</td></tr>
                            </table>
                        </div>
                        <div class="envelope-footer">
                            <span>ประธานกรรมการตัดสิน .......................................................</span>
                        </div>
                    </div>
                `;
            } else {
                htmlContent += `
                    <div class="header">
                        <h1>${headerTitle}</h1>
                        <h2>ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${clusterLabel})`}</h2>
                    </div>
                `;

                if (type === 'judge-signin') {
                    htmlContent += `<div class="doc-title">บัญชีรายชื่อกรรมการและใบลงเวลาปฏิบัติราชการ</div>`;
                    htmlContent += `
                        <div class="activity-info">
                            <strong>กิจกรรม:</strong> ${act.name}<br/>
                            ${config.includeVenueDate && schedule ? `<strong>สถานที่:</strong> ${venueInfo?.name} ${schedule.room || ''} | <strong>วันที่:</strong> ${schedule.date} (${schedule.timeRange})` : ''}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style="width: 40px;">ที่</th>
                                    <th rowSpan="2" style="width: 200px;">ชื่อ-นามสกุล</th>
                                    <th rowSpan="2" style="width: 150px;">ตำแหน่ง</th>
                                    <th rowSpan="2">สังกัด/โรงเรียน</th>
                                    <th colSpan="2" style="text-align: center;">ลงเวลามา</th>
                                    <th colSpan="2" style="text-align: center;">ลงเวลากลับ</th>
                                </tr>
                                <tr>
                                    <th style="width: 80px;">เวลา</th>
                                    <th style="width: 110px;">ลายมือชื่อ</th>
                                    <th style="width: 80px;">เวลา</th>
                                    <th style="width: 110px;">ลายมือชื่อ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${judges.map((j, idx) => `
                                    <tr>
                                        <td class="text-center">${idx + 1}</td>
                                        <td>${j.judgeName}</td>
                                        <td>${j.role}</td>
                                        <td>${j.schoolName}</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                `).join('')}
                                ${judges.length === 0 ? `<tr><td colspan="8" class="text-center text-red-500">ไม่พบข้อมูลกรรมการ</td></tr>` : ''}
                            </tbody>
                        </table>
                    `;
                } else if (type === 'score-sheet') {
                    const judgesList = judges.length > 0 ? judges : Array.from({ length: config.scoreColsCount || 3 });
                    const colsCount = judgesList.length;

                    htmlContent += `<div class="doc-title">แบบบันทึกคะแนนการแข่งขัน (สรุปผลรวม)</div>`;
                    htmlContent += `
                        <div class="activity-info">
                            <strong>กิจกรรม:</strong> ${act.name}<br/>
                            ${config.includeVenueDate && schedule ? `<strong>สถานที่:</strong> ${venueInfo?.name} ${schedule.room || ''} | <strong>วันที่:</strong> ${schedule.date} (${schedule.timeRange})` : ''}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style="width: 40px;">ที่</th>
                                    <th rowSpan="2">ชื่อทีม / โรงเรียน</th>
                                    <th colSpan="${colsCount}">คะแนนจากกรรมการ</th>
                                    <th rowSpan="2" style="width: 70px;">คะแนนเฉลี่ย</th>
                                    <th rowSpan="2" style="width: 70px;">ผลรางวัล</th>
                                </tr>
                                <tr>
                                    ${judgesList.map((_, i) => `<th style="width: 55px; font-size: 10px;">คนที่ ${i+1}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${teams.map((t, idx) => {
                                    const schoolName = (data.schools || []).find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
                                    return `
                                        <tr>
                                            <td class="text-center">${idx + 1}</td>
                                            <td>
                                                <strong>${t.teamName}</strong><br/>
                                                <small>${schoolName}</small>
                                            </td>
                                            ${judgesList.map(() => '<td></td>').join('')}
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        <div class="signature-section">
                            <div class="signature-box">
                                ลงชื่อ..........................................................ประธานกรรมการ<br/>
                                ( ${chairName} )
                            </div>
                        </div>
                    `;
                }
            }

            htmlContent += `</div>`;
        }
    });

    htmlContent += `</body></html>`;
    return htmlContent;
  };

  const handlePrintAction = async (type: DocType, specificIds: string[]) => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        setIsGenerating(false);
        alert('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
        return;
    }

    const html = generateHTML(specificIds, type);
    printWindow.document.write(html);
    printWindow.document.close();
    setIsGenerating(false);
    setBulkConfirm({ isOpen: false, type: 'judge-signin', ids: [] });
  };

  const handleBulkPrintConfirm = (type: DocType) => {
      const ids = Array.from(selectedActivityIds);
      if (ids.length === 0) {
          alert('กรุณาเลือกกิจกรรมอย่างน้อย 1 รายการเพื่อดำเนินการพิมพ์');
          return;
      }
      setBulkConfirm({ isOpen: true, type, ids });
  };

  const handlePrintAllDirect = (type: DocType) => {
    const allIds = filteredActivities.map(a => a.id);
    if (allIds.length === 0) {
        alert('ไม่พบรายการกิจกรรมในตารางขณะนี้');
        return;
    }
    setBulkConfirm({ isOpen: true, type, ids: allIds });
  };

  const isAllSelected = selectedActivityIds.size > 0 && selectedActivityIds.size === filteredActivities.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {/* Bulk Print Confirmation Modal */}
      {bulkConfirm.isOpen && (
          <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                  <div className="p-6 text-center border-b border-gray-100">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                          <PrinterCheck className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">ยืนยันการพิมพ์เอกสารทั้งหมด</h3>
                      <p className="text-gray-500 text-sm mt-2">
                          คุณกำลังจะสั่งพิมพ์เอกสาร <span className="font-bold text-blue-600">"{DOC_NAMES[bulkConfirm.type]}"</span> <br/>
                          สำหรับกิจกรรมที่เลือกทั้งหมดจำนวน <span className="font-bold text-gray-900">{bulkConfirm.ids.length} รายการ</span>
                      </p>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3">
                      <button 
                        onClick={() => setBulkConfirm({ ...bulkConfirm, isOpen: false })}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                      >
                          ยกเลิก
                      </button>
                      <button 
                        onClick={() => handlePrintAction(bulkConfirm.type, bulkConfirm.ids)}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                      >
                          เริ่มการพิมพ์
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                <Printer className="w-6 h-6 mr-2 text-blue-600" />
                เอกสารการแข่งขัน (Documents)
            </h2>
            <p className="text-gray-500 text-sm mt-1">พิมพ์ใบลงชื่อ แบบบันทึกคะแนนรายคน/รวม และใบปะหน้าซองกิจกรรม</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => setShowConfigModal(true)}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200"
            >
                <Settings className="w-4 h-4 mr-2" />
                ตั้งค่าการพิมพ์
            </button>
        </div>
      </div>

      {/* Level Selection & Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            {/* Level Toggle - Integrated Selector */}
            <div className="flex bg-gray-100 p-1.5 rounded-xl shrink-0 w-full md:w-auto border border-gray-200 shadow-inner">
                <button
                    onClick={() => { setViewScope('cluster'); if (!isGroupAdmin) setClusterFilter(''); }}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${viewScope === 'cluster' ? 'bg-white text-blue-600 shadow-md border border-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-2" /> ระดับกลุ่มฯ
                </button>
                <button
                    onClick={() => { setViewScope('area'); setClusterFilter(''); }}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${viewScope === 'area' ? 'bg-white text-purple-600 shadow-md border border-purple-50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Trophy className="w-4 h-4 mr-2" /> ระดับเขตฯ
                </button>
            </div>

            <div className="relative w-full md:flex-1">
                <Search className="absolute inset-y-0 left-3 flex items-center pointer-events-none h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all shadow-sm"
                    placeholder="ค้นหากิจกรรมที่แข่งขัน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {viewScope === 'cluster' && isAdminOrArea && (
                    <div className="w-full sm:w-64">
                        <SearchableSelect 
                            options={[{ label: 'ทุกกลุ่มเครือข่าย', value: '' }, ...(data.clusters || []).map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                            value={clusterFilter}
                            onChange={setClusterFilter}
                            placeholder="กรองตามกลุ่มเครือข่าย"
                            icon={<LayoutGrid className="h-4 w-4" />}
                        />
                    </div>
                )}
            </div>
        </div>

        {/* Quick Category Filters */}
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black text-gray-400 flex items-center mr-2 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                <Tag className="w-3 h-3 mr-1" /> หมวดหมู่:
            </span>
            <button 
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedCategory === 'All' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
                ทั้งหมด
            </button>
            {categories.slice(0, 10).map(cat => (
                <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      {/* Bulk Print Actions for Filtered View */}
      <div className={`p-5 rounded-2xl border flex flex-col lg:flex-row items-center justify-between gap-4 transition-all ${viewScope === 'area' ? 'bg-purple-50 border-purple-100 shadow-sm shadow-purple-100' : 'bg-blue-50 border-blue-100 shadow-sm shadow-blue-100'}`}>
          <div className="flex items-center gap-3 shrink-0">
              <div className={`text-white font-black px-4 py-1.5 rounded-full shadow-md text-sm ${viewScope === 'area' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                  {filteredActivities.length}
              </div>
              <div className="flex flex-col">
                <span className={`font-black text-sm uppercase tracking-tight ${viewScope === 'area' ? 'text-purple-900' : 'text-blue-900'}`}>รายการกิจกรรมที่แสดง</span>
                <span className="text-[10px] text-gray-500 font-medium">พิมพ์ทั้งหมด (Print All) ตามที่แสดงด้านล่าง</span>
              </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-end flex-1">
              <button 
                onClick={() => handlePrintAllDirect('judge-signin')}
                className="bg-white hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm"
              >
                  <UserCheck className="w-4 h-4 mr-2" /> ใบเซ็นกรรมการ
              </button>
              <button 
                onClick={() => handlePrintAllDirect('competitor-signin')}
                className="bg-white hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm"
              >
                  <Users className="w-4 h-4 mr-2" /> ใบเซ็นผู้แข่ง
              </button>
              <button 
                onClick={() => handlePrintAllDirect('score-sheet-individual')}
                className="bg-white hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm"
              >
                  <UserRound className="w-4 h-4 mr-2" /> ใบให้คะแนนรายคน
              </button>
              <button 
                onClick={() => handlePrintAllDirect('score-sheet')}
                className="bg-white hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm"
              >
                  <ClipboardList className="w-4 h-4 mr-2" /> ใบให้คะแนนรวม
              </button>
              <button 
                onClick={() => handlePrintAllDirect('envelope')}
                className="bg-white hover:bg-blue-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm"
              >
                  <Mail className="w-4 h-4 mr-2" /> ปะหน้าซอง
              </button>
          </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-4 text-center w-12">
                              <button onClick={toggleAllSelection} className="text-gray-400 hover:text-blue-600 transition-colors">
                                  {isAllSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                              </button>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายการกิจกรรม</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">ทีม</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">กรรมการ</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-56">พิมพ์รายกิจกรรม</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {filteredActivities.map((act) => {
                          const teamsCount = getTeamsForActivity(act.id).length;
                          const judgesCount = getJudgesForActivity(act.id).length;
                          const isSelected = selectedActivityIds.has(act.id);

                          return (
                              <tr key={act.id} className={`hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                                  <td className="px-6 py-4 text-center">
                                      <button onClick={() => toggleActivitySelection(act.id)} className="text-gray-300 hover:text-blue-600 transition-colors">
                                          {isSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                                      </button>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-sm font-bold text-gray-900">{act.name}</div>
                                      <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center">
                                          <Hash className="w-3 h-3 mr-1" /> ID: {act.id}
                                          <span className="mx-2">|</span>
                                          <span className={`${viewScope === 'area' ? 'text-purple-600' : 'text-blue-600'} font-bold`}>
                                              {viewScope === 'area' ? 'Area Level' : 'Cluster Level'}
                                          </span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold border border-gray-200 uppercase">
                                          {act.category}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${teamsCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                          {teamsCount} ทีม
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${judgesCount > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                          {judgesCount} ท่าน
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex justify-center gap-1">
                                          <button 
                                              onClick={() => handlePrintAction('judge-signin', [act.id])}
                                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                              title="พิมพ์ใบเซ็นชื่อกรรมการ"
                                          >
                                              <UserCheck className="w-5 h-5" />
                                          </button>
                                          <button 
                                              onClick={() => handlePrintAction('competitor-signin', [act.id])}
                                              className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                                              title="พิมพ์ใบเซ็นชื่อผู้แข่ง"
                                          >
                                              <Users className="w-5 h-5" />
                                          </button>
                                          <button 
                                              onClick={() => handlePrintAction('score-sheet-individual', [act.id])}
                                              className="p-2 text-blue-800 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                              title="พิมพ์ใบให้คะแนนรายบุคคล"
                                          >
                                              <UserRound className="w-5 h-5" />
                                          </button>
                                          <button 
                                              onClick={() => handlePrintAction('score-sheet', [act.id])}
                                              className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                              title="พิมพ์แบบบันทึกคะแนนรวม"
                                          >
                                              <ClipboardList className="w-5 h-5" />
                                          </button>
                                          <button 
                                              onClick={() => handlePrintAction('envelope', [act.id])}
                                              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                                              title="พิมพ์ใบปะหน้าซองกิจกรรม"
                                          >
                                              <Mail className="w-5 h-5" />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {filteredActivities.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                                      <FileText className="w-8 h-8 opacity-20" />
                                  </div>
                                  <p className="font-medium text-sm">ไม่พบรายการกิจกรรมตามเงื่อนไขที่เลือกในระดับ{viewScope === 'area' ? 'เขต' : 'กลุ่ม'}</p>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      <PrintConfigModal 
          isOpen={showConfigModal} 
          onClose={() => setShowConfigModal(false)}
          onSave={(id, config) => setPrintConfigs({...printConfigs, [id]: config})}
          data={data}
          currentUser={user}
          currentConfigs={printConfigs}
      />

      {isGenerating && (
          <div className="fixed inset-0 bg-black/60 z-[500] flex flex-col items-center justify-center text-white backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white/10 p-10 rounded-3xl backdrop-blur-xl flex flex-col items-center border border-white/20 shadow-2xl scale-110">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 animate-spin mb-6 text-blue-400" />
                    <Printer className="w-6 h-6 absolute top-5 left-5 text-white animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">กำลังจัดเตรียมเอกสาร...</h3>
                  <p className="text-sm opacity-80 mt-2 text-center max-w-xs">
                    กรุณารอสักครู่ ระบบกำลังสร้างหน้าตัวอย่างสำหรับการพิมพ์ <br/>
                    <span className="font-bold text-yellow-400">ห้ามปิดหน้านี้จนกว่าหน้าต่างพิมพ์จะปรากฏ</span>
                  </p>
              </div>
          </div>
      )}
    </div>
  );
};

export default PrintDocumentsView;
