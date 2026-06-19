import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navigation, MapPin, ChevronLeft, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./ui/button.tsx";
import { Card, CardContent } from "./ui/card.tsx";
import {
  getTripNavKeyFromParams,
  loadTripNavProgress,
  saveTripNavProgress,
} from "../lib/trip-navigation-progress";

function normalizeTravelMode(mode) {
  if (mode === "car") return "driving";
  if (mode === "public" || mode === "train") return "transit";
  if (mode === "bike") return "bicycling";
  if (mode === "walking") return "walking";
  return "driving";
}

function isLatLng(value) {
  if (!value) return false;
  return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(String(value).trim());
}

function addProvinceContext(place) {
  if (!place) return "";
  if (isLatLng(place)) return place;
  return place.includes("นนทบุรี") ? place : `${place} นนทบุรี`;
}

function buildGoogleMapsEmbedDirectionsUrl({ destination, origin, mode }) {
  const travelMode = normalizeTravelMode(mode);
  const normalizedOrigin = addProvinceContext(origin || "ตำแหน่งปัจจุบันของคุณ");
  const normalizedDestination = addProvinceContext(destination);
  const originParam = encodeURIComponent(normalizedOrigin);
  const destinationParam = encodeURIComponent(normalizedDestination);

  // ใช้รูปแบบ embed ที่รองรับ iframe โดยตรง
  const dirflg =
    travelMode === "driving"
      ? "d"
      : travelMode === "walking"
      ? "w"
      : travelMode === "bicycling"
      ? "b"
      : "r";
  return `https://www.google.com/maps?hl=th&output=embed&f=d&saddr=${originParam}&daddr=${destinationParam}&dirflg=${dirflg}`;
}

