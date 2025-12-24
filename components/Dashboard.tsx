
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, Announcement, User, AreaStageInfo, Team, Venue, Activity as ActivityType, Comment } from '../types';
import { Users, School, Trophy, Megaphone, Plus, Book, Calendar, ChevronRight, FileText, Loader2, Star, Medal, TrendingUp, Activity, Timer, ArrowUpRight, Zap, Target, CheckCircle, PieChart as PieIcon, List, X, BarChart3, MapPin, Navigation, Handshake, Briefcase, UserX, GraduationCap, AlertTriangle, Clock, Heart, Share2, Download, Image as ImageIcon, ExternalLink, UserCheck, AlertOctagon, PlayCircle, ChevronDown, ChevronUp, MessageCircle, Send, ShieldCheck, RefreshCw, Crown, Search, Filter, Eye, Paperclip, ScanLine, QrCode, Award } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import StatCard from './StatCard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addAnnouncement, toggleLikeAnnouncement, addComment } from '../services/api';
import { formatDeadline } from '../services/utils';
import { shareAnnouncement, shareTop3Result, shareScoreResult } from '../services/liff';
import SearchableSelect from './SearchableSelect';

interface DashboardProps {
  data: AppData;
  user?: User | null;
}

const COLORS = ['#F59E0B', '#94A3B8', '#F97316', '#3B82F6']; // Gold, Silver, Bronze, Blue
const MEDAL_COLORS = { 'Gold': '#FFD700', 'Silver': '#C0C0C0', 'Bronze': '#CD7F32', 'Participant': '#94a3b8' };

// --- Helper Functions (Moved outside for reuse) ---

