import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

export default function TermsPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-[#0E1513] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/signup"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-sand-500 hover:text-primary-600 dark:text-sand-400 dark:hover:text-primary-400"
        >
          <ArrowLeft size={16} />
          {t('back')}
        </Link>

        <h1 className="text-2xl font-black text-sand-900 dark:text-white">Terms of Service</h1>
        <p className="mt-1 text-sm text-sand-400">Last updated: May 2026</p>

        <div className="prose prose-sand dark:prose-invert mt-8 max-w-none text-sm leading-relaxed text-sand-700 dark:text-sand-300 space-y-6">
          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">1. Acceptance</h2>
            <p>
              By creating a TalibRoom account you agree to these Terms. If you do not agree, do not use
              the platform. You must be at least 16 years old and a student or real-estate
              professional to register.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">2. Your account</h2>
            <p>
              You are responsible for keeping your credentials secure. You may not share your account
              or impersonate another person. TalibRoom reserves the right to suspend accounts that
              violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">3. Content</h2>
            <p>
              You own content you post. By posting, you grant TalibRoom a non-exclusive licence to
              display it within the platform. You must not post illegal, harmful, or misleading
              content. TalibRoom may remove content that violates these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">4. Listings</h2>
            <p>
              Apartment listings must be accurate and legally available for rent in Morocco. TalibRoom is
              a marketplace and is not a party to any rental agreement between users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">5. Premium features</h2>
            <p>
              Premium subscriptions are billed as described at the time of purchase. Payments are
              non-refundable except where required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">6. Limitation of liability</h2>
            <p>
              TalibRoom is provided "as is". We are not liable for any loss arising from your use of the
              platform, including disputes between users over accommodation.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">7. Changes</h2>
            <p>
              We may update these Terms. Continued use of TalibRoom after changes are posted constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">8. Contact</h2>
            <p>
              Questions? Email us at{' '}
              <a href="mailto:support@talibroom.ma" className="text-primary-600 hover:underline dark:text-primary-400">
                support@talibroom.ma
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
