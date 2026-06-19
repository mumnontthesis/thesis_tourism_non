import { useEffect, useRef, useState } from "react";
import { MapSection } from "./components/map-section";
import { MapSectionSkeleton } from "./components/map-section-skeleton";
import { MapSectionSidebar } from "./components/map-section-sidebar";
import { TripRecommendations } from "./components/trip-recommendations";
import { HotPlaces } from "./components/hot-places";
import { Header } from "./components/header";
import { Button } from "./components/ui/button.tsx";
import { Map, LayoutList } from "lucide-react";
import { useInView } from "./hooks/use-in-view";
import {
  HOT_PLACES_SECTION_ID,
  clearHotPlacesReturn,
  hasHotPlacesCached,
  hasStaleReturnFlag,
  isRestoringHotPlaces,
  loadHotPlaces,
  peekHotPlacesReturn,
  shouldForceRefreshHotPlaces,
} from "./lib/hot-places-cache";

function Homepage() {
  const [returningFromDetail] = useState(() => isRestoringHotPlaces());
  const returnScrollY = useRef(peekHotPlacesReturn());
  const didRestoreScroll = useRef(false);
  const [mapStyle, setMapStyle] = useState("overlay");
  const [mapSectionRef, mapSectionVisible] = useInView();
  const [hotPlacesRef] = useInView();

  useEffect(() => {
    if (hasStaleReturnFlag()) {
      clearHotPlacesReturn();
    }
    if (hasHotPlacesCached()) {
      return;
    }
    if (shouldForceRefreshHotPlaces()) {
      loadHotPlaces({ forceRefresh: true }).catch(() => {});
      return;
    }
    loadHotPlaces().catch(() => {});
  }, []);

  useEffect(() => {
    if (!returningFromDetail || didRestoreScroll.current) return undefined;

    const scrollY = returnScrollY.current;
    const restore = () => {
      didRestoreScroll.current = true;
      clearHotPlacesReturn();
      if (scrollY != null && scrollY > 0) {
        window.scrollTo({ top: scrollY, behavior: "auto" });
        return;
      }
      document
        .getElementById(HOT_PLACES_SECTION_ID)
        ?.scrollIntoView({ behavior: "auto", block: "start" });
    };

    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });
    const timer = window.setTimeout(restore, 150);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [returningFromDetail]);

  return (
    <div className="min-h-screen">
      <Header />

      <TripRecommendations />

      <div className="h-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5" />

      <div className="bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-600">
              สไตล์การแสดงผล:
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => setMapStyle("overlay")}
                className={`rounded-full ${
                  mapStyle === "overlay"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : ""
                }`}
              >
                <Map className="w-4 h-4 mr-2" />
                แผนที่พร้อมการ์ด
              </Button>

              <Button
                onClick={() => setMapStyle("sidebar")}
                className={`rounded-full ${
                  mapStyle === "sidebar"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : ""
                }`}
              >
                <LayoutList className="w-4 h-4 mr-2" />
                แบบ Sidebar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div ref={mapSectionRef}>
        {mapStyle === "overlay" &&
          (mapSectionVisible ? <MapSection /> : <MapSectionSkeleton />)}
        {mapStyle === "sidebar" && mapSectionVisible && <MapSectionSidebar />}
        {mapStyle === "sidebar" && !mapSectionVisible && <MapSectionSkeleton />}
      </div>

      <div id={HOT_PLACES_SECTION_ID} ref={hotPlacesRef}>
        <HotPlaces />
      </div>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-100 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-xl mb-4">เที่ยวนนทบุรี</h3>
              <p className="text-stone-400">
                ค้นพบสถานที่ท่องเที่ยวที่น่าสนใจในจังหวัดนนทบุรี
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">ลิงค์ด่วน</h4>
              <ul className="space-y-2 text-stone-400">
                <li><a href="#map">แผนที่</a></li>
                <li><a href="#trips">แนะนำเที่ยว</a></li>
                <li><a href="#contact">ติดต่อเรา</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">ติดตามเรา</h4>
              <div className="flex gap-4">
                <a href="#">Facebook</a>
                <a href="#">Instagram</a>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-800 mt-8 pt-8 text-center text-stone-500">
            © 2025 เที่ยวนนทบุรี. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;
