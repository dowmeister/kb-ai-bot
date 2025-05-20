export const EditProjectPage = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Project</h1>
        <p className="text-gray-600">Modify your project details here.</p>
      </div>

      {/* Edit Project Form */}
      <form className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label
            htmlFor="project-name"
            className="block text-sm font-medium text-gray-700"
          >
            Project Name
          </label>
          <input
            type="text"
            id="project-name"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            placeholder="Enter project name"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="project-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="project-description"
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            placeholder="Enter project description"
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};
