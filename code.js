
// --- Google Apps Script Backend ---

const FOLDER_ID = "1T6P3E7K1kWsaEOeO-vZdfrAGwh0dDHwo";

function doGet(e) {
  try {
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
    
    // Update Team Result
    if (action === 'updateTeamResult') {
      const teamId = e.parameter.teamId;
      const score = e.parameter.score;
      const rank = e.parameter.rank;
      const medal = e.parameter.medal;
      const flag = e.parameter.flag;
      
      const result = updateTeamResult(teamId, score, rank, medal, flag);
      return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
    }

    // Update Team Status
    if (action === 'updateTeamStatus') {
      const teamId = e.parameter.teamId;
      const status = e.parameter.status;
      const reason = e.parameter.reason || '';
      const deadline = e.parameter.deadline || '';
      
      const result = updateTeamStatus(teamId, status, reason, deadline);
      return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
    }

    // Delete Team
    if (action === 'deleteTeam') {
      const teamId = e.parameter.teamId;
      const result = deleteTeam(teamId);
      return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
    }

    // Update Team Details
    if (action === 'updateTeamDetails') {
      try {
          const payload = JSON.parse(e.postData.contents);
          const result = updateTeamDetails(payload);
          return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      } catch(err) {
          return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Add Announcement
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

    // Get Certificate Config
    if (action === 'getCertConfig') {
       return ContentService.createTextOutput(JSON.stringify(getCertificateConfig()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Delete Venue
    if (action === 'deleteVenue') {
        const id = e.parameter.id;
        const result = deleteVenue(id);
        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Otherwise serve index.html
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('ระบบจัดการการแข่งขัน')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
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

    if (action === 'updateTeamDetails') {
         const payload = JSON.parse(e.postData.contents);
         const result = updateTeamDetails(payload);
         return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateTeamStatus') {
         const payload = JSON.parse(e.postData.contents);
         const result = updateTeamStatus(payload.teamId, payload.status, payload.reason, payload.deadline);
         return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'uploadImage') {
        const payload = JSON.parse(e.postData.contents);
        const result = uploadImageToDrive(payload.image, payload.filename);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveCertConfig') {
        const payload = JSON.parse(e.postData.contents);
        const result = saveCertificateConfig(payload);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveVenue') {
        const payload = JSON.parse(e.postData.contents);
        const result = saveVenue(payload);
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }

    // Default Success
    return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
  
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ... (Existing Functions: getCompetitionData, rowToUser, etc. KEEP THEM) ...

// --- Venue Functions ---

function getVenues(ss) {
    let sheet = ss.getSheetByName('Venues');
    if (!sheet) {
        // Create if not exists
        sheet = ss.insertSheet('Venues');
        sheet.appendRow(['ID', 'Name', 'Description', 'LocationURL', 'ImageURL', 'Facilities', 'Contact', 'ScheduleJSON']);
        return [];
    }
    const data = sheet.getDataRange().getValues();
    // Start from row 2
    const venues = [];
    for (let i = 1; i < data.length; i++) {
        try {
            venues.push({
                id: String(data[i][0]),
                name: String(data[i][1]),
                description: String(data[i][2]),
                locationUrl: String(data[i][3]),
                imageUrl: String(data[i][4]),
                facilities: data[i][5] ? JSON.parse(data[i][5]) : [],
                contactInfo: String(data[i][6]),
                scheduledActivities: data[i][7] ? JSON.parse(data[i][7]) : []
            });
        } catch (e) {
            // Skip invalid row
        }
    }
    return venues;
}

function saveVenue(venue) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Venues');
    if (!sheet) {
        sheet = ss.insertSheet('Venues');
        sheet.appendRow(['ID', 'Name', 'Description', 'LocationURL', 'ImageURL', 'Facilities', 'Contact', 'ScheduleJSON']);
    }
    
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    // Prepare Data
    const rowData = [
        venue.id,
        venue.name,
        venue.description,
        venue.locationUrl,
        venue.imageUrl,
        JSON.stringify(venue.facilities),
        venue.contactInfo,
        JSON.stringify(venue.scheduledActivities)
    ];

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(venue.id)) {
            // Update
            const range = sheet.getRange(i + 1, 1, 1, 8);
            range.setValues([rowData]);
            found = true;
            break;
        }
    }
    
    if (!found) {
        // Add new
        sheet.appendRow(rowData);
    }
    
    return { status: 'success' };
}

function deleteVenue(id) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Venues');
    if (!sheet) return { status: 'error' };
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
            sheet.deleteRow(i + 1);
            return { status: 'success' };
        }
    }
    return { status: 'success' }; // Id not found is success too
}

// --- Certificate Config Functions ---

function getCertificateConfig() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('CertificateConfig');
    if (!sheet) {
        // If not exists, return empty object (handled by frontend default)
        return {}; 
    }
    
    const data = sheet.getDataRange().getValues();
    // Assuming Row 1 is header
    const configs = {};
    for (let i = 1; i < data.length; i++) {
        const id = String(data[i][0]); // ClusterID or 'area'
        const jsonStr = String(data[i][1]);
        try {
            configs[id] = JSON.parse(jsonStr);
        } catch (e) {
            // ignore bad json
        }
    }
    return configs;
}

function saveCertificateConfig(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('CertificateConfig');
    if (!sheet) {
        sheet = ss.insertSheet('CertificateConfig');
        sheet.appendRow(['ID', 'ConfigJSON', 'LastUpdated']);
    }
    
    const id = payload.id;
    const configJson = JSON.stringify(payload.config);
    const timestamp = new Date().toISOString();
    
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
            sheet.getRange(i + 1, 2).setValue(configJson);
            sheet.getRange(i + 1, 3).setValue(timestamp);
            found = true;
            break;
        }
    }
    
    if (!found) {
        sheet.appendRow([id, configJson, timestamp]);
    }
    
    return { status: 'success' };
}

