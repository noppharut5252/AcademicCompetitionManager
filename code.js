// --- Google Apps Script Backend ---

const FOLDER_ID = "1T6P3E7K1kWsaEOeO-vZdfrAGwh0dDHwo";

function doGet(e) {
  const action = e.parameter.action;
  
  // Get All Data
  if (action === 'getData') {
    return ContentService.createTextOutput(JSON.stringify(getCompetitionData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get User by LINE ID
  if (action === 'getUser') {
    const lineId = e.parameter.lineId;
    const user = getUserByLineId(lineId);
    return ContentService.createTextOutput(JSON.stringify(user || {}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Login with Username/Password
  if (action === 'login') {
    const username = e.parameter.username;
    const password = e.parameter.password;
    const user = authenticateUser(username, password);
    
    if (user) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', user: user }))
            .setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid credentials' }))
            .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Add Announcement (Admin)
  if (action === 'addAnnouncement') {
    const title = e.parameter.title;
    const content = e.parameter.content;
    const type = e.parameter.type || 'news';
    const link = e.parameter.link || '';
    const author = e.parameter.author || 'Admin';
    
    addAnnouncement(title, content, type, link, author);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
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
    files: getFiles(ss),
    announcements: getAnnouncements(ss)
  };
}

// Helper to get score assignments
function getScoreAssignments(ss, userId) {
    const sheet = ss.getSheetByName('ScoreAssignments');
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    // Headers assumed: "userId","activityIds","updatedAt","updatedBy"
    // Skip header
    for(let i=1; i<data.length; i++) {
        if (String(data[i][0]) === String(userId)) {
            // activityIds (column 1) might be comma separated or JSON
            const raw = data[i][1];
            try {
                // Try JSON first
                return JSON.parse(raw);
            } catch (e) {
                // Fallback to comma separated
                return raw.toString().split(',').map(s => s.trim());
            }
        }
    }
    return [];
}

function authenticateUser(username, password) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][1]) === String(username) && String(data[i][2]) === String(password)) {
            const userId = data[i][0];
            const user = {
                userid: userId,
                username: data[i][1],
                name: data[i][3],
                surname: data[i][4],
                SchoolID: data[i][5],
                level: data[i][8],
                email: data[i][9],
                avatarFileId: data[i][10]
            };
            
            // If user level is 'score', fetch assignments
            if (user.level === 'score') {
                user.assignedActivities = getScoreAssignments(ss, userId);
            }
            
            return user;
        }
    }
    return null;
}

function getUserByLineId(lineId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(data[i][7] == lineId) { 
            const userId = data[i][0];
            const user = {
                userid: userId,
                username: data[i][1],
                name: data[i][3],
                surname: data[i][4],
                SchoolID: data[i][5],
                level: data[i][8],
                email: data[i][9],
                avatarFileId: data[i][10]
            };
            
            if (user.level === 'score') {
                user.assignedActivities = getScoreAssignments(ss, userId);
            }
            return user;
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
    id: String(row[0]),
    category: String(row[1]),
    name: String(row[2]),
    levels: String(row[3]),
    mode: String(row[4]),
    reqTeachers: Number(row[5]) || 0,
    reqStudents: Number(row[6]) || 0,
    maxTeams: Number(row[7]) || 0,
    registrationDeadline: row[8] instanceof Date ? row[8].toISOString() : row[8]
  })).filter(a => a.id);
}

