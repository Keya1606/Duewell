import React, { useState, useEffect } from "react";
import { RouteType } from "./types";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import LandingPage from "./components/LandingPage";
import SignInPage from "./components/SignInPage";
import SignUpPage from "./components/SignUpPage";
import Dashboard from "./components/Dashboard";
import ProfilePage from "./components/ProfilePage";
import { Loader2 } from "lucide-react";

interface SessionInfo {
  email: string;
  userId: string;
}

export default function App() {
  const [route, setRoute] = useState<RouteType>("/");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sync state with HTML5 History
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as RouteType;
      if (["/", "/signin", "/signup", "/app", "/profile"].includes(path)) {
        setRoute(path);
      } else {
        setRoute("/");
      }
    };

    window.addEventListener("popstate", handlePopState);
    handlePopState(); // Initialize route based on path
    
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (newRoute: RouteType) => {
    if (window.location.pathname !== newRoute) {
      window.history.pushState(null, "", newRoute);
    }
    setRoute(newRoute);
  };

  // Auth setup & state listeners
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // 1. Check current session status
      supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
        if (activeSession?.user) {
          setSession({
            email: activeSession.user.email || "",
            userId: activeSession.user.id,
          });
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
        setAuthLoading(false);
      });

      // 2. Listen to active changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
        if (activeSession?.user) {
          setSession({
            email: activeSession.user.email || "",
            userId: activeSession.user.id,
          });
          setIsAuthenticated(true);
        } else {
          setSession(null);
          setIsAuthenticated(false);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Fallback local memory session check for offline sandbox
      const savedEmail = localStorage.getItem("lifesaver_session_email");
      const savedUserId = localStorage.getItem("lifesaver_session_id");

      if (savedEmail && savedUserId) {
        setSession({ email: savedEmail, userId: savedUserId });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setAuthLoading(false);
    }
  }, []);

  // Proactive Route Protection & Redirect logic
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      // Redirect logged-in users away from logged-out views
      if (route === "/signin" || route === "/signup") {
        navigate("/");
      }
    } else {
      // Redirect logged-out users away from logged-in views
      if (route === "/app" || route === "/profile") {
        navigate("/");
      }
    }
  }, [route, isAuthenticated, authLoading]);

  // Handle manual login/signup callback
  const handleLoginSuccess = (email: string, userId: string) => {
    setSession({ email, userId });
    setIsAuthenticated(true);
    // Cache locally for offline fallback mode persistence
    localStorage.setItem("lifesaver_session_email", email);
    localStorage.setItem("lifesaver_session_id", userId);
  };

  // Handle manual logout
  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Supabase Auth sign out failed:", err);
    } finally {
      // Reset state and clear storage for offline fallbacks
      localStorage.removeItem("lifesaver_session_email");
      localStorage.removeItem("lifesaver_session_id");
      localStorage.removeItem("lifesaver_force_local_mode");
      setSession(null);
      setIsAuthenticated(false);
      setAuthLoading(false);
      navigate("/");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#FF6B4A] mx-auto mb-4" />
          <p className="text-gray-500 font-light text-sm">Synchronizing rescue tools...</p>
        </div>
      </div>
    );
  }

  // Render view
  switch (route) {
    case "/":
      return (
        <LandingPage 
          onNavigate={navigate} 
          isAuthenticated={isAuthenticated} 
          onLogout={handleLogout} 
          userEmail={session ? session.email : ""} 
        />
      );
    case "/signin":
      return <SignInPage onNavigate={navigate} onLoginSuccess={handleLoginSuccess} />;
    case "/signup":
      return <SignUpPage onNavigate={navigate} onLoginSuccess={handleLoginSuccess} />;
    case "/app":
      return session ? (
        <Dashboard 
          userEmail={session.email} 
          userId={session.userId} 
          onLogout={handleLogout} 
          onNavigate={navigate} 
        />
      ) : null;
    case "/profile":
      return session ? (
        <ProfilePage 
          userEmail={session.email} 
          onLogout={handleLogout} 
          onNavigate={navigate} 
        />
      ) : null;
    default:
      return (
        <LandingPage 
          onNavigate={navigate} 
          isAuthenticated={isAuthenticated} 
          onLogout={handleLogout} 
          userEmail={session ? session.email : ""} 
        />
      );
  }
}
