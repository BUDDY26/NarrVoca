"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
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
          Contact Us
        </h1>

        <div className="space-y-8 text-slate-700 dark:text-slate-300">
          <p className="text-lg leading-relaxed">
            Have a question, found a bug, or want to share feedback? We&apos;d love to hear from you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://github.com/BUDDY26"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 bg-white dark:bg-slate-800 rounded-xl p-5 border border-purple-100 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-100">Ruben Aleman</span>
              <span className="text-sm text-purple-500">@BUDDY26 on GitHub</span>
            </a>

            <a
              href="https://github.com/mozzarellastix"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 bg-white dark:bg-slate-800 rounded-xl p-5 border border-purple-100 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-100">Silvia Osuna</span>
              <span className="text-sm text-purple-500">@mozzarellastix on GitHub</span>
            </a>
          </div>

          <section className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
            <h2 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-3">
              Report a Bug
            </h2>
            <p className="leading-relaxed mb-3">
              Found something broken? Please open an issue on our GitHub repository with:
            </p>
            <ul className="space-y-1 list-disc list-inside ml-2 text-sm">
              <li>What you were doing when the issue occurred</li>
              <li>What you expected to happen</li>
              <li>What actually happened</li>
              <li>Your browser and operating system</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-3">
              General Inquiries
            </h2>
            <p className="leading-relaxed">
              For general questions or academic inquiries about the project, email us at{" "}
              <a
                href="mailto:narrvoca@uh.edu"
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 underline"
              >
                narrvoca@uh.edu
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
