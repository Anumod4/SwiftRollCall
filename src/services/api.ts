import { Student, Attendance, Payment, AppSettings, Class, User } from '../types';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || 'An error occurred');
  }
  return res.json();
};

export const api = {
  // Auth
  login: async (credentials: any) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },
  signup: async (userData: any) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    return handleResponse(res);
  },
  updateProfile: async (profile: Partial<User>): Promise<{ success: boolean }> => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profile),
    });
    return handleResponse(res);
  },

  // Settings
  getSettings: async (): Promise<AppSettings> => {
    const res = await fetch('/api/settings', { headers: getHeaders() });
    return handleResponse(res);
  },
  updateSettings: async (settings: Partial<AppSettings>): Promise<{ success: boolean }> => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  // Classes
  getClasses: async (): Promise<Class[]> => {
    const res = await fetch('/api/classes', { headers: getHeaders() });
    return handleResponse(res);
  },
  createClass: async (classData: Omit<Class, 'id' | 'createdAt'>): Promise<{ id: number }> => {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(classData),
    });
    return handleResponse(res);
  },
  updateClass: async (id: number, classData: Omit<Class, 'id' | 'createdAt'>): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(classData),
    });
    return handleResponse(res);
  },
  deleteClass: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/classes/${id}`, { 
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Students
  getStudents: async (): Promise<Student[]> => {
    const res = await fetch('/api/students', { headers: getHeaders() });
    return handleResponse(res);
  },
  createStudent: async (student: Omit<Student, 'id' | 'createdAt'>): Promise<{ id: number }> => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(student),
    });
    return handleResponse(res);
  },
  updateStudent: async (id: number, student: Omit<Student, 'id' | 'createdAt'>): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(student),
    });
    return handleResponse(res);
  },
  deleteStudent: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/students/${id}`, { 
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Attendance
  getAttendance: async (params?: { startDate?: string; endDate?: string; studentId?: number }): Promise<Attendance[]> => {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`/api/attendance?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  markAttendance: async (attendance: Omit<Attendance, 'id'>): Promise<{ id: number }> => {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(attendance),
    });
    return handleResponse(res);
  },
  deleteAttendance: async (id: number): Promise<{ success: boolean }> => {
    const res = await fetch(`/api/attendance/${id}`, { 
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Payments
  getPayments: async (studentId?: number): Promise<Payment[]> => {
    const query = studentId ? `?studentId=${studentId}` : '';
    const res = await fetch(`/api/payments${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  recordPayment: async (payment: Omit<Payment, 'id' | 'receiptNumber'>): Promise<{ id: number; receiptNumber: string }> => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payment),
    });
    return handleResponse(res);
  },

  // Notifications
  sendPaymentReminder: async (studentId: number, dueDate: string, amount: number): Promise<{ success: boolean }> => {
    const res = await fetch('/api/notifications/remind', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ studentId, dueDate, amount }),
    });
    return handleResponse(res);
  },
};
