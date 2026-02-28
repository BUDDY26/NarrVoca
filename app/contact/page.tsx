"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Formspree setup ──────────────────────────────────────────────────────────
// 1. Go to https://formspree.io and sign up with ruben.aleman@gmail.com
// 2. Create a new form — set the destination email to ruben.aleman@gmail.com
// 3. Copy your Form ID (looks like "xpzgkqdb") and paste it below
// 4. Deploy — submissions will be forwarded to your Gmail automatically
const FORMSPREE_URL = "https://formspree.io/f/meeldwpg";
// ─────────────────────────────────────────────────────────────────────────────

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

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

          {/* Team GitHub cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <a
              href="https://github.com/andreag02"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 bg-white dark:bg-slate-800 rounded-xl p-5 border border-purple-100 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-100">Andrea Garza</span>
              <span className="text-sm text-purple-500">@andreag02 on GitHub</span>
            </a>
          </div>

          {/* Contact form */}
          <section>
            <h2 className="text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">
              Send Us a Message
            </h2>

            {status === "success" ? (
              <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-6 text-center">
                <p className="text-green-700 dark:text-green-300 font-semibold text-lg mb-1">Message sent!</p>
                <p className="text-green-600 dark:text-green-400 text-sm">
                  Thanks for reaching out — we&apos;ll get back to you soon.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your question, feedback, or bug report…"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Something went wrong — please try again or reach out via GitHub.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 text-white font-medium text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
