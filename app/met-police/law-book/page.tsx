import LawBookClient from './LawBookClient';
import { LAW_BOOK } from '@/lib/met-lawbook';

export default function LawBookPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Law Book</h1>
        <p className="text-sm text-slate-500 mt-1">Search offences and police powers. Use it as a quick reference while on duty.</p>
      </div>
      <LawBookClient entries={LAW_BOOK} />
    </div>
  );
}
