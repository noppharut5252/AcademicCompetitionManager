
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppData, Venue, VenueSchedule } from '../types';
import { MapPin, Calendar, Plus, Edit2, Trash2, Navigation, Info, ExternalLink, X, Save, CheckCircle, Utensils, Wifi, Car, Wind, Clock, Building, Layers, Map, AlertCircle, Search, LayoutGrid, Camera, Loader2, Upload, ImageIcon, List, ArrowRight, Trophy, Share2, Copy, Printer } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { saveVenue, deleteVenue, uploadImage } from '../services/api';
import { resizeImage } from '../services/utils';
import { shareVenue, shareSchedule } from '../services/liff';
// @ts-ignore
import pdfMake from "pdfmake/build/pdfmake";
// @ts-ignore
import pdfFonts from "pdfmake/build/vfs_fonts";

// Assign vfs to pdfMake
if (pdfMake && pdfMake.vfs === undefined && pdfFonts) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;
}

interface VenuesViewProps {
  data: AppData;
  user?: any;
}

const FACILITY_ICONS: Record<string, React.ReactNode> = {
    'Parking': <Car className="w-4 h-4" />,
    'ที่จอดรถ': <Car className="w-4 h-4" />,
    'Canteen': <Utensils className="w-4 h-4" />,
    'โรงอาหาร': <Utensils className="w-4 h-4" />,
    'Air Con': <Wind className="w-4 h-4" />,
    'ห้องแอร์': <Wind className="w-4 h-4" />,
    'Wifi': <Wifi className="w-4 h-4" />,
    'Free Wifi': <Wifi className="w-4 h-4" />,
};

