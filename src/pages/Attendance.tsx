import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Student, Attendance as AttendanceType, AppSettings } from '../types';
import { handleManualNotifications } from '../utils/notifications';
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
import { ChevronLeft, ChevronRight, Check, X, Minus, CalendarDays, CalendarRange, Filter, RotateCcw, Plus, Send, Mail, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { Class } from '../types';

export function Attendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(true);
  const [autoNotify, setAutoNotify] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  
  // Bulk marking state
  const [isMarkingOpen, setIsMarkingOpen] = useState(false);
  const [markingDate, setMarkingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markingClassId, setMarkingClassId] = useState<number | ''>('');
  const [markingRecords, setMarkingRecords] = useState<Record<number, 'Present' | 'Absent' | 'Cancelled'>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadSettings();
    loadClasses();
  }, [currentDate, viewMode]);

  const loadClasses = async () => {
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch (error) {
      console.error('Failed to load classes', error);
    }
  };

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

  const handleBulkSubmit = async () => {
    if (!markingDate) return;
    
    setSubmitting(true);
    try {
      const records = Object.entries(markingRecords).map(([studentId, status]) => ({
        studentId: Number(studentId),
        status
      }));
      
      if (records.length === 0) {
        alert('Please mark attendance for at least one student.');
        setSubmitting(false);
        return;
      }
      
      const response = await api.markAttendanceBulk({ 
        records, 
        date: markingDate 
      });
      
      if (response.success) {
        setIsMarkingOpen(false);
        setPendingNotifications(response.notifications || []);
        setShowBroadcast(true);
        loadData();
      }
    } catch (error) {
      console.error('Failed to submit bulk attendance', error);
      alert('Failed to save attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const studentsToMark = markingClassId 
    ? students.filter(s => s.classId === Number(markingClassId))
    : students;

  const filteredStudents = selectedClassId 
    ? students.filter(s => s.classId === Number(selectedClassId))
    : students;

  const handleResetFilters = () => {
    setSelectedClassId('');
  };

  const getStatusIcon = (status: string) => {
    const size = 12;
    switch (status) {
      case 'Present': return <Check size={size} className="text-emerald-600" />;
      case 'Absent': return <X size={size} className="text-rose-600" />;
      case 'Cancelled': return <Minus size={size} className="text-zinc-400" />;
      default: return null;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800';
      case 'Absent': return 'bg-rose-100 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800';
      case 'Cancelled': return 'bg-zinc-100 border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600';
      default: return 'bg-white border-zinc-100 hover:border-indigo-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:border-indigo-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Attendance</h1>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Class Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700">
            <Filter size={16} className="text-zinc-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value === '' ? '' : Number(e.target.value))}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 text-zinc-700 dark:text-zinc-300 outline-none min-w-[120px]"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {selectedClassId !== '' && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border border-rose-100 dark:border-rose-800"
            >
              <RotateCcw size={14} />
              Reset Filters
            </button>
          )}

          {/* Capture Attendance Button */}
          <button
            onClick={() => {
              setMarkingClassId(selectedClassId);
              setMarkingRecords({});
              setMarkingDate(format(new Date(), 'yyyy-MM-dd'));
              setIsMarkingOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all font-medium"
          >
            <Plus size={18} />
            Capture Attendance
          </button>

          {/* View Toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('month')}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === 'month' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <CalendarDays size={16} />
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                viewMode === 'week' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <CalendarRange size={16} />
              Week
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700">
            <button 
              onClick={handlePrev}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-600 dark:text-zinc-400"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium text-zinc-700 dark:text-zinc-300 min-w-[120px] text-center text-sm">
              {viewMode === 'week' 
                ? `${format(displayDays[0], 'MMM d')} - ${format(displayDays[6], 'MMM d')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </span>
            <button 
              onClick={handleNext}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-600 dark:text-zinc-400"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-700">
                <th className="p-2 w-24 sm:w-32 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 sticky left-0 bg-zinc-50 dark:bg-zinc-900 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#334155]">Student</th>
                {displayDays.map(day => (
                  <th key={day.toISOString()} className="p-0.5 sm:p-1 min-w-[20px] sm:min-w-[28px] font-medium text-zinc-600 dark:text-zinc-400 text-center">
                    <div className="text-[8px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      {format(day, 'EE').charAt(0)}
                    </div>
                    <div className={clsx(
                      "mt-1 mx-auto flex items-center justify-center rounded-full text-[10px] sm:text-xs w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                      isSameDay(day, new Date()) ? "bg-indigo-600 dark:bg-indigo-500 text-white" : "text-zinc-900 dark:text-zinc-200"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={displayDays.length + 1} className="p-8 text-center text-zinc-500">Loading...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={displayDays.length + 1} className="p-8 text-center text-zinc-500">No students found.</td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50 transition-colors divide-x divide-zinc-100 dark:divide-zinc-700">
                    <td className="p-2 text-xs sm:text-sm truncate max-w-[6rem] sm:max-w-[8rem] font-medium text-zinc-900 dark:text-white sticky left-0 bg-white dark:bg-zinc-800 z-10 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#334155]" title={student.name}>
                      {student.name}
                    </td>
                    {displayDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const record = attendance.find(a => a.studentId === student.id && a.date === dateStr);
                      
                      return (
                        <td key={day.toISOString()} className="p-0.5 text-center">
                          <div className="relative flex justify-center py-1">
                            <div
                              className={clsx(
                                "border flex items-center justify-center transition-all w-5 h-5 sm:w-6 sm:h-6 rounded-md",
                                getStatusClass(record?.status || '')
                              )}
                            >
                              {getStatusIcon(record?.status || '')}
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

      {/* Bulk Marking Modal */}
      {isMarkingOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 transition-all max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Capture Attendance</h2>
              <button onClick={() => setIsMarkingOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-500"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Select Class</label>
                <select
                  value={markingClassId}
                  onChange={(e) => {
                    const cid = e.target.value === '' ? '' : Number(e.target.value);
                    setMarkingClassId(cid);
                    setMarkingRecords({});
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select a Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
                <input
                  type="date"
                  value={markingDate}
                  onChange={(e) => setMarkingDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-zinc-100 dark:border-zinc-700 rounded-xl mb-6">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10">
                  <tr className="border-b border-zinc-100 dark:border-zinc-700 text-left">
                    <th className="p-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">Student Name</th>
                    <th className="p-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700">
                  {studentsToMark.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-8 text-center text-zinc-500">Pick a class to show students.</td>
                    </tr>
                  ) : (
                    studentsToMark.map(student => (
                      <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                        <td className="p-3 text-sm font-medium text-zinc-900 dark:text-white">{student.name}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            {[
                              { label: 'Present', id: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
                              { label: 'Absent', id: 'Absent', color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' },
                              { label: 'Cancelled', id: 'Cancelled', color: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-600' }
                            ].map(btn => (
                              <button
                                key={btn.id}
                                onClick={() => setMarkingRecords(prev => ({ ...prev, [student.id]: btn.id as any }))}
                                className={clsx(
                                  "px-3 py-1 text-xs rounded-lg border transition-all",
                                  markingRecords[student.id] === btn.id 
                                    ? btn.color 
                                    : "bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-100 dark:border-zinc-700"
                                )}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-700">
              <button 
                onClick={() => setIsMarkingOpen(false)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkSubmit}
                disabled={submitting || studentsToMark.length === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all font-bold disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Submit Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-3xl p-8 w-full max-w-2xl shadow-2xl border border-zinc-100 dark:border-zinc-700 transition-all max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <Send className="text-indigo-600" size={28} />
                  Broadcast Center
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">Send notifications for the captures recorded.</p>
              </div>
              <button onClick={() => setShowBroadcast(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl text-zinc-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2 custom-scrollbar">
              {pendingNotifications.map((notif, idx) => {
                const enableWa = settings?.enableWhatsappNotifications !== false && String(settings?.enableWhatsappNotifications) !== 'false';
                const enableMail = settings?.enableEmailNotifications === true || String(settings?.enableEmailNotifications) === 'true';

                return (
                  <div key={idx} className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 group hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all shadow-sm">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{notif.studentName}</h3>
                      <div className="flex gap-2">
                        {/* Manual WhatsApp Trigger */}
                        <button
                          onClick={() => {
                            if (enableWa) {
                              handleManualNotifications(notif, settings, { wa: window.open('about:blank', '_blank') });
                            }
                          }}
                          className={clsx(
                            "p-3 rounded-xl transition-all shadow-sm",
                            enableWa ? "bg-emerald-100 text-emerald-600 hover:scale-105" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          )}
                          disabled={!enableWa}
                          title="Send WhatsApp"
                        >
                          <MessageSquare size={20} />
                        </button>
                        {/* Manual Email Trigger */}
                        <button
                          onClick={() => {
                            if (enableMail) {
                              handleManualNotifications(notif, settings, { mail: window.open('about:blank', '_blank') });
                            }
                          }}
                          className={clsx(
                            "p-3 rounded-xl transition-all shadow-sm",
                            enableMail ? "bg-indigo-100 text-indigo-600 hover:scale-105" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          )}
                          disabled={!enableMail}
                          title="Send Email"
                        >
                          <Mail size={20} />
                        </button>
                      </div>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm italic leading-relaxed">"{notif.text}"</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                <Check size={16} className="text-emerald-500" />
                {pendingNotifications.length} notifications ready
              </span>
              <button 
                onClick={() => setShowBroadcast(false)}
                className="px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold shadow-lg hover:bg-zinc-800 dark:hover:bg-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
