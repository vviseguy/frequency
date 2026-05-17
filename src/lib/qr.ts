import QRCode from 'qrcode';

/** Render a share URL into a data-URL QR for the person across the room. */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 320,
    color: { dark: '#1A1626', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
}
