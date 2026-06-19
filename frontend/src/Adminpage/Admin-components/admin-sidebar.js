import { LayoutDashboard, MapPin, Route, Settings, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./Aui/button"

const navItems = [
  { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
  { id: "places", label: "สถานที่", icon: MapPin },
  { id: "trips", label: "แผนการเดินทาง", icon: Route },
  { id: "settings", label: "ตั้งค่า", icon: Settings },
]

export function AdminSidebar({ activeTab, onTabChange, collapsed, onToggleCollapse }) {
  return (
    <aside
      style={{
        width: collapsed ? "80px" : "256px",
        backgroundColor: "#0f4cd8", // blue
      }}
      className="flex h-full flex-col border-r border-stone-200 transition-all duration-300 shadow-sm relative z-20 shrink-0"
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 shrink-0">
        {!collapsed && (
          <span className="text-xl font-bold text-white tracking-tight">AdminZone</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-white h-8 w-8 ml-auto"
          style={{ borderRadius: "9999px", backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-2 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-left w-full transition-colors ${
                isActive
                  ? "font-semibold shadow-sm"
                  : "font-medium"
              } ${collapsed ? "justify-center" : ""}`}
              style={
                isActive
                  ? {
                      backgroundColor: "#ff4fa3", // pink
                      color: "#ffffff",
                    }
                  : {
                      color: "#e5ecff",
                    }
              }
            >
              <item.icon
                className={`shrink-0 ${collapsed ? "h-6 w-6" : "h-5 w-5"}`}
                style={{ color: isActive ? "#ffffff" : "#c5d4ff" }}
              />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="mt-auto border-t border-stone-200 p-4 shrink-0"
        style={{ backgroundColor: "#0b3cb0" }}
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: "#ff4fa3" }}
          >
            A
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white truncate">Admin</span>
              <span className="text-xs text-stone-100 truncate">admin@tripadmin.com</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}