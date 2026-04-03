import Image from "next/image";

type MeshedLogoProps = {
  compact?: boolean;
};

export function MeshedLogo({ compact = false }: MeshedLogoProps) {
  return (
    <div className={compact ? "inline-flex items-center gap-3" : "flex flex-col items-center gap-4 text-center"}>
      <Image
        src="/meshed-mark.svg"
        alt="Meshed network logo"
        width={compact ? 96 : 220}
        height={compact ? 60 : 138}
        priority
      />
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <div
          className={
            compact
              ? "text-3xl font-semibold tracking-tight text-slate-900"
              : "text-6xl font-semibold tracking-tight text-slate-900"
          }
        >
          Meshed
        </div>
        <div
          className={
            compact
              ? "text-xs font-semibold uppercase tracking-[0.32em] text-slate-500"
              : "text-sm font-semibold uppercase tracking-[0.45em] text-slate-500"
          }
        >
          <span className="text-sky-600">Discover</span>
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-fuchsia-500">Connect</span>
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-amber-500">Amplify</span>
        </div>
      </div>
    </div>
  );
}
