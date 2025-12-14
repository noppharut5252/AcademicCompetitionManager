
// Wrapper for LINE LIFF SDK

const LIFF_ID = "2006490627-uva5V8Q6";

let liffInitPromise: Promise<void> | null = null;

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
}

const ensureLiffInitialized = async () => {
    if (!liffInitPromise) {
        liffInitPromise = (async () => {
            try {
                // @ts-ignore
                if (typeof liff === 'undefined') {
                    console.warn("LIFF SDK not loaded");
                    return;
                }
                // @ts-ignore
                await liff.init({ liffId: LIFF_ID });
            } catch (error) {
                console.error("LIFF Initialization failed", error);
            }
        })();
    }
    await liffInitPromise;
};

export const initLiff = async (): Promise<LiffProfile | null> => {
  await ensureLiffInitialized();
  try {
    // @ts-ignore
    if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
      // @ts-ignore
      const profile = await liff.getProfile();
      // @ts-ignore
      const email = liff.getDecodedIDToken()?.email;
      return { ...profile, email };
    }
    return null;
  } catch (error) {
    console.error("Error getting LIFF profile", error);
    return null;
  }
};

export const loginLiff = () => {
  // @ts-ignore
  if (typeof liff !== 'undefined' && !liff.isLoggedIn()) {
    // @ts-ignore
    liff.login();
  }
};

export const logoutLiff = async () => {
  await ensureLiffInitialized();
  try {
      // @ts-ignore
      if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
        // @ts-ignore
        liff.logout();
      }
  } catch (e) {
      console.warn("LIFF logout error", e);
  }
  // Always reload to clear app state
  window.location.reload();
};

export const shareScoreResult = async (
  teamName: string, 
  schoolName: string, 
  activityName: string, 
  score: string | number, 
  medal: string,
  rank: string
): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    
    // Ensure LIFF is ready before checking availability
    await ensureLiffInitialized();

    const medalThai = (medal === 'Gold') ? 'เหรียญทอง' : (medal === 'Silver') ? 'เหรียญเงิน' : (medal === 'Bronze') ? 'เหรียญทองแดง' : 'เข้าร่วม';
    const rankText = rank ? ` (ลำดับที่ ${rank})` : '';
    
    // Fallback for missing team name
    const displayTeamName = (teamName && teamName.trim() !== '') ? teamName : schoolName || 'ไม่ระบุชื่อทีม';
    
    const textSummary = `🏆 ผลการแข่งขัน: ${activityName}\nทีม: ${displayTeamName}\nโรงเรียน: ${schoolName}\n\n⭐ คะแนน: ${score}\n🏅 รางวัล: ${medalThai}${rankText}`;

    // 1. Try LINE Flex Message
    // @ts-ignore
    if (typeof liff !== 'undefined' && liff.isLoggedIn() && liff.isApiAvailable('shareTargetPicker')) {
        const medalColor = (medal === 'Gold') ? '#E6B800' : (medal === 'Silver') ? '#A0A0A0' : (medal === 'Bronze') ? '#CD7F32' : '#333333';
        
        const flexMessage = {
            type: "flex",
            altText: `ผลการแข่งขัน: ${displayTeamName}`,
            contents: {
                "type": "bubble",
                "body": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    { "type": "text", "text": "ประกาศผลการแข่งขัน", "weight": "bold", "color": "#1DB446", "size": "xs" },
                    { "type": "text", "text": activityName, "weight": "bold", "size": "lg", "margin": "md", "wrap": true },
                    { "type": "separator", "margin": "lg" },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "margin": "lg",
                      "spacing": "sm",
                      "contents": [
                        { "type": "text", "text": displayTeamName, "weight": "bold", "size": "md", "wrap": true },
                        { "type": "text", "text": schoolName || '-', "size": "xs", "color": "#666666", "wrap": true }
                      ]
                    },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        { "type": "text", "text": String(score), "size": "5xl", "weight": "bold", "color": "#333333", "align": "center" },
                        { "type": "text", "text": "คะแนน (Score)", "size": "xxs", "color": "#aaaaaa", "align": "center" }
                      ],
                      "margin": "xl"
                    },
                    {
                      "type": "box",
                      "layout": "horizontal",
                      "contents": [
                        { "type": "text", "text": "รางวัล:", "flex": 1, "color": "#555555", "size": "sm" },
                        { "type": "text", "text": medalThai, "flex": 2, "weight": "bold", "align": "end", "color": medalColor, "size": "sm" }
                      ],
                      "margin": "lg"
                    },
                    rank ? {
                       "type": "box",
                       "layout": "horizontal",
                       "contents": [
                         { "type": "text", "text": "ลำดับที่:", "flex": 1, "color": "#555555", "size": "sm" },
                         { "type": "text", "text": rank, "flex": 2, "weight": "bold", "align": "end", "color": "#333333", "size": "sm" }
                       ],
                       "margin": "sm"
                    } : { "type": "spacer", "size": "xs" }
                  ]
                },
                "footer": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "button",
                      "style": "link",
                      "height": "sm",
                      "action": {
                        "type": "uri",
                        "label": "ดูรายละเอียดเพิ่มเติม",
                        "uri": window.location.href
                      }
                    }
                  ]
                }
              }
        };

        try {
            // @ts-ignore
            await liff.shareTargetPicker([flexMessage]);
            return { success: true, method: 'line' };
        } catch (error) {
            console.error("LINE Share failed", error);
            // Fallback to Web Share logic below
        }
    }

    // 2. Try Web Share API (Mobile Browsers)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'ผลการแข่งขัน',
                text: textSummary,
                url: window.location.href,
            });
            return { success: true, method: 'share' };
        } catch (error) {
            console.log("Web Share cancelled/failed");
        }
    }

    // 3. Fallback: Copy to Clipboard
    try {
        await navigator.clipboard.writeText(textSummary);
        return { success: true, method: 'copy' };
    } catch (err) {
        return { success: false, method: 'error' };
    }
}

