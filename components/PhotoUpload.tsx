'use client';
import { useEffect, useState } from 'react';

// Drop <PhotoUpload /> into the My Details page. Crops to a 3:4 portrait, shrinks it, and saves it.
export default function PhotoUpload() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/portal/photo').then((r) => r.json()).then((d) => d?.ok && setPhoto(d.photo)).catch(() => {});
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setMsg('');
    try {
      const bmp = await createImageBitmap(file);
      const W = 300, H = 400;
      const scale = Math.max(W / bmp.width, H / bmp.height);   // fill the 3:4 frame, centre crop
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const w = bmp.width * scale, h = bmp.height * scale;
      c.getContext('2d')!.drawImage(bmp, (W - w) / 2, (H - h) / 2, w, h);
      const image = c.toDataURL('image/jpeg', 0.85);
      const res = await fetch('/api/portal/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
      const d = await res.json().catch(() => null);
      if (d?.ok) { setPhoto(image); setMsg('Photo saved. It will show on your warrant card in game.'); }
      else setMsg(d?.error === 'not logged in' ? 'Please log in first.' : 'Could not save that photo.');
    } catch { setMsg('That file could not be read as an image.'); }
    setBusy(false);
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <div style={{ width: 90, height: 120, background: '#cfd3da', borderRadius: 8, overflow: 'hidden', flex: 'none' }}>
        {photo && <img src={photo} alt="Your warrant card photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div>
        <label style={{ cursor: 'pointer', fontWeight: 700 }}>
          {busy ? 'Saving...' : photo ? 'Replace photo' : 'Upload a photo'}
          <input type="file" accept="image/*" disabled={busy} style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 0' }}>{msg || 'Face clearly visible, plain background if you can. Cropped to a portrait automatically.'}</p>
      </div>
    </div>
  );
}
