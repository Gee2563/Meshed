type DashboardHeaderProps = {
  name: string;
  role: string;
  userInitials: string;
  networkName: string;
};

export function DashboardHeader({ name, role, userInitials, networkName }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold">AI Summary</p>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Intelligence</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-right">
            <span className="block text-sm font-semibold text-gray-900">{name}</span>
            <span className="block text-xs text-gray-500">
              {role} · {networkName}
            </span>
          </p>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {userInitials}
          </span>
        </div>
      </div>
    </header>
  );
}