const getAttachmentImageUrl = (att: { url: string, id?: string }) => {
    if (att.id) return `https://drive.google.com/thumbnail?id=${att.id}&sz=w1000`;
    if (att.url.includes('drive.google.com')) {
        const match = att.url.match(/id=([^&]+)/) || att.url.match(/\/d\/([^/]+)/);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    return att.url;
};

const getVideoEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return null;
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

// --- Modals ---

const ActivityResultsModal = ({ activityId, data, onClose, viewLevel }: { activityId: string, data: AppData, onClose: () => void, viewLevel: 'cluster' | 'area' }) => {
    const activity = data.activities.find(a => a.id === activityId);
    
    const teams = useMemo(() => {
        let list = data.teams.filter(t => t.activityId === activityId);
        
        if (viewLevel === 'area') {
             list = list.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
        }

        const processed = list.map(t => {
            let score = 0, rank = '', medal = '';
            if (viewLevel === 'area') {
                const info = getAreaInfo(t);
                score = info?.score || 0;
                rank = info?.rank || '';
                medal = info?.medal || '';
            } else {
                score = t.score;
                rank = t.rank;
                medal = t.medalOverride || (score >= 80 ? 'Gold' : score >= 70 ? 'Silver' : score >= 60 ? 'Bronze' : 'Participant');
            }
            return { ...t, displayScore: score, displayRank: rank, displayMedal: medal };
        });

        // Show teams that have been scored or explicitly marked present (-1)
        return processed.filter(t => t.displayScore > 0 || t.displayScore === -1).sort((a, b) => {
             // Sort by Rank ASC (if exists) -> Score DESC
             const rA = parseInt(a.displayRank) || 999;
             const rB = parseInt(b.displayRank) || 999;
             if (rA !== rB) return rA - rB;
             return b.displayScore - a.displayScore;
        });
    }, [data.teams, activityId, viewLevel]);

    const handleShareTeam = async (team: any) => {
        const school = data.schools.find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId);
        const schoolName = school?.SchoolName || team.schoolId;
        const activityName = activity?.name || '';
        
        try {
            await shareScoreResult(
                team.teamName,
                schoolName,
                activityName,
                team.displayScore,
                team.displayMedal,
                team.displayRank,
                team.teamId
            );
        } catch (error) {
            console.error("Share failed", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${viewLevel === 'area' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                    <div>
                        <h3 className="font-bold text-lg flex items-center">
                            <Trophy className="w-5 h-5 mr-2" />
                            {activity?.name || 'รายละเอียดผลการแข่งขัน'}
                        </h3>
                        <p className="text-white/80 text-xs mt-0.5">
                            ผลการแข่งขัน {viewLevel === 'area' ? 'ระดับเขตพื้นที่' : 'ระดับกลุ่มเครือข่าย'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="px-4 py-3 text-center w-16">อันดับ</th>
                                <th className="px-4 py-3 text-left">ทีม</th>
                                <th className="px-4 py-3 text-left hidden sm:table-cell">โรงเรียน</th>
                                <th className="px-4 py-3 text-center w-24">คะแนน</th>
                                <th className="px-4 py-3 text-left">รางวัล</th>
                                <th className="px-4 py-3 text-center w-16">แชร์</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {teams.map((t, idx) => {
                                const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
                                const medalColor = t.displayMedal.includes('Gold') ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                                                   t.displayMedal.includes('Silver') ? 'text-gray-600 bg-gray-50 border-gray-200' :
                                                   t.displayMedal.includes('Bronze') ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-blue-600 bg-blue-50 border-blue-200';
                                return (
                                <tr key={t.teamId} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-center font-bold text-gray-500">
                                        {t.displayRank || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{t.teamName}</div>
                                        <div className="text-xs text-gray-500 sm:hidden">{school?.SchoolName || t.schoolId}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{school?.SchoolName || t.schoolId}</td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600">{t.displayScore === -1 ? '-' : t.displayScore}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded border text-xs font-bold ${medalColor} whitespace-nowrap`}>
                                            {t.displayMedal || 'เข้าร่วม'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button 
                                            onClick={() => handleShareTeam(t)}
                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                            title="แชร์ผล"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
                            {teams.length === 0 && (
                                <tr><td colSpan={6} className="py-12 text-center text-gray-400">ยังไม่มีข้อมูลผลการแข่งขัน</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const AnnouncementDetailModal = ({ item, user, onClose, onUpdate }: { item: Announcement, user?: User | null, onClose: () => void, onUpdate?: (updatedItem: Announcement) => void }) => {
    // ... (unchanged)
    const coverAttachment = item.attachments?.find(att => att.type.includes('image'));
    const coverImage = coverAttachment ? getAttachmentImageUrl(coverAttachment) : null;
    const videoEmbedUrl = item.link ? getVideoEmbedUrl(item.link) : null;
    const [likedBy, setLikedBy] = useState<string[]>(item.likedBy || []);
    const isLiked = user && likedBy.includes(user.userid);
    const [comments, setComments] = useState<Comment[]>(item.comments || []);
    const [commentInput, setCommentInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLike = async () => {
        if (!user) return;
        const newLikedBy = isLiked ? likedBy.filter(id => id !== user.userid) : [...likedBy, user.userid];
        setLikedBy(newLikedBy);
        await toggleLikeAnnouncement(item.id, user.userid);
        if (onUpdate) onUpdate({ ...item, likedBy: newLikedBy });
    };

    const handleComment = async () => {
        if (!user || !commentInput.trim()) return;
        setIsSubmitting(true);
        const newComment: Comment = {
            id: Date.now().toString(),
            userId: user.userid,
            userName: user.name || user.displayName || 'User',
            userAvatar: user.pictureUrl,
            content: commentInput,
            timestamp: new Date().toISOString()
        };
        const updatedComments = [...comments, newComment];
        setComments(updatedComments);
        setCommentInput('');
        await addComment(item.id, newComment);
        if (onUpdate) onUpdate({ ...item, comments: updatedComments });
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                    <div className="pr-4">
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium uppercase">{item.type}</span>
                            <span>{new Date(item.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="p-0 overflow-y-auto flex-1 bg-white">
                    {/* Media Section */}
                    {videoEmbedUrl ? (
                        <div className="aspect-video w-full bg-black">
                            <iframe src={videoEmbedUrl} className="w-full h-full" frameBorder="0" allowFullScreen />
                        </div>
                    ) : coverImage && (
                        <img src={coverImage} className="w-full h-auto max-h-[300px] object-cover" />
                    )}

                    <div className="p-6 space-y-6">
                        {/* Content */}
                        <div className="prose prose-sm text-gray-700 whitespace-pre-wrap max-w-none">
                            {item.content}
                        </div>

                        {/* Attachments List */}
                        {item.attachments && item.attachments.length > 0 && (
                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center"><Paperclip className="w-4 h-4 mr-2"/> เอกสารแนบ</h4>
                                <div className="space-y-2">
                                    {item.attachments.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3 group-hover:bg-white group-hover:scale-110 transition-all">
                                                {att.type.includes('pdf') ? <FileText className="w-5 h-5"/> : <ImageIcon className="w-5 h-5"/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">{att.name}</div>
                                                <div className="text-xs text-gray-500">คลิกเพื่อเปิดดู</div>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions: Like & Share */}
                        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                            <button 
                                onClick={handleLike}
                                disabled={!user}
                                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${isLiked ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                                {likedBy.length} ถูกใจ
                            </button>
                            <button 
                                onClick={() => shareAnnouncement(item.id, item.title, item.content, item.type, item.date, coverImage, item.link || '')}
                                className="flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all ml-auto"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                แชร์
                            </button>
                        </div>

                        {/* Comments Section */}
                        <div className="bg-gray-50 -mx-6 -mb-6 p-6 mt-4 border-t border-gray-100">
                            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                <MessageCircle className="w-4 h-4 mr-2"/> ความคิดเห็น ({comments.length})
                            </h4>
                            
                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                                {comments.map((c) => (
                                    <div key={c.id} className="flex gap-3">
                                        <img src={c.userAvatar || `https://ui-avatars.com/api/?name=${c.userName}&background=random`} className="w-8 h-8 rounded-full bg-white border border-gray-200" />
                                        <div className="flex-1">
                                            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="text-xs font-bold text-gray-900">{c.userName}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleDateString('th-TH')}</span>
                                                </div>
                                                <p className="text-sm text-gray-700">{c.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {comments.length === 0 && <p className="text-center text-gray-400 text-sm italic py-4">ยังไม่มีความคิดเห็น</p>}
                            </div>

                            {user ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="เขียนความคิดเห็น..."
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                                    />
                                    <button 
                                        onClick={handleComment}
                                        disabled={!commentInput.trim() || isSubmitting}
                                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-xs text-gray-500 bg-white p-2 rounded-lg border border-gray-200">
                                    กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NewsCard: React.FC<{ item: Announcement; user?: User | null; onLike: (id: string) => void; onClick: () => void; }> = ({ item, user, onLike, onClick }) => {
    return (
        <div onClick={onClick} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col h-full">
            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex items-center"><Calendar className="w-3 h-3 mr-1" />{new Date(item.date).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-3 mb-3 flex-1">{item.content}</p>
            </div>
        </div>
    );
};

const CountdownWidget = ({ data }: { data: AppData }) => {
    return (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white shadow-md relative overflow-hidden mb-6">
            <div className="relative z-10 flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-2 flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> Countdown</h3>
                <span className="text-sm font-bold opacity-80">การแข่งขันจะเริ่มเร็วๆ นี้</span>
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
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ data, user }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewLevel, setViewLevel] = useState<'cluster' | 'area'>('area');
  const [isLoading, setIsLoading] = useState(true);
  
  // States
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [newsList, setNewsList] = useState<Announcement[]>([]);
  const [newsLimit, setNewsLimit] = useState(6);
  const [manualList, setManualList] = useState<Announcement[]>([]);
  const [manualLimit, setManualLimit] = useState(5);

  // Announced Results States
  const [announcedSearch, setAnnouncedSearch] = useState('');
  const [announcedCategory, setAnnouncedCategory] = useState('All');
  const [resultsModalActivityId, setResultsModalActivityId] = useState<string | null>(null);

  useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      if (!data.announcements) return;
      const userSchool = (data.schools || []).find(s => s.SchoolID === user?.SchoolID);
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

  // Handle Params for Deep Link Modal
  useEffect(() => {
      const annId = searchParams.get('announcementId');
      if (annId && data.announcements) {
          const found = data.announcements.find(a => a.id === annId);
          if (found) setViewingAnnouncement(found);
      }
  }, [searchParams, data.announcements]);

  // --- Logic for Announced Results Section ---
  const announcedActivities = useMemo(() => {
      if (!data.activities) return { list: [], categories: [] };
      
      const categories = Array.from(new Set(data.activities.map(a => a.category))).sort();
      
      const results = data.activities.map(act => {
          // Filter teams for this activity
          let teams = (data.teams || []).filter(t => t.activityId === act.id);
          
          if (viewLevel === 'area') {
              teams = teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
          }

          // Check if announced (has scores or manually locked)
          const scoredCount = teams.filter(t => {
              const score = viewLevel === 'area' ? (getAreaInfo(t)?.score || 0) : t.score;
              return score > 0 || score === -1;
          }).length;

          // Also check lock status if available
          const isLocked = (data.activityStatus || []).some(s => s.activityId === act.id && s.scope === viewLevel && s.isLocked);

          return {
              ...act,
              totalTeams: teams.length,
              scoredTeams: scoredCount,
              isAnnounced: scoredCount > 0 || isLocked
          };
      }).filter(a => a.isAnnounced);

      // Apply Filters
      const filtered = results.filter(a => {
          if (announcedCategory !== 'All' && a.category !== announcedCategory) return false;
          if (announcedSearch && !a.name.toLowerCase().includes(announcedSearch.toLowerCase())) return false;
          return true;
      });

      return { list: filtered, categories };
  }, [data.activities, data.teams, data.activityStatus, viewLevel, announcedCategory, announcedSearch]);

  const handleShareTop3 = async (act: any) => {
        let teams = data.teams.filter(t => t.activityId === act.id);
        
        if (viewLevel === 'area') {
            teams = teams.filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
        }

        const winners = teams.map(t => {
            let score = 0, rank = '', medal = '';
            if (viewLevel === 'area') {
                const info = getAreaInfo(t);
                score = info?.score || 0;
                rank = info?.rank || '';
                medal = info?.medal || '';
            } else {
                score = t.score;
                rank = t.rank;
                medal = t.medalOverride || (score >= 80 ? 'Gold' : score >= 70 ? 'Silver' : score >= 60 ? 'Bronze' : 'Participant');
            }
            return {
                rank: parseInt(rank) || 999,
                teamName: t.teamName,
                schoolName: data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId,
                score: String(score),
                medal: medal
            };
        }).filter(w => w.rank >= 1 && w.rank <= 3).sort((a, b) => a.rank - b.rank);

        if (winners.length > 0) {
            try {
                await shareTop3Result(act.name, winners, act.id);
            } catch(e) {
                console.error("Share failed", e);
            }
        } else {
            alert('ยังไม่มีข้อมูลลำดับที่ 1-3');
        }
  };

  // --- Data Filtering & Processing for Stats ---
  const scopeTeams = useMemo(() => {
      if (viewLevel === 'area') {
          return (data.teams || []).filter(t => t.stageStatus === 'Area' || String(t.flag).toUpperCase() === 'TRUE');
      }
      return data.teams || [];
  }, [data.teams, viewLevel]);

  const { stats, medalChartData, categoryChartData, topSchools } = useMemo(() => {
      const totalTeams = scopeTeams.length;
      let scoredCount = 0;
      let goldCount = 0;
      const medalCounts: Record<string, number> = { 'Gold': 0, 'Silver': 0, 'Bronze': 0, 'Participant': 0 };
      const catCounts: Record<string, number> = {};
      const schoolScores: Record<string, number> = {};

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
              
              // Top Schools Calculation (Total Score)
              const sName = (data.schools || []).find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId)?.SchoolName || t.schoolId;
              schoolScores[sName] = (schoolScores[sName] || 0) + score;
          }
          if (score >= 80) goldCount++;
          const activity = (data.activities || []).find(a => a.id === t.activityId);
          if (activity) catCounts[activity.category] = (catCounts[activity.category] || 0) + 1;
      });

      const progress = totalTeams > 0 ? Math.round((scoredCount / totalTeams) * 100) : 0;
      
      const medalChart = [
          { name: 'Gold', value: medalCounts['Gold'] },
          { name: 'Silver', value: medalCounts['Silver'] },
          { name: 'Bronze', value: medalCounts['Bronze'] },
          { name: 'Part.', value: medalCounts['Participant'] }
      ];

      const categoryChart = Object.keys(catCounts)
          .map(key => ({ name: key, value: catCounts[key] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); 
          
      const sortedSchools = Object.entries(schoolScores)
          .map(([name, score]) => ({ name, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

      return { 
          stats: { totalTeams, progress, goldCount, scoredCount },
          medalChartData: medalChart,
          categoryChartData: categoryChart,
          topSchools: sortedSchools
      };
  }, [scopeTeams, viewLevel, data.activities, data.schools]);

  const latestResults = useMemo(() => {
      const scored = scopeTeams.filter(t => {
          if (viewLevel === 'area') { const info = getAreaInfo(t); return (info?.score || 0) > 0; }
          return t.score > 0;
      });
      return scored.sort((a, b) => {
          const dateA = a.lastEditedAt ? new Date(a.lastEditedAt).getTime() : 0;
          const dateB = b.lastEditedAt ? new Date(b.lastEditedAt).getTime() : 0;
          return dateB - dateA;
      }).slice(0, 5);
  }, [scopeTeams, viewLevel]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      {viewingAnnouncement && <AnnouncementDetailModal item={viewingAnnouncement} user={user} onClose={() => { setViewingAnnouncement(null); setSearchParams({}); }} />}
      
      {/* Activity Results Modal */}
      {resultsModalActivityId && (
          <ActivityResultsModal 
              activityId={resultsModalActivityId}
              data={data}
              onClose={() => setResultsModalActivityId(null)}
              viewLevel={viewLevel}
          />
      )}

      {/* Mobile Quick Actions */}
      <div className="md:hidden grid grid-cols-4 gap-3 mb-2">
          <button onClick={() => navigate('/idcards')} className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                  <ScanLine className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-700">สแกน</span>
          </button>
          <button onClick={() => navigate('/results')} className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mb-1">
                  <Award className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-700">ดูผล</span>
          </button>
          <button onClick={() => navigate('/teams')} className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-1">
                  <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-700">ทีมแข่ง</span>
          </button>
          <button onClick={() => navigate('/venues')} className="flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-1">
                  <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-700">ตาราง</span>
          </button>
      </div>

      <div className={`rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden ${viewLevel === 'area' ? 'bg-gradient-to-r from-purple-800 to-indigo-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10">{viewLevel === 'area' ? <Trophy className="w-40 h-40" /> : <School className="w-40 h-40" />}</div>
        <div className="relative z-10 text-center md:text-left">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white mb-2 border border-white/30">{viewLevel === 'area' ? '🏆 District Level' : '🏫 Cluster Level'}</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{viewLevel === 'area' ? 'สรุปผลระดับเขตพื้นที่' : 'สรุปผลระดับกลุ่มเครือข่าย'}</h1>
            <p className="text-white/80 text-sm">ติดตามข่าวสารและผลการแข่งขันล่าสุด</p>
        </div>
        <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-md flex relative z-10 border border-white/20">
            <button onClick={() => setViewLevel('cluster')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewLevel === 'cluster' ? 'bg-white text-blue-600 shadow' : 'text-white/80 hover:bg-white/10'}`}><School className="w-4 h-4 mr-2"/> ระดับกลุ่มฯ</button>
            <button onClick={() => setViewLevel('area')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewLevel === 'area' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'}`}><Trophy className="w-4 h-4 mr-2"/> ระดับเขตฯ</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title={viewLevel === 'area' ? 'ทีมเข้ารอบเขต' : 'ทีมสมัครทั้งหมด'} value={stats.totalTeams} icon={Users} colorClass="bg-blue-500" />
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
             <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-500">ความคืบหน้า</span><span className="text-lg font-bold text-green-600">{stats.progress}%</span></div>
             <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-green-500 h-full" style={{width: `${stats.progress}%`}}></div></div>
          </div>
          <StatCard title="เหรียญทอง" value={stats.goldCount} icon={Medal} colorClass="bg-yellow-500" />
          <StatCard title="ประกาศผลแล้ว" value={announcedActivities.list.length} icon={CheckCircle} colorClass="bg-green-500" />
      </div>

      {/* NEW SECTION: Charts */}
      {stats.scoredCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                      <PieIcon className="w-5 h-5 mr-2 text-purple-500" /> สัดส่วนเหรียญรางวัล
                  </h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={medalChartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {medalChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-500" /> ทีมในแต่ละหมวดวิชา (Top 5)
                  </h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {/* Grid Layout for Live Feed & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest Results Feed (Modernized) */}
          <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-white to-gray-50">
                      <h2 className="font-bold text-gray-800 flex items-center">
                          <Activity className="w-5 h-5 mr-2 text-green-500 animate-pulse" /> 
                          ผลการแข่งขันล่าสุด (Live Feed)
                      </h2>
                      <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                          <span className="relative flex h-2 w-2 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          Real-time
                      </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                      {latestResults.length > 0 ? latestResults.map((team, idx) => {
                          const activityName = (data.activities || []).find(a => a.id === team.activityId)?.name || team.activityId;
                          const schoolName = (data.schools || []).find(s => s.SchoolID === team.schoolId || s.SchoolName === team.schoolId)?.SchoolName || team.schoolId;
                          let score = 0; let medal = '';
                          if (viewLevel === 'area') { const info = getAreaInfo(team); score = info?.score || 0; medal = info?.medal || calculateMedalFromScore(score); }
                          else { score = team.score; medal = team.medalOverride || calculateMedalFromScore(score); }
                          
                          const isGold = medal.includes('Gold');
                          const isVeryRecent = idx === 0; // Highlight top item

                          return (
                              <div key={team.teamId} className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between animate-in slide-in-from-right duration-300 ${isVeryRecent ? 'bg-blue-50/30' : ''}`}>
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm ${isGold ? 'bg-yellow-400' : medal.includes('Silver') ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                          {score}
                                      </div>
                                      <div className="min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide border border-gray-200">{viewLevel === 'area' ? 'Area' : 'Cluster'}</span>
                                              <span className="text-xs text-gray-400 flex items-center"><Timer className="w-3 h-3 mr-1" /> {team.lastEditedAt ? formatDeadline(team.lastEditedAt) : 'เมื่อสักครู่'}</span>
                                              {isVeryRecent && <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 rounded animate-pulse">NEW</span>}
                                          </div>
                                          <h4 className="text-sm font-bold text-gray-900 truncate">{activityName}</h4>
                                          <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center">
                                              <School className="w-3 h-3 mr-1"/> {schoolName}
                                          </p>
                                      </div>
                                  </div>
                                  <div className="text-right shrink-0 pl-2">
                                      <div className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${isGold ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : medal.includes('Silver') ? 'bg-gray-50 text-gray-600 border-gray-200' : medal.includes('Bronze') ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                          {medal}
                                      </div>
                                  </div>
                              </div>
                          );
                      }) : <div className="p-12 text-center text-gray-400 text-sm flex flex-col items-center"><Activity className="w-10 h-10 mb-2 opacity-20"/> ยังไม่มีรายการบันทึกคะแนนใหม่</div>}
                  </div>
              </div>
          </div>

          {/* Leaderboard Widget */}
          <div className="space-y-6">
             {/* Countdown */}
             <CountdownWidget data={data} />
             
             {/* Top Schools Leaderboard */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-white">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center">
                        <Crown className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" /> 
                        Top 5 Schools (คะแนนรวม)
                    </h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {topSchools.length > 0 ? topSchools.map((s, idx) => (
                        <div key={idx} className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-yellow-400 text-white shadow-sm' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                            </div>
                            <div className="font-bold text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{s.score}</div>
                        </div>
                    )) : (
                        <div className="p-6 text-center text-xs text-gray-400">ยังไม่มีข้อมูลคะแนน</div>
                    )}
                </div>
             </div>

             {/* Venues Widget */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="text-sm font-bold text-gray-800 flex items-center"><MapPin className="w-4 h-4 mr-2 text-red-500" /> สนามแข่งขันหลัก</h3><button onClick={() => navigate('/venues')} className="text-xs text-blue-600 hover:underline">ดูทั้งหมด</button></div>
                <div className="divide-y divide-gray-50">
                    {(data.venues || []).slice(0, 3).map(venue => (
                        <div key={venue.id} className="p-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate('/venues')}>
                            <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden border border-gray-200">{venue.imageUrl ? <img src={venue.imageUrl} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Venue"; }} /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><MapPin className="w-5 h-5"/></div>}</div>
                            <div className="min-w-0 flex-1"><div className="text-sm font-bold text-gray-800 truncate">{venue.name}</div><div className="text-xs text-gray-500 truncate">{venue.description || 'ไม่มีรายละเอียด'}</div></div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
      </div>

      {/* Announced Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <div>
                      <h2 className="text-lg font-bold text-gray-800 flex items-center">
                          <Trophy className="w-5 h-5 mr-2 text-purple-600" />
                          รายการที่ประกาศผลแล้ว (Announced Results)
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">ค้นหาและดูผลการแข่งขันตามรายการ</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => navigate('/results')} className="text-sm text-blue-600 font-bold hover:underline flex items-center">
                          ดูสรุปเหรียญรางวัลทั้งหมด <ArrowUpRight className="w-4 h-4 ml-1" />
                      </button>
                  </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input 
                          type="text" 
                          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="ค้นหารายการแข่งขัน..."
                          value={announcedSearch}
                          onChange={(e) => setAnnouncedSearch(e.target.value)}
                      />
                  </div>
                  <div className="w-full md:w-64">
                      <SearchableSelect 
                          options={[{ label: 'ทุกหมวดหมู่', value: 'All' }, ...announcedActivities.categories.map(c => ({ label: c, value: c }))]}
                          value={announcedCategory}
                          onChange={setAnnouncedCategory}
                          placeholder="เลือกหมวดหมู่..."
                          icon={<Filter className="h-4 w-4" />}
                      />
                  </div>
              </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                      <tr>
                          <th className="px-6 py-3 text-left">รายการแข่งขัน</th>
                          <th className="px-6 py-3 text-left">หมวดหมู่</th>
                          <th className="px-6 py-3 text-center">ทีมทั้งหมด</th>
                          <th className="px-6 py-3 text-center">บันทึกแล้ว</th>
                          <th className="px-6 py-3 text-right">ดำเนินการ</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {announcedActivities.list.length > 0 ? (
                          announcedActivities.list.slice(0, 10).map((act) => (
                              <tr key={act.id} className="hover:bg-purple-50/20 transition-colors">
                                  <td className="px-6 py-3 font-medium text-gray-900">{act.name}</td>
                                  <td className="px-6 py-3 text-gray-500">
                                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs border border-gray-200">{act.category}</span>
                                  </td>
                                  <td className="px-6 py-3 text-center text-gray-500">{act.totalTeams}</td>
                                  <td className="px-6 py-3 text-center font-bold text-green-600">{act.scoredTeams}</td>
                                  <td className="px-6 py-3 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => handleShareTop3(act)}
                                              className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 font-bold inline-flex items-center"
                                              title="Share Top 3"
                                          >
                                              <Share2 className="w-3 h-3 mr-1.5" /> Share Top 3
                                          </button>
                                          <button 
                                              onClick={() => setResultsModalActivityId(act.id)}
                                              className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 font-bold inline-flex items-center"
                                          >
                                              <Eye className="w-3 h-3 mr-1.5" /> ดูผล
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                  ไม่พบรายการแข่งขันที่ประกาศผล
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>

          {/* Mobile Card View (Improved) */}
          <div className="md:hidden p-4 space-y-3 bg-gray-50">
              {announcedActivities.list.length > 0 ? (
                  announcedActivities.list.slice(0, 10).map((act) => (
                      <div key={act.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                          {/* Moved Category to Top */}
                          <div className="mb-2">
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase border border-blue-100">
                                  {act.category}
                              </span>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight mb-3 min-h-[2.5em]">
                              {act.name}
                          </h3>
                          
                          <div className="flex gap-4 text-xs text-gray-500 mb-4 border-t border-gray-100 pt-2">
                              <div className="flex-1 bg-gray-50 rounded px-2 py-1 text-center border border-gray-100">
                                  <div className="text-[10px] text-gray-400">ทีมทั้งหมด</div>
                                  <div className="font-bold text-gray-700">{act.totalTeams}</div>
                              </div>
                              <div className="flex-1 bg-green-50 rounded px-2 py-1 text-center border border-green-100">
                                  <div className="text-[10px] text-green-600">บันทึกแล้ว</div>
                                  <div className="font-bold text-green-700">{act.scoredTeams}</div>
                              </div>
                          </div>

                          <div className="flex gap-2">
                              <button 
                                  onClick={() => handleShareTop3(act)}
                                  className="flex-1 text-xs bg-amber-50 text-amber-700 py-2.5 rounded-lg border border-amber-200 hover:bg-amber-100 font-bold flex items-center justify-center active:scale-95 transition-transform"
                              >
                                  <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                              </button>
                              <button 
                                  onClick={() => setResultsModalActivityId(act.id)}
                                  className="flex-1 text-xs bg-purple-50 text-purple-700 py-2.5 rounded-lg border border-purple-200 hover:bg-purple-100 font-bold flex items-center justify-center active:scale-95 transition-transform"
                              >
                                  <Eye className="w-3.5 h-3.5 mr-1.5" /> ดูผล
                              </button>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="text-center py-8 text-gray-400 italic">
                      ไม่พบรายการแข่งขันที่ประกาศผล
                  </div>
              )}
          </div>
          
          {announcedActivities.list.length > 10 && (
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                  <button onClick={() => navigate('/results')} className="text-sm text-gray-500 hover:text-purple-600 font-medium">
                      ดูรายการทั้งหมด ({announcedActivities.list.length})
                  </button>
              </div>
          )}
      </div>

      {/* Announcements & Manuals */}
      <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between mb-2"><h2 className="text-lg font-bold text-gray-800 flex items-center"><Megaphone className="w-5 h-5 mr-2 text-orange-500" /> ข่าวประชาสัมพันธ์</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{newsList.length > 0 ? newsList.slice(0, newsLimit).map(item => <NewsCard key={item.id} item={item} user={user} onLike={() => {}} onClick={() => setViewingAnnouncement(item)} />) : <div className="col-span-full text-center py-10 text-gray-400 text-sm border-dashed border-2 rounded-xl bg-gray-50">ยังไม่มีข่าวประชาสัมพันธ์</div>}</div>
             </div>
             <div className="lg:col-span-1 space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center mb-4 border-b pb-2"><Book className="w-5 h-5 mr-2 text-green-600" /> คู่มือการใช้งาน</h2>
                <div className="flex flex-col gap-3">{manualList.length > 0 ? manualList.slice(0, manualLimit).map(item => { const att = item.attachments?.find(a => a.type.includes('image')); const img = att ? getAttachmentImageUrl(att) : null; return (<div key={item.id} onClick={() => setViewingAnnouncement(item)} className="flex items-start p-3 bg-white border border-gray-200 rounded-xl hover:border-green-400 transition-colors group cursor-pointer shadow-sm hover:shadow-md"><div className="p-2 bg-green-50 text-green-600 rounded-lg mr-3 group-hover:bg-green-100 border border-green-100 overflow-hidden shrink-0 w-10 h-10 flex items-center justify-center mt-0.5">{img ? <img src={img} className="w-full h-full object-cover" alt="icon" /> : <FileText className="w-5 h-5"/>}</div><div className="text-sm font-medium text-gray-700 group-hover:text-green-700 leading-snug">{item.title}</div></div>); }) : <div className="text-center py-4 text-gray-400 text-sm">ไม่มีคู่มือ</div>}</div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
