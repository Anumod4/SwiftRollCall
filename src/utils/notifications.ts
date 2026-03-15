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
  const enableWa = settings?.enableWhatsappNotifications !== false && settings?.enableWhatsappNotifications !== 'false';

  // 1. WhatsApp Manual
  if (enableWa && isWaManual && notification.phone && windows.wa) {
    windows.wa.location.href = getWhatsAppUrl(notification.phone, notification.text);
  } else if (windows.wa) {
    windows.wa.close();
  }

  // 2. Email Manual
  if (enableMail && isMailManual && notification.email) {
    const url = getEmailUrl(notification.email, 'Update from SwiftRollCall', notification.text);
    // If windows.mail was passed, try to use it, otherwise use current window
    // mailto: usually triggers external app and doesn't redirect current page
    if (windows.mail) {
      windows.mail.location.href = url;
      // Close the empty window after a short delay since mailto doesn't occupy it
      setTimeout(() => {
        if (windows.mail && !windows.mail.closed) windows.mail.close();
      }, 1000);
    } else {
      window.location.href = url;
    }
  } else if (windows.mail) {
    windows.mail.close();
  }
};
