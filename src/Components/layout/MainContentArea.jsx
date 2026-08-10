export default function MainContentArea({ children }) {
  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  );
}