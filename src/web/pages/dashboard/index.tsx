export const DashboardPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to your Dashboard
        </h1>
        <p className="text-gray-600"></p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"></div>
    </div>
  );
};