// --- Helper: Load Thai Fonts for pdfMake ---
const loadThaiFonts = async () => {
    // Check if fonts are already loaded (custom check)
    if (pdfMake.fonts && pdfMake.fonts.Sarabun) return;

    const fontBaseUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/";
    const regularUrl = fontBaseUrl + "Sarabun-Regular.ttf";
    const boldUrl = fontBaseUrl + "Sarabun-Bold.ttf";

    const toBase64 = (buffer: ArrayBuffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    try {
        const [regRes, boldRes] = await Promise.all([
            fetch(regularUrl),
            fetch(boldUrl)
        ]);

        const [regBlob, boldBlob] = await Promise.all([
            regRes.arrayBuffer(),
            boldRes.arrayBuffer()
        ]);

        // Initialize vfs if missing
        if (!pdfMake.vfs) pdfMake.vfs = {};

        // Add to VFS
        pdfMake.vfs["Sarabun-Regular.ttf"] = toBase64(regBlob);
        pdfMake.vfs["Sarabun-Bold.ttf"] = toBase64(boldBlob);

        // Define Fonts
        pdfMake.fonts = {
            ...pdfMake.fonts,
            Sarabun: {
                normal: "Sarabun-Regular.ttf",
                bold: "Sarabun-Bold.ttf",
                italics: "Sarabun-Regular.ttf", 
                bolditalics: "Sarabun-Bold.ttf"
            }
        };
    } catch (e) {
        console.error("Failed to load Thai fonts", e);
        throw new Error("ไม่สามารถโหลดฟอนต์ภาษาไทยได้");
    }
};

// --- Skeleton Component ---
const VenuesSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                <div className="h-48 bg-gray-200 shrink-0"></div>
                <div className="p-5 flex-1 flex flex-col space-y-4">
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3 h-32 border border-gray-100"></div>
                    <div className="flex gap-2 pt-2">
                        <div className="h-10 bg-gray-200 rounded-lg flex-1"></div>
                        <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// Internal Toast Component
const Toast = ({ message, type, isVisible, onClose }: { message: string, type: 'success' | 'error' | 'info', isVisible: boolean, onClose: () => void }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const styles = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white'
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />
    };

    return (
        <div className={`fixed top-6 right-6 z-[300] flex items-center p-4 rounded-xl shadow-xl transition-all duration-500 transform translate-y-0 ${styles[type]} animate-in slide-in-from-top-5 fade-in`}>
            <div className="mr-3">{icons[type]}</div>
            <div className="font-medium text-sm">{message}</div>
            <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// --- New Component: Full Schedule Modal ---
const VenueScheduleModal = ({ venue, isOpen, onClose }: { venue: Venue, isOpen: boolean, onClose: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
    const [isGenerating, setIsGenerating] = useState(false);

    const groupedSchedules = useMemo(() => {
        if (!venue.scheduledActivities) return {};
        
        // Filter first
        const filtered = venue.scheduledActivities.filter(sch => 
            sch.activityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sch.room?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sch.building?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Sort by Date then Time
        filtered.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.timeRange || '').localeCompare(b.timeRange || '');
        });

        const groups: Record<string, VenueSchedule[]> = {};
        filtered.forEach(sch => {
            const date = sch.date || 'ไม่ระบุวันที่';
            if (!groups[date]) groups[date] = [];
            groups[date].push(sch);
        });
        return groups;
    }, [venue.scheduledActivities, searchTerm]);

    const sortedDates = Object.keys(groupedSchedules).sort();

    const handleShareSchedule = async (sch: VenueSchedule) => {
        try {
            const result = await shareSchedule(
                sch.activityName || '',
                venue.name,
                `${sch.building || ''} ${sch.floor || ''} ${sch.room || ''}`.trim(),
                sch.date,
                sch.timeRange,
                venue.locationUrl,
                sch.imageUrl || '' // Pass Image URL explicitly
            );

            if (result.success) {
                if (result.method === 'copy') {
                    setToast({ message: 'คัดลอกข้อมูลแล้ว', type: 'success', isVisible: true });
                }
            } else {
                setToast({ message: 'ไม่สามารถแชร์ได้ กรุณาลองใหม่', type: 'error', isVisible: true });
            }
        } catch(e) {
            setToast({ message: 'เกิดข้อผิดพลาด', type: 'error', isVisible: true });
        }
    };

    const handlePrint = async () => {
        setIsGenerating(true);
        try {
            await loadThaiFonts();

            const tableBody: any[] = [];
            
            // Header Row
            tableBody.push([
                { text: 'เวลา', style: 'tableHeader' },
                { text: 'รายการแข่งขัน', style: 'tableHeader' },
                { text: 'อาคาร', style: 'tableHeader' },
                { text: 'ชั้น', style: 'tableHeader' },
                { text: 'ห้อง', style: 'tableHeader' },
                { text: 'ระดับ', style: 'tableHeader' }
            ]);

            sortedDates.forEach(date => {
                // Date Separator Row
                tableBody.push([{ 
                    text: `📅 วันที่ ${date}`, 
                    colSpan: 6, 
                    fillColor: '#dbeafe', 
                    color: '#1e3a8a', 
                    bold: true,
                    margin: [0, 5, 0, 5]
                }, {}, {}, {}, {}, {}]);

                groupedSchedules[date].forEach(sch => {
                    tableBody.push([
                        { text: sch.timeRange || '-', alignment: 'center', color: '#e11d48', bold: true },
                        { 
                            stack: [
                                { text: sch.activityName, bold: true },
                                sch.note ? { text: `Note: ${sch.note}`, fontSize: 9, color: '#dc2626', italics: true } : ''
                            ] 
                        },
                        { text: sch.building || '-', alignment: 'center' },
                        { text: sch.floor || '-', alignment: 'center' },
                        { text: sch.room || '-', alignment: 'center', bold: true, color: '#2563eb' },
                        { 
                            text: sch.level === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม', 
                            alignment: 'center', 
                            fillColor: sch.level === 'area' ? '#f3e8ff' : '#eff6ff',
                            color: sch.level === 'area' ? '#7e22ce' : '#1d4ed8',
                            fontSize: 10
                        }
                    ]);
                });
            });

            const docDefinition: any = {
                content: [
                    { text: venue.name, style: 'header' },
                    { text: venue.description || 'ตารางการใช้ห้องและสนามแข่งขัน', style: 'subheader' },
                    { 
                        text: venue.locationUrl ? `พิกัด: ${venue.locationUrl}` : '', 
                        link: venue.locationUrl, 
                        color: 'blue', 
                        decoration: 'underline', 
                        fontSize: 10,
                        margin: [0, 0, 0, 10]
                    },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
                            body: tableBody
                        },
                        layout: {
                            fillColor: function (rowIndex: number, node: any, columnIndex: number) {
                                // Alternating rows, skip header (0)
                                if (rowIndex > 0) {
                                    // Check if it's a date separator (colSpan 6)
                                    if (node.table.body[rowIndex][0].colSpan === 6) return '#dbeafe'; 
                                    return (rowIndex % 2 === 0) ? '#f8fafc' : null;
                                }
                                return null;
                            }
                        }
                    },
                    {
                        text: `พิมพ์จากระบบบริหารจัดการการแข่งขันวิชาการ | ข้อมูล ณ ${new Date().toLocaleString('th-TH')}`,
                        alignment: 'right',
                        fontSize: 8,
                        color: 'gray',
                        margin: [0, 20, 0, 0]
                    }
                ],
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        color: '#1e3a8a',
                        margin: [0, 0, 0, 5]
                    },
                    subheader: {
                        fontSize: 14,
                        color: '#64748b',
                        margin: [0, 0, 0, 5]
                    },
                    tableHeader: {
                        bold: true,
                        fontSize: 11,
                        color: 'black',
                        fillColor: '#e2e8f0',
                        alignment: 'center'
                    }
                },
                defaultStyle: {
                    font: 'Sarabun',
                    fontSize: 12
                }
            };

            pdfMake.createPdf(docDefinition).open();

        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการสร้าง PDF หรือโหลดฟอนต์');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({...prev, isVisible: false}))} />
            
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-bold text-lg flex items-center">
                            <Calendar className="w-5 h-5 mr-2" /> ตารางการแข่งขัน
                        </h3>
                        <p className="text-blue-100 text-xs mt-0.5">{venue.name}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button 
                            onClick={handlePrint}
                            disabled={isGenerating}
                            className="hidden sm:flex items-center px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium backdrop-blur-sm border border-white/10 transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Printer className="w-4 h-4 mr-1.5" />}
                            {isGenerating ? 'กำลังสร้าง PDF...' : 'พิมพ์ตาราง (PDF)'}
                        </button>
                        {/* Mobile print icon only */}
                        <button 
                            onClick={handlePrint}
                            disabled={isGenerating}
                            className="sm:hidden p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                        </button>

                        {venue.locationUrl && (
                            <a 
                                href={venue.locationUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
                                title="เปิดแผนที่"
                            >
                                <Navigation className="w-5 h-5" />
                            </a>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="ค้นหารายการแข่งขัน, ห้องสอบ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 flex-1 bg-gray-50">
                    {sortedDates.length > 0 ? (
                        <div className="space-y-6">
                            {sortedDates.map(date => (
                                <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center text-blue-800 font-bold text-sm sticky top-0">
                                        <Calendar className="w-4 h-4 mr-2" /> {date}
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {groupedSchedules[date].map((sch, idx) => (
                                            <div key={idx} className="p-3 hover:bg-gray-50 transition-colors flex flex-col gap-3 relative group">
                                                <div className="flex items-start gap-3">
                                                    <div className="sm:w-24 shrink-0 flex flex-col gap-1">
                                                        <div className="text-orange-600 font-medium text-xs sm:text-sm bg-orange-50 px-2 py-1 rounded w-fit whitespace-nowrap">
                                                            <Clock className="w-3 h-3 mr-1 inline" />
                                                            {sch.timeRange || 'ตลอดวัน'}
                                                        </div>
                                                        {sch.level && (
                                                            <div className={`text-[10px] px-2 py-0.5 rounded w-fit border ${sch.level === 'area' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                                {sch.level === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-8 cursor-pointer" onClick={() => handleShareSchedule(sch)}>
                                                        <div className="font-bold text-gray-900 text-sm">{sch.activityName}</div>
                                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                                            <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                                            <span>{sch.building} {sch.floor} <b>{sch.room}</b></span>
                                                        </div>
                                                        {sch.note && (
                                                            <div className="mt-1.5 text-xs text-red-600 bg-red-50 inline-block px-2 py-0.5 rounded border border-red-100">
                                                                Note: {sch.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Share Button for specific schedule */}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleShareSchedule(sch); }}
                                                        className="absolute top-3 right-3 p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-green-50 hover:text-green-600 transition-colors shadow-sm border border-gray-200"
                                                        title="แชร์กำหนดการนี้"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {/* Image Preview for specific schedule */}
                                                {sch.imageUrl && (
                                                    <div className="mt-1 ml-0 sm:ml-27">
                                                        <img src={sch.imageUrl} alt="Room" className="h-24 w-auto rounded-lg object-cover border border-gray-200" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <List className="w-12 h-12 mb-2 opacity-20" />
                            <p>ไม่พบรายการแข่งขัน</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface VenueCardProps {
    venue: Venue;
    isAdmin: boolean;
    onEdit: (v: Venue) => void;
    onViewSchedule: (v: Venue) => void;
}

const VenueCard: React.FC<VenueCardProps> = ({ venue, isAdmin, onEdit, onViewSchedule }) => {
    
    const allSchedules = venue.scheduledActivities || [];
    const PREVIEW_LIMIT = 3;
    const previewSchedules = allSchedules.slice(0, PREVIEW_LIMIT);
    const hiddenCount = Math.max(0, allSchedules.length - PREVIEW_LIMIT);

    const handleShareVenue = async () => {
        try {
            const result = await shareVenue(venue);
            if (result.success && result.method === 'copy') {
                alert('คัดลอกข้อมูลสนามแล้ว');
            }
        } catch(e) {
            alert('ไม่สามารถแชร์ได้');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full relative">
            {/* Image Section */}
            <div className="relative h-48 bg-gray-200 shrink-0 cursor-pointer" onClick={() => onViewSchedule(venue)}>
                <img 
                    src={venue.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"} 
                    alt={venue.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* Share Button (Always Visible) */}
                <button 
                    onClick={(e) => { e.stopPropagation(); handleShareVenue(); }}
                    className="absolute top-3 left-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors border border-white/20"
                    title="แชร์สนามแข่งขัน"
                >
                    <Share2 className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-xl leading-tight text-shadow">{venue.name}</h3>
                </div>
                {isAdmin && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(venue); }}
                        className="absolute top-3 right-3 p-2 bg-white/90 rounded-full text-blue-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0"
                        title="แก้ไขข้อมูลสนาม"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start text-sm text-gray-600 mb-4 overflow-hidden">
                    <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-blue-500" />
                    <p className="line-clamp-2">{venue.description || 'ไม่มีรายละเอียด'}</p>
                </div>

                {/* Facilities */}
                {venue.facilities && venue.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {venue.facilities.map((fac, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-600">
                                {FACILITY_ICONS[fac] || <CheckCircle className="w-3 h-3 mr-1" />}
                                <span className="ml-1">{fac}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Schedule List (Preview) */}
                <div className="flex-1 min-h-0 mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center justify-between">
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> รายการที่แข่งขัน ({allSchedules.length})</span>
                    </div>
                    
                    {allSchedules.length > 0 ? (
                        <div className="space-y-2 mb-2">
                            {previewSchedules.map((sch, idx) => (
                                <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-xs shadow-sm flex flex-col gap-1 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => onViewSchedule(venue)}>
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-gray-800 line-clamp-1 flex-1" title={sch.activityName}>{sch.activityName}</div>
                                        {sch.level && <span className={`text-[9px] px-1.5 rounded border ml-1 ${sch.level === 'area' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{sch.level === 'area' ? 'เขต' : 'กลุ่ม'}</span>}
                                    </div>
                                    <div className="flex items-center justify-between text-gray-500">
                                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {sch.date} {sch.timeRange ? `(${sch.timeRange})` : ''}</span>
                                    </div>
                                    <div className="flex items-center text-blue-600">
                                        <MapPin className="w-3 h-3 mr-1"/> <span className="truncate">{sch.building} {sch.room}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-400 italic py-4">
                            <Calendar className="w-6 h-6 mb-1 opacity-20"/>
                            ยังไม่มีรายการแข่งขัน
                        </div>
                    )}

                    {/* View All Button */}
                    {hiddenCount > 0 && (
                        <button 
                            onClick={() => onViewSchedule(venue)}
                            className="mt-auto w-full py-2 bg-white border border-blue-200 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center"
                        >
                            ดูอีก {hiddenCount} รายการ <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                    )}
                    {hiddenCount === 0 && allSchedules.length > 0 && (
                         <button 
                            onClick={() => onViewSchedule(venue)}
                            className="mt-auto w-full py-2 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            ดูรายละเอียดเต็ม
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
                    <a 
                        href={venue.locationUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Navigation className="w-4 h-4 mr-2" /> นำทาง (GPS)
                    </a>
                    {venue.contactInfo && (
                        <div className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 flex flex-col justify-center items-center text-center bg-gray-50 max-w-[40%]">
                            <span className="font-bold text-[10px] uppercase text-gray-400">ผู้ดูแล</span>
                            <span className="truncate w-full font-medium text-gray-700" title={venue.contactInfo}>{venue.contactInfo}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const VenueModal = ({ venue, isOpen, onClose, onSave, onDelete, activities }: { venue: Venue | null, isOpen: boolean, onClose: () => void, onSave: (v: Venue) => Promise<boolean>, onDelete: (id: string) => void, activities: any[] }) => {
    const [formData, setFormData] = useState<Partial<Venue>>({
        name: '', description: '', locationUrl: '', imageUrl: '', facilities: [], contactInfo: '', scheduledActivities: []
    });
    
    // Internal Saving State for the Modal
    const [isSaving, setIsSaving] = useState(false);

    // Schedule Editing State
    const [scheduleEditIndex, setScheduleEditIndex] = useState<number | null>(null);
    const [newSchedule, setNewSchedule] = useState<VenueSchedule>({
        activityId: '', activityName: '', building: '', floor: '', room: '', date: '', timeRange: '', note: '', level: 'cluster', imageUrl: ''
    });

    // Image Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingScheduleImg, setIsUploadingScheduleImg] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scheduleFileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (venue) {
            setFormData(venue);
        } else {
            setFormData({ name: '', description: '', locationUrl: '', imageUrl: '', facilities: [], contactInfo: '', scheduledActivities: [] });
        }
        setScheduleEditIndex(null);
        setNewSchedule({ activityId: '', activityName: '', building: '', floor: '', room: '', date: '', timeRange: '', note: '', level: 'cluster', imageUrl: '' });
    }, [venue, isOpen]);

    const handleChange = (field: keyof Venue, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFacilityToggle = (fac: string) => {
        const current = formData.facilities || [];
        if (current.includes(fac)) {
            handleChange('facilities', current.filter(f => f !== fac));
        } else {
            handleChange('facilities', [...current, fac]);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const base64 = await resizeImage(file, 1024, 1024, 0.8);
            const res = await uploadImage(base64, `venue_${Date.now()}.jpg`);
            
            if (res.status === 'success' && res.fileUrl) {
                const publicUrl = `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w1000`;
                handleChange('imageUrl', publicUrl);
                handleChange('mapImageId', res.fileId); 
            } else {
                alert('อัปโหลดไม่สำเร็จ: ' + res.message);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการอัปโหลด');
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleScheduleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingScheduleImg(true);
        try {
            const base64 = await resizeImage(file, 800, 800, 0.8);
            const res = await uploadImage(base64, `room_${Date.now()}.jpg`);
            
            if (res.status === 'success' && res.fileUrl) {
                const publicUrl = `https://drive.google.com/thumbnail?id=${res.fileId}&sz=w800`;
                setNewSchedule(prev => ({ ...prev, imageUrl: publicUrl }));
            } else {
                alert('อัปโหลดรูปห้องไม่สำเร็จ: ' + res.message);
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsUploadingScheduleImg(false);
            if(scheduleFileInputRef.current) scheduleFileInputRef.current.value = '';
        }
    };

    // --- Schedule Logic (Immediate Save) ---
    const addOrUpdateSchedule = async () => {
        if (!newSchedule.activityId || !newSchedule.date) {
            alert('กรุณาเลือกรายการแข่งขันและระบุวันที่');
            return;
        }
        const activityName = activities.find(a => a.id === newSchedule.activityId)?.name || newSchedule.activityId;
        const entry = { ...newSchedule, activityName };
        
        const currentList = [...(formData.scheduledActivities || [])];

        if (scheduleEditIndex !== null) {
            currentList[scheduleEditIndex] = entry;
            setScheduleEditIndex(null);
        } else {
            currentList.push(entry);
        }

        const updatedVenue = { ...formData, scheduledActivities: currentList } as Venue;
        setFormData(updatedVenue);
        
        // Immediate Save to Backend
        await onSave(updatedVenue); 
        
        // Reset form
        setNewSchedule({ 
            activityId: '', 
            activityName: '', 
            building: newSchedule.building, 
            floor: newSchedule.floor, 
            room: newSchedule.room, 
            date: newSchedule.date, 
            timeRange: '', 
            note: '',
            level: 'cluster',
            imageUrl: ''
        });
    };

    const editScheduleItem = (index: number) => {
        const item = formData.scheduledActivities![index];
        setNewSchedule(item);
        setScheduleEditIndex(index);
    };

    const cancelScheduleEdit = () => {
        setScheduleEditIndex(null);
        setNewSchedule({ 
            activityId: '', activityName: '', building: '', floor: '', room: '', date: '', timeRange: '', note: '', level: 'cluster', imageUrl: ''
        });
    };

    const removeSchedule = async (index: number) => {
        if (!confirm('ยืนยันการลบรายการนี้?')) return;
        const updatedList = [...(formData.scheduledActivities || [])];
        updatedList.splice(index, 1);
        
        const updatedVenue = { ...formData, scheduledActivities: updatedList } as Venue;
        setFormData(updatedVenue);
        await onSave(updatedVenue); // Immediate Save

        if (scheduleEditIndex === index) cancelScheduleEdit();
    };

    const handleMainSave = async () => {
        setIsSaving(true);
        await onSave(formData as Venue);
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-blue-600"/>
                        {venue ? 'แก้ไขข้อมูลสนาม' : 'เพิ่มสนามแข่งขัน'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสนาม/สถานที่ *</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="เช่น อาคารเรียนรวม 5" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด/จุดสังเกต</label>
                            <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-16 resize-none focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder="เช่น ใกล้โรงอาหาร, ชั้น 2 ห้อง 501" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL *</label>
                            <div className="flex gap-2">
                                <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.locationUrl} onChange={e => handleChange('locationUrl', e.target.value)} placeholder="https://maps.google.com/..." />
                                <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200"><ExternalLink className="w-4 h-4"/></a>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพ (Image)</label>
                            <div className="flex gap-2 items-center">
                                <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.imageUrl} onChange={e => handleChange('imageUrl', e.target.value)} placeholder="https://..." />
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">สิ่งอำนวยความสะดวก</label>
                            <div className="flex flex-wrap gap-2">
                                {['Parking', 'Canteen', 'Air Con', 'Wifi'].map(fac => (
                                    <button 
                                        key={fac} 
                                        onClick={() => handleFacilityToggle(fac)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.facilities?.includes(fac) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {fac}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ดูแล / เบอร์ติดต่อ</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.contactInfo} onChange={e => handleChange('contactInfo', e.target.value)} placeholder="ชื่อครู - เบอร์โทร" />
                        </div>
                    </div>

                    {/* Schedule Section */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-800 text-sm flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-orange-500"/>
                                ตารางการใช้ห้อง/สนาม
                            </h4>
                        </div>
                        
                        {/* Add/Edit Schedule Form */}
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-orange-800 mb-1">รายการแข่งขัน</label>
                                    <SearchableSelect 
                                        options={activities.map(a => ({ label: a.name, value: a.id }))}
                                        value={newSchedule.activityId}
                                        onChange={val => setNewSchedule(prev => ({ ...prev, activityId: val }))}
                                        placeholder="เลือกกิจกรรม..."
                                        className="bg-white"
                                        icon={<Trophy className="w-3 h-3"/>}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-orange-800 mb-1">วันที่</label>
                                    <input type="date" className="w-full border rounded px-2 py-1.5 text-sm" value={newSchedule.date} onChange={e => setNewSchedule(prev => ({ ...prev, date: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-orange-800 mb-1">เวลา (เช่น 09:00-12:00)</label>
                                    <input className="w-full border rounded px-2 py-1.5 text-sm" value={newSchedule.timeRange} onChange={e => setNewSchedule(prev => ({ ...prev, timeRange: e.target.value }))} placeholder="09:00 - 12:00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-orange-800 mb-1">อาคาร</label>
                                    <input className="w-full border rounded px-2 py-1.5 text-sm" value={newSchedule.building} onChange={e => setNewSchedule(prev => ({ ...prev, building: e.target.value }))} placeholder="อาคาร..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-orange-800 mb-1">ชั้น / ห้อง</label>
                                    <div className="flex gap-2">
                                        <input className="w-1/3 border rounded px-2 py-1.5 text-sm" value={newSchedule.floor} onChange={e => setNewSchedule(prev => ({ ...prev, floor: e.target.value }))} placeholder="ชั้น..." />
                                        <input className="flex-1 border rounded px-2 py-1.5 text-sm" value={newSchedule.room} onChange={e => setNewSchedule(prev => ({ ...prev, room: e.target.value }))} placeholder="ห้อง..." />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-orange-800 mb-1">หมายเหตุ</label>
                                    <input className="w-full border rounded px-2 py-1.5 text-sm" value={newSchedule.note} onChange={e => setNewSchedule(prev => ({ ...prev, note: e.target.value }))} placeholder="เช่น เตรียมคอมพิวเตอร์มาเอง" />
                                </div>
                                
                                {/* Room Image Upload */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-orange-800 mb-1">รูปห้องสอบ/แผนผังห้อง</label>
                                    <div className="flex gap-2 items-center">
                                        <input className="flex-1 border rounded px-2 py-1.5 text-sm bg-white" value={newSchedule.imageUrl || ''} onChange={e => setNewSchedule(prev => ({ ...prev, imageUrl: e.target.value }))} placeholder="URL รูปภาพ..." />
                                        <input type="file" ref={scheduleFileInputRef} className="hidden" accept="image/*" onChange={handleScheduleImageUpload} />
                                        <button 
                                            onClick={() => scheduleFileInputRef.current?.click()}
                                            disabled={isUploadingScheduleImg}
                                            className="px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded text-xs hover:bg-orange-50 flex items-center"
                                        >
                                            {isUploadingScheduleImg ? <Loader2 className="w-3 h-3 animate-spin"/> : <ImageIcon className="w-3 h-3"/>}
                                        </button>
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex items-center gap-4 mt-1">
                                    <div className="flex items-center">
                                        <input type="radio" id="lvl_cluster" name="level" checked={newSchedule.level === 'cluster'} onChange={() => setNewSchedule(prev => ({ ...prev, level: 'cluster' }))} className="mr-1.5 text-blue-600 focus:ring-blue-500" />
                                        <label htmlFor="lvl_cluster" className="text-xs text-gray-700">ระดับกลุ่มเครือข่าย</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="radio" id="lvl_area" name="level" checked={newSchedule.level === 'area'} onChange={() => setNewSchedule(prev => ({ ...prev, level: 'area' }))} className="mr-1.5 text-purple-600 focus:ring-purple-500" />
                                        <label htmlFor="lvl_area" className="text-xs text-gray-700">ระดับเขตพื้นที่</label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                {scheduleEditIndex !== null && (
                                    <button onClick={cancelScheduleEdit} className="px-3 py-1.5 text-gray-600 text-xs font-bold hover:bg-white/50 rounded">ยกเลิกแก้ไข</button>
                                )}
                                <button onClick={addOrUpdateSchedule} className="px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded shadow-sm hover:bg-orange-600">
                                    {scheduleEditIndex !== null ? 'อัปเดตรายการ' : 'เพิ่มลงตาราง'}
                                </button>
                            </div>
                        </div>

                        {/* List of Schedules */}
                        <div className="space-y-2">
                            {formData.scheduledActivities?.map((sch, idx) => (
                                <div key={idx} className={`flex justify-between items-start p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm group ${scheduleEditIndex === idx ? 'ring-2 ring-orange-400 bg-white' : ''}`}>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800">{sch.activityName}</div>
                                        <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-1">
                                            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {sch.date}</span>
                                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {sch.timeRange}</span>
                                            <span className="flex items-center text-blue-600"><Building className="w-3 h-3 mr-1"/> {sch.building} {sch.room}</span>
                                        </div>
                                        <div className="mt-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${sch.level === 'area' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                {sch.level === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => editScheduleItem(idx)} className="p-1.5 bg-white border border-gray-200 rounded text-blue-600 hover:bg-blue-50"><Edit2 className="w-3 h-3"/></button>
                                        <button onClick={() => removeSchedule(idx)} className="p-1.5 bg-white border border-gray-200 rounded text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                </div>
                            ))}
                            {(!formData.scheduledActivities || formData.scheduledActivities.length === 0) && (
                                <div className="text-center py-6 text-gray-400 text-xs italic border-2 border-dashed border-gray-200 rounded-lg">
                                    ยังไม่มีตารางการแข่งขัน
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
                    {venue && (
                        <button onClick={() => { if(confirm('ยืนยันลบสนามนี้?')) onDelete(venue.id); }} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold flex items-center">
                            <Trash2 className="w-4 h-4 mr-2"/> ลบสนาม
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">ปิด</button>
                        <button onClick={handleMainSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center shadow-md disabled:opacity-70">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2"/>} บันทึกข้อมูลสนาม
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Venues View Component
const VenuesView: React.FC<VenuesViewProps> = ({ data, user }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal States
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    
    const isAdmin = user?.level === 'admin' || user?.level === 'area';

    // Fake Loading
    useEffect(() => {
        setIsLoading(true);
        const t = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(t);
    }, []);

    const filteredVenues = useMemo(() => {
        return (data.venues || []).filter(v => 
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            v.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data.venues, searchTerm]);

    const handleEdit = (v: Venue) => {
        setSelectedVenue(v);
        setIsEditModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedVenue(null);
        setIsEditModalOpen(true);
    };

    const handleViewSchedule = (v: Venue) => {
        setSelectedVenue(v);
        setIsScheduleModalOpen(true);
    };

    const handleSaveVenue = async (venue: Venue) => {
        const isNew = !venue.id;
        const venueToSave = { ...venue, id: isNew ? `V${Date.now()}` : venue.id };
        const success = await saveVenue(venueToSave);
        if (success) {
            // Optimistic update handled by parent reloading data usually, 
            // but we can close modal here. Ideally trigger onDataUpdate.
            setIsEditModalOpen(false);
            window.location.reload(); // Simple reload to refresh data for now
            return true;
        } else {
            alert('บันทึกไม่สำเร็จ');
            return false;
        }
    };

    const handleDeleteVenue = async (id: string) => {
        const success = await deleteVenue(id);
        if (success) {
            setIsEditModalOpen(false);
            window.location.reload();
        } else {
            alert('ลบไม่สำเร็จ');
        }
    };

    if (isLoading) return <VenuesSkeleton />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                        <MapPin className="w-6 h-6 mr-2 text-red-500" />
                        สนามแข่งขัน (Venues)
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">ข้อมูลสถานที่และตารางการใช้ห้องสอบ</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute inset-y-0 left-3 flex items-center pointer-events-none h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:outline-none"
                            placeholder="ค้นหาสนาม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {isAdmin && (
                        <button 
                            onClick={handleAdd}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 mr-2" /> เพิ่มสนาม
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVenues.map(venue => (
                        <VenueCard 
                            key={venue.id} 
                            venue={venue} 
                            isAdmin={isAdmin} 
                            onEdit={handleEdit} 
                            onViewSchedule={handleViewSchedule} 
                        />
                    ))}
                    {filteredVenues.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>ไม่พบข้อมูลสนามแข่งขัน</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ชื่อสนาม</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สิ่งอำนวยความสะดวก</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredVenues.map((venue) => (
                                    <tr key={venue.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewSchedule(venue)}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden mr-3">
                                                    <img className="h-10 w-10 object-cover" src={venue.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=100&q=80"} alt="" />
                                                </div>
                                                <div className="text-sm font-bold text-gray-900">{venue.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500 line-clamp-2 max-w-xs">{venue.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex gap-1">
                                                {(venue.facilities || []).slice(0, 3).map((f, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 border border-gray-200 text-gray-600">{f}</span>
                                                ))}
                                                {(venue.facilities?.length || 0) > 3 && <span className="text-xs text-gray-400 self-center">+{venue.facilities!.length - 3}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleViewSchedule(venue); }}
                                                    className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(venue); }}
                                                        className="text-gray-600 hover:text-gray-900 bg-gray-100 p-1.5 rounded"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            <VenueModal 
                venue={selectedVenue} 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                onSave={handleSaveVenue}
                onDelete={handleDeleteVenue}
                activities={data.activities}
            />

            {selectedVenue && (
                <VenueScheduleModal 
                    venue={selectedVenue} 
                    isOpen={isScheduleModalOpen} 
                    onClose={() => setIsScheduleModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default VenuesView;
