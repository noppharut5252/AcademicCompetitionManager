
import { AppData, User, Team, CertificateTemplate, Venue, Judge, JudgeConfig, Announcement, Attachment } from '../types';
import { getMockData } from './mockData';

const API_URL = "https://script.google.com/macros/s/AKfycbyYcf6m-3ypN3aX8F6prN0BLQcz0JyW0gj3Tq8dJyMs54gaTXSv_1uytthNu9H4CmMy/exec";

export const fetchData = async (): Promise<AppData> => {
  try {
    const response = await fetch(`${API_URL}?action=getData`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const data = await response.json();
    // Ensure arrays exist
    if (!data.venues) data.venues = [];
    if (!data.judges) data.judges = [];
    return data;
  } catch (error) {
    console.warn("Fetching from live API failed, falling back to mock data.", error);
    return getMockData();
  }
};

export const checkUserPermission = async (lineUserId: string): Promise<User | null> => {
   try {
    const response = await fetch(`${API_URL}?action=getUser&lineId=${lineUserId}`, {
        method: 'GET',
        mode: 'cors'
    });
    if (!response.ok) return null;
    const user = await response.json();
    // Verify that we actually got a user object with an ID
    return user.userid ? user : null;
   } catch (e) {
       console.error("Error checking user", e);
       return null;
   }
}

export const loginStandardUser = async (username: string, password: string): Promise<User | null> => {
    try {
        const response = await fetch(`${API_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) return null;
        
        const result = await response.json();
        if (result.status === 'success' && result.user) {
            return result.user;
        }
        return null;
    } catch (e) {
        console.error("Login failed", e);
        return null;
    }
}

export const linkLineAccount = async (userId: string, lineId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=linkLineAccount&userId=${encodeURIComponent(userId)}&lineId=${encodeURIComponent(lineId)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Link LINE failed", e);
        return false;
    }
}

// New API to verify and link based on Email or Phone (Last 5 digits)
export const verifyAndLinkLine = async (lineId: string, key: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
        const response = await fetch(`${API_URL}?action=verifyAndLinkLine`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ lineId, key })
        });
        if (!response.ok) return { success: false, message: 'Network Error' };
        const result = await response.json();
        if (result.status === 'success' && result.user) {
            return { success: true, user: result.user };
        } else {
            return { success: false, message: result.message || 'Verification Failed' };
        }
    } catch (e: any) { return { success: false, message: e.toString() }; }
}

export const registerUser = async (user: Partial<User>): Promise<User | null> => {
    try {
        const response = await fetch(`${API_URL}?action=registerUser`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' }, // Force simple request
            body: JSON.stringify(user)
        });
        
        if (!response.ok) return null;
        const result = await response.json();
        if (result.status === 'success' && result.user) {
            return result.user;
        }
        return null;
    } catch (e) {
        console.error("Registration failed", e);
        return null;
    }
}

export const updateUser = async (user: Partial<User>): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=updateUser`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(user)
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Update failed", e);
        return false;
    }
}

export const updateTeamResult = async (teamId: string, score: number, rank: string, medal: string, flag: string = ''): Promise<boolean> => {
    try {
        // Use GET for simplicity with simple triggers, or POST if large data
        const response = await fetch(`${API_URL}?action=updateTeamResult&teamId=${encodeURIComponent(teamId)}&score=${score}&rank=${encodeURIComponent(rank)}&medal=${encodeURIComponent(medal)}&flag=${encodeURIComponent(flag)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Update Score failed", e);
        return false;
    }
}

export const updateTeamStatus = async (teamId: string, status: string, reason: string = '', deadline: string = ''): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=updateTeamStatus`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' }, // Avoid CORS Preflight
            body: JSON.stringify({ teamId, status, reason, deadline })
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Update Status failed", e);
        return false;
    }
}

export const deleteTeam = async (teamId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=deleteTeam&teamId=${encodeURIComponent(teamId)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Delete Team failed", e);
        return false;
    }
}

export const updateTeamDetails = async (team: any): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=updateTeamDetails`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(team)
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Update Team Details failed", e);
        return false;
    }
}

export const uploadImage = async (base64Image: string, filename: string = 'upload.jpg'): Promise<{ status: 'success' | 'error', fileId?: string, fileUrl?: string, message?: string }> => {
    return uploadFile(base64Image, filename, 'image/jpeg');
}

export const uploadFile = async (base64Data: string, filename: string, mimeType: string): Promise<{ status: 'success' | 'error', fileId?: string, fileUrl?: string, message?: string }> => {
    try {
        const response = await fetch(`${API_URL}?action=uploadFile`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ data: base64Data, filename, mimeType })
        });
        
        if (!response.ok) return { status: 'error', message: 'Network error' };
        return await response.json();
    } catch (e: any) {
        console.error("Upload failed", e);
        return { status: 'error', message: e.toString() };
    }
}

// --- Announcement API ---

export const addAnnouncement = async (title: string, content: string, type: 'news' | 'manual', link: string = '', author: string = 'Admin', clusterId: string = 'area', attachments: Attachment[] = []): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=addAnnouncement`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ title, content, type, link, author, clusterId, attachments })
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Add Announcement failed", e);
        return false;
    }
};

