import { Home, Package, X } from "lucide-react";
import { Link } from "react-router";

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Projects", href: "/projects" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed left-0 top-0 h-full w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0
      `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-4">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors"
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};
