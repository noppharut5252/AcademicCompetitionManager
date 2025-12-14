import { AppData, User } from '../types';
import { getMockData } from './mockData';

const API_URL = "https://script.google.com/macros/s/AKfycbyYcf6m-3ypN3aX8F6prN0BLQcz0JyW0gj3Tq8dJyMs54gaTXSv_1uytthNu9H4CmMy/exec";

export const fetchData = async (): Promise<AppData> => {
  try {
    // Using POST with 'no-cors' is tricky for reading data. 
    // Standard fetch for GAS JSON API usually uses GET or POST with redirect: follow.
    // For simple public GET:
    const response = await fetch(`${API_URL}?action=getData`, {
      method: 'GET',
      mode: 'cors', // Ensure your GAS script is deployed as "Anyone"
    });

    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Fetching from live API failed, falling back to mock data for demo purposes.", error);
    // Fallback to mock data if API fails (e.g., CORS issues during dev)
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
    return user.userid ? user : null;
   } catch (e) {
       console.error("Error checking user", e);
       return null;
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