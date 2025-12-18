
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, Announcement, User, AreaStageInfo, Team, Venue, Activity as ActivityType, Comment } from '../types';
// Fixed: Added Crown to lucide-react imports
import { Users, School, Trophy, Megaphone, Plus, Book, Calendar, ChevronRight, FileText, Loader2, Star, Medal, TrendingUp, Activity, Timer, ArrowUpRight, Zap, Target, CheckCircle, PieChart as PieIcon, List, X, BarChart3, MapPin, Navigation, Handshake, Briefcase, UserX, GraduationCap, AlertTriangle, Clock, Heart, Share2, Download, Image as ImageIcon, ExternalLink, UserCheck, AlertOctagon, PlayCircle, ChevronDown, ChevronUp, MessageCircle, Send, ShieldCheck, RefreshCw, Crown } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import StatCard from './StatCard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addAnnouncement, toggleLikeAnnouncement, addComment } from '../services/api';
import { formatDeadline } from '../services/utils';
import { shareAnnouncement } from '../services/liff';

interface DashboardProps {
  data: AppData;
  user?: User | null;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];
const MEDAL_COLORS = { 'Gold': '#FFD700', 'Silver': '#C0C0C0', 'Bronze': '#CD7F32', 'Participant': '#94a3b8' };

// --- Helper for Image URL ---
const getAttachmentImageUrl = (att: { url: string, id?: string }) => {
    if (att.id) return `https://drive.google.com/thumbnail?id=${att.id}&sz=w1000`;
    if (att.url.includes('drive.google.com')) {
        const match = att.url.match(/id=([^&]+)/) || att.url.match(/\/d\/([^/]+)/);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    return att.url;
};

// --- Helper for Video Embed ---
const getVideoEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return null;
};

const getUserAvatar = (id: string, name?: string) => {
    const seed = name || id;
    return `https://ui-avatars.com/api/?name=${seed}&background=random&color=fff&size=64`;
};

const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { question: `${num1} + ${num2} = ?`, answer: num1 + num2 };
};

// --- Components ---

