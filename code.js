
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

  // Link LINE Account
  if (action === 'linkLineAccount') {
    const userId = e.parameter.userId;
    const lineId = e.parameter.lineId;
    const result = linkUserLineId(userId, lineId);
    return ContentService.createTextOutput(JSON.stringify(result))
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

  // Register New User
  if (action === 'registerUser') {
    try {
        const payload = JSON.parse(e.postData.contents);
        const result = registerNewUser(payload);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Update User
  if (action === 'updateUser') {
    try {
        const payload = JSON.parse(e.postData.contents);
        const result = updateUserProfile(payload);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Update Team Result (Score/Rank/Medal)
  if (action === 'updateTeamResult') {
    const teamId = e.parameter.teamId;
    const score = e.parameter.score;
    const rank = e.parameter.rank;
    const medal = e.parameter.medal;
    
    const result = updateTeamResult(teamId, score, rank, medal);
    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
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
    const action = e.parameter.action;
    
    if (action === 'registerUser') {
         const payload = JSON.parse(e.postData.contents);
         const result = registerNewUser(payload);
         return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateUser') {
         const payload = JSON.parse(e.postData.contents);
         const result = updateUserProfile(payload);
         return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    // Default Success
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
    for(let i=1; i<data.length; i++) {
        if (String(data[i][0]) === String(userId)) {
            const raw = data[i][1];
            try {
                return JSON.parse(raw);
            } catch (e) {
                return raw.toString().split(',').map(s => s.trim());
            }
        }
    }
    return [];
}

function rowToUser(row) {
    // Columns: 0:userid, 1:username, 2:password, 3:name, 4:surname, 5:SchoolID, 6:tel, 7:userline_id, 8:level, 9:email, 10:avatarFileId
    return {
        userid: String(row[0]),
        username: String(row[1]),
        name: String(row[3]),
        surname: String(row[4]),
        SchoolID: String(row[5]),
        tel: String(row[6]),
        userline_id: String(row[7]),
        level: String(row[8]),
        email: String(row[9]),
        avatarFileId: String(row[10])
    };
}

function authenticateUser(username, password) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][1]) === String(username) && String(data[i][2]) === String(password)) {
            const user = rowToUser(data[i]);
            if (user.level === 'score') {
                user.assignedActivities = getScoreAssignments(ss, user.userid);
            }
            return user;
        }
    }
    return null;
}

function getUserByLineId(lineId) {
    if (!lineId) return null;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return null;
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        // userline_id is at index 7
        if(String(data[i][7]) === String(lineId)) { 
            const user = rowToUser(data[i]);
            if (user.level === 'score') {
                user.assignedActivities = getScoreAssignments(ss, user.userid);
            }
            return user;
        }
    }
    return null;
}

function linkUserLineId(userId, lineId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(userId)) {
            // Update userline_id at index 7 (column H, so row i+1, col 8)
            sheet.getRange(i+1, 8).setValue(lineId);
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'User not found' };
}

function registerNewUser(userData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const newId = 'U' + new Date().getTime();
    // Default values
    const level = 'user'; 
    const password = Math.random().toString(36).slice(-8); // Random password for LINE users
    
    // Columns: 0:userid, 1:username, 2:password, 3:name, 4:surname, 5:SchoolID, 6:tel, 7:userline_id, 8:level, 9:email, 10:avatarFileId
    sheet.appendRow([
        newId,
        userData.username || newId,
        password,
        userData.name,
        userData.surname,
        userData.SchoolID,
        userData.tel,
        userData.userline_id,
        level,
        userData.email,
        ''
    ]);
    
    // Return the newly created user
    return { 
        status: 'success', 
        user: {
            userid: newId,
            username: userData.username || newId,
            name: userData.name,
            surname: userData.surname,
            SchoolID: userData.SchoolID,
            tel: userData.tel,
            userline_id: userData.userline_id,
            level: level,
            email: userData.email,
            avatarFileId: ''
        }
    };
}

function updateUserProfile(userData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(userData.userid)) {
            // Update specific columns
            // 3:name, 4:surname, 6:tel, 9:email
            sheet.getRange(i+1, 4).setValue(userData.name);
            sheet.getRange(i+1, 5).setValue(userData.surname);
            sheet.getRange(i+1, 7).setValue(userData.tel);
            sheet.getRange(i+1, 10).setValue(userData.email);
            
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'User not found' };
}

function updateTeamResult(teamId, score, rank, medal) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Teams');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(teamId)) {
            // Columns are 1-based in getRange, but we are updating:
            // Score is Index 15 (Col P) -> 16
            // MedalOverride is Index 16 (Col Q) -> 17
            // Rank is Index 17 (Col R) -> 18
            
            sheet.getRange(i+1, 16).setValue(score);
            sheet.getRange(i+1, 17).setValue(medal);
            sheet.getRange(i+1, 18).setValue(rank);
            
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'Team not found' };
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
  
  return data.map(row => {
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
      medalOverride: String(row[16]), 
      rank: String(row[17]), 
      flag: String(row[18]), 
      stageInfo: JSON.stringify(stageInfo), 
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
  })).filter(a => a.title).reverse(); 
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
