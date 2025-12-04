import type jsPDF from 'jspdf';

let vnFontLoaded = false;

/**
 * Đảm bảo jsPDF dùng font Unicode hỗ trợ tiếng Việt.
 * YÊU CẦU: đặt file /public/fonts/Roboto-Regular.ttf trong dự án.
 */
export async function ensureVnFont(doc: jsPDF) {
  if (vnFontLoaded) {
    doc.setFont('Roboto', 'normal');
    return;
  }

  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/fonts/Roboto-Regular.ttf');
    if (!res.ok) {
      console.warn('Không tải được font Roboto-Regular.ttf, dùng font mặc định.');
      return;
    }

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Font = btoa(binary);

    // tên file và font phải trùng nhau khi add
    doc.addFileToVFS('Roboto-Regular.ttf', base64Font);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    vnFontLoaded = true;
  } catch (err) {
    console.error('Không thể nạp font tiếng Việt cho PDF', err);
  }
}


