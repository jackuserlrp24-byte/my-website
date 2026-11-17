export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="w-full h-24 bg-neutral-900 border border-neutral-800" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-neutral-900 border border-neutral-800" />
        ))}
      </div>
      <div className="w-full h-72 bg-neutral-900 border border-neutral-800" />
    </div>
  );
}
