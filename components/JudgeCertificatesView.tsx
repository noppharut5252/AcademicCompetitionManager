
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, Judge, CertificateTemplate } from '../types';
import { Search, FileBadge, Settings, Printer, LayoutGrid, Trophy, CheckCircle, ChevronLeft, ChevronRight, X, User as UserIcon, Filter, Lock, Download, Loader2, CheckSquare, Square, Gavel, School, Briefcase } from 'lucide-react';
import JudgeCertificateConfigModal from './JudgeCertificateConfigModal';
import { getCertificateConfig, getProxyImage } from '../services/api';
import QRCode from 'qrcode';
import SearchableSelect from './SearchableSelect';

declare var html2pdf: any;

interface JudgeCertificatesViewProps {
  data: AppData;
  user?: User | null;
}

const JudgesSkeleton = () => (
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

const ProgressOverlay = ({ current, total, isVisible, mode = 'print' }: { current: number, total: number, isVisible: boolean, mode?: 'print' | 'download' }) => {
    if (!isVisible) return null;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                </div>
                
                <div className="mb-4 relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                    <div className="relative bg-blue-50 p-4 rounded-full">
                        {mode === 'download' ? <Download className="w-8 h-8 text-green-600 animate-bounce" /> : <Printer className="w-8 h-8 text-blue-600 animate-pulse" />}
                    </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-1 font-kanit">{mode === 'download' ? 'กำลังดาวน์โหลดไฟล์' : 'กำลังจัดเตรียมเอกสาร'}</h3>
                <p className="text-sm text-gray-500 mb-6 font-kanit">Processing Judges...</p>
                
                <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-600 px-1 font-kanit">
                        <span>Progress</span>
                        <span>{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <div 
                            className={`h-full rounded-full transition-all duration-300 ease-out flex items-center justify-center ${mode === 'download' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                            style={{ width: `${percentage}%` }}
                        >
                        </div>
                    </div>
                    <div className="text-center text-xs text-gray-400 mt-2 font-kanit">
                        กำลังประมวลผลลำดับที่ {current} จาก {total}
                    </div>
                </div>
            </div>
        </div>
    );
};

const JudgeCertificatesView: React.FC<JudgeCertificatesViewProps> = ({ data, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('cluster');
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<'print' | 'download'>('print');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [certificateTemplates, setCertificateTemplates] = useState<Record<string, CertificateTemplate>>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const userRole = user?.level?.toLowerCase();
  const isAdminOrArea = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  
  const canConfigureCert = isAdminOrArea || (isGroupAdmin && viewLevel === 'cluster');

  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  useEffect(() => {
      const loadTemplates = async () => {
          setIsLoading(true);
          const configs = await getCertificateConfig();
          setCertificateTemplates(configs);
          setTimeout(() => setIsLoading(false), 500);
      };
      loadTemplates();
  }, []);

  useEffect(() => {
      if (isAdminOrArea) setViewLevel('area');
      else setViewLevel('cluster');
  }, [isAdminOrArea]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedRole]);

  useEffect(() => {
      setCurrentPage(1);
      setSelectedJudgeIds(new Set());
  }, [viewLevel]);

  const handleSaveTemplates = (newTemplates: Record<string, CertificateTemplate>) => {
      setCertificateTemplates(newTemplates);
  };

  const roleOptions = useMemo(() => {
      const roles = Array.from(new Set(data.judges.map(j => j.role))).sort();
      return [{ label: 'ทุกตำแหน่ง (All Roles)', value: 'All' }, ...roles.map(r => ({ label: r, value: r }))];
  }, [data.judges]);

  const filteredJudges = useMemo(() => {
      return data.judges.filter(judge => {
          // Scope Check
          if (viewLevel === 'area') {
              if (judge.stageScope !== 'area') return false;
          } else {
              // Cluster Level
              if (judge.stageScope === 'area') return false;
              if (isGroupAdmin && judge.clusterKey !== userClusterID) return false;
          }

          // Template Check
          // Judges use 'judge_' prefix in ID
          const contextId = viewLevel === 'area' ? 'judge_area' : `judge_${judge.clusterKey}`;
          if (!certificateTemplates[contextId]) return false;

          // Role Filter
          if (selectedRole !== 'All' && judge.role !== selectedRole) return false;

          // Search
          const term = searchTerm.toLowerCase();
          const activityName = data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId;
          
          return (
              judge.judgeName.toLowerCase().includes(term) || 
              judge.schoolName.toLowerCase().includes(term) ||
              activityName.toLowerCase().includes(term)
          );
      });
  }, [data.judges, searchTerm, viewLevel, user, certificateTemplates, selectedRole, isGroupAdmin, userClusterID, data.activities]);

  const totalPages = Math.ceil(filteredJudges.length / itemsPerPage);
  const paginatedJudges = filteredJudges.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleToggleSelect = (judgeId: string) => {
      const newSet = new Set(selectedJudgeIds);
      if (newSet.has(judgeId)) newSet.delete(judgeId);
      else newSet.add(judgeId);
      setSelectedJudgeIds(newSet);
  };

  const handleSelectAll = () => {
      const newSet = new Set(selectedJudgeIds);
      const isAllPageSelected = paginatedJudges.length > 0 && paginatedJudges.every(j => selectedJudgeIds.has(j.id));
      
      if (isAllPageSelected) {
          paginatedJudges.forEach(j => newSet.delete(j.id));
      } else {
          paginatedJudges.forEach(j => newSet.add(j.id));
      }
      setSelectedJudgeIds(newSet);
  };
  
  const isAllPageSelected = paginatedJudges.length > 0 && paginatedJudges.every(j => selectedJudgeIds.has(j.id));

  // --- Printing Logic ---

  const extractDriveId = (url: string) => {
      const match = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
      return match ? match[1] : null;
  }

  const prepareDataAndGetTemplate = async (judge: Judge, imageCache: Map<string, string>) => {
      const contextId = viewLevel === 'area' ? 'judge_area' : `judge_${judge.clusterKey}`;
      let template = certificateTemplates[contextId];
      
      if (!template) return null;

      const processedTemplate = { ...template };
      
      const processUrl = async (url: string) => {
          if (!url || url.trim() === '') return '';
          if (imageCache.has(url)) return imageCache.get(url)!;
          const id = extractDriveId(url);
          if (id) {
              const base64 = await getProxyImage(id);
              if (base64) {
                  imageCache.set(url, base64);
                  return base64;
              }
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

      // Fake Verify URL for now or point to judge list
      const verifyUrl = `${window.location.origin}${window.location.pathname}#/judges`;
      let qrCodeBase64 = '';
      try { qrCodeBase64 = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 300 }); } catch (e) {}

      return { template: processedTemplate, qrCodeBase64 };
  };

  const getPageHtml = (judge: Judge, template: CertificateTemplate, qrCodeBase64: string, indexOffset: number) => {
      const activity = data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId;
      const clusterName = judge.clusterLabel || (data.clusters.find(c => c.ClusterID === judge.clusterKey)?.ClusterName) || '';

      let eventNameDisplay = template.eventName || (viewLevel === 'area' ? 'งานศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่การศึกษา' : `งานศิลปหัตถกรรมนักเรียน ${clusterName}`);
      
      const generateSerial = () => {
          const runNum = (template.serialStart || 1) + indexOffset;
          return (template.serialFormat || 'JUDGE-{year}-{run:4}').replace('{year}', String(new Date().getFullYear())).replace('{th_year}', String(new Date().getFullYear()+543)).replace('{id}', judge.id).replace(/{run:(\d+)}/, (_, d) => String(runNum).padStart(parseInt(d), '0')).replace('{run}', String(runNum));
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

      return `
          <div class="page">
              ${bgUrl ? `<img src="${bgUrl}" class="bg-img" />` : frameElement}
              <div class="serial-no" style="top:${template.serialTop || 10}mm; right:${template.serialRight || 10}mm;">No. ${generateSerial()}</div>
              <div class="content" style="padding-top:${template.contentTop || 25}mm;">
                  <div class="logos ${!template.logoRightUrl ? 'single' : ''}" style="height:${template.logoHeight || 35}mm;">
                      ${template.logoLeftUrl ? `<img src="${template.logoLeftUrl}" class="logo-img" style="${transparentImgStyle}" />` : '<div></div>'}
                      ${template.logoRightUrl ? `<img src="${template.logoRightUrl}" class="logo-img" style="${transparentImgStyle}" />` : ''}
                  </div>
                  <div class="header ${shadowClass}" style="font-family:'${template.fontHeader || defaultFont}', sans-serif;">${template.headerText}</div>
                  <div class="subheader ${shadowClass}" style="font-family:'${template.fontSubHeader || defaultFont}', sans-serif;">${template.subHeaderText}</div>
                  <div class="name ${shadowClass}" style="font-family:'${template.fontName || defaultFont}', sans-serif;">${judge.judgeName}</div>
                  <div class="desc ${shadowClass}" style="font-family:'${template.fontDesc || defaultFont}', sans-serif;">
                      ได้ปฏิบัติหน้าที่เป็น <span class="highlight">${judge.role}</span><br/>
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
  };

  const getCSSStyles = () => `
    <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;600&family=Chakra+Petch:wght@400;600&family=Charmonman:wght@400;700&family=Kanit:wght@300;400;600&family=Kodchasan:wght@400;600&family=Mali:wght@400;600&family=Noto+Serif+Thai:wght@400;600&family=Sarabun:wght@400;600&family=Srisakdi:wght@400;700&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
    <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { width: 296.5mm; height: 209.5mm; position: relative; overflow: hidden; page-break-after: always; background-color: white; margin: 0 auto; }
        .page:last-child { page-break-after: avoid; }
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

  const handleBulkPrint = async (judgesToPrint: Judge[]) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert('Pop-up ถูกบล็อก');
          return;
      }

      setGenerationMode('print');
      setIsGenerating(true);
      setProgress({ current: 0, total: judgesToPrint.length });
      
      const loadingStyles = `
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Kanit', sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8fafc; color: #334155; }
            .loader-container { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; border: 1px solid #e2e8f0; }
            .loader { border: 4px solid #f1f5f9; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 0.8s linear infinite; margin: 0 auto 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h1 { font-size: 20px; margin-bottom: 8px; color: #1e293b; font-weight: 600; }
            p { font-size: 14px; color: #64748b; margin-bottom: 24px; }
            .progress-container { width: 100%; background: #f1f5f9; border-radius: 99px; height: 8px; overflow: hidden; margin-bottom: 10px; }
            .progress-bar { height: 100%; background: linear-gradient(90deg, #2563eb, #4f46e5); width: 0%; transition: width 0.3s ease; border-radius: 99px; }
            .status-text { font-size: 12px; color: #94a3b8; font-family: 'Sarabun', sans-serif; }
            .no-close-warning { margin-top: 20px; font-size: 12px; color: #ef4444; background: #fef2f2; padding: 8px 12px; border-radius: 8px; border: 1px solid #fee2e2; }
        </style>
      `;

      printWindow.document.write(`
        <html>
            <head>
                <title>Generating Certificates...</title>
                ${loadingStyles}
            </head>
            <body>
                <div class="loader-container">
                    <div class="loader"></div>
                    <h1>กำลังสร้างเอกสาร...</h1>
                    <p>ระบบกำลังจัดเตรียมเกียรติบัตรกรรมการ กรุณารอสักครู่</p>
                    <div class="progress-container">
                        <div class="progress-bar" id="progressBar"></div>
                    </div>
                    <div class="status-text" id="statusText">Processing 0 / ${judgesToPrint.length}</div>
                    <div class="no-close-warning">⚠️ กรุณาอย่าปิดหน้าต่างนี้จนกว่าจะเสร็จสิ้น</div>
                </div>
            </body>
        </html>
      `);

      const imageCache = new Map<string, string>();
      const BATCH_SIZE = 5; 

      try {
          let fullContent = '';
          const total = judgesToPrint.length;

          for (let i = 0; i < total; i += BATCH_SIZE) {
              const batch = judgesToPrint.slice(i, i + BATCH_SIZE);
              
              const batchResults = await Promise.all(
                  batch.map(j => prepareDataAndGetTemplate(j, imageCache))
              );

              batchResults.forEach((prep, index) => {
                  if (prep) {
                      fullContent += getPageHtml(batch[index], prep.template, prep.qrCodeBase64, i + index);
                  }
              });

              const currentCount = Math.min(i + BATCH_SIZE, total);
              setProgress({ current: currentCount, total });

              if (!printWindow.closed) {
                  const percent = Math.round((currentCount / total) * 100);
                  const barEl = printWindow.document.getElementById('progressBar');
                  const textEl = printWindow.document.getElementById('statusText');
                  
                  if (barEl) barEl.style.width = `${percent}%`;
                  if (textEl) textEl.innerText = `Processing ${currentCount} / ${total} (${percent}%)`;
              }
          }

          printWindow.document.open();
          printWindow.document.write(`<html><head><title>Print Judge Certificates</title>${getCSSStyles()}</head><body><div class="no-print"><button onclick="window.print()" style="padding:10px 20px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;">🖨️ พิมพ์ / บันทึก PDF (${total} ท่าน)</button></div>${fullContent}</body></html>`);
          printWindow.document.close();

      } catch (e) {
          alert('Error generating');
          printWindow.close();
      } finally {
          setIsGenerating(false);
          setSelectedJudgeIds(new Set());
      }
  };

  const handleFileDownload = async (judgesToPrint: Judge[]) => {
      setGenerationMode('download');
      setIsGenerating(true);
      setProgress({ current: 0, total: judgesToPrint.length });

      const imageCache = new Map<string, string>();
      const BATCH_SIZE = 5;
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.width = '297mm';
      container.innerHTML = getCSSStyles();
      document.body.appendChild(container);

      try {
          let fullHtml = '';
          const total = judgesToPrint.length;

          for (let i = 0; i < total; i += BATCH_SIZE) {
              const batch = judgesToPrint.slice(i, i + BATCH_SIZE);
              const batchResults = await Promise.all(batch.map(j => prepareDataAndGetTemplate(j, imageCache)));
              batchResults.forEach((prep, index) => {
                  if (prep) fullHtml += getPageHtml(batch[index], prep.template, prep.qrCodeBase64, i + index);
              });
              setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
          }
          
          const contentDiv = document.createElement('div');
          contentDiv.innerHTML = fullHtml;
          container.appendChild(contentDiv);

          const opt = {
            margin: 0,
            filename: `judge_certificates_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['css', 'legacy'] }
          };
          
          await html2pdf().set(opt).from(contentDiv).save();

      } catch (e) {
          alert('Error downloading');
      } finally {
          if (document.body.contains(container)) document.body.removeChild(container);
          setIsGenerating(false);
          setSelectedJudgeIds(new Set());
      }
  };

  if (isLoading) return <JudgesSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        <ProgressOverlay current={progress.current} total={progress.total} isVisible={isGenerating} mode={generationMode} />
        {showConfigModal && <JudgeCertificateConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} data={data} onSave={handleSaveTemplates} initialTemplates={certificateTemplates} currentUser={user} />}
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div><h2 className="text-xl font-bold text-gray-800 flex items-center"><FileBadge className="w-6 h-6 mr-2 text-indigo-600"/> เกียรติบัตรกรรมการ (Judge Certificates)</h2><p className="text-gray-500 text-sm mt-1">พิมพ์เกียรติบัตรสำหรับคณะกรรมการตัดสิน</p></div>
            <div className="flex gap-2">
                {canConfigureCert && <button onClick={() => setShowConfigModal(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm font-medium"><Settings className="w-4 h-4"/> ตั้งค่ารูปแบบ</button>}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewLevel('cluster')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid className="w-4 h-4 inline mr-1"/> Cluster</button>
                    <button onClick={() => setViewLevel('area')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}><Trophy className="w-4 h-4 inline mr-1"/> Area</button>
                </div>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-indigo-500 outline-none" 
                    placeholder="ค้นหาชื่อ, โรงเรียน, กิจกรรม..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
            <div className="w-full lg:w-64 flex-shrink-0">
                <SearchableSelect 
                    options={roleOptions}
                    value={selectedRole}
                    onChange={val => setSelectedRole(val)}
                    placeholder="ทุกตำแหน่ง"
                    icon={<Gavel className="w-4 h-4" />}
                />
            </div>
        </div>
        
        {selectedJudgeIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-indigo-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5 w-max max-w-[90vw]">
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap hidden sm:inline">เลือก {selectedJudgeIds.size} รายการ</span>
                <button 
                    onClick={() => handleBulkPrint(filteredJudges.filter(j => selectedJudgeIds.has(j.id)))}
                    disabled={isGenerating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-md transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isGenerating && generationMode === 'print' ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Printer className="w-4 h-4 mr-2"/>}
                    <span className="hidden sm:inline">พิมพ์ (Pop-up)</span>
                    <span className="sm:hidden">พิมพ์</span>
                </button>
                <button 
                    onClick={() => handleFileDownload(filteredJudges.filter(j => selectedJudgeIds.has(j.id)))}
                    disabled={isGenerating}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-md transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isGenerating && generationMode === 'download' ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Download className="w-4 h-4 mr-2"/>}
                    <span className="hidden sm:inline">ดาวน์โหลด PDF</span>
                    <span className="sm:hidden">โหลด</span>
                </button>
            </div>
        )}

        {/* Mobile Cards (Visible on small screens) */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedJudges.map(judge => {
                const isSelected = selectedJudgeIds.has(judge.id);
                const actName = data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId;

                return (
                    <div 
                        key={judge.id} 
                        className={`bg-white p-4 rounded-xl shadow-sm border transition-all relative overflow-hidden ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : 'border-gray-200'}`}
                        onClick={() => handleToggleSelect(judge.id)}
                    >
                         <div className="absolute top-3 right-3 text-gray-300">
                            {isSelected ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <Square className="w-6 h-6" />}
                        </div>
                        
                        <div className="pr-8">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-2 inline-block bg-gray-100 text-gray-600">
                                {judge.role}
                            </span>
                            <h3 className="font-bold text-gray-900 line-clamp-1">{judge.judgeName}</h3>
                            <div className="text-xs text-gray-500 mb-1 flex items-center">
                                {judge.schoolId === '__EXTERNAL__' ? <Briefcase className="w-3 h-3 mr-1"/> : <School className="w-3 h-3 mr-1"/>}
                                {judge.schoolName}
                            </div>
                            <div className="text-xs text-gray-400 mt-2 truncate">{actName}</div>
                        </div>

                         <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleBulkPrint([judge]); }}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center hover:bg-indigo-100"
                            >
                                <Printer className="w-3 h-3 mr-1"/> พิมพ์
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleFileDownload([judge]); }}
                                className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg flex items-center hover:bg-green-100"
                            >
                                <Download className="w-3 h-3 mr-1"/> โหลด PDF
                            </button>
                        </div>
                    </div>
                );
            })}
             {paginatedJudges.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                    <FileBadge className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                    <p>ไม่พบข้อมูล</p>
                </div>
             )}
        </div>

        {/* Desktop Table (Hidden on mobile) */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className={viewLevel === 'area' ? 'bg-purple-50' : 'bg-gray-50'}>
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">
                                <button onClick={handleSelectAll} className="text-gray-400 hover:text-indigo-600">
                                    {isAllPageSelected ? <CheckSquare className="w-5 h-5 text-indigo-600"/> : <Square className="w-5 h-5"/>}
                                </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ชื่อ - สกุล</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ตำแหน่ง</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">โรงเรียน</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">รายการ</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedJudges.map(judge => {
                            const isSelected = selectedJudgeIds.has(judge.id);
                            const actName = data.activities.find(a => a.id === judge.activityId)?.name || judge.activityId;
                            
                            return (
                                <tr key={judge.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`} onClick={() => handleToggleSelect(judge.id)}>
                                    <td className="px-4 py-4 text-center cursor-pointer">
                                        <div className={`text-gray-300 ${isSelected ? 'text-indigo-600' : ''}`}>
                                            {isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{judge.judgeName}</div></td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{judge.role}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 flex items-center">{judge.schoolName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{actName}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => handleBulkPrint([judge])} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-200 transition-all" title="Print"><Printer className="w-4 h-4" /></button>
                                            <button onClick={() => handleFileDownload([judge])} className="p-1.5 text-green-600 hover:bg-green-50 rounded border border-transparent hover:border-green-200 transition-all" title="Download"><Download className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginatedJudges.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        {Object.keys(certificateTemplates).length === 0 ? <Lock className="w-8 h-8 opacity-20"/> : <FileBadge className="w-8 h-8 opacity-20" />}
                                    </div>
                                    <p>ไม่พบข้อมูล (ต้องผ่านการตั้งค่ารูปแบบเกียรติบัตรกรรมการแล้ว)</p>
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

export default JudgeCertificatesView;
