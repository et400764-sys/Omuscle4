import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-900">
        <span className="text-lg font-black tracking-widest text-[#00ff88]">OMUSCLE</span>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/scan" className="text-zinc-600 hover:text-zinc-400 transition-colors">Solo scan</Link>
          <Link href="/match" className="text-zinc-400 hover:text-white transition-colors font-medium">Private Match</Link>
          <Link href="/arena" className="text-zinc-400 hover:text-white transition-colors font-medium">Enter Arena</Link>
          <Link href="/how-it-works" className="text-zinc-600 hover:text-zinc-400 transition-colors">How it works</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center pt-16 pb-24">
        <div className="relative mb-6">
          <h1 className="text-[clamp(4rem,14vw,10rem)] font-black tracking-tighter leading-none text-white select-none">
            OMUSCLE
          </h1>
          <div
            className="absolute inset-0 text-[clamp(4rem,14vw,10rem)] font-black tracking-tighter leading-none select-none pointer-events-none"
            style={{
              WebkitTextStroke: "1px #00ff88",
              color: "transparent",
              transform: "translate(3px, 3px)",
              opacity: 0.4,
            }}
          >
            OMUSCLE
          </div>
        </div>

        <p className="text-zinc-400 text-lg md:text-xl tracking-wide max-w-lg mb-3">
          Step back · AI rates your physique · Only one walks away dominant
        </p>

        {/* Primary CTA — Private Match */}
        <Link
          href="/match"
          className="group px-14 py-4 bg-[#00ff88] text-black font-black tracking-widest uppercase text-base rounded-lg
            hover:bg-[#00e87a] transition-colors shadow-[0_0_40px_rgba(0,255,136,0.3)]"
        >
          Challenge a Friend
          <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
        </Link>

        {/* Secondary actions */}
        <div className="mt-4 flex items-center gap-6">
          <Link
            href="/scan"
            className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors tracking-wide"
          >
            Solo scan
          </Link>
          <span className="text-zinc-800 text-xs">·</span>
          <Link
            href="/arena"
            className="text-zinc-400 text-sm hover:text-white transition-colors tracking-wide"
          >
            Enter Arena
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-12 text-center">
          {[
            { label: "Factors analyzed",  value: "7" },
            { label: "Golden ratio target", value: "1.618×" },
            { label: "Frames / sec",       value: "30" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-3xl font-black text-[#00ff88]">{value}</div>
              <div className="text-zinc-600 text-xs tracking-widest uppercase mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-900 px-8 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Challenge a friend",
              desc: "Create a private match and share the 6-digit code. Your opponent joins on their device — both cameras go live side by side.",
            },
            {
              step: "02",
              title: "AI scans both of you",
              desc: "MediaPipe Pose maps your body landmarks in real-time. 7 factors scored simultaneously. A gold ideal-proportion overlay shows the gap from a 10/10.",
            },
            {
              step: "03",
              title: "One walks away dominant",
              desc: "Scores lock in after 15 seconds. 7 hidden factors decide the winner — you see your overall rating, your dominant strength, and your biggest flaw.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="space-y-2">
              <div className="text-[#00ff88] text-xs tracking-widest font-bold">{step}</div>
              <div className="text-white font-bold text-lg">{title}</div>
              <div className="text-zinc-500 text-sm leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Score tiers */}
      <section className="border-t border-zinc-900 px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs tracking-widest text-zinc-600 uppercase mb-6">Score tiers</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { range: "0 – 3",  tier: "Untrained",  color: "#f87171", desc: "Minimal muscle development. Shoulders near hip width." },
              { range: "3 – 5",  tier: "Average",    color: "#facc15", desc: "Some shoulder dominance. Common for casual gym-goers." },
              { range: "5 – 7",  tier: "Athletic",   color: "#a3e635", desc: "Clear V-taper. Proportions above average male baseline." },
              { range: "7 – 9",  tier: "Aesthetic",  color: "#00ff88", desc: "Near-ideal ratios. Trained, symmetrical, structured." },
              { range: "9 – 10", tier: "Elite",      color: "#00ff88", desc: "Golden-ratio proportions. Extremely rare from landmarks alone." },
            ].map(({ range, tier, color, desc }) => (
              <div key={tier} className="bg-zinc-900 rounded-lg p-4 space-y-2 col-span-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm" style={{ color }}>{tier}</span>
                  <span className="text-zinc-600 text-xs font-mono">{range}</span>
                </div>
                <div className="h-0.5 rounded-full" style={{ backgroundColor: color, opacity: 0.4 }} />
                <p className="text-zinc-500 text-[11px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What the AI analyzes */}
      <section className="border-t border-zinc-900 px-8 py-12 bg-zinc-950/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs tracking-widest text-zinc-600 uppercase mb-1">What the AI analyzes</div>
          <p className="text-zinc-700 text-xs mb-6">Exact weights are hidden from users — you only see your score, DOM, and FLAW.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: "V-Taper",
                weight: "24%",
                desc: "Shoulder:hip ratio targeting the golden ratio (1.618×). Requires confident hip detection — faked or obscured hips are excluded.",
              },
              {
                name: "Shoulder Width",
                weight: "20%",
                desc: "Shoulder span relative to torso height in pixel space. Ideal: 1.45× torso height. Weak baseline: 0.85×.",
              },
              {
                name: "Chest",
                weight: "20%",
                desc: "Shoulder dominance relative to overall frame. Ideal: shoulders = 1.40× torso height from front view.",
              },
              {
                name: "Arm Dev",
                weight: "15%",
                desc: "Elbow spread as a proxy for arm mass. Capped at 7.5/10 — the remaining gap requires vision-model definition scoring.",
              },
              {
                name: "Symmetry",
                weight: "13%",
                desc: "Left/right arm length balance + shoulder level. Based on Hughes & Gallup (2003) standards for bilateral proportion.",
              },
              {
                name: "Arm Proportion",
                weight: "5%",
                desc: "Upper arm : forearm length ratio. McCallum/Steve Reeves classical ideal = 1.18. Bell curve scored.",
              },
              {
                name: "Posture",
                weight: "3%",
                desc: "Shoulder tilt angle + nose centering over shoulder midpoint. Uneven stance and lean cost points here.",
              },
            ].map(({ name, weight, desc }) => (
              <div key={name} className="bg-zinc-900/70 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-semibold">{name}</span>
                  <span className="text-zinc-600 text-xs font-bold">{weight}</span>
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 px-8 py-5 text-zinc-700 text-xs text-center">
        All analysis runs locally in your browser. No video is ever transmitted.
      </footer>
    </main>
  );
}
