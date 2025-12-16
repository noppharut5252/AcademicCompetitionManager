
// Enums mirroring the logic described
export enum TeamStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  WITHDRAWN = 'Withdrawn'
}

export enum RegistrationMode {
  SELF = 'self',
  GROUP_ASSIGNED = 'group_assigned'
}

// Interfaces based on Sheet Columns

export interface SchoolCluster {
  ClusterID: string;
  ClusterName: string;
}

export interface School {
  SchoolID: string;
  SchoolName: string;
  SchoolCluster: string; // ID referencing SchoolCluster
  RegistrationMode: RegistrationMode;
  AssignedActivities: string[]; // List of Activity IDs
}

export interface Activity {
  id: string;
  category: string;
  name: string;
  levels: string; // JSON string of levels e.g. ["G1-3", "G4-6"]
  mode: string;
  reqTeachers: number;
  reqStudents: number;
  maxTeams: number;
  registrationDeadline: string;
}

export interface AreaStageInfo {
  name?: string;     // Area Team Name
  contact?: any;     // Area Contact
  members?: any;     // Area Members
  score?: number;    // Area Score
  rank?: string;     // Area Rank
  medal?: string;    // Area Medal
  note?: string;
}

export interface Team {
  teamId: string;
  activityId: string;
  teamName: string; // Cluster/Area name context
  schoolId: string;
  level: string;
  contact: string; // JSON string
  members: string; // JSON string
  reqInfo: string; // Teacher/Student requirements info
  status: TeamStatus;
  logoUrl: string;
  teamPhotoId: string;
  createdBy: string;
  statusReason: string;
  score: number; // Cluster Round Score
  medalOverride: string; // Manual Medal (Gold/Silver/etc)
  rank: string; // Rank Override (1, 2, 3)
  flag: string; // Representative Flag
  stageInfo: string; // JSON string containing AreaStageInfo (Area Score, etc.)
  stageStatus: string;
  editDeadline?: string; // New field for editing deadline
  lastEditedBy?: string; // New: Who edited last
  lastEditedAt?: string; // New: When edited last
}

export interface User {
  userid: string;
  username: string;
  name: string;
  surname: string;
  SchoolID: string;
  level: string; // e.g., 'admin', 'school_admin', 'user', 'group_admin', 'score', 'area'
  email: string;
  avatarFileId: string;
  isGuest?: boolean;
  assignedActivities?: string[]; // For 'score' role
  pictureUrl?: string; // From LIFF or Avatar
  displayName?: string; // From LIFF
  
  // New fields matching DB columns
  tel?: string;
  userline_id?: string;
}

export interface FileLog {
  FileLogID: string;
  TeamID: string;
  FileType: string;
  Status: string;
  FileUrl: string;
  Remarks: string;
  FileDriveId: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'news' | 'manual';
  link?: string;
  author?: string;
}

// Detailed Schedule Item for a Venue
export interface VenueSchedule {
    activityId: string; // ID of the Activity
    activityName?: string; // Optional: Snapshot of name for easier display
    building: string; // e.g. "อาคาร 5"
    floor: string; // e.g. "ชั้น 2"
    room: string; // e.g. "ห้อง 502"
    date: string; // e.g. "2024-12-25" or "25 ธ.ค. 67"
    timeRange: string; // e.g. "09:00 - 12:00"
    note?: string; // e.g. "ให้นักเรียนเตรียมคอมพิวเตอร์มาเอง"
    level?: 'cluster' | 'area'; // New: Competition Level
    imageUrl?: string; // New: Room/Activity specific image
}

// Venue Interface
export interface Venue {
  id: string;
  name: string;
  description: string;
  locationUrl: string; // Google Maps Link
  facilities: string[]; // JSON string array e.g., ["Parking", "Canteen"]
  imageUrl: string;
  mapImageId?: string;
  contactInfo?: string;
  scheduledActivities: VenueSchedule[]; // JSON string array of schedules
}

// New Interface for Certificate Templates
export interface CertificateSignatory {
  name: string;
  position: string;
  signatureUrl: string;
}

export interface CertificateTemplate {
  id: string; // 'area' or ClusterID
  name: string; // Display name (e.g., "ระดับเขตพื้นที่", "กลุ่มเครือข่าย A")
  backgroundUrl: string; // Full background image
  headerText: string;
  subHeaderText: string;
  eventName?: string; // New: Custom Event Name
  frameStyle?: 'simple-gold' | 'infinite-wave' | 'ornamental-corners' | 'none'; // New: Frame Style
  logoLeftUrl: string;
  logoRightUrl: string;
  signatories: CertificateSignatory[];
  showSignatureLine?: boolean; // New: Toggle dotted line
  dateText: string;
  showRank: boolean;
  
  // New Serial Number Config
  serialFormat?: string; // e.g., "SKP-2024-{run:4}" or "{year}-{id}"
  serialStart?: number; // Starting number for {run}

  // Layout Config (mm)
  contentTop?: number; 
  footerBottom?: number;
  logoHeight?: number;
}

// New Interface for Judges matching requested schema (12 Columns)
export interface Judge {
  id: string; // Virtual ID for React (ActivityID + JudgeName)
  activityId: string;     // Col 0: ActivityID
  clusterKey: string;     // Col 1: ClusterKey
  clusterLabel: string;   // Col 2: ClusterLabel
  schoolId: string;       // Col 3: SchoolID
  schoolName: string;     // Col 4: SchoolName
  judgeName: string;      // Col 5: JudgeName
  role: string;           // Col 6: Role
  phone: string;          // Col 7: Phone
  email: string;          // Col 8: Email
  importedBy: string;     // Col 9: ImportedBy
  importedAt: string;     // Col 10: ImportedAt
  stageScope: 'cluster' | 'area'; // Col 11: StageScope
  photoUrl?: string;      // Col 12: Photo URL (New)
}

export interface AppData {
  activities: Activity[];
  teams: Team[];
  schools: School[];
  clusters: SchoolCluster[];
  files: FileLog[];
  announcements: Announcement[];
  venues: Venue[];
  judges: Judge[];
}


