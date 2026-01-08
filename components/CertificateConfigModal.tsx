import React, { useState, useEffect, useRef } from 'react';
import { CertificateTemplate, AppData, User } from '../types';
import { Save, X, Image as ImageIcon, Plus, Trash2, LayoutTemplate, PenTool, CheckCircle, Upload, Loader2, AlertCircle, Hash, Info, Type, BoxSelect, ArrowUpFromLine, ArrowDownToLine, Scaling, MoveVertical, QrCode, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { uploadImage, saveCertificateConfig } from '../services/api';
import { resizeImage, fileToBase64 } from '../services/utils';
import QRCode from 'qrcode';

interface CertificateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onSave: (templates: Record<string, CertificateTemplate>) => void;
  initialTemplates: Record<string, CertificateTemplate>;
  currentUser?: User | null;
}

const DEFAULT_TEMPLATE: CertificateTemplate = {
    id: '',
    name: 'Default',
    backgroundUrl: '',
    headerText: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
    subHeaderText: 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า',
    eventName: '',
    frameStyle: 'simple-gold',
    logoLeftUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png',
    logoRightUrl: '',
    signatories: [
        { name: 'นายสมชาย ใจดี', position: 'ผู้อำนวยการเขตพื้นที่การศึกษา', signatureUrl: '' }
    ],
    showSignatureLine: true,
    dateText: `ให้ไว้ ณ วันที่ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric'})}`,
    showRank: true,
    serialFormat: '{activityId}-{year}-{run:4}',
    serialStart: 1,
    contentTop: 25,
    footerBottom: 25,
    logoHeight: 35,
    signatureSpacing: 3,
    serialTop: 10,
    serialRight: 10,
    qrBottom: 10,
    qrRight: 10,
    fontFamily: 'Sarabun',
    enableTextShadow: true
};

const FONT_OPTIONS = [
    { label: 'Sarabun (สารบรรณ - มาตรฐาน)', value: 'Sarabun' },
    { label: 'Kanit (คณิต - ทันสมัย)', value: 'Kanit' },
    { label: 'Noto Serif Thai (มีหัว - ทางการ)', value: 'Noto Serif Thai' },
    { label: 'Thasadith (ทศดิส - หัวเรื่อง)', value: 'Thasadith' },
    { label: 'Chakra Petch (จักรเพชร - ดิจิทัล)', value: 'Chakra Petch' },
    { label: 'Mali (มะลิ - ลายมือเด็ก)', value: 'Mali' },
    { label: 'Charmonman (ชามน - อ่อนช้อย)', value: 'Charmonman' },
    { label: 'Srisakdi (ศรีศักดิ์ - ไทยโบราณ)', value: 'Srisakdi' },
    { label: 'Bai Jamjuree (ใบจามจุรี - กึ่งทางการ)', value: 'Bai Jamjuree' },
    { label: 'Kodchasan (กฎชสาร - วัยรุ่น)', value: 'Kodchasan' }
];

