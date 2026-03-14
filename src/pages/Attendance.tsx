import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Student, Attendance as AttendanceType, AppSettings } from '../types';
import { 
  format, 
  startOfWeek, 
  addDays, 
  subWeeks, 
  addWeeks, 
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
  addMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, Check, X, Minus, CalendarDays, CalendarRange } from 'lucide-react';
import clsx from 'clsx';

export function Attendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(true);
  const [autoNotify, setAutoNotify] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadData();
    loadSettings();
  }, [currentDate, viewMode]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let startDateStr, endDateStr;

      if (viewMode === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        startDateStr = format(start, 'yyyy-MM-dd');
        endDateStr = format(addDays(start, 6), 'yyyy-MM-dd');
      } else {
        const start = startOfMonth(currentDate);
        startDateStr = format(start, 'yyyy-MM-dd');
        endDateStr = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      }
      
      const [studentsData, attendanceData] = await Promise.all([
        api.getStudents(),
        api.getAttendance({ startDate: startDateStr, endDate: endDateStr }),
      ]);
      
      setStudents(studentsData);
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysToDisplay = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  };

  const displayDays = getDaysToDisplay();

  const handlePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleMarkAttendance = async (studentId: number, date: Date, status: 'Present' | 'Absent' | 'Cancelled') => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = attendance.find(a => a.studentId === studentId && a.date === dateStr);
    
    let isNewOrChanged = false;
    if (existing) {
      if (existing.status !== status) {
        isNewOrChanged = true;
      }
    } else {
      isNewOrChanged = true;
    }
    
    if (isNewOrChanged && autoNotify) {
      const student = students.find(s => s.id === studentId);
      if (student && student.contactInfo) {
        // Only open WhatsApp tab if NO automated provider is configured
        const hasAutomatedProvider = settings?.whatsappProvider === 'rocketsender' || settings?.whatsappProvider === 'meta';
        
        if (!hasAutomatedProvider) {
          const cleanNumber = student.contactInfo.replace(/\D/g, '');
          const displayDate = format(date, 'MMM d, yyyy');
          const classPart = student.className ? ` (Class: ${student.className})` : '';
          let text = '';
          if (status === 'Present') text = `Hi, attendance for ${student.name}${classPart} on ${displayDate} has been marked as Present.`;
          else if (status === 'Absent') text = `Hi, attendance for ${student.name}${classPart} on ${displayDate} has been marked as Absent.`;
          else if (status === 'Cancelled') text = `Hi, the class for ${student.name}${classPart} on ${displayDate} has been cancelled.`;
          
          if (cleanNumber && text) {
            const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
          }
        }
      }
    }

    try {
      if (existing) {
        if (existing.status === status) {
          // Toggle off
          await api.deleteAttendance(existing.id);
        } else {
          // Update (delete and recreate for simplicity)
          await api.deleteAttendance(existing.id);
          await api.markAttendance({ studentId, date: dateStr, status });
        }
      } else {
        await api.markAttendance({ studentId, date: dateStr, status });
      }

      loadData();
    } catch (error) {
      console.error('Failed to mark attendance', error);
    }
  };

  const getStatusIcon = (status: string) => {
    const size = 12;
    switch (status) {
      case 'Present': return <Check size={size} className="text-emerald-600" />;
      case 'Absent': return <X size={size} className="text-rose-600" />;
      case 'Cancelled': return <Minus size={size} className="text-slate-400" />;
      default: return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 border-emerald-200';
      case 'Absent': return 'bg-rose-100 border-rose-200';
      case 'Cancelled': return 'bg-slate-100 border-slate-200';
      default: return 'bg-white border-slate-100 hover:border-indigo-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance</h1>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Auto Notify Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
            <input 
              type="checkbox" 
              checked={autoNotify}
              onChange={(e) => setAutoNotify(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Auto-Notify WhatsApp</span>
          </label>

          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('month')}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === 'month' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarDays size={16} />
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === 'week' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarRange size={16} />
              Week
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
            <button 
              onClick={handlePrev}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium text-slate-700 min-w-[120px] text-center text-sm">
              {viewMode === 'week' 
                ? `${format(displayDays[0], 'MMM d')} - ${format(displayDays[6], 'MMM d')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </span>
            <button 
              onClick={handleNext}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-2 w-24 sm:w-32 text-xs sm:text-sm font-medium text-slate-600 sticky left-0 bg-slate-50 z-10 shadow-[1px_0_0_0_#f1f5f9]">Student</th>
                {displayDays.map(day => (
                  <th key={day.toISOString()} className="p-0.5 sm:p-1 min-w-[20px] sm:min-w-[28px] font-medium text-slate-600 text-center">
                    <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
                      {format(day, 'EE').charAt(0)}
                    </div>
                    <div className={clsx(
                      "mt-1 mx-auto flex items-center justify-center rounded-full text-[10px] sm:text-xs w-4 h-4 sm:w-5 sm:h-5",
                      isSameDay(day, new Date()) ? "bg-indigo-600 text-white" : "text-slate-900"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={displayDays.length + 1} className="p-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={displayDays.length + 1} className="p-8 text-center text-slate-500">No students found.</td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2 text-xs sm:text-sm truncate max-w-[6rem] sm:max-w-[8rem] font-medium text-slate-900 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9]" title={student.name}>
                      {student.name}
                    </td>
                    {displayDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const record = attendance.find(a => a.studentId === student.id && a.date === dateStr);
                      
                      return (
                        <td key={day.toISOString()} className="p-0.5 text-center">
                          <div className="relative group flex justify-center" tabIndex={0}>
                            <button
                              type="button"
                              className={clsx(
                                "border flex items-center justify-center transition-all w-5 h-5 sm:w-6 sm:h-6 rounded-md",
                                getStatusClass(record?.status || '')
                              )}
                            >
                              {getStatusIcon(record?.status || '')}
                            </button>
                            
                            {/* Hover Menu - Added pb-2 to bridge the gap and prevent disappearing */}
                            <div className="absolute bottom-full pb-2 hidden group-hover:flex group-focus-within:flex z-20">
                              <div className="bg-white rounded-xl shadow-xl border border-slate-100 p-1 flex">
                                <button 
                                  onClick={() => handleMarkAttendance(student.id, day, 'Present')}
                                  className="hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors p-1.5"
                                  title="Present"
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={() => handleMarkAttendance(student.id, day, 'Absent')}
                                  className="hover:bg-rose-50 text-rose-600 rounded-lg transition-colors p-1.5"
                                  title="Absent"
                                >
                                  <X size={14} />
                                </button>
                                <button 
                                  onClick={() => handleMarkAttendance(student.id, day, 'Cancelled')}
                                  className="hover:bg-slate-50 text-slate-600 rounded-lg transition-colors p-1.5"
                                  title="Cancelled"
                                >
                                  <Minus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
