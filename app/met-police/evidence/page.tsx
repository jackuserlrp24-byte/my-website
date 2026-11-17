import Link from 'next/link';
import { getOfficer, canManageMet } from '@/lib/met-access';
import { supabaseAdmin } from '@/lib/portal';
import { ui, when } from '@/lib/met-util';
import { EVIDENCE_BUCKET } from '@/lib/met-evidence';
import { deleteEvidence, uploadEvidence } from './actions';

export const dynamic = 'force-dynamic';

interface Exhibit {
  id: string;
  created_at: string;
  exhibit_ref: string;
  description: string;
  incident_ref: string | null;
  file_path: string;
  file_name: string;
  mime: string | null;
  size_bytes: number;
  uploaded_by_name: string | null;
}

const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default async function EvidencePage() {
  const officer = (await getOfficer())!;
  const manager = canManageMet(officer);

  let q = supabaseAdmin.from('met_evidence').select('*').order('created_at', { ascending: false }).limit(60);
  if (!manager) q = q.eq('uploaded_by_id', officer.id);
  const { data, error } = await q;
  const items = (data ?? []) as Exhibit[];

  // Short-lived links, so files are never public.
  const urlByPath = new Map<string, string>();
  if (items.length) {
    const { data: signed } = await supabaseAdmin.storage.from(EVIDENCE_BUCKET).createSignedUrls(items.map((i) => i.file_path), 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Evidence</h1>
        <p className={ui.sub}>Upload evidence and view your exhibits. Every item gets an exhibit reference (EX-......) to quote in statements and reports.</p>
      </div>

      {error && <p className={ui.warn}>Evidence is not set up yet. Run supabase/met-portal.sql in Supabase.</p>}

      <form action={uploadEvidence} className={ui.panel}>
        <p className="text-sm font-bold text-slate-900">Upload evidence</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={ui.label}>Description <span className="text-red-600">*</span></label>
            <input name="description" required maxLength={300} placeholder="e.g. Photo of knife recovered from vehicle" className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Incident reference (optional)</label>
            <input name="incident_ref" maxLength={20} placeholder="INC-123456" className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>File <span className="text-red-600">*</span></label>
            <input
              name="file"
              type="file"
              required
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,audio/mpeg,audio/wav,audio/ogg,audio/webm,video/mp4,video/webm"
              className="w-full text-sm text-slate-700 file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-md file:bg-slate-200 file:text-slate-800 file:text-sm file:font-semibold"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">Images, PDF, text, audio or short video, up to 4 MB. For longer footage use <Link href="/met-police/body-worn-video" className="text-[#00247D] font-semibold hover:underline">Body-Worn Video</Link>.</p>
        <button type="submit" className={ui.btn}>Upload</button>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={ui.eyebrow}>{manager ? 'All exhibits' : 'My exhibits'}</h2>
          <Link href="/met-police/body-worn-video" className="text-xs font-semibold text-[#00247D] hover:underline">Body-worn video &rarr;</Link>
        </div>
        {items.length === 0 ? (
          <p className={ui.empty}>No exhibits yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((i) => {
              const url = urlByPath.get(i.file_path);
              const isImage = (i.mime ?? '').startsWith('image/');
              return (
                <article key={i.id} className={ui.card}>
                  {isImage && url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={i.description} className="w-full h-40 object-cover rounded-md mb-3 border border-slate-200" />
                  )}
                  <p className="text-xs font-mono text-slate-500">{i.exhibit_ref}{i.incident_ref ? ` · ${i.incident_ref}` : ''}</p>
                  <p className="text-sm font-semibold text-slate-900">{i.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {i.file_name} · {size(i.size_bytes)} · {when(i.created_at)}
                    {manager && i.uploaded_by_name ? ` · ${i.uploaded_by_name}` : ''}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#00247D] hover:underline">Open &#8599;</a>
                    ) : (
                      <span className="text-xs text-slate-400">File unavailable</span>
                    )}
                    {manager && (
                      <form action={deleteEvidence}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className={ui.danger}>Delete</button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
