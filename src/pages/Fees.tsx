import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Student, Payment, AppSettings } from '../types';
import { handleManualNotifications } from '../utils/notifications';
import { DollarSign, FileText, Bell, Plus, Download, Printer, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { ReceiptTemplate } from '../components/ReceiptTemplate';
import { domToPng } from 'modern-screenshot';
import jsPDF from 'jspdf';

export function Fees() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ payment: Payment, student: Student } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<number | ''>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [autoNotify, setAutoNotify] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, paymentsData, settingsData] = await Promise.all([
        api.getStudents(),
        api.getPayments(),
        api.getSettings(),
      ]);
      setStudents(studentsData);
      setPayments(paymentsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current || !selectedReceipt) return;
    
    setIsDownloading(true);
    try {
      const imgData = await domToPng(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => (img.onload = resolve));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [img.width / 2, img.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, img.width / 2, img.height / 2);
      pdf.save(`Receipt-${selectedReceipt.payment.receiptNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Failed to generate PDF. Please try using the Print option.');
    } finally {
      setIsDownloading(false);
    }
  };

  const shareReceipt = async () => {
    if (!receiptRef.current || !selectedReceipt) return;
    
    try {
      const imgData = await domToPng(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const response = await fetch(imgData);
      const blob = await response.blob();

      const file = new File([blob], `Receipt-${selectedReceipt.payment.receiptNumber}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Payment Receipt',
          text: `Receipt for ${selectedReceipt.student.name}`
        });
      } else {
        // Fallback to download if share not supported
        downloadReceipt();
      }
    } catch (error) {
      console.error('Failed to share', error);
      downloadReceipt();
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !amount) return;

    const student = students.find(s => s.id === Number(selectedStudent));
    let waWindow: Window | null = null;
    let mailWindow: Window | null = null;
    const hasAutomatedProvider = settings?.whatsappProvider === 'rocketsender' || settings?.whatsappProvider === 'meta';

    if (autoNotify && student) {
      if (!hasAutomatedProvider) {
        waWindow = window.open('about:blank', '_blank');
      }
      if (settings?.enableEmailNotifications && (!settings?.emailProvider || settings?.emailProvider === 'manual')) {
        mailWindow = window.open('about:blank', '_blank');
      }
    }


    try {
      const response = await api.recordPayment({
        studentId: Number(selectedStudent),
        amount: Number(amount),
        date,
        notes,
      });
      
      if (autoNotify && response.notification) {
        handleManualNotifications(response.notification, settings, { wa: waWindow, mail: mailWindow });
      } else {
        if (waWindow) waWindow.close();
        if (mailWindow) mailWindow.close();
      }

      setIsModalOpen(false);
      setSelectedStudent('');
      setAmount('');
      setNotes('');
      loadData();
    } catch (error) {
      console.error('Failed to record payment', error);
      if (waWindow) waWindow.close();
    }
  };

  const handleSendReminder = async (studentId: number, amount: number) => {
    const student = students.find(s => s.id === studentId);
    const cleanNumber = student?.contactInfo?.replace(/\D/g, '');
    const dueDate = format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    const hasAutomatedProvider = settings?.whatsappProvider === 'rocketsender' || settings?.whatsappProvider === 'meta';
    
    let waWindow: Window | null = null;
    let mailWindow: Window | null = null;

    if (student) {
      if (!hasAutomatedProvider) {
        waWindow = window.open('about:blank', '_blank');
      }
      if (settings?.enableEmailNotifications && (!settings?.emailProvider || settings?.emailProvider === 'manual')) {
        mailWindow = window.open('about:blank', '_blank');
      }
    }

    try {
      const response = await api.sendPaymentReminder(studentId, dueDate, amount);
      const studentData = students.find(s => s.id === studentId);
      
      // We need a notification object for manual triggers
      const notification = {
        phone: studentData?.contactInfo || '',
        email: studentData?.email || '',
        text: `*PAYMENT REMINDER*\n\n` +
              `Hi, this is a reminder that a payment for *${studentData?.name}* is due soon.\n\n` +
              `*Amount Due:* $${amount}\n` +
              `*Due Date:* ${format(new Date(dueDate), 'MMM d, yyyy')}\n\n` +
              `Please ignore if already paid. Thank you!`
      };

      handleManualNotifications(notification, settings, { wa: waWindow, mail: mailWindow });
    } catch (error) {
      console.error('Failed to send reminder', error);
      if (waWindow) waWindow.close();
      if (mailWindow) mailWindow.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Fee Ledger</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          <span>Record Payment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balances / Students List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Student Balances</h2>
          {loading ? (
            <div className="text-zinc-500">Loading...</div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-zinc-100">
              <p className="text-zinc-500">No students found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {students.map(student => {
                const studentPayments = payments.filter(p => p.studentId === student.id);
                const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                
                return (
                  <div key={student.id} className="group relative bg-white dark:bg-zinc-800 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-700 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">{student.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 capitalize">
                              {student.rateType}
                            </span>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                              Fees: ${student.rateAmount}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full sm:w-auto gap-8 sm:gap-10 border-t sm:border-0 border-zinc-50 dark:border-zinc-700/50 pt-4 sm:pt-0 mt-2 sm:mt-0">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Received</span>
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSendReminder(student.id, student.rateAmount)}
                            className="w-10 h-10 flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-sm border border-amber-100/50 dark:border-amber-900/30"
                            title="Send Payment Reminder"
                          >
                            <Bell size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Recent Transactions</h2>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{payments.length} TOTAL</span>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-2 border border-zinc-100 dark:border-zinc-800 transition-colors">
            {loading ? (
              <div className="p-8 text-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                Loading transactions...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 font-medium">No recent payments.</div>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 10).map(payment => {
                  const student = students.find(s => s.id === payment.studentId);
                  return (
                    <div key={payment.id} className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-zinc-100/50 dark:border-zinc-700/50 flex flex-col gap-3 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <DollarSign size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-zinc-900 dark:text-white truncate max-w-[120px]">
                              {student?.name || 'Unknown'}
                            </p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-tight">
                              {format(new Date(payment.date), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600 dark:text-emerald-400">
                            +${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                            {payment.receiptNumber}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-zinc-700/30">
                        {payment.notes ? (
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 italic truncate pr-4">
                            "{payment.notes}"
                          </span>
                        ) : <div />}
                        <button 
                          onClick={() => setSelectedReceipt({ payment, student: student! })}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg transition-colors"
                        >
                          <FileText size={12} />
                          RECEIPT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-zinc-100 dark:border-zinc-700 transition-all">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Record Payment</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Student</label>
                <select
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="" disabled className="text-zinc-400">Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="e.g. March tuition"
                />
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700 mt-4 transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoNotify}
                  onChange={(e) => setAutoNotify(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Open WhatsApp notification after saving</span>
              </label>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-medium shadow-sm"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && settings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto border border-zinc-100 dark:border-zinc-700 transition-all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Receipt</h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Print
                </button>
                <button
                  onClick={downloadReceipt}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download size={18} />
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </button>
                <button
                  onClick={shareReceipt}
                  className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  Share
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 sm:flex-none px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors font-medium text-center"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="print-area" ref={receiptRef}>
              <ReceiptTemplate 
                payment={selectedReceipt.payment} 
                student={selectedReceipt.student} 
                template={settings.receiptTemplate || 'modern'} 
                customConfig={settings.customReceiptConfig}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
