export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading…</p>
      </div>
    </div>
  );
}
