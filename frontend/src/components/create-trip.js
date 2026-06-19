import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "./header";
import { optimizeTripPlaceNames, parseCoordsFromLocation } from "../lib/optimize-trip-route";
import { API_BASE_URL } from "../lib/api.js";

const TRIP_TYPES = ["ทั้งหมด", "สายบุญ", "คาเฟ่", "วิถีชุมชน", "ธรรมชาติ", "ห้าง", "กิจกรรม"];
const TRANSPORT_TYPES = [
  { label: "รถส่วนตัว", icon: "🚗" },
  { label: "รถสาธารณะ", icon: "🚌" },
  { label: "รถไฟฟ้า", icon: "🚆" },
  { label: "มอเตอร์ไซค์", icon: "🏍️" },
];
const PLACES_PER_PAGE = 10;
const MAX_SELECTED_PLACES = 5;

function getTomorrowDateISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateToThaiBuddhist(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y + 543}`;
}

/** ค่า mode ให้ตรงกับ `go-go.js` (normalizeTravelMode / getModeLabel) */
function transportToNavMode(transport) {
  if (transport === "รถส่วนตัว") return "car";
  if (transport === "รถสาธารณะ") return "public";
  if (transport === "รถไฟฟ้า") return "train";
  if (transport === "มอเตอร์ไซค์") return "bike";
  return "public";
}

function buildTripNavigationPath(trip, placesCatalog, routeMode = "new", orderedNames = null) {
  const names =
    orderedNames ||
    (trip.placeIds || [])
      .map((id) => placesCatalog.find((p) => String(p.id) === String(id))?.name)
      .filter(Boolean);
  const params = new URLSearchParams();
  params.set("trip", trip.name?.trim() || "ทริปของฉัน");
  if (trip.id != null) params.set("tripId", String(trip.id));
  params.set("mode", transportToNavMode(trip.transport));
  params.set("route", routeMode);
  if (names.length > 0) {
    params.set("places", names.join("|"));
    params.set("to", names[names.length - 1]);
  } else {
    params.set("to", "เกาะเกร็ด");
  }
  return `/navigation?${params.toString()}`;
}

const FALLBACK_PLACES = [
  { id: "p1", name: "เกาะเกร็ด", area: "ปากเกร็ด", hours: "3 ชม.", type: "วิถีชุมชน", description: "เกาะท่องเที่ยวขึ้นชื่อ มีหมู่บ้านมอญ งานเครื่องปั้นดินเผา", image: "/koh-kret-pottery-market.jpg" },
  { id: "p2", name: "วัดเฉลิมพระเกียรติวรวิหาร", area: "เมืองนนทบุรี", hours: "2 ชม.", type: "สายบุญ", description: "วัดสวยริมแม่น้ำเจ้าพระยา สถาปัตยกรรมไทยโบราณ", image: "/beautiful-thai-temple.jpg" },
  { id: "p3", name: "วัดปรมัยยิกาวาส", area: "ปากเกร็ด", hours: "2 ชม.", type: "สายบุญ", description: "วัดเก่าแก่บนเกาะเกร็ด บรรยากาศเงียบสงบเหมาะกับสายธรรมะ", image: "/ancient-riverside-temple-thailand.jpg" },
  { id: "p4", name: "อุทยานมกุฏรมยสราญ", area: "บางกรวย", hours: "3 ชม.", type: "ธรรมชาติ", description: "พื้นที่สีเขียวสำหรับพักผ่อน เดินเล่น และออกกำลังกาย", image: "/thai-public-park-green-nature.jpg" },
  { id: "p5", name: "ท่าน้ำนนท์", area: "เมืองนนทบุรี", hours: "2 ชม.", type: "วิถีชุมชน", description: "วิถีชีวิตริมน้ำ แหล่งอาหารท้องถิ่น และจุดเชื่อมต่อเรือ", image: "/thai-riverside-community.jpg" },
  { id: "p6", name: "คาเฟ่ริมน้ำพระราม 5", area: "บางกรวย", hours: "1.5 ชม.", type: "คาเฟ่", description: "คาเฟ่วิวริมน้ำ บรรยากาศสบาย เหมาะกับการพักผ่อน", image: "/riverside-cafe-thailand.jpg" },
  { id: "p7", name: "เซ็นทรัลพลาซา แจ้งวัฒนะ", area: "ปากเกร็ด", hours: "3 ชม.", type: "ห้าง", description: "ห้างสรรพสินค้าขนาดใหญ่ ร้านอาหารและกิจกรรมครบครัน", image: "/modern-mall-interior.png" },
  { id: "p8", name: "แทรมโพลีน พาร์ค", area: "เมืองนนทบุรี", hours: "2 ชม.", type: "กิจกรรม", description: "สถานที่กิจกรรมสำหรับครอบครัวและเพื่อน สนุกได้ทั้งวัน", image: "/trampoline-park-activity.jpg" },
];

export default function CreateTrip() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ทั้งหมด");
  const [tripName, setTripName] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [transport, setTransport] = useState("รถสาธารณะ");
  const [selectedPlaceIds, setSelectedPlaceIds] = useState([]);
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [view, setView] = useState("planner");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showNavChoiceModal, setShowNavChoiceModal] = useState(false);
  const [navCalculating, setNavCalculating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [placeMeta, setPlaceMeta] = useState({});
  const [pagePlaces, setPagePlaces] = useState([]);
  const [placeCatalog, setPlaceCatalog] = useState(() => new Map());
  const [placesTotalPages, setPlacesTotalPages] = useState(1);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState("");
  const [placesPage, setPlacesPage] = useState(1);
  const [currentUserId, setCurrentUserId] = useState(null);
  const minTripDate = useMemo(() => getTomorrowDateISO(), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const id = Number(parsed?.id || parsed?.user_id || parsed?.userId);
      if (Number.isInteger(id) && id > 0) {
        setCurrentUserId(id);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  const mapCategoryToTripType = (categoryRaw) => {
    const category = (categoryRaw || "").toLowerCase();
    if (!category) return "กิจกรรม";
    if (category.includes("วัด") || category.includes("มู") || category.includes("ธรรม")) return "สายบุญ";
    if (category.includes("คาเฟ่")) return "คาเฟ่";
    if (category.includes("ชุมชน") || category.includes("เมือง") || category.includes("ตลาด")) return "วิถีชุมชน";
    if (category.includes("ธรรมชาติ") || category.includes("สวน") || category.includes("ป่า")) return "ธรรมชาติ";
    if (category.includes("ห้าง") || category.includes("ช้อป")) return "ห้าง";
    if (category.includes("กิจกรรม") || category.includes("กีฬา") || category.includes("ท่องเที่ยว")) return "กิจกรรม";
    return "กิจกรรม";
  };

  const mapPlaceRow = (p) => {
    const coords = parseCoordsFromLocation(p.location);
    return {
      id: String(p.place_id),
      name: p.place_name || "ไม่ระบุชื่อสถานที่",
      area: p.location || "-",
      location: p.location || "",
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      hours:
        p.open_time && p.close_time
          ? `${String(p.open_time).slice(0, 5)}-${String(p.close_time).slice(0, 5)}`
          : "-",
      type: mapCategoryToTripType(p.category),
      description: p.description || "",
      image: p.image_url || "",
    };
  };

  const mergeIntoCatalog = (rows) => {
    if (!rows?.length) return;
    setPlaceCatalog((prev) => {
      const next = new Map(prev);
      rows.forEach((row) => next.set(row.id, row));
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    const delay = search.trim() ? 300 : 0;
    const timer = window.setTimeout(async () => {
      setPlacesLoading(true);
      setPlacesError("");
      try {
        const q = new URLSearchParams({
          page: String(placesPage),
          limit: String(PLACES_PER_PAGE),
        });
        if (search.trim()) q.set("search", search.trim());
        if (filterType !== "ทั้งหมด") q.set("type", filterType);

        const res = await fetch(`${API_BASE_URL}/places?${q.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || !data?.success || !Array.isArray(data.data)) {
          throw new Error(data?.message || "โหลดสถานที่ไม่สำเร็จ");
        }
        const mapped = data.data.map(mapPlaceRow);
        setPagePlaces(mapped);
        setPlacesTotalPages(data.pagination?.totalPages || 1);
        mergeIntoCatalog(mapped);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setPlacesError(e?.message || "เกิดข้อผิดพลาดในการโหลดสถานที่");
        setPagePlaces([]);
      } finally {
        setPlacesLoading(false);
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [placesPage, search, filterType]);

  const catalogPlaces = useMemo(() => Array.from(placeCatalog.values()), [placeCatalog]);

  const missingCatalogIds = useMemo(() => {
    const needed = new Set([
      ...selectedPlaceIds,
      ...(trips.flatMap((t) => t.placeIds || []) || []),
    ]);
    return [...needed].filter((id) => !placeCatalog.has(id));
  }, [selectedPlaceIds, trips, placeCatalog]);

  useEffect(() => {
    if (!missingCatalogIds.length) return undefined;

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/places/by-ids?ids=${missingCatalogIds.join(",")}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok || !data?.success || !Array.isArray(data.data)) return;
        mergeIntoCatalog(data.data.map(mapPlaceRow));
      } catch (e) {
        if (e?.name !== "AbortError") {
          // ignore
        }
      }
    })();

    return () => controller.abort();
  }, [missingCatalogIds]);

  const loadUserTrips = async (userId) => {
    const res = await fetch(`${API_BASE_URL}/tripplans/user/${userId}`);
    const data = await res.json();
    if (!res.ok || !data?.success || !Array.isArray(data.data)) {
      throw new Error(data?.message || "โหลดทริปของฉันไม่สำเร็จ");
    }
    setTrips(data.data);
  };

  useEffect(() => {
    if (!currentUserId) {
      setTrips([]);
      return;
    }
    loadUserTrips(currentUserId).catch(() => setTrips([]));
  }, [currentUserId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenMyTrip = params.get("view") === "detail";
    if (!shouldOpenMyTrip) return;

    if (trips.length === 0) {
      setView("planner");
      setActiveTripId(null);
      return;
    }

    setActiveTripId((prev) => {
      const stillExists = trips.some((trip) => trip.id === prev);
      return stillExists ? prev : trips[0].id;
    });
    setView("detail");
  }, [location.search, trips]);

  useEffect(() => {
    setPlacesPage(1);
  }, [search, filterType]);

  const selectedPlaces = selectedPlaceIds
    .map((id) => placeCatalog.get(id))
    .filter(Boolean);

  const paginatedPlaces = pagePlaces;
  const totalPlacePages = placesTotalPages;
  const activeTrip = trips.find((trip) => String(trip.id) === String(activeTripId)) || null;
  const canUseSavedTripOrder = Boolean(activeTrip?.placeIds?.length);

  const startNavigation = async (routeMode) => {
    if (!activeTrip) return;

    if (routeMode === "new") {
      setNavCalculating(true);
      try {
        const orderedNames = await optimizeTripPlaceNames(
          activeTrip,
          catalogPlaces,
          placeCatalog,
          API_BASE_URL
        );
        setShowNavChoiceModal(false);
        navigate(buildTripNavigationPath(activeTrip, catalogPlaces, routeMode, orderedNames));
      } catch (err) {
        window.alert(err?.message || "ไม่สามารถคำนวณเส้นทางใหม่ได้");
      } finally {
        setNavCalculating(false);
      }
      return;
    }

    setShowNavChoiceModal(false);
    navigate(buildTripNavigationPath(activeTrip, catalogPlaces, "saved"));
  };

  const resetPlannerView = () => {
    setActiveTripId(null);
    setView("planner");
    setSearch("");
    setFilterType("ทั้งหมด");
    setTripName("");
    setTripDate("");
    setTransport("รถสาธารณะ");
    setSelectedPlaceIds([]);
    setExpandedId(null);
    setPlaceMeta({});
  };

  const saveTrip = async () => {
    if (!currentUserId) {
      window.alert("กรุณาเข้าสู่ระบบก่อนบันทึกทริป");
      return;
    }
    if (!tripName.trim()) {
      window.alert("กรุณากรอกชื่อแผนการเที่ยว");
      return;
    }

    if (!tripDate) {
      window.alert("กรุณาเลือกวันที่เที่ยว");
      return;
    }
    if (tripDate < minTripDate) {
      window.alert("เลือกได้เฉพาะวันเดินทางล่วงหน้าอย่างน้อย 1 วัน (ห้ามวันนี้/ย้อนหลัง)");
      return;
    }
    try {
      const payload = {
        userId: currentUserId,
        tripName: tripName.trim(),
        tripDate,
        transport,
        placeIds: [...selectedPlaceIds],
      };
      const url = activeTripId
        ? `${API_BASE_URL}/tripplans/${activeTripId}`
        : `${API_BASE_URL}/tripplans`;
      const method = activeTripId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "บันทึกทริปไม่สำเร็จ");
      }

      await loadUserTrips(currentUserId);
      resetPlannerView();
    } catch (e) {
      window.alert(e?.message || "บันทึกทริปไม่สำเร็จ");
    }
  };

  const editTrip = (id) => {
    const trip = trips.find((item) => item.id === id);
    if (!trip) return;

    setActiveTripId(trip.id);
    setTripName(trip.name);
    setTripDate(trip.date);
    setTransport(trip.transport);
    setSelectedPlaceIds([...trip.placeIds]);
    setPlaceMeta({ ...(trip.placeMeta || {}) });
    setExpandedId(null);
    setView("planner");
  };

  const addPlaceToTrip = (placeId) => {
    const id = String(placeId);
    let blockedByLimit = false;
    setSelectedPlaceIds((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= MAX_SELECTED_PLACES) {
        blockedByLimit = true;
        return prev;
      }
      return [...prev, id];
    });
    if (blockedByLimit) {
      window.alert("สามารถเพิ่มได้มากสุดแค่ 5 สถานที่");
    }
  };

  const movePlace = (index, direction) => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= selectedPlaceIds.length) return;
    const next = [...selectedPlaceIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setSelectedPlaceIds(next);
  };

  const updatePlaceMeta = (id, key, value) => {
    setPlaceMeta((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: value,
      },
    }));
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    if (!currentUserId) {
      setConfirmDeleteId(null);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/tripplans/${confirmDeleteId}?userId=${currentUserId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "ลบทริปไม่สำเร็จ");
      }
      await loadUserTrips(currentUserId);
      if (activeTripId === confirmDeleteId) resetPlannerView();
      setView("planner");
      setConfirmDeleteId(null);
    } catch (e) {
      window.alert(e?.message || "ลบทริปไม่สำเร็จ");
    }
  };

  const savedTripsSection = (extraClass = "") => (
    <section className={`saved-trips ${extraClass}`.trim()}>
      <h2>ทริปที่บันทึกไว้</h2>
      <div className="trip-list">
        {trips.length === 0 ? (
          <p className="empty-inline">ยังไม่มีทริปที่บันทึกไว้</p>
        ) : (
          trips.map((trip) => (
            <button
              key={trip.id}
              className={`trip-item ${trip.id === activeTripId ? "active" : ""}`}
              type="button"
              onClick={() => {
                setActiveTripId(trip.id);
                setView("detail");
              }}
            >
              <strong>{trip.name || "ไม่ได้ตั้งชื่อ"}</strong>
              <span>{trip.date || "-"}</span>
              <small>{trip.placeIds.length} สถานที่</small>
            </button>
          ))
        )}
      </div>
    </section>
  );

  return (
    <div className="create-trip-page min-h-screen bg-[#F7F4ED] text-[#1f2a44]">
      <style>{`
        .create-trip-page * { box-sizing: border-box; }
        .create-trip-page .page { max-width: 1220px; margin: 0 auto; padding: 24px; }
        .create-trip-page .page h1 { margin: 0; color: #345392; font-size: 40px; line-height: 1.1; }
        .create-trip-page .sub { margin-top: 8px; margin-bottom: 18px; color: #505d7d; font-size: 15px; }
        .create-trip-page .planner-search { margin-bottom: 16px; }
        .create-trip-page .planner-search input { width: 100%; max-width: 420px; border: 1px solid #d8d2c6; border-radius: 999px; padding: 10px 14px; font-size: 14px; }
        .create-trip-page .layout { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
        .create-trip-page .sidebar-column { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .create-trip-page .left-panel, .create-trip-page .right-panel, .create-trip-page .saved-trips, .create-trip-page .detail-panel { background: #fff; border-radius: 16px; border: 1px solid #ebe4d9; padding: 16px; }
        .create-trip-page .right-panel { display: flex; flex-direction: column; width: 100%; }
        .create-trip-page .left-panel h2, .create-trip-page .right-panel h2, .create-trip-page .saved-trips h2, .create-trip-page .detail-panel h2 { font-size: 28px; line-height: 1.2; margin: 0 0 12px; }
        .create-trip-page .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .create-trip-page .chip { border: 1px solid #d9d2c7; background: #F7F4ED; color: #1f2a44; border-radius: 999px; padding: 7px 12px; cursor: pointer; font-size: 13px; }
        .create-trip-page .chip.active { background: #7D5A85; color: #fff; border-color: #7D5A85; }
        .create-trip-page .cards-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
        .create-trip-page .pagination { display: flex; justify-content: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
        .create-trip-page .page-btn {
          border: 1px solid #d9d2c7;
          background: #fff;
          color: #1f2a44;
          border-radius: 8px;
          min-width: 34px;
          padding: 6px 10px;
          font-size: 13px;
          cursor: pointer;
        }
        .create-trip-page .page-btn.active {
          background: #345392;
          border-color: #345392;
          color: #fff;
          font-weight: 700;
        }
        .create-trip-page .place-card {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid #e3ddcf;
          border-radius: 14px;
          overflow: hidden;
          background: #F7F4ED;
        }
        .create-trip-page .image-box { position: relative; width: 100%; height: 220px; min-height: 220px; display: block; font-size: 40px; color: #7f7f7f; background: #fff; overflow: hidden; }
        .create-trip-page .image-box::before { content: "🖼️"; position: absolute; inset: 0; display: grid; place-items: center; z-index: 0; }
        .create-trip-page .image-box img {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: block;
          width: 100% !important;
          height: 100% !important;
          min-width: 100%;
          min-height: 100%;
          max-width: none;
          object-fit: cover;
          object-position: center;
        }
        .create-trip-page .card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 10px;
          font-size: 14px;
        }
        .create-trip-page .row { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; gap: 8px; }
        .create-trip-page .card-hours { margin: 8px 0 0; font-size: 13px; color: #4a5568; }
        .create-trip-page .card-add-wrap { margin-top: auto; padding-top: 12px; display: flex; justify-content: flex-end; }
        .create-trip-page .tag { background: #CD9AB1; color: #fff; border-radius: 999px; padding: 4px 10px; font-size: 11px; }
        .create-trip-page .add-btn { border: none; background: #345392; color: #fff; border-radius: 999px; padding: 6px 14px; cursor: pointer; font-size: 12px; }
        .create-trip-page .field { display: block; margin-bottom: 12px; font-weight: 600; }
        .create-trip-page .field input { width: 100%; margin-top: 6px; border: 1px solid #d8d2c6; border-radius: 10px; padding: 8px 10px; }
        .create-trip-page .field-note { display: block; margin-top: 6px; font-size: 12px; color: #5f6c8f; }
        .create-trip-page .transport-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
        .create-trip-page .transport { border: 1px solid #d8d2c6; background: #F7F4ED; border-radius: 10px; padding: 10px 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
        .create-trip-page .transport.active { background: #7D5A85; border-color: #7D5A85; color: #fff; }
        .create-trip-page .selected-box {
          min-height: 190px;
          flex: 1 1 auto;
          border: 1px dashed #d4cdc1;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .create-trip-page .empty-pin { text-align: center; font-size: 44px; margin-top: 22px; }
        .create-trip-page .selected-box p { text-align: center; color: #6a738d; }
        .create-trip-page .mini-card { position: relative; background: #F7F4ED; border: 1px solid #e3ddcf; border-radius: 10px; padding: 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px; }
        .create-trip-page .mini-remove { position: absolute; right: 8px; top: 8px; border: none; background: #CD9AB1; color: #fff; border-radius: 6px; font-size: 12px; padding: 3px 8px; cursor: pointer; }
        .create-trip-page .mini-tools { display: flex; align-items: center; gap: 6px; margin-right: 64px; margin-bottom: 4px; }
        .create-trip-page .mini-rank { font-size: 12px; font-weight: 700; color: #345392; }
        .create-trip-page .mini-tool-btn { border: 1px solid #d8d2c6; background: #fff; border-radius: 6px; cursor: pointer; padding: 2px 6px; font-size: 12px; }
        .create-trip-page .mini-toggle { border: 1px solid #d8d2c6; background: #fff; border-radius: 8px; cursor: pointer; padding: 4px 8px; font-size: 12px; margin-top: 4px; width: fit-content; }
        .create-trip-page .mini-extra { margin-top: 8px; display: grid; gap: 8px; }
        .create-trip-page .mini-extra input { width: 100%; border: 1px solid #d8d2c6; border-radius: 8px; padding: 6px 8px; font-size: 12px; }
        .create-trip-page .form-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .create-trip-page .btn-save,
        .create-trip-page .btn-delete,
        .create-trip-page .btn-nav,
        .create-trip-page .btn-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          border: none;
          border-radius: 10px;
          padding: 9px 16px;
          font-size: 14px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          color: #fff;
          text-decoration: none;
        }
        .create-trip-page .btn-save { background: #345392; }
        .create-trip-page .btn-delete { background: #CD9AB1; }
        .create-trip-page .btn-back { background: #7D5A85; }
        .create-trip-page .btn-nav {
          background: #0d9488;
        }
        .create-trip-page .btn-nav:hover { background: #0f766e; color: #fff; }
        .create-trip-page .detail-panel h3 { margin: 16px 0 10px; font-size: 18px; }
        .create-trip-page .trip-place-list {
          list-style: none;
          margin: 0 0 16px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .create-trip-page .trip-place-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          background: #F7F4ED;
          border: 1px solid #e3ddcf;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.5;
        }
        .create-trip-page .trip-place-list li::before {
          content: "";
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          margin-top: 7px;
          border-radius: 50%;
          background: #345392;
        }
        .create-trip-page .saved-trips { margin-top: 0; }
        .create-trip-page .saved-trips--below { margin-top: 16px; }
        .create-trip-page .trip-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 10px; }
        .create-trip-page .sidebar-column .trip-list { grid-template-columns: 1fr; }
        .create-trip-page .trip-item { text-align: left; border: 1px solid #e3ddcf; background: #fff; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 3px; cursor: pointer; }
        .create-trip-page .trip-item.active { border-color: #345392; }
        .create-trip-page .empty-inline { color: #7a8199; margin: 0; }
        .create-trip-page .modal-wrap { position: fixed; inset: 0; z-index: 50; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 16px; }
        .create-trip-page .modal { width: min(400px, 92vw); background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); }
        .create-trip-page .nav-choice-modal h3 { margin: 0 0 8px; font-size: 20px; color: #1f2a44; }
        .create-trip-page .nav-choice-modal p { margin: 0 0 16px; font-size: 14px; color: #5f6c8f; line-height: 1.5; }
        .create-trip-page .nav-choice-note { margin: -8px 0 16px !important; font-size: 13px !important; color: #345392 !important; }
        .create-trip-page .nav-choice-actions { display: flex; flex-direction: column; gap: 10px; }
        .create-trip-page .nav-choice-btn {
          width: 100%;
          min-height: 44px;
          border: 2px solid transparent;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          color: #fff;
          box-sizing: border-box;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }
        .create-trip-page .nav-choice-btn:not(:disabled):hover {
          border-color: #fff;
        }
        .create-trip-page .nav-choice-btn--new { background: #7D5A85; }
        .create-trip-page .nav-choice-btn--new:not(:disabled):hover { background: #6b4d72; }
        .create-trip-page .nav-choice-btn--resume { background: #345392; }
        .create-trip-page .nav-choice-btn--resume:not(:disabled):hover { background: #2c4578; }
        .create-trip-page .nav-choice-btn--resume:disabled { background: #c5cad8; cursor: not-allowed; }
        .create-trip-page .nav-choice-btn--cancel { background: #dc3545; color: #fff; }
        .create-trip-page .nav-choice-btn--cancel:hover { background: #c82333; }
        .create-trip-page .nav-choice-hint { margin-top: 8px; font-size: 12px; color: #7a8199; text-align: center; }
        @media (max-width: 900px) {
          .create-trip-page .layout { grid-template-columns: 1fr; }
          .create-trip-page .sidebar-column { width: 100%; }
          .create-trip-page .cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <Header />

      <div className="page">
        <h1>วางแผนการเที่ยว</h1>
        <p className="sub">เลือกสถานที่ท่องเที่ยวและจัดเรียงลำดับเพื่อสร้างแผนการเที่ยวของคุณ</p>
        <div className="planner-search">
          <input type="text" placeholder="ค้นหาสถานที่" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {view === "detail" ? (
          <div className="detail-panel">
            {!activeTrip ? (
              <>
                <h2>ไม่พบทริป</h2>
                <button className="btn-save" type="button" onClick={resetPlannerView}>กลับหน้าวางแผน</button>
              </>
            ) : (
              <>
                <h2>{activeTrip.name}</h2>
                <p>วันที่เที่ยว: {activeTrip.date || "-"}</p>
                <p>การเดินทาง: {activeTrip.transport}</p>
                <h3>สถานที่ในทริป</h3>
                <ul className="trip-place-list">
                  {activeTrip.placeIds.length === 0 ? (
                    <li>ไม่มีสถานที่</li>
                  ) : (
                    activeTrip.placeIds.map((id) => {
                      const place = placeCatalog.get(id);
                      if (!place) return null;
                      const itemMeta = activeTrip.placeMeta?.[id] || {};
                      return (
                        <li key={id}>
                          <span>
                            {place.name} ({place.hours})
                            {itemMeta.time ? ` - เวลา ${itemMeta.time}` : ""}
                            {itemMeta.notes ? ` - โน้ต: ${itemMeta.notes}` : ""}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
                <div className="form-actions">
                  <button className="btn-nav" type="button" onClick={() => setShowNavChoiceModal(true)}>
                    นำทาง
                  </button>
                  <button className="btn-save" type="button" onClick={() => editTrip(activeTrip.id)}>แก้ไข</button>
                  <button className="btn-delete" type="button" onClick={() => setConfirmDeleteId(activeTrip.id)}>ลบ</button>
                  <button className="btn-back" type="button" onClick={resetPlannerView}>กลับ</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="layout">
            <section className="left-panel">
              <h2>สถานที่ท่องเที่ยว</h2>
              <div className="chips">
                {TRIP_TYPES.map((type) => (
                  <button key={type} className={`chip ${filterType === type ? "active" : ""}`} type="button" onClick={() => setFilterType(type)}>
                    {type}
                  </button>
                ))}
              </div>
              <div className="cards-grid">
                {placesLoading ? (
                  <p className="empty-inline">กำลังโหลดสถานที่...</p>
                ) : null}
                {!placesLoading && placesError ? (
                  <p className="empty-inline">{placesError}</p>
                ) : null}
                {!placesLoading && pagePlaces.length === 0 ? (
                  <p className="empty-inline">ไม่พบสถานที่ท่องเที่ยว</p>
                ) : (
                  paginatedPlaces.map((place) => (
                    <article className="place-card" key={place.id}>
                      <div className="image-box">
                        {place.image ? (
                          <img src={place.image} alt={place.name} loading="lazy" decoding="async" />
                        ) : null}
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <strong>{place.name}</strong>
                          <span className="tag">{place.area}</span>
                        </div>
                        <small>{place.description || "รายละเอียดสถานที่"}</small>
                        <p className="card-hours">🕒 {place.hours}</p>
                        <div className="card-add-wrap">
                          <button
                            className="add-btn"
                            type="button"
                            onClick={() => addPlaceToTrip(place.id)}
                          >
                            + เพิ่ม
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
              {!placesLoading && totalPlacePages > 1 ? (
                <div className="pagination">
                  {Array.from({ length: totalPlacePages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`page-btn ${placesPage === page ? "active" : ""}`}
                      onClick={() => setPlacesPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="sidebar-column">
            <aside className="right-panel">
              <h2>แผนเที่ยวของคุณ</h2>
              <label className="field">
                ชื่อแผนการเที่ยว
                <input type="text" value={tripName} onChange={(e) => setTripName(e.target.value)} />
              </label>
              <label className="field">
                วันที่เที่ยว
                <input
                  type="date"
                  value={tripDate}
                  min={minTripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                />
                <small className="field-note">
                  {tripDate
                    ? `วันที่เลือก (พ.ศ.): ${formatDateToThaiBuddhist(tripDate)}`
                    : "เลือกได้เฉพาะวันพรุ่งนี้เป็นต้นไป (แสดงปี พ.ศ.)"}
                </small>
              </label>

              <div className="transport-grid">
                {TRANSPORT_TYPES.map((item) => (
                  <button
                    key={item.label}
                    className={`transport ${transport === item.label ? "active" : ""}`}
                    type="button"
                    onClick={() => setTransport(item.label)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="selected-box">
                {selectedPlaces.length === 0 ? (
                  <>
                    <div className="empty-pin">📍</div>
                    <p>ยังไม่มีสถานที่ในแผนการเที่ยว</p>
                  </>
                ) : (
                  selectedPlaces.map((place, index) => (
                    <article className="mini-card" key={place.id}>
                      <div className="mini-tools">
                        <span className="mini-rank">#{index + 1}</span>
                        <button className="mini-tool-btn" type="button" onClick={() => movePlace(index, "up")} disabled={index === 0}>↑</button>
                        <button className="mini-tool-btn" type="button" onClick={() => movePlace(index, "down")} disabled={index === selectedPlaces.length - 1}>↓</button>
                      </div>
                      <button
                        className="mini-remove"
                        type="button"
                        onClick={() => setSelectedPlaceIds((prev) => prev.filter((id) => id !== place.id))}
                      >
                        ลบ
                      </button>
                      <strong>{place.name}</strong>
                      <span>{place.hours}</span>
                      <button className="mini-toggle" type="button" onClick={() => setExpandedId((prev) => (prev === place.id ? null : place.id))}>
                        {expandedId === place.id ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
                      </button>
                      {expandedId === place.id && (
                        <div className="mini-extra">
                          <input
                            type="time"
                            value={placeMeta[place.id]?.time || ""}
                            onChange={(e) => updatePlaceMeta(place.id, "time", e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="โน้ต เช่น จองล่วงหน้า"
                            value={placeMeta[place.id]?.notes || ""}
                            onChange={(e) => updatePlaceMeta(place.id, "notes", e.target.value)}
                          />
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>

              <div className="form-actions">
                <button className="btn-save" type="button" onClick={saveTrip}>บันทึก</button>
                <button
                  className="btn-delete"
                  type="button"
                  onClick={() => {
                    if (activeTripId) setConfirmDeleteId(activeTripId);
                    else setSelectedPlaceIds([]);
                  }}
                >
                  ลบ
                </button>
              </div>
            </aside>

            {savedTripsSection()}
            </div>
          </div>
        )}

        {view === "detail" ? savedTripsSection("saved-trips--below") : null}
      </div>

      {showNavChoiceModal && activeTrip && (
        <div className="modal-wrap" onClick={() => setShowNavChoiceModal(false)}>
          <div className="modal nav-choice-modal" onClick={(e) => e.stopPropagation()}>
            <h3>เลือกเส้นทางนำทาง</h3>
            <p>ต้องการเรียงสถานที่ใหม่ตามตำแหน่งคุณ หรือใช้ลำดับที่จัดไว้ในทริป?</p>
            <p className="nav-choice-note">
              เส้นทางใหม่จะเรียงสถานที่จากใกล้ตำแหน่งคุณที่สุด แล้วไล่ไปยังสถานที่ที่ใกล้กันถัดไป
            </p>
            <p className="nav-choice-note">
              เส้นทางเดิมจะนำทางตามลำดับสถานที่ที่คุณจัดไว้ในแผนการเที่ยว
            </p>
            <div className="nav-choice-actions">
              <button
                className="nav-choice-btn nav-choice-btn--new"
                type="button"
                disabled={navCalculating}
                onClick={() => startNavigation("new")}
              >
                {navCalculating ? "กำลังคำนวณเส้นทาง..." : "ใช้เส้นทางใหม่"}
              </button>
              <button
                className="nav-choice-btn nav-choice-btn--resume"
                type="button"
                disabled={!canUseSavedTripOrder || navCalculating}
                onClick={() => startNavigation("saved")}
              >
                ใช้เส้นทางเดิม
              </button>
              <button className="nav-choice-btn nav-choice-btn--cancel" type="button" onClick={() => setShowNavChoiceModal(false)}>
                ยกเลิก
              </button>
            </div>
            {!canUseSavedTripOrder && (
              <p className="nav-choice-hint">ทริปนี้ยังไม่มีสถานที่สำหรับนำทาง</p>
            )}
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="modal-wrap">
          <div className="modal">
            <h3>ยืนยันการลบ</h3>
            <p>ต้องการลบทริปนี้ใช่หรือไม่?</p>
            <div className="form-actions">
              <button className="btn-delete" type="button" onClick={confirmDelete}>ใช่</button>
              <button className="chip" type="button" onClick={() => setConfirmDeleteId(null)}>ไม่</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
