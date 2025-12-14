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
  score: number;
  medalOverride: string;
  flag: string;
  stageInfo: string; // Area stage info
  stageStatus: string;
}

export interface User {
  userid: string;
  username: string;
  name: string;
  surname: string;
  SchoolID: string;
  level: string; // e.g., 'admin', 'school_admin', 'user'
  email: string;
  avatarFileId: string;
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

export interface AppData {
  activities: Activity[];
  teams: Team[];
  schools: School[];
  clusters: SchoolCluster[];
  files: FileLog[];
}