import { TRAINING_TEMPLATES } from '@/lib/training-templates';

const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Which kind of training this is (e.g. "ipp-induction"): the template it was posted from, otherwise the template
 * whose title matches, otherwise the normalised title. A training bar is tied to one of these keys.
 */
export function trainingKey(t: { title: string; template_key?: string | null }): string {
  if (t.template_key) return t.template_key;
  const byTitle = TRAINING_TEMPLATES.find((x) => norm(x.title) === norm(t.title));
  return byTitle ? byTitle.key : norm(t.title);
}

export function trainingKeyLabel(key: string): string {
  return TRAINING_TEMPLATES.find((x) => x.key === key)?.name ?? key;
}
