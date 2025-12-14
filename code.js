// --- Google Apps Script Backend ---

function doGet(e) {
  // Serve the React App (Assuming index.html is the entry point in GAS deployment)
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('ระบบจัดการการแข่งขัน')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Main API function to get all necessary data for the frontend
 */
function getCompetitionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  return {
    activities: getActivities(ss),
    teams: getTeams(ss),
    schools: getSchools(ss),
    clusters: getClusters(ss),
    files: getFiles(ss)
  };
}

function getActivities(ss) {
  const sheet = ss.getSheetByName('Activities');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  // Remove header row
  data.shift();
  
  return data.map(row => ({
    id: row[0],
    category: row[1],
    name: row[2],
    levels: row[3], // JSON string
    mode: row[4],
    reqTeachers: row[5],
    reqStudents: row[6],
    maxTeams: row[7],
    registrationDeadline: row[8] instanceof Date ? row[8].toISOString() : row[8]
  })).filter(a => a.id);
}

function getTeams(ss) {
  const sheet = ss.getSheetByName('Teams');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove header

  // Mapping based on "Teams (SHEET_TEAMS): ... A:Y (approx)" description
  return data.map(row => ({
    teamId: row[0],
    activityId: row[1],
    teamName: row[2],
    schoolId: row[3],
    level: row[4],
    contact: row[5], // JSON
    members: row[6], // JSON
    reqInfo: row[7],
    status: row[8],
    logoUrl: row[9],
    teamPhotoId: row[10],
    createdBy: row[11],
    statusReason: row[12],
    score: row[13] || 0,
    medalOverride: row[14],
    flag: row[15],
    stageInfo: row[16],
    stageStatus: row[17]
  })).filter(t => t.teamId);
}

function getSchools(ss) {
  const sheet = ss.getSheetByName('Schools');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();

  return data.map(row => ({
    SchoolID: row[0],
    SchoolName: row[1],
    SchoolCluster: row[2], // Reference to ClusterID
    RegistrationMode: row[3],
    AssignedActivities: row[4] ? row[4].toString().split(',') : [] 
  })).filter(s => s.SchoolID);
}

function getClusters(ss) {
  const sheet = ss.getSheetByName('SchoolCluster');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();

  return data.map(row => ({
    ClusterID: row[0],
    ClusterName: row[1]
  })).filter(c => c.ClusterID);
}

function getFiles(ss) {
  const sheet = ss.getSheetByName('Files');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();

  return data.map(row => ({
    FileLogID: row[0],
    TeamID: row[1],
    FileType: row[2],
    Status: row[3],
    FileUrl: row[4],
    Remarks: row[5],
    FileDriveId: row[6]
  })).filter(f => f.FileLogID);
}

// Helper to test locally in GAS editor
function testGetData() {
  Logger.log(JSON.stringify(getCompetitionData()));
}