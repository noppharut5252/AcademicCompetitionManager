
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
  logoLeftUrl: string;
  logoRightUrl: string;
  signatories: CertificateSignatory[];
  showSignatureLine?: boolean; // New: Toggle dotted line
  dateText: string;
  showRank: boolean;
  
  // New Serial Number Config
  serialFormat?: string; // e.g., "SKP-2024-{run:4}" or "{year}-{id}"
  serialStart?: number; // Starting number for {run}
}

export interface AppData {
  activities: Activity[];
  teams: Team[];
  schools: School[];
  clusters: SchoolCluster[];
  files: FileLog[];
  announcements: Announcement[];
}

