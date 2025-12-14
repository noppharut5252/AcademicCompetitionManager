// --- Google Apps Script Backend ---

const FOLDER_ID = "1T6P3E7K1kWsaEOeO-vZdfrAGwh0dDHwo";

function doGet(e) {
  const action = e.parameter.action;
  
  // If specific action is requested via API
  if (action === 'getData') {
    return ContentService.createTextOutput(JSON.stringify(getCompetitionData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'getUser') {
    const lineId = e.parameter.lineId;
    const user = getUserByLineId(lineId);
    return ContentService.createTextOutput(JSON.stringify(user || {}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Otherwise serve index.html
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('ระบบจัดการการแข่งขัน')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
    // Handle File Uploads or Data Updates here
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
}

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

function getUserByLineId(lineId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    // Headers: "userid","username","password","name","surname","SchoolID","tel","userline_id","level","email","avatarFileId"
    // Assuming userline_id is column index 7 (0-based) based on description
    
    // Find header index just to be safe, or use fixed mapping from prompt
    // Prompt says: Users ... "userid" ... "userline_id" ...
    
    // Skip header
    for(let i=1; i<data.length; i++) {
        if(data[i][7] == lineId) { // userline_id column
            return {
                userid: data[i][0],
                username: data[i][1],
                name: data[i][3],
                surname: data[i][4],
                SchoolID: data[i][5],
                level: data[i][8],
                email: data[i][9],
                avatarFileId: data[i][10]
            };
        }
    }
    return null;
}

function getActivities(ss) {
  const sheet = ss.getSheetByName('Activities');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({
    id: row[0],
    category: row[1],
    name: row[2],
    levels: row[3],
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
  data.shift();
  return data.map(row => ({
    teamId: row[0],
    activityId: row[1],
    teamName: row[2],
    schoolId: row[3],
    level: row[4],
    contact: row[5],
    members: row[6],
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
    SchoolCluster: row[2],
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