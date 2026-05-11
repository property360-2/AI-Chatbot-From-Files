'use client';

/**
 * Legal Page for Tropang AI
 * Includes Privacy Policy and Terms of Service.
 * Follows the minimalist, document-focused aesthetic of the brand.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LegalPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync theme with localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('tropangai_theme');
    const isDark = savedTheme ? savedTheme === 'dark' : true;
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tropangai_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tropangai_theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/20 selection:text-accent transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-8 right-8">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl hover:bg-accent/10 text-secondary hover:text-accent transition-all border border-border/50 bg-card/50 backdrop-blur-sm"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        {/* Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-secondary hover:text-accent transition-all duration-300 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Back to Dashboard</span>
          </Link>
        </motion.div>

        {/* Header */}
        <header className="mb-20 space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter transition-all">
            Legal <span className="text-accent">&</span> Privacy
          </h1>
          <p className="text-secondary font-medium uppercase tracking-[0.3em] text-[10px] md:text-xs transition-all">
            Tropang AI Transparency Report
          </p>
        </header>

        <div className="space-y-24">
          {/* Privacy Policy */}
          <section className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight transition-all">Privacy Policy</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-accent uppercase tracking-widest transition-all">Effective Date: May 8, 2026</p>
            </div>

            <div className="prose prose-invert max-w-none space-y-12 text-secondary/80 leading-relaxed font-medium">
              <p className="text-lg text-foreground/90">
                Welcome to Tropang AI. We respect your privacy and we want to be upfront about what data we collect, why we collect it, and how it's used. This Privacy Policy applies to anyone who uses Tropang AI — no matter who you are.
              </p>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-foreground">1. What We Collect</h3>
                <div className="grid gap-8">
                  <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-3">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      Firebase Authentication
                    </h4>
                    <p className="text-sm">When you sign in with Google, we receive basic profile information including your Email address, Display name, and Profile picture. This is used solely to identify your account and keep your data separate from other users.</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-3">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      Firestore Database
                    </h4>
                    <p className="text-sm">We store Conversations (titles/timestamps), Messages (full history), File Metadata, and Document Content (extracted text) to enable AI interactions.</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-3">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      Local Storage
                    </h4>
                    <p className="text-sm">We save your theme preference (dark or light mode) locally on your device. This data never leaves your browser.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">2. How We Use Your Data</h3>
                <p className="text-sm">We use your data only to provide and improve Tropang AI. Specifically: to authenticate your identity, to let the AI answer questions based on your documents, and to save your history. <strong>We do not sell your data.</strong></p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">3. Data Sharing</h3>
                <p className="text-sm">Your data is processed through Google Firebase (for storage) and GROQ API (for AI generation). Beyond these infrastructure services, we do not share your personal data with anyone.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">4. Data Security</h3>
                <p className="text-sm">We use Firebase's built-in security rules to ensure only you can access your documents. However, please do not upload highly sensitive information like passwords or financial credentials.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">5. Your Rights</h3>
                <p className="text-sm">You have the right to access your data, delete your account at any time, and stop using the service. Deleting your account will permanently remove all associated messages and file content.</p>
              </div>
            </div>
          </section>

          {/* Terms of Service */}
          <section className="space-y-8 pt-16 border-t border-border/30">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight transition-all">Terms of Service</h2>
              <p className="text-[9px] md:text-[10px] font-bold text-accent uppercase tracking-widest transition-all">Effective Date: May 8, 2026</p>
            </div>

            <div className="prose prose-invert max-w-none space-y-12 text-secondary/80 leading-relaxed font-medium">
              <p className="text-sm">These Terms of Service govern your use of Tropang AI. By using Tropang AI, you agree to these terms. If you don't agree, please don't use the service.</p>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">1. What Tropang AI Is</h3>
                <p className="text-sm">Tropang AI is an AI-powered document assistant. You upload PDF files, and you can ask questions about the content. The AI answers based only on what's in your documents. It is not a professional advisory service.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">2. Acceptable Use</h3>
                <p className="text-sm">You agree not to upload illegal content, attempt to breach security, or reverse engineer the service. We reserve the right to terminate accounts that violate these terms.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">3. AI Limitations</h3>
                <p className="text-sm">AI can make mistakes. Always verify important information. Do not rely on Tropang AI for critical decisions involving health, legal matters, or finances.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">4. Limitation of Liability</h3>
                <p className="text-sm">Tropang AI is provided "as is" without warranties. We are not liable for any damages arising from your use of the service or service downtime.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-32 pt-12 border-t border-border/20 flex flex-col items-center gap-6">
          <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-[0.4em]">
            Upload. Ask. Know.
          </p>
          <p className="text-[8px] font-bold text-accent/30 uppercase tracking-widest">
            © {new Date().getFullYear()} TropangAI — All Rights Reserved | Developed by Jun Alvior
          </p>
        </footer>
      </div>
    </div>
  );
}
