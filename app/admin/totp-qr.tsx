'use client';

import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

export default function TotpQr({ uri }: { uri: string }) {
  const matrix = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(uri, 'Byte');
    qr.make();
    const count = qr.getModuleCount();
    const cells: string[] = [];
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) cells.push(`M${col + 4} ${row + 4}h1v1h-1z`);
      }
    }
    return { size: count + 8, path: cells.join('') };
  }, [uri]);

  return <svg className="admin-totp-qr" viewBox={`0 0 ${matrix.size} ${matrix.size}`} role="img" aria-label="Codice QR per aggiungere Mitchometro Admin a un’app di autenticazione" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
    <rect width={matrix.size} height={matrix.size} fill="#fff" />
    <path d={matrix.path} fill="#111" />
  </svg>;
}
