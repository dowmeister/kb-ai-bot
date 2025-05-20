export const ProjectListPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Projects</h1>
        <p className="text-gray-600">Manage your projects here.</p>
      </div>

      {/* Project List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Example project cards */}
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
          >
            <h2 className="text-lg font-semibold text-gray-800">
              Project {index + 1}
            </h2>
            <p className="text-gray-600">Description of project {index + 1}.</p>
          </div>
        ))}
      </div>
    </div>
  );
};
