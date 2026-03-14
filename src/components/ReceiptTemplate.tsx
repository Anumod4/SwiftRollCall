import React from 'react';
import { Payment, Student, AppSettings, CustomReceiptConfig } from '../types';
import { format } from 'date-fns';

interface ReceiptTemplateProps {
  payment: Payment;
  student: Student;
  template: AppSettings['receiptTemplate'];
  customConfig?: CustomReceiptConfig;
}

export function ReceiptTemplate({ payment, student, template, customConfig }: ReceiptTemplateProps) {
  const formattedDate = format(new Date(payment.date), 'MMMM d, yyyy');
  const amount = payment.amount.toFixed(2);

  const isCustom = template === 'custom' && customConfig;
  const activeLayout = isCustom ? customConfig.baseLayout : template;
  
  const headerText = isCustom && customConfig.headerText ? customConfig.headerText : (activeLayout === 'minimalist' ? 'Receipt' : (activeLayout === 'classic' ? 'Official Receipt' : 'RECEIPT'));
  const businessName = isCustom && customConfig.businessName ? customConfig.businessName : 'SwiftRollCall Services';
  const footerText = isCustom && customConfig.footerText ? customConfig.footerText : (activeLayout === 'minimalist' ? 'THANK YOU' : 'Thank you for your business!');
  const themeColor = isCustom && customConfig.themeColor ? customConfig.themeColor : '#4f46e5'; // indigo-600
  const logoUrl = isCustom ? customConfig.logoUrl : '/assets/logo.png';

  if (activeLayout === 'classic') {
    return (
      <div className="font-serif border-4 border-double border-zinc-800 p-8 max-w-md mx-auto bg-white text-zinc-900 shadow-xl">
        <div className="text-center mb-8 border-b-2 border-zinc-800 pb-4">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />}
          <h1 className="text-3xl font-bold tracking-widest uppercase">{headerText}</h1>
          <p className="text-sm italic mt-1">{businessName}</p>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between border-b border-zinc-200 pb-2">
            <span className="font-semibold">Receipt No:</span>
            <span>{payment.receiptNumber}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200 pb-2">
            <span className="font-semibold">Date:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200 pb-2">
            <span className="font-semibold">Received From:</span>
            <span>{student.parentName || student.name}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200 pb-2">
            <span className="font-semibold">For Student:</span>
            <span>{student.name}</span>
          </div>
          {student.className && (
            <div className="flex justify-between border-b border-zinc-200 pb-2">
              <span className="font-semibold">Class:</span>
              <span>{student.className}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-zinc-200 pb-2">
            <span className="font-semibold">Subjects:</span>
            <span>{student.subjects}</span>
          </div>
          {payment.notes && (
            <div className="flex justify-between border-b border-zinc-200 pb-2">
              <span className="font-semibold">Notes:</span>
              <span>{payment.notes}</span>
            </div>
          )}
        </div>

        <div className="bg-zinc-100 p-4 flex justify-between items-center border border-zinc-300">
          <span className="text-xl font-bold">Total Amount:</span>
          <span className="text-2xl font-bold">${amount}</span>
        </div>

        <div className="mt-12 text-center text-sm italic text-zinc-600">
          <p>{footerText}</p>
        </div>
      </div>
    );
  }

  if (activeLayout === 'minimalist') {
    return (
      <div className="font-mono p-8 max-w-md mx-auto bg-white text-zinc-600 shadow-xl border border-zinc-100">
        <div className="flex justify-between items-end mb-8 border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-2xl uppercase tracking-widest text-zinc-900">{headerText}</h1>
            <p className="text-sm mt-1">{businessName}</p>
          </div>
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 object-contain" />}
        </div>
        
        <div className="space-y-6 mb-12">
          <div>
            <div className="text-xs text-zinc-400 mb-1">RECEIPT NO</div>
            <div className="text-zinc-900">{payment.receiptNumber}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-400 mb-1">DATE</div>
              <div className="text-zinc-900">{formattedDate}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">AMOUNT</div>
              <div className="text-xl text-zinc-900">${amount}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-400 mb-1">BILLED TO</div>
            <div className="text-zinc-900">{student.parentName || student.name}</div>
            <div className="text-sm">Student: {student.name}</div>
            {student.className && <div className="text-sm">Class: {student.className}</div>}
          </div>

          <div>
            <div className="text-xs text-zinc-400 mb-1">DESCRIPTION</div>
            <div className="text-zinc-900">Tutoring Services ({student.subjects})</div>
            {payment.notes && <div className="text-sm mt-1">{payment.notes}</div>}
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-4 text-xs text-center text-zinc-400">
          {footerText}
        </div>
      </div>
    );
  }

  // Default to modern
  return (
    <div className="font-sans border-t-8 p-8 max-w-md mx-auto bg-white text-zinc-800 shadow-2xl rounded-b-2xl" style={{ borderColor: themeColor }}>
      <div className="flex justify-between items-start mb-8">
        <div>
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 mb-4 object-contain" />}
          <h1 className="text-4xl font-black tracking-tight" style={{ color: themeColor }}>{headerText}</h1>
          <p className="text-zinc-500 mt-1 font-medium">#{payment.receiptNumber}</p>
          <p className="text-sm font-semibold mt-2">{businessName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Date</p>
          <p className="font-medium text-zinc-900">{formattedDate}</p>
        </div>
      </div>
      
      <div className="bg-zinc-50 rounded-xl p-6 mb-8">
        <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Billed To</p>
        <p className="text-lg font-bold text-zinc-900">{student.parentName || student.name}</p>
        <p className="text-zinc-600">Student: {student.name}</p>
        {student.className && <p className="text-zinc-600">Class: {student.className}</p>}
        <p className="text-zinc-600">{student.subjects}</p>
      </div>

      <div className="mb-8">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-zinc-100">
              <th className="py-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Description</th>
              <th className="py-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-50">
              <td className="py-4">
                <p className="font-medium text-zinc-900">Tutoring Services</p>
                {payment.notes && <p className="text-sm text-zinc-500 mt-1">{payment.notes}</p>}
              </td>
              <td className="py-4 text-right font-medium text-zinc-900">${amount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center pt-4 border-t-2 border-zinc-100">
        <span className="text-lg font-bold text-zinc-900">Total Paid</span>
        <span className="text-3xl font-black" style={{ color: themeColor }}>${amount}</span>
      </div>

      <div className="mt-8 text-center text-sm text-zinc-500">
        <p>{footerText}</p>
      </div>
    </div>
  );
}
