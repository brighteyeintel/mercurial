
import Image from "next/image";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Anchor, Plane, Truck, Newspaper, ShieldAlert, Globe, Activity, ArrowRight } from "lucide-react";

export default async function Home({ status, session }: { status: string, session: any }) {

  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-zinc-800 selection:text-zinc-100">
      <Navbar />

      <main className="flex-1">
        <div className="fixed w-full h-full bg-linear-to-b from-sky-100 to-zinc-950 [mask-image:url('/world-map.min.svg')] [mask-size:cover] [mask-position:center] opacity-50 translate-z-[-10px]"></div>
        {/* Hero Section */}
        <section className="relative flex items-center justify-center overflow-hidden py-24 lg:py-32 xl:py-40 bg-linear-to-b from-black/0 to-zinc-900/50 h-[calc(100vh-4rem)] backdrop-blur-[1.5px]">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div className="container relative px-4 md:px-6 mx-auto z-30">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/50 px-3 py-1 text-sm font-medium text-zinc-400 backdrop-blur-xl">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                v1.0.0 Now Live
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl text-zinc-100 bg-clip-text uppercase font-sans text-shadow-[0_0_20px_black]">
                <span className="text-sky-400">Intelligent</span> Logistics for a <span className="text-sky-400">Complex</span> World
              </h1>
              <p className="max-w-2xl leading-normal text-zinc-100 sm:text-xl sm:leading-8 font-mono text-shadow-[0_0_20px_black]">
                Mercurial empowers logistics providers to foresee supply chain disruptions.
                Monitor maritime, air, and road traffic in real-time. Integrate global news feeds for predictive risk analysis.
              </p>

            </div>
          </div>
        </section>

        {/* Capabilities Grid */}
        <section id="capabilities" className="py-24 border-t border-zinc-900 relative bg-linear-to-b from-zinc-900/90 via-zinc-900 to-zinc-950 backdrop-blur-[3px]">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="mb-12 text-center md:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl uppercase font-mono">
                Capabilities
              </h2>
              <p className="mt-4 text-lg text-zinc-400 max-w-2xl">
                Comprehensive tools to identify, analyze, and mitigate supply chain risks across all domains.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                  <Anchor className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white uppercase tracking-wide font-mono group-hover:text-sky-400 transition-colors">Maritime Analysis</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Real-time vessel tracking, port congestion analysis, and weather impact assessments for global shipping routes.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20 group-hover:bg-sky-500/20 transition-colors">
                  <Plane className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white uppercase tracking-wide font-mono group-hover:text-sky-400 transition-colors">Air Freight</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Predictive flight data, cargo capacity monitoring, and airport disruption alerts to keep high-priority shipments moving.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white uppercase tracking-wide font-mono group-hover:text-sky-400 transition-colors">Road Network</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Granular traffic data, border crossing wait times, and infrastructure status updates for optimizing trucking logistics.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                  <Newspaper className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white uppercase tracking-wide font-mono group-hover:text-sky-400 transition-colors">News Feeds</h3>
                <p className="text-zinc-400 leading-relaxed">
                  AI-driven news aggregation filters global events effectively to identify local strikes, political unrest, or natural disasters affecting logistics.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 group-hover:bg-rose-500/20 transition-colors">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white uppercase tracking-wide font-mono group-hover:text-sky-400 transition-colors">Risk Detection</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Automated threat detection system that correlates multiple data points to flag high-risk supply chain nodes immediately.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white uppercase tracking-wide font-mono group-hover:text-sky-400 transition-colors">Live Monitoring</h3>
                <p className="text-zinc-400 leading-relaxed">
                  A centralized dashboard providing a heartbeat view of your entire global operations, with instant alerts for anomalies.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-zinc-900">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
          </div>
          <div className="container relative z-10 px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-6 uppercase font-mono">
              Ready to secure your supply chain?
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
              Join the leading logistics providers who trust Mercurial to keep their operations moving in an unpredictable world.
            </p>
            <Link
              href="/signup"
              className="inline-flex h-14 items-center justify-center rounded bg-white px-8 text-base font-bold text-zinc-950 shadow-lg hover:bg-sky-400 transition-all hover:scale-105 font-mono tracking-wider uppercase z-30"
            >
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