const AnnouncementDetailModal = ({ item, user, onClose, onUpdate }: { item: Announcement, user?: User | null, onClose: () => void, onUpdate?: (updatedItem: Announcement) => void }) => {
    const coverAttachment = item.attachments?.find(att => att.type.includes('image'));
    const coverImage = coverAttachment ? getAttachmentImageUrl(coverAttachment) : null;
    const videoEmbedUrl = item.link ? getVideoEmbedUrl(item.link) : null;
    
    const [likedBy, setLikedBy] = useState<string[]>(item.likedBy || []);
    const isLiked = user && likedBy.includes(user.userid);
    const totalLikes = likedBy.length;
    
    const [comments, setComments] = useState<Comment[]>(item.comments || []);
    const [commentInput, setCommentInput] = useState('');
    const [captcha, setCaptcha] = useState(generateCaptcha());
    const [captchaInput, setCaptchaInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const commentsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (commentsEndRef.current) commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const handleLike = async () => {
        if (!user) return;
        const newLikedBy = isLiked ? likedBy.filter(id => id !== user.userid) : [...likedBy, user.userid];
        setLikedBy(newLikedBy);
        if (onUpdate) onUpdate({ ...item, likedBy: newLikedBy });
        await toggleLikeAnnouncement(item.id, user.userid);
    };

    const handleShare = async () => {
        try {
            const result = await shareAnnouncement(item.id, item.title, item.content, item.type, item.date, coverImage, item.link || '');
            if (result.success && result.method === 'copy') alert('คัดลอกลิงก์เรียบร้อยแล้ว');
        } catch (err) { console.error(err); }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { alert('กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น'); return; }
        if (!commentInput.trim()) return;
        if (parseInt(captchaInput) !== captcha.answer) {
            alert('คำตอบป้องกันสแปมไม่ถูกต้อง');
            setCaptcha(generateCaptcha());
            setCaptchaInput('');
            return;
        }
        setIsSubmitting(true);
        const newComment: Comment = {
            id: Date.now().toString(),
            userId: user.userid,
            userName: user.displayName || user.name || 'User',
            userAvatar: user.pictureUrl,
            content: commentInput,
            timestamp: new Date().toISOString()
        };
        const res = await addComment(item.id, newComment);
        setIsSubmitting(false);
        if (res.status === 'success' && res.comments) {
            setComments(res.comments);
            setCommentInput('');
            setCaptchaInput('');
            setCaptcha(generateCaptcha());
            if (onUpdate) onUpdate({ ...item, comments: res.comments });
        } else alert('ไม่สามารถส่งคอมเมนต์ได้');
    };

    const refreshCaptcha = () => { setCaptcha(generateCaptcha()); setCaptchaInput(''); };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                    <div className="pr-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase mb-2 inline-block ${item.type === 'news' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                            {item.type === 'news' ? 'NEWS' : 'MANUAL'}
                        </span>
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(item.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                            <span className="mx-2">•</span>
                            <span>{item.author || 'Admin'}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="overflow-y-auto p-0 flex-1">
                    {videoEmbedUrl ? (
                        <div className="w-full aspect-video bg-black relative">
                            <iframe src={videoEmbedUrl} className="w-full h-full" frameBorder="0" allowFullScreen title="Video Player"></iframe>
                        </div>
                    ) : coverImage && (
                        <div className="w-full h-64 bg-gray-100 relative">
                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="p-6 space-y-6">
                        <div className="prose prose-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.content}</div>
                        {item.attachments && item.attachments.length > 0 && (
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">เอกสารแนบ ({item.attachments.length})</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {item.attachments.map((att, idx) => (
                                        <a key={idx} href={att.url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white mr-3 text-gray-500 group-hover:text-blue-600 border border-gray-200">
                                                {att.type.includes('image') ? <ImageIcon className="w-5 h-5"/> : <FileText className="w-5 h-5"/>}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate" title={att.name}>{att.name}</div>
                                                <div className="text-[10px] text-gray-500 uppercase">{att.type.split('/')[1] || 'FILE'}</div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike} disabled={!user} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} disabled:opacity-50`}>
                                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                                    {totalLikes > 0 ? totalLikes : 'Like'}
                                </button>
                                <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                                    <MessageCircle className="w-5 h-5" /> Comment
                                </button>
                            </div>
                            <button onClick={handleShare} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                                <Share2 className="w-5 h-5" /> Share
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 mt-4">
                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                                <MessageCircle className="w-4 h-4 mr-2" /> ความคิดเห็น ({comments.length})
                            </h4>
                            <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-1">
                                {comments.length > 0 ? comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <img src={comment.userAvatar || getUserAvatar(comment.userId, comment.userName)} className="w-8 h-8 rounded-full bg-white border border-gray-200 object-cover shrink-0" alt={comment.userName}/>
                                        <div className="flex-1">
                                            <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm rounded-tl-none">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="text-xs font-bold text-gray-900">{comment.userName}</span>
                                                    <span className="text-[9px] text-gray-400">{new Date(comment.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-xs text-gray-700">{comment.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="text-center text-gray-400 text-xs py-2 italic">ยังไม่มีความคิดเห็น</div>}
                                <div ref={commentsEndRef} />
                            </div>
                            {user ? (
                                <form onSubmit={handleSubmitComment} className="border-t border-gray-200 pt-3">
                                    <div className="flex gap-3 items-start">
                                        <img src={user.pictureUrl || getUserAvatar(user.userid, user.displayName)} className="w-8 h-8 rounded-full border border-gray-200 object-cover hidden sm:block" alt="Me"/>
                                        <div className="flex-1 space-y-2">
                                            <textarea id="comment-input" className="w-full border border-gray-300 rounded-lg p-2 text-sm font-kanit focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20" placeholder="เขียนความคิดเห็น..." value={commentInput} onChange={(e) => setCommentInput(e.target.value)}/>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1">
                                                    <ShieldCheck className="w-4 h-4 text-green-500 mr-2" />
                                                    <span className="text-xs font-mono font-bold mr-2 text-gray-600 select-none">{captcha.question}</span>
                                                    <input type="number" className="w-12 text-center border-l border-gray-200 text-xs focus:outline-none" placeholder="?" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)}/>
                                                    <button type="button" onClick={refreshCaptcha} className="ml-2 text-gray-400 hover:text-gray-600"><RefreshCw className="w-3 h-3" /></button>
                                                </div>
                                                <button type="submit" disabled={!commentInput.trim() || !captchaInput || isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center disabled:opacity-50 transition-colors">
                                                    {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />} ส่ง
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            ) : <div className="text-center bg-gray-100 p-3 rounded-lg border border-gray-200"><p className="text-xs text-gray-500 mb-2">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p></div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface NewsCardProps {
    item: Announcement;
    user?: User | null;
    onLike: (id: string) => void;
    onClick: () => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, user, onLike, onClick }) => {
    const isLiked = item.likedBy?.includes(user?.userid || 'anon');
    const likeCount = item.likedBy?.length || 0;
    const commentCount = item.comments?.length || 0;
    const coverAttachment = item.attachments?.find(att => att.type.includes('image'));
    const coverImage = coverAttachment ? getAttachmentImageUrl(coverAttachment) : null;
    const hasAttachments = item.attachments && item.attachments.length > 0;
    const isVideo = item.link && getVideoEmbedUrl(item.link);

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const result = await shareAnnouncement(item.id, item.title, item.content, item.type, item.date, coverImage, item.link || '');
            if (result.success && result.method === 'copy') alert('คัดลอกลิงก์ข่าวประชาสัมพันธ์แล้ว');
        } catch (err) { console.error(err); }
    };

    return (
        <div onClick={onClick} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col h-full">
            {coverImage ? (
                <div className="h-40 w-full overflow-hidden relative shrink-0">
                    <img src={coverImage} alt="cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/80"><PlayCircle className="w-8 h-8 text-white ml-1" /></div>
                        </div>
                    )}
                </div>
            ) : isVideo ? (
                <div className="h-40 w-full bg-slate-900 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-800 transition-colors shrink-0">
                     <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                     <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20"><PlayCircle className="w-8 h-8 text-white ml-1" /></div>
                </div>
            ) : null}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(item.date).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}</span>
                        {item.clusterId && item.clusterId !== 'area' && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">ระดับกลุ่มฯ</span>}
                    </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-3 mb-3 flex-1">{item.content}</p>
                {hasAttachments && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.attachments?.slice(0, 2).map((att, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-600">
                                {att.type.includes('image') ? <ImageIcon className="w-3 h-3 mr-1"/> : <FileText className="w-3 h-3 mr-1"/>}
                                {att.name.length > 10 ? att.name.substring(0, 10) + '...' : att.name}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                    <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); user && onLike(item.id); }} className={`flex items-center text-xs transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`} disabled={!user}>
                            <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />{likeCount}
                        </button>
                        <div className="flex items-center text-xs text-gray-400"><MessageCircle className="w-4 h-4 mr-1" />{commentCount}</div>
                        <button onClick={handleShare} className="text-gray-400 hover:text-blue-500 transition-colors"><Share2 className="w-4 h-4" /></button>
                    </div>
                    <span className="text-xs text-blue-600 font-bold hover:underline flex items-center">{isVideo ? 'ดูวิดีโอ' : 'อ่านรายละเอียด'} &rarr;</span>
                </div>
            </div>
        </div>
    );
};

const CountdownWidget = ({ data }: { data: AppData }) => {
    const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [eventLabel, setEventLabel] = useState<string>('ยังไม่มีกำหนดการ');

    useEffect(() => {
        let earliest: number | null = null;
        let foundLabel = 'ยังไม่มีกำหนดการ';
        data.venues.forEach(v => {
            v.scheduledActivities?.forEach(s => {
                if (s.date) {
                    const d = new Date(s.date);
                    if (!isNaN(d.getTime())) {
                        const time = d.getTime();
                        if (time > Date.now()) {
                             if (earliest === null || time < earliest) {
                                 earliest = time;
                                 foundLabel = s.activityName || 'การแข่งขัน';
                             }
                        }
                    }
                }
            });
        });
        if (earliest) { setTargetDate(new Date(earliest)); setEventLabel('เริ่มการแข่งขันแรก'); }
        else { setTargetDate(null); setEventLabel('สิ้นสุดการแข่งขัน'); }
    }, [data]);

    useEffect(() => {
        if (!targetDate) return;
        const timer = setInterval(() => {
            const difference = targetDate.getTime() - new Date().getTime();
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else { setTimeLeft(null); setEventLabel('กำลังแข่งขัน'); }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    const renderTime = () => {
        if (!targetDate) return <span className="text-sm font-bold opacity-80">รอประกาศกำหนดการ</span>;
        if (!timeLeft) return <span className="text-sm font-bold animate-pulse text-yellow-200">✨ ถึงเวลาแข่งขันแล้ว! ✨</span>;
        return (
            <div className="flex gap-2 text-center">
                {Object.entries(timeLeft).map(([unit, value]: [string, any]) => (
                    <div key={unit} className="flex flex-col items-center bg-white/20 rounded p-1.5 min-w-[40px]">
                        <span className="font-mono text-xl font-bold leading-none">{value}</span>
                        <span className="text-[9px] uppercase opacity-80">{unit}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white shadow-md relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Clock className="w-24 h-24" /></div>
            <div className="relative z-10 flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-2 flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {eventLabel}</h3>
                {renderTime()}
                {targetDate && <div className="mt-2 text-xs opacity-90 bg-black/10 px-2 py-0.5 rounded-full">{targetDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: '2-digit'})}</div>}
            </div>
        </div>
    );
};

const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse p-4">
        <div className="h-48 bg-gray-200 rounded-3xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl"></div>
            <div className="space-y-6">
                <div className="h-40 bg-gray-200 rounded-2xl"></div>
                <div className="h-40 bg-gray-200 rounded-2xl"></div>
                <div className="h-40 bg-gray-200 rounded-2xl"></div>
            </div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ data, user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('area');
  const [isLoading, setIsLoading] = useState(true);
  
  const [showUnscoredModal, setShowUnscoredModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const [showCooperationModal, setShowCooperationModal] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [newsList, setNewsList] = useState<Announcement[]>([]);
  const [newsLimit, setNewsLimit] = useState(6);
  const [manualList, setManualList] = useState<Announcement[]>([]);
  const [manualLimit, setManualLimit] = useState(5);

  useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      if (!data.announcements) return;
      const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
      const userClusterID = userSchool?.SchoolCluster;
      const filterNews = (type: 'news' | 'manual') => {
          return data.announcements.filter(a => {
              if (a.type !== type) return false;
              if (!a.clusterId || a.clusterId === 'area') return true;
              if (userClusterID && a.clusterId === userClusterID) return true;
              if (user?.level === 'admin' || user?.level === 'area') return true;
              return false;
          });
      };
      setNewsList(filterNews('news'));
      setManualList(filterNews('manual'));
  }, [data.announcements, user, data.schools]);

  useEffect(() => {
      const annId = searchParams.get('announcementId');
      if (annId && data.announcements) {
          const found = data.announcements.find(a => a.id === annId);
          if (found) setViewingAnnouncement(found);
      }
  }, [searchParams, data.announcements]);

  const handleLikeNews = async (id: string) => {
      if (!user) return;
      const updateList = (list: Announcement[]) => list.map(item => {
          if (item.id === id) {
              const likedBy = item.likedBy || [];
              const isLiked = likedBy.includes(user.userid);
              return { ...item, likedBy: isLiked ? likedBy.filter(uid => uid !== user.userid) : [...likedBy, user.userid] };
          }
          return item;
      });
      setNewsList(prev => updateList(prev));
      await toggleLikeAnnouncement(id, user.userid);
  };

  const handleAnnouncementUpdate = (updated: Announcement) => {
      setViewingAnnouncement(updated);
      setNewsList(prev => prev.map(item => item.id === updated.id ? updated : item));
      setManualList(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const getAreaInfo = (team: any): AreaStageInfo | null => {
      try { return JSON.parse(team.stageInfo); } catch { return null; }
  };

  const calculateMedalFromScore = (score: number) => {
      if (score >= 80) return 'Gold';
      if (score >= 70) return 'Silver';
      if (score >= 60) return 'Bronze';
      return 'Participant';
  };

  // --- Data Filtering & Processing ---

  // 1. Filter Teams by View Level
  const scopeTeams = useMemo(() => {
      if (viewLevel === 'area') {
          return data.teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }
      return data.teams;
  }, [data.teams, viewLevel]);

  // 2. Statistics Overview & Charts
  const { stats, medalChartData, categoryChartData } = useMemo(() => {
      const totalTeams = scopeTeams.length;
      const schools = new Set(scopeTeams.map(t => t.schoolId)).size;
      const activities = new Set(scopeTeams.map(t => t.activityId)).size;
      
      let scoredCount = 0;
      let goldCount = 0;
      const medalCounts: Record<string, number> = { 'Gold': 0, 'Silver': 0, 'Bronze': 0, 'Participant': 0 };
      const catCounts: Record<string, number> = {};

      scopeTeams.forEach(t => {
          let score = 0;
          let medal = '';
          if (viewLevel === 'area') {
              const info = getAreaInfo(t);
              score = info?.score || 0;
              medal = info?.medal || calculateMedalFromScore(score);
          } else {
              score = t.score;
              medal = t.medalOverride || calculateMedalFromScore(score);
          }
          if (score > 0) {
              scoredCount++;
              if (medal.includes('Gold')) medalCounts['Gold']++;
              else if (medal.includes('Silver')) medalCounts['Silver']++;
              else if (medal.includes('Bronze')) medalCounts['Bronze']++;
              else medalCounts['Participant']++;
          }
          if (score >= 80) goldCount++;
          const activity = data.activities.find(a => a.id === t.activityId);
          if (activity) catCounts[activity.category] = (catCounts[activity.category] || 0) + 1;
      });

      const progress = totalTeams > 0 ? Math.round((scoredCount / totalTeams) * 100) : 0;
      const medalChart = Object.keys(medalCounts).map(key => ({ name: key, value: medalCounts[key] }));
      const categoryChart = Object.keys(catCounts)
          .map(key => ({ name: key, value: catCounts[key] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); 

      return { 
          stats: { totalTeams, schools, activities, progress, goldCount, scoredCount },
          medalChartData: medalChart,
          categoryChartData: categoryChart
      };
  }, [scopeTeams, viewLevel, data.activities]);

  // 3. Leaderboards Logic 
  const leaderboards = useMemo(() => {
      const schoolStats: Record<string, { name: string, totalEntries: number, qualifiedCount: number, totalScore: number, goldCount: number }> = {};

      scopeTeams.forEach(t => {
          const schoolObj = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          const sName = schoolObj?.SchoolName || t.schoolId;
          if (!schoolStats[sName]) schoolStats[sName] = { name: sName, totalEntries: 0, qualifiedCount: 0, totalScore: 0, goldCount: 0 };
          schoolStats[sName].totalEntries++;

          let score = 0;
          let rank = '';
          if (viewLevel === 'area') {
              const info = getAreaInfo(t);
              score = info?.score || 0;
              rank = info?.rank || '';
          } else {
              score = t.score;
              rank = t.rank;
          }

          // MODIFIED: Winner/Qualified Check based on view scope
          // ในระดับเขต: นับเฉพาะที่ได้ Rank 1
          // ในระดับกลุ่ม: นับเฉพาะ Rank 1 และเครื่องหมาย Q (flag)
          const isWinner = viewLevel === 'area' 
            ? (String(rank) === '1') 
            : (String(t.rank) === '1' && String(t.flag).toUpperCase() === 'TRUE');

          if (isWinner) schoolStats[sName].qualifiedCount++;

          if (score > 0) schoolStats[sName].totalScore += score;
          if (score >= 80) schoolStats[sName].goldCount++;
      });

      const schoolsArray = Object.values(schoolStats);
      // Fixed: Property 'gold' does not exist on type, changed to 'goldCount'
      const fullSuccessRate = [...schoolsArray]
          .map(s => ({ ...s, rate: s.totalEntries > 0 ? (s.qualifiedCount / s.totalEntries) * 100 : 0 }))
          .sort((a, b) => b.qualifiedCount - a.qualifiedCount || b.goldCount - a.goldCount || b.totalScore - a.totalScore);

      const topBySuccessRate = fullSuccessRate.slice(0, 5);
      const topByScore = [...schoolsArray].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);
      const topByGold = [...schoolsArray].sort((a, b) => b.goldCount - a.goldCount || b.totalScore - a.totalScore).slice(0, 5);
      return { topBySuccessRate, topByScore, topByGold, fullSuccessRate, allSchoolStats: schoolsArray };
  }, [scopeTeams, viewLevel, data.schools]);

  // 4. My School Performance Logic
  const mySchoolStats = useMemo(() => {
      if (!user || user.level === 'admin' || user.level === 'area') return null;
      const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
      const schoolName = userSchool?.SchoolName;
      if (!schoolName) return null;
      const myStats = leaderboards.allSchoolStats.find(s => s.name === schoolName);
      if (!myStats) return { name: schoolName, totalEntries: 0, goldCount: 0, qualifiedCount: 0, rank: '-' };
      const sortedByScore = [...leaderboards.allSchoolStats].sort((a, b) => b.totalScore - a.totalScore);
      const rank = sortedByScore.findIndex(s => s.name === schoolName) + 1;
      return { ...myStats, rank };
  }, [user, leaderboards.allSchoolStats, data.schools]);

  // 5. Data Integrity Logic 
  const integrityStats = useMemo(() => {
      interface ProblemItem { id: string; title: string; subtitle: string; issues: string[]; }
      let targetTeams = scopeTeams;
      if (user?.level === 'school_admin') targetTeams = scopeTeams.filter(t => t.schoolId === user.SchoolID);
      else if (user?.level === 'user') targetTeams = scopeTeams.filter(t => t.createdBy === user.userid);
      let missingTeachersCount = 0; let missingStudentsCount = 0; let missingJudgesCount = 0; let pendingStatus = 0;
      const problemItems: ProblemItem[] = [];
      targetTeams.forEach(t => {
          if (t.status === 'Rejected') return;
          if (t.status === 'Pending') pendingStatus++;
          const activity = data.activities.find(a => a.id === t.activityId);
          if (!activity) return;
          let teachersCount = 0; let studentsCount = 0;
          try {
              let raw = t.members;
              if (viewLevel === 'area') { const info = getAreaInfo(t); if (info?.members) raw = info.members; }
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (Array.isArray(parsed)) studentsCount = parsed.length;
              else if (parsed && typeof parsed === 'object') {
                  teachersCount = Array.isArray(parsed.teachers) ? parsed.teachers.length : 0;
                  studentsCount = Array.isArray(parsed.students) ? parsed.students.length : 0;
              }
          } catch {}
          const issues = [];
          if (activity.reqTeachers > 0 && teachersCount < activity.reqTeachers) { missingTeachersCount++; issues.push(`ขาดครู ${activity.reqTeachers - teachersCount} คน`); }
          if (activity.reqStudents > 0 && studentsCount < activity.reqStudents) { missingStudentsCount++; issues.push(`ขาด นร. ${activity.reqStudents - studentsCount} คน`); }
          if (issues.length > 0) {
              const schoolName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
              problemItems.push({ id: t.teamId, title: t.teamName + ` (${activity.name})`, subtitle: schoolName, issues });
          }
      });
      const activeActivityIds = new Set(targetTeams.map(t => t.activityId));
      activeActivityIds.forEach(actId => {
          const act = data.activities.find(a => a.id === actId); if (!act) return;
          const hasJudge = data.judges.some(j => {
              if (j.activityId !== actId) return false;
              if (viewLevel === 'area') return j.stageScope === 'area';
              if (user?.level === 'group_admin') {
                  const userSchool = data.schools.find(s => s.SchoolID === user.SchoolID);
                  return j.clusterKey === userSchool?.SchoolCluster && j.stageScope !== 'area';
              }
              return j.stageScope !== 'area';
          });
          if (!hasJudge) { missingJudgesCount++; problemItems.push({ id: `miss_judge_${act.id}`, title: act.name, subtitle: 'กิจกรรม (Activity)', issues: ['ยังไม่มีกรรมการตัดสิน'] }); }
      });
      return { missingTeachersCount, missingStudentsCount, missingJudgesCount, pendingStatus, totalIssues: missingTeachersCount + missingStudentsCount + missingJudgesCount, problemItems };
  }, [scopeTeams, data.activities, data.judges, viewLevel, user, data.schools]);

  // 6. Judge Cooperation Stats 
  const { judgeCooperationStats, fullJudgeCooperation } = useMemo(() => {
      const stats: Record<string, { name: string, count: number }> = {};
      data.judges.forEach(j => {
          const isArea = j.stageScope === 'area';
          if (viewLevel === 'area' && !isArea) return;
          if (viewLevel === 'cluster' && isArea) return;
          if (j.schoolId === '__EXTERNAL__') return;
          const schoolName = j.schoolName || 'Unknown';
          if (!stats[schoolName]) stats[schoolName] = { name: schoolName, count: 0 };
          stats[schoolName].count++;
      });
      const fullList = Object.values(stats).sort((a, b) => b.count - a.count);
      return { fullJudgeCooperation: fullList, judgeCooperationStats: fullList.slice(0, 5) };
  }, [data.judges, viewLevel]);

  const unscoredTeams = useMemo(() => {
      return scopeTeams.filter(t => {
          if (viewLevel === 'area') {
              const info = getAreaInfo(t);
              return !info || !info.score || info.score === 0;
          }
          return t.score === 0;
      });
  }, [scopeTeams, viewLevel]);

  const latestResults = useMemo(() => {
      const scored = scopeTeams.filter(t => {
          if (viewLevel === 'area') { const info = getAreaInfo(t); return (info?.score || 0) > 0; }
          return t.score > 0;
      });
      return scored.sort((a, b) => {
          const dateA = a.lastEditedAt ? new Date(a.lastEditedAt).getTime() : 0;
          const dateB = b.lastEditedAt ? new Date(b.lastEditedAt).getTime() : 0;
          return dateB - dateA;
      }).slice(0, 3);
  }, [scopeTeams, viewLevel]);

  const venueHighlights = useMemo(() => data.venues.slice(0, 3), [data.venues]);
  const isAdmin = user?.level === 'admin' || user?.level === 'area';

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {viewingAnnouncement && <AnnouncementDetailModal item={viewingAnnouncement} user={user} onClose={() => { setViewingAnnouncement(null); setSearchParams({}); }} onUpdate={handleAnnouncementUpdate} />}

      <div className={`rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden ${viewLevel === 'area' ? 'bg-gradient-to-r from-purple-800 to-indigo-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10">{viewLevel === 'area' ? <Trophy className="w-40 h-40" /> : <School className="w-40 h-40" />}</div>
        <div className="relative z-10 text-center md:text-left">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white mb-2 border border-white/30">{viewLevel === 'area' ? '🏆 District Level' : '🏫 Cluster Level'}</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{viewLevel === 'area' ? 'สรุปผลระดับเขตพื้นที่' : 'สรุปผลระดับกลุ่มเครือข่าย'}</h1>
            <p className="text-white/80 text-sm">{viewLevel === 'area' ? 'ติดตามตารางสรุปเหรียญและคะแนนรวม' : 'ติดตามสถานะการคัดเลือกตัวแทนเข้าสู่ระดับเขต'}</p>
        </div>
        <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-md flex relative z-10 border border-white/20">
            <button onClick={() => setViewLevel('cluster')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-white/80 hover:bg-white/10'}`}><School className="w-4 h-4 mr-2"/> ระดับกลุ่มฯ</button>
            <button onClick={() => setViewLevel('area')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'}`}><Trophy className="w-4 h-4 mr-2"/> ระดับเขตฯ</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-bold uppercase">{viewLevel === 'area' ? 'ทีมเข้ารอบเขต' : 'ทีมสมัครทั้งหมด'}</span>
                  <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-gray-800">{stats.totalTeams}</div>
          </div>
          <div onClick={() => setShowUnscoredModal(true)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group relative overflow-hidden">
             <div className="flex justify-between items-center mb-1"><span className="text-xs text-gray-500 font-bold uppercase flex items-center group-hover:text-blue-600"><Target className="w-3 h-3 mr-1"/> ความคืบหน้า</span><span className="text-lg font-black text-green-600">{stats.progress}%</span></div>
             <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div className="bg-green-500 h-full transition-all duration-1000" style={{width: `${stats.progress}%`}}></div></div>
             <div className="text-[10px] text-gray-400 mt-1 text-right group-hover:text-blue-500 font-medium">เหลือ {unscoredTeams.length} ทีม (คลิกดู)</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-2xl shadow-sm border border-amber-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2"><span className="text-xs text-amber-600 font-bold uppercase">เหรียญทอง</span><Medal className="w-4 h-4 text-amber-500" /></div>
              <div className="text-2xl font-black text-amber-700">{stats.goldCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500 font-bold uppercase">{viewLevel === 'area' ? 'ชนะเลิศ (ที่ 1)' : 'ตัวแทนไปต่อ'}</span><CheckCircle className="w-4 h-4 text-green-500" /></div>
              <div className="text-2xl font-black text-gray-800">{leaderboards.allSchoolStats.reduce((sum, s) => sum + s.qualifiedCount, 0)}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              {mySchoolStats && (
                  <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><School className="w-32 h-32 text-blue-600" /></div>
                      <div className="p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center shrink-0 border-2 border-blue-100 shadow-sm"><School className="w-8 h-8 text-blue-600" /></div>
                          <div className="flex-1 text-center sm:text-left z-10">
                              <h2 className="text-lg font-bold text-gray-900">{mySchoolStats.name}</h2>
                              <p className="text-xs text-gray-500 mb-3">สรุปผลงานโรงเรียนของคุณ ({viewLevel === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})</p>
                              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                                  <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100"><div className="text-xs text-gray-500 font-bold uppercase">รายการที่แข่ง</div><div className="text-xl font-black text-gray-800">{mySchoolStats.totalEntries} <span className="text-[10px] font-normal">ทีม</span></div></div>
                                  <div className="bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-100"><div className="text-xs text-yellow-700 font-bold uppercase">เหรียญทอง</div><div className="text-xl font-black text-yellow-600">{mySchoolStats.goldCount} <span className="text-[10px] font-normal">เหรียญ</span></div></div>
                                  <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-100"><div className="text-xs text-blue-700 font-bold uppercase">{viewLevel === 'area' ? 'ชนะเลิศ (ที่ 1)' : 'ตัวแทนไปต่อ'}</div><div className="text-xl font-black text-blue-600">{mySchoolStats.qualifiedCount} <span className="text-[10px] font-normal">รายการ</span></div></div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {viewLevel === 'area' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col items-center">
                          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center w-full"><PieIcon className="w-4 h-4 mr-2 text-purple-500" /> สรุปเหรียญรางวัล</h3>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={medalChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {medalChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={MEDAL_COLORS[entry.name as keyof typeof MEDAL_COLORS] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip /><Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                          </div>
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col">
                          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center"><BarChart3 className="w-4 h-4 mr-2 text-blue-500" /> หมวดหมู่ยอดนิยม (Top 5)</h3>
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={80} tick={{fontSize: 10}} /><Tooltip cursor={{fill: 'transparent'}} /><Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                          <div><h2 className="font-bold text-gray-800 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-blue-600" /> 5 อันดับโรงเรียนที่มีตัวแทนระดับเขตมากที่สุด</h2><p className="text-xs text-gray-500 mt-0.5">เรียงลำดับจากจำนวนทีมที่ได้ไปต่อระดับเขต</p></div>
                          <button onClick={() => setShowRankingModal(true)} className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-sm">ดูทั้งหมด</button>
                      </div>
                      <div className="p-0">
                          {leaderboards.topBySuccessRate.length > 0 ? (
                              <table className="w-full">
                                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium"><tr><th className="px-4 py-3 text-left w-12">#</th><th className="px-4 py-3 text-left">โรงเรียน</th><th className="px-4 py-3 text-center">ส่งแข่ง</th><th className="px-4 py-3 text-center text-blue-600">ตัวแทน</th><th className="px-4 py-3 text-right">อัตราส่วน</th></tr></thead>
                                  <tbody className="divide-y divide-gray-50 text-sm">
                                      {leaderboards.topBySuccessRate.map((school, idx) => (
                                          <tr key={idx} className="hover:bg-gray-50/50">
                                              <td className="px-4 py-3 text-center font-bold text-gray-400">{idx + 1}</td>
                                              <td className="px-4 py-3 font-medium text-gray-800">{school.name}</td>
                                              <td className="px-4 py-3 text-center text-gray-500">{school.totalEntries}</td>
                                              <td className="px-4 py-3 text-center font-bold text-blue-600">{school.qualifiedCount}</td>
                                              <td className="px-4 py-3 text-right"><span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{school.rate.toFixed(1)}%</span></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          ) : <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีข้อมูลการตัดสิน</div>}
                      </div>
                  </div>
              )}

              {viewLevel === 'area' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-purple-50/50">
                          <div><h2 className="font-bold text-purple-900 flex items-center"><Crown className="w-5 h-5 mr-2 text-yellow-500" /> 5 อันดับโรงเรียนยอดเยี่ยม (ชนะเลิศระดับเขต)</h2><p className="text-xs text-purple-600 mt-0.5">เรียงลำดับจากจำนวนกิจกรรมที่ได้ลำดับที่ 1 (ระดับเขต)</p></div>
                          <button onClick={() => setShowRankingModal(true)} className="text-xs bg-white border border-purple-200 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors font-medium shadow-sm">ดูทั้งหมด</button>
                      </div>
                      <div className="p-0">
                          {leaderboards.topBySuccessRate.length > 0 ? (
                              <table className="w-full">
                                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium"><tr><th className="px-4 py-3 text-left w-12">#</th><th className="px-4 py-3 text-left">โรงเรียน</th><th className="px-4 py-3 text-center">เข้าแข่งเขต</th><th className="px-4 py-3 text-center text-purple-600">ชนะเลิศ (ที่ 1)</th><th className="px-4 py-3 text-right">ทอง</th></tr></thead>
                                  <tbody className="divide-y divide-gray-50 text-sm">
                                      {leaderboards.topBySuccessRate.map((school, idx) => (
                                          <tr key={idx} className="hover:bg-purple-50/20">
                                              <td className="px-4 py-3 text-center font-bold text-gray-400">{idx + 1}</td>
                                              <td className="px-4 py-3 font-medium text-gray-800">{school.name}</td>
                                              <td className="px-4 py-3 text-center text-gray-500">{school.totalEntries}</td>
                                              <td className="px-4 py-3 text-center font-black text-purple-700">{school.qualifiedCount}</td>
                                              <td className="px-4 py-3 text-right"><span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">{school.goldCount}</span></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          ) : <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีข้อมูลการตัดสิน</div>}
                      </div>
                  </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center"><h2 className="font-bold text-gray-800 flex items-center"><Activity className="w-5 h-5 mr-2 text-green-500" /> ผลการแข่งขันล่าสุด (Live Feed)</h2><span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span></div>
                  <div className="divide-y divide-gray-50">
                      {latestResults.length > 0 ? latestResults.map((team) => {
                          const activityName = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
                          const schoolName = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;
                          let score = 0; let medal = '';
                          if (viewLevel === 'area') { const info = getAreaInfo(team); score = info?.score || 0; medal = info?.medal || calculateMedalFromScore(score); }
                          else { score = team.score; medal = team.medalOverride || calculateMedalFromScore(score); }
                          return (
                              <div key={team.teamId} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                                  <div className="min-w-0 flex-1 pr-4">
                                      <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">{viewLevel === 'area' ? 'Area' : 'Cluster'}</span><span className="text-xs text-gray-400 flex items-center"><Timer className="w-3 h-3 mr-1" /> {team.lastEditedAt ? formatDeadline(team.lastEditedAt) : 'เมื่อสักครู่'}</span></div>
                                      <h4 className="text-sm font-bold text-gray-900 truncate">{activityName}</h4><p className="text-xs text-gray-500 truncate mt-0.5">{team.teamName} - {schoolName}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                      <div className="text-xl font-black text-gray-800">{score}</div>
                                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${medal.includes('Gold') ? 'bg-yellow-100 text-yellow-700' : medal.includes('Silver') ? 'bg-gray-100 text-gray-600' : medal.includes('Bronze') ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>{medal}</div>
                                  </div>
                              </div>
                          );
                      }) : <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีรายการบันทึกคะแนนใหม่</div>}
                  </div>
                  {latestResults.length > 0 && <div className="p-3 bg-gray-50 text-center border-t border-gray-100"><button onClick={() => navigate('/results')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center">ดูผลทั้งหมด <ArrowUpRight className="w-3 h-3 ml-1" /></button></div>}
              </div>
          </div>

          <div className="space-y-6">
             <CountdownWidget data={data} />
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-800 flex items-center"><MapPin className="w-4 h-4 mr-2 text-red-500" /> สนามแข่งขันหลัก</h3><button onClick={() => navigate('/venues')} className="text-xs text-blue-600 hover:underline">ดูทั้งหมด</button></div>
                <div className="divide-y divide-gray-50">
                    {data.venues.slice(0, 3).map(venue => (
                        <div key={venue.id} className="p-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate('/venues')}>
                            <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-200">{venue.imageUrl ? <img src={venue.imageUrl} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Venue"; }} /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><MapPin className="w-5 h-5"/></div>}</div>
                            <div className="min-w-0 flex-1"><div className="text-sm font-bold text-gray-800 truncate">{venue.name}</div><div className="text-xs text-gray-500 truncate">{venue.description || 'ไม่มีรายละเอียด'}</div>{venue.scheduledActivities && venue.scheduledActivities.length > 0 && <div className="mt-1 inline-flex items-center text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100"><Activity className="w-3 h-3 mr-1" /> {venue.scheduledActivities.length} รายการ</div>}</div>
                        </div>
                    ))}
                    {data.venues.length === 0 && <div className="p-4 text-center text-gray-400 text-xs">ยังไม่มีข้อมูลสนามแข่งขัน</div>}
                </div>
             </div>
             {integrityStats && integrityStats.totalIssues > 0 && (
                 <div onClick={() => setShowIntegrityModal(true)} className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm cursor-pointer group mt-6">
                    <div className="bg-red-50 p-3 flex items-center justify-between border-b border-red-100"><div className="flex items-center"><AlertTriangle className="w-5 h-5 text-red-600 mr-2" /><h4 className="text-sm font-bold text-red-800">ข้อมูลไม่สมบูรณ์ ({viewLevel === 'area' ? 'เขต' : 'กลุ่ม'})</h4></div><ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" /></div>
                    <div className="p-3 text-xs text-gray-600 space-y-2">
                        {integrityStats.missingTeachersCount > 0 && <div className="flex items-center justify-between"><span className="flex items-center"><UserX className="w-3 h-3 mr-1.5 text-orange-500"/> ทีมขาดครู</span><span className="font-bold text-red-600 bg-red-50 px-2 rounded-full">{integrityStats.missingTeachersCount}</span></div>}
                        {integrityStats.missingStudentsCount > 0 && <div className="flex items-center justify-between"><span className="flex items-center"><UserX className="w-3 h-3 mr-1.5 text-blue-500"/> ทีมขาดนักเรียน</span><span className="font-bold text-red-600 bg-red-50 px-2 rounded-full">{integrityStats.missingStudentsCount}</span></div>}
                        {integrityStats.missingJudgesCount > 0 && <div className="flex items-center justify-between"><span className="flex items-center"><AlertOctagon className="w-3 h-3 mr-1.5 text-purple-500"/> กิจกรรมไม่มีกรรมการ</span><span className="font-bold text-red-600 bg-red-50 px-2 rounded-full">{integrityStats.missingJudgesCount}</span></div>}
                    </div>
                 </div>
             )}
             {judgeCooperationStats.length > 0 && (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50"><h3 className="text-sm font-bold text-indigo-900 flex items-center"><Handshake className="w-4 h-4 mr-2" /> ความร่วมมือ ({viewLevel === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})</h3><button onClick={() => setShowCooperationModal(true)} className="text-xs bg-white text-indigo-600 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50">ดูทั้งหมด</button></div>
                    <div className="divide-y divide-gray-50">
                        {judgeCooperationStats.map((item, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50"><div className="flex items-center min-w-0"><span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold mr-2 shrink-0 ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span><span className="text-xs text-gray-700 truncate" title={item.name}>{item.name}</span></div><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded ml-2">ส่งครูช่วยตัดสิน {item.count} รายการ</span></div>
                        ))}
                    </div>
                 </div>
             )}
          </div>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between mb-2"><h2 className="text-lg font-bold text-gray-800 flex items-center"><Megaphone className="w-5 h-5 mr-2 text-orange-500" /> ข่าวประชาสัมพันธ์</h2>{isAdmin && <button onClick={() => navigate('/announcements')} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center text-xs font-bold px-3"><Plus className="w-4 h-4 mr-1" /> จัดการข่าว</button>}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{newsList.length > 0 ? newsList.slice(0, newsLimit).map(item => <NewsCard key={item.id} item={item} user={user} onLike={handleLikeNews} onClick={() => setViewingAnnouncement(item)} />) : <div className="col-span-full text-center py-10 text-gray-400 text-sm border-dashed border-2 rounded-xl bg-gray-50">ยังไม่มีข่าวประชาสัมพันธ์</div>}</div>
                {newsList.length > newsLimit && <div className="text-center pt-2"><button onClick={() => setNewsLimit(prev => prev + 6)} className="px-6 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm flex items-center justify-center mx-auto">ดูข่าวเก่าเพิ่มเติม <ChevronDown className="w-4 h-4 ml-1" /></button></div>}
             </div>
             <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4 border-b pb-2"><Book className="w-5 h-5 mr-2 text-green-600" /> คู่มือการใช้งาน</h2>
                <div className="flex flex-col gap-3">{manualList.length > 0 ? manualList.slice(0, manualLimit).map(item => { const att = item.attachments?.find(a => a.type.includes('image')); const img = att ? getAttachmentImageUrl(att) : null; const isVideo = item.link && getVideoEmbedUrl(item.link); return (<div key={item.id} onClick={() => setViewingAnnouncement(item)} className="flex items-start p-3 bg-white border border-gray-200 rounded-xl hover:border-green-400 transition-colors group cursor-pointer shadow-sm hover:shadow-md"><div className="p-2 bg-green-50 text-green-600 rounded-lg mr-3 group-hover:bg-green-100 border border-green-100 overflow-hidden shrink-0 w-10 h-10 flex items-center justify-center mt-0.5">{img ? <img src={img} className="w-full h-full object-cover" alt="icon" /> : isVideo ? <PlayCircle className="w-5 h-5" /> : <FileText className="w-5 h-5"/>}</div><div className="text-sm font-medium text-gray-700 group-hover:text-green-700 leading-snug">{item.title}</div></div>); }) : <div className="text-center py-4 text-gray-400 text-sm">ไม่มีคู่มือ</div>}</div>
                {manualList.length > manualLimit && <div className="text-center pt-1"><button onClick={() => setManualLimit(prev => prev + 5)} className="text-xs font-medium text-gray-500 hover:text-green-600 flex items-center justify-center mx-auto">ดูคู่มือเพิ่มเติม <ChevronDown className="w-3 h-3 ml-1" /></button></div>}
             </div>
          </div>
      </div>

      {showIntegrityModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-red-100 flex justify-between items-center bg-red-50"><div><h3 className="font-bold text-red-800 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> รายการที่ข้อมูลไม่สมบูรณ์ ({viewLevel === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})</h3><p className="text-xs text-red-600 mt-0.5">กรุณาแก้ไขข้อมูลให้ครบถ้วนตามเกณฑ์</p></div><button onClick={() => setShowIntegrityModal(false)} className="p-1.5 hover:bg-red-100 rounded-full text-red-700"><X className="w-5 h-5"/></button></div>
                  <div className="flex-1 overflow-y-auto p-0">{integrityStats.problemItems.length > 0 ? (<table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 sticky top-0 shadow-sm"><tr><th className="px-4 py-3 text-left">รายการ / ทีม</th><th className="px-4 py-3 text-left">รายละเอียด</th><th className="px-4 py-3 text-left w-40">ปัญหาที่พบ</th></tr></thead><tbody className="divide-y divide-gray-50">{integrityStats.problemItems.map((item) => (<tr key={item.id} className="hover:bg-red-50/30 transition-colors"><td className="px-4 py-3 align-top"><div className="font-medium text-gray-900">{item.title}</div></td><td className="px-4 py-3 text-gray-600 align-top">{item.subtitle}</td><td className="px-4 py-3 align-top"><div className="flex flex-wrap gap-1">{item.issues.map((issue, idx) => (<span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">{issue}</span>))}</div></td></tr>))}</tbody></table>) : (<div className="p-10 text-center text-gray-400 flex flex-col items-center"><CheckCircle className="w-16 h-16 text-green-500 mb-3 opacity-50" /><p className="font-medium text-gray-600">ยอดเยี่ยม! ข้อมูลครบถ้วนสมบูรณ์</p><p className="text-xs mt-1">ไม่พบทีมที่มีปัญหาขาดครูหรือนักเรียน และมีกรรมการครบถ้วน</p></div>)}</div>
                  <div className="p-3 border-t border-gray-100 bg-gray-50 text-right text-xs text-gray-500">พบปัญหาทั้งหมด {integrityStats.totalIssues} รายการ</div>
              </div>
          </div>
      )}

      {showCooperationModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50"><div><h3 className="font-bold text-indigo-900 flex items-center"><Handshake className="w-5 h-5 mr-2" /> ความร่วมมือ ({viewLevel === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})</h3><p className="text-xs text-indigo-600">รายการโรงเรียนที่ส่งบุคลากรช่วยตัดสิน</p></div><button onClick={() => setShowCooperationModal(false)} className="p-1.5 hover:bg-indigo-100 rounded-full text-indigo-700"><X className="w-5 h-5"/></button></div>
                  <div className="flex-1 overflow-y-auto p-0">{fullJudgeCooperation.length > 0 ? (<div className="divide-y divide-gray-50">{fullJudgeCooperation.map((item, idx) => (<div key={idx} className="p-3 flex justify-between items-center hover:bg-gray-50 px-6"><div className="flex items-center min-w-0"><span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 shrink-0 ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span><span className="text-sm text-gray-800 font-medium truncate">{item.name}</span></div><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded ml-2">{item.count} รายการ</span></div>))}</div>) : <div className="p-10 text-center text-gray-400"><p>ยังไม่มีข้อมูลความร่วมมือ</p></div>}</div>
                  <div className="p-3 border-t border-gray-100 bg-gray-50 text-right text-xs text-gray-500">รวม {fullJudgeCooperation.length} โรงเรียน</div>
              </div>
          </div>
      )}

      {showUnscoredModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><div><h3 className="font-bold text-gray-800">รายการที่ยังไม่ได้ตัดสิน (Pending)</h3><p className="text-xs text-gray-500">ระดับ: {viewLevel === 'area' ? 'เขตพื้นที่' : 'กลุ่มเครือข่าย'}</p></div><button onClick={() => setShowUnscoredModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button></div>
                  <div className="flex-1 overflow-y-auto p-0">{unscoredTeams.length > 0 ? (<table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100"><tr><th className="px-4 py-3 text-left">ทีม</th><th className="px-4 py-3 text-left">โรงเรียน</th><th className="px-4 py-3 text-left">กิจกรรม</th></tr></thead><tbody className="divide-y divide-gray-50">{unscoredTeams.map(t => { const actName = data.activities.find(a => a.id === t.activityId)?.name; const sName = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId; return (<tr key={t.teamId} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{t.teamName}</td><td className="px-4 py-3 text-gray-600">{sName}</td><td className="px-4 py-3 text-gray-500 text-xs">{actName}</td></tr>); })}</tbody></table>) : <div className="p-10 text-center text-gray-400"><CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" /><p>ตัดสินครบทุกรายการแล้ว!</p></div>}</div>
                  <div className="p-3 border-t border-gray-100 bg-gray-50 text-right text-xs text-gray-500">รวม {unscoredTeams.length} ทีม</div>
              </div>
          </div>
      )}

      {showRankingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50"><div><h3 className="font-bold text-blue-900 flex items-center"><TrendingUp className="w-5 h-5 mr-2" /> อันดับโรงเรียนยอดเยี่ยม ({viewLevel === 'area' ? 'ระดับเขต' : 'ระดับกลุ่ม'})</h3><p className="text-xs text-blue-700">เรียงตามจำนวน{viewLevel === 'area' ? 'ผู้ชนะ (ลำดับที่ 1)' : 'ตัวแทนไปต่อ'}</p></div><button onClick={() => setShowRankingModal(false)} className="p-1.5 hover:bg-blue-100 rounded-full text-blue-800"><X className="w-5 h-5"/></button></div>
                  <div className="flex-1 overflow-y-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 shadow-sm"><tr><th className="px-4 py-3 text-center w-12">#</th><th className="px-4 py-3 text-left">โรงเรียน</th><th className="px-4 py-3 text-center">{viewLevel === 'area' ? 'ทีมเข้าเขต' : 'ส่งแข่ง'}</th><th className="px-4 py-3 text-center text-blue-600">{viewLevel === 'area' ? 'ที่ 1 เขต' : 'ตัวแทน'}</th><th className="px-4 py-3 text-right">อัตราส่วน</th></tr></thead><tbody className="divide-y divide-gray-50">{leaderboards.fullSuccessRate.map((school, idx) => (<tr key={idx} className="hover:bg-blue-50/30 transition-colors"><td className="px-4 py-3 text-center font-bold text-gray-400">{idx + 1}</td><td className="px-4 py-3 font-medium text-gray-900">{school.name}</td><td className="px-4 py-3 text-center text-gray-500">{school.totalEntries}</td><td className="px-4 py-3 text-center font-bold text-blue-600">{school.qualifiedCount}</td><td className="px-4 py-3 text-right"><span className={`inline-block px-2 py-1 rounded text-xs font-bold ${school.rate >= 50 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{school.rate.toFixed(1)}%</span></td></tr>))}</tbody></table></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;

