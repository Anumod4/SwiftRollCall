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
    
    // Save previous state for rollback
    const previousAttendance = [...attendance];
    
    // Optimistic Update
    let newAttendance = [...attendance];
    if (existing) {
      if (existing.status === status) {
        // Toggle off
        newAttendance = newAttendance.filter(a => a.id !== existing.id);
      } else {
        // Update status
        newAttendance = newAttendance.map(a => a.id === existing.id ? { ...a, status } : a);
      }
    } else {
      // Add temporary record (id: -1)
      newAttendance.push({ id: -Date.now(), studentId, date: dateStr, status });
    }
    setAttendance(newAttendance);

    // Notification logic
    const isNewOrChanged = !existing || existing.status !== status;
    if (isNewOrChanged && autoNotify) {
      const student = students.find(s => s.id === studentId);
      if (student && student.contactInfo) {
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
          await api.deleteAttendance(existing.id);
        } else {
          await api.deleteAttendance(existing.id);
          await api.markAttendance({ studentId, date: dateStr, status });
        }
      } else {
        await api.markAttendance({ studentId, date: dateStr, status });
      }
      
      // Silently refresh to get real IDs
      const freshAttendance = await api.getAttendance({ 
        startDate: format(viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate), 'yyyy-MM-dd'),
        endDate: format(viewMode === 'week' ? addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6) : endOfMonth(currentDate), 'yyyy-MM-dd')
      });
      setAttendance(freshAttendance);
    } catch (error) {
      console.error('Failed to mark attendance', error);
      // Rollback
      setAttendance(previousAttendance);
      alert('Failed to sync attendance. Please try again.');
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
      case 'Present': return 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800';
      case 'Absent': return 'bg-rose-100 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800';
      case 'Cancelled': return 'bg-slate-100 border-slate-200 dark:bg-slate-700 dark:border-slate-600';
      default: return 'bg-white border-slate-100 hover:border-indigo-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Attendance</h1>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Auto Notify Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <input 
              type="checkbox" 
              checked={autoNotify}
              onChange={(e) => setAutoNotify(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-Notify WhatsApp</span>
          </label>

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('month')}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === 'month' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <CalendarDays size={16} />
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === 'week' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <CalendarRange size={16} />
              Week
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <button 
              onClick={handlePrev}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium text-slate-700 dark:text-slate-300 min-w-[120px] text-center text-sm">
              {viewMode === 'week' 
                ? `${format(displayDays[0], 'MMM d')} - ${format(displayDays[6], 'MMM d')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </span>
            <button 
              onClick={handleNext}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="p-2 w-24 sm:w-32 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#334155]">Student</th>
                {displayDays.map(day => (
                  <th key={day.toISOString()} className="p-0.5 sm:p-1 min-w-[20px] sm:min-w-[28px] font-medium text-slate-600 dark:text-slate-400 text-center">
                    <div className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {format(day, 'EE').charAt(0)}
                    </div>
                    <div className={clsx(
                      "mt-1 mx-auto flex items-center justify-center rounded-full text-[10px] sm:text-xs w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                      isSameDay(day, new Date()) ? "bg-indigo-600 dark:bg-indigo-500 text-white" : "text-slate-900 dark:text-slate-200"
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
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors divide-x divide-slate-100 dark:divide-slate-700">
                    <td className="p-2 text-xs sm:text-sm truncate max-w-[6rem] sm:max-w-[8rem] font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#334155]" title={student.name}>
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
                              <div className="bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-100 dark:border-slate-600 p-1 flex">
                                <button 
                                  onClick={() => handleMarkAttendance(student.id, day, 'Present')}
                                  className="hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors p-1.5"
                                  title="Present"
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={() => handleMarkAttendance(student.id, day, 'Absent')}
                                  className="hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors p-1.5"
                                  title="Absent"
                                >
                                  <X size={14} />
                                </button>
                                <button 
                                  onClick={() => handleMarkAttendance(student.id, day, 'Cancelled')}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 rounded-lg transition-colors p-1.5"
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
