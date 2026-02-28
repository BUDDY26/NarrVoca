// app/layout.tsx
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { LanguageProvider } from "@/lang/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "NarrVoca",
  description: "Narrative-based language learning — master vocabulary through interactive stories.",
  icons: {
    icon: "/VocoraMascot.svg",
    apple: "/VocoraMascot.svg",
  },
  openGraph: {
    title: "NarrVoca",
    description: "Narrative-based language learning — master vocabulary through interactive stories.",
    images: [{ url: "/VocoraMascot.svg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
