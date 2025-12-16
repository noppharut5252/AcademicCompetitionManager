
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

// --- Helper: Check sharing capability ---
const canUseShareTargetPicker = () => {
    // @ts-ignore
    return typeof liff !== 'undefined' && liff.isLoggedIn() && liff.isInClient() && liff.isApiAvailable('shareTargetPicker');
};

export const shareIdCard = async (
    teamName: string,
    schoolName: string,
    memberName: string,
    role: string,
    teamId: string,
    imageUrl: string,
    levelText: string,
    viewLevel: string = 'cluster'
): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    
    await ensureLiffInitialized();

    const appUrl = `${window.location.origin}${window.location.pathname}#/idcards?id=${teamId}&level=${viewLevel}`;
    const roleText = role === 'Teacher' ? 'ครูผู้ฝึกสอน (Trainer)' : 'ผู้เข้าแข่งขัน (Competitor)';
    const headerColor = role === 'Teacher' ? '#4F46E5' : '#10B981'; 

    if (canUseShareTargetPicker()) {
        const flexMessage = {
            type: "flex",
            altText: `Digital ID: ${memberName}`,
            contents: {
                "type": "bubble",
                "size": "mega",
                "header": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    { "type": "text", "text": "DIGITAL ID CARD", "color": "#ffffff", "align": "start", "size": "xs", "gravity": "center", "weight": "bold", "letterSpacing": "2px" },
                    { "type": "text", "text": levelText, "color": "#ffffff", "align": "start", "size": "xxs", "gravity": "center", "alpha": 0.8 }
                  ],
                  "backgroundColor": headerColor,
                  "paddingTop": "15px",
                  "paddingAll": "15px",
                  "paddingBottom": "35px"
                },
                "body": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "horizontal",
                      "contents": [
                        {
                          "type": "box",
                          "layout": "vertical",
                          "contents": [
                            { "type": "image", "url": imageUrl, "aspectMode": "cover", "size": "full" }
                          ],
                          "cornerRadius": "100px",
                          "width": "80px",
                          "height": "80px",
                          "borderWidth": "3px",
                          "borderColor": "#ffffff"
                        }
                      ],
                      "justifyContent": "center",
                      "offsetTop": "-60px"
                    },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        { "type": "text", "text": memberName, "align": "center", "weight": "bold", "size": "xl", "color": "#111111", "wrap": true },
                        { "type": "text", "text": roleText, "align": "center", "size": "xs", "color": "#999999", "margin": "xs" }
                      ],
                      "offsetTop": "-45px"
                    },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        {
                          "type": "box",
                          "layout": "vertical",
                          "contents": [
                            { "type": "text", "text": "โรงเรียน / School", "size": "xxs", "color": "#aaaaaa" },
                            { "type": "text", "text": schoolName, "size": "sm", "color": "#333333", "wrap": true, "weight": "bold" }
                          ],
                          "margin": "md"
                        },
                        {
                          "type": "box",
                          "layout": "vertical",
                          "contents": [
                            { "type": "text", "text": "ทีม / Team", "size": "xxs", "color": "#aaaaaa" },
                            { "type": "text", "text": teamName, "size": "sm", "color": "#333333", "wrap": true, "weight": "bold" }
                          ],
                          "margin": "md"
                        }
                      ],
                      "paddingAll": "15px",
                      "backgroundColor": "#f7f9fc",
                      "cornerRadius": "10px",
                      "offsetTop": "-20px"
                    }
                  ],
                  "paddingAll": "0px"
                },
                "footer": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "button",
                      "action": { "type": "uri", "label": "เปิดบัตรประจำตัว", "uri": appUrl },
                      "style": "primary",
                      "color": headerColor,
                      "height": "sm"
                    }
                  ],
                  "paddingAll": "15px"
                }
              }
        };

        try {
            // @ts-ignore
            await liff.shareTargetPicker([flexMessage]);
            return { success: true, method: 'line' };
        } catch (error) {
            console.error("LINE Share ID failed", error);
        }
    }

    // Fallback: Web Share
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Digital ID Card',
                text: `${memberName} - ${teamName}`,
                url: appUrl,
            });
            return { success: true, method: 'share' };
        } catch (error) { console.log("Web Share cancelled"); }
    }

    // Fallback: Copy Link
    try {
        await navigator.clipboard.writeText(appUrl);
        return { success: true, method: 'copy' };
    } catch (err) {
        return { success: false, method: 'error' };
    }
}