export const shareTop3Result = async (
  activityName: string,
  winners: { rank: number; teamName: string; schoolName: string; score: string; medal: string }[]
): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    
    await ensureLiffInitialized();

    // Construct Text Summary for Fallback
    let textSummary = `🏆 สรุปผลการแข่งขัน (Top 3)\nรายการ: ${activityName}\n\n`;
    winners.forEach(w => {
        const displayTeam = (w.teamName && w.teamName.trim() !== '') ? w.teamName : w.schoolName || 'ไม่ระบุชื่อทีม';
        textSummary += `${w.rank}. ${displayTeam} (${w.score} คะแนน)\n`;
    });

    // @ts-ignore
    if (typeof liff !== 'undefined' && liff.isLoggedIn() && liff.isApiAvailable('shareTargetPicker')) {
        
        const createRankRow = (winner: any) => {
             const color = winner.rank === 1 ? '#E6B800' : winner.rank === 2 ? '#A0A0A0' : '#CD7F32';
             const displayTeam = (winner.teamName && winner.teamName.trim() !== '') ? winner.teamName : winner.schoolName || 'ไม่ระบุชื่อทีม';
             return {
                "type": "box",
                "layout": "vertical",
                "margin": "md",
                "contents": [
                  {
                    "type": "box",
                    "layout": "baseline",
                    "contents": [
                      { "type": "text", "text": `${winner.rank}`, "flex": 1, "color": color, "weight": "bold", "size": "xl" },
                      { "type": "text", "text": displayTeam, "flex": 5, "weight": "bold", "size": "sm", "wrap": true },
                      { "type": "text", "text": `${winner.score}`, "flex": 2, "align": "end", "weight": "bold", "color": "#1DB446" }
                    ]
                  },
                  {
                    "type": "text",
                    "text": winner.schoolName || '-',
                    "size": "xs",
                    "color": "#aaaaaa",
                    "margin": "none",
                    "offsetStart": "30px"
                  }
                ]
             };
        };

        const rows = winners.map(w => createRankRow(w));
        
        const flexMessage = {
            type: "flex",
            altText: `สรุปผล Top 3: ${activityName}`,
            contents: {
                "type": "bubble",
                "header": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                    { "type": "text", "text": "สรุปผลการแข่งขัน (TOP 3)", "color": "#FFFFFF", "weight": "bold" }
                    ],
                    "backgroundColor": "#007AFF",
                    "paddingAll": "lg"
                },
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        { "type": "text", "text": activityName, "weight": "bold", "size": "md", "wrap": true, "margin": "md" },
                        { "type": "separator", "margin": "lg" },
                        ...rows,
                        { "type": "separator", "margin": "lg" },
                         { "type": "text", "text": "ดูผลการแข่งขันทั้งหมดได้ที่เว็บไซต์", "size": "xs", "color": "#aaaaaa", "align": "center", "margin": "lg" }
                    ]
                },
                "footer": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "button",
                            "style": "link",
                            "height": "sm",
                            "action": { "type": "uri", "label": "เปิดระบบ", "uri": window.location.href }
                        }
                    ]
                }
            }
        };

        try {
            // @ts-ignore
            await liff.shareTargetPicker([flexMessage]);
            return { success: true, method: 'line' };
        } catch (error) {
            console.error("LINE Share Top 3 failed", error);
        }
    }

    // Fallbacks
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'สรุปผล Top 3',
                text: textSummary,
                url: window.location.href,
            });
            return { success: true, method: 'share' };
        } catch (error) { console.log("Web Share cancelled"); }
    }

    try {
        await navigator.clipboard.writeText(textSummary);
        return { success: true, method: 'copy' };
    } catch (err) {
        return { success: false, method: 'error' };
    }
}

