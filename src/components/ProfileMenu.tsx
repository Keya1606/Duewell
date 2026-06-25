import React, { useState, useEffect, useRef } from "react";
import { RouteType } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { User, LogOut } from "lucide-react";

interface ProfileMenuProps {
  onNavigate: (route: RouteType) => void;
  onLogout: () => void;
  userEmail: string;
}

export default function ProfileMenu({ onNavigate, onLogout, userEmail }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Load name on mount
  useEffect(() => {
    const localName = localStorage.getItem("lifesaver_user_full_name");
    if (localName) {
      setFullName(localName);
    }

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";
          if (metaName) {
            setFullName(metaName);
            localStorage.setItem("lifesaver_user_full_name", metaName);
          }
        }
      });
    }

    // Listener for custom event to update profile name instantly when updated in /profile
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.fullName) {
        setFullName(customEvent.detail.fullName);
      }
    };
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getInitials = () => {
    if (fullName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    if (userEmail) {
      const emailPart = userEmail.split("@")[0];
      return emailPart.substring(0, Math.min(2, emailPart.length)).toUpperCase();
    }
    return "US";
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef} id="profile-menu-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-[#FF6B4A] hover:bg-[#ff5631] text-white flex items-center justify-center font-outfit font-bold text-sm shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 focus:outline-none"
        title={fullName || userEmail}
        id="profile-avatar-btn"
      >
        {getInitials()}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2.5 w-48 bg-white border border-[#ECE9E3] rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in focus:outline-none"
          id="profile-dropdown-menu"
        >
          {fullName && (
            <div className="px-4 py-2 border-b border-[#ECE9E3]/50 text-left">
              <p className="text-xs font-bold text-[#232323] truncate">{fullName}</p>
              <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
            </div>
          )}
          
          <button
            onClick={() => {
              setIsOpen(false);
              onNavigate("/profile");
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:text-[#FF6B4A] hover:bg-[#FAFAF9] flex items-center gap-2 transition-colors cursor-pointer"
            id="profile-menu-option-profile"
          >
            <User className="w-3.5 h-3.5 text-[#FF6B4A]" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
            id="profile-menu-option-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