// ... (Rest of existing functions) ...

function getCompetitionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    activities: getActivities(ss),
    teams: getTeams(ss),
    schools: getSchools(ss),
    clusters: getClusters(ss),
    files: getFiles(ss),
    announcements: getAnnouncements(ss),
    venues: getVenues(ss) // Added
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
    const hashedPassword = hashString(password);

    for(let i=1; i<data.length; i++) {
        if(String(data[i][1]) === String(username)) {
            const storedPassword = String(data[i][2]);
            if(storedPassword === String(password) || storedPassword === hashedPassword) {
                const user = rowToUser(data[i]);
                if (user.level === 'score') {
                    user.assignedActivities = getScoreAssignments(ss, user.userid);
                }
                return user;
            }
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
    const level = 'user'; 
    const password = Math.random().toString(36).slice(-8);
    
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
            sheet.getRange(i+1, 4).setValue(userData.name);
            sheet.getRange(i+1, 5).setValue(userData.surname);
            sheet.getRange(i+1, 7).setValue(userData.tel);
            sheet.getRange(i+1, 10).setValue(userData.email);
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'User not found' };
}

function updateTeamResult(teamId, score, rank, medal, flag) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Teams');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(teamId)) {
            sheet.getRange(i+1, 16).setValue(score);
            sheet.getRange(i+1, 17).setValue(medal);
            sheet.getRange(i+1, 18).setValue(rank);
            sheet.getRange(i+1, 19).setValue(flag);
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'Team not found' };
}

function updateTeamStatus(teamId, status, reason, deadline) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Teams');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(teamId)) {
            // Index 9 (Col J) = Status, Index 14 (Col O) = Reason
            sheet.getRange(i+1, 10).setValue(status);
            sheet.getRange(i+1, 15).setValue(reason);
            // Save deadline to Column Z (Index 26)
            if (deadline !== undefined) {
               sheet.getRange(i+1, 26).setValue(deadline);
            }
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'Team not found' };
}

function deleteTeam(teamId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Teams');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(teamId)) {
            sheet.deleteRow(i+1);
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'Team not found' };
}

function updateTeamDetails(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Teams');
    if(!sheet) return { status: 'error', message: 'Sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(payload.teamId)) {
            
            if (payload.isArea) {
                // Update Area Team Name (Col U - 21)
                if(payload.teamName) sheet.getRange(i+1, 21).setValue(payload.teamName);
                // Update Area Contact (Col V - 22)
                if(payload.contact) sheet.getRange(i+1, 22).setValue(payload.contact);
                // Update Area Members (Col W - 23)
                if(payload.members) sheet.getRange(i+1, 23).setValue(payload.members);
            } else {
                // Update Team Name (Col C - 3)
                if(payload.teamName) sheet.getRange(i+1, 3).setValue(payload.teamName);
                // Update Contact JSON (Col F - 6)
                if(payload.contact) sheet.getRange(i+1, 6).setValue(payload.contact);
                // Update Members JSON (Col G - 7)
                if(payload.members) sheet.getRange(i+1, 7).setValue(payload.members);
            }

            // Update Edit History - Col 27 (AA) & 28 (AB)
            if(payload.lastEditedBy) sheet.getRange(i+1, 27).setValue(payload.lastEditedBy);
            if(payload.lastEditedAt) sheet.getRange(i+1, 28).setValue(payload.lastEditedAt);
            
            return { status: 'success' };
        }
    }
    return { status: 'error', message: 'Team not found' };
}

function uploadImageToDrive(base64Data, filename) {
    try {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const data = base64Data.split(',')[1] || base64Data; // Remove 'data:image/jpeg;base64,' if present
        const blob = Utilities.newBlob(Utilities.base64Decode(data), 'image/jpeg', filename || 'upload.jpg');
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        return { 
            status: 'success', 
            fileId: file.getId(), 
            fileUrl: file.getUrl() 
        };
    } catch (e) {
        return { status: 'error', message: e.toString() };
    }
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
        rank: String(row[24] || ""),
        medal: String(row[16] || "") // Adding medal to stageInfo for fallback logic if needed
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
      stageStatus: String(row[19]),
      editDeadline: row[25] instanceof Date ? row[25].toISOString() : String(row[25] || ''), // Col 26 (Z)
      lastEditedBy: String(row[26] || ''), // Col 27 (AA)
      lastEditedAt: row[27] instanceof Date ? row[27].toISOString() : String(row[27] || '') // Col 28 (AB)
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

function hashString(str) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  let txtHash = '';
  for (let j = 0; j < rawHash.length; j++) {
    let hashVal = rawHash[j];
    if (hashVal < 0) {
      hashVal += 256;
    }
    if (hashVal.toString(16).length == 1) {
      txtHash += '0';
    }
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}
