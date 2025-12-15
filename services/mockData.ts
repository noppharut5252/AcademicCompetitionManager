
import { Activity, AppData, FileLog, School, SchoolCluster, Team, TeamStatus, RegistrationMode, Announcement, Venue } from '../types';

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

export const mockVenues: Venue[] = [
    {
        id: 'V001',
        name: 'อาคารเฉลิมพระเกียรติ (Main Hall)',
        description: 'ศูนย์กลางการจัดการแข่งขันและพิธีเปิด-ปิด รองรับผู้เข้าร่วมได้ 500 คน มีที่จอดรถกว้างขวาง',
        locationUrl: 'https://maps.google.com/?q=Grand+Palace+Bangkok',
        facilities: ['ห้องแอร์', 'ที่จอดรถ', 'ห้องน้ำสะอาด', 'จุดปฐมพยาบาล'],
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        contactInfo: 'ครูสมชาย 081-111-2222',
        scheduledActivities: [
            {
                activityId: 'ACT001',
                activityName: 'Science Project Competition',
                building: 'อาคาร 1',
                floor: 'ชั้น 2',
                room: 'ห้องประชุมใหญ่',
                date: '2024-12-25',
                timeRange: '09:00 - 12:00',
                note: 'ลงทะเบียนหน้างานก่อน 08:30'
            },
            {
                activityId: 'ACT002',
                activityName: 'Math Olympiad',
                building: 'อาคาร 1',
                floor: 'ชั้น 3',
                room: 'ห้อง 301-305',
                date: '2024-12-25',
                timeRange: '13:00 - 16:00',
                note: 'ห้ามนำเครื่องคิดเลขเข้าห้องสอบ'
            }
        ]
    },
    {
        id: 'V002',
        name: 'โรงยิมเนเซียม A (Gym A)',
        description: 'สนามแข่งขันหุ่นยนต์และเครื่องบินพลังยาง พื้นที่กว้างขวาง เพดานสูง',
        locationUrl: 'https://maps.google.com/?q=Lumphini+Park',
        facilities: ['โรงอาหารใกล้เคียง', 'อัฒจันทร์', 'พัดลมไอเย็น'],
        imageUrl: 'https://images.unsplash.com/photo-1541252260732-48719595c771?auto=format&fit=crop&w=800&q=80',
        contactInfo: 'ครูวิชัย 089-999-8888',
        scheduledActivities: [
            {
                activityId: 'ACT003',
                activityName: 'Line Following Robot',
                building: 'โรงยิม',
                floor: 'ชั้น 1',
                room: 'สนามกลาง',
                date: '2024-12-26',
                timeRange: '09:00 - 16:00',
                note: 'เตรียมปลั๊กพ่วงมาเอง'
            }
        ]
    }
];

export const getMockData = (): AppData => {
  return {
    activities: mockActivities,
    teams: mockTeams,
    schools: mockSchools,
    clusters: mockClusters,
    files: mockFiles,
    announcements: mockAnnouncements,
    venues: mockVenues
  };
};
