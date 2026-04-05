import Link from "next/link";
import { Shield, CheckCircle, Star, Mail, Linkedin, Github, Award, Calendar, MapPin, Users } from "lucide-react";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

// ENS Logo Component
function ENSLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 82 82" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="82" height="82" rx="12" fill="#5298FF" />
      <path d="M33.25 23L27 29.25V52.75L33.25 59H48.75L55 52.75V29.25L48.75 23H33.25Z" fill="white" />
      <path d="M38 32H44V50H38V32Z" fill="#5298FF" />
      <path d="M32 38H50V44H32V38Z" fill="#5298FF" />
    </svg>
  );
}

// Verified Meshed UpCycle Badge Component
function VerifiedBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-md">
      <Shield className="size-4 text-white" />
      <CheckCircle className="size-4 text-white" />
      <span className="text-xs font-bold text-white">VERIFIED MESHED UPCYCLE</span>
    </div>
  );
}

const candidates = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Full Stack Engineer",
    company: "World",
    vcFirm: "Rho Capital",
    avatar: "SC",
    photo: "https://images.unsplash.com/photo-1520689728498-7dd1a9814607?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBc2lhbiUyMHdvbWFuJTIwcHJvZmVzc2lvbmFsJTIwaGVhZHNob3QlMjBlbmdpbmVlcnxlbnwxfHx8fDE3NzUxMzgzNjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    experience: "5 years",
    location: "San Francisco, CA",
    availability: "Immediately Available",
    skills: [
      "React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker", "GraphQL", "Next.js"
    ],
    achievements: [
      "Led development of real-time data pipeline processing 1M+ events/day",
      "Architected microservices infrastructure serving 500K users",
      "Reduced API response time by 60% through optimization",
      "Mentored 8 junior engineers during tenure"
    ],
    reviews: [
      {
        reviewer: "Michael Torres",
        title: "CTO at EcoVerse (via Lereta)",
        rating: 5,
        text: "Sarah is an exceptional engineer with deep technical expertise and outstanding problem-solving abilities. She was instrumental in building our core platform and consistently delivered high-quality work ahead of schedule. Any company would be fortunate to have her on their team."
      },
      {
        reviewer: "Jennifer Park",
        title: "VP Engineering at EcoVerse (via Lereta)",
        rating: 5,
        text: "One of the strongest engineers I've worked with. Sarah combines technical excellence with great communication skills and team leadership. She's the kind of person who elevates everyone around her."
      }
    ],
    credentials: "Verified through Dynamic • World ID Authenticated"
  },
  {
    id: 2,
    name: "Marcus Williams",
    role: "Head of Product",
    company: "EcoVerse",
    vcFirm: "Lereta",
    avatar: "MW",
    photo: "https://images.unsplash.com/photo-1614705660975-ce6ba7d731c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCbGFjayUyMG1hbiUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90JTIwZXhlY3V0aXZlfGVufDF8fHx8MTc3NTEzODM2NHww&ixlib=rb-4.1.0&q=80&w=1080",
    experience: "8 years",
    location: "New York, NY",
    availability: "Available in 2 weeks",
    skills: [
      "Product Strategy", "User Research", "Roadmap Planning", "A/B Testing", "Analytics", "Go-to-Market", "Cross-functional Leadership", "Agile Methodologies"
    ],
    achievements: [
      "Launched 3 major product lines generating $5M+ in ARR",
      "Grew user base from 10K to 500K through strategic initiatives",
      "Built and managed product team of 12 across design and PM",
      "Led successful pivot that extended runway by 18 months"
    ],
    reviews: [
      {
        reviewer: "David Kim",
        title: "CEO at EcoVerse (via Lereta)",
        rating: 5,
        text: "Marcus was the driving force behind our product success. His strategic thinking and customer-first approach helped us achieve product-market fit in a competitive space. He's a natural leader who builds strong teams and delivers exceptional results."
      },
      {
        reviewer: "Amanda Rodriguez",
        title: "Partner at Lereta",
        rating: 5,
        text: "Throughout our investment in EcoVerse, Marcus demonstrated remarkable product vision and execution capabilities. He's a proven operator who understands both the strategic and tactical aspects of building products that customers love. Highly recommend him for any product leadership role."
      }
    ],
    credentials: "Verified through Dynamic • World ID Authenticated"
  },
  {
    id: 3,
    name: "Alex Patel",
    role: "Blockchain Architect",
    company: "EcoVerse",
    vcFirm: "Lereta",
    avatar: "AP",
    photo: "https://images.unsplash.com/photo-1656391912553-a286c6daad55?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTb3V0aCUyMEFzaWFuJTIwcHJvZmVzc2lvbmFsJTIwaGVhZHNob3QlMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3NTEzODM2NHww&ixlib=rb-4.1.0&q=80&w=1080",
    experience: "6 years",
    location: "Austin, TX",
    availability: "Immediately Available",
    skills: [
      "Solidity", "Ethereum", "Smart Contracts", "Web3.js", "Layer 2 Solutions", "DeFi Protocols", "Security Auditing", "Rust"
    ],
    achievements: [
      "Architected tokenomics model securing $8M in token sales",
      "Designed and deployed 15+ audited smart contracts",
      "Reduced gas costs by 45% through contract optimization",
      "Built cross-chain bridge handling $2M+ in daily volume"
    ],
    reviews: [
      {
        reviewer: "Rachel Thompson",
        title: "Co-Founder at EcoVerse (via Lereta)",
        rating: 5,
        text: "Alex is a blockchain architect with rare depth of knowledge across the entire Web3 stack. Their smart contract work was always secure, efficient, and elegant. Beyond technical skills, Alex brings strategic thinking about how blockchain technology can solve real business problems."
      },
      {
        reviewer: "James Morrison",
        title: "Principal at Lereta",
        rating: 5,
        text: "Alex's technical expertise in blockchain and cryptography is world-class. During our diligence and throughout the investment, Alex consistently demonstrated innovation and reliability. Any Web3 company would benefit tremendously from their expertise."
      }
    ],
    credentials: "Verified through Dynamic • World ID Authenticated"
  }
];

