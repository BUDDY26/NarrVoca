"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-50 to-white dark:from-purple-950 dark:to-slate-900">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 mb-8 text-sm font-medium transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-violet-500 bg-clip-text text-transparent mb-8">
          Privacy Policy
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Last updated: February 28, 2026
        </p>

        <div className="space-y-6 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">
              1. Information We Collect
            </h2>
            <p className="leading-relaxed">
              NarrVoca collects the following data to provide its language-learning services:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li><strong>Account information</strong> — email address and authentication credentials via Supabase Auth.</li>
              <li><strong>Learning data</strong> — your written responses to story checkpoints, accuracy scores, and vocabulary mastery progress.</li>
              <li><strong>Usage data</strong> — which story nodes you have visited and completed.</li>
              <li><strong>Preferences</strong> — your chosen display language and practice language.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">
              2. How We Use Your Data
            </h2>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li>To authenticate you and maintain your session.</li>
              <li>To track your progress through narrative stories and vocabulary mastery.</li>
              <li>To schedule spaced-repetition reviews for vocabulary words.</li>
              <li>To pass your written responses to OpenAI GPT-4o-mini for automated grading. Responses are not stored by OpenAI for training without your consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">
              3. Third-Party Services
            </h2>
            <p className="leading-relaxed">
              NarrVoca uses the following third-party services, each with their own privacy policies:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li><strong>Supabase</strong> — database and authentication hosting.</li>
              <li><strong>OpenAI</strong> — LLM grading via GPT-4o-mini.</li>
              <li><strong>Google (Gemini)</strong> — writing practice feedback.</li>
              <li><strong>Vercel</strong> — application hosting and deployment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">
              4. Data Retention
            </h2>
            <p className="leading-relaxed">
              Your account data and learning history are retained as long as your account is active.
              You may request deletion of your account and associated data by contacting us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">
              5. Contact
            </h2>
            <p className="leading-relaxed">
              For privacy-related inquiries, please use our{" "}
              <Link
                href="/contact"
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 underline"
              >
                contact form
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
