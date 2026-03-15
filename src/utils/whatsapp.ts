export const getWhatsAppUrl = (phone: string, text: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  
  // Detect mobile/tablet device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent);
  
  if (isMobile) {
    // This universal link is better at triggering the native app on iOS and Android
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  
  // For desktop, direct to WhatsApp Web is faster and avoids the intermediate "Click to chat" page
  return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
};
