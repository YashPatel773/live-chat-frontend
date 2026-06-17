import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      {/* SEO METADATA SECTION */}
      <Helmet>
        <title>TalkFlow | Secure Real-Time Live Chat App</title>
        <meta name="description" content="Connect instantly with friends and teams using TalkFlow. A fast, secure, and responsive live chat application featuring end-to-end reliability." />
        <meta name="keywords" content="live chat, real-time messaging, chat app, secure chat, React chat" />
        
        {/* Open Graph Tags (For looking good when shared on WhatsApp, Twitter, LinkedIn) */}
        <meta property="og:title" content="TalkFlow | Secure Real-Time Live Chat App" />
        <meta property="og:description" content="Connect instantly with fast, secure real-time messaging." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* VISIBLE HERO SECTION */}
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-blue-900 mb-4">
          Chat Instantly. Anytime, Anywhere.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-8">
          TalkFlow brings seamless, real-time communication straight to your browser and mobile device. Safe, encrypted, and lightning-fast.
        </p>
        <div className="flex gap-4">
          <Link to="/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            Get Started for Free
          </Link>
          <Link to="/login" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50">
            Log In
          </Link>
        </div>
      </main>
    </div>
  );
}