
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, Team, CertificateTemplate } from '../types';
import { Search, FileBadge, Settings, Printer, LayoutGrid, Trophy, School, CheckCircle, ChevronLeft, ChevronRight, X, User as UserIcon, GraduationCap, Filter, Lock, Download, Loader2 } from 'lucide-react';
import CertificateConfigModal from './CertificateConfigModal';
import { getCertificateConfig } from '../services/api';
import QRCode from 'qrcode';
import SearchableSelect from './SearchableSelect';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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

  const generateCertificateHtmlContent = async (team: Team, template: CertificateTemplate, qrCodeBase64: string) => {
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

      // Prepare Images (Convert to Base64 if needed for PDF)
      let bgUrl = template.backgroundUrl;
      if (bgUrl && bgUrl.includes('drive.google.com') && bgUrl.includes('id=')) {
          if (bgUrl.includes('sz=')) bgUrl = bgUrl.replace(/sz=w\d+/, 'sz=w4000'); 
          else bgUrl += '&sz=w4000';
      }
      
      // Ensure Transparent Background Style
      const transparentImgStyle = `background-color: transparent !important; mix-blend-mode: normal;`;

      let frameElement = '';
      if (!template.backgroundUrl) {
          if (template.frameStyle === 'infinite-wave') frameElement = '<div class="frame-infinite-wave"></div>';
          else if (template.frameStyle === 'ornamental-corners') frameElement = '<div class="frame-ornamental-corners"></div><div class="frame-ornamental-extra"></div><div class="frame-ornamental-extra2"></div>';
          else if (template.frameStyle === 'thai-premium') frameElement = '<div class="frame-thai-premium"></div>';
          else if (template.frameStyle !== 'none') frameElement = '<div class="frame-simple-gold"></div>';
      }

      const defaultFont = template.fontFamily || 'Sarabun';
      const fontHeader = template.fontHeader || defaultFont;
      const fontSubHeader = template.fontSubHeader || defaultFont;
      const fontName = template.fontName || defaultFont;
      const fontDesc = template.fontDesc || defaultFont;
      const fontDate = template.fontDate || defaultFont;
      const fontSigs = template.fontSignatures || defaultFont;

      const shadowClass = template.enableTextShadow ? 'text-shadow-white' : '';

      // Generate Pages
      const pagesHtml = allMembers.map((member, idx) => {
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
              <div class="serial-no">No. ${generateSerial(idx)}</div>
              <div class="content">
                  <div class="logos ${!template.logoRightUrl ? 'single' : ''}">
                      ${template.logoLeftUrl ? `<img src="${template.logoLeftUrl}" class="logo-img" style="${transparentImgStyle}" />` : '<div></div>'}
                      ${template.logoRightUrl ? `<img src="${template.logoRightUrl}" class="logo-img" style="${transparentImgStyle}" />` : ''}
                  </div>
                  <div class="header ${shadowClass}">${template.headerText}</div>
                  <div class="subheader ${shadowClass}">${template.subHeaderText}</div>
                  <div class="name ${shadowClass}">${member.prefix||''}${member.name||member.firstname+' '+member.lastname}</div>
                  <div class="desc ${shadowClass}">
                      ${roleText}โรงเรียน <span class="highlight">${schoolName}</span><br/>
                      ได้รับ <span class="highlight">${awardText}</span><br/>
                      กิจกรรม ${activity}<br/>
                      ${eventNameDisplay}
                  </div>
                  <div class="date ${shadowClass}">${template.dateText}</div>
                  <div class="signatures">${template.signatories.map(sig => `<div class="sig-block">${sig.signatureUrl ? `<img src="${sig.signatureUrl}" class="sig-img" style="${transparentImgStyle}" />` : '<div style="height:20mm;"></div>'}${template.showSignatureLine!==false?'<div class="sig-line"></div>':''}<div class="sig-name ${shadowClass}">(${sig.name})</div><div class="sig-pos ${shadowClass}">${sig.position}</div></div>`).join('')}</div>
                  <div class="qr-verify">
                      <img src="${qrCodeBase64}" class="qr-img" style="${transparentImgStyle}" />
                      <div class="qr-text">Scan for Verify</div>
                  </div>
              </div>
          </div>`;
      }).join('');

      return `
        <html><head><title>Certificates - ${team.teamName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;600&family=Chakra+Petch:wght@400;600&family=Charmonman:wght@400;700&family=Kanit:wght@300;400;600&family=Kodchasan:wght@400;600&family=Mali:wght@400;600&family=Noto+Serif+Thai:wght@400;600&family=Sarabun:wght@400;600&family=Srisakdi:wght@400;700&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
        <style>
            @page { size: A4 landscape; margin: 0; }
            body { margin: 0; padding: 0; font-family: '${defaultFont}', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { width: 297mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; background-color: white; }
            
            /* -- Frame Styles -- */
            .frame-simple-gold { position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; border: 3px solid #D4AF37; border-radius: 8px; z-index: 1; pointer-events: none; }
            .frame-infinite-wave { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('data:image/svg+xml;utf8,<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wave" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 Q 10 0 20 20 T 40 20" fill="none" stroke="%23FDE047" stroke-width="2" stroke-opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(%23wave)"/></svg>'); z-index: 1; pointer-events: none; border: 10mm solid transparent; }
            .frame-ornamental-corners { position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm; border: 2px solid #666; z-index: 1; pointer-events: none; }
            .frame-ornamental-corners::before { content: ''; position: absolute; top: -2px; left: -2px; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
            .frame-ornamental-corners::after { content: ''; position: absolute; bottom: -2px; right: -2px; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
            .frame-ornamental-extra { content: ''; position: absolute; top: 10mm; right: 10mm; width: 40px; height: 40px; border-top: 5px solid #D4AF37; border-right: 5px solid #D4AF37; }
            .frame-ornamental-extra2 { content: ''; position: absolute; bottom: 10mm; left: 10mm; width: 40px; height: 40px; border-bottom: 5px solid #D4AF37; border-left: 5px solid #D4AF37; }
            .frame-thai-premium { position: absolute; top: 10mm; left: 10mm; right: 10mm; bottom: 10mm; border: 8px solid transparent; border-image: linear-gradient(to bottom right, #b88746, #fdf5a6, #b88746) 1; z-index: 1; pointer-events: none; }
            
            .bg-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
            .content { position: relative; z-index: 10; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding-top: ${template.contentTop || 25}mm; box-sizing: border-box; }
            
            /* -- Legibility Enhancements (High Contrast) -- */
            .text-shadow-white {
                text-shadow: 
                    2px 0 0 #fff, -2px 0 0 #fff, 0 2px 0 #fff, 0 -2px 0 #fff, 
                    1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;
            }
            
            .logos { display: flex; justify-content: space-between; width: 80%; height: ${template.logoHeight || 35}mm; margin-bottom: 5mm; position: relative; }
            .logos.single { justify-content: center; }
            .logo-img { height: 100%; object-fit: contain; background-color: transparent !important; } 
            
            .header { font-size: 24pt; font-weight: bold; color: #1e3a8a; margin-bottom: 5mm; text-align: center; line-height: 1.2; font-family: '${fontHeader}', sans-serif; }
            .subheader { font-size: 16pt; margin-bottom: 8mm; text-align: center; font-family: '${fontSubHeader}', sans-serif; }
            .name { font-size: 32pt; font-weight: bold; color: #111; margin-bottom: 5mm; font-family: '${fontName}', sans-serif; text-align: center; border-bottom: 2px dotted #ccc; padding: 0 20px; min-width: 50%; }
            .desc { font-size: 16pt; margin-bottom: 5mm; max-width: 80%; text-align: center; line-height: 1.5; font-family: '${fontDesc}', sans-serif; }
            .highlight { font-weight: bold; color: #2563eb; }
            .date { font-size: 14pt; margin-top: auto; margin-bottom: 10mm; font-family: '${fontDate}', sans-serif; }
            
            .signatures { display: flex; justify-content: center; gap: 15mm; margin-bottom: ${template.footerBottom || 25}mm; width: 90%; align-items: flex-end; }
            .sig-block { display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 60mm; }
            .sig-img { height: 20mm; object-fit: contain; margin-bottom: -5mm; z-index: 1; background-color: transparent !important; }
            .sig-line { width: 100%; border-bottom: 1px dotted #000; margin-bottom: 2px; }
            .sig-name { font-size: 12pt; font-weight: bold; padding-top: 2px; width: 100%; margin-top: ${template.signatureSpacing || 3}mm; font-family: '${fontSigs}', sans-serif; }
            .sig-pos { font-size: 10pt; white-space: pre-line; line-height: 1.3; margin-top: 2px; font-family: '${fontSigs}', sans-serif; }
            
            /* -- Protected Boxes for Scan/Read -- */
            .qr-verify { 
                position: absolute; 
                bottom: ${template.qrBottom || 10}mm; 
                right: ${template.qrRight || 10}mm; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                background: rgba(255, 255, 255, 0.9);
                padding: 6px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .qr-img { width: 22mm; height: 22mm; background-color: transparent !important; }
            .qr-text { font-size: 8pt; margin-top: 2px; color: #333; font-weight: bold; text-transform: uppercase; }
            
            .serial-no { 
                position: absolute; 
                top: ${template.serialTop || 10}mm; 
                right: ${template.serialRight || 10}mm; 
                font-size: 10pt; 
                font-family: 'Courier New', monospace; 
                color: #333; 
                font-weight: bold;
                background: rgba(255, 255, 255, 0.85);
                padding: 2px 8px;
                border-radius: 4px;
                border: 1px solid #ddd;
            }
            
            .no-print { display: block; position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
            @media print { .no-print { display: none; } }
        </style></head><body>
        <div class="no-print"><button onclick="window.print()" style="padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;">Print</button></div>
        ${pagesHtml}
        </body></html>`;
  };

  const prepareDataAndGetTemplate = async (team: Team) => {
      const schoolObj = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
      const clusterID = schoolObj?.SchoolCluster;
      let template = viewLevel === 'area' ? certificateTemplates['area'] : (clusterID ? certificateTemplates[clusterID] : undefined);
      
      if (!template) {
          alert('ไม่พบรูปแบบเกียรติบัตรสำหรับรายการนี้');
          return null;
      }

      const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify?id=${team.teamId}`;
      let qrCodeBase64 = '';
      try { qrCodeBase64 = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 }); } catch (e) {}

      return { template, qrCodeBase64 };
  };

  const handlePrint = async (team: Team) => {
      setIsGenerating(true);
      const prep = await prepareDataAndGetTemplate(team);
      if (!prep) { setIsGenerating(false); return; }

      // Delay for UI update
      await new Promise(resolve => setTimeout(resolve, 800));

      const printWindow = window.open('', '_blank');
      if (!printWindow) { setIsGenerating(false); alert('Pop-up blocked'); return; }

      const htmlContent = await generateCertificateHtmlContent(team, prep.template, prep.qrCodeBase64);
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setIsGenerating(false);
  };

  const handleDownloadPDF = async (team: Team) => {
      setIsGenerating(true);
      const prep = await prepareDataAndGetTemplate(team);
      if (!prep) { setIsGenerating(false); return; }

      // For PDF generation to avoid CORS, we should convert images in template to Base64 if possible
      // This is a simplified attempt. In production, proxying or pre-fetching images is best.
      const template = prep.template;
      // Note: html2pdf handles some CORS if useCORS is true, but base64 is safer.
      // We will proceed with URL and rely on html2pdf configuration.

      const htmlContent = await generateCertificateHtmlContent(team, template, prep.qrCodeBase64);
      
      // Create a temporary container
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      // Strip the print button
      const btn = container.querySelector('.no-print');
      if (btn) btn.remove();
      
      // Set width/height explicitly for PDF generator
      container.style.width = '297mm';
      
      // We need to append to body to render fonts correctly, but hide it
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      const opt = {
          margin: 0,
          filename: `certificate_${team.teamId}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      try {
          await html2pdf().set(opt).from(container).save();
      } catch (err) {
          console.error("PDF Generation Error:", err);
          alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF (อาจเกิดจากรูปภาพติดสิทธิ์การเข้าถึง)");
      } finally {
          document.body.removeChild(container);
          setIsGenerating(false);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        
        {/* Loading Overlay */}
        {isGenerating && (
            <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
                <h3 className="text-xl font-bold mb-2">กำลังดำเนินการ...</h3>
                <p className="text-sm opacity-80">ระบบกำลังจัดเตรียมเอกสาร (อาจใช้เวลาสักครู่สำหรับ PDF)</p>
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
                            
                            return (
                                <tr key={team.teamId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{team.teamName}</div><div className="text-xs text-gray-500">{team.teamId}</div></td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{activity?.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{school?.SchoolName}</td>
                                    <td className="px-6 py-4 text-center text-xs text-gray-600"><span className="mr-2">ครู: {tCount}</span><span>นักเรียน: {sCount}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        {score > 0 ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handlePrint(team)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-bold flex items-center shadow-sm">
                                                    <Printer className="w-4 h-4 mr-1"/> พิมพ์
                                                </button>
                                                <button onClick={() => handleDownloadPDF(team)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold flex items-center shadow-sm">
                                                    <Download className="w-4 h-4 mr-1"/> PDF
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
