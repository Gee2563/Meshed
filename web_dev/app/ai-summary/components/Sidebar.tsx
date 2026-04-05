import { type ReactNode } from "react";
import { Activity, LayoutDashboard, List, Search } from "lucide-react";

type SidebarProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

type Tab = {
  id: string;
  label: string;
  icon: ReactNode;
};

const tabs: Tab[] = [
  { id: "matches", label: "Matches", icon: <Activity className="h-4 w-4" /> },
  { id: "pipeline", label: "Pipeline", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "network", label: "Network", icon: <Search className="h-4 w-4" /> },
  { id: "history", label: "History", icon: <List className="h-4 w-4" /> },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-60 border-r border-gray-200 bg-white/80 p-4">
      <nav className="space-y-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