export const updateAnnouncement = async (announcement: Partial<Announcement>): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=updateAnnouncement`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(announcement)
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) { return false; }
};

export const deleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=deleteAnnouncement&id=${encodeURIComponent(id)}`, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) { return false; }
};

export const toggleLikeAnnouncement = async (id: string, userId: string): Promise<{ status: string, likedBy?: string[] }> => {
    try {
        const response = await fetch(`${API_URL}?action=toggleLike&id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) return { status: 'error' };
        return await response.json();
    } catch (e) { return { status: 'error' }; }
}

// --- Certificate Config API ---

export const getCertificateConfig = async (): Promise<Record<string, CertificateTemplate>> => {
    try {
        const response = await fetch(`${API_URL}?action=getCertConfig`, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) return {};
        return await response.json();
    } catch (e) {
        console.error("Failed to get Cert Config", e);
        return {};
    }
};

export const saveCertificateConfig = async (id: string, config: CertificateTemplate): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=saveCertConfig`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ id, config })
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Failed to save Cert Config", e);
        return false;
    }
};

// --- Judge Config API ---

export const getJudgeConfig = async (): Promise<Record<string, JudgeConfig> | null> => {
    try {
        const response = await fetch(`${API_URL}?action=getJudgeConfig`, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error("Failed to get Judge Config", e);
        return null;
    }
};

export const saveJudgeConfig = async (config: JudgeConfig): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=saveJudgeConfig`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ id: config.id, config: config })
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Failed to save Judge Config", e);
        return false;
    }
};

// --- Venues API ---

export const saveVenue = async (venue: Venue): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=saveVenue`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(venue)
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Failed to save Venue", e);
        return false;
    }
};

export const deleteVenue = async (venueId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=deleteVenue&id=${encodeURIComponent(venueId)}`, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Failed to delete Venue", e);
        return false;
    }
};

// --- Judges API ---

export const saveJudge = async (judge: Judge): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=saveJudge`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(judge)
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Failed to save Judge", e);
        return false;
    }
};

export const deleteJudge = async (judgeId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=deleteJudge&id=${encodeURIComponent(judgeId)}`, {
            method: 'GET',
            mode: 'cors'
        });
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Failed to delete Judge", e);
        return false;
    }
};

export const getTeamCountByStatus = (data: AppData) => {
  const counts: Record<string, number> = {};
  data.teams.forEach(team => {
    counts[team.status] = (counts[team.status] || 0) + 1;
  });
  return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
};

export const getTeamsByActivity = (data: AppData) => {
  const counts: Record<string, number> = {};
  data.teams.forEach(team => {
    const activityName = data.activities.find(a => a.id === team.activityId)?.name || team.activityId;
    counts[activityName] = (counts[activityName] || 0) + 1;
  });
  return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
};
