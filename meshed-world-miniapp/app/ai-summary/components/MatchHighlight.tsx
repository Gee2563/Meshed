import { Sparkles } from "lucide-react";

type Startup = {
  name: string;
  tagline: string;
  image: string;
  industry: string;
  location: string;
  fundingRound: string;
  fundingAmount: string;
  addedDate: string;
  teamSize?: number;
  description: string;
  matchScore: number;
};

type Connection = {
  type: "industry" | "experience" | "network";
  title: string;
  description: string;
  strength: "strong" | "moderate" | "weak";
};

type Synopsis = {
  summary: string;
  keyInsights: string[];
  valueProposition: string;
  recommendations: string[];
};

type MatchHighlightProps = {
  startup: Startup;
  connections: Connection[];
  synopsis: Synopsis;
  onClose: () => void;
};

export function MatchHighlight({ startup, connections, synopsis, onClose }: MatchHighlightProps) {
  return (
    <section className="mb-8 rounded-xl border border-purple-200 bg-white p-6 shadow-sm relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-sm text-gray-500 hover:text-gray-700"
      >
        Dismiss
      </button>
      <div className="mb-5">
        <p className="text-sm text-purple-600 font-semibold uppercase tracking-wide">Featured Match</p>
        <h2 className="text-2xl font-bold text-gray-900 mt-1">{startup.name}</h2>
        <p className="text-gray-600">{startup.tagline}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <img
            src={startup.image}
            alt={startup.name}
            className="h-40 w-full rounded-lg object-cover"
          />
          <p className="mt-3 text-sm text-gray-700">{startup.description}</p>
          <p className="mt-2 text-xs text-gray-500">
            {startup.industry} · {startup.location} · {startup.fundingRound} · {startup.addedDate}
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700 font-semibold">
              <Sparkles className="h-4 w-4" />
              Match Score: {startup.matchScore}%
            </div>
            <div className="text-xs text-gray-500">Funding: {startup.fundingAmount}</div>
          </div>

          <h3 className="mb-2 font-bold text-gray-900">Why this match</h3>
          <p className="text-sm text-gray-700 mb-4">{synopsis.summary}</p>

          <h4 className="mb-2 text-sm font-semibold text-gray-900">Connection strengths</h4>
          <ul className="mb-4 space-y-2">
            {connections.map((connection) => (
              <li key={connection.title} className="rounded-lg bg-gray-50 p-2 text-sm">
                <p className="font-semibold text-gray-900">{connection.title}</p>
                <p className="text-gray-600">{connection.description}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                  {connection.type} · {connection.strength}
                </p>
              </li>
            ))}
          </ul>

          <h4 className="mb-2 text-sm font-semibold text-gray-900">Recommendations</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {synopsis.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
