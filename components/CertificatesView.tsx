
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, Team, CertificateTemplate } from '../types';
import { Search, FileBadge, Settings, Printer, LayoutGrid, Trophy, School, CheckCircle, ChevronLeft, ChevronRight, X, User as UserIcon, GraduationCap, Filter, Lock, Download, Loader2, CheckSquare, Square, Medal } from 'lucide-react';
import CertificateConfigModal from './CertificateConfigModal';
import { getCertificateConfig, getProxyImage } from '../services/api';
import QRCode from 'qrcode';
import SearchableSelect from './SearchableSelect';

interface CertificatesViewProps {
  data: AppData;
  user?: User | null;
}

// --- Skeleton Component ---
const CertificatesSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="bg-white p-6 rounded-xl border border-gray-100 flex justify-between items-center">
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4">
            <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
            <div className="h-10 w-64 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 h-40 flex flex-col justify-between">
                    <div className="flex justify-between">
                        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                    <div className="h-8 w-full bg-gray-200 rounded-lg mt-4"></div>
                </div>
            ))}
        </div>
    </div>
);

const CertificatesView: React.FC<CertificatesViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMedal, setSelectedMedal] = useState('All'); // NEW: Medal Filter
  
  // View State
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  const [isLoading, setIsLoading] = useState(true); // NEW: Loading state
  
  // Bulk Selection
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  
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
  
  const canConfigureCert = isAdminOrArea || (isGroupAdmin && viewLevel === 'cluster');

  // Context for filters
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  useEffect(() => {
      const loadTemplates = async () => {
          setIsLoading(true);
          const configs = await getCertificateConfig();
          setCertificateTemplates(configs);
          setTimeout(() => setIsLoading(false), 500); // Simulate fetch delay
      };
      loadTemplates();
  }, []);

  useEffect(() => {
      if (isAdminOrArea) setViewLevel('area');
      else setViewLevel('cluster');
  }, [isAdminOrArea]);

  // Reset pagination and selection when filters change
  useEffect(() => {
      setCurrentPage(1);
      setSelectedTeamIds(new Set());
  }, [searchTerm, selectedCategory, selectedMedal, viewLevel]);

  const handleSaveTemplates = (newTemplates: Record<string, CertificateTemplate>) => {
      setCertificateTemplates(newTemplates);
  };

  const categoryOptions = useMemo(() => {
      const cats = Array.from(new Set(data.activities.map(a => a.category))).sort();
      return [{ label: 'ทุกหมวดหมู่', value: 'All' }, ...cats.map(c => ({ label: c, value: c }))];
  }, [data.activities]);

  const medalOptions = [
      { label: 'ทุกรางวัล', value: 'All' },
      { label: 'เหรียญทอง (Gold)', value: 'Gold' },
      { label: 'เหรียญเงิน (Silver)', value: 'Silver' },
      { label: 'เหรียญทองแดง (Bronze)', value: 'Bronze' },
      { label: 'เข้าร่วม (Participant)', value: 'Participant' },
  ];

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

  // Helper: Calculate Medal
  const getTeamMedal = (team: Team) => {
      let score = 0;
      let medal = '';
      if (viewLevel === 'area') {
          try {
              const info = JSON.parse(team.stageInfo || '{}');
              score = info.score || 0;
              medal = info.medal || '';
          } catch {}
      } else {
          score = team.score;
          medal = team.medalOverride || '';
      }

      if (!medal && score > 0) {
          if (score >= 80) return 'Gold';
          if (score >= 70) return 'Silver';
          if (score >= 60) return 'Bronze';
          return 'Participant';
      }
      return medal;
  };

  const filteredTeams = useMemo(() => {
      if (Object.keys(certificateTemplates).length === 0) return [];

      return data.teams.filter(team => {
          const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
          const clusterId = school?.SchoolCluster;
          
          if (isSchoolAdmin) {
              const isCreator = team.createdBy === user?.userid;
              const isSameSchool = team.schoolId === user?.SchoolID || team.schoolId === userSchool?.SchoolName;
              if (!isCreator && !isSameSchool) return false;
          }
          if (isGroupAdmin) {
              if (clusterId !== userClusterID) return false;
          }

          if (viewLevel === 'area') {
              if (team.stageStatus !== 'Area' && String(team.flag).toUpperCase() !== 'TRUE') return false;
              if (!certificateTemplates['area']) return false;
          } else {
              if (!clusterId || !certificateTemplates[clusterId]) return false;
          }

          const status = String(team.status);
          const isApproved = status === 'Approved' || status === '1';
          if (!isApproved) return false;

          const activity = data.activities.find(a => a.id === team.activityId);
          if (selectedCategory !== 'All' && activity?.category !== selectedCategory) return false;

          // Medal Filter
          if (selectedMedal !== 'All') {
              const currentMedal = getTeamMedal(team);
              if (!currentMedal.includes(selectedMedal)) return false;
          }

          const term = searchTerm.toLowerCase();
          return (
              team.teamName.toLowerCase().includes(term) || 
              team.teamId.toLowerCase().includes(term) || 
              activity?.name.toLowerCase().includes(term) ||
              school?.SchoolName.toLowerCase().includes(term)
          );
      });
  }, [data.teams, searchTerm, viewLevel, user, data.schools, certificateTemplates, selectedCategory, selectedMedal, isSchoolAdmin, isGroupAdmin, userClusterID, userSchool]);

  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Bulk Selection Handlers ---
  const handleToggleSelect = (teamId: string) => {
      const newSet = new Set(selectedTeamIds);
      if (newSet.has(teamId)) newSet.delete(teamId);
      else newSet.add(teamId);
      setSelectedTeamIds(newSet);
  };

  const handleSelectAll = () => {
      if (selectedTeamIds.size === paginatedTeams.length) {
          setSelectedTeamIds(new Set());
      } else {
          const ids = new Set(paginatedTeams.map(t => t.teamId));
          setSelectedTeamIds(ids);
      }
  };

  // --- Print Generation Logic ---

  const extractDriveId = (url: string) => {
      const match = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
      return match ? match[1] : null;
  }

  const prepareDataAndGetTemplate = async (team: Team) => {
      const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const clusterID = schoolObj?.SchoolCluster;
      let template = viewLevel === 'area' ? certificateTemplates['area'] : (clusterID ? certificateTemplates[clusterID] : undefined);
      
      if (!template) return null;

      const processedTemplate = { ...template };

      const processUrl = async (url: string) => {
          if (!url || url.trim() === '') return '';
          const id = extractDriveId(url);
          if (id) {
              const base64 = await getProxyImage(id);
              if (base64) return base64;
          }
          return url;
      };

      const [bgUrl, logoLeftUrl, logoRightUrl, ...sigUrls] = await Promise.all([
          processUrl(processedTemplate.backgroundUrl),
          processUrl(processedTemplate.logoLeftUrl),
          processUrl(processedTemplate.logoRightUrl),
          ...processedTemplate.signatories.map(s => processUrl(s.signatureUrl))
      ]);

      processedTemplate.backgroundUrl = bgUrl;
      processedTemplate.logoLeftUrl = logoLeftUrl;
      processedTemplate.logoRightUrl = logoRightUrl;
      processedTemplate.signatories = processedTemplate.signatories.map((sig, idx) => ({ ...sig, signatureUrl: sigUrls[idx] }));

      const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify?id=${team.teamId}`;
      let qrCodeBase64 = '';
      try { qrCodeBase64 = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 }); } catch (e) {}

      return { template: processedTemplate, qrCodeBase64 };
  };

  const getPageHtml = (team: Team, template: CertificateTemplate, qrCodeBase64: string) => {
      const activity = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
      const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const schoolName = schoolObj?.SchoolName || team.schoolId;
      const clusterID = schoolObj?.SchoolCluster;
      const clusterName = clusterID ? data.clusters.find(c => c.ClusterID === clusterID)?.ClusterName : '';

      let allMembers: any[] = [];
      let memberSource = team.members;
      
      if (viewLevel === 'area' && team.stageInfo) { 
          try { const info = JSON.parse(team.stageInfo); if (info.members) memberSource = info.members; } catch {} 
      }
      
      try {
          const raw = typeof memberSource === 'string' ? JSON.parse(memberSource) : memberSource;
          if (Array.isArray(raw)) allMembers = raw.map(m => ({...m, role: 'Student'}));
          else if (raw) allMembers = [...(raw.teachers||[]).map((m:any)=>({...m,role:'Teacher'})), ...(raw.students||[]).map((m:any)=>({...m,role:'Student'}))];
      } catch {}

      let eventNameDisplay = template.eventName || (viewLevel === 'area' ? 'งานศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่การศึกษา' : `งานศิลปหัตถกรรมนักเรียน ${clusterName}`);
      const generateSerial = (index: number) => {
          const runNum = (template.serialStart || 1) + index;
          return (template.serialFormat || '{activityId}-{year}-{run:4}').replace('{year}', String(new Date().getFullYear())).replace('{th_year}', String(new Date().getFullYear()+543)).replace('{id}', team.teamId).replace('{activityId}', team.activityId).replace(/{run:(\d+)}/, (_, d) => String(runNum).padStart(parseInt(d), '0')).replace('{run}', String(runNum));
      };

      const bgUrl = template.backgroundUrl;
      const transparentImgStyle = `background-color: transparent !important; mix-blend-mode: normal;`;
      let frameElement = '';
      if (!template.backgroundUrl) {
          if (template.frameStyle === 'infinite-wave') frameElement = '<div class="frame-infinite-wave"></div>';
          else if (template.frameStyle === 'ornamental-corners') frameElement = '<div class="frame-ornamental-corners"></div><div class="frame-ornamental-extra"></div><div class="frame-ornamental-extra2"></div>';
          else if (template.frameStyle === 'thai-premium') frameElement = '<div class="frame-thai-premium"></div>';
          else if (template.frameStyle !== 'none') frameElement = '<div class="frame-simple-gold"></div>';
      }

      const defaultFont = template.fontFamily || 'Sarabun';
      const shadowClass = template.enableTextShadow ? 'text-shadow-white' : '';

      return allMembers.map((member, idx) => {
          const roleText = member.role === 'Teacher' ? 'ครูผู้ฝึกสอน' : 'นักเรียน';
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
          return `
          <div class="page">
              ${bgUrl ? `<img src="${bgUrl}" class="bg-img" />` : frameElement}
              <div class="serial-no" style="top:${template.serialTop || 10}mm; right:${template.serialRight || 10}mm;">No. ${generateSerial(idx)}</div>
              <div class="content" style="padding-top:${template.contentTop || 25}mm;">
                  <div class="logos ${!template.logoRightUrl ? 'single' : ''}" style="height:${template.logoHeight || 35}mm;">
                      ${template.logoLeftUrl ? `<img src="${template.logoLeftUrl}" class="logo-img" style="${transparentImgStyle}" />` : '<div></div>'}
                      ${template.logoRightUrl ? `<img src="${template.logoRightUrl}" class="logo-img" style="${transparentImgStyle}" />` : ''}
                  </div>
                  <div class="header ${shadowClass}" style="font-family:'${template.fontHeader || defaultFont}', sans-serif;">${template.headerText}</div>
                  <div class="subheader ${shadowClass}" style="font-family:'${template.fontSubHeader || defaultFont}', sans-serif;">${template.subHeaderText}</div>
                  <div class="name ${shadowClass}" style="font-family:'${template.fontName || defaultFont}', sans-serif;">${member.prefix||''}${member.name||member.firstname+' '+member.lastname}</div>
                  <div class="desc ${shadowClass}" style="font-family:'${template.fontDesc || defaultFont}', sans-serif;">
                      ${roleText}โรงเรียน <span class="highlight">${schoolName}</span><br/>
                      ได้รับ <span class="highlight">${awardText}</span><br/>
                      กิจกรรม ${activity}<br/>
                      ${eventNameDisplay}
                  </div>
                  <div class="date ${shadowClass}" style="font-family:'${template.fontDate || defaultFont}', sans-serif;">${template.dateText}</div>
                  <div class="signatures" style="margin-bottom:${template.footerBottom || 25}mm;">${template.signatories.map(sig => `<div class="sig-block"><div style="position:relative; display:flex; justify-content:center; align-items:flex-end;">${sig.signatureUrl ? `<img src="${sig.signatureUrl}" class="sig-img" style="${transparentImgStyle}" />` : '<div style="height:20mm;"></div>'}</div>${template.showSignatureLine!==false?'<div class="sig-line"></div>':''}<div class="sig-name ${shadowClass}" style="font-family:'${template.fontSignatures || defaultFont}', sans-serif; margin-top:${template.signatureSpacing || 3}mm;">(${sig.name})</div><div class="sig-pos ${shadowClass}" style="font-family:'${template.fontSignatures || defaultFont}', sans-serif;">${sig.position}</div></div>`).join('')}</div>
                  <div class="qr-verify" style="bottom:${template.qrBottom || 10}mm; right:${template.qrRight || 10}mm;">
                      <img src="${qrCodeBase64}" class="qr-img" style="${transparentImgStyle}" />
                      <div class="qr-text">Scan for Verify</div>
                  </div>
              </div>
          </div>`;
      }).join('');
  };

  const handleBulkPrint = async (teamsToPrint: Team[]) => {
      setIsGenerating(true);
      setLoadingStatus('กำลังเริ่มต้นกระบวนการพิมพ์...');
      
      await new Promise(r => setTimeout(r, 500)); // UI flush

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          setIsGenerating(false);
          alert('Pop-up ถูกบล็อก');
          return;
      }

      printWindow.document.write('<html><head><title>Generating...</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0;} .loader{text-align:center;}</style></head><body><div class="loader"><h1>กำลังสร้างเอกสาร...</h1><p>กรุณารอสักครู่ (ห้ามปิดหน้าต่าง)</p></div></body></html>');

      try {
          let fullContent = '';
          let count = 0;
          const total = teamsToPrint.length;

          // Process sequentially to manage memory/requests better
          for (const team of teamsToPrint) {
              count++;
              setLoadingStatus(`กำลังประมวลผลทีมที่ ${count} / ${total}`);
              
              const prep = await prepareDataAndGetTemplate(team);
              if (prep) {
                  const teamHtml = getPageHtml(team, prep.template, prep.qrCodeBase64);
                  fullContent += teamHtml;
              }
          }

          setLoadingStatus('กำลังเรนเดอร์เอกสาร...');
          
          // CSS styles (copied from config modal logic for consistency)
          const cssStyles = `
            <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;600&family=Chakra+Petch:wght@400;600&family=Charmonman:wght@400;700&family=Kanit:wght@300;400;600&family=Kodchasan:wght@400;600&family=Mali:wght@400;600&family=Noto+Serif+Thai:wght@400;600&family=Sarabun:wght@400;600&family=Srisakdi:wght@400;700&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 landscape; margin: 0; }
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .page { width: 297mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; background-color: white; }
                .frame-simple-gold { position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; border: 3px solid #D4AF37; border-radius: 8px; z-index: 1; pointer-events: none; }
                .frame-infinite-wave { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wave" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="%23FDE047" stroke-width="2" stroke-opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(%23wave)"/></svg>'); z-index: 1; pointer-events: none; border: 10mm solid transparent; }
                .frame-ornamental-corners { position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm; border: 2px solid #666; z-index: 1; pointer-events: none; }
                .frame-ornamental-corners::before { content: ''; position: absolute; top: -2px; left: -2px; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
                .frame-ornamental-corners::after { content: ''; position: absolute; bottom: -2px; right: -2px; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
                .frame-ornamental-extra { content: ''; position: absolute; top: 10mm; right: 10mm; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
                .frame-ornamental-extra2 { content: ''; position: absolute; bottom: 10mm; left: 10mm; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
                .frame-thai-premium { position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm; border: 8px solid transparent; border-image: linear-gradient(to bottom right, #b88746, #fdf5a6, #b88746) 1; z-index: 1; pointer-events: none; }
                .bg-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
                .content { position: relative; z-index: 10; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
                .text-shadow-white { text-shadow: 2px 0 0 #fff, -2px 0 0 #fff, 0 2px 0 #fff, 0 -2px 0 #fff, 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff; }
                .logos { display: flex; justify-content: space-between; width: 80%; margin-bottom: 5mm; position: relative; }
                .logos.single { justify-content: center; }
                .logo-img { height: 100%; object-fit: contain; background-color: transparent !important; } 
                .header { font-size: 24pt; font-weight: bold; color: #1e3a8a; margin-bottom: 5mm; text-align: center; line-height: 1.2; }
                .subheader { font-size: 16pt; margin-bottom: 8mm; text-align: center; }
                .name { font-size: 32pt; font-weight: bold; color: #111; margin-bottom: 5mm; text-align: center; border-bottom: 2px dotted #ccc; padding: 0 20px; min-width: 50%; }
                .desc { font-size: 16pt; margin-bottom: 5mm; max-width: 80%; text-align: center; line-height: 1.5; }
                .highlight { font-weight: bold; color: #2563eb; }
                .date { font-size: 14pt; margin-top: auto; margin-bottom: 10mm; }
                .signatures { display: flex; justify-content: center; gap: 15mm; width: 90%; align-items: flex-end; }
                .sig-block { display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 60mm; }
                .sig-img { height: 20mm; object-fit: contain; margin-bottom: -5mm; z-index: 1; background-color: transparent !important; }
                .sig-line { width: 100%; border-bottom: 1px dotted #000; margin-bottom: 2px; }
                .sig-name { font-size: 12pt; font-weight: bold; padding-top: 2px; width: 100%; }
                .sig-pos { font-size: 10pt; white-space: pre-line; line-height: 1.3; margin-top: 2px; }
                .qr-verify { position: absolute; display: flex; flex-direction: column; align-items: center; background: rgba(255, 255, 255, 0.9); padding: 6px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .qr-img { width: 22mm; height: 22mm; background-color: transparent !important; }
                .qr-text { font-size: 8pt; margin-top: 2px; color: #333; font-weight: bold; text-transform: uppercase; }
                .serial-no { position: absolute; font-size: 10pt; font-family: 'Courier New', monospace; color: #333; font-weight: bold; background: rgba(255, 255, 255, 0.85); padding: 2px 8px; border-radius: 4px; border: 1px solid #ddd; }
                .no-print { display: block; position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
                @media print { .no-print { display: none; } }
            </style>
          `;

          printWindow.document.open();
          printWindow.document.write(`<html><head><title>Print Certificates</title>${cssStyles}</head><body><div class="no-print"><button onclick="window.print()" style="padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-family:sans-serif;font-weight:bold;">🖨️ พิมพ์ / บันทึก PDF (${total} ทีม)</button></div>${fullContent}</body></html>`);
          printWindow.document.close();

      } catch (e) {
          console.error(e);
          alert('เกิดข้อผิดพลาดในการสร้างเอกสาร');
          printWindow.close();
      } finally {
          setIsGenerating(false);
          setLoadingStatus(null);
          // Clear selection after successful generation
          setSelectedTeamIds(new Set());
      }
  };

  const handleDownloadPDF = async (team: Team) => {
      // Re-use bulk print logic for single item for consistency, 
      // but if specific PDF file download is needed via html2pdf, keep separate logic.
      // For now, let's trigger print view for consistency as browsers handle "Save to PDF" well.
      handleBulkPrint([team]);
  };

  if (isLoading) return <CertificatesSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        
        {/* Loading Overlay */}
        {isGenerating && (
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
                <h3 className="text-xl font-bold mb-2">กำลังดำเนินการ...</h3>
                <p className="text-sm opacity-80">{loadingStatus || 'กำลังสร้างเอกสาร'}</p>
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

        {/* Filters */}
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
            <div className="w-full md:w-56">
                <SearchableSelect 
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={val => { setSelectedCategory(val); setCurrentPage(1); }}
                    placeholder="ทุกหมวดหมู่"
                    icon={<Filter className="w-4 h-4" />}
                />
            </div>
            <div className="w-full md:w-48">
                <SearchableSelect 
                    options={medalOptions}
                    value={selectedMedal}
                    onChange={val => { setSelectedMedal(val); setCurrentPage(1); }}
                    placeholder="ทุกรางวัล"
                    icon={<Medal className="w-4 h-4" />}
                />
            </div>
        </div>
        
        {/* Bulk Action Bar */}
        {selectedTeamIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-blue-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                <span className="text-sm font-bold text-gray-700">เลือกแล้ว {selectedTeamIds.size} รายการ</span>
                <button 
                    onClick={() => {
                        const teamsToPrint = filteredTeams.filter(t => selectedTeamIds.has(t.teamId));
                        handleBulkPrint(teamsToPrint);
                    }}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-md transition-transform active:scale-95"
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Printer className="w-4 h-4 mr-2"/>}
                    พิมพ์ที่เลือก
                </button>
            </div>
        )}

        {/* Content - Mobile Cards & Desktop Table */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedTeams.map(team => {
                const isSelected = selectedTeamIds.has(team.teamId);
                const medal = getTeamMedal(team);
                const medalColor = medal.includes('Gold') ? 'text-yellow-600 bg-yellow-50' : medal.includes('Silver') ? 'text-gray-600 bg-gray-50' : medal.includes('Bronze') ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50';
                
                return (
                    <div 
                        key={team.teamId} 
                        className={`bg-white p-4 rounded-xl shadow-sm border transition-all relative overflow-hidden ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}
                        onClick={() => handleToggleSelect(team.teamId)}
                    >
                        <div className="absolute top-3 right-3 text-gray-300">
                            {isSelected ? <CheckSquare className="w-6 h-6 text-blue-600" /> : <Square className="w-6 h-6" />}
                        </div>
                        
                        <div className="pr-8">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-2 inline-block ${medalColor}`}>
                                {medal || 'Award'}
                            </span>
                            <h3 className="font-bold text-gray-900 line-clamp-1">{team.teamName}</h3>
                            <div className="text-xs text-gray-500 mb-1">{(data.schools.find(s=>s.SchoolID===team.schoolId)?.SchoolName || team.schoolId)}</div>
                            <div className="text-xs text-gray-400 mt-2 truncate">{(data.activities.find(a=>a.id===team.activityId)?.name)}</div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDownloadPDF(team); }}
                                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center"
                            >
                                <Printer className="w-3 h-3 mr-1"/> พิมพ์
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={viewLevel === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">
                                <button onClick={handleSelectAll} className="text-gray-400 hover:text-blue-600">
                                    {selectedTeamIds.size === paginatedTeams.length && paginatedTeams.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-600"/> : <Square className="w-5 h-5"/>}
                                </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ทีม</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">รายการ</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">โรงเรียน</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">รางวัล</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTeams.map(team => {
                            const activity = data.activities.find(a => a.id === team.activityId);
                            const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
                            const score = viewLevel === 'area' ? (JSON.parse(team.stageInfo || '{}').score || 0) : team.score;
                            const medal = getTeamMedal(team);
                            const isSelected = selectedTeamIds.has(team.teamId);
                            
                            return (
                                <tr key={team.teamId} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`} onClick={() => handleToggleSelect(team.teamId)}>
                                    <td className="px-4 py-4 text-center cursor-pointer">
                                        <div className={`text-gray-300 ${isSelected ? 'text-blue-600' : ''}`}>
                                            {isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{team.teamName}</div><div className="text-xs text-gray-500">{team.teamId}</div></td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{activity?.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{school?.SchoolName}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${medal.includes('Gold') ? 'bg-yellow-100 text-yellow-700' : medal.includes('Silver') ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {medal || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {score > 0 ? (
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleDownloadPDF(team)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold flex items-center shadow-sm">
                                                    <Printer className="w-4 h-4 mr-1"/> พิมพ์เดี่ยว
                                                </button>
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
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
        {totalPages > 1 && (
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4"/></button>
                <span className="text-sm text-gray-600">Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-4 h-4"/></button>
            </div>
        )}
    </div>
  );
};

export default CertificatesView;