const CertificateConfigModal: React.FC<CertificateConfigModalProps> = ({ isOpen, onClose, data, onSave, initialTemplates, currentUser }) => {
  // Determine allowed contexts based on role
  const userRole = currentUser?.level?.toLowerCase();
  const isAdminOrArea = userRole === 'admin' || userRole === 'area';
  const isGroupAdmin = userRole === 'group_admin';
  const userSchool = data.schools.find(s => s.SchoolID === currentUser?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  const [selectedContext, setSelectedContext] = useState<string>(isAdminOrArea ? 'area' : (userClusterID || 'area'));
  const [templates, setTemplates] = useState<Record<string, CertificateTemplate>>(initialTemplates);
  const [currentTemplate, setCurrentTemplate] = useState<CertificateTemplate>({ ...DEFAULT_TEMPLATE });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingState, setUploadingState] = useState<{ field: string, loading: boolean }>({ field: '', loading: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetFieldForUpload, setTargetFieldForUpload] = useState<string>('');
  
  // Loading state for fetching configs
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  
  // Typography Advanced Mode
  const [showAdvancedFonts, setShowAdvancedFonts] = useState(false);

  // Effect to handle initial loading if needed, or sync with props
  useEffect(() => {
     if (isOpen && Object.keys(templates).length === 0) {
         setIsLoadingConfig(true);
         setTimeout(() => setIsLoadingConfig(false), 500); 
     }
  }, [isOpen]);

  useEffect(() => {
      // Sync on mount or context change
      const existing = templates[selectedContext];
      if (existing) {
          setCurrentTemplate({ ...DEFAULT_TEMPLATE, ...existing }); // Merge with default to ensure new fields exist
      } else {
          // Initialize new
          const clusterName = data.clusters.find(c => c.ClusterID === selectedContext)?.ClusterName || 'ระดับเขตพื้นที่';
          setCurrentTemplate({
              ...DEFAULT_TEMPLATE,
              id: selectedContext,
              name: selectedContext === 'area' ? 'ระดับเขตพื้นที่การศึกษา' : clusterName
          });
      }
  }, [selectedContext, templates, data.clusters]);

  const handleContextChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Save current temp state to map before switching
      setTemplates(prev => ({
          ...prev,
          [currentTemplate.id]: currentTemplate
      }));
      setSelectedContext(e.target.value);
  };

  const updateField = (field: keyof CertificateTemplate, value: any) => {
      setCurrentTemplate(prev => ({ ...prev, [field]: value }));
  };

  const updateSignatory = (index: number, field: keyof any, value: string) => {
      const newSigs = [...currentTemplate.signatories];
      newSigs[index] = { ...newSigs[index], [field]: value };
      updateField('signatories', newSigs);
  };

  const addSignatory = () => {
      updateField('signatories', [...currentTemplate.signatories, { name: '', position: '', signatureUrl: '' }]);
  };

  const removeSignatory = (index: number) => {
      const newSigs = [...currentTemplate.signatories];
      newSigs.splice(index, 1);
      updateField('signatories', newSigs);
  };

  // --- Upload Logic ---
  const triggerUpload = (fieldKey: string) => {
      setTargetFieldForUpload(fieldKey);
      if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingState({ field: targetFieldForUpload, loading: true });
      try {
          let base64 = '';
          let filename = '';
          
          if (targetFieldForUpload === 'backgroundUrl') {
              // Use High Quality for Background
              if (file.size > 2 * 1024 * 1024) { 
                  alert('ไฟล์มีขนาดใหญ่ ระบบจะปรับขนาดให้เหมาะสมสำหรับพิมพ์ (High Quality)');
                  base64 = await resizeImage(file, 2480, 1748, 0.9, 'image/jpeg'); 
              } else {
                  base64 = await fileToBase64(file);
              }
              filename = `cert_bg_${selectedContext}.jpg`;
          } else {
              // Logos/Signatures MUST be PNG to preserve transparency
              // Use image/png output format
              base64 = await resizeImage(file, 800, 800, 0.9, 'image/png');
              filename = `cert_logo_${selectedContext}_${targetFieldForUpload}.png`;
          }

          const res = await uploadImage(base64, filename);
          
          if (res.status === 'success' && res.fileUrl) {
              // Use full size thumbnail hack or direct link
              const url = `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w4000`; 
              
              if (targetFieldForUpload.startsWith('signatory-')) {
                  const idx = parseInt(targetFieldForUpload.split('-')[1]);
                  updateSignatory(idx, 'signatureUrl', url);
              } else {
                  updateField(targetFieldForUpload as keyof CertificateTemplate, url);
              }
          } else {
              alert('Upload failed: ' + res.message);
          }
      } catch (err) {
          console.error(err);
          alert('Error uploading file');
      } finally {
          setUploadingState({ field: '', loading: false });
          e.target.value = ''; 
      }
  };

  const handleSaveAll = async () => {
      setIsSaving(true);
      const finalTemplates = {
          ...templates,
          [currentTemplate.id]: currentTemplate
      };
      setTemplates(finalTemplates);

      const success = await saveCertificateConfig(currentTemplate.id, currentTemplate);
      
      setIsSaving(false);
      if (success) {
          onSave(finalTemplates);
          onClose();
      } else {
          alert('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
      }
  };

  const toggleIncludeTeamId = (checked: boolean) => {
      let currentFormat = currentTemplate.serialFormat || '{activityId}-{year}-{run:4}';
      if (checked) {
          if (!currentFormat.includes('{id}')) {
              updateField('serialFormat', currentFormat + '-{id}');
          }
      } else {
          updateField('serialFormat', currentFormat.replace(/-?{id}/g, ''));
      }
  };

  const getSerialPreview = () => {
      const fmt = currentTemplate.serialFormat || '{activityId}-{year}-{run:4}';
      const start = currentTemplate.serialStart || 1;
      const year = new Date().getFullYear();
      const thYear = year + 543;
      
      let sample = fmt
        .replace('{year}', String(year))
        .replace('{th_year}', String(thYear))
        .replace('{id}', 'T001')
        .replace('{activityId}', 'ACT01');

      if (sample.includes('{run:')) {
          const match = sample.match(/{run:(\d+)}/);
          if (match) {
              const digits = parseInt(match[1]);
              sample = sample.replace(match[0], String(start).padStart(digits, '0'));
          }
      } else {
          sample = sample.replace('{run}', String(start));
      }
      
      return sample;
  };

  // --- Real-time Preview Logic ---
  const handlePreview = async () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
          return;
      }

      // Generate dummy QR Code
      let qrCodeBase64 = '';
      try {
          qrCodeBase64 = await QRCode.toDataURL("https://example.com/verify", { margin: 1, width: 300 });
      } catch (e) {}

      // Prepare data
      const template = currentTemplate;
      const bgUrl = template.backgroundUrl;
      const transparentImgStyle = `background-color: transparent !important; mix-blend-mode: normal;`;
      
      let frameElement = '';
      if (!bgUrl) {
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

      const htmlContent = `
        <html><head><title>Certificate Preview</title>
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;600&family=Chakra+Petch:wght@400;600&family=Charmonman:wght@400;700&family=Kanit:wght@300;400;600&family=Kodchasan:wght@400;600&family=Mali:wght@400;600&family=Noto+Serif+Thai:wght@400;600&family=Sarabun:wght@400;600&family=Srisakdi:wght@400;700&family=Thasadith:wght@400;700&display=swap" rel="stylesheet">
        <style>
            @page { size: A4 landscape; margin: 0; }
            body { margin: 0; padding: 0; font-family: '${defaultFont}', sans-serif; background-color: #f0f0f0; display: flex; justify-content: center; padding-top: 20px; }
            .page { width: 297mm; height: 210mm; position: relative; overflow: hidden; background-color: white; box-shadow: 0 0 20px rgba(0,0,0,0.2); }
            
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
        </style></head><body>
          <div class="page">
              ${bgUrl ? `<img src="${bgUrl}" class="bg-img" />` : frameElement}
              <div class="serial-no">No. ACT01-2567-0001</div>
              <div class="content">
                  <div class="logos ${!template.logoRightUrl ? 'single' : ''}">
                      ${template.logoLeftUrl ? `<img src="${template.logoLeftUrl}" class="logo-img" style="${transparentImgStyle}" />` : '<div></div>'}
                      ${template.logoRightUrl ? `<img src="${template.logoRightUrl}" class="logo-img" style="${transparentImgStyle}" />` : ''}
                  </div>
                  <div class="header ${shadowClass}">${template.headerText}</div>
                  <div class="subheader ${shadowClass}">${template.subHeaderText}</div>
                  <div class="name ${shadowClass}">เด็กชายตัวอย่าง รักเรียน</div>
                  <div class="desc ${shadowClass}">
                      นักเรียนโรงเรียน <span class="highlight">โรงเรียนสาธิตแห่งความรู้</span><br/>
                      ได้รับ <span class="highlight">รางวัลชนะเลิศ เหรียญทอง</span><br/>
                      กิจกรรม การแข่งขันหุ่นยนต์ระดับพื้นฐาน<br/>
                      ${template.eventName || 'งานศิลปหัตถกรรมนักเรียน ครั้งที่ 72'}
                  </div>
                  <div class="date ${shadowClass}">${template.dateText}</div>
                  <div class="signatures">${template.signatories.map(sig => `<div class="sig-block">${sig.signatureUrl ? `<img src="${sig.signatureUrl}" class="sig-img" style="${transparentImgStyle}" />` : '<div style="height:20mm;"></div>'}${template.showSignatureLine!==false?'<div class="sig-line"></div>':''}<div class="sig-name ${shadowClass}">(${sig.name})</div><div class="sig-pos ${shadowClass}">${sig.position}</div></div>`).join('')}</div>
                  <div class="qr-verify">
                      <img src="${qrCodeBase64}" class="qr-img" style="${transparentImgStyle}" />
                      <div class="qr-text">Scan for Verify</div>
                  </div>
              </div>
          </div>
        </body></html>`;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
  };

  const FontSelector = ({ label, field }: { label: string, field: keyof CertificateTemplate }) => (
      <div>
          <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
          <select 
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-purple-500"
              value={(currentTemplate[field] as string) || ''}
              onChange={(e) => updateField(field, e.target.value)}
          >
              <option value="">(ใช้ฟอนต์หลัก)</option>
              {FONT_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
              ))}
          </select>
      </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
        />

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative">
            
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                <h3 className="text-lg font-bold flex items-center">
                    <LayoutTemplate className="w-5 h-5 mr-2" />
                    ตั้งค่ารูปแบบเกียรติบัตร (Certificate Templates)
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {isLoadingConfig ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                    <p className="text-gray-500 font-medium">กำลังโหลดการตั้งค่า...</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    
                    {/* Context Selector */}
                    <div className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 mb-2">เลือกรูปแบบที่ต้องการแก้ไข</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedContext}
                            onChange={handleContextChange}
                            disabled={isGroupAdmin && !isAdminOrArea}
                        >
                            {isAdminOrArea && <option value="area">ระดับเขตพื้นที่การศึกษา (District Level)</option>}
                            <optgroup label="ระดับกลุ่มเครือข่าย (Cluster Level)">
                                {data.clusters.map(c => {
                                    if (isGroupAdmin && c.ClusterID !== userClusterID) return null;
                                    return <option key={c.ClusterID} value={c.ClusterID}>{c.ClusterName}</option>
                                })}
                            </optgroup>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            * คุณสามารถตั้งค่าพื้นหลัง โลโก้ และลายเซ็นต์ แยกกันสำหรับเขตพื้นที่และแต่ละกลุ่มเครือข่ายได้
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Visual Settings */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 border-b pb-2 mb-2 flex items-center">
                                <ImageIcon className="w-4 h-4 mr-2" /> ตั้งค่าพื้นหลังและโลโก้
                            </h4>
                            
                            {/* Background */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">รูปพื้นหลัง (Background)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                                        placeholder="URL..."
                                        value={currentTemplate.backgroundUrl}
                                        onChange={(e) => updateField('backgroundUrl', e.target.value)}
                                    />
                                    <button 
                                        onClick={() => triggerUpload('backgroundUrl')}
                                        disabled={uploadingState.loading}
                                        className="px-3 py-2 bg-gray-100 rounded border border-gray-300 hover:bg-gray-200"
                                    >
                                        {uploadingState.loading && uploadingState.field === 'backgroundUrl' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    แนะนำขนาด A4 แนวนอน (3508 x 2480 px) เพื่อความคมชัดสูงสุด
                                </p>
                            </div>

                            {/* Frame Selection */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center">
                                    <BoxSelect className="w-3.5 h-3.5 mr-1" /> รูปแบบกรอบ (Frame Style)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        className={`p-2 rounded border text-xs text-center transition-colors ${currentTemplate.frameStyle === 'simple-gold' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                                        onClick={() => updateField('frameStyle', 'simple-gold')}
                                    >
                                        เส้นเดี่ยว (Gold)
                                    </button>
                                    <button 
                                        className={`p-2 rounded border text-xs text-center transition-colors ${currentTemplate.frameStyle === 'infinite-wave' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                                        onClick={() => updateField('frameStyle', 'infinite-wave')}
                                    >
                                        เส้นคลื่น (Wave)
                                    </button>
                                    <button 
                                        className={`p-2 rounded border text-xs text-center transition-colors ${currentTemplate.frameStyle === 'ornamental-corners' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                                        onClick={() => updateField('frameStyle', 'ornamental-corners')}
                                    >
                                        ขอบลายไทย
                                    </button>
                                    {selectedContext === 'area' && (
                                        <button 
                                            className={`p-2 rounded border text-xs text-center transition-colors ${currentTemplate.frameStyle === 'thai-premium' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                                            onClick={() => updateField('frameStyle', 'thai-premium')}
                                        >
                                            ลายไทยพรีเมียม
                                        </button>
                                    )}
                                    <button 
                                        className={`p-2 rounded border text-xs text-center transition-colors ${currentTemplate.frameStyle === 'none' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                                        onClick={() => updateField('frameStyle', 'none')}
                                    >
                                        ไม่มีกรอบ
                                    </button>
                                </div>
                            </div>

                            {/* Logos */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">โลโก้ซ้าย / กลาง</label>
                                    <div className="flex gap-1">
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm min-w-0"
                                            placeholder="URL..."
                                            value={currentTemplate.logoLeftUrl}
                                            onChange={(e) => updateField('logoLeftUrl', e.target.value)}
                                        />
                                        <button 
                                            onClick={() => triggerUpload('logoLeftUrl')}
                                            disabled={uploadingState.loading}
                                            className="px-2 py-2 bg-gray-100 rounded border border-gray-300 hover:bg-gray-200"
                                        >
                                            {uploadingState.loading && uploadingState.field === 'logoLeftUrl' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">โลโก้ขวา (ถ้ามี)</label>
                                    <div className="flex gap-1">
                                        <input 
                                            type="text" 
                                            className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm min-w-0"
                                            placeholder="URL..."
                                            value={currentTemplate.logoRightUrl}
                                            onChange={(e) => updateField('logoRightUrl', e.target.value)}
                                        />
                                        <button 
                                            onClick={() => triggerUpload('logoRightUrl')}
                                            disabled={uploadingState.loading}
                                            className="px-2 py-2 bg-gray-100 rounded border border-gray-300 hover:bg-gray-200"
                                        >
                                            {uploadingState.loading && uploadingState.field === 'logoRightUrl' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">ข้อความหัวเรื่อง (Header)</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={currentTemplate.headerText}
                                    onChange={(e) => updateField('headerText', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">ข้อความรอง (Sub Header)</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={currentTemplate.subHeaderText}
                                    onChange={(e) => updateField('subHeaderText', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">ชื่องาน (Event Name)</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="เว้นว่างเพื่อใช้ค่าเริ่มต้นของระบบ"
                                    value={currentTemplate.eventName || ''}
                                    onChange={(e) => updateField('eventName', e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">เช่น: งานศิลปหัตถกรรมนักเรียน ครั้งที่ 71</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">ข้อความวันที่</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                    value={currentTemplate.dateText}
                                    onChange={(e) => updateField('dateText', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Font & Shadow */}
                            <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                                <h4 className="font-bold text-gray-800 border-b pb-2 mb-2 flex items-center text-sm">
                                    <Type className="w-4 h-4 mr-2 text-purple-500" /> รูปแบบตัวอักษร (Typography)
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">ฟอนต์หลัก (Global Default)</label>
                                        <select 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                                            value={currentTemplate.fontFamily || 'Sarabun'}
                                            onChange={(e) => updateField('fontFamily', e.target.value)}
                                        >
                                            {FONT_OPTIONS.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center mb-2">
                                        <input 
                                            type="checkbox" 
                                            id="enableShadow" 
                                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                            checked={currentTemplate.enableTextShadow !== false}
                                            onChange={(e) => updateField('enableTextShadow', e.target.checked)}
                                        />
                                        <label htmlFor="enableShadow" className="ml-2 text-xs text-gray-700 cursor-pointer select-none">
                                            เปิดใช้งานเงาตัวอักษร (Text Shadow)
                                        </label>
                                    </div>

                                    {/* Advanced Font Toggle */}
                                    <button 
                                        onClick={() => setShowAdvancedFonts(!showAdvancedFonts)}
                                        className="text-xs text-purple-600 font-bold hover:underline flex items-center mb-1"
                                    >
                                        {showAdvancedFonts ? <ChevronUp className="w-3 h-3 mr-1"/> : <ChevronDown className="w-3 h-3 mr-1"/>}
                                        {showAdvancedFonts ? 'ซ่อนตั้งค่าขั้นสูง' : 'ตั้งค่าฟอนต์แยกส่วน (Advanced)'}
                                    </button>

                                    {showAdvancedFonts && (
                                        <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-purple-100 mt-2">
                                            <FontSelector label="Header" field="fontHeader" />
                                            <FontSelector label="Sub Header" field="fontSubHeader" />
                                            <FontSelector label="Name (ผู้รับ)" field="fontName" />
                                            <FontSelector label="Body (เนื้อหา)" field="fontDesc" />
                                            <FontSelector label="Date" field="fontDate" />
                                            <FontSelector label="Signatures" field="fontSignatures" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Layout Config */}
                            <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                <h4 className="font-bold text-gray-800 border-b pb-2 mb-2 flex items-center text-sm">
                                    <Scaling className="w-4 h-4 mr-2 text-blue-500" /> การจัดวาง (Layout & Sizing)
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1 flex items-center" title="ระยะห่างจากขอบบนกระดาษถึงเนื้อหา">
                                            <ArrowDownToLine className="w-3 h-3 mr-1"/> ขอบบน (mm)
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.contentTop || 25}
                                            onChange={(e) => updateField('contentTop', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1 flex items-center" title="ระยะห่างจากขอบล่างกระดาษถึงลายเซ็น">
                                            <ArrowUpFromLine className="w-3 h-3 mr-1"/> ขอบล่าง (mm)
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.footerBottom || 25}
                                            onChange={(e) => updateField('footerBottom', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1 flex items-center" title="ความสูงของโลโก้">
                                            <Scaling className="w-3 h-3 mr-1"/> สูงโลโก้ (mm)
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.logoHeight || 35}
                                            onChange={(e) => updateField('logoHeight', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1 flex items-center" title="ระยะห่างระหว่างรูปลายเซ็นต์และชื่อ">
                                            <MoveVertical className="w-3 h-3 mr-1"/> ห่างลายเซ็น (mm)
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.signatureSpacing || 3}
                                            onChange={(e) => updateField('signatureSpacing', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Positioning Config for Serial/QR */}
                            <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                                <h4 className="font-bold text-gray-800 border-b pb-2 mb-2 flex items-center text-sm">
                                    <QrCode className="w-4 h-4 mr-2 text-purple-500" /> ตำแหน่งเลขที่ & QR (mm)
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1">เลขทะเบียน (บน)</label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.serialTop || 10}
                                            onChange={(e) => updateField('serialTop', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">เลขทะเบียน (ขวา)</label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.serialRight || 10}
                                            onChange={(e) => updateField('serialRight', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-600 mb-1">QR Code (ล่าง)</label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.qrBottom || 10}
                                            onChange={(e) => updateField('qrBottom', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">QR Code (ขวา)</label>
                                        <input 
                                            type="number" 
                                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                            value={currentTemplate.qrRight || 10}
                                            onChange={(e) => updateField('qrRight', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Serial Number Configuration */}
                            <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                                <h4 className="font-bold text-gray-800 border-b pb-2 mb-2 flex items-center text-sm">
                                    <Hash className="w-4 h-4 mr-2 text-orange-500" /> ตั้งค่าเลขทะเบียน (Serial Number)
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">รูปแบบ (Format)</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                                            placeholder="{activityId}-{year}-{run:4}"
                                            value={currentTemplate.serialFormat}
                                            onChange={(e) => updateField('serialFormat', e.target.value)}
                                        />
                                        <div className="flex items-center mt-2">
                                            <input 
                                                type="checkbox" 
                                                id="includeTeamId" 
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                checked={currentTemplate.serialFormat?.includes('{id}')}
                                                onChange={(e) => toggleIncludeTeamId(e.target.checked)}
                                            />
                                            <label htmlFor="includeTeamId" className="ml-2 text-xs text-gray-600">
                                                รวม Team ID ในเลขทะเบียน (Include Team ID)
                                            </label>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1">
                                            <span className="bg-gray-100 px-1 rounded">{"{activityId}"}: ACT01</span>
                                            <span className="bg-gray-100 px-1 rounded">{"{year}"}: 2024</span>
                                            <span className="bg-gray-100 px-1 rounded">{"{th_year}"}: 2567</span>
                                            <span className="bg-gray-100 px-1 rounded">{"{run:4}"}: 0001</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">เลขเริ่มต้น (Start At)</label>
                                            <input 
                                                type="number" 
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                                value={currentTemplate.serialStart}
                                                onChange={(e) => updateField('serialStart', parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="bg-gray-50 rounded p-2 flex flex-col justify-center">
                                            <label className="text-[10px] text-gray-500 font-medium">ตัวอย่าง (Preview):</label>
                                            <div className="text-sm font-bold text-blue-600 font-mono">
                                                {getSerialPreview()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Signatories */}
                            <div>
                                <div className="flex justify-between items-center border-b pb-2 mb-2">
                                    <h4 className="font-bold text-gray-800 flex items-center">
                                        <PenTool className="w-4 h-4 mr-2" /> ผู้ลงนาม (Signatories)
                                    </h4>
                                    <div className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            id="showSigLine" 
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            checked={currentTemplate.showSignatureLine !== false} // Default true
                                            onChange={(e) => updateField('showSignatureLine', e.target.checked)}
                                        />
                                        <label htmlFor="showSigLine" className="ml-2 text-xs text-gray-600 cursor-pointer select-none">
                                            แสดงเส้นบรรทัด
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {currentTemplate.signatories.map((sig, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 relative">
                                            <button 
                                                onClick={() => removeSignatory(idx)}
                                                className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="space-y-2">
                                                <input 
                                                    type="text" 
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                    placeholder="ชื่อ-นามสกุล"
                                                    value={sig.name}
                                                    onChange={(e) => updateSignatory(idx, 'name', e.target.value)}
                                                />
                                                <textarea 
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none"
                                                    placeholder="ตำแหน่ง (รองรับหลายบรรทัด)"
                                                    rows={2}
                                                    value={sig.position}
                                                    onChange={(e) => updateSignatory(idx, 'position', e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                                        placeholder="URL ลายเซ็นต์ (ถ้ามี)"
                                                        value={sig.signatureUrl}
                                                        onChange={(e) => updateSignatory(idx, 'signatureUrl', e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => triggerUpload(`signatory-${idx}`)}
                                                        disabled={uploadingState.loading}
                                                        className="px-2 py-1 bg-gray-100 rounded border border-gray-300 hover:bg-gray-200"
                                                    >
                                                        {uploadingState.loading && uploadingState.field === `signatory-${idx}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={addSignatory}
                                    className="w-full mt-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> เพิ่มผู้ลงนาม
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-100 px-6 py-4 flex justify-between gap-3 shrink-0">
                <button 
                    onClick={handlePreview}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center shadow-sm"
                >
                    <Eye className="w-4 h-4 mr-2" /> แสดงตัวอย่าง (Preview)
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                        ปิด
                    </button>
                    <button 
                        onClick={handleSaveAll}
                        disabled={isSaving || isLoadingConfig}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm disabled:opacity-70"
                    >
                        {isSaving ? 'กำลังบันทึก...' : <><Save className="w-4 h-4 mr-2" /> บันทึกการตั้งค่า</>}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CertificateConfigModal;
