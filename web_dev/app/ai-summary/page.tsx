"use client";

import { useState } from "react";
import { MatchHighlight } from "./components/MatchHighlight";
import { Sparkles } from "lucide-react";

// Featured match startup
const featuredMatch = {
  name: "Stellar Health",
  tagline: "Value-based care platform connecting providers and patients",
  image: "https://images.unsplash.com/photo-1758691462668-046fd85ceac9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGhjYXJlJTIwbWVkaWNhbCUyMHRlY2hub2xvZ3klMjBkaWdpdGFsfGVufDF8fHx8MTc3NTMxOTcwM3ww&ixlib=rb-4.1.0&q=80&w=400",
  industry: "Healthcare Fintech",
  location: "New York, NY",
  fundingRound: "Series C",
  fundingAmount: "$32M",
  addedDate: "2 days ago",
  teamSize: 85,
  description:
    "Stellar Health is transforming value-based care by incentivizing high-quality, cost-effective patient care. Their platform connects healthcare providers with financial rewards for achieving better patient outcomes, bridging the gap between traditional fee-for-service and value-based care models.",
  matchScore: 94,
};

const featuredConnections = [
  {
    type: "industry" as const,
    title: "Healthcare Fintech Expertise",
    description:
      "Angela's deep focus on fintech intersecting with healthcare creates direct alignment with Stellar Health's mission to monetize better patient outcomes.",
    strength: "strong" as const,
  },
  {
    type: "experience" as const,
    title: "Financial Infrastructure Knowledge",
    description:
      "Her experience with banking and payment systems at Google and JP Morgan directly applies to building financial incentive platforms in healthcare.",
    strength: "strong" as const,
  },
  {
    type: "network" as const,
    title: "Insurance & Provider Relationships",
    description:
      'Angela\'s portfolio includes multiple healthcare payment companies, providing valuable connections to payers and provider networks.',
    strength: "strong" as const,
  },
  {
    type: "experience" as const,
    title: "Embedded Finance Platforms",
    description:
      "Experience investing in companies that embed financial products into non-financial workflows, exactly what Stellar Health does in healthcare.",
    strength: "moderate" as const,
  },
];

const featuredSynopsis = {
  summary:
    "Angela Strange is an exceptional match for Stellar Health. Her expertise in fintech, particularly at the intersection of financial services and healthcare, positions her to provide strategic guidance on incentive platform design, regulatory navigation, and scaling partnerships with healthcare payers. Her deep understanding of embedded finance and payment infrastructure will be invaluable as Stellar Health expands its value-based care network.",
  keyInsights: [
    "Angela's fintech expertise directly applies to building and scaling financial incentive platforms in healthcare",
    "Her network includes key decision-makers at major health insurance companies and healthcare payment processors",
    'She has invested in similar "fintech meets X" companies, understanding how to embed financial products into industry workflows',
    "Her experience navigating healthcare regulations through portfolio companies de-risks Stellar Health's compliance challenges",
  ],
  valueProposition:
    "Angela can accelerate Stellar Health's growth by facilitating partnerships with 3-5 major payers, providing strategic guidance on platform monetization, and helping navigate the complex regulatory landscape of healthcare payments. Her involvement could shorten their sales cycle by 6-9 months and increase credibility with enterprise customers.",
  recommendations: [
    "Schedule quarterly strategic sessions on payer partnership strategy and platform economics",
    "Leverage Angela's network for introductions to heads of innovation at top 10 health insurance companies",
    "Engage Angela for advisory on pricing models and incentive structure optimization",
    "Coordinate with Angela on follow-on funding and strategic investor identification for Series D",
  ],
};

export default function MeshedAISummary() {
  const [showMatch, setShowMatch] = useState(true);

  return (
    <main className="flex-1 p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Meshed AI Summary</h1>
        </div>
        <p className="text-gray-600">AI-powered analysis of your top match in the Andreessen Horowitz network</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Match Score</p>
          <p className="text-2xl font-bold text-green-600">94%</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Connection Points</p>
          <p className="text-2xl font-bold text-gray-900">4</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Strength</p>
          <p className="text-2xl font-bold text-purple-600">High</p>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Impact Potential</p>
          <p className="text-2xl font-bold text-indigo-600">Very High</p>
        </div>
      </div>

      {/* Featured Match */}
      <div>
        {showMatch && (
          <MatchHighlight
            startup={featuredMatch}
            connections={featuredConnections}
            synopsis={featuredSynopsis}
            onClose={() => setShowMatch(false)}
          />
        )}
      </div>
    </main>
  );
}