export const shareScoreResult = async (
  teamName: string, 
  schoolName: string, 
  activityName: string, 
  score: string | number, 
  medal: string,
  rank: string
): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    
    await ensureLiffInitialized();

    const medalThai = (medal === 'Gold') ? 'เหรียญทอง' : (medal === 'Silver') ? 'เหรียญเงิน' : (medal === 'Bronze') ? 'เหรียญทองแดง' : 'เข้าร่วม';
    const rankText = rank ? ` (ลำดับที่ ${rank})` : '';
    const displayTeamName = (teamName && teamName.trim() !== '') ? teamName : schoolName || 'ไม่ระบุชื่อทีม';
    const textSummary = `🏆 ผลการแข่งขัน: ${activityName}\nทีม: ${displayTeamName}\nโรงเรียน: ${schoolName}\n\n⭐ คะแนน: ${score}\n🏅 รางวัล: ${medalThai}${rankText}`;

    if (canUseShareTargetPicker()) {
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
                      "action": { "type": "uri", "label": "ดูรายละเอียดเพิ่มเติม", "uri": window.location.href }
                    }
                  ]
                }
              }
        };

        try {
            // @ts-ignore
            await liff.shareTargetPicker([flexMessage]);
            return { success: true, method: 'line' };
        } catch (error) { console.error("LINE Share failed", error); }
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'ผลการแข่งขัน',
                text: textSummary,
                url: window.location.href,
            });
            return { success: true, method: 'share' };
        } catch (error) { console.log("Web Share cancelled/failed"); }
    }

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

    let textSummary = `🏆 สรุปผลการแข่งขัน (Top 3)\nรายการ: ${activityName}\n\n`;
    winners.forEach(w => {
        const displayTeam = (w.teamName && w.teamName.trim() !== '') ? w.teamName : w.schoolName || 'ไม่ระบุชื่อทีม';
        textSummary += `${w.rank}. ${displayTeam} (${w.score} คะแนน)\n`;
    });

    if (canUseShareTargetPicker()) {
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

export const shareVenue = async (venue: any): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    await ensureLiffInitialized();
    
    const appUrl = `${window.location.origin}${window.location.pathname}#/venues`;
    const mapUrl = venue.locationUrl || '';
    const imageUrl = venue.imageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80";
    const textSummary = `📍 สนามแข่งขัน: ${venue.name}\n${venue.description || ''}\n\n🗺️ แผนที่: ${mapUrl}\n📅 ดูตารางการแข่งขัน: ${appUrl}`;

    if (canUseShareTargetPicker()) {
        const flexMessage = {
            type: "flex",
            altText: `สนามแข่งขัน: ${venue.name}`,
            contents: {
                "type": "bubble",
                "hero": {
                  "type": "image",
                  "url": imageUrl,
                  "size": "full",
                  "aspectRatio": "20:13",
                  "aspectMode": "cover",
                  "action": { "type": "uri", "uri": appUrl }
                },
                "body": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    { "type": "text", "text": venue.name, "weight": "bold", "size": "xl", "wrap": true },
                    { "type": "text", "text": venue.description || "รายละเอียดสนามแข่งขัน", "size": "sm", "color": "#666666", "wrap": true, "margin": "md" },
                    {
                      "type": "box",
                      "layout": "vertical",
                      "margin": "lg",
                      "spacing": "sm",
                      "contents": [
                        {
                          "type": "box",
                          "layout": "baseline",
                          "spacing": "sm",
                          "contents": [
                            { "type": "text", "text": "สถานที่", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                            { "type": "text", "text": "คลิกดูแผนที่ GPS", "wrap": true, "color": "#666666", "size": "sm", "flex": 4, "action": { "type": "uri", "label": "Map", "uri": mapUrl || appUrl } }
                          ]
                        }
                      ]
                    }
                  ]
                },
                "footer": {
                  "type": "box",
                  "layout": "vertical",
                  "spacing": "sm",
                  "contents": [
                    { "type": "button", "style": "primary", "height": "sm", "action": { "type": "uri", "label": "ดูตารางแข่งขัน", "uri": appUrl }, "color": "#2563EB" },
                    mapUrl ? { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "นำทาง (Google Maps)", "uri": mapUrl } } : { "type": "spacer", "size": "xs" }
                  ],
                  "flex": 0
                }
              }
        };

        try {
            // @ts-ignore
            await liff.shareTargetPicker([flexMessage]);
            return { success: true, method: 'line' };
        } catch (error) { console.error("LINE Share Venue failed", error); }
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: venue.name,
                text: textSummary,
                url: appUrl,
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

