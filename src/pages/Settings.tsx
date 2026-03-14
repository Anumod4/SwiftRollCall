import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AppSettings, CustomReceiptConfig } from '../types';
import { Check, Settings as SettingsIcon, Edit2, X, MessageSquare, Moon, Sun, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';
import { ReceiptTemplate } from '../components/ReceiptTemplate';

export function Settings() {
  const { user, updateUser } = useAuth();
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

  const toggleDarkMode = async () => {
    if (!user) return;
    const newDarkMode = !user.darkMode;
    setSaving(true);
    try {
      await api.updateProfile({ darkMode: newDarkMode });
      updateUser({ darkMode: newDarkMode });
    } catch (error) {
      console.error('Failed to update theme', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const dummyPayment = { id: 1, studentId: 1, amount: 150, date: new Date().toISOString(), receiptNumber: 'REC-123456789', notes: 'Monthly fee' };
  const dummyStudent = { id: 1, name: 'John Doe', parentName: 'Jane Doe', contactInfo: '555-0100', subjects: 'Math, Science', rateType: 'monthly' as const, rateAmount: 150, createdAt: new Date().toISOString() };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Appearance</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Customize how SwiftRollCall looks on your device.
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={clsx(
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
              user?.darkMode ? "bg-indigo-600" : "bg-slate-200"
            )}
          >
            <span
              className={clsx(
                "pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                user?.darkMode ? "translate-x-5" : "translate-x-0"
              )}
            >
              <span
                className={clsx(
                  "absolute inset-0 flex h-full w-full items-center justify-center transition-opacity",
                  user?.darkMode ? "opacity-0 duration-100 ease-out" : "opacity-100 duration-200 ease-in"
                )}
              >
                <Sun className="h-3 w-3 text-slate-400" />
              </span>
              <span
                className={clsx(
                  "absolute inset-0 flex h-full w-full items-center justify-center transition-opacity",
                  user?.darkMode ? "opacity-100 duration-200 ease-in" : "opacity-0 duration-100 ease-out"
                )}
              >
                <Moon className="h-3 w-3 text-indigo-600" />
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Receipt Templates Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Receipt Templates</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Choose the design for the receipts you download and share with students.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(['classic', 'modern', 'minimalist', 'custom'] as const).map((t) => (
            <div 
              key={t}
              onClick={() => handleTemplateSelect(t)}
              className={clsx(
                "cursor-pointer rounded-2xl border-2 transition-all overflow-hidden relative group flex flex-col",
                settings?.receiptTemplate === t 
                  ? "border-indigo-600 ring-4 ring-indigo-50 dark:ring-indigo-900/20" 
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500"
              )}
            >
              {settings?.receiptTemplate === t && (
                <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1 rounded-full z-10">
                  <Check size={16} />
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 h-48 flex items-center justify-center flex-1">
                {t === 'custom' ? (
                  <div className="w-full max-w-[200px] bg-white dark:bg-slate-800 p-4 shadow-sm border-2 border-slate-200 dark:border-slate-700 border-dashed flex flex-col items-center justify-center text-slate-400 h-full rounded-lg">
                    <SettingsIcon size={32} className="mb-2" />
                    <span className="text-xs font-medium">Custom Layout</span>
                  </div>
                ) : (
                  <div className="w-full max-w-[200px] bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transform scale-75 group-hover:scale-90 transition-transform">
                     <div className="h-2 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                     <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 rounded mb-2"></div>
                     <div className="space-y-1">
                       <div className="h-2 w-3/4 bg-slate-100 dark:bg-slate-700/50 rounded"></div>
                       <div className="h-2 w-full bg-slate-100 dark:bg-slate-700/50 rounded"></div>
                     </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white capitalize">{t}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t === 'classic' && 'Traditional serif design.'}
                    {t === 'modern' && 'Clean with color accents.'}
                    {t === 'minimalist' && 'Simple monospace layout.'}
                    {t === 'custom' && 'Your personalized design.'}
                  </p>
                </div>
                {t === 'custom' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditingCustom(true); }}
                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Configuration Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">WhatsApp Configuration</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Configure how automated notifications are sent to parents.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Provider</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'meta', name: 'Meta WhatsApp API', desc: 'Official Cloud API (Recommended)' },
                { id: 'rocketsender', name: 'RocketSender.co', desc: 'Third-party automation tool' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleUpdateWhatsApp({ whatsappProvider: p.id as any })}
                  className={clsx(
                    "px-4 py-3 rounded-xl border-2 transition-all text-left",
                    settings?.whatsappProvider === p.id
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
                      : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                  )}
                >
                  <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {settings?.whatsappProvider === 'rocketsender' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RocketSender API Key</label>
                <input
                  type="password"
                  value={settings.rocketSenderApiKey || ''}
                  onChange={(e) => setSettings({...settings, rocketSenderApiKey: e.target.value})}
                  onBlur={() => handleUpdateWhatsApp({ rocketSenderApiKey: settings.rocketSenderApiKey })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter your API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Device ID</label>
                <input
                  type="text"
                  value={settings.rocketSenderDeviceId || ''}
                  onChange={(e) => setSettings({...settings, rocketSenderDeviceId: e.target.value})}
                  onBlur={() => handleUpdateWhatsApp({ rocketSenderDeviceId: settings.rocketSenderDeviceId })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Enter your Device ID"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number ID</label>
                <input
                  type="text"
                  value={settings?.whatsappPhoneNumberId || ''}
                  onChange={(e) => setSettings(settings ? {...settings, whatsappPhoneNumberId: e.target.value} : null)}
                  onBlur={() => handleUpdateWhatsApp({ whatsappPhoneNumberId: settings?.whatsappPhoneNumberId })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. 1092837465"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Access Token</label>
                <input
                  type="password"
                  value={settings?.whatsappAccessToken || ''}
                  onChange={(e) => setSettings(settings ? {...settings, whatsappAccessToken: e.target.value} : null)}
                  onBlur={() => handleUpdateWhatsApp({ whatsappAccessToken: settings?.whatsappAccessToken })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="EAAB..."
                />
              </div>
            </div>
          )}
          
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium mb-1">Note on Notifications:</p>
            <p>
              When a provider is configured, the system will attempt to send automated messages in the background. 
              If no provider is configured, the app will continue to open WhatsApp Web/App manually.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Template Editor Modal */}
      {isEditingCustom && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-6xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Custom Template</h2>
              <button onClick={() => setIsEditingCustom(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Editor Form */}
              <div className="w-full md:w-1/3 border-r border-slate-100 dark:border-slate-700 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base Layout</label>
                    <select
                      value={customConfig.baseLayout}
                      onChange={(e) => setCustomConfig({...customConfig, baseLayout: e.target.value as any})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="minimalist">Minimalist</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo URL (Optional)</label>
                    <input
                      type="text"
                      value={customConfig.logoUrl}
                      onChange={(e) => setCustomConfig({...customConfig, logoUrl: e.target.value})}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Header Text</label>
                    <input
                      type="text"
                      value={customConfig.headerText}
                      onChange={(e) => setCustomConfig({...customConfig, headerText: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={customConfig.businessName}
                      onChange={(e) => setCustomConfig({...customConfig, businessName: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Theme Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={customConfig.themeColor}
                        onChange={(e) => setCustomConfig({...customConfig, themeColor: e.target.value})}
                        className="h-10 w-10 min-w-[40px] rounded cursor-pointer border-none bg-transparent"
                      />
                      <input
                        type="text"
                        value={customConfig.themeColor}
                        onChange={(e) => setCustomConfig({...customConfig, themeColor: e.target.value})}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Footer Text</label>
                    <textarea
                      value={customConfig.footerText}
                      onChange={(e) => setCustomConfig({...customConfig, footerText: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-slate-200 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-full max-w-lg transform shadow-2xl rounded-2xl overflow-hidden">
                  <ReceiptTemplate 
                    payment={dummyPayment} 
                    student={dummyStudent} 
                    template="custom"
                    customConfig={customConfig}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-white dark:bg-slate-800 transition-colors">
              <button
                onClick={() => setIsEditingCustom(false)}
                className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
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
