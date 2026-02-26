import { FiMap } from "react-icons/fi";
import { TbCube } from "react-icons/tb";
import { FiCamera } from "react-icons/fi";

type HeaderProps = {
  activeTab: "2D" | "3D";
  setActiveTab: (tab: "2D" | "3D") => void;
  onReset: () => void;
  onPerspective?: () => void;
  perspectiveLoading?: boolean;
};

export default function Header({ activeTab, setActiveTab, onReset, onPerspective, perspectiveLoading }: HeaderProps) {
  return (
    <header className="px-4 py-3 bg-slate-800 text-white flex items-center gap-4">
      <div className="flex gap-2">
        <button
          className={`flex items-center gap-2 px-3 py-1 rounded-t-md text-sm font-medium border-b-2 ${activeTab === "2D" ? "bg-slate-700 border-emerald-400" : "bg-slate-900 border-transparent text-slate-300"
            }`}
          onClick={() => setActiveTab("2D")}
        >
          <FiMap className="w-4 h-4" />
          <span>Plan 2D</span>
        </button>
        <button
          className={`flex items-center gap-2 px-3 py-1 rounded-t-md text-sm font-medium border-b-2 ${activeTab === "3D" ? "bg-slate-700 border-emerald-400" : "bg-slate-900 border-transparent text-slate-300"
            }`}
          onClick={() => setActiveTab("3D")}
        >
          <TbCube className="w-4 h-4" />
          <span>Vue 3D</span>
        </button>
      </div>

      {activeTab === "3D" && onPerspective && (
        <button
          className="flex items-center gap-2 px-4 py-1 bg-purple-600 rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onPerspective}
          disabled={perspectiveLoading}
        >
          <FiCamera className="w-4 h-4" />
          <span>{perspectiveLoading ? "Génération..." : "Perspective"}</span>
        </button>
      )}

      <button
        className="ml-auto px-3 py-1 bg-red-500 rounded text-sm font-medium hover:bg-red-600"
        onClick={onReset}
      >
        Reset
      </button>
    </header>
  );
}