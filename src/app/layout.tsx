import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Gemini Journal - AI Sanctuary',
  description: 'A multi-persona intelligent AI companion for mindful reflection, stoic inquiry, and personal growth powered by Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
