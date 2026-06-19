export function HotPlacesSkeleton() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-pulse">
            <div className="h-8 w-48 bg-stone-200 rounded-full mx-auto mb-4" />
            <div className="h-10 w-2/3 max-w-md bg-stone-200 rounded mx-auto mb-3" />
            <div className="h-5 w-1/2 max-w-sm bg-stone-100 rounded mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