export default function UpCycle() {
  return (
    <>
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <VerifiedBadge />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Meshed UpCycle
            </h1>
            <p className="text-2xl text-gray-700 mb-4 leading-relaxed">
              Discover pre-vetted, exceptional talent from your portfolio ecosystem
            </p>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              When startups evolve or pivot, exceptional team members become available. Meshed UpCycle connects you with proven professionals who&apos;ve already been through rigorous due diligence and carry verified credentials from your portfolio network. These talented individuals are ready to accelerate growth at your next portfolio company.
            </p>
          </div>

          {/* Value Proposition Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-emerald-200">
              <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="size-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Pre-Vetted Excellence</h3>
              <p className="text-sm text-gray-600">
                All candidates have been through comprehensive due diligence during their portfolio company journey and carry verified Meshed approval.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-teal-200">
              <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Award className="size-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Proven Track Record</h3>
              <p className="text-sm text-gray-600">
                These professionals have demonstrated their capabilities in high-growth startup environments and bring battle-tested expertise.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-200">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="size-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Onboarding</h3>
              <p className="text-sm text-gray-600">
                Trusted professionals who understand startup culture and can contribute from day one with minimal ramp-up time.
              </p>
            </div>
          </div>

          {/* Support VC Portfolio Community Section */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="size-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Support your VC Portfolio Community</h3>
                  <p className="text-base text-gray-700 leading-relaxed mb-3">
                    Distinguished VCs set themselves apart by telling a powerful story: they constantly support every team member who becomes part of their community, while doubling down on their original investment in the portfolio team.
                  </p>
                  <p className="text-base text-gray-700 leading-relaxed mb-3">
                    Meshed VC networks create a virtuous cycle by feeding talent back into future and current portfolio startups. This creates an ecosystem where knowledge, experience, and relationships compound over time—amplifying the value of every investment decision.
                  </p>
                  <p className="text-base text-gray-700 leading-relaxed">
                    <span className="font-semibold text-blue-900">Even when a startup evolves or pivots,</span> VCs have a responsibility to support the talented team members within their Meshed network. This commitment transforms your portfolio from a collection of investments into a thriving, interconnected community that drives long-term value creation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Candidates Dashboard */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Featured Verified Candidates from EcoVerse
            </h2>
            <p className="text-lg text-gray-600">
              Exceptional talent from Lereta&apos;s portfolio, ready for their next opportunity
            </p>
          </div>

          <div className="space-y-8">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-shadow">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column - Profile */}
                  <div className="lg:w-1/3 space-y-6">
                    <div className="flex items-start gap-4">
                      <ImageWithFallback
                        src={candidate.photo}
                        alt={candidate.name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-emerald-500"
                      />
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{candidate.name}</h3>
                        <p className="text-lg text-gray-700 mb-2">{candidate.role}</p>
                        <div className="mb-3">
                          <VerifiedBadge />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="size-4" />
                        <span>{candidate.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="size-4" />
                        <span>{candidate.experience} experience</span>
                      </div>
                      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded">
                        <p className="text-xs font-semibold text-emerald-900">
                          {candidate.availability}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Previous Company</p>
                      <p className="text-sm font-semibold text-gray-900">{candidate.company}</p>
                      <p className="text-xs text-gray-600 mt-1">Backed by {candidate.vcFirm}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Credentials</p>
                      <p className="text-xs text-gray-700">{candidate.credentials}</p>
                    </div>

                    <Link
                      href="/ens-credentials"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border-2 border-blue-500 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold"
                    >
                      <ENSLogo className="size-5" />
                      <span>Authenticated Digital Awards</span>
                    </Link>

                    <div className="flex gap-3">
                      <button className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-colors text-sm font-medium">
                        Request Introduction
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Linkedin className="size-5" />
                      </a>
                      <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Github className="size-5" />
                      </a>
                      <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Mail className="size-5" />
                      </a>
                    </div>
                  </div>

                  {/* Right Column - Details */}
                  <div className="lg:w-2/3 space-y-6">
                    {/* Skills */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Award className="size-4 text-emerald-600" />
                        Core Skills & Expertise
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Achievements */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="size-4 text-emerald-600" />
                        Key Achievements at EcoVerse
                      </h4>
                      <ul className="space-y-2">
                        {candidate.achievements.map((achievement, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-emerald-500 mt-1">•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Reviews */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Star className="size-4 text-amber-500" />
                        Verified Reviews from Portfolio Leadership
                      </h4>
                      <div className="space-y-4">
                        {candidate.reviews.map((review, idx) => (
                          <div key={idx} className="bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex gap-0.5">
                                {[...Array(review.rating)].map((_, i) => (
                                  <Star key={i} className="size-4 text-amber-500 fill-amber-500" />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">({review.rating}.0)</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3 italic">“{review.text}”</p>
                            <div className="flex items-center gap-2">
                              <div className="bg-amber-200 text-amber-900 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">
                                {review.reviewer.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-900">{review.reviewer}</p>
                                <p className="text-xs text-gray-600">{review.title}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Unlock the Hidden Value in Your Portfolio Network
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Connect with pre-vetted talent who understand the startup journey and are ready to drive impact from day one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-colors text-lg font-medium">
              Access Full Talent Pool
            </button>
            <button className="px-8 py-4 bg-white text-emerald-600 rounded-lg border-2 border-emerald-500 hover:bg-emerald-50 transition-colors text-lg font-medium">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
