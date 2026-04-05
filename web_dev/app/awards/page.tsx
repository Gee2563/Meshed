"use client";

import { Award, CheckCircle, ChevronRight, Crown, ExternalLink, Lock, Medal, Shield, Sparkles, Star, Target, Trophy, TrendingUp, Users, Zap, Code } from "lucide-react";
import { useState } from "react";

export default function AuthenticatedAwards() {
  const [selectedAward, setSelectedAward] = useState<string | null>(null);

  const awards = [
    {
      id: "top-sales",
      title: "Top Sales Employee",
      subtitle: "Q4 2025 Performance Award",
      issuer: "TechCorp Inc.",
      date: "December 2025",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      description: "Exceeded sales targets by 150% and closed 12 enterprise deals",
      attestationId: "0x7a8b4c2e9f3d1a6c2e8b5f4a...",
      verified: true,
      color: "emerald",
    },
    {
      id: "hackathon-winner",
      title: "Hackathon Winner",
      subtitle: "ETH Denver 2026 - 1st Place",
      issuer: "ETH Denver",
      date: "February 2026",
      icon: Trophy,
      gradient: "from-yellow-500 to-orange-600",
      bgGradient: "from-yellow-50 to-orange-50",
      description: "Built AI-powered smart contract auditing tool in 48 hours",
      attestationId: "0x9f3d1a6c2e8b5f4a7a8b4c2e...",
      verified: true,
      color: "yellow",
    },
    {
      id: "engineering-standout",
      title: "Engineering Standout",
      subtitle: "2025 Technical Excellence Award",
      issuer: "CloudScale Labs",
      date: "November 2025",
      icon: Code,
      gradient: "from-blue-500 to-purple-600",
      bgGradient: "from-blue-50 to-purple-50",
      description: "Led architecture redesign reducing system latency by 80%",
      attestationId: "0x2e8b5f4a7a8b4c2e9f3d1a6c...",
      verified: true,
      color: "blue",
    },
    {
      id: "innovation-leader",
      title: "Innovation Leader",
      subtitle: "Product Innovation Award 2025",
      issuer: "DataFlow Technologies",
      date: "October 2025",
      icon: Sparkles,
      gradient: "from-pink-500 to-rose-600",
      bgGradient: "from-pink-50 to-rose-50",
      description: "Pioneered machine learning pipeline increasing accuracy by 35%",
      attestationId: "0x4a7a8b4c2e9f3d1a6c2e8b5f...",
      verified: true,
      color: "pink",
    },
    {
      id: "team-excellence",
      title: "Team Excellence Award",
      subtitle: "Collaboration Champion 2025",
      issuer: "Mesh Networks",
      date: "September 2025",
      icon: Users,
      gradient: "from-indigo-500 to-violet-600",
      bgGradient: "from-indigo-50 to-violet-50",
      description: "Led cross-functional team delivering product 2 months ahead of schedule",
      attestationId: "0x6c2e8b5f4a7a8b4c2e9f3d1a...",
      verified: true,
      color: "indigo",
    },
    {
      id: "customer-champion",
      title: "Customer Champion",
      subtitle: "Support Excellence Award",
      issuer: "ServicePro Solutions",
      date: "August 2025",
      icon: Star,
      gradient: "from-cyan-500 to-blue-600",
      bgGradient: "from-cyan-50 to-blue-50",
      description: "Achieved 98% customer satisfaction rating across 500+ interactions",
      attestationId: "0x8b5f4a7a8b4c2e9f3d1a6c2e...",
      verified: true,
      color: "cyan",
    },
  ];

  const colorClasses = {
    emerald: {
      border: "border-emerald-300",
      text: "text-emerald-600",
      bg: "bg-emerald-100",
      hover: "hover:border-emerald-400",
    },
    yellow: {
      border: "border-yellow-300",
      text: "text-yellow-600",
      bg: "bg-yellow-100",
      hover: "hover:border-yellow-400",
    },
    blue: {
      border: "border-blue-300",
      text: "text-blue-600",
      bg: "bg-blue-100",
      hover: "hover:border-blue-400",
    },
    pink: {
      border: "border-pink-300",
      text: "text-pink-600",
      bg: "bg-pink-100",
      hover: "hover:border-pink-400",
    },
    indigo: {
      border: "border-indigo-300",
      text: "text-indigo-600",
      bg: "bg-indigo-100",
      hover: "hover:border-indigo-400",
    },
    cyan: {
      border: "border-cyan-300",
      text: "text-cyan-600",
      bg: "bg-cyan-100",
      hover: "hover:border-cyan-400",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4">
                <Award className="size-16" />
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">Authenticated Awards & Credentials</h1>
            <p className="text-2xl text-blue-200 max-w-4xl mx-auto leading-relaxed">
              Blockchain-verified professional accomplishments that can never be faked
            </p>
          </div>

          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border-2 border-blue-400 rounded-2xl p-6 text-center">
              <div className="bg-blue-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="size-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">Flare-Backed</h3>
              <p className="text-blue-200 text-sm">Immutable blockchain attestations ensure authenticity</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border-2 border-purple-400 rounded-2xl p-6 text-center">
              <div className="bg-purple-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="size-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verifiable</h3>
              <p className="text-purple-200 text-sm">Anyone can verify credentials on-chain instantly</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border-2 border-emerald-400 rounded-2xl p-6 text-center">
              <div className="bg-emerald-500 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="size-7" />
              </div>
              <h3 className="text-xl font-bold mb-2">Portable</h3>
              <p className="text-emerald-200 text-sm">Credentials travel with you across companies and roles</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How Authenticated Awards Work</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Meshed uses Flare Network to create tamper-proof, verifiable records of professional achievements
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-6">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">1</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Award Issued</h3>
              <p className="text-sm text-gray-600">Company or organization recognizes an employee&apos;s achievement</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-2xl p-6">
              <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Blockchain Attestation</h3>
              <p className="text-sm text-gray-600">Award details are recorded on Flare Network with cryptographic proof</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 rounded-2xl p-6">
              <div className="bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Credential Minted</h3>
              <p className="text-sm text-gray-600">Digital credential is minted and linked to recipient&apos;s Meshed profile</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-2xl p-6">
              <div className="bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl mb-4">
                4
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Forever Verified</h3>
              <p className="text-sm text-gray-600">Credential remains verifiable and portable across future roles</p>
            </div>
          </div>
        </div>
      </section>

      {/* Awards Showcase */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Example Authenticated Awards</h2>
            <p className="text-xl text-gray-600">Every achievement backed by blockchain verification</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {awards.map((award) => {
              const Icon = award.icon;
              const colors = colorClasses[award.color as keyof typeof colorClasses];

              return (
                <button
                  key={award.id}
                  onClick={() => setSelectedAward(award.id)}
                  className={`text-left bg-gradient-to-br ${award.bgGradient} border-2 ${colors.border} ${colors.hover} rounded-2xl p-6 transition-all hover:shadow-xl cursor-pointer group`}
                >
                  {/* Award Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`bg-gradient-to-br ${award.gradient} rounded-xl p-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="size-10 text-white" />
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-500 text-white rounded-full px-3 py-1 text-xs font-bold">
                      <Shield className="size-3" />
                      <span>VERIFIED</span>
                    </div>
                  </div>

                  {/* Award Info */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{award.title}</h3>
                  <p className={`text-sm font-semibold ${colors.text} mb-3`}>{award.subtitle}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Trophy className="size-4" />
                      <span>Issued by: <strong>{award.issuer}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Target className="size-4" />
                      <span>{award.date}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-4 leading-relaxed">{award.description}</p>

                  {/* Attestation Info */}
                  <div className={`${colors.bg} border ${colors.border} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                      <Lock className={`size-3 ${colors.text}`} />
                      <span className="font-bold">Flare Attestation:</span>
                    </div>
                    <p className="text-xs font-mono text-gray-500 truncate">{award.attestationId}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-sm font-bold ${colors.text}`}>View Details →</span>
                    <ExternalLink className={`size-4 ${colors.text}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Award Detail Modal */}
      {selectedAward && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
            {(() => {
              const award = awards.find((a) => a.id === selectedAward);
              if (!award) return null;

              const Icon = award.icon;
              const colors = colorClasses[award.color as keyof typeof colorClasses];

              return (
                <>
                  <div className="text-center mb-8">
                    <div className={`bg-gradient-to-br ${award.gradient} w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                      <Icon className="size-16 text-white" />
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <h2 className="text-3xl font-bold text-gray-900">{award.title}</h2>
                      <div className="flex items-center gap-1 bg-emerald-500 text-white rounded-full px-3 py-1.5 text-sm font-bold">
                        <Shield className="size-4" />
                        <span>VERIFIED</span>
                      </div>
                    </div>
                    <p className={`text-xl font-semibold ${colors.text}`}>{award.subtitle}</p>
                  </div>

                  <div className="space-y-6 mb-8">
                    {/* Issuer Info */}
                    <div className={`bg-gradient-to-br ${award.bgGradient} border-2 ${colors.border} rounded-xl p-6`}>
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Trophy className="size-5" />
                        Award Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Issued By</p>
                          <p className="font-bold text-gray-900">{award.issuer}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Date Issued</p>
                          <p className="font-bold text-gray-900">{award.date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Achievement</p>
                          <p className="text-gray-700 leading-relaxed">{award.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Blockchain Verification */}
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Lock className="size-5 text-blue-600" />
                        Blockchain Verification
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Attestation ID</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm text-gray-900 bg-white border border-gray-300 rounded px-3 py-2 flex-1 truncate">
                              {award.attestationId}
                            </p>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold flex items-center gap-2">
                              <ExternalLink className="size-4" />
                              View
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Network</p>
                            <p className="font-bold text-sm text-gray-900">Flare</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Status</p>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                              <p className="font-bold text-sm text-emerald-600">Verified</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Confirmations</p>
                            <p className="font-bold text-sm text-gray-900">10,245</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Credential Properties */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="size-5 text-purple-600" />
                        Credential Properties
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-5 text-emerald-600" />
                          <span className="text-sm text-gray-700">Tamper-Proof</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-5 text-emerald-600" />
                          <span className="text-sm text-gray-700">Portable</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-5 text-emerald-600" />
                          <span className="text-sm text-gray-700">Verifiable</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-5 text-emerald-600" />
                          <span className="text-sm text-gray-700">Permanent</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setSelectedAward(null)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-bold"
                    >
                      Close
                    </button>
                    <button className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-bold flex items-center justify-center gap-2">
                      <ExternalLink className="size-5" />
                      Share Credential
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Blockchain-Verified Credentials Matter</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="size-8 text-red-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">End Resume Fraud</h3>
              <p className="text-sm text-gray-600">No more inflated titles or fake achievements on resumes</p>
            </div>

            <div className="text-center">
              <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="size-8 text-emerald-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Instant Verification</h3>
              <p className="text-sm text-gray-600">Employers can verify credentials in seconds, not weeks</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="size-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Portable Reputation</h3>
              <p className="text-sm text-gray-600">Your achievements follow you across companies and roles</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="size-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Tamper-Proof</h3>
              <p className="text-sm text-gray-600">Once recorded, credentials cannot be altered or deleted</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Real-World Applications</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="size-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">For Employees</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Build verifiable professional reputation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Stand out in competitive job markets</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Carry achievements across roles</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target className="size-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">For Employers</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Eliminate resume verification costs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Hire with confidence and speed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Recognize and retain top talent</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Medal className="size-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">For VC Ecosystems</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Track talent across portfolio companies</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Identify top performers for redeployment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Build verified talent marketplace</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Crown className="size-12 text-white" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Ready to Build Your Verified Credential Profile?</h2>
          <p className="text-xl text-blue-200 mb-8">
            Join Meshed and start earning blockchain-verified achievements that prove your professional excellence
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-10 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-colors text-lg font-bold">
              Get Started
            </button>
            <button className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all text-lg font-bold">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
