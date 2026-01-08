
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, Team, CertificateTemplate } from '../types';
import { Search, FileBadge, Settings, Printer, LayoutGrid, Trophy, School, CheckCircle, ChevronLeft, ChevronRight, X, User as UserIcon, GraduationCap, Filter, Lock, Download, Loader2 } from 'lucide-react';
import CertificateConfigModal from './CertificateConfigModal';
import { getCertificateConfig, getProxyImage } from '../services/api';
import QRCode from 'qrcode';
import SearchableSelect from './SearchableSelect';

// Define PDFMake types globally
declare global {
  interface Window {
    pdfMake: any;
  }
}

// 1mm = 2.83465pt
const mmToPt = (mm: number) => mm * 2.83465;

// Font URL for Thai Sarabun (hosted on CDN)
const THAI_FONT_URL = "https://cdn.jsdelivr.net/npm/@fontsource/sarabun/files/sarabun-thai-400-normal.woff";
const THAI_FONT_BOLD_URL = "https://cdn.jsdelivr.net/npm/@fontsource/sarabun/files/sarabun-thai-700-normal.woff";

interface CertificatesViewProps {
  data: AppData;
  user?: User | null;
}

const CertificatesView: React.FC<CertificatesViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // View State
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  
  // Config & Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [certificateTemplates, setCertificateTemplates] = useState<Record<string, CertificateTemplate>>({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Permissions
  const userRole = user?.level?.toLowerCase();
  const isAdminOrArea = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const isSchoolAdmin = userRole === 'school_admin' || userRole === 'user';
  const canConfigureCert = isAdminOrArea || isGroupAdmin;

  // Context for filters
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  useEffect(() => {
      const loadTemplates = async () => {
          const configs = await getCertificateConfig();
          setCertificateTemplates(configs);
      };
      loadTemplates();
  }, []);

  useEffect(() => {
      // Default view for Admin is Area, others Cluster
      if (isAdminOrArea) setViewLevel('area');
      else setViewLevel('cluster');
  }, [isAdminOrArea]);

  const handleSaveTemplates = (newTemplates: Record<string, CertificateTemplate>) => {
      setCertificateTemplates(newTemplates);
  };

  const categoryOptions = useMemo(() => {
      const cats = Array.from(new Set(data.activities.map(a => a.category))).sort();
      return [{ label: 'ทุกหมวดหมู่', value: 'All' }, ...cats.map(c => ({ label: c, value: c }))];
  }, [data.activities]);

  const getMemberCounts = (team: Team) => {
      let tCount = 0, sCount = 0;
      let memberSource = team.members;
      if (viewLevel === 'area' && team.stageInfo) {
          try { const areaInfo = JSON.parse(team.stageInfo); if (areaInfo.members) memberSource = areaInfo.members; } catch {}
      }
      try {
          const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
          if (Array.isArray(raw)) sCount = raw.length;
          else if (raw) { tCount = (raw.teachers || []).length; sCount = (raw.students || []).length; }
      } catch {}
      return { tCount, sCount };
  };

  const filteredTeams = useMemo(() => {
      // Return empty if templates not loaded yet to prevent flash of content
      if (Object.keys(certificateTemplates).length === 0) return [];

      return data.teams.filter(team => {
          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          const clusterId = school?.SchoolCluster;
          
          // 1. Permission Check
          if (isSchoolAdmin) {
              const isCreator = team.createdBy === user?.userid;
              const isSameSchool = team.schoolId === user?.SchoolID || team.schoolId === userSchool?.SchoolName;
              if (!isCreator && !isSameSchool) return false;
          }
          if (isGroupAdmin) {
              if (clusterId !== userClusterID) return false;
          }

          // 2. View Level Logic & Template Existence Check
          if (viewLevel === 'area') {
              // Area Level: Must be Rank 1 + Flag TRUE + Status Area
              if (team.stageStatus !== 'Area' && String(team.flag).toUpperCase() !== 'TRUE') return false;
              // Must have Area Template Configured
              if (!certificateTemplates['area']) return false;
          } else {
              // Cluster Level: Must have Cluster Template Configured
              if (!clusterId || !certificateTemplates[clusterId]) return false;
          }

          // 3. Status Check (MUST BE APPROVED)
          const status = String(team.status);
          const isApproved = status === 'Approved' || status === '1';
          if (!isApproved) return false;

          // 4. Category Filter
          const activity = data.activities.find(a => a.id === team.activityId);
          if (selectedCategory !== 'All' && activity?.category !== selectedCategory) return false;

          // 5. Search
          const term = searchTerm.toLowerCase();
          return (
              team.teamName.toLowerCase().includes(term) || 
              team.teamId.toLowerCase().includes(term) || 
              activity?.name.toLowerCase().includes(term) ||
              school?.SchoolName.toLowerCase().includes(term)
          );
      });
  }, [data.teams, searchTerm, viewLevel, user, data.schools, certificateTemplates, selectedCategory, isSchoolAdmin, isGroupAdmin, userClusterID, userSchool]);

  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const extractDriveId = (url: string) => {
      const match = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
      return match ? match[1] : null;
  }

  // --- PDF Generation Logic using PDFMake ---

  const loadFontToBase64 = async (url: string): Promise<string> => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
              const result = reader.result as string;
              // Remove data:application/font-woff;base64, prefix
              resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
      });
  };

  const preparePDFMake = async () => {
      if (!window.pdfMake.vfs || !window.pdfMake.vfs['Sarabun-Regular.ttf']) {
          setGenerationProgress('Loading Fonts...');
          try {
              const regularFont = await loadFontToBase64(THAI_FONT_URL);
              const boldFont = await loadFontToBase64(THAI_FONT_BOLD_URL);
              
              window.pdfMake.vfs = window.pdfMake.vfs || {};
              window.pdfMake.vfs['Sarabun-Regular.ttf'] = regularFont;
              window.pdfMake.vfs['Sarabun-Bold.ttf'] = boldFont;

              window.pdfMake.fonts = {
                  Sarabun: {
                      normal: 'Sarabun-Regular.ttf',
                      bold: 'Sarabun-Bold.ttf',
                      italics: 'Sarabun-Regular.ttf',
                      bolditalics: 'Sarabun-Bold.ttf'
                  },
                  Roboto: {
                       normal: 'Sarabun-Regular.ttf', // Fallback
                       bold: 'Sarabun-Bold.ttf',
                       italics: 'Sarabun-Regular.ttf',
                       bolditalics: 'Sarabun-Bold.ttf'
                  }
              };
          } catch (e) {
              console.error("Font loading error", e);
              throw new Error("Failed to load Thai fonts");
          }
      }
  };

  const handleDownloadPDF = async (team: Team) => {
      setIsGenerating(true);
      setGenerationProgress('Preparing...');

      try {
          await preparePDFMake();

          const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          const clusterID = schoolObj?.SchoolCluster;
          const template = viewLevel === 'area' ? certificateTemplates['area'] : (clusterID ? certificateTemplates[clusterID] : undefined);

          if (!template) {
              alert('ไม่พบรูปแบบเกียรติบัตร');
              setIsGenerating(false);
              return;
          }

          // Process Images (Must be Base64 for PDFMake)
          setGenerationProgress('Processing Images...');
          const processUrl = async (url: string) => {
              if (!url) return null;
              if (url.startsWith('data:')) return url;
              const id = extractDriveId(url);
              if (id) {
                  const base64 = await getProxyImage(id);
                  return base64;
              }
              return null; // Fallback or skip
          };

          const bgImage = await processUrl(template.backgroundUrl);
          const logoLeft = await processUrl(template.logoLeftUrl);
          const logoRight = await processUrl(template.logoRightUrl);
          
          const signatures = await Promise.all(template.signatories.map(async (sig) => ({
              ...sig,
              image: await processUrl(sig.signatureUrl)
          })));

          // Prepare Content Data
          const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
          const schoolName = schoolObj?.SchoolName || team.schoolId;
          const clusterName = clusterID ? data.clusters.find(c => c.ClusterID === clusterID)?.ClusterName : '';
          
          let members: any[] = [];
          let memberSource = team.members;
          if (viewLevel === 'area' && team.stageInfo) {
              try { const info = JSON.parse(team.stageInfo); if(info.members) memberSource = info.members; } catch {}
          }
          try {
              const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
              if (Array.isArray(raw)) members = raw.map(m => ({...m, role: 'Student'}));
              else if (raw) members = [...(raw.teachers||[]).map((m:any)=>({...m,role:'Teacher'})), ...(raw.students||[]).map((m:any)=>({...m,role:'Student'}))];
          } catch {}

          const eventName = template.eventName || (viewLevel === 'area' ? 'งานศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่การศึกษา' : `งานศิลปหัตถกรรมนักเรียน ${clusterName}`);

          // --- Construct PDF Definition ---
          const content = [];

          for (let i = 0; i < members.length; i++) {
              const member = members[i];
              const roleText = member.role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'นักเรียน';
              
              // Generate Serial
              const runNum = (template.serialStart || 1) + i;
              const serialNo = (template.serialFormat || '{activityId}-{year}-{run:4}')
                  .replace('{year}', String(new Date().getFullYear()))
                  .replace('{th_year}', String(new Date().getFullYear()+543))
                  .replace('{id}', team.teamId)
                  .replace('{activityId}', team.activityId)
                  .replace(/{run:(\d+)}/, (_, d) => String(runNum).padStart(parseInt(d), '0'))
                  .replace('{run}', String(runNum));

              // Generate QR
              const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify?id=${team.teamId}`;
              const qrCodeBase64 = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 100 });

              // Award Text Logic
              let awardText = "เข้าร่วมการแข่งขัน";
              if (template.showRank) {
                  const rank = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').rank || team.rank) : team.rank;
                  const medal = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').medal || team.medalOverride) : team.medalOverride;
                  let medalThai = medal === 'Gold' ? "เหรียญทอง" : medal === 'Silver' ? "เหรียญเงิน" : medal === 'Bronze' ? "เหรียญทองแดง" : medal === 'Participant' ? "เข้าร่วม" : "";
                  
                  if (rank === '1') awardText = `รางวัลชนะเลิศ${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                  else if (rank === '2') awardText = `รางวัลรองชนะเลิศอันดับ 1${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                  else if (rank === '3') awardText = `รางวัลรองชนะเลิศอันดับ 2${medalThai ? ` (ระดับ${medalThai})` : ''}`;
                  else if (medalThai && medalThai !== "เข้าร่วม") awardText = `รางวัลระดับ${medalThai}${rank ? ` (ลำดับที่ ${rank})` : ''}`;
              }

              // Coordinates Conversion (mm to pt)
              const contentTop = mmToPt(template.contentTop || 25);
              const logoH = mmToPt(template.logoHeight || 35);
              const footerBottom = mmToPt(template.footerBottom || 25);
              
              const pageContent = [
                  // Serial No (Absolute)
                  { text: `No. ${serialNo}`, absolutePosition: { x: 0, y: mmToPt(template.serialTop || 10) }, alignment: 'right', fontSize: 10, bold: true, color: '#444444', margin: [0, 0, mmToPt(template.serialRight || 10), 0] },
                  
                  // Main Content Container (Margins handled by spacing)
                  {
                      stack: [
                          // Logos
                          {
                              columns: [
                                  logoLeft ? { image: logoLeft, fit: [200, logoH], alignment: logoRight ? 'left' : 'center' } : { text: '' },
                                  logoRight ? { image: logoRight, fit: [200, logoH], alignment: 'right' } : { text: '' }
                              ],
                              margin: [40, 0, 40, 10] // Side margins for logos
                          },
                          // Header
                          { text: template.headerText, style: 'header', margin: [0, 10, 0, 5] },
                          { text: template.subHeaderText, style: 'subheader', margin: [0, 0, 0, 15] },
                          
                          // Name
                          { text: `${member.prefix||''}${member.name||member.firstname+' '+member.lastname}`, style: 'name', margin: [0, 0, 0, 5] },
                          
                          // Description
                          { 
                              text: [
                                  { text: `${roleText}โรงเรียน `, style: 'desc' },
                                  { text: schoolName, style: 'highlight' },
                                  { text: '\nได้รับ ', style: 'desc' },
                                  { text: awardText, style: 'highlight' },
                                  { text: `\nกิจกรรม ${activity}\n${eventName}`, style: 'desc' }
                              ],
                              alignment: 'center',
                              margin: [0, 5, 0, 15]
                          },
                          
                          // Date
                          { text: template.dateText, style: 'date', margin: [0, 0, 0, 20] },

                          // Signatures (Columns)
                          {
                              columns: signatures.map(sig => ({
                                  stack: [
                                      sig.image ? { image: sig.image, fit: [100, mmToPt(20)], alignment: 'center', margin: [0, 0, 0, -5] } : { text: '', margin: [0, mmToPt(15), 0, 0] },
                                      template.showSignatureLine !== false ? { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, dash: { length: 2 } }], alignment: 'center', margin: [0, 0, 0, 2] } : { text: '' },
                                      { text: `(${sig.name})`, style: 'sigName' },
                                      { text: sig.position, style: 'sigPos' }
                                  ],
                                  alignment: 'center'
                              })),
                              columnGap: 20
                          }
                      ],
                      margin: [0, contentTop, 0, 0], // Top margin for content
                      alignment: 'center'
                  },

                  // QR Code (Absolute)
                  {
                      image: qrCodeBase64,
                      width: mmToPt(22),
                      absolutePosition: { x: 842 - mmToPt(template.qrRight || 10) - mmToPt(22), y: 595 - mmToPt(template.qrBottom || 10) - mmToPt(22) - 15 } // A4 Landscape width ~842pt, height ~595pt
                  },
                  {
                      text: 'Scan for Verify',
                      fontSize: 8,
                      bold: true,
                      color: '#555555',
                      absolutePosition: { x: 842 - mmToPt(template.qrRight || 10) - mmToPt(22), y: 595 - mmToPt(template.qrBottom || 10) },
                      alignment: 'center',
                      width: mmToPt(22)
                  }
              ];
              
              content.push(pageContent);
              
              // Page Break for next member
              if (i < members.length - 1) {
                  content[content.length - 1].push({ text: '', pageBreak: 'after' });
              }
          }

          // Doc Definition
          const docDefinition = {
              pageSize: 'A4',
              pageOrientation: 'landscape',
              background: bgImage ? function(currentPage: number) {
                  return {
                      image: bgImage,
                      width: 841.89, // A4 Landscape width in pts
                      height: 595.28, // A4 Landscape height in pts
                      absolutePosition: { x: 0, y: 0 }
                  };
              } : undefined,
              content: content.flat(),
              defaultStyle: {
                  font: 'Sarabun'
              },
              styles: {
                  header: { fontSize: 24, bold: true, color: '#1e3a8a', alignment: 'center' },
                  subheader: { fontSize: 16, alignment: 'center', color: '#000000' },
                  name: { fontSize: 32, bold: true, color: '#111111', alignment: 'center' },
                  desc: { fontSize: 16, alignment: 'center', color: '#000000', lineHeight: 1.3 },
                  highlight: { fontSize: 16, bold: true, color: '#2563eb' },
                  date: { fontSize: 14, alignment: 'center', color: '#000000' },
                  sigName: { fontSize: 12, bold: true, alignment: 'center', marginTop: 5 },
                  sigPos: { fontSize: 10, alignment: 'center' }
              },
              pageMargins: [0, 0, 0, 0] // We handle margins manually in content
          };

          setGenerationProgress('Generating PDF...');
          // Generate PDF
          window.pdfMake.createPdf(docDefinition).download(`certificates_${team.teamId}.pdf`);

      } catch (e) {
          console.error("PDF Generation Error", e);
          alert('เกิดข้อผิดพลาดในการสร้าง PDF (อาจเกิดจากไฟล์รูปภาพ หรือ ฟอนต์)');
      } finally {
          setIsGenerating(false);
      }
  };

  const handlePrint = async (team: Team) => {
    // Re-use handleDownloadPDF logic but open in new window (PDFMake supports open())
    // For simplicity and consistency with modern browsers, downloading PDF is often better, 
    // but users might expect "Print" to open a dialog.
    // However, window.print() works best on HTML. Since we switched to PDFMake for PDF file generation,
    // "Print" button logic in this view was usually just generating HTML and calling window.print().
    // We will keep the HTML print logic separate if needed, OR redirect "Print" to "Download PDF" 
    // because PDFMake produces a print-ready file.
    
    if (confirm("ต้องการดาวน์โหลด PDF สำหรับพิมพ์ใช่หรือไม่?")) {
        handleDownloadPDF(team);
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        
        {/* Loading Overlay */}
        {isGenerating && (
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
                <h3 className="text-xl font-bold mb-2">กำลังดำเนินการ...</h3>
                <p className="text-sm opacity-80">{generationProgress}</p>
            </div>
        )}

        {showConfigModal && <CertificateConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} data={data} onSave={handleSaveTemplates} initialTemplates={certificateTemplates} currentUser={user} />}
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div><h2 className="text-xl font-bold text-gray-800 flex items-center"><FileBadge className="w-6 h-6 mr-2 text-green-600"/> พิมพ์เกียรติบัตร (Certificates)</h2><p className="text-gray-500 text-sm mt-1">ดาวน์โหลดเกียรติบัตรสำหรับทีมที่ได้รับรางวัล (และอนุมัติแล้ว)</p></div>
            <div className="flex gap-2">
                {canConfigureCert && <button onClick={() => setShowConfigModal(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm font-medium"><Settings className="w-4 h-4"/> ตั้งค่ารูปแบบ</button>}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewLevel('cluster')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid className="w-4 h-4 inline mr-1"/> Cluster</button>
                    <button onClick={() => setViewLevel('area')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><Trophy className="w-4 h-4 inline mr-1"/> Area</button>
                </div>
            </div>
        </div>

        {/* Improved Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 outline-none" 
                    placeholder="ค้นหาชื่อทีม, รหัส, ชื่อกิจกรรม..." 
                    value={searchTerm} 
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                />
            </div>
            <div className="w-full md:w-64">
                <SearchableSelect 
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={val => { setSelectedCategory(val); setCurrentPage(1); }}
                    placeholder="ทุกหมวดหมู่"
                    icon={<Filter className="w-4 h-4" />}
                />
            </div>
        </div>
        
        {/* Teams List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={viewLevel === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                        <tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ทีม</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">รายการ</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">โรงเรียน</th><th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">สมาชิก</th><th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">จัดการ</th></tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTeams.map(team => {
                            const activity = data.activities.find(a => a.id === team.activityId);
                            const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                            const { tCount, sCount } = getMemberCounts(team);
                            const score = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').score || 0) : team.score;
                            
                            // Template Logic Check
                            const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                            const clusterID = schoolObj?.SchoolCluster;
                            const template = viewLevel === 'area' ? certificateTemplates['area'] : (clusterID ? certificateTemplates[clusterID] : undefined);
                            
                            // Check visibility flags
                            const showPrint = !template?.hidePrintButton;
                            const showPdf = !template?.hidePdfButton;

                            return (
                                <tr key={team.teamId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{team.teamName}</div><div className="text-xs text-gray-500">{team.teamId}</div></td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{activity?.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{school?.SchoolName}</td>
                                    <td className="px-6 py-4 text-center text-xs text-gray-600"><span className="mr-2">ครู: {tCount}</span><span>นักเรียน: {sCount}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        {score > 0 ? (
                                            <div className="flex justify-end gap-2">
                                                {showPrint && (
                                                    <button onClick={() => handlePrint(team)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-bold flex items-center shadow-sm">
                                                        <Printer className="w-4 h-4 mr-1"/> พิมพ์
                                                    </button>
                                                )}
                                                {showPdf && (
                                                    <button onClick={() => handleDownloadPDF(team)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold flex items-center shadow-sm">
                                                        <Download className="w-4 h-4 mr-1"/> PDF
                                                    </button>
                                                )}
                                                {!showPrint && !showPdf && <span className="text-xs text-gray-400 italic">ปิดการพิมพ์</span>}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">รอผลคะแนน</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {paginatedTeams.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        {Object.keys(certificateTemplates).length === 0 ? <Lock className="w-8 h-8 opacity-20"/> : <FileBadge className="w-8 h-8 opacity-20" />}
                                    </div>
                                    <p>ไม่พบข้อมูล (ต้องผ่านการอนุมัติ และกลุ่มเครือข่ายตั้งค่ารูปแบบแล้ว)</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        {totalPages > 1 && <div className="flex justify-between items-center bg-white p-4 rounded-xl border"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronLeft/></button><span className="text-sm">Page {currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight/></button></div>}
    </div>
  );
};

export default CertificatesView;
