import { ping } from '@spoke/shared';

export default function App() {
  return (
    <div className="flex min-h-40 w-72 flex-col gap-2 p-4">
      <h1 className="text-lg font-semibold" style={{ color: '#1D9E75' }}>
        Spoke Route Bridge
      </h1>
      <p className="text-sm text-gray-600">shared says: {ping()}</p>
    </div>
  );
}