// New: Share Specific Schedule
export const shareSchedule = async (
    activityName: string,
    venueName: string,
    room: string,
    date: string,
    time: string,
    locationUrl: string = ''
): Promise<{ success: boolean; method: 'line' | 'share' | 'copy' | 'error' }> => {
    
    await ensureLiffInitialized();

    const appUrl = `${window.location.origin}${window.location.pathname}#/venues`;
    const displayRoom = room || 'ยังไม่ระบุห้อง';
    const displayTime = time || 'ยังไม่ระบุเวลา';
    const displayDate = date || 'ยังไม่ระบุวันที่';
    
    const textSummary = `📅 กำหนดการแข่งขัน\n${activityName}\n\n📍 สถานที่: ${venueName} ${displayRoom}\n🗓️ วันที่: ${displayDate}\n⏰ เวลา: ${displayTime}\n\nดูรายละเอียดเพิ่มเติม: ${appUrl}`;

    if (canUseShareTargetPicker()) {
        const flexMessage = {
            type: "flex",
            altText: `กำหนดการ: ${activityName}`,
            contents: {
                "type": "bubble",
                "header": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        { "type": "text", "text": "SCHEDULE", "color": "#FFFFFF", "weight": "bold", "size": "xs", "letterSpacing": "1px" },
                        { "type": "text", "text": "กำหนดการแข่งขัน", "color": "#FFFFFF", "weight": "bold", "size": "lg" }
                    ],
                    "backgroundColor": "#0D9488",
                    "paddingAll": "20px"
                },
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        { "type": "text", "text": activityName, "weight": "bold", "size": "md", "wrap": true, "color": "#333333" },
                        { "type": "separator", "margin": "lg" },
                        {
                            "type": "box",
                            "layout": "vertical",
                            "margin": "lg",
                            "spacing": "sm",
                            "contents": [
                                {
                                    "type": "box",
                                    "layout": "baseline",
                                    "spacing": "sm",
                                    "contents": [
                                        { "type": "text", "text": "วันที่", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                        { "type": "text", "text": displayDate, "wrap": true, "color": "#666666", "size": "sm", "flex": 4, "weight": "bold" }
                                    ]
                                },
                                {
                                    "type": "box",
                                    "layout": "baseline",
                                    "spacing": "sm",
                                    "contents": [
                                        { "type": "text", "text": "เวลา", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                        { "type": "text", "text": displayTime, "wrap": true, "color": "#E65100", "size": "sm", "flex": 4, "weight": "bold" }
                                    ]
                                },
                                {
                                    "type": "box",
                                    "layout": "baseline",
                                    "spacing": "sm",
                                    "contents": [
                                        { "type": "text", "text": "สถานที่", "color": "#aaaaaa", "size": "sm", "flex": 1 },
                                        { "type": "text", "text": `${venueName} ${displayRoom}`, "wrap": true, "color": "#666666", "size": "sm", "flex": 4 }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                "footer": {
                    "type": "box",
                    "layout": "vertical",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "primary",
                            "height": "sm",
                            "action": { "type": "uri", "label": "ดูตารางทั้งหมด", "uri": appUrl },
                            "color": "#0D9488"
                        },
                        locationUrl ? {
                            "type": "button",
                            "style": "link",
                            "height": "sm",
                            "action": { "type": "uri", "label": "แผนที่ (Google Maps)", "uri": locationUrl }
                        } : { "type": "spacer", "size": "xs" }
                    ]
                }
            }
        };

        try {
            // @ts-ignore
            await liff.shareTargetPicker([flexMessage]);
            return { success: true, method: 'line' };
        } catch (error) { console.error("LINE Share Schedule failed", error); }
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: `กำหนดการ: ${activityName}`,
                text: textSummary,
                url: appUrl,
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

