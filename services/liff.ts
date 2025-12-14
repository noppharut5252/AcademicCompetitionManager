
// Wrapper for LINE LIFF SDK

const LIFF_ID = "2006490627-uva5V8Q6";

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
}

export const initLiff = async (): Promise<LiffProfile | null> => {
  try {
    // @ts-ignore
    await liff.init({ liffId: LIFF_ID });
    // @ts-ignore
    if (liff.isLoggedIn()) {
      // @ts-ignore
      const profile = await liff.getProfile();
      // @ts-ignore
      const email = liff.getDecodedIDToken()?.email;
      return { ...profile, email };
    }
    return null;
  } catch (error) {
    console.error("LIFF Initialization failed", error);
    return null;
  }
};

export const loginLiff = () => {
  // @ts-ignore
  if (!liff.isLoggedIn()) {
    // @ts-ignore
    liff.login();
  }
};

export const logoutLiff = () => {
  // @ts-ignore
  if (liff.isLoggedIn()) {
    // @ts-ignore
    liff.logout();
    window.location.reload();
  }
};

export const shareScoreResult = async (
  teamName: string, 
  schoolName: string, 
  activityName: string, 
  score: string | number, 
  medal: string,
  rank: string
) => {
    // @ts-ignore
    if (!liff.isInClient()) {
        alert("ฟีเจอร์นี้ใช้งานได้เฉพาะบนแอปพลิเคชัน LINE เท่านั้น");
        return;
    }

    const medalColor = (medal === 'Gold') ? '#E6B800' : (medal === 'Silver') ? '#A0A0A0' : (medal === 'Bronze') ? '#CD7F32' : '#333333';
    const medalThai = (medal === 'Gold') ? 'เหรียญทอง' : (medal === 'Silver') ? 'เหรียญเงิน' : (medal === 'Bronze') ? 'เหรียญทองแดง' : 'เข้าร่วม';

    const flexMessage = {
        type: "flex",
        altText: `ผลการแข่งขัน: ${teamName}`,
        contents: {
            "type": "bubble",
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "ประกาศผลการแข่งขัน",
                  "weight": "bold",
                  "color": "#1DB446",
                  "size": "xs"
                },
                {
                  "type": "text",
                  "text": activityName,
                  "weight": "bold",
                  "size": "lg",
                  "margin": "md",
                  "wrap": true
                },
                {
                  "type": "separator",
                  "margin": "lg"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "margin": "lg",
                  "spacing": "sm",
                  "contents": [
                    {
                      "type": "text",
                      "text": teamName,
                      "weight": "bold",
                      "size": "md",
                      "wrap": true
                    },
                    {
                      "type": "text",
                      "text": schoolName,
                      "size": "xs",
                      "color": "#666666",
                      "wrap": true
                    }
                  ]
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "text",
                      "text": String(score),
                      "size": "5xl",
                      "weight": "bold",
                      "color": "#333333",
                      "align": "center"
                    },
                    {
                      "type": "text",
                      "text": "คะแนน (Score)",
                      "size": "xxs",
                      "color": "#aaaaaa",
                      "align": "center"
                    }
                  ],
                  "margin": "xl"
                },
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "text",
                      "text": "รางวัล:",
                      "flex": 1,
                      "color": "#555555",
                      "size": "sm"
                    },
                    {
                      "type": "text",
                      "text": medalThai,
                      "flex": 2,
                      "weight": "bold",
                      "align": "end",
                      "color": medalColor,
                      "size": "sm"
                    }
                  ],
                  "margin": "lg"
                },
                rank ? {
                   "type": "box",
                   "layout": "horizontal",
                   "contents": [
                     {
                       "type": "text",
                       "text": "ลำดับที่:",
                       "flex": 1,
                       "color": "#555555",
                       "size": "sm"
                     },
                     {
                       "type": "text",
                       "text": rank,
                       "flex": 2,
                       "weight": "bold",
                       "align": "end",
                       "color": "#333333",
                       "size": "sm"
                     }
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
                    "uri": "https://liff.line.me/" + LIFF_ID
                  }
                }
              ]
            }
          }
    };

    try {
        // @ts-ignore
        if (liff.isApiAvailable('shareTargetPicker')) {
            // @ts-ignore
            await liff.shareTargetPicker([flexMessage]);
        } else {
             // Fallback or alert
             alert("อุปกรณ์ของท่านไม่รองรับการแชร์ข้อความ");
        }
    } catch (error) {
        console.error("Share failed", error);
        alert("เกิดข้อผิดพลาดในการแชร์");
    }
}
