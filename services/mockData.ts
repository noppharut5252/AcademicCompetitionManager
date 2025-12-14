import { Activity, AppData, FileLog, School, SchoolCluster, Team, TeamStatus, RegistrationMode, Announcement } from '../types';

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
    rank: '1',
    flag: 'TRUE',
    stageInfo: '{"score": 90, "rank": "Gold", "name": "Alpha Squad (Area Rep)"}',
    stageStatus: 'Area'
  },
  {
    teamId: 'T002',
    activityId: 'ACT001',
    teamName: 'Beta Innovators',
    schoolId: 'S002',
    level: 'Grade 10-12',
    contact: '{"phone":"0898765432"}',
    members: '[{"name":"Student X"},{"name":"Student Y"}]',
    reqInfo: 'Pending',
    status: TeamStatus.PENDING,
    logoUrl: '',
    teamPhotoId: '',
    createdBy: 'user2',
    statusReason: '',
    score: 0,
    medalOverride: '',
    rank: '',
    flag: '',
    stageInfo: '',
    stageStatus: ''
  }
];

export const mockFiles: FileLog[] = [
    {
        FileLogID: 'F001',
        TeamID: 'T001',
        FileType: 'Project Report',
        Status: 'Approved',
        FileUrl: '#',
        Remarks: 'Good',
        FileDriveId: ''
    }
];

export const mockAnnouncements: Announcement[] = [
    {
        id: '1',
        title: 'ยินดีต้อนรับสู่การแข่งขันประจำปี',
        content: 'ระบบเปิดให้ลงทะเบียนแล้ววันนี้ ท่านสามารถตรวจสอบรายการแข่งขันและสมัครเข้าร่วมได้ทันที',
        date: new Date().toISOString(),
        type: 'news',
        author: 'Admin'
    },
    {
        id: '2',
        title: 'คู่มือการใช้งานระบบสำหรับโรงเรียน',
        content: 'ศึกษาวิธีการใช้งานระบบ การเพิ่มข้อมูลทีม และการตรวจสอบสถานะ',
        date: new Date(Date.now() - 86400000).toISOString(),
        type: 'manual',
        link: '#',
        author: 'Admin'
    }
];

export const getMockData = (): AppData => {
  return {
    activities: mockActivities,
    teams: mockTeams,
    schools: mockSchools,
    clusters: mockClusters,
    files: mockFiles,
    announcements: mockAnnouncements
  };
};