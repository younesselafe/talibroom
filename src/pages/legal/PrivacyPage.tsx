import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'

export default function PrivacyPage() {
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

        <h1 className="text-2xl font-black text-sand-900 dark:text-white">Privacy Policy</h1>
        <p className="mt-1 text-sm text-sand-400">Last updated: May 2026</p>

        <div className="prose prose-sand dark:prose-invert mt-8 max-w-none text-sm leading-relaxed text-sand-700 dark:text-sand-300 space-y-6">
          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">1. Data we collect</h2>
            <p>
              When you register we collect your email address, name, gender, age, city, and
              university. When you post listings or content we store the text, images, and metadata
              you provide. We also collect usage data such as page views and feature interactions to
              improve the platform.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">2. How we use your data</h2>
            <p>
              Your data is used to operate TalibRoom: matching you with compatible roommates, displaying
              your listings, sending notifications you have opted into, and preventing abuse. We do
              not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">3. Data sharing</h2>
            <p>
              Profile information you choose to make public (name, university, city, lifestyle
              preferences) is visible to other authenticated TalibRoom users. Your email address is
              never shown to other users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">4. Storage and security</h2>
            <p>
              Data is stored on Supabase infrastructure hosted in the EU. We apply row-level security
              so users can only access data they are authorised to see. Session tokens on mobile are
              stored in the device encrypted keychain.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">5. Your rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data at any
              time by contacting us. Deleting your account removes your profile from the platform
              within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">6. Cookies</h2>
            <p>
              The web app uses only essential session cookies required for authentication. No
              advertising or tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-sand-800 dark:text-sand-200">7. Contact</h2>
            <p>
              For privacy requests email{' '}
              <a href="mailto:privacy@talibroom.ma" className="text-primary-600 hover:underline dark:text-primary-400">
                privacy@talibroom.ma
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
