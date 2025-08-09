export default function HomePage() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Computer Inventory System
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Welcome to your computer inventory tracking system.
      </p>
      <div className="space-x-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md">
          View Assets
        </button>
        <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md">
          Add Asset
        </button>
      </div>
      <div className="mt-12 text-sm text-gray-500">
        <p>Next.js frontend is running successfully!</p>
        <p className="mt-2">Ready to connect to FastAPI backend.</p>
      </div>
    </div>
  )
}
