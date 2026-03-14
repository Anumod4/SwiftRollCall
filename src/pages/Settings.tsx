import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AppSettings, CustomReceiptConfig } from '../types';
import { Check, Settings as SettingsIcon, Edit2, X, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { ReceiptTemplate } from '../components/ReceiptTemplate';

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customConfig, setCustomConfig] = useState<CustomReceiptConfig>({
    baseLayout: 'modern',
    logoUrl: '',
    headerText: 'RECEIPT',
    businessName: 'SwiftRollCall Services',
    themeColor: '#4f46e5',
    footerText: 'Thank you for your business!'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
      if (data.customReceiptConfig) {
        setCustomConfig(data.customReceiptConfig);
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template: AppSettings['receiptTemplate']) => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await api.updateSettings({ receiptTemplate: template });
      setSettings({ ...settings, receiptTemplate: template });
    } catch (error) {
      console.error('Failed to update settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomConfig = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await api.updateSettings({ 
        receiptTemplate: 'custom',
        customReceiptConfig: customConfig 
      });
      setSettings({ 
        ...settings, 
        receiptTemplate: 'custom',
        customReceiptConfig: customConfig 
      });
      setIsEditingCustom(false);
    } catch (error) {
      console.error('Failed to update settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWhatsApp = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSettings(updates);
      setSettings({ ...settings, ...updates });
    } catch (error) {
      console.error('Failed to update WhatsApp settings', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading settings...</div>;
  }

  const dummyPayment = { id: 1, studentId: 1, amount: 150, date: new Date().toISOString(), receiptNumber: 'REC-123456789', notes: 'Monthly fee' };
  const dummyStudent = { id: 1, name: 'John Doe', parentName: 'Jane Doe', contactInfo: '555-0100', subjects: 'Math, Science', rateType: 'monthly' as const, rateAmount: 150, createdAt: new Date().toISOString() };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">Receipt Templates</h2>
          <p className="text-slate-500 mt-1">
            Choose the design for the receipts you download and share with students.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Classic Template */}
          <div 
            onClick={() => handleTemplateSelect('classic')}
            className={clsx(
              "cursor-pointer rounded-2xl border-2 transition-all overflow-hidden relative group flex flex-col",
              settings?.receiptTemplate === 'classic' 
                ? "border-indigo-600 ring-4 ring-indigo-50" 
                : "border-slate-200 hover:border-indigo-300"
            )}
          >
            {settings?.receiptTemplate === 'classic' && (
              <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1 rounded-full z-10">
                <Check size={16} />
              </div>
            )}
            <div className="bg-slate-50 p-6 h-48 flex items-center justify-center flex-1">
              <div className="w-full max-w-[200px] bg-white p-4 shadow-sm font-serif border-2 border-double border-slate-300">
                <div className="text-center border-b border-slate-300 pb-2 mb-2">
                  <h3 className="font-bold text-sm">OFFICIAL RECEIPT</h3>
                </div>
                <div className="space-y-1 text-[10px] text-slate-600">
                  <div className="flex justify-between"><span>Date:</span><span>12/10/2023</span></div>
                  <div className="flex justify-between"><span>Amount:</span><span>$150.00</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-100">
              <h3 className="font-semibold text-slate-900">Classic</h3>
              <p className="text-sm text-slate-500">Traditional serif design with double borders.</p>
            </div>
          </div>

          {/* Modern Template */}
          <div 
            onClick={() => handleTemplateSelect('modern')}
            className={clsx(
              "cursor-pointer rounded-2xl border-2 transition-all overflow-hidden relative group flex flex-col",
              settings?.receiptTemplate === 'modern' 
                ? "border-indigo-600 ring-4 ring-indigo-50" 
                : "border-slate-200 hover:border-indigo-300"
            )}
          >
            {settings?.receiptTemplate === 'modern' && (
              <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1 rounded-full z-10">
                <Check size={16} />
              </div>
            )}
            <div className="bg-slate-50 p-6 h-48 flex items-center justify-center flex-1">
              <div className="w-full max-w-[200px] bg-white p-4 shadow-md rounded-b-lg border-t-4 border-indigo-600 font-sans">
                <h3 className="font-black text-indigo-600 text-sm mb-3">RECEIPT</h3>
                <div className="space-y-1 text-[10px] text-slate-600">
                  <div className="flex justify-between"><span>Date</span><span className="font-medium text-slate-900">12/10/2023</span></div>
                  <div className="flex justify-between"><span>Amount</span><span className="font-bold text-indigo-600">$150.00</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-100">
              <h3 className="font-semibold text-slate-900">Modern</h3>
              <p className="text-sm text-slate-500">Clean sans-serif with bold color accents.</p>
            </div>
          </div>

          {/* Minimalist Template */}
          <div 
            onClick={() => handleTemplateSelect('minimalist')}
            className={clsx(
              "cursor-pointer rounded-2xl border-2 transition-all overflow-hidden relative group flex flex-col",
              settings?.receiptTemplate === 'minimalist' 
                ? "border-indigo-600 ring-4 ring-indigo-50" 
                : "border-slate-200 hover:border-indigo-300"
            )}
          >
            {settings?.receiptTemplate === 'minimalist' && (
              <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1 rounded-full z-10">
                <Check size={16} />
              </div>
            )}
            <div className="bg-slate-50 p-6 h-48 flex items-center justify-center flex-1">
              <div className="w-full max-w-[200px] bg-white p-4 font-mono text-slate-500">
                <h3 className="uppercase tracking-widest text-xs border-b border-slate-200 pb-2 mb-2">Receipt</h3>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between"><span>DATE</span><span>12/10/2023</span></div>
                  <div className="flex justify-between"><span>TOTAL</span><span>$150.00</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-100">
              <h3 className="font-semibold text-slate-900">Minimalist</h3>
              <p className="text-sm text-slate-500">Sparse monospace design with lots of whitespace.</p>
            </div>
          </div>

          {/* Custom Template */}
          <div 
            onClick={() => handleTemplateSelect('custom')}
            className={clsx(
              "cursor-pointer rounded-2xl border-2 transition-all overflow-hidden relative group flex flex-col",
              settings?.receiptTemplate === 'custom' 
                ? "border-indigo-600 ring-4 ring-indigo-50" 
                : "border-slate-200 hover:border-indigo-300"
            )}
          >
            {settings?.receiptTemplate === 'custom' && (
              <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1 rounded-full z-10">
                <Check size={16} />
              </div>
            )}
            <div className="bg-slate-50 p-6 h-48 flex items-center justify-center flex-1">
               <div className="w-full max-w-[200px] bg-white p-4 shadow-sm border-2 border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 h-full">
                 <SettingsIcon size={32} className="mb-2" />
                 <span className="text-sm font-medium">Custom Layout</span>
               </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900">Custom</h3>
                <p className="text-sm text-slate-500">Your personalized design.</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditingCustom(true); }}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit Custom Template"
              >
                <Edit2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">WhatsApp Configuration</h2>
            <p className="text-slate-500 mt-1">
              Configure how automated notifications are sent to parents.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Provider</label>
            <div className="flex gap-4">
              <button
                onClick={() => handleUpdateWhatsApp({ whatsappProvider: 'meta' })}
                className={clsx(
                  "flex-1 px-4 py-3 rounded-xl border-2 transition-all text-left",
                  settings?.whatsappProvider === 'meta' || !settings?.whatsappProvider
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="font-bold text-slate-900">Meta WhatsApp API</div>
                <div className="text-xs text-slate-500">Official Cloud API (Recommended)</div>
              </button>
              <button
                onClick={() => handleUpdateWhatsApp({ whatsappProvider: 'rocketsender' })}
                className={clsx(
                  "flex-1 px-4 py-3 rounded-xl border-2 transition-all text-left",
                  settings?.whatsappProvider === 'rocketsender'
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="font-bold text-slate-900">RocketSender.co</div>
                <div className="text-xs text-slate-500">Third-party automation tool</div>
              </button>
            </div>
          </div>

          {settings?.whatsappProvider === 'rocketsender' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RocketSender API Key</label>
                <input
                  type="password"
                  value={settings.rocketSenderApiKey || ''}
                  onChange={(e) => setSettings({...settings, rocketSenderApiKey: e.target.value})}
                  onBlur={() => handleUpdateWhatsApp({ rocketSenderApiKey: settings.rocketSenderApiKey })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter your API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device ID</label>
                <input
                  type="text"
                  value={settings.rocketSenderDeviceId || ''}
                  onChange={(e) => setSettings({...settings, rocketSenderDeviceId: e.target.value})}
                  onBlur={() => handleUpdateWhatsApp({ rocketSenderDeviceId: settings.rocketSenderDeviceId })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter your Device ID"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                <input
                  type="text"
                  value={settings?.whatsappPhoneNumberId || ''}
                  onChange={(e) => setSettings(settings ? {...settings, whatsappPhoneNumberId: e.target.value} : null)}
                  onBlur={() => handleUpdateWhatsApp({ whatsappPhoneNumberId: settings?.whatsappPhoneNumberId })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. 1092837465"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Access Token</label>
                <input
                  type="password"
                  value={settings?.whatsappAccessToken || ''}
                  onChange={(e) => setSettings(settings ? {...settings, whatsappAccessToken: e.target.value} : null)}
                  onBlur={() => handleUpdateWhatsApp({ whatsappAccessToken: settings?.whatsappAccessToken })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="EAAB..."
                />
              </div>
            </div>
          )}
          
          <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600">
            <p className="font-medium mb-1">Note on Notifications:</p>
            <p>
              When a provider is configured, the system will attempt to send automated messages in the background. 
              If no provider is configured, the app will continue to open WhatsApp Web/App manually for each notification.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Template Editor Modal */}
      {isEditingCustom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Edit Custom Template</h2>
              <button onClick={() => setIsEditingCustom(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Editor Form */}
              <div className="w-full md:w-1/3 border-r border-slate-100 p-6 overflow-y-auto bg-slate-50">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Layout</label>
                    <select
                      value={customConfig.baseLayout}
                      onChange={(e) => setCustomConfig({...customConfig, baseLayout: e.target.value as any})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="minimalist">Minimalist</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL (Optional)</label>
                    <input
                      type="text"
                      value={customConfig.logoUrl}
                      onChange={(e) => setCustomConfig({...customConfig, logoUrl: e.target.value})}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Header Text</label>
                    <input
                      type="text"
                      value={customConfig.headerText}
                      onChange={(e) => setCustomConfig({...customConfig, headerText: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={customConfig.businessName}
                      onChange={(e) => setCustomConfig({...customConfig, businessName: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Theme Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customConfig.themeColor}
                        onChange={(e) => setCustomConfig({...customConfig, themeColor: e.target.value})}
                        className="h-10 w-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customConfig.themeColor}
                        onChange={(e) => setCustomConfig({...customConfig, themeColor: e.target.value})}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Footer Text</label>
                    <input
                      type="text"
                      value={customConfig.footerText}
                      onChange={(e) => setCustomConfig({...customConfig, footerText: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-slate-200 flex items-center justify-center">
                <div className="w-full transform scale-90 origin-top">
                  <ReceiptTemplate 
                    payment={dummyPayment} 
                    student={dummyStudent} 
                    template="custom"
                    customConfig={customConfig}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button
                onClick={() => setIsEditingCustom(false)}
                className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomConfig}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Custom Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
