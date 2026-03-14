export interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  darkMode: boolean;
}

export interface Class {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Student {
  id: number;
  name: string;
  parentName: string;
  contactInfo: string;
  subjects: string;
  classId?: number;
  className?: string;
  rateType: 'hourly' | 'monthly';
  rateAmount: number;
  createdAt: string;
}

export interface Attendance {
  id: number;
  studentId: number;
  date: string;
  status: 'Present' | 'Absent' | 'Cancelled';
  notes?: string;
}

export interface Payment {
  id: number;
  studentId: number;
  amount: number;
  date: string;
  receiptNumber: string;
  notes?: string;
}

export interface CustomReceiptConfig {
  baseLayout: 'classic' | 'modern' | 'minimalist';
  logoUrl: string;
  headerText: string;
  businessName: string;
  themeColor: string;
  footerText: string;
}

export interface AppSettings {
  receiptTemplate: 'classic' | 'modern' | 'minimalist' | 'custom';
  customReceiptConfig?: CustomReceiptConfig;
  whatsappProvider?: 'meta' | 'rocketsender';
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  rocketSenderApiKey?: string;
  rocketSenderDeviceId?: string;
}
export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  monthlyRevenue: number;
  attendanceRate: number;
  recentPayments: (Payment & { studentName: string })[];
  revenueByMonth: { month: string; amount: number }[];
  attendanceByDay: { date: string; rate: number }[];
  studentGrowth: { month: string; count: number }[];
}
export interface ReceiptTemplate {
  id: number;
  name: string;
  config: CustomReceiptConfig;
  createdAt: string;
}
