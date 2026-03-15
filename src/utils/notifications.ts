export const getWhatsAppUrl = (phone: string, text: string) => {
  const cleanNumber = phone.replace(/\D/g, '');
  // Using wa.me for better cross-platform support
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
};

export const getEmailUrl = (email: string, subject: string, body: string) => {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export interface NotificationPayload {
  text: string;
  phone: string;
  email?: string;
}

export const handleManualNotifications = (
  notification: NotificationPayload, 
  settings: any,
  windows: { wa?: Window | null; mail?: Window | null }
) => {
  const isWaManual = !settings?.whatsappProvider || settings?.whatsappProvider === 'manual';
  const isMailManual = !settings?.emailProvider || settings?.emailProvider === 'manual';
  const enableMail = settings?.enableEmailNotifications === true || settings?.enableEmailNotifications === 'true';

  // 1. WhatsApp Manual
  if (isWaManual && notification.phone && windows.wa) {
    windows.wa.location.href = getWhatsAppUrl(notification.phone, notification.text);
  } else if (windows.wa) {
    windows.wa.close();
  }

  // 2. Email Manual
  if (enableMail && isMailManual && notification.email && windows.mail) {
    // mailbox usually doesn't like being in an about:blank iframe/window for mailto
    // but we can try to redirect
    windows.mail.location.href = getEmailUrl(notification.email, 'Update from SwiftRollCall', notification.text);
    // Some browsers block mailto in new windows, so common practice is to close and use location.href
    // but since we already opened it, we redirect.
  } else if (windows.mail) {
    windows.mail.close();
  }
};