function buildGoogleMapsOpenDirectionsUrl({ destination, origin, mode }) {
  const travelMode = normalizeTravelMode(mode);
  const normalizedOrigin = addProvinceContext(origin || "ตำแหน่งปัจจุบันของคุณ");
  const normalizedDestination = addProvinceContext(destination);
  const originParam = encodeURIComponent(normalizedOrigin);
  const destinationParam = encodeURIComponent(normalizedDestination);
  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=${travelMode}&hl=th`;
}

function getModeLabel(mode) {
  if (mode === "car") return "รถส่วนตัว";
  if (mode === "public") return "รถสาธารณะ";
  if (mode === "train") return "รถไฟฟ้า";
  if (mode === "bike") return "มอเตอร์ไซค์";
  if (mode === "walking") return "เดินเท้า";
  return "รถส่วนตัว";
}

function getEstimatedDurationByMode(mode, segmentIndex) {
  const baseByMode = {
    car: 18,
    public: 32,
    train: 24,
    bike: 20,
    walking: 45,
  };
  const base = baseByMode[mode] || 18;
  const min = base + segmentIndex * 2;
  const max = min + 10;
  return `${min}-${max} นาที`;
}

function buildNavigationInstructions({ origin, destination, mode }) {
  const startPoint = origin || "ตำแหน่งปัจจุบันของคุณ";
  const modeLabel = getModeLabel(mode);
  return [
    { type: "start", text: `ออกเดินทางจาก ${startPoint}` },
    { type: "straight", text: "ตรงไปข้างหน้า 300 เมตร" },
    { type: "left", text: "เลี้ยวซ้ายข้างหน้าเข้าถนนหลัก" },
    { type: "straight", text: `ขับต่อไปตามเส้นทางด้วย${modeLabel} ประมาณ 1.2 กม.` },
    { type: "right", text: "เลี้ยวขวาที่แยกถัดไป" },
    { type: "arrive", text: `คุณใกล้ถึงแล้ว ปลายทางคือ ${destination}` },
  ];
}

export function GogoPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "driving";
  const routeMode = searchParams.get("route") || "new";
  const tripId = searchParams.get("tripId");
  const tripPlaces = (searchParams.get("places") || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const destination = searchParams.get("to") || tripPlaces[tripPlaces.length - 1] || "เกาะเกร็ด";
  const tripName = searchParams.get("trip") || `ทริปไป ${destination}`;
  const tripNavKey = getTripNavKeyFromParams(tripId, tripName);

  const [origin, setOrigin] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const routeInitializedRef = useRef(false);
  const navStateRef = useRef({});
  const defaultRoutePlaces = tripPlaces.length > 0 ? tripPlaces : [destination];
  const [routePlaces, setRoutePlaces] = useState(defaultRoutePlaces);

  const totalTripStops = routePlaces.length;
  const currentRouteDestination = routePlaces[currentPlaceIndex] || destination;
  const currentRouteOrigin =
    currentPlaceIndex === 0
      ? origin || "ตำแหน่งปัจจุบันของคุณ"
      : routePlaces[currentPlaceIndex - 1];

  const embedUrl = useMemo(
    () => buildGoogleMapsEmbedDirectionsUrl({ destination: currentRouteDestination, origin: currentRouteOrigin, mode }),
    [currentRouteDestination, currentRouteOrigin, mode]
  );
  const openMapUrl = useMemo(
    () => buildGoogleMapsOpenDirectionsUrl({ destination: currentRouteDestination, origin: currentRouteOrigin, mode }),
    [currentRouteDestination, currentRouteOrigin, mode]
  );
  const navigationSteps = useMemo(
    () => buildNavigationInstructions({ origin: currentRouteOrigin, destination: currentRouteDestination, mode }),
    [currentRouteOrigin, currentRouteDestination, mode]
  );
  const routeSegments = useMemo(() => {
    return routePlaces.map((place, index) => {
      const from = index === 0 ? origin || "ตำแหน่งปัจจุบันของคุณ" : routePlaces[index - 1];
      const to = place;
      return {
        from,
        to,
        eta: getEstimatedDurationByMode(mode, index),
      };
    });
  }, [routePlaces, origin, mode]);
  const currentNavigationStep = navigationSteps[currentStepIndex];
  const currentTripStopIndex = currentPlaceIndex;
  const currentTripPlace = currentRouteDestination;

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLoadingLocation(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        setOrigin(coords);
        setLoadingLocation(false);
      },
      () => {
        setLocationError("ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    detectCurrentLocation();
  }, []);

  useEffect(() => {
    routeInitializedRef.current = false;
    setCurrentStepIndex(0);
    setCurrentPlaceIndex(0);
    setIsNavigating(false);
    setHasStarted(false);

    const placesFromUrl = tripPlaces.length > 0 ? tripPlaces : [destination];
    setRoutePlaces(placesFromUrl);

    routeInitializedRef.current = true;
  }, [tripNavKey, routeMode, destination, tripPlaces.join("|")]);

  useEffect(() => {
    navStateRef.current = {
      currentPlaceIndex,
      currentStepIndex,
      isNavigating,
      routePlaces,
      hasStarted,
    };
  }, [currentPlaceIndex, currentStepIndex, isNavigating, routePlaces, hasStarted]);

  useEffect(() => {
    if (!routeInitializedRef.current) return;
    saveTripNavProgress(tripNavKey, {
      currentPlaceIndex,
      currentStepIndex,
      isNavigating,
      places: routePlaces,
      hasStarted,
    });
  }, [tripNavKey, currentPlaceIndex, currentStepIndex, isNavigating, routePlaces, hasStarted]);

  useEffect(() => {
    return () => {
      if (!routeInitializedRef.current) return;
      const state = navStateRef.current;
      saveTripNavProgress(tripNavKey, {
        currentPlaceIndex: state.currentPlaceIndex,
        currentStepIndex: state.currentStepIndex,
        isNavigating: state.isNavigating,
        places: state.routePlaces,
        hasStarted: state.hasStarted,
      });
    };
  }, [tripNavKey]);

  const startNavigation = () => {
    setHasStarted(true);
    setIsNavigating(true);
    setCurrentStepIndex(0);
  };

  const nextStep = () => {
    setHasStarted(true);
    setCurrentStepIndex((prev) => {
      const isLastStep = prev >= navigationSteps.length - 1;
      if (!isLastStep) return prev + 1;
      return prev;
    });
  };

  const goToNextPlace = () => {
    if (currentPlaceIndex >= totalTripStops - 1) return;
    setHasStarted(true);
    setCurrentPlaceIndex((prev) => Math.min(prev + 1, totalTripStops - 1));
    setCurrentStepIndex(0);
  };

  const prevStep = () => {
    setCurrentStepIndex((prev) => {
      if (prev > 0) return prev - 1;
      if (currentPlaceIndex > 0) {
        setCurrentPlaceIndex((placePrev) => placePrev - 1);
        return navigationSteps.length - 1;
      }
      return 0;
    });
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIndex(0);
    setCurrentPlaceIndex(0);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button asChild variant="outline" className="bg-white">
            <Link to="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              กลับหน้าหลัก
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          <Card className="border-stone-200">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">ชื่อทริป</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">{tripName}</h1>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-stone-200">
            <iframe
              title="Google Map Navigation"
              src={embedUrl}
              className="h-[60vh] w-full border-0 md:h-[68vh]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Card>

          <Card className="border-stone-200">
            <CardContent className="space-y-4 p-5">
              <h2 className="text-lg font-bold">นำทางภายในเว็บ</h2>

              <div className="rounded-lg bg-primary/5 p-3 text-sm">
                <p className="mb-1 flex items-center gap-2 font-semibold text-primary">
                  <MapPin className="h-4 w-4" />
                  จุดหมายปลายทาง
                </p>
                <p className="text-foreground">{destination}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                <p className="mb-1 font-semibold text-emerald-700">สถานะแผนเที่ยว</p>
                <p className="text-foreground">
                  กำลังไปสถานที่ {currentTripStopIndex + 1}/{totalTripStops}: {currentTripPlace}
                </p>
                <p className="text-muted-foreground">
                  ช่วงเส้นทาง: {currentRouteOrigin} → {currentRouteDestination}
                </p>
                <p className="text-muted-foreground">
                  เวลาโดยประมาณช่วงนี้: {routeSegments[currentTripStopIndex]?.eta || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-stone-100 p-3 text-sm">
                <p className="mb-1 font-semibold text-stone-700">โหมดการเดินทาง</p>
                <p className="text-foreground">{getModeLabel(mode)}</p>
              </div>

              <label className="block text-sm font-medium">
                จุดเริ่มต้น (พิมพ์เองได้)
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="เช่น เซ็นทรัลเวสต์เกต"
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </label>

              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                onClick={detectCurrentLocation}
                disabled={loadingLocation}
              >
                <Navigation className="mr-2 h-4 w-4" />
                {loadingLocation ? "กำลังระบุตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน"}
              </Button>
              {locationError ? (
                <p className="text-xs text-destructive">{locationError}</p>
              ) : null}

              <p className="text-xs text-muted-foreground">
                ระบบอัปเดตเส้นทางบนแผนที่อัตโนมัติเมื่อเปลี่ยนต้นทาง/โหมดเดินทาง
              </p>
              <Button type="button" variant="outline" className="w-full bg-transparent" asChild>
                <a href={openMapUrl} target="_blank" rel="noreferrer">
                  เปิดเส้นทางแบบเต็มใน Google Maps
                </a>
              </Button>

              {!isNavigating ? (
                <Button type="button" className="w-full bg-primary hover:bg-primary/90" onClick={startNavigation}>
                  <Navigation className="mr-2 h-4 w-4" />
                  เริ่มนำทาง
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-primary">คำสั่งปัจจุบัน</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{currentNavigationStep.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ขั้นตอน {currentStepIndex + 1} / {navigationSteps.length}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={prevStep} disabled={currentStepIndex === 0}>
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      ย้อนกลับ
                    </Button>
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={currentStepIndex >= navigationSteps.length - 1}
                    >
                      ถัดไป
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  {currentStepIndex >= navigationSteps.length - 1 && currentPlaceIndex < totalTripStops - 1 ? (
                    <Button type="button" className="w-full" onClick={goToNextPlace}>
                      ไปสถานที่ถัดไป
                    </Button>
                  ) : null}
                  <Button type="button" variant="destructive" className="w-full" onClick={stopNavigation}>
                    สิ้นสุดการนำทาง
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-base font-semibold">ขั้นตอนนำทาง</h3>
              <div className="space-y-2">
                {navigationSteps.map((step, index) => (
                  <div
                    key={`${step.type}-${index}`}
                    className={`flex items-start gap-3 rounded-md p-3 ${
                      isNavigating && index === currentStepIndex
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "bg-stone-50"
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm text-foreground">{step.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-base font-semibold">เส้นทางแนะนำระหว่างสถานที่</h3>
              <div className="space-y-2">
                {routeSegments.map((segment, index) => {
                  const isCurrent = index === currentPlaceIndex;
                  return (
                    <div
                      key={`${segment.from}-${segment.to}-${index}`}
                      className={`rounded-md border p-3 text-sm ${
                        isCurrent
                          ? "border-primary bg-primary/5"
                          : "border-stone-200 bg-white"
                      }`}
                    >
                      <p className="font-semibold text-foreground">
                        ช่วงที่ {index + 1}: {segment.from} → {segment.to}
                      </p>
                      <p className="text-muted-foreground">เวลาโดยประมาณ: {segment.eta}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-base font-semibold">แผนเที่ยว</h3>
              <div className="rounded-lg bg-stone-50 p-3 text-sm">
                <p className="font-medium text-foreground">{tripName}</p>
                <p className="mt-1 text-muted-foreground">ปลายทาง: {destination}</p>
                <p className="text-muted-foreground">การเดินทาง: {getModeLabel(mode)}</p>
                <p className="text-emerald-700">
                  สถานะ: สถานที่ {currentTripStopIndex + 1}/{totalTripStops} ({currentTripPlace})
                </p>
              </div>
              <div className="space-y-2">
                <div className="rounded-md border border-stone-200 p-3 text-sm">
                  <p className="font-semibold text-foreground">1) จุดเริ่มต้น</p>
                  <p className="text-muted-foreground">{origin || "ตำแหน่งปัจจุบันของคุณ"}</p>
                </div>
                {tripPlaces.length > 0 ? (
                  tripPlaces.map((place, index) => (
                    <div key={`${place}-${index}`} className="rounded-md border border-stone-200 p-3 text-sm">
                      <p className="font-semibold text-foreground">{index + 2}) สถานที่ในแผน</p>
                      <p className="text-muted-foreground">{place}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-stone-200 p-3 text-sm">
                    <p className="font-semibold text-foreground">2) จุดหมาย</p>
                    <p className="text-muted-foreground">{destination}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

