
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppData, User, Team, Judge, PrintConfig } from '../types';
import { Printer, FileText, ClipboardList, Users, Mail, Trophy, LayoutGrid, Filter, Search, ChevronRight, School, UserCheck, CheckSquare, Square, Layers, Download, Settings, X, Save, CheckCircle, Loader2, Hash, Tag, UserRound, AlertTriangle, PrinterCheck, Lock, Check, FolderOpen, Type, MoveHorizontal, ArrowUpFromLine, ArrowDownToLine, ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { getPrintConfig, savePrintConfig } from '../services/api';
import QRCode from 'qrcode';

interface PrintDocumentsViewProps {
  data: AppData;
  user?: User | null;
}

// Added 'full-set' to types
type DocType = 'judge-signin' | 'competitor-signin' | 'score-sheet' | 'score-sheet-individual' | 'envelope' | 'full-set';

const DOC_NAMES: Record<DocType, string> = {
    'judge-signin': 'ใบลงชื่อกรรมการ',
    'competitor-signin': 'ใบลงชื่อผู้เข้าแข่งขัน',
    'score-sheet': 'แบบบันทึกคะแนนรวม',
    'score-sheet-individual': 'แบบบันทึกคะแนนรายบุคคล',
    'envelope': 'ใบปะหน้าซองเอกสาร',
    'full-set': 'เอกสารจัดชุดครบจบ (แนวนอน)'
};

const DEFAULT_PRINT_CONFIG: PrintConfig = {
    id: '',
    scoreColsCount: 3,
    includeJudges: true,
    includeVenueDate: true,
    headerTitle: 'งานศิลปหัตถกรรมนักเรียน ครั้งที่ 72',
    criteriaCount: 10,
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    font: 'Sarabun'
};

const PrintConfigModal = ({ isOpen, onClose, onSave, data, currentUser, currentConfigs }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (id: string, config: PrintConfig) => void,
    data: AppData,
    currentUser?: User | null,
    currentConfigs: Record<string, PrintConfig>
}) => {
    const role = currentUser?.level?.toLowerCase();
    const isAdminOrArea = role === 'admin' || role === 'area';
    const userSchool = data.schools.find(s => s.SchoolID === currentUser?.SchoolID);
    const userClusterID = userSchool?.SchoolCluster;

    const [selectedContext, setSelectedContext] = useState<string>(isAdminOrArea ? 'area' : (userClusterID || 'area'));
    const [config, setConfig] = useState<PrintConfig>({ ...DEFAULT_PRINT_CONFIG });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && isAdminOrArea) {
            setSelectedContext('area');
        }
    }, [isOpen, isAdminOrArea]);

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

    const updateMargin = (key: keyof NonNullable<PrintConfig['margins']>, value: string) => {
        const num = parseInt(value) || 0;
        setConfig(prev => ({
            ...prev,
            margins: { ...(prev.margins || DEFAULT_PRINT_CONFIG.margins!), [key]: num }
        }));
    };

    if (!isOpen) return null;

    const clusterOptions = data.clusters || [];

    return (
        <div className="fixed inset-0 bg-black/50 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="text-lg font-bold flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        ตั้งค่าการพิมพ์เอกสาร
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-4 border-b pb-6">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center uppercase tracking-wide">
                            <Users className="w-4 h-4 mr-2" /> ตั้งค่าเนื้อหา (บันทึกลงระบบ)
                        </h4>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนกรรมการ (รวม)</label>
                                <input 
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.scoreColsCount}
                                    onChange={e => setConfig({...config, scoreColsCount: parseInt(e.target.value) || 3})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนข้อเกณฑ์</label>
                                <input 
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.criteriaCount || 10}
                                    onChange={e => setConfig({...config, criteriaCount: parseInt(e.target.value) || 10})}
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
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
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-800 flex items-center uppercase tracking-wide">
                                <Printer className="w-4 h-4 mr-2" /> ตั้งค่าหน้ากระดาษและฟอนต์
                            </h4>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center"><Type className="w-3.5 h-3.5 mr-1"/> รูปแบบอักษร (Font)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => setConfig({...config, font: 'Sarabun'})}
                                        className={`px-3 py-2 rounded border text-sm font-kanit transition-all ${config.font === 'Sarabun' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        Sarabun
                                    </button>
                                    <button 
                                        onClick={() => setConfig({...config, font: 'Noto Serif Thai'})}
                                        className={`px-3 py-2 rounded border text-sm font-serif transition-all ${config.font === 'Noto Serif Thai' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                                        style={{ fontFamily: 'Noto Serif Thai, serif' }}
                                    >
                                        Noto Serif
                                    </button>
                                    <button 
                                        onClick={() => setConfig({...config, font: 'Kanit'})}
                                        className={`px-3 py-2 rounded border text-sm transition-all ${config.font === 'Kanit' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                                        style={{ fontFamily: 'Kanit, sans-serif' }}
                                    >
                                        Kanit
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center"><MoveHorizontal className="w-3.5 h-3.5 mr-1"/> ระยะขอบกระดาษ (Margins) - มิลลิเมตร</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-gray-500 mb-1 block flex items-center"><ArrowDownToLine className="w-3 h-3 mr-1"/> บน (Top)</label>
                                        <input type="number" className="w-full border rounded px-2 py-1.5 text-sm" value={config.margins?.top ?? 10} onChange={(e) => updateMargin('top', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 mb-1 block flex items-center"><ArrowUpFromLine className="w-3 h-3 mr-1"/> ล่าง (Bottom)</label>
                                        <input type="number" className="w-full border rounded px-2 py-1.5 text-sm" value={config.margins?.bottom ?? 10} onChange={(e) => updateMargin('bottom', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 mb-1 block flex items-center"><ArrowRightFromLine className="w-3 h-3 mr-1"/> ซ้าย (Left)</label>
                                        <input type="number" className="w-full border rounded px-2 py-1.5 text-sm" value={config.margins?.left ?? 10} onChange={(e) => updateMargin('left', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 mb-1 block flex items-center"><ArrowLeftFromLine className="w-3 h-3 mr-1"/> ขวา (Right)</label>
                                        <input type="number" className="w-full border rounded px-2 py-1.5 text-sm" value={config.margins?.right ?? 10} onChange={(e) => updateMargin('right', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-2 shrink-0">
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
  const role = user?.level?.toLowerCase();
  const isAdminOrArea = role === 'admin' || role === 'area';
  const isGroupAdmin = role === 'group_admin';
  const isGuest = !user || user.isGuest;
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

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
          const candidates = teams.filter(t => t.stageStatus === 'Area' || (String(t.rank) === '1' && String(t.flag).toUpperCase() === 'TRUE'));
          const seenClusters = new Set<string>();
          teams = [];
          candidates.sort((a, b) => b.score - a.score);
          for (const t of candidates) {
              const school = allSchools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
              const clusterId = school?.SchoolCluster;
              if (clusterId) {
                  if (!seenClusters.has(clusterId)) {
                      seenClusters.add(clusterId);
                      teams.push(t);
                  }
              } else {
                  teams.push(t);
              }
          }
      } else {
          if (clusterFilter) {
              teams = teams.filter(t => {
                  const school = allSchools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                  return school?.SchoolCluster === clusterFilter;
              });
          }
      }
      return teams.sort((a, b) => {
          const schoolA = allSchools.find(s => s.SchoolID === a.schoolId);
          const schoolB = allSchools.find(s => s.SchoolID === b.schoolId);
          if (viewScope === 'area') {
              const clusterA = data.clusters?.find(c => c.ClusterID === schoolA?.SchoolCluster)?.ClusterName || '';
              const clusterB = data.clusters?.find(c => c.ClusterID === schoolB?.SchoolCluster)?.ClusterName || '';
              if (clusterA !== clusterB) return clusterA.localeCompare(clusterB);
          }
          const nameA = schoolA?.SchoolName || a.schoolId;
          const nameB = schoolB?.SchoolName || b.schoolId;
          return nameA.localeCompare(nameB) || a.teamName.localeCompare(b.teamName);
      });
  }, [data.teams, data.schools, data.clusters, viewScope, clusterFilter]);

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
      const cats = new Set<string>();
      (data.activities || []).forEach(a => cats.add(a.category));
      return Array.from(cats).sort();
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

  const selectionCount = selectedActivityIds.size;
  const isAllSelected = filteredActivities.length > 0 && selectedActivityIds.size === filteredActivities.length;

  const handleSmartPrint = (type: DocType) => {
      if (selectedActivityIds.size === 0) {
          const idsToPrint = filteredActivities.map(a => a.id);
          if (idsToPrint.length === 0) {
              alert('ไม่พบรายการที่จะพิมพ์');
              return;
          }
          setBulkConfirm({ isOpen: true, type, ids: idsToPrint });
      } else {
          setBulkConfirm({ isOpen: true, type, ids: Array.from(selectedActivityIds) });
      }
  };

  const generateHTML = async (activityIds: string[], type: DocType) => {
    const configKey = viewScope === 'area' ? 'area' : clusterFilter;
    const config = printConfigs[configKey] || DEFAULT_PRINT_CONFIG;
    const headerTitle = config.headerTitle || DEFAULT_PRINT_CONFIG.headerTitle;
    const criteriaCount = config.criteriaCount || 10;
    const margins = config.margins || DEFAULT_PRINT_CONFIG.margins || { top: 10, bottom: 10, left: 10, right: 10 };
    const font = config.font || 'Sarabun';
    const fontFamily = font === 'Noto Serif Thai' ? "'Noto Serif Thai', serif" : font === 'Kanit' ? "'Kanit', sans-serif" : "'Sarabun', sans-serif";
    const isLandscape = type === 'full-set' || type === 'judge-signin' || type === 'score-sheet-individual' || type === 'competitor-signin' || type === 'score-sheet';

    let htmlContent = `
        <html>
        <head>
            <title>พิมพ์เอกสาร - ${DOC_NAMES[type]}</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;700&family=Noto+Serif+Thai:wght@400;700&family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; size: A4 ${isLandscape ? 'landscape' : 'portrait'}; }
                body { font-family: ${fontFamily}; font-size: 13px; line-height: 1.3; color: #000; margin: 0; padding: 0; }
                .page { page-break-after: always; position: relative; width: 100%; box-sizing: border-box; }
                .header { text-align: center; margin-bottom: 10px; }
                .header h1 { font-size: 18px; margin: 0 0 2px 0; }
                .header h2 { font-size: 14px; margin: 0; font-weight: normal; }
                .doc-title { font-weight: bold; text-decoration: underline; margin: 8px 0; font-size: 16px; text-align: center; }
                .activity-info { margin-bottom: 10px; border: 1px solid #000; padding: 10px; border-radius: 4px; background: #fff; line-height: 1.4; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: auto; page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                th, td { border: 1px solid #000; padding: 6px 4px; text-align: left; vertical-align: middle; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 12px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .signature-section { margin-top: 15px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
                .signature-box { text-align: center; min-width: 320px; font-weight: bold; border-top: 1px solid transparent; white-space: nowrap; }
                .printable-content { display: flex; flex-direction: column; }
                .table-individual td { padding: 4px 3px; height: 32px; }
                .table-individual th { font-size: 10px; padding: 4px 2px; }
                .envelope-container { border: 4px double #000; padding: 15mm; min-height: 250mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; }
                .envelope-box { border: 2px solid #000; padding: 12px 25px; font-size: 22px; font-weight: bold; margin: 15px 0; }
                .envelope-detail { font-size: 16px; margin-top: 8px; line-height: 1.6; }
                .envelope-footer { margin-top: auto; width: 100%; display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; padding-top: 20px; }
                .cover-landscape { display: flex; flex-direction: row; border: 3px double #000; height: 180mm; padding: 20px; box-sizing: border-box; }
                .cover-left { flex: 1.2; border-right: 1px dashed #999; padding-right: 30px; display: flex; flex-direction: column; justify-content: center; text-align: center; }
                .cover-right { flex: 0.8; padding-left: 30px; display: flex; flex-direction: column; justify-content: center; }
                .cover-header { font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; }
                .cover-title { font-size: 28px; font-weight: bold; margin: 15px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 15px 0; }
                .cover-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; width: 100%; }
                .stat-card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: #f9f9f9; }
                .stat-num { font-size: 24px; font-weight: bold; display: block; }
                .stat-txt { font-size: 12px; color: #666; }
                .checklist-box { border: 1px solid #000; padding: 20px; background: #fff; box-shadow: 3px 3px 0px #eee; }
                .checklist-title { font-size: 16px; font-weight: bold; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
                .checklist-item { font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; }
                .box-check { width: 16px; height: 16px; border: 1px solid #000; display: inline-block; margin-right: 10px; }
                .no-print { position: fixed; top: 20px; right: 20px; z-index: 1000; }
                .btn-print { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-family: ${fontFamily}; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button onclick="window.print()" class="btn-print">🖨️ ยืนยันการพิมพ์ (${activityIds.length} รายการ)</button>
            </div>
    `;

    const renderCoverPage = (act: any, teamCount: number, judgeCount: number, clusterLabel: string, venueInfo: any, schedule: any) => {
        return `
          <div class="page">
              <div class="cover-landscape">
                  <div class="cover-left">
                      <div class="cover-header">Competition Documents</div>
                      <div class="cover-title">
                          ${headerTitle}<br/>
                          <span style="font-size: 20px; font-weight: normal;">ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${clusterLabel})`}</span>
                      </div>
                      <div style="font-size: 18px; margin-top: 20px;">
                          <strong>กิจกรรม:</strong> ${act.name}<br/>
                          <strong>หมวดหมู่:</strong> ${act.category}
                      </div>
                      <div class="cover-stats-grid">
                          <div class="stat-card">
                              <span class="stat-num">${teamCount}</span>
                              <span class="stat-txt">ทีมเข้าแข่งขัน</span>
                          </div>
                          <div class="stat-card">
                              <span class="stat-num">${judgeCount}</span>
                              <span class="stat-txt">กรรมการตัดสิน</span>
                          </div>
                      </div>
                  </div>
                  <div class="cover-right">
                      <div class="checklist-box">
                          <div class="checklist-title">รายการเอกสารในชุด</div>
                          <div class="checklist-item"><span class="box-check"></span> ใบลงชื่อกรรมการ</div>
                          <div class="checklist-item"><span class="box-check"></span> ใบลงชื่อผู้เข้าแข่งขัน</div>
                          <div class="checklist-item"><span class="box-check"></span> ใบลงชื่อครูผู้ฝึกสอน</div>
                          <div class="checklist-item"><span class="box-check"></span> แบบบันทึกคะแนน (รายบุคคล)</div>
                          <div class="checklist-item"><span class="box-check"></span> แบบบันทึกคะแนน (รวม)</div>
                      </div>
                      <div style="margin-top: 30px; text-align: center; font-size: 14px;">
                          <strong>สถานที่:</strong> ${venueInfo?.name || '-'} ${schedule?.room || ''}<br/>
                          <strong>วันที่:</strong> ${schedule?.date || '-'}
                      </div>
                  </div>
              </div>
          </div>
        `;
    };

    const renderJudgeSignin = (act: any, judges: Judge[], venueInfo: any, schedule: any) => {
        return `
          <div class="page">
              <div class="header">
                  <h1>${headerTitle}</h1>
                  <h2>ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${(data.clusters.find(c => c.ClusterID === clusterFilter)?.ClusterName || '')})`}</h2>
              </div>
              <div class="doc-title">ใบลงเวลาปฏิบัติหน้าที่กรรมการตัดสิน</div>
              <div class="activity-info">
                  <strong>กิจกรรม:</strong> ${act.name}<br/>
                  ${config.includeVenueDate && schedule ? `<strong>สถานที่:</strong> ${venueInfo?.name} ${schedule.room || ''} | <strong>วันที่:</strong> ${schedule.date} (${schedule.timeRange})` : ''}
              </div>
              <table>
                  <thead>
                      <tr>
                          <th style="width: 50px;">ที่</th>
                          <th style="width: 250px;">ชื่อ - สกุล</th>
                          <th>ตำแหน่ง / โรงเรียน</th>
                          <th style="width: 150px;">ลายมือชื่อ</th>
                          <th>หมายเหตุ</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${judges.map((j, i) => `
                          <tr>
                              <td class="text-center">${i + 1}</td>
                              <td>${j.judgeName}</td>
                              <td>${j.role}<br/><small>${j.schoolName}</small></td>
                              <td></td>
                              <td></td>
                          </tr>
                      `).join('')}
                      ${judges.length === 0 ? '<tr><td colspan="5" class="text-center">ไม่มีข้อมูลกรรมการ</td></tr>' : ''}
                  </tbody>
              </table>
          </div>
        `;
    };

    const renderCompetitorSignin = (act: any, teams: Team[], venueInfo: any, schedule: any, typeLabel: 'นักเรียน' | 'ครูผู้ฝึกสอน') => {
        let rows = '';
        let count = 1;
        teams.forEach(t => {
            let members: any[] = [];
            try {
                const raw = typeof t.members === 'string' ? JSON.parse(t.members) : t.members;
                if (typeLabel === 'นักเรียน') {
                    if (Array.isArray(raw)) members = raw; // legacy
                    else if (raw && raw.students) members = raw.students;
                } else {
                    if (raw && raw.teachers) members = raw.teachers;
                }
            } catch(e) {}

            members.forEach(m => {
                const name = m.name || `${m.prefix || ''}${m.firstname || ''} ${m.lastname || ''}`;
                const schoolName = (data.schools || []).find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
                rows += `
                  <tr>
                      <td class="text-center">${count++}</td>
                      <td>${name}</td>
                      <td>${schoolName}</td>
                      <td>${t.teamName}</td>
                      <td></td>
                  </tr>
                `;
            });
        });

        return `
          <div class="page">
              <div class="header">
                  <h1>${headerTitle}</h1>
                  <h2>ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${(data.clusters.find(c => c.ClusterID === clusterFilter)?.ClusterName || '')})`}</h2>
              </div>
              <div class="doc-title">ใบลงชื่อเข้าแข่งขัน (${typeLabel})</div>
              <div class="activity-info">
                  <strong>กิจกรรม:</strong> ${act.name}<br/>
                  ${config.includeVenueDate && schedule ? `<strong>สถานที่:</strong> ${venueInfo?.name} ${schedule.room || ''} | <strong>วันที่:</strong> ${schedule.date} (${schedule.timeRange})` : ''}
              </div>
              <table>
                  <thead>
                      <tr>
                          <th style="width: 40px;">ที่</th>
                          <th style="width: 200px;">ชื่อ - สกุล</th>
                          <th>โรงเรียน</th>
                          <th>ทีม</th>
                          <th style="width: 120px;">ลายมือชื่อ</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${rows || '<tr><td colspan="5" class="text-center">ไม่มีข้อมูล</td></tr>'}
                  </tbody>
              </table>
          </div>
        `;
    };

    const renderScoreSheet = async (act: any, teams: Team[], judges: Judge[], venueInfo: any, schedule: any, chairName: string) => {
        const judgesList = judges.length > 0 ? judges : Array.from({ length: config.scoreColsCount || 3 });
        const colsCount = judgesList.length;
        
        // --- QR Code Generation ---
        const baseUrl = window.location.href.split('#')[0];
        const scoreUrl = `${baseUrl}#/score-input?activityId=${act.id}`;
        let qrCodeImg = '';
        try {
            qrCodeImg = await QRCode.toDataURL(scoreUrl, { margin: 0, width: 100 });
        } catch (e) { console.error("QR Gen Error", e); }

        return `
            <div class="page">
                <div style="position: absolute; top: 10mm; right: 10mm; text-align: center; border: 1px solid #ddd; padding: 5px; background: white;">
                    <img src="${qrCodeImg}" style="width: 80px; height: 80px; display: block;" />
                    <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">สแกนเพื่อกรอกคะแนน</div>
                </div>
                <div class="header">
                    <h1>${headerTitle}</h1>
                    <h2>ระดับ${viewScope === 'area' ? 'เขตพื้นที่การศึกษา' : `กลุ่มเครือข่าย (${(data.clusters.find(c => c.ClusterID === clusterFilter)?.ClusterName || '')})`}</h2>
                </div>
                <div class="doc-title">แบบบันทึกคะแนนการแข่งขัน (สรุปผลรวม)</div>
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
                        ลงชื่อ..........................................................<br/>
                        ( ${chairName} )<br/>
                        ประธานกรรมการตัดสิน
                    </div>
                </div>
            </div>
        `;
    };

    for (const activityId of activityIds) {
        const act = (data.activities || []).find(a => a.id === activityId);
        if (!act) continue;

        const teams = getTeamsForActivity(activityId);
        const judges = getJudgesForActivity(activityId);
        const venueInfo = config.includeVenueDate ? (data.venues || []).find(v => (v.scheduledActivities || []).some(s => s.activityId === activityId)) : null;
        const schedule = venueInfo?.scheduledActivities?.find(s => s.activityId === activityId);
        const clusterLabel = (data.clusters.find(c => c.ClusterID === clusterFilter)?.ClusterName || '');
        const chairperson = judges.find(j => j.role.includes('ประธาน'));
        const chairName = chairperson ? chairperson.judgeName : '..........................................................';

        if (type === 'full-set') {
            htmlContent += renderCoverPage(act, teams.length, judges.length, clusterLabel, venueInfo, schedule);
            htmlContent += renderJudgeSignin(act, judges, venueInfo, schedule);
            htmlContent += renderCompetitorSignin(act, teams, venueInfo, schedule, 'นักเรียน');
            htmlContent += renderCompetitorSignin(act, teams, venueInfo, schedule, 'ครูผู้ฝึกสอน');
            
            judges.forEach(judge => {
                const phoneLine = judge.phone ? `<span style="font-size: 12px;">เบอร์โทรศัพท์ ${judge.phone}</span>` : 'เบอร์โทรศัพท์ ..........................................................';
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
                                        <th colSpan="${criteriaCount}">เกณฑ์คะแนน</th>
                                        <th rowSpan="2" style="width: 80px;">รวม (100)</th>
                                    </tr>
                                    <tr>
                                        ${Array.from({length: criteriaCount}).map((_, i) => `<th style="width: 35px; font-size: 9px;">ข้อ ${i+1}</th>`).join('')}
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
                                                ${Array.from({length: criteriaCount}).map(() => `<td></td>`).join('')}
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
                                    ลงชื่อ..........................................................${judge.role || 'กรรมการ'}<br/>
                                    (${judge.judgeName})<br/>
                                    ${phoneLine}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            htmlContent += await renderScoreSheet(act, teams, judges, venueInfo, schedule, chairName);
        } else if (type === 'score-sheet-individual') {
            judges.forEach(judge => {
                const phoneLine = judge.phone ? `<span style="font-size: 12px;">เบอร์โทรศัพท์ ${judge.phone}</span>` : 'เบอร์โทรศัพท์ ..........................................................';
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
                                        <th colSpan="${criteriaCount}">เกณฑ์คะแนน</th>
                                        <th rowSpan="2" style="width: 80px;">รวม (100)</th>
                                    </tr>
                                    <tr>
                                        ${Array.from({length: criteriaCount}).map((_, i) => `<th style="width: 35px; font-size: 9px;">ข้อ ${i+1}</th>`).join('')}
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
                                                ${Array.from({length: criteriaCount}).map(() => `<td></td>`).join('')}
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
                                    ลงชื่อ..........................................................${judge.role || 'กรรมการ'}<br/>
                                    (${judge.judgeName})<br/>
                                    ${phoneLine}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else if (type === 'competitor-signin') {
            htmlContent += renderCompetitorSignin(act, teams, venueInfo, schedule, 'นักเรียน');
            htmlContent += renderCompetitorSignin(act, teams, venueInfo, schedule, 'ครูผู้ฝึกสอน');
        } else if (type === 'judge-signin') {
            htmlContent += renderJudgeSignin(act, judges, venueInfo, schedule);
        } else if (type === 'score-sheet') {
            htmlContent += await renderScoreSheet(act, teams, judges, venueInfo, schedule, chairName);
        } else if (type === 'envelope') {
            htmlContent += `
                <div class="page">
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
                </div>
            `;
        }
    }

    htmlContent += `</body></html>`;
    return htmlContent;
  };

  const handlePrintAction = async (type: DocType, ids: string[]) => {
      setBulkConfirm(prev => ({ ...prev, isOpen: false }));
      
      if (ids.length === 0) return;

      setIsGenerating(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          setIsGenerating(false);
          alert('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
          return;
      }

      const content = await generateHTML(ids, type);
      printWindow.document.write(content);
      printWindow.document.close();
      setIsGenerating(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {isGuest && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 shadow-sm animate-pulse">
            <Lock className="w-5 h-5 shrink-0" />
            <div className="text-sm">
                <p className="font-bold">โหมดผู้เยี่ยมชม (Read-only)</p>
                <p>คุณสามารถดูรายการได้ แต่การสั่งพิมพ์เอกสารจำเป็นต้อง <b>Login</b> เข้าสู่ระบบด้วยบัญชีโรงเรียนหรือเขตพื้นที่</p>
            </div>
        </div>
      )}
      {bulkConfirm.isOpen && (
          <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                  <div className="p-6 text-center border-b border-gray-100">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                          <PrinterCheck className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">ยืนยันการพิมพ์เอกสาร</h3>
                      <p className="text-gray-500 text-sm mt-2">
                          คุณกำลังจะสั่งพิมพ์เอกสาร <span className="font-bold text-blue-600">"{DOC_NAMES[bulkConfirm.type]}"</span> <br/>
                          จำนวน <span className="font-bold text-gray-900">{bulkConfirm.ids.length} รายการ</span>
                      </p>
                      {bulkConfirm.ids.length > 20 && (
                          <div className="mt-3 bg-orange-50 text-orange-700 text-xs p-2 rounded border border-orange-100">
                              คำเตือน: การเลือกจำนวนมากอาจใช้เวลาโหลดนาน
                          </div>
                      )}
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                <Printer className="w-6 h-6 mr-2 text-blue-600" />
                เอกสารการแข่งขัน (Documents)
            </h2>
            <p className="text-gray-500 text-sm mt-1">พิมพ์ใบลงชื่อ แบบบันทึกคะแนนรายคน/รวม และใบปะหน้าซองกิจกรรม</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            {!isGuest && (
                <button 
                    onClick={() => setShowConfigModal(true)}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200"
                >
                    <Settings className="w-4 h-4 mr-2" />
                    ตั้งค่าการพิมพ์
                </button>
            )}
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
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
      <div className={`p-5 rounded-2xl border flex flex-col lg:flex-row items-center justify-between gap-4 transition-all sticky top-2 z-20 ${viewScope === 'area' ? 'bg-purple-50 border-purple-100 shadow-lg shadow-purple-100/50' : 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-100/50'}`}>
          <div className="flex items-center gap-3 shrink-0">
              <div className={`text-white font-black px-4 py-1.5 rounded-full shadow-md text-sm transition-all ${selectionCount > 0 ? 'bg-green-600 animate-pulse' : (viewScope === 'area' ? 'bg-purple-600' : 'bg-blue-600')}`}>
                  {selectionCount > 0 ? selectionCount : filteredActivities.length}
              </div>
              <div className="flex flex-col">
                <span className={`font-black text-sm uppercase tracking-tight ${selectionCount > 0 ? 'text-green-700' : (viewScope === 'area' ? 'text-purple-900' : 'text-blue-900')}`}>
                    {selectionCount > 0 ? 'เลือกรายการพิมพ์แล้ว' : 'รายการที่แสดงทั้งหมด'}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                    {selectionCount > 0 ? 'กดปุ่มด้านขวาเพื่อพิมพ์เฉพาะรายการที่เลือก' : 'กดปุ่มด้านขวาเพื่อพิมพ์ทั้งหมดในรายการ'}
                </span>
              </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-end flex-1">
              <button 
                onClick={() => handleSmartPrint('full-set')}
                disabled={isGuest}
                className="bg-emerald-600 hover:enabled:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-600 transition-all flex items-center shadow-md disabled:opacity-50"
              >
                  <FolderOpen className="w-4 h-4 mr-2" /> พิมพ์แบบจัดชุด (Full Set)
              </button>
              <button 
                onClick={() => handleSmartPrint('judge-signin')}
                disabled={isGuest}
                className="bg-white hover:enabled:bg-blue-600 hover:enabled:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm disabled:opacity-50"
              >
                  <UserCheck className="w-4 h-4 mr-2" /> ใบเซ็นกรรมการ
              </button>
              <button 
                onClick={() => handleSmartPrint('competitor-signin')}
                disabled={isGuest}
                className="bg-white hover:enabled:bg-blue-600 hover:enabled:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm disabled:opacity-50"
              >
                  <Users className="w-4 h-4 mr-2" /> ใบเซ็นผู้แข่ง
              </button>
              <button 
                onClick={() => handleSmartPrint('score-sheet-individual')}
                disabled={isGuest}
                className="bg-white hover:enabled:bg-blue-600 hover:enabled:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm disabled:opacity-50"
              >
                  <UserRound className="w-4 h-4 mr-2" /> ใบให้คะแนนรายคน
              </button>
              <button 
                onClick={() => handleSmartPrint('score-sheet')}
                disabled={isGuest}
                className="bg-white hover:enabled:bg-blue-600 hover:enabled:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm disabled:opacity-50"
              >
                  <ClipboardList className="w-4 h-4 mr-2" /> ใบให้คะแนนรวม
              </button>
              <button 
                onClick={() => handleSmartPrint('envelope')}
                disabled={isGuest}
                className="bg-white hover:enabled:bg-blue-600 hover:enabled:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 transition-all flex items-center shadow-sm disabled:opacity-50"
              >
                  <Mail className="w-4 h-4 mr-2" /> ปะหน้าซอง
              </button>
          </div>
      </div>
      <div className="md:hidden space-y-4">
          <div className="flex items-center justify-between px-2">
                <button onClick={toggleAllSelection} className="flex items-center text-sm font-bold text-gray-600">
                    {isAllSelected ? <CheckSquare className="w-5 h-5 mr-2 text-blue-600" /> : <Square className="w-5 h-5 mr-2" />}
                    เลือกทั้งหมด
                </button>
                <span className="text-xs text-gray-400">{filteredActivities.length} รายการ</span>
          </div>
          {filteredActivities.map((act) => {
              const teamsCount = getTeamsForActivity(act.id).length;
              const judgesCount = getJudgesForActivity(act.id).length;
              const isSelected = selectedActivityIds.has(act.id);
              return (
                  <div key={act.id} className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${isSelected ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/20' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                          <div className="flex items-start gap-3">
                              <button onClick={() => toggleActivitySelection(act.id)} className="mt-1 text-gray-400">
                                  {isSelected ? <CheckSquare className="w-6 h-6 text-blue-600" /> : <Square className="w-6 h-6" />}
                              </button>
                              <div>
                                  <h4 className="font-bold text-gray-800 text-sm line-clamp-2">{act.name}</h4>
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">{act.category}</span>
                              </div>
                          </div>
                      </div>
                      <div className="flex gap-2 ml-9 mb-3">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${teamsCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                              {teamsCount} ทีม
                          </span>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${judgesCount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                              {judgesCount} กรรมการ
                          </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-9">
                          <button onClick={() => handlePrintAction('full-set', [act.id])} className="text-xs bg-emerald-100 border border-emerald-200 text-emerald-700 py-1.5 rounded hover:bg-emerald-200 font-bold col-span-2">พิมพ์แบบจัดชุด (Full Set)</button>
                          <button onClick={() => handlePrintAction('judge-signin', [act.id])} className="text-xs bg-white border border-gray-200 text-gray-600 py-1.5 rounded hover:bg-gray-50">ใบเซ็นกรรมการ</button>
                          <button onClick={() => handlePrintAction('competitor-signin', [act.id])} className="text-xs bg-white border border-gray-200 text-gray-600 py-1.5 rounded hover:bg-gray-50">ใบเซ็นผู้แข่ง</button>
                          <button onClick={() => handlePrintAction('score-sheet', [act.id])} className="text-xs bg-white border border-gray-200 text-gray-600 py-1.5 rounded hover:bg-gray-50">ใบคะแนนรวม</button>
                          <button onClick={() => handlePrintAction('envelope', [act.id])} className="text-xs bg-white border border-gray-200 text-gray-600 py-1.5 rounded hover:bg-gray-50">หน้าซอง</button>
                      </div>
                  </div>
              )
          })}
      </div>
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                                          <button onClick={() => handlePrintAction('full-set', [act.id])} disabled={isGuest} className="p-2 text-emerald-600 hover:enabled:bg-emerald-100 rounded-lg transition-colors border border-transparent hover:enabled:border-emerald-200 disabled:opacity-30" title="พิมพ์แบบจัดชุด (Full Set)"><FolderOpen className="w-5 h-5" /></button>
                                          <button onClick={() => handlePrintAction('judge-signin', [act.id])} disabled={isGuest} className="p-2 text-blue-600 hover:enabled:bg-blue-100 rounded-lg transition-colors border border-transparent hover:enabled:border-blue-200 disabled:opacity-30" title="พิมพ์ใบเซ็นชื่อกรรมการ"><UserCheck className="w-5 h-5" /></button>
                                          <button onClick={() => handlePrintAction('competitor-signin', [act.id])} disabled={isGuest} className="p-2 text-indigo-600 hover:enabled:bg-indigo-100 rounded-lg transition-colors border border-transparent hover:enabled:border-indigo-200 disabled:opacity-30" title="พิมพ์ใบเซ็นชื่อผู้แข่ง"><Users className="w-5 h-5" /></button>
                                          <button onClick={() => handlePrintAction('score-sheet-individual', [act.id])} disabled={isGuest} className="p-2 text-blue-800 hover:enabled:bg-blue-100 rounded-lg transition-colors border border-transparent hover:enabled:border-blue-200 disabled:opacity-30" title="พิมพ์ใบให้คะแนนรายบุคคล"><UserRound className="w-5 h-5" /></button>
                                          <button onClick={() => handlePrintAction('score-sheet', [act.id])} disabled={isGuest} className="p-2 text-emerald-600 hover:enabled:bg-emerald-100 rounded-lg transition-colors border border-transparent hover:enabled:border-emerald-200 disabled:opacity-30" title="พิมพ์แบบบันทึกคะแนนรวม"><ClipboardList className="w-5 h-5" /></button>
                                          <button onClick={() => handlePrintAction('envelope', [act.id])} disabled={isGuest} className="p-2 text-orange-600 hover:enabled:bg-orange-100 rounded-lg transition-colors border border-transparent hover:enabled:border-orange-200 disabled:opacity-30" title="พิมพ์ใบปะหน้าซองกิจกรรม"><Mail className="w-5 h-5" /></button>
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
      {!isGuest && (
        <PrintConfigModal 
            isOpen={showConfigModal} 
            onClose={() => setShowConfigModal(false)}
            onSave={(id, config) => setPrintConfigs({...printConfigs, [id]: config})}
            data={data}
            currentUser={user}
            currentConfigs={printConfigs}
        />
      )}
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
