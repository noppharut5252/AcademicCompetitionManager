
import React, { useState, useEffect, useRef } from 'react';
import { CertificateTemplate, AppData, User } from '../types';
import { Save, X, Image as ImageIcon, Plus, Trash2, LayoutTemplate, PenTool, CheckCircle, Upload, Loader2, AlertCircle, Hash, Info, Type, BoxSelect, ArrowUpFromLine, ArrowDownToLine, Scaling } from 'lucide-react';
import { uploadImage, saveCertificateConfig } from '../services/api';
import { resizeImage, fileToBase64 } from '../services/utils';

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
    logoHeight: 35
};

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
  const [targetFieldForUpload, setTargetFieldForUpload] = useState<string>(''); // 'backgroundUrl' | 'logoLeftUrl' | 'signatory-0'

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
          
          if (targetFieldForUpload === 'backgroundUrl') {
              // Special handling for Background: Allow up to 1MB without resize
              if (file.size > 1024 * 1024) {
                  alert('ไฟล์พื้นหลังมีขนาดเกิน 1MB ระบบจะทำการย่อขนาดอัตโนมัติเพื่อให้สามารถบันทึกได้');
                  base64 = await resizeImage(file, 1920, 1080, 0.9); // High quality resize
              } else {
                  // Use original file
                  base64 = await fileToBase64(file);
              }
          } else {
              // Logos and Signatures: Resize to reasonable limits
              base64 = await resizeImage(file, 800, 800, 0.8);
          }

          const res = await uploadImage(base64, `cert_${selectedContext}_${targetFieldForUpload}.jpg`);
          
          if (res.status === 'success' && res.fileUrl) {
              const url = `https://drive.google.com/thumbnail?id=${res.fileId}`;
              
              if (targetFieldForUpload.startsWith('signatory-')) {
                  const idx = parseInt(targetFieldForUpload.split('-')[1]);
                  updateSignatory(idx, 'signatureUrl', url);
              } else {
                  // Direct field
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
          e.target.value = ''; // Reset input
      }
  };

  const handleSaveAll = async () => {
      setIsSaving(true);
      
      // 1. Update Map locally
      const finalTemplates = {
          ...templates,
          [currentTemplate.id]: currentTemplate
      };
      setTemplates(finalTemplates);

      // 2. Save to Backend
      const success = await saveCertificateConfig(currentTemplate.id, currentTemplate);
      
      setIsSaving(false);
      if (success) {
          onSave(finalTemplates); // Update parent state
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

  // Serial Number Preview
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

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                <h3 className="text-lg font-bold flex items-center">
                    <LayoutTemplate className="w-5 h-5 mr-2" />
                    ตั้งค่ารูปแบบเกียรติบัตร (Certificate Templates)
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                
                {/* Context Selector */}
                <div className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <label className="block text-sm font-bold text-gray-700 mb-2">เลือกรูปแบบที่ต้องการแก้ไข</label>
                    <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedContext}
                        onChange={handleContextChange}
                        disabled={isGroupAdmin && !isAdminOrArea} // Group admin locked to own cluster
                    >
                        {isAdminOrArea && <option value="area">ระดับเขตพื้นที่การศึกษา (District Level)</option>}
                        <optgroup label="ระดับกลุ่มเครือข่าย (Cluster Level)">
                            {data.clusters.map(c => {
                                // Filter for Group Admin
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
                            <p className="text-[10px] text-gray-400 mt-1">แนะนำขนาด A4 แนวนอน (1123 x 794 px). หากไฟล์ &lt; 1MB จะไม่มีการย่อขนาด</p>
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
                                    คลื่น (Wave)
                                </button>
                                <button 
                                    className={`p-2 rounded border text-xs text-center transition-colors ${currentTemplate.frameStyle === 'ornamental-corners' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                                    onClick={() => updateField('frameStyle', 'ornamental-corners')}
                                >
                                    ขอบลายไทย
                                </button>
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
                        {/* Layout Config */}
                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                            <h4 className="font-bold text-gray-800 border-b pb-2 mb-2 flex items-center text-sm">
                                <Scaling className="w-4 h-4 mr-2 text-blue-500" /> การจัดวาง (Layout & Sizing)
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
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

            <div className="bg-gray-100 px-6 py-4 flex justify-end gap-3 shrink-0">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
                >
                    ปิด
                </button>
                <button 
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center shadow-sm disabled:opacity-70"
                >
                    {isSaving ? 'กำลังบันทึก...' : <><Save className="w-4 h-4 mr-2" /> บันทึกการตั้งค่า</>}
                </button>
            </div>
        </div>
    </div>
  );
};

export default CertificateConfigModal;

