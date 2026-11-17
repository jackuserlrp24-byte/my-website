export default function Loading() {
  return (
    <div className="flex flex-col px-8 mt-6 max-w-[1100px] mx-auto w-full gap-6 animate-pulse">
      <div className="w-full h-24 bg-neutral-900 border border-neutral-800" />
      <div className="w-full h-64 bg-neutral-900 border border-neutral-800" />
      <div className="w-full h-64 bg-neutral-900 border border-neutral-800" />
    </div>
  );
}
