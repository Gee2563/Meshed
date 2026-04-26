import { Globe, Rocket, Shield, TrendingUp, Users, Zap } from "lucide-react";

const meshLogo = "/meshed-logo.png";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                AI Driven Network Intelligence for your Investments
              </h1>
              <p className="text-xl text-gray-900 leading-relaxed">
                From static portfolio lists to living AI graphs that amplify your investment portfolio communities
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                We&apos;re building an AI network intelligence layer for VC portfolios that discovers collaboration opportunities
                between startups using AI to identify enterprise-level pain points for post-investment value creation.
              </p>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">1000+</div>
                  <div className="text-sm text-gray-600">Portfolio Connections</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-600">Startups Mapped</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">50+</div>
                  <div className="text-sm text-gray-600">VCs &amp; Investors</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <img src={meshLogo} alt="Mesh Logo" className="w-full h-auto max-w-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Neural Portfolio Graphs for Modern Investors
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Transform your portfolio data into actionable insights and strategic connections
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="size-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Relationship Graphs</h3>
              <p className="text-gray-600">
                Map company, founder, and investor relationships to identify strategic partnerships and collaboration
                opportunities across your portfolio.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="size-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ranked Recommendations</h3>
              <p className="text-gray-600">
                Turn portfolio data into ranked, explainable founder connection recommendations that drive real value.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Rocket className="size-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Post-Investment Value Creation</h3>
              <p className="text-gray-600">
                Identify enterprise-level pain points and connect companies facing challenges with those who&apos;ve solved them before.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Globe className="size-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Entity Support</h3>
              <p className="text-gray-600">
                Built for VCs, Family Offices, PE Firms, and live conferences&mdash;connecting communities in more productive ways.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-pink-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="size-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enhanced Community Participation</h3>
              <p className="text-gray-600">
                Authenticate and enhance community participation across investment ecosystems with verified connections.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Zap className="size-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Strategic Partnership Discovery</h3>
              <p className="text-gray-600">
                Uncover shared customers and strategic synergies that unlock growth opportunities across your portfolio network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">
              HACKATHON DEMO
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powered by Cutting-Edge Technology</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Mesh leverages best-in-class technology partners to deliver secure, verified, and intelligent portfolio insights
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-8">
            {/* World ID Card */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-12 shadow-lg">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Shield className="size-10 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">World ID</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Identity Layer</span>
                  </div>
                  <p className="text-lg text-gray-600 mb-4">
                    World ID verifies that you are a real and unique human (and not a bot) to access things only humans should&mdash;like concert
                    tickets, video games, limited merch drops, and dating apps.
                  </p>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-600 p-6 rounded-lg mb-4">
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Zap className="size-5 text-blue-600" />
                      How Mesh Takes World ID Further
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Mesh is taking World ID one step further by utilizing it to authenticate not only individual people, but
                      <span className="font-semibold text-gray-900"> VCs and Companies</span> to verify that Mesh&apos;s community
                      members have been authenticated by World.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className="bg-white p-3 rounded-lg text-center border border-blue-200">
                        <Users className="size-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-gray-900">Founders</p>
                        <p className="text-xs text-gray-600">Verified</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg text-center border border-purple-200">
                        <TrendingUp className="size-5 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-gray-900">VCs</p>
                        <p className="text-xs text-gray-600">Verified</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg text-center border border-green-200">
                        <Globe className="size-5 text-green-600 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-gray-900">Companies</p>
                        <p className="text-xs text-gray-600">Verified</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-blue-900">Why it matters:</span> In investment networks where trust and
                      authenticity are paramount, World ID verification ensures that founder connections, investor introductions, and
                      portfolio collaborations happen between verified real people and legitimate organizations&mdash;eliminating
                      fraud, bots, and fake accounts while building confidence in every interaction across the entire
                      ecosystem.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Card */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-12 shadow-lg">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center">
                    <Users className="size-10 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">Dynamic</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Wallet &amp; Credentials
                    </span>
                  </div>
                  <p className="text-lg text-gray-600 mb-4">
                    Dynamic simplifies wallet login and user onboarding. Instead of forcing users to install MetaMask, they enable
                    email login, social login, and automatic wallet creation.
                  </p>

                  <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-600 p-6 rounded-lg mb-4">
                    <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <Zap className="size-5 text-green-600" />
                      Mesh&apos;s Unique Implementation
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Mesh uniquely utilizes Dynamic to <span className="font-semibold text-gray-900">
                        store and authenticate verifiable credentials, accomplishments, and work histories
                      </span> for all community members.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <h5 className="text-xs font-bold text-gray-900 mb-2">👤 Individuals</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Name &amp; Title</li>
                          <li>• Startup &amp; Tenure</li>
                          <li>• Areas of Expertise</li>
                          <li>• Reviews &amp; Awards</li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-teal-200">
                        <h5 className="text-xs font-bold text-gray-900 mb-2">🚀 Startups</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Funding Stage &amp; Amount</li>
                          <li>• Team Size &amp; Industry</li>
                          <li>• Advisors &amp; Investors</li>
                          <li>• Growth Metrics</li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <h5 className="text-xs font-bold text-gray-900 mb-2">💼 VCs &amp; LPs</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Title &amp; Role</li>
                          <li>• Board Positions</li>
                          <li>• Areas of Expertise</li>
                          <li>• Press &amp; Recognition</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-green-900">Why it matters:</span> By storing wallet-linked access
                      and profile context, Meshed creates a durable coordination layer for verified humans, trusted
                      agents, and portable professional history.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Interactions Card */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-12 shadow-lg">
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="size-10 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">Verified Interactions</h3>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      World Build Trust Layer
                    </span>
                  </div>
                  <p className="text-lg text-gray-600 mb-4">
                    For the World Build version, Meshed replaces data attestations with human-backed interaction records
                    so intros, collaborations, and rewards can be tied directly to verified humans.
                  </p>

                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-600 p-6 rounded-lg mb-4">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Zap className="size-5 text-orange-600" />
                      Human-Backed Coordination
                    </h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Meshed now records <span className="font-semibold text-gray-900">verified interactions and reward states</span>
                      around the moments that matter most:
                    </p>

                    <div className="bg-white p-5 rounded-lg border border-orange-200 mb-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="bg-orange-100 px-3 py-1 rounded-full text-xs font-bold text-orange-800">Example</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                          <p className="text-sm font-bold text-gray-900 mb-1">Verified founder</p>
                          <p className="text-xs text-gray-600">• Requests an intro</p>
                          <p className="text-xs text-gray-600">• Includes company pain point</p>
                          <p className="text-xs text-gray-600">• Carries World verification status</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                          <p className="text-sm font-bold text-gray-900 mb-1">Verified operator</p>
                          <p className="text-xs text-gray-600">• Accepts the intro</p>
                          <p className="text-xs text-gray-600">• Starts collaboration</p>
                          <p className="text-xs text-gray-600">• Earns a rewardable action</p>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-orange-100 to-red-100 p-3 rounded-lg">
                        <p className="text-sm font-bold text-gray-900 text-center">
                          → Verified interaction recorded, trust preserved, reward state updated
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-orange-200 text-center">
                        <p className="text-xs font-semibold text-gray-900">World ID Status</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-red-200 text-center">
                        <p className="text-xs font-semibold text-gray-900">Authorized Agent</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-orange-200 text-center">
                        <p className="text-xs font-semibold text-gray-900">Company Context</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-red-200 text-center">
                        <p className="text-xs font-semibold text-gray-900">Reward Status</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-orange-900">Why it matters:</span> Meshed can stay DB-first for
                      the hackathon while still proving that each valuable intro, collaboration, and reward event is
                      backed by verified humans through World ID.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
            <h2 className="text-4xl font-bold mb-4">Ready to unlock your portfolio&apos;s potential?</h2>
            <p className="text-xl mb-8 text-blue-100">Discover who can unlock growth for whom in your portfolio</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors text-lg font-medium">
                Request Demo
              </button>
              <button className="px-8 py-4 bg-transparent text-white rounded-lg border-2 border-white hover:bg-white/10 transition-colors text-lg font-medium">
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
