import React, { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Sidebar } from "./components/sidebar";
import { Header } from "./components/header";
import { Route, Routes } from "react-router";
import { DashboardPage } from "./pages/dashboard";
import { ProjectListPage } from "./pages/projects";
import { EditProjectPage } from "./pages/projects/edit";

// Types
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Components

const StatsCard: React.FC<{ title: string; value: string; change: string }> = ({
  title,
  value,
  change,
}) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
      {title}
    </h3>
    <div className="mt-2 flex items-baseline">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <span className="ml-2 text-sm font-medium text-green-600">{change}</span>
    </div>
  </div>
);

// Main App Component - save this as src/web/app.tsx
const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = [
    { title: "Total Users", value: users.length.toString(), change: "+12%" },
    { title: "Active Sessions", value: "24", change: "+3%" },
    { title: "Revenue", value: "$12,345", change: "+8%" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/:id" element={<EditProjectPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
