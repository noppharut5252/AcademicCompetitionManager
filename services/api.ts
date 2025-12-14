import { AppData } from '../types';
import { getMockData } from './mockData';

// In a real implementation, this would point to the Google Apps Script Web App URL
// const API_URL = "https://script.google.com/macros/s/AKfycbyYcf6m-3ypN3aX8F6prN0BLQcz0JyW0gj3Tq8dJyMs54gaTXSv_1uytthNu9H4CmMy/exec";

export const fetchData = async (): Promise<AppData> => {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getMockData());
    }, 800);
  });
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