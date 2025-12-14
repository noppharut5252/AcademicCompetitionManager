import { Activity, AppData, FileLog, School, SchoolCluster, Team, TeamStatus, RegistrationMode } from '../types';

export const mockClusters: SchoolCluster[] = [
  { ClusterID: 'C01', ClusterName: 'North Zone' },
  { ClusterID: 'C02', ClusterName: 'Central Zone' },
  { ClusterID: 'C03', ClusterName: 'South Zone' },
];

export const mockSchools: School[] = [
  { SchoolID: 'S001', SchoolName: 'Bangkok High School', SchoolCluster: 'C02', RegistrationMode: RegistrationMode.SELF, AssignedActivities: [] },
  { SchoolID: 'S002', SchoolName: 'Chiang Mai Academy', SchoolCluster: 'C01', RegistrationMode: RegistrationMode.GROUP_ASSIGNED, AssignedActivities: ['ACT001'] },
  { SchoolID: 'S003', SchoolName: 'Phuket Wittaya', SchoolCluster: 'C03', RegistrationMode: RegistrationMode.SELF, AssignedActivities: [] },
];

export const mockActivities: Activity[] = [
  {
    id: 'ACT001',
    category: 'Science',
    name: 'Science Project Competition',
    levels: '["Grade 7-9", "Grade 10-12"]',
    mode: 'Team',
    reqTeachers: 1,
    reqStudents: 3,
    maxTeams: 50,
    registrationDeadline: '2023-12-31'
  },
  {
    id: 'ACT002',
    category: 'Mathematics',
    name: 'Math Olympiad',
    levels: '["Grade 4-6", "Grade 7-9"]',
    mode: 'Individual',
    reqTeachers: 1,
    reqStudents: 1,
    maxTeams: 100,
    registrationDeadline: '2023-11-30'
  },
  {
    id: 'ACT003',
    category: 'Robotics',
    name: 'Line Following Robot',
    levels: '["Grade 10-12"]',
    mode: 'Team',
    reqTeachers: 2,
    reqStudents: 4,
    maxTeams: 20,
    registrationDeadline: '2024-01-15'
  }
];

export const mockTeams: Team[] = [
  {
    teamId: 'T001',
    activityId: 'ACT001',
    teamName: 'Alpha Squad',
    schoolId: 'S001',
    level: 'Grade 10-12',
    contact: '{"phone":"0812345678"}',
    members: '[{"name":"Student A"},{"name":"Student B"},{"name":"Student C"}]',
    reqInfo: 'Complete',
    status: TeamStatus.APPROVED,
    logoUrl: 'https://picsum.photos/100/100',
    teamPhotoId: '',
    createdBy: 'user1',
    statusReason: '',
    score: 85,
    medalOverride: 'Gold',
    flag: '',
    stageInfo: '',
    stageStatus: 'Regional'
  },
  {
    teamId: 'T002',
    activityId: 'ACT001',
    teamName: 'Beta Innovators',
    schoolId: 'S002',
    level: 'Grade 10-12',
    contact: '{"phone":"0898765432"}',
    members: '[{"name":"Student D"},{"name":"Student E"}]',
    reqInfo: 'Pending Docs',
    status: TeamStatus.PENDING,
    logoUrl: '',
    teamPhotoId: '',
    createdBy: 'user2',
    statusReason: 'Waiting for advisor signature',
    score: 0,
    medalOverride: '',
    flag: '',
    stageInfo: '',
    stageStatus: 'Local'
  },
  {
    teamId: 'T003',
    activityId: 'ACT003',
    teamName: 'RoboWarrior',
    schoolId: 'S003',
    level: 'Grade 10-12',
    contact: '{"phone":"0888888888"}',
    members: '[{"name":"Student F"},{"name":"Student G"},{"name":"Student H"},{"name":"Student I"}]',
    reqInfo: 'Complete',
    status: TeamStatus.APPROVED,
    logoUrl: 'https://picsum.photos/101/101',
    teamPhotoId: '',
    createdBy: 'user3',
    statusReason: '',
    score: 92,
    medalOverride: 'Platinum',
    flag: 'Rep',
    stageInfo: '',
    stageStatus: 'National'
  }
];

export const mockFiles: FileLog[] = [
  {
    FileLogID: 'F001',
    TeamID: 'T001',
    FileType: 'ProjectProposal',
    Status: 'Approved',
    FileUrl: '#',
    Remarks: 'Looks good',
    FileDriveId: 'drive_id_1'
  },
  {
    FileLogID: 'F002',
    TeamID: 'T002',
    FileType: 'ParentConsent',
    Status: 'Pending',
    FileUrl: '#',
    Remarks: '',
    FileDriveId: 'drive_id_2'
  }
];

export const getMockData = (): AppData => ({
  activities: mockActivities,
  teams: mockTeams,
  schools: mockSchools,
  clusters: mockClusters,
  files: mockFiles
});