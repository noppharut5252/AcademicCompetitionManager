
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, Team, AreaStageInfo, School } from '../types';
import { BrainCircuit, Copy, FileText, LayoutGrid, Trophy, Check, Sparkles, MessageSquare, MonitorPlay, Crown, Flame, Zap, Target, BarChart3, TrendingUp, Filter, Ghost } from 'lucide-react';

interface SummaryGeneratorProps {
  data: AppData;
  user?: User | null;
}

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ data, user }) => {
  const [viewScope, setViewScope] = useState<'cluster' | 'area'>('area');
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // --- Group Admin Logic ---
  const userRole = user?.level?.toLowerCase();
  const isGroupAdmin = userRole === 'group_admin';
  const userSchool = data.schools.find(s => s.SchoolID === user?.SchoolID);
  const userClusterID = userSchool?.SchoolCluster;

  // Auto-lock cluster filter for group admin when in cluster mode
  useEffect(() => {
      if (isGroupAdmin && userClusterID) {
          // If viewing cluster scope, force select own cluster
          if (viewScope === 'cluster') {
              setSelectedCluster(userClusterID);
          }
      }
  }, [viewScope, isGroupAdmin, userClusterID]);

  // --- Helper to parse Area Info ---
  const getAreaInfo = (team: Team): AreaStageInfo | null => {
      try { return JSON.parse(team.stageInfo); } catch { return null; }
  };

  // --- Helper to get Medal ---
  const calculateMedal = (score: number, override?: string) => {
      if (override && override !== '') return override;
      if (score >= 80) return 'Gold';
      if (score >= 70) return 'Silver';
      if (score >= 60) return 'Bronze';
      return 'Participant';
  };

  // --- 1. Generate Source Text (The "Knowledge Base" for NotebookLM) ---
  const sourceText = useMemo(() => {
      const today = new Date().toLocaleDateString('th-TH', { dateStyle: 'full' });
      
      // --- Pre-process Data ---
      let targetTeams = data.teams;
      
      // Scope Filtering
      if (viewScope === 'area') {
          targetTeams = data.teams.filter(t => 
              String(t.rank) === '1' && 
              String(t.flag).toUpperCase() === 'TRUE' && 
              t.stageStatus === 'Area'
          );
      } else if (viewScope === 'cluster') {
          // Cluster Scope Logic
          if (isGroupAdmin && userClusterID) {
              // Group Admin: Force own cluster
              targetTeams = data.teams.filter(t => {
                  const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                  return s?.SchoolCluster === userClusterID;
              });
          } else if (selectedCluster) {
              // Admin selected specific cluster
              targetTeams = data.teams.filter(t => {
                  const s = data.schools.find(sc => sc.SchoolID === t.schoolId || sc.SchoolName === t.schoolId);
                  return s?.SchoolCluster === selectedCluster;
              });
          }
          // If Admin and no cluster selected ('All'), targetTeams remains all teams
      }

      // Map to a richer format for calculation
      const processedTeams = targetTeams.map(t => {
          let score = 0;
          let medal = '';
          const areaInfo = getAreaInfo(t);
          
          if (viewScope === 'area') {
              score = areaInfo?.score || 0;
              medal = areaInfo?.medal || '';
          } else {
              score = t.score;
              medal = t.medalOverride || (score > 0 ? calculateMedal(score) : '');
          }

          const school = data.schools.find(s => s.SchoolID === t.schoolId || s.SchoolName === t.schoolId);
          const schoolName = school?.SchoolName || t.schoolId;
          const clusterName = data.clusters.find(c => c.ClusterID === school?.SchoolCluster)?.ClusterName || 'N/A';
          const activity = data.activities.find(a => a.id === t.activityId);

          return {
              ...t,
              finalScore: score > 0 ? score : 0, // Ensure no -1 or NaN
              finalMedal: medal,
              schoolName,
              clusterName,
              activityName: activity?.name || t.activityId,
              category: activity?.category || 'General'
          };
      }).filter(t => t.finalScore > 0); // Only analyze scored teams

      // Count teams per activity (for Uncontested Logic)
      const teamsPerActivity: Record<string, number> = {};
      processedTeams.forEach(t => {
          teamsPerActivity[t.activityId] = (teamsPerActivity[t.activityId] || 0) + 1;
      });

      // --- Start Building Content ---
      let content = `# ข้อมูลสรุปผลการแข่งขันงานศิลปหัตถกรรมนักเรียน\n`;
      content += `วันที่ดึงข้อมูล: ${today}\n`;
      content += `ขอบเขตข้อมูล: ${viewScope === 'area' ? 'ระดับเขตพื้นที่การศึกษา' : 'ระดับกลุ่มเครือข่ายโรงเรียน'}\n`;
      
      const effectiveCluster = isGroupAdmin ? userClusterID : selectedCluster;
      if (viewScope === 'cluster' && effectiveCluster) {
          const cName = data.clusters.find(c => c.ClusterID === effectiveCluster)?.ClusterName;
          content += `เจาะจงกลุ่มเครือข่าย: ${cName}\n`;
      }
      
      content += `จำนวนทีมที่นำมาวิเคราะห์: ${processedTeams.length} ทีม\n\n`;

      // --- 1. Popular Activities ---
      content += `## 1. 🔥 รายการยอดนิยม (Most Popular Activities)\n`;
      content += `(รายการที่มีจำนวนทีมเข้าแข่งขันและได้รับคะแนนสูงสุด)\n`;
      const activityCounts: Record<string, { count: number, name: string }> = {};
      processedTeams.forEach(t => {
          if (!activityCounts[t.activityId]) activityCounts[t.activityId] = { count: 0, name: t.activityName };
          activityCounts[t.activityId].count++;
      });
      Object.values(activityCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .forEach((act, idx) => {
              content += `${idx + 1}. ${act.name}: ${act.count} ทีม\n`;
          });
      content += `\n`;

      // --- 2. The 90+ Club ---
      const superTeams = processedTeams.filter(t => t.finalScore >= 90).sort((a, b) => b.finalScore - a.finalScore);
      content += `## 2. 💎 สถิติคะแนนระดับเทพ ("90+ Club")\n`;
      content += `- จำนวนทีมที่ได้คะแนน 90 ขึ้นไป: ${superTeams.length} ทีม (คิดเป็น ${Math.round((superTeams.length / processedTeams.length) * 100) || 0}% ของทั้งหมด)\n`;
      content += `### ตัวอย่างผลงานคะแนนสูงสุด (Top Scorers):\n`;
      superTeams.slice(0, 5).forEach(t => {
          content += `- ${t.finalScore} คะแนน: ${t.teamName} (${t.schoolName}) - รายการ ${t.activityName}\n`;
      });
      content += `\n`;

      // --- 3. Closest Battles ---
      content += `## 3. ⚔️ สมรภูมิเดือด (Closest Battles)\n`;
      content += `(รายการที่ที่ 1 และที่ 2 คะแนนห่างกันน้อยที่สุด)\n`;
      const teamsByAct: Record<string, typeof processedTeams> = {};
      processedTeams.forEach(t => {
          if (!teamsByAct[t.activityId]) teamsByAct[t.activityId] = [];
          teamsByAct[t.activityId].push(t);
      });
      const battles = [];
      for (const actId in teamsByAct) {
          const sorted = teamsByAct[actId].sort((a, b) => b.finalScore - a.finalScore);
          if (sorted.length >= 2) {
              const diff = sorted[0].finalScore - sorted[1].finalScore;
              if (diff < 5) { // Only care if close
                  battles.push({
                      actName: sorted[0].activityName,
                      diff: parseFloat(diff.toFixed(2)),
                      winner: sorted[0].schoolName,
                      runnerUp: sorted[1].schoolName,
                      winnerScore: sorted[0].finalScore,
                      runnerUpScore: sorted[1].finalScore
                  });
              }
          }
      }
      battles.sort((a, b) => a.diff - b.diff).slice(0, 5).forEach(b => {
          content += `- ${b.actName}: เฉือนกัน ${b.diff} คะแนน (ชนะ: ${b.winner} ${b.winnerScore} vs ${b.runnerUp} ${b.runnerUpScore})\n`;
      });
      content += `\n`;

      // --- 4. High Efficiency Schools (Dynamic Logic) ---
      const metricLabel = viewScope === 'area' ? 'เหรียญทอง' : 'ตัวแทนเขต';
      content += `## 4. 🎯 โรงเรียนจิ๋วแต่แจ๋ว (High Efficiency)\n`;
      content += `(วัดจาก % ${metricLabel} เทียบกับจำนวนทีมที่ส่ง - เน้นโรงเรียนขนาดเล็ก)\n`;
      
      const schoolEff: Record<string, { total: number, success: number }> = {};
      processedTeams.forEach(t => {
          if (!schoolEff[t.schoolName]) schoolEff[t.schoolName] = { total: 0, success: 0 };
          schoolEff[t.schoolName].total++;
          
          let isSuccess = false;
          if (viewScope === 'area') {
              // Area View: Success = Gold
              if (t.finalMedal.includes('Gold')) isSuccess = true;
          } else {
              // Cluster View: Success = Representative (Rank 1 + Flag TRUE)
              if (String(t.rank) === '1' && String(t.flag).toUpperCase() === 'TRUE') isSuccess = true;
          }
          
          if (isSuccess) schoolEff[t.schoolName].success++;
      });

      Object.entries(schoolEff)
          .filter(([_, stats]) => stats.total >= 1) // Allow small schools
          .map(([name, stats]) => ({
              name,
              percent: (stats.success / stats.total) * 100,
              ...stats
          }))
          // Sort Logic: Percentage High to Low, then Total Teams Low to High (Small schools first)
          .sort((a, b) => b.percent - a.percent || a.total - b.total)
          .slice(0, 5)
          .forEach(s => {
              content += `- ${s.name}: ความสำเร็จ ${Math.round(s.percent)}% (ส่ง ${s.total} ทีม ได้เป็น${metricLabel} ${s.success} ทีม)\n`;
          });
      content += `\n`;

      // --- 5. Category Dominance ---
      content += `## 5. 🏆 เจ้าแห่งหมวดวิชา (Category Dominance)\n`;
      const catDom: Record<string, Record<string, number>> = {}; // Cat -> School -> GoldCount
      processedTeams.forEach(t => {
          if (!t.finalMedal.includes('Gold')) return;
          if (!catDom[t.category]) catDom[t.category] = {};
          if (!catDom[t.category][t.schoolName]) catDom[t.category][t.schoolName] = 0;
          catDom[t.category][t.schoolName]++;
      });
      
      const significantCats = Object.keys(catDom).sort();
      significantCats.forEach(cat => {
          const schools = Object.entries(catDom[cat])
              .sort((a, b) => b[1] - a[1]);
          if (schools.length > 0) {
              const top = schools[0];
              if (top[1] >= 2) { // Must win at least 2 golds to be dominant
                  content += `- หมวด ${cat}: ${top[0]} (กวาด ${top[1]} เหรียญทอง)\n`;
              }
          }
      });
      content += `\n`;

      // --- 6. Cluster Power Ranking (Area View Only) ---
      if (viewScope === 'area') {
          content += `## 6. 📊 อันดับกลุ่มเครือข่าย (Cluster Power Ranking)\n`;
          content += `(วัดจากจำนวนเหรียญทองรวมของโรงเรียนในสังกัด)\n`;
          const clusterGold: Record<string, number> = {};
          processedTeams.forEach(t => {
              if (t.finalMedal.includes('Gold')) {
                  const cName = t.clusterName;
                  clusterGold[cName] = (clusterGold[cName] || 0) + 1;
              }
          });
          Object.entries(clusterGold)
              .sort((a, b) => b[1] - a[1])
              .forEach(([name, count], idx) => {
                  content += `${idx + 1}. ${name}: ${count} เหรียญทอง\n`;
              });
          content += `\n`;
      }

      // --- 7. Uncontested / Easy Wins (New) ---
      content += `## 7. 🚀 เส้นทางสะดวก / ชนะใสๆ (Uncontested / Low Competition)\n`;
      content += `(รายการที่การแข่งขันไม่สูงมาก [คู่แข่ง <= 2 ทีม] แต่ได้รับเหรียญทอง)\n`;
      const uncontested = processedTeams
          .filter(t => t.finalMedal.includes('Gold') && teamsPerActivity[t.activityId] <= 2)
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, 5);
      
      if (uncontested.length > 0) {
          uncontested.forEach(t => {
              const totalCompetitors = teamsPerActivity[t.activityId];
              content += `- ${t.activityName}: ${t.schoolName} (${t.finalScore} คะแนน) - คู่แข่ง ${totalCompetitors} ทีม\n`;
          });
      } else {
          content += `- ไม่พบรายการที่ชนะโดยไม่มีคู่แข่งอย่างชัดเจน (การแข่งขันเข้มข้นทุกรายการ)\n`;
      }
      content += `\n`;

      // --- Standard Summary (Top Schools) ---
      content += `## 8. ตารางสรุปเหรียญรวม (Overall Medal Tally)\n`;
      const schoolMedals: Record<string, { gold: number, silver: number, bronze: number, total: number }> = {};
      processedTeams.forEach(t => {
          if (!schoolMedals[t.schoolName]) schoolMedals[t.schoolName] = { gold: 0, silver: 0, bronze: 0, total: 0 };
          schoolMedals[t.schoolName].total++;
          if (t.finalMedal.includes('Gold')) schoolMedals[t.schoolName].gold++;
          else if (t.finalMedal.includes('Silver')) schoolMedals[t.schoolName].silver++;
          else if (t.finalMedal.includes('Bronze')) schoolMedals[t.schoolName].bronze++;
      });
      Object.entries(schoolMedals)
          .sort((a, b) => b[1].gold - a[1].gold || b[1].total - a[1].total)
          .slice(0, 10)
          .forEach(([name, stat], idx) => {
              content += `${idx + 1}. ${name}: 🥇${stat.gold} 🥈${stat.silver} 🥉${stat.bronze} (รวมส่ง ${stat.total})\n`;
          });

      content += `\n---\nสร้างโดยระบบ CompManager AI Generator`;
      return content;
  }, [data, viewScope, selectedCluster, isGroupAdmin, userClusterID]);

  // --- 2. Prompts Templates ---
  const PROMPTS = {
      infographic: `สร้างโครงร่าง Infographic (Infographic Outline) จากข้อมูล "Source Text" โดยเน้นไฮไลท์เด็ดๆ ดังนี้:
1. พาดหัว: ใช้สถิติ "รายการยอดนิยม" หรือ "90+ Club" มาพาดหัวให้น่าตื่นเต้น
2. Big Numbers: แสดงจำนวนทีมทั้งหมด, เหรียญทองรวม, และจำนวนทีม 90+
3. Charts:
   - กราฟแท่งแสดง 5 อันดับโรงเรียนที่ได้เหรียญทองสูงสุด
   - Pie Chart แสดงสัดส่วนเหรียญรางวัล
4. Hall of Fame: รายชื่อ 3 โรงเรียนที่มี "ประสิทธิภาพสูงสุด (High Efficiency)" เน้นโรงเรียนเล็กแต่เก่ง
5. Battle Zone: ยกตัวอย่าง 1 รายการจากหัวข้อ "สมรภูมิเดือด" มาเล่าเรื่อง
6. Theme: สนุกสนาน, วิชาการ, ทันสมัย (Modern Academic)`,
      
      executive: `เขียนบทสรุปผู้บริหาร (Executive Summary Script) สำหรับกล่าวในที่ประชุม (3 นาที):
1. เปิดด้วยภาพรวมความสำเร็จ (จำนวนทีม, ความคึกคักจากหัวข้อ Popular Activities)
2. ชื่นชมคุณภาพ: กล่าวถึงสถิติ "90+ Club" ว่ามีทีมคุณภาพสูงจำนวนมาก
3. ยกย่องพิเศษ: เอ่ยชมโรงเรียนในหัวข้อ "High Efficiency" ว่าแม้เป็นโรงเรียนขนาดเล็ก/กลาง แต่คุณภาพคับแก้ว
4. วิเคราะห์จุดแข็ง: สรุปหัวข้อ "Category Dominance" ว่าโรงเรียนไหนเก่งด้านใด
5. ภาพรวมเขตพื้นที่: (ถ้ามี) สรุปผลงานของแต่ละกลุ่มเครือข่ายจากหัวข้อ Cluster Ranking
6. ปิดท้ายด้วยวิสัยทัศน์การพัฒนาต่อยอด`,

      news: `เขียนข่าวประชาสัมพันธ์ (Press Release) ลงเว็บไซต์โรงเรียน/เขตพื้นที่:
- พาดหัวข่าว: เน้นความสำเร็จของโรงเรียนเจ้าเหรียญทอง หรือ ความดุเดือดของการแข่งขัน
- Lead: สรุป ใคร ทำอะไร ที่ไหน และตัวเลขสถิติสำคัญ (จากข้อ 1 และ 2)
- Body 1: เจาะลึกผลการแข่งขัน เล่าถึง "สมรภูมิเดือด" ที่คะแนนเฉือนกันนิดเดียว
- Body 2: ชื่นชมโรงเรียนที่มีความสามารถเฉพาะทาง (Category Dominance) และโรงเรียนจิ๋วแต่แจ๋ว (High Efficiency)
- Quote: คำกล่าวแสดงความยินดีจากผู้อำนวยการ (สมมติ)
- Call to Action: เชิญชวนดูผลคะแนนเต็มๆ ที่เว็บไซต์`,

      social: `เขียนแคปชั่น Facebook ให้น่าแชร์ (Viral Style):
🔥 สรุปไฮไลท์งานศิลปหัตถกรรมฯ ปีนี้! 🔥
🏆 โรงเรียนไหนกวาดทองเยอะสุด?
⚡ รายการไหนแข่งเดือดสุด เฉือนกัน 0.xx คะแนน?
🎯 โรงเรียนไหน "จิ๋วแต่แจ๋ว" ส่งน้อยแต่ได้ทองรัวๆ?

ดูสรุปครบจบในโพสต์เดียว! 👇
(แนบข้อมูล Top 5 Schools และ High Efficiency Schools)

#งานศิลปหัตถกรรม #คนเก่งโรงเรียนเรา #CompManager`
  };

  const copyToClipboard = (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold flex items-center">
                    <BrainCircuit className="w-8 h-8 mr-3 text-yellow-300" />
                    Smart Summary & AI Prompts
                </h2>
                <p className="text-indigo-100 text-sm mt-1 max-w-xl">
                    วิเคราะห์ข้อมูลเชิงลึก 8 มิติ (Popularity, Excellence, Battles, Efficiency, Dominance, Clusters, Uncontested) เพื่อสร้างคอนเทนต์คุณภาพสูง
                </p>
            </div>
            
            <div className="flex bg-white/20 p-1 rounded-xl backdrop-blur-md">
                <button
                    onClick={() => { setViewScope('cluster'); if (!isGroupAdmin) setSelectedCluster(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewScope === 'cluster' ? 'bg-white text-indigo-600 shadow' : 'text-white/80 hover:bg-white/10'}`}
                >
                    <LayoutGrid className="w-4 h-4 mr-2" /> ระดับกลุ่มฯ
                </button>
                <button
                    onClick={() => { setViewScope('area'); setSelectedCluster(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewScope === 'area' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'}`}
                >
                    <Trophy className="w-4 h-4 mr-2" /> ระดับเขตฯ
                </button>
            </div>
        </div>

        {/* Filter Bar (Only for Cluster View) */}
        {viewScope === 'cluster' && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap">เจาะจงกลุ่มเครือข่าย:</span>
                <select 
                    className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${isGroupAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    value={selectedCluster}
                    onChange={(e) => setSelectedCluster(e.target.value)}
                    disabled={isGroupAdmin}
                >
                    <option value="">-- แสดงรวมทุกกลุ่ม --</option>
                    {data.clusters.map(c => (
                        <option key={c.ClusterID} value={c.ClusterID}>{c.ClusterName}</option>
                    ))}
                </select>
                {isGroupAdmin && (
                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">
                        ล็อกตามสิทธิ์ของคุณ
                    </span>
                )}
            </div>
        )}

        {/* Step 1: Source Data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-blue-600" /> 
                            1. ข้อมูลดิบเชิงลึก (Advanced Data Source)
                        </h3>
                        <button 
                            onClick={() => copyToClipboard(sourceText, 'source')}
                            className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg font-bold flex items-center transition-all"
                        >
                            {copiedSection === 'source' ? <Check className="w-3 h-3 mr-1 text-green-600"/> : <Copy className="w-3 h-3 mr-1"/>}
                            {copiedSection === 'source' ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูล'}
                        </button>
                    </div>
                    <div className="p-0 flex-1 relative">
                        <textarea 
                            className="w-full h-full min-h-[500px] p-4 text-xs font-mono text-gray-600 bg-gray-50/30 resize-none outline-none leading-relaxed"
                            readOnly
                            value={sourceText}
                        />
                        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur border border-gray-200 p-2 rounded-lg text-[10px] text-gray-500 shadow-sm">
                            {sourceText.length} characters
                        </div>
                    </div>
                    <div className="p-3 bg-blue-50 text-xs text-blue-700 flex items-start border-t border-blue-100">
                        <Sparkles className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                        <div>
                            <strong>AI Ready:</strong> ข้อมูลชุดนี้ถูกจัดรูปแบบให้ NotebookLM เข้าใจง่ายที่สุด คัดลอกไปวางในช่อง "Add Source" ได้เลย
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Prompts */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 flex items-center px-1">
                        <MessageSquare className="w-5 h-5 mr-2 text-purple-600" /> 
                        2. เลือกคำสั่ง (Prompts)
                    </h3>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Updated</span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-purple-300 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><LayoutGrid className="w-4 h-4"/></div>
                            <span className="font-bold text-gray-800 text-sm">Infographic Brief</span>
                        </div>
                        <button onClick={() => copyToClipboard(PROMPTS.infographic, 'prompt-info')} className="text-gray-400 hover:text-purple-600"><Copy className="w-4 h-4"/></button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{PROMPTS.infographic}</p>
                    {copiedSection === 'prompt-info' && <span className="text-[10px] text-green-600 font-bold mt-1 block">คัดลอกคำสั่งแล้ว!</span>}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><MonitorPlay className="w-4 h-4"/></div>
                            <span className="font-bold text-gray-800 text-sm">Executive Script (บทผู้บริหาร)</span>
                        </div>
                        <button onClick={() => copyToClipboard(PROMPTS.executive, 'prompt-exec')} className="text-gray-400 hover:text-blue-600"><Copy className="w-4 h-4"/></button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{PROMPTS.executive}</p>
                    {copiedSection === 'prompt-exec' && <span className="text-[10px] text-green-600 font-bold mt-1 block">คัดลอกคำสั่งแล้ว!</span>}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-green-300 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600"><FileText className="w-4 h-4"/></div>
                            <span className="font-bold text-gray-800 text-sm">Press Release (ข่าวประชาสัมพันธ์)</span>
                        </div>
                        <button onClick={() => copyToClipboard(PROMPTS.news, 'prompt-news')} className="text-gray-400 hover:text-green-600"><Copy className="w-4 h-4"/></button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{PROMPTS.news}</p>
                    {copiedSection === 'prompt-news' && <span className="text-[10px] text-green-600 font-bold mt-1 block">คัดลอกคำสั่งแล้ว!</span>}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-pink-300 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-pink-100 rounded-lg text-pink-600"><Crown className="w-4 h-4"/></div>
                            <span className="font-bold text-gray-800 text-sm">Social Media (Viral Post)</span>
                        </div>
                        <button onClick={() => copyToClipboard(PROMPTS.social, 'prompt-social')} className="text-gray-400 hover:text-pink-600"><Copy className="w-4 h-4"/></button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{PROMPTS.social}</p>
                    {copiedSection === 'prompt-social' && <span className="text-[10px] text-green-600 font-bold mt-1 block">คัดลอกคำสั่งแล้ว!</span>}
                </div>
            </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <Flame className="w-4 h-4 text-orange-500" /> Popular
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <Zap className="w-4 h-4 text-yellow-500" /> 90+ Excellence
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <Target className="w-4 h-4 text-red-500" /> High Efficiency
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Cluster Ranking
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <Ghost className="w-4 h-4 text-purple-500" /> Uncontested
            </div>
        </div>
    </div>
  );
};

export default SummaryGenerator;
