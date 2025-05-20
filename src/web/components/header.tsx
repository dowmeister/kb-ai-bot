import { Bell, Menu, Search, User } from "lucide-react";

export const Header: React.FC<{ onMenuToggle: () => void }> = ({
  onMenuToggle,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">KnowledgeFox</h1>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative hidden md:block">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
