"use client"
import { Menu, X, Search, User, ShieldCheck, LogOut, ChevronDown, MapPin, Route } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "./ui/button.tsx"
import { Input } from "./ui/input.tsx"
import { Link, useNavigate } from "react-router-dom"

import { API_BASE_URL } from "../lib/api.js"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [searchResults, setSearchResults] = useState({ places: [], trips: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)

  // ✅ ส่วนที่เพิ่มเข้ามา: สถานะและฟังก์ชันจัดการ User Session
  const [currentUser, setCurrentUser] = useState(null)
  const navigate = useNavigate()
  const userMenuRef = useRef(null)
  const searchWrapRef = useRef(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser))
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false)
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchPanelOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults({ places: [], trips: [] })
      setSearchLoading(false)
      return undefined
    }

    const id = window.setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (res.ok && data?.success) {
          setSearchResults({
            places: Array.isArray(data.data?.places) ? data.data.places : [],
            trips: Array.isArray(data.data?.trips) ? data.data.trips : [],
          })
        } else {
          setSearchResults({ places: [], trips: [] })
        }
      } catch {
        setSearchResults({ places: [], trips: [] })
      } finally {
        setSearchLoading(false)
      }
    }, 320)

    return () => window.clearTimeout(id)
  }, [searchQuery])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setSearchResults({ places: [], trips: [] })
    setSearchPanelOpen(false)
  }, [])

  const goToPlace = (placeId) => {
    clearSearch()
    navigate(`/place/${placeId}`)
  }

  const goToTrip = (recommendId) => {
    clearSearch()
    navigate(`/trip/${recommendId}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    setCurrentUser(null)
    navigate('/login')
  }

  return (
    <header className="relative z-50 w-full bg-stone-500/90 backdrop-blur-sm shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 h-14 md:h-16">
          
          {/* Logo (เปลี่ยนจาก href เป็น to) */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={`${process.env.PUBLIC_URL || ""}/brand-logo.png`}
              alt="โลโก้เที่ยวนนทบุรี"
              className="w-10 h-10 rounded-full bg-transparent object-contain shrink-0 p-0"
            />
            <div>
              <h1 className="font-bold text-xl text-white">เที่ยวนนทบุรี</h1>
              <p className="text-xs text-stone-200 hidden md:block">Nonthaburi Tourism</p>
            </div>
          </Link>

          {/* Search Bar — ค้นหา place + recommend_trip */}
          <div className="flex-1 max-w-md" ref={searchWrapRef}>
            <div className="relative z-[70]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-600 pointer-events-none" />
              <Input
                type="text"
                placeholder="ค้นหาสถานที่หรือแผนแนะนำ"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchPanelOpen(true)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-full border-0 focus-visible:ring-2 focus-visible:ring-white"
                autoComplete="off"
              />

              {searchPanelOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-2 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-stone-200 bg-white text-stone-800 shadow-xl">
                  {searchLoading ? (
                    <p className="px-4 py-3 text-sm text-stone-500">กำลังค้นหา...</p>
                  ) : (
                    <>
                      {searchResults.places.length === 0 && searchResults.trips.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-stone-500">ไม่พบผลลัพธ์</p>
                      ) : (
                        <div className="py-2">
                          {searchResults.places.length > 0 && (
                            <div className="px-2 pb-2">
                              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                                สถานที่
                              </p>
                              {searchResults.places.map((p) => (
                                <button
                                  key={`p-${p.place_id}`}
                                  type="button"
                                  className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-stone-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => goToPlace(p.place_id)}
                                >
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                  <span>
                                    <span className="font-medium text-stone-900">{p.place_name}</span>
                                    {p.category || p.location ? (
                                      <span className="mt-0.5 block text-xs text-stone-500">
                                        {[p.category, p.location].filter(Boolean).join(" · ")}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchResults.trips.length > 0 && (
                            <div className="px-2 pb-2">
                              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                                แผนแนะนำ
                              </p>
                              {searchResults.trips.map((t) => (
                                <button
                                  key={`t-${t.recommend_id}`}
                                  type="button"
                                  className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-stone-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => goToTrip(t.recommend_id)}
                                >
                                  <Route className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                  <span>
                                    <span className="font-medium text-stone-900">{t.trip_name}</span>
                                    {t.description ? (
                                      <span className="mt-0.5 line-clamp-2 block text-xs text-stone-500">
                                        {t.description}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">

            {/*เช็คว่าถ้ามี currentUser ให้โชว์ชื่อ ถ้าไม่มีให้โชว์ Sign In */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                {/* โปรไฟล์แบบ Dropdown: แสดงแค่ชื่อบนแถบบน */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                    className="hidden sm:flex items-center gap-2 rounded-full px-2 py-1 hover:bg-white/10 transition-colors"
                    aria-haspopup="menu"
                    aria-expanded={isUserDropdownOpen}
                  >
                    <div className="text-right">
                      <p className="text-sm font-bold text-white leading-none">{currentUser.username || currentUser.email?.split('@')[0]}</p>
                      <p className="text-[10px] text-white/70 uppercase">{currentUser.userType}</p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                      {(currentUser.username || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/80 transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-stone-200 bg-white shadow-lg z-[60] p-2">
                      <Link to="/create-trip?view=detail" onClick={() => setIsUserDropdownOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start !bg-transparent !text-stone-700 rounded-lg"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#F7F4ED"
                            e.currentTarget.style.color = "#1d4ed8"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent"
                            e.currentTarget.style.color = "#44403c"
                          }}
                        >
                          My trip
                        </Button>
                      </Link>
                      {(currentUser.userType === "entrepreneur" || currentUser.userType === "business") && (
                        <Link to="/business-dashboard" onClick={() => setIsUserDropdownOpen(false)}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start !bg-transparent !text-stone-700 rounded-lg"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F7F4ED"
                              e.currentTarget.style.color = "#1d4ed8"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent"
                              e.currentTarget.style.color = "#44403c"
                            }}
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            จัดการระบบ
                          </Button>
                        </Link>
                      )}
                      {currentUser.userType === "admin" && (
                        <Link to="/admin" onClick={() => setIsUserDropdownOpen(false)}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start !bg-transparent !text-stone-700 rounded-lg"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F7F4ED"
                              e.currentTarget.style.color = "#1d4ed8"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent"
                              e.currentTarget.style.color = "#44403c"
                            }}
                          >
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Admin
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start !text-red-600 rounded-lg"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#F7F4ED"
                          e.currentTarget.style.color = "#dc2626"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = ""
                          e.currentTarget.style.color = "#dc2626"
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        ออก
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* โชว์ปุ่ม Sign In เมื่อยังไม่ได้ Login */
              <Link to="/login">
                <Button variant="ghost" className="gap-2 text-white hover:bg-white/20 hover:text-white rounded-full">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-stone-700" />
                  </div>
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-white/20">
            <div className="flex flex-col gap-4">
              <a
                href="#hero"
                className="text-white hover:text-primary transition-colors font-medium px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                หน้าแรก
              </a>
              <a
                href="#map"
                className="text-white hover:text-primary transition-colors font-medium px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                แผนที่
              </a>
              <a
                href="#trips"
                className="text-white hover:text-primary transition-colors font-medium px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                แนะนำเที่ยว
              </a>
              <Link
                to="/contact"
                className="text-white hover:text-primary transition-colors font-medium px-2"
                onClick={() => setIsMenuOpen(false)}
              >
                ติดต่อเรา
              </Link>
              
              <Link to="/planner" onClick={() => setIsMenuOpen(false)}>
                <Button className="bg-primary hover:bg-primary/90 text-white w-full">วางแผนเที่ยว</Button>
              </Link>

              {/* Admin Dashboard Button (Mobile) - เฉพาะ admin */}
              {currentUser?.userType === "admin" && (
                <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-white border-white hover:bg-white/20 hover:text-white">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}