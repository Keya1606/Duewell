import React from "react";
import { RouteType } from "../types";
import { Zap, Clock, Compass, Activity, ArrowRight, ShieldCheck, Heart } from "lucide-react";
import ProfileMenu from "./ProfileMenu";

interface LandingPageProps {
  onNavigate: (route: RouteType) => void;
  isAuthenticated: boolean;
  onLogout?: () => void;
  userEmail?: string;
}

export default function LandingPage({ onNavigate, isAuthenticated, onLogout, userEmail }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-transparent text-[#232323] flex flex-col font-sans">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => onNavigate("/")}
          id="logo-container"
        >
          <div className="w-10 h-10 rounded-full bg-[#FF6B4A] flex items-center justify-center text-white shadow-md shadow-coral/20">
            <Zap className="w-5 h-5 fill-white stroke-none" />
          </div>
          <span className="font-outfit text-xl font-bold tracking-tight">Last-Minute Life Saver</span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <ProfileMenu 
              onNavigate={onNavigate} 
              onLogout={onLogout || (() => {})} 
              userEmail={userEmail || ""} 
            />
          ) : (
            <>
              <button 
                onClick={() => onNavigate("/signin")}
                className="px-4 py-2 text-sm font-medium hover:text-[#FF6B4A] transition-colors"
                id="header-signin"
              >
                Sign in
              </button>
              <button 
                onClick={() => onNavigate("/signup")}
                className="px-5 py-2.5 bg-[#FF6B4A] hover:bg-[#ff5631] text-white custom-btn shadow-sm text-sm"
                id="header-signup"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-xs font-semibold text-[#FF6B4A] mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5" />
            The antidote to deadline panic
          </div>
          
          <h1 className="font-outfit text-5xl md:text-6xl font-extrabold tracking-tight text-[#232323] mb-6 leading-[1.1]">
            Stop missing deadlines.<br />
            <span className="text-[#FF6B4A]">Start finishing tasks.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            The friendly, momentum-driven productivity companion that helps you plan, prioritize, and check off high-stakes tasks without the stress.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => onNavigate(isAuthenticated ? "/app" : "/signup")}
              className="w-full sm:w-auto px-8 py-4 bg-[#FF6B4A] hover:bg-[#ff5631] text-white font-semibold text-base custom-btn shadow-md hover:shadow-lg hover:-translate-y-0.5 transform flex items-center justify-center gap-2"
              id="hero-cta"
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto px-8 py-4 bg-white border border-[#ECE9E3] hover:border-gray-300 text-gray-700 font-medium text-base custom-btn shadow-sm"
              id="hero-secondary"
            >
              See how it works
            </button>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 border-t border-[#ECE9E3]/50">
          <div className="text-center mb-16">
            <h2 className="font-outfit text-3xl md:text-4xl font-bold tracking-tight">How Last-Minute Life Saver Works</h2>
            <p className="text-gray-500 mt-3 font-light">Simple, human-centered steps to tackle your mounting list.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="custom-card p-8 flex flex-col justify-between" id="step-card-1">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B4A] mb-6">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-outfit text-xl font-bold mb-3">1. Add Your Deadlines</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  List what needs to get done, when it's due, and how long you think it'll take. No complex tagging or setup required.
                </p>
              </div>
              <div className="text-[#FF6B4A]/40 font-outfit text-5xl font-extrabold mt-8 text-right">01</div>
            </div>

            {/* Step 2 */}
            <div className="custom-card p-8 flex flex-col justify-between" id="step-card-2">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B4A] mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-outfit text-xl font-bold mb-3">2. Auto-Prioritize with AI</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  One tap lets Gemini reorganize your chaos. Identify quick wins, critical tasks, and dynamic tips to manage anxiety.
                </p>
              </div>
              <div className="text-[#FF6B4A]/40 font-outfit text-5xl font-extrabold mt-8 text-right">02</div>
            </div>

            {/* Step 3 */}
            <div className="custom-card p-8 flex flex-col justify-between" id="step-card-3">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#4CAF82] mb-6">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="font-outfit text-xl font-bold mb-3">3. Generate Daily Schedule</h3>
                <p className="text-gray-600 font-light leading-relaxed">
                  Generate an hourly, realistic roadmap integrating work intervals, habits, and rest. Build your daily Momentum Ring!
                </p>
              </div>
              <div className="text-[#4CAF82]/40 font-outfit text-5xl font-extrabold mt-8 text-right">03</div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="bg-white/30 backdrop-blur-md border-y border-white/40 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="font-outfit text-3xl md:text-4xl font-bold tracking-tight">Crafted for Healthy Momentum</h2>
              <p className="text-gray-500 mt-3 font-light">Features designed to make finishing your tasks feel deeply rewarding, not stressful.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl hover:bg-[#FAFAF9] transition-all" id="feature-1">
                <div className="text-[#FF6B4A] mb-4">
                  <Zap className="w-8 h-8" />
                </div>
                <h4 className="font-outfit text-lg font-bold mb-2">Smart Prioritization</h4>
                <p className="text-sm text-gray-600 font-light leading-relaxed">
                  Gemini sorts tasks into clear action zones: Critical, Important, or Malleable.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl hover:bg-[#FAFAF9] transition-all" id="feature-2">
                <div className="text-[#FF6B4A] mb-4">
                  <Compass className="w-8 h-8" />
                </div>
                <h4 className="font-outfit text-lg font-bold mb-2">Realistic Planning</h4>
                <p className="text-sm text-gray-600 font-light leading-relaxed">
                  Automatically blends deadlines, time estimates, and breaks into an achievable schedule.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl hover:bg-[#FAFAF9] transition-all" id="feature-3">
                <div className="text-[#FF6B4A] mb-4">
                  <Activity className="w-8 h-8" />
                </div>
                <h4 className="font-outfit text-lg font-bold mb-2">Momentum Tracker</h4>
                <p className="text-sm text-gray-600 font-light leading-relaxed">
                  Watch your circular ring fill with warm energy as you stack small wins during the day.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-2xl hover:bg-[#FAFAF9] transition-all" id="feature-4">
                <div className="text-[#4CAF82] mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="font-outfit text-lg font-bold mb-2">Habit Integration</h4>
                <p className="text-sm text-gray-600 font-light leading-relaxed">
                  Proactively stack regular stretch, hydration, or mindfulness habits with task sprints.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/40 bg-white/15 backdrop-blur-md py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#FF6B4A] flex items-center justify-center text-white font-extrabold text-[10px]">
              L
            </div>
            <span className="font-outfit font-bold text-[#232323]">Last-Minute Life Saver</span>
          </div>
          
          <div className="flex items-center gap-1 font-light">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 mx-1" /> for zero-stress productivity.
          </div>

          <div className="font-light">
            &copy; {new Date().getFullYear()} Last-Minute Life Saver. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
