export default function Loading() {
  return (
    <div className="flex flex-col px-8 mt-4 max-w-[1450px] mx-auto w-full gap-6 pb-16 animate-pulse">
      <div className="w-full h-28 bg-neutral-900 border border-neutral-800" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="h-56 bg-neutral-900 border border-neutral-800" />
        <div className="h-56 bg-neutral-900 border border-neutral-800" />
        <div className="h-56 bg-neutral-900 border border-neutral-800" />
        <div className="h-56 bg-neutral-900 border border-neutral-800" />
      </div>
    </div>
  );
}
