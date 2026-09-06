import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Gemini Journal - AI Sanctuary',
  description: 'A multi-persona intelligent AI companion for mindful reflection, stoic inquiry, and personal growth powered by Gemini.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = process.env;
  const publicEnv = {
    NEXT_PUBLIC_FIREBASE_API_KEY: env.FIREBASE_API_KEY || env['NEXT_PUBLIC_FIREBASE_API_KEY'] || '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: env.FIREBASE_AUTH_DOMAIN || env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'] || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET || env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'] || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID || env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'] || '',
    NEXT_PUBLIC_FIREBASE_APP_ID: env.FIREBASE_APP_ID || env['NEXT_PUBLIC_FIREBASE_APP_ID'] || '',
    NEXT_PUBLIC_FIREBASE_DATABASE_ID: env.FIREBASE_DATABASE_ID || env['NEXT_PUBLIC_FIREBASE_DATABASE_ID'] || 'gemini-journal',
    NEXT_PUBLIC_AQICN_TOKEN: env.AQICN_TOKEN || env['NEXT_PUBLIC_AQICN_TOKEN'] || '',
  };


  return (
    <html lang="en" className="dark">
      <head>
        <script
          id="runtime-env"
          dangerouslySetInnerHTML={{
            __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify(publicEnv)};`,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
