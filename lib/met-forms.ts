// Forms & paperwork shown on /met-police/forms. Add one entry per form: title, a short description and the link
// (Google Form, Google Doc, PDF ... anything that opens in a browser). "category" groups them on the page.
export interface MetForm {
  title: string;
  description: string;
  url: string;
  category?: string;
}

export const MET_FORMS: MetForm[] = [
  // Example - copy this, fill it in, remove the // marks:
  // { title: 'Incident Report', description: 'Write up any incident you attended.', url: 'https://forms.gle/...', category: 'Reports' },
];
