export function MapSectionSkeleton() {
  return (
    <section id="map" className="relative h-[600px] lg:h-[700px] bg-stone-200 animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-stone-600 text-sm font-medium">กำลังเตรียมแผนที่...</p>
      </div>
      <div className="absolute bottom-6 left-0 right-0 px-4">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/70" />
          ))}
        </div>
      </div>
    </section>
  )
}
