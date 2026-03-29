import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useApi } from '@/hooks/useApi'

const PLANS = [
  {
    name: 'Free',
    price: 0,
    features: ['3 offers', '500 clicks/month', '30-day data retention', 'Basic analytics'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: 29,
    features: ['Unlimited offers', 'Unlimited clicks', '1-year data retention', 'Advanced analytics', 'Priority support'],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Business',
    price: 79,
    features: ['Everything in Pro', 'Unlimited data retention', 'API access', 'White-label options', 'Dedicated support'],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function Pricing() {
  const { isSignedIn } = useUser()
  const { fetchApi } = useApi()

  const handleUpgrade = async (plan: string) => {
    if (!isSignedIn) {
      window.location.href = '/signup'
      return
    }

    try {
      const { url } = await fetchApi('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      })
      window.location.href = url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <header className="border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-semibold text-foreground-primary">
            YouTube Revenue Tracker
          </Link>
          <div className="flex gap-4">
            {isSignedIn ? (
              <Link to="/dashboard" className="text-foreground-secondary hover:text-foreground-primary">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-foreground-secondary hover:text-foreground-primary">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-accent-primary hover:bg-accent-hover text-white px-4 py-2 rounded-soft"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-foreground-primary text-center mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-foreground-secondary text-center mb-12">
          Start free, upgrade when you need more
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`bg-background-secondary p-8 rounded-card border ${
                plan.popular ? 'border-accent-primary' : 'border-border-primary'
              } relative`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-primary text-white text-sm px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h2 className="text-2xl font-bold text-foreground-primary mb-2">{plan.name}</h2>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground-primary">${plan.price}</span>
                <span className="text-foreground-secondary">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-foreground-secondary flex items-center gap-2">
                    <span className="text-accent-primary">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.name.toLowerCase())}
                className={`w-full py-3 rounded-soft font-medium ${
                  plan.popular
                    ? 'bg-accent-primary hover:bg-accent-hover text-white'
                    : 'bg-background-tertiary hover:bg-border-primary text-foreground-primary'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
