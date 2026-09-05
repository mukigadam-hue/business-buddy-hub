import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart, Users, UserCog, Compass, Smartphone, MonitorSmartphone } from "lucide-react";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.despia.biztrack";
const ADSENSE_CLIENT = "ca-pub-9605564713228252";

function useAdSenseScript() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = `adsense-script-${ADSENSE_CLIENT}`;
    if (document.getElementById(id)) return;

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById(id);
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    };
  }, []);
}

function AdPlaceholder({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="mx-auto my-12 flex min-h-[120px] w-full max-w-3xl items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 text-sm font-medium text-muted-foreground"
    >
      {label}
    </div>
  );
}

const features = [
  {
    icon: ShoppingCart,
    title: "Order Management",
    body: "BizTrack gives your team a single, secure cloud portal to track every incoming client request from the moment it arrives until it is fully delivered. Monitor fulfillment statuses in real time, move deals through your sales pipeline dynamically, and never lose sight of a pending order again. Whether you run a retail shop, a factory, or a service business, your entire order history stays organized, searchable, and accessible from anywhere.",
  },
  {
    icon: Users,
    title: "Contact & CRM Directory",
    body: "Keep a clean, structured database of every client, supplier, and partner your business works with. BizTrack lets you seamlessly filter contacts by industry, region, or relationship type, and keeps a running history of your communications and transactions with each one. Repeat customers are recognized automatically, so your records stay consistent and your follow-ups become faster and more personal.",
  },
  {
    icon: UserCog,
    title: "Team Collaboration Hub",
    body: "Administrators can delegate tasks, assign roles, and control exactly what each worker can see and do inside the business account. From a unified control center, owners monitor team activity, review daily recordings, and track performance metrics across every staff member. Permissions are enforced server-side, so your sensitive financial data stays protected while your team stays productive.",
  },
  {
    icon: Compass,
    title: "Discover & Insights",
    body: "BizTrack's integrated browsing tools help you identify new business opportunities in your region and beyond. Explore verified businesses by country and district, monitor regional activity, and see what other suppliers are offering in real time. With visitor insights and engagement signals, you also learn who is viewing your own business — turning casual browsers into new customers.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen-safe bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <img src="/app-icon-1024.png" alt="BizTrack app icon" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-bold text-primary">BizTrack</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#resources" className="hover:text-foreground">Resources</a>
            <a href="#contact" className="hover:text-foreground">Contact Us</a>
          </nav>
          <Link
            to="/login"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
          >
            Launch Web App <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:py-28">
          <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">
            Streamline Your Business Operations in One Central Dashboard.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-primary-foreground/85 md:text-lg">
            Manage orders, track contacts, and oversee team operations from anywhere. Built for modern businesses looking to scale efficiently on both web and mobile platforms.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3 text-base font-bold text-accent-foreground shadow-lg transition-transform hover:scale-[1.02] sm:w-auto"
            >
              Get Started For Free
            </Link>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-primary-foreground/30 bg-primary-foreground/10 px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/20 sm:w-auto"
            >
              <Smartphone className="h-5 w-5" /> Download Android App
            </a>
          </div>
        </div>
      </section>

      <AdPlaceholder label="Ad Placement Block Area" />

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Everything Your Business Needs</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          BizTrack combines sales, stock, services, expenses, team management, and customer relationships into one reliable platform — online or offline, on web or mobile.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {features.map((f) => (
            <article key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <f.icon className="h-8 w-8 text-accent" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <AdPlaceholder label="Ad Placement Block Area" />

      {/* Web vs Mobile */}
      <section id="resources" className="bg-muted/60">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold md:text-3xl">One Ecosystem, Two Powerful Experiences</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <Smartphone className="h-8 w-8 text-accent" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">On the Go</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Use our published Google Play Store application to track logistics while in the field. Record sales, scan barcodes, snap product photos, and update stock even without an internet connection — everything syncs automatically when you're back online.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <MonitorSmartphone className="h-8 w-8 text-accent" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">At the Desk</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Log into our comprehensive web platform for deep analytics, mass data entry, and team management operations. Review financial summaries, run business audits, export reports, and manage roles from a full-screen workspace designed for productivity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">Simple Pricing</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          BizTrack is free to get started — create your business account, add your stock, record sales, and invite your team at no cost. Premium upgrades unlock advanced capabilities for growing operations, and our core record-keeping tools remain accessible to every registered business.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-lg hover:opacity-90"
        >
          Get Started For Free
        </Link>
      </section>

      <AdPlaceholder label="Ad Placement Block Area" />

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-4xl px-4 pb-16 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">Contact Us</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          Have questions about BizTrack, need help setting up your business account, or want to share feedback? Our team is happy to help — reach out through the Help &amp; Legal section inside the app, or sign in and contact us directly from your dashboard.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 md:flex-row">
          <div className="flex items-center gap-2">
            <img src="/app-icon-1024.png" alt="BizTrack logo" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-primary">BizTrack</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <a href="#contact" className="hover:text-foreground">Terms of Service</a>
            <button type="button" className="hover:text-foreground">Cookie Consent Preferences</button>
            <Link to="/login" className="hover:text-foreground">Sign In</Link>
          </nav>
          <p className="text-sm text-muted-foreground">© 2026 BizTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
