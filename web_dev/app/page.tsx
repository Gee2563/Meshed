import { MeshedLogo } from "@/components/MeshedLogo";

// Public landing page for the current MVP and the first stop in the verified onboarding flow.
export const dynamic = "force-dynamic";

export default async function HomePage() {


  return (
    <main className="flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-6">
            <MeshedLogo />
                <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">Verified network access</p>
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-400 sm:text-5xl">
                    AI network intelligence layer for VC portfolios that discovers collaboration opportunities between startups using AI to identify enterprise level pain points for post-investment value creation.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                    A frictionless onboarding flow for verified access to portfolio managers and their communities. Using Dynamic for 
                    wallet creation, World for human IDV and Flare for verified interactions.
                </p>
                </div>
            </div>
            

              
        
        </div>

      </section>
    </main>
  );
}
