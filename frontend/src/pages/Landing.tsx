import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-foreground-primary">YouTube Revenue Tracker</h1>
          <div className="flex gap-4">
            <Link to="/login" className="text-foreground-secondary hover:text-foreground-primary">
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-accent-primary hover:bg-accent-hover text-white px-4 py-2 rounded-soft"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="text-5xl font-bold text-foreground-primary mb-6">
          Know exactly which YouTube videos<br />drive your sales
        </h2>
        <p className="text-xl text-foreground-secondary mb-8 max-w-2xl mx-auto">
          Track clicks, attribute conversions, and see real revenue data for every video you publish.
          Stop guessing which content converts.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-accent-primary hover:bg-accent-hover text-white px-8 py-4 rounded-soft text-lg font-medium"
        >
          Start Free Trial
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-background-secondary p-6 rounded-card border border-border-primary">
            <h3 className="text-lg font-semibold text-foreground-primary mb-2">Click Tracking</h3>
            <p className="text-foreground-secondary">
              Unique tracking links for every video and offer. Know exactly where your traffic comes from.
            </p>
          </div>
          <div className="bg-background-secondary p-6 rounded-card border border-border-primary">
            <h3 className="text-lg font-semibold text-foreground-primary mb-2">Revenue Attribution</h3>
            <p className="text-foreground-secondary">
              Connect your Stripe and see real revenue data attributed to specific videos.
            </p>
          </div>
          <div className="bg-background-secondary p-6 rounded-card border border-border-primary">
            <h3 className="text-lg font-semibold text-foreground-primary mb-2">Journey Analytics</h3>
            <p className="text-foreground-secondary">
              Understand the full customer journey from first click to purchase.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background-secondary border-y border-border-primary py-16 text-center">
        <h2 className="text-3xl font-bold text-foreground-primary mb-4">
          Ready to understand your YouTube revenue?
        </h2>
        <p className="text-foreground-secondary mb-8">
          Free to start. No credit card required.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-accent-primary hover:bg-accent-hover text-white px-8 py-4 rounded-soft text-lg font-medium"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  )
}