function getTeams(ss) {
  const sheet = ss.getSheetByName('Teams');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  
  // Mapping based on: TeamID, ActivityID, TeamName, School, Level, Contact, Members, RequiredTeachers, RequiredStudents, Status, LogoUrl, TeamPhotoId, CreatedByUserId, CreatedByUsername, StatusReason, ScoreTotal, ScoreManualMedal, RankOverride, RepresentativeOverride, CompetitionStage, AreaTeamName, AreaContact, AreaMembers, AreaScore, AreaRank
  
  return data.map(row => {
    // 0:TeamID, 1:ActivityID, 2:TeamName, 3:School, 4:Level
    // 5:Contact, 6:Members, 7:ReqTeachers, 8:ReqStudents
    // 9:Status, 10:LogoUrl, 11:TeamPhotoId
    // 12:CreatedByUserId, 13:CreatedByUsername
    // 14:StatusReason, 15:ScoreTotal
    // 16:ScoreManualMedal, 17:RankOverride, 18:RepresentativeOverride
    // 19:CompetitionStage
    // 20:AreaTeamName, 21:AreaContact, 22:AreaMembers, 23:AreaScore, 24:AreaRank
    
    const scoreVal = parseFloat(row[15]); 
    const areaScoreVal = parseFloat(row[23]);
    
    const stageInfo = {
        name: String(row[20] || ""),
        contact: String(row[21] || ""),
        members: String(row[22] || ""),
        score: isNaN(areaScoreVal) ? 0 : areaScoreVal,
        rank: String(row[24] || "")
    };

    return {
      teamId: String(row[0]),
      activityId: String(row[1]),
      teamName: String(row[2]),
      schoolId: String(row[3]),
      level: String(row[4]),
      contact: String(row[5]),
      members: String(row[6]),
      reqInfo: `ครู:${row[7]}, นร:${row[8]}`,
      status: String(row[9]),
      logoUrl: String(row[10]),
      teamPhotoId: String(row[11]),
      createdBy: String(row[12]),
      statusReason: String(row[14]), 
      score: isNaN(scoreVal) ? 0 : scoreVal, 
      medalOverride: String(row[16]), // Maps to ScoreManualMedal (e.g., "Gold")
      rank: String(row[17]), // Maps to RankOverride (e.g., "1")
      flag: String(row[18]), // Representative
      stageInfo: JSON.stringify(stageInfo), // Area Info
      stageStatus: String(row[19])
    };
  }).filter(t => t.teamId);
}

function getSchools(ss) {
  const sheet = ss.getSheetByName('Schools');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({
    SchoolID: String(row[0]),
    SchoolName: String(row[1]),
    SchoolCluster: String(row[2]),
    RegistrationMode: String(row[3]),
    AssignedActivities: row[4] ? row[4].toString().split(',') : [] 
  })).filter(s => s.SchoolID);
}

function getClusters(ss) {
  const sheet = ss.getSheetByName('SchoolCluster');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({
    ClusterID: String(row[0]),
    ClusterName: String(row[1])
  })).filter(c => c.ClusterID);
}

function getFiles(ss) {
  const sheet = ss.getSheetByName('Files');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({
    FileLogID: String(row[0]),
    TeamID: String(row[1]),
    FileType: String(row[2]),
    Status: String(row[3]),
    FileUrl: String(row[4]),
    Remarks: String(row[5]),
    FileDriveId: String(row[6])
  })).filter(f => f.FileLogID);
}

function getAnnouncements(ss) {
  let sheet = ss.getSheetByName('Announcements');
  if (!sheet) {
    sheet = ss.insertSheet('Announcements');
    sheet.appendRow(['ID', 'Title', 'Content', 'Date', 'Type', 'Link', 'Author']);
    return [];
  }
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map(row => ({
    id: String(row[0]),
    title: String(row[1]),
    content: String(row[2]),
    date: String(row[3]),
    type: String(row[4]),
    link: String(row[5]),
    author: String(row[6])
  })).filter(a => a.title).reverse(); // Show newest first
}

function addAnnouncement(title, content, type, link, author) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Announcements');
  if (!sheet) {
    sheet = ss.insertSheet('Announcements');
    sheet.appendRow(['ID', 'Title', 'Content', 'Date', 'Type', 'Link', 'Author']);
  }
  const id = 'NEWS' + new Date().getTime();
  const date = new Date().toISOString();
  sheet.appendRow([id, title, content, date, type, link, author]);
}