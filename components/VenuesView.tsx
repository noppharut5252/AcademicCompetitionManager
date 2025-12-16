
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AppData, Venue, VenueSchedule } from '../types';
import { MapPin, Calendar, Plus, Edit2, Trash2, Navigation, Info, ExternalLink, X, Save, CheckCircle, Utensils, Wifi, Car, Wind, Clock, Building, Layers, Map, AlertCircle, Search, LayoutGrid, Camera, Loader2, Upload, ImageIcon, List, ArrowRight, Trophy, Share2 } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { saveVenue, deleteVenue, uploadImage } from '../services/api';
import { resizeImage } from '../services/utils';
import { shareVenue, shareSchedule } from '../services/liff';

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
        <div className={`fixed top-6 right-6 z-[250] flex items-center p-4 rounded-xl shadow-xl transition-all duration-500 transform translate-y-0 ${styles[type]} animate-in slide-in-from-top-5 fade-in`}>
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
            await shareSchedule(
                sch.activityName || 'กิจกรรม',
                venue.name,
                `${sch.building || ''} ${sch.floor || ''} ${sch.room || ''}`.trim(),
                sch.date,
                sch.timeRange,
                venue.locationUrl
            );
        } catch(e) {
            alert('ไม่สามารถแชร์ได้');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                    <div>
                        <h3 className="font-bold text-lg flex items-center">
                            <Calendar className="w-5 h-5 mr-2" /> ตารางการแข่งขัน
                        </h3>
                        <p className="text-blue-100 text-xs mt-0.5">{venue.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
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
                                                        <div className="text-orange-600 font-medium text-xs sm:text-sm bg-orange-50 px-2 py-1 rounded w-fit">
                                                            <Clock className="w-3 h-3 mr-1 inline" />
                                                            {sch.timeRange || 'ตลอดวัน'}
                                                        </div>
                                                        {sch.level && (
                                                            <div className={`text-[10px] px-2 py-0.5 rounded w-fit border ${sch.level === 'area' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                                {sch.level === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-8">
                                                        <div className="font-bold text-gray-900 text-sm">{sch.activityName}</div>
                                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                                            <MapPin className="w-3.5 h-3.5 mr-1" />
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
                                                        onClick={() => handleShareSchedule(sch)}
                                                        className="absolute top-3 right-3 p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-green-50 hover:text-green-600 transition-colors"
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

const VenueCard = ({ venue, isAdmin, onEdit, onViewSchedule }: { venue: Venue, isAdmin: boolean, onEdit: (v: Venue) => void, onViewSchedule: (v: Venue) => void }) => {
    
    const allSchedules = venue.scheduledActivities || [];
    const PREVIEW_LIMIT = 3;
    const previewSchedules = allSchedules.slice(0, PREVIEW_LIMIT);
    const hiddenCount = Math.max(0, allSchedules.length - PREVIEW_LIMIT);

    const handleShareVenue = async () => {
        try {
            await shareVenue(venue);
        } catch(e) {
            alert('ไม่สามารถแชร์ได้');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full relative">
            {/* Image Section */}
            <div className="relative h-48 bg-gray-200 shrink-0">
                <img 
                    src={venue.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"} 
                    alt={venue.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* Share Button (Always Visible) */}
                <button 
                    onClick={handleShareVenue}
                    className="absolute top-3 left-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors"
                    title="แชร์สนามแข่งขัน"
                >
                    <Share2 className="w-4 h-4" />
                </button>

                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-xl leading-tight text-shadow">{venue.name}</h3>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => onEdit(venue)}
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
                                <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-xs shadow-sm flex flex-col gap-1">
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
                                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center shrink-0"
                                    title="อัปโหลดรูปภาพ"
                                >
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                                </button>
                            </div>
                            {formData.imageUrl && (
                                <div className="mt-2 h-20 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                    <img src={formData.imageUrl} className="w-full h-full object-cover opacity-80" alt="Preview" />
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">สิ่งอำนวยความสะดวก</label>
                            <div className="flex flex-wrap gap-2">
                                {['ที่จอดรถ', 'โรงอาหาร', 'ห้องแอร์', 'Free Wifi', 'จุดปฐมพยาบาล', 'ร้านสะดวกซื้อ'].map(fac => (
                                    <button 
                                        key={fac}
                                        onClick={() => handleFacilityToggle(fac)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.facilities?.includes(fac) ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        {fac}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ข้อมูลติดต่อผู้ดูแล</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.contactInfo} onChange={e => handleChange('contactInfo', e.target.value)} placeholder="ชื่อผู้ดูแล เบอร์โทร" />
                        </div>
                    </div>

                    {/* Activity Schedule Mapping */}
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-800 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-blue-600" /> ตารางการใช้สนาม
                            </h4>
                            {scheduleEditIndex !== null && (
                                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded animate-pulse">กำลังแก้ไขรายการ</span>
                            )}
                        </div>
                        
                        {/* Add/Edit Form */}
                        <div className={`p-4 rounded-xl border space-y-3 mb-4 transition-colors ${scheduleEditIndex !== null ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-100'}`}>
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase tracking-wide opacity-70">
                                    {scheduleEditIndex !== null ? 'แก้ไขข้อมูล' : 'เพิ่มรายการใหม่'}
                                </label>
                                <div className="flex items-center gap-2">
                                    {/* Level Selector */}
                                    <select 
                                        className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={newSchedule.level || 'cluster'}
                                        onChange={(e) => setNewSchedule(prev => ({...prev, level: e.target.value as any}))}
                                    >
                                        <option value="cluster">ระดับกลุ่มเครือข่าย</option>
                                        <option value="area">ระดับเขตพื้นที่</option>
                                    </select>
                                </div>
                            </div>
                            
                            <SearchableSelect 
                                options={activities.map(a => ({ label: a.name, value: a.id }))}
                                value={newSchedule.activityId}
                                onChange={(val) => setNewSchedule(prev => ({ ...prev, activityId: val }))}
                                placeholder="-- ค้นหาและเลือกรายการแข่งขัน --"
                                icon={<Search className="w-4 h-4"/>}
                            />
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <input className="border rounded px-2 py-1.5 text-sm bg-white" placeholder="ตึก/อาคาร" value={newSchedule.building} onChange={e => setNewSchedule(prev => ({...prev, building: e.target.value}))} />
                                <input className="border rounded px-2 py-1.5 text-sm bg-white" placeholder="ชั้น" value={newSchedule.floor} onChange={e => setNewSchedule(prev => ({...prev, floor: e.target.value}))} />
                                <input className="border rounded px-2 py-1.5 text-sm bg-white" placeholder="ห้อง" value={newSchedule.room} onChange={e => setNewSchedule(prev => ({...prev, room: e.target.value}))} />
                                <input className="border rounded px-2 py-1.5 text-sm bg-white" type="date" value={newSchedule.date} onChange={e => setNewSchedule(prev => ({...prev, date: e.target.value}))} />
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-2">
                                <input className="flex-1 border rounded px-2 py-1.5 text-sm bg-white" placeholder="เวลา (เช่น 09:00 - 12:00)" value={newSchedule.timeRange} onChange={e => setNewSchedule(prev => ({...prev, timeRange: e.target.value}))} />
                                <input className="flex-[2] border rounded px-2 py-1.5 text-sm bg-white" placeholder="หมายเหตุ (เช่น เตรียมปลั๊กไฟมาเอง)" value={newSchedule.note} onChange={e => setNewSchedule(prev => ({...prev, note: e.target.value}))} />
                            </div>

                            {/* Schedule Specific Image Upload */}
                            <div className="flex items-center gap-2">
                                <input type="file" ref={scheduleFileInputRef} className="hidden" accept="image/*" onChange={handleScheduleImageUpload} />
                                <button 
                                    onClick={() => scheduleFileInputRef.current?.click()}
                                    disabled={isUploadingScheduleImg}
                                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-50 flex items-center shrink-0"
                                >
                                    {isUploadingScheduleImg ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <ImageIcon className="w-3 h-3 mr-1"/>}
                                    {newSchedule.imageUrl ? 'เปลี่ยนรูปห้อง' : 'อัปโหลดรูปห้อง/สถานที่'}
                                </button>
                                {newSchedule.imageUrl && (
                                    <div className="flex items-center gap-2">
                                        <img src={newSchedule.imageUrl} className="h-8 w-8 rounded object-cover border border-gray-200" alt="Room" />
                                        <button onClick={() => setNewSchedule(prev => ({...prev, imageUrl: ''}))} className="text-red-500 hover:text-red-700"><X className="w-3 h-3"/></button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2 pt-2 border-t border-dashed border-gray-300 mt-2">
                                {scheduleEditIndex !== null ? (
                                    <>
                                        <button onClick={addOrUpdateSchedule} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 flex items-center justify-center">
                                            <Save className="w-4 h-4 mr-1"/> บันทึกแก้ไขทันที
                                        </button>
                                        <button onClick={cancelScheduleEdit} className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center">
                                            ยกเลิก
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={addOrUpdateSchedule} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center">
                                        <Plus className="w-4 h-4 mr-1"/> เพิ่มและบันทึกทันที
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                            {formData.scheduledActivities?.map((item, idx) => (
                                <div key={idx} className={`flex items-start justify-between p-3 bg-white border rounded-lg transition-colors shadow-sm group ${scheduleEditIndex === idx ? 'border-orange-400 ring-1 ring-orange-400 bg-orange-50/20' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <div className="flex-1" onClick={() => editScheduleItem(idx)}>
                                        <div className="flex justify-between items-start pr-2">
                                            <div className="font-bold text-sm text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">{item.activityName}</div>
                                            {item.level && <span className={`text-[10px] px-1.5 rounded border ${item.level === 'area' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{item.level === 'area' ? 'เขต' : 'กลุ่ม'}</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <span className="flex items-center text-blue-600 font-medium"><MapPin className="w-3 h-3 mr-1"/> {item.building} {item.floor} {item.room}</span>
                                            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {item.date}</span>
                                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {item.timeRange}</span>
                                        </div>
                                        {item.note && <div className="text-xs text-orange-600 mt-1 bg-orange-50 inline-block px-2 py-0.5 rounded border border-orange-100">{item.note}</div>}
                                        {item.imageUrl && (
                                            <div className="mt-1">
                                                <span className="text-[10px] text-green-600 flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> มีรูปภาพประกอบ</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => editScheduleItem(idx)} className="text-blue-500 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50" title="แก้ไข">
                                            <Edit2 className="w-3.5 h-3.5"/>
                                        </button>
                                        <button onClick={() => removeSchedule(idx)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50" title="ลบ">
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!formData.scheduledActivities || formData.scheduledActivities.length === 0) && (
                                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                    ยังไม่มีกิจกรรมที่กำหนด
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    {venue ? (
                        <button onClick={() => onDelete(venue.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center">
                            <Trash2 className="w-4 h-4 mr-2"/> ลบสนามนี้
                        </button>
                    ) : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-200 rounded-lg">ปิด</button>
                        <button 
                            onClick={handleMainSave} 
                            disabled={isSaving}
                            className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center disabled:opacity-70"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            บันทึกข้อมูลหลัก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VenuesView: React.FC<VenuesViewProps> = ({ data, user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  
  // New State for Viewing Schedule
  const [scheduleVenue, setScheduleVenue] = useState<Venue | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
  
  const [localVenues, setLocalVenues] = useState<Venue[]>(data.venues || []);

  const canManage = ['admin', 'area', 'group_admin'].includes(user?.level?.toLowerCase());

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type, isVisible: true });
  };

  const handleEdit = (v: Venue) => {
      setEditingVenue(v);
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      setEditingVenue(null);
      setIsModalOpen(true);
  };

  const handleSave = async (venueData: Venue): Promise<boolean> => {
      try {
        // 1. Determine ID and Final Object
        let finalVenue = { ...venueData };
        if (!finalVenue.id) {
            finalVenue.id = `V${Date.now()}`;
        }

        // 2. Optimistic Update
        let updatedList = [];
        const exists = localVenues.some(v => v.id === finalVenue.id);
        if (exists) {
            updatedList = localVenues.map(v => v.id === finalVenue.id ? finalVenue : v);
        } else {
            updatedList = [...localVenues, finalVenue];
        }
        setLocalVenues(updatedList);
        
        // 3. Call API with the Correct Object (Including ID)
        await saveVenue(finalVenue);
        showToast('บันทึกข้อมูลสำเร็จ', 'success');
        return true;
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
        return false;
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('คุณต้องการลบสนามนี้ใช่หรือไม่?')) return;
      
      setLocalVenues(prev => prev.filter(v => v.id !== id));
      setIsModalOpen(false);
      showToast('ลบข้อมูลเรียบร้อยแล้ว', 'success');
      
      await deleteVenue(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
        <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({...prev, isVisible: false}))} />
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                    <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                    สนามแข่งขันและกำหนดการ (Venues & Schedule)
                </h2>
                <p className="text-gray-500 text-sm mt-1">ข้อมูลสถานที่ อาคาร ห้องสอบ และเวลาแข่งขัน</p>
            </div>
            {canManage && (
                <button 
                    onClick={handleAdd}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                >
                    <Plus className="w-4 h-4 mr-2" /> เพิ่มสนามแข่ง
                </button>
            )}
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localVenues.length > 0 ? (
                localVenues.map(venue => (
                    <VenueCard 
                        key={venue.id} 
                        venue={venue} 
                        isAdmin={canManage} 
                        onEdit={handleEdit}
                        onViewSchedule={(v) => setScheduleVenue(v)}
                    />
                ))
            ) : (
                <div className="col-span-full py-16 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">ยังไม่มีข้อมูลสนามแข่งขัน</h3>
                    <p className="text-gray-500 text-sm mt-1">
                        {canManage ? 'กดปุ่ม "เพิ่มสนามแข่ง" เพื่อเริ่มต้นใช้งาน' : 'ผู้ดูแลระบบยังไม่ได้เพิ่มข้อมูล'}
                    </p>
                    {canManage && (
                        <button 
                            onClick={handleAdd}
                            className="mt-4 px-6 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                        >
                            เพิ่มสนามแข่งแรก
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Edit Modal */}
        {isModalOpen && (
            <VenueModal 
                isOpen={isModalOpen} 
                venue={editingVenue} 
                activities={data.activities}
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave} 
                onDelete={handleDelete}
            />
        )}

        {/* Schedule Detail Modal */}
        {scheduleVenue && (
            <VenueScheduleModal
                venue={scheduleVenue}
                isOpen={!!scheduleVenue}
                onClose={() => setScheduleVenue(null)}
            />
        )}
    </div>
  );
};

export default VenuesView;

