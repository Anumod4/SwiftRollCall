import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Student, Payment, AppSettings } from '../types';
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

    let waWindow: Window | null = null;
    const student = students.find(s => s.id === Number(selectedStudent));
    const cleanNumber = student?.contactInfo?.replace(/\D/g, '');
    
    if (autoNotify && cleanNumber) {
      // Only open window synchronously if NO automated provider is configured
      const hasAutomatedProvider = settings?.whatsappProvider === 'rocketsender' || settings?.whatsappProvider === 'meta';
      if (!hasAutomatedProvider) {
        waWindow = window.open('', '_blank');
      }
    }

    try {
      const response = await api.recordPayment({
        studentId: Number(selectedStudent),
        amount: Number(amount),
        date,
        notes,
      });
      
      if (autoNotify && waWindow && cleanNumber && student) {
        const displayDate = format(new Date(date), 'MMM d, yyyy');
        const classPart = student.className ? `\n*Class:* ${student.className}` : '';
        const text = `*RECEIPT OF PAYMENT*\n\n` +
                     `Hi, we have received a payment for *${student.name}*${classPart}.\n\n` +
                     `*Amount:* $${amount}\n` +
                     `*Date:* ${displayDate}\n` +
                     `*Receipt No:* ${response.receiptNumber}\n` +
                     `${notes ? `*Notes:* ${notes}\n` : ''}\n` +
                     `Thank you for your payment! You can download the official PDF receipt from our portal.`;
        waWindow.location.href = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
      } else if (waWindow) {
        waWindow.close();
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

    if (cleanNumber && student && !hasAutomatedProvider) {
      const displayDate = format(new Date(dueDate), 'MMM d, yyyy');
      const classPart = student.className ? ` (Class: ${student.className})` : '';
      const text = `*PAYMENT REMINDER*\n\n` +
                   `Hi, this is a reminder that a payment for *${student.name}*${classPart} is due soon.\n\n` +
                   `*Amount Due:* $${amount}\n` +
                   `*Due Date:* ${displayDate}\n\n` +
                   `Please ignore if already paid. Thank you!`;
      window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`, '_blank');
    }

    try {
      await api.sendPaymentReminder(studentId, dueDate, amount);
    } catch (error) {
      console.error('Failed to send reminder', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Fee Ledger</h1>
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
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Student Balances</h2>
          {loading ? (
            <div className="text-slate-500">Loading...</div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
              <p className="text-slate-500">No students found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {students.map(student => {
                const studentPayments = payments.filter(p => p.studentId === student.id);
                const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                
                return (
                  <div key={student.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{student.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Rate: ${student.rateAmount} / {student.rateType === 'hourly' ? 'hr' : 'mo'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-6 sm:gap-6 border-t sm:border-0 border-slate-100 dark:border-slate-700 pt-4 sm:pt-0 mt-2 sm:mt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${totalPaid.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => handleSendReminder(student.id, student.rateAmount)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors shrink-0"
                        title="Send Payment Reminder"
                      >
                        <Bell size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Payments</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
            {loading ? (
              <div className="p-6 text-center text-slate-500">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No recent payments.</div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {payments.slice(0, 10).map(payment => {
                  const student = students.find(s => s.id === payment.studentId);
                  return (
                    <div key={payment.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-slate-900 dark:text-white">{student?.name || 'Unknown'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+${payment.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          {payment.receiptNumber}
                        </span>
                        <div className="flex items-center gap-3">
                          <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                          {student && (
                            <button 
                              onClick={() => setSelectedReceipt({ payment, student })}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
                            >
                              <FileText size={14} /> View
                            </button>
                          )}
                        </div>
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700 transition-all">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Record Payment</h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student</label>
                <select
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="" disabled className="text-slate-400">Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="e.g. March tuition"
                />
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mt-4 transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoNotify}
                  onChange={(e) => setAutoNotify(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Open WhatsApp notification after saving</span>
              </label>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-700 transition-all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 print:hidden">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Receipt</h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
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
                  className="flex-1 sm:flex-none px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium text-center"
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
