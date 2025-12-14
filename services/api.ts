
import { AppData, User } from '../types';
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

export const registerUser = async (user: Partial<User>): Promise<User | null> => {
    try {
        const response = await fetch(`${API_URL}?action=registerUser`, {
            method: 'POST',
            mode: 'cors', // changed to cors to read response
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
            mode: 'cors', // changed to cors to read response
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

export const updateTeamStatus = async (teamId: string, status: string, reason: string = ''): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}?action=updateTeamStatus&teamId=${encodeURIComponent(teamId)}&status=${encodeURIComponent(status)}&reason=${encodeURIComponent(reason)}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) return false;
        const result = await response.json();
        return result.status === 'success';
    } catch (e) {
        console.error("Update Status failed", e);
        return false;
    }
}

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

