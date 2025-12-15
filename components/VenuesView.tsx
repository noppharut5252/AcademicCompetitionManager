
import React, { useState } from 'react';
import { AppData, Venue, VenueSchedule } from '../types';
import { MapPin, Calendar, Plus, Edit2, Trash2, Navigation, Info, ExternalLink, X, Save, CheckCircle, Utensils, Wifi, Car, Wind, Clock, Building, Layers, Map, AlertCircle, Search } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { saveVenue, deleteVenue } from '../services/api';

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

const VenueCard = ({ venue, isAdmin, onEdit }: { venue: Venue, isAdmin: boolean, onEdit: (v: Venue) => void }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
            {/* Image Section */}
            <div className="relative h-48 bg-gray-200 shrink-0">
                <img 
                    src={venue.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"} 
                    alt={venue.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-xl leading-tight text-shadow">{venue.name}</h3>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => onEdit(venue)}
                        className="absolute top-3 right-3 p-2 bg-white/90 rounded-full text-blue-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start text-sm text-gray-600 mb-4 h-10 overflow-hidden">
                    <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-blue-500" />
                    <p className="line-clamp-2">{venue.description}</p>
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

                {/* Schedule List */}
                <div className="flex-1 min-h-0 mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" /> รายการที่แข่งขันที่นี่
                    </div>
                    {venue.scheduledActivities && venue.scheduledActivities.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {venue.scheduledActivities.map((sch, idx) => (
                                <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                                    <div className="font-bold text-gray-800 line-clamp-1 mb-1">{sch.activityName}</div>
                                    <div className="flex items-center text-gray-500 flex-wrap gap-x-3 gap-y-1">
                                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {sch.date}</span>
                                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {sch.timeRange}</span>
                                        <span className="flex items-center text-blue-600"><Building className="w-3 h-3 mr-1"/> {sch.building} {sch.room ? `(${sch.room})` : ''}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-400 italic py-2 text-center border border-dashed border-gray-200 rounded">
                            ยังไม่มีรายการแข่งขัน
                        </div>
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
                        <div className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 flex flex-col justify-center items-center text-center bg-gray-50">
                            <span className="font-bold truncate w-20">ติดต่อ</span>
                            <span className="truncate w-20" title={venue.contactInfo}>{venue.contactInfo}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const VenueModal = ({ venue, isOpen, onClose, onSave, onDelete, activities }: { venue: Venue | null, isOpen: boolean, onClose: () => void, onSave: (v: Venue) => void, onDelete: (id: string) => void, activities: any[] }) => {
    const [formData, setFormData] = useState<Partial<Venue>>({
        name: '', description: '', locationUrl: '', imageUrl: '', facilities: [], contactInfo: '', scheduledActivities: []
    });
    
    // Schedule Editing State
    const [newSchedule, setNewSchedule] = useState<VenueSchedule>({
        activityId: '', activityName: '', building: '', floor: '', room: '', date: '', timeRange: '', note: ''
    });

    React.useEffect(() => {
        if (venue) setFormData(venue);
        else setFormData({ name: '', description: '', locationUrl: '', imageUrl: '', facilities: [], contactInfo: '', scheduledActivities: [] });
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

    // --- Schedule Logic ---
    const addSchedule = () => {
        if (!newSchedule.activityId || !newSchedule.date) {
            alert('กรุณาเลือกรายการแข่งขันและระบุวันที่');
            return;
        }
        const activityName = activities.find(a => a.id === newSchedule.activityId)?.name || newSchedule.activityId;
        const entry = { ...newSchedule, activityName };
        const updatedList = [...(formData.scheduledActivities || []), entry];
        handleChange('scheduledActivities', updatedList);
        // Reset form
        setNewSchedule({ activityId: '', activityName: '', building: '', floor: '', room: '', date: '', timeRange: '', note: '' });
    };

    const removeSchedule = (index: number) => {
        const updatedList = [...(formData.scheduledActivities || [])];
        updatedList.splice(index, 1);
        handleChange('scheduledActivities', updatedList);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">{venue ? 'แก้ไขสนามแข่งขัน' : 'เพิ่มสนามแข่งขัน'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพ URL</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.imageUrl} onChange={e => handleChange('imageUrl', e.target.value)} placeholder="https://..." />
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
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-blue-600" /> ตารางการใช้สนาม (Schedule Mapping)
                        </h4>
                        
                        {/* Add Form */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3 mb-4">
                            <label className="text-xs font-bold text-blue-800 uppercase">เพิ่มกิจกรรม</label>
                            <SearchableSelect 
                                options={activities.map(a => ({ label: a.name, value: a.id }))}
                                value={newSchedule.activityId}
                                onChange={(val) => setNewSchedule(prev => ({ ...prev, activityId: val }))}
                                placeholder="-- ค้นหาและเลือกรายการแข่งขัน --"
                                icon={<Search className="w-4 h-4"/>}
                            />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <input className="border rounded px-2 py-1.5 text-xs" placeholder="ตึก/อาคาร (เช่น อาคาร 1)" value={newSchedule.building} onChange={e => setNewSchedule(prev => ({...prev, building: e.target.value}))} />
                                <input className="border rounded px-2 py-1.5 text-xs" placeholder="ชั้น (เช่น ชั้น 2)" value={newSchedule.floor} onChange={e => setNewSchedule(prev => ({...prev, floor: e.target.value}))} />
                                <input className="border rounded px-2 py-1.5 text-xs" placeholder="ห้อง (เช่น ห้อง 202)" value={newSchedule.room} onChange={e => setNewSchedule(prev => ({...prev, room: e.target.value}))} />
                                <input className="border rounded px-2 py-1.5 text-xs" type="date" value={newSchedule.date} onChange={e => setNewSchedule(prev => ({...prev, date: e.target.value}))} />
                            </div>
                            <div className="flex gap-2">
                                <input className="flex-1 border rounded px-2 py-1.5 text-xs" placeholder="เวลา (เช่น 09:00 - 12:00)" value={newSchedule.timeRange} onChange={e => setNewSchedule(prev => ({...prev, timeRange: e.target.value}))} />
                                <input className="flex-[2] border rounded px-2 py-1.5 text-xs" placeholder="หมายเหตุ (ถ้ามี)" value={newSchedule.note} onChange={e => setNewSchedule(prev => ({...prev, note: e.target.value}))} />
                                <button onClick={addSchedule} className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">เพิ่ม</button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-2">
                            {formData.scheduledActivities?.map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors shadow-sm">
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{item.activityName}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                                            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {item.building} {item.floor} {item.room}</span>
                                            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {item.date}</span>
                                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {item.timeRange}</span>
                                        </div>
                                        {item.note && <div className="text-xs text-orange-600 mt-1 bg-orange-50 inline-block px-1 rounded">{item.note}</div>}
                                    </div>
                                    <button onClick={() => removeSchedule(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            ))}
                            {(!formData.scheduledActivities || formData.scheduledActivities.length === 0) && (
                                <div className="text-center py-4 text-gray-400 text-xs italic">ยังไม่มีกิจกรรมที่กำหนด</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    {venue ? (
                        <button onClick={() => onDelete(venue.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center">
                            <Trash2 className="w-4 h-4 mr-2"/> ลบสนาม
                        </button>
                    ) : <div></div>}
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-200 rounded-lg">ยกเลิก</button>
                        <button onClick={() => onSave(formData as Venue)} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center">
                            <Save className="w-4 h-4 mr-2" /> บันทึกข้อมูล
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
  
  // Local state for optimistic updates
  const [localVenues, setLocalVenues] = useState<Venue[]>(data.venues || []);

  const isAdmin = user?.level === 'admin' || user?.level === 'area';

  const handleEdit = (v: Venue) => {
      setEditingVenue(v);
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      setEditingVenue(null);
      setIsModalOpen(true);
  };

  const handleSave = async (venueData: Venue) => {
      // Optimistic Update
      let updatedList = [];
      if (editingVenue) {
          updatedList = localVenues.map(v => v.id === venueData.id ? venueData : v);
      } else {
          const newVenue = { ...venueData, id: `V${Date.now()}` };
          updatedList = [...localVenues, newVenue];
      }
      setLocalVenues(updatedList);
      setIsModalOpen(false);

      // Call API
      const success = await saveVenue(venueData);
      if (!success) {
          alert('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
          // Revert would happen here in a real app or just refresh data
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('คุณต้องการลบสนามนี้ใช่หรือไม่?')) return;
      
      setLocalVenues(prev => prev.filter(v => v.id !== id));
      setIsModalOpen(false);
      
      await deleteVenue(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center font-kanit">
                    <MapPin className="w-6 h-6 mr-2 text-blue-600" />
                    สนามแข่งขันและกำหนดการ (Venues & Schedule)
                </h2>
                <p className="text-gray-500 text-sm mt-1">ข้อมูลสถานที่ อาคาร ห้องสอบ และเวลาแข่งขัน</p>
            </div>
            {isAdmin && (
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
                        isAdmin={isAdmin} 
                        onEdit={handleEdit} 
                    />
                ))
            ) : (
                <div className="col-span-full py-16 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">ยังไม่มีข้อมูลสนามแข่งขัน</h3>
                    <p className="text-gray-500 text-sm mt-1">ผู้ดูแลระบบสามารถเพิ่มข้อมูลได้ที่ปุ่มด้านบน</p>
                </div>
            )}
        </div>

        {/* Edit Modal */}
        <VenueModal 
            isOpen={isModalOpen} 
            venue={editingVenue} 
            activities={data.activities}
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSave} 
            onDelete={handleDelete}
        />
    </div>
  );
};

export default VenuesView;
