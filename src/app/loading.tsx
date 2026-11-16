export default function Loading() {
  return (
    <div className="container-x py-16" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-6 h-16 w-2/3" />
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton aspect-[5/4]" />)}
      </div>
    </div>
  );
}
