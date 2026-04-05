type StartupCardProps = {
  name: string;
  tagline: string;
  image: string;
  industry: string;
  location: string;
  fundingRound: string;
  addedDate: string;
  teamSize?: number;
  matchScore: number;
  fundingAmount?: string;
};

export function StartupCard({
  name,
  tagline,
  image,
  industry,
  location,
  fundingRound,
  addedDate,
  teamSize,
  matchScore,
  fundingAmount,
}: StartupCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row">
        <img
          src={image}
          alt={name}
          className="h-28 w-full rounded-md object-cover md:w-40"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{name}</h3>
              <p className="text-sm text-gray-600">{tagline}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {matchScore}% match
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {industry} · {location} · {fundingRound}
            {fundingAmount ? ` · ${fundingAmount}` : ""}
            {teamSize ? ` · ${teamSize} people` : ""}
          </p>
          <p className="text-xs text-gray-400">Added {addedDate}</p>
        </div>
      </div>
    </article>
  );
}
