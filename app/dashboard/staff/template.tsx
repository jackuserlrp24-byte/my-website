export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="staff-page-enter [&>*]:px-0! [&>*]:mt-0! [&>*]:mx-0! [&>*]:max-w-none!">{children}</div>;
}
