import React, { useState, useEffect } from "react";
import { RouteType } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { ArrowLeft, User, Mail, Calendar, Loader2, Check, Edit2, AlertCircle } from "lucide-react";
import ProfileMenu from "./ProfileMenu";

interface ProfilePageProps {
  userEmail: string;
  onLogout: () => void;
  onNavigate: (route: RouteType) => void;
}

export default function ProfilePage({ userEmail, onLogout, onNavigate }: ProfilePageProps) {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setLoading(true);
        if (isSupabaseConfigured && supabase) {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (user) {
            const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";
            setFullName(metaName);
            setEditName(metaName);
            setEmail(user.email || userEmail);
            setCreatedAt(user.created_at || new Date().toISOString());
            
            // Sync locally
            if (metaName) {
              localStorage.setItem("lifesaver_user_full_name", metaName);
            }
          }
        } else {
          // Sandbox local mode load
          const cachedName = localStorage.getItem("lifesaver_user_full_name") || "Rescue Cadet";
          let cachedCreated = localStorage.getItem("lifesaver_user_created_at");
          if (!cachedCreated) {
            cachedCreated = new Date().toISOString();
            localStorage.setItem("lifesaver_user_created_at", cachedCreated);
          }
          setFullName(cachedName);
          setEditName(cachedName);
          setEmail(userEmail);
          setCreatedAt(cachedCreated);
        }
      } catch (err: any) {
        setErrorMessage("Failed to retrieve profile details.");
        console.error("Profile load error", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [userEmail]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a valid full name.");
      return;
    }

    setUpdateLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.updateUser({
          data: { full_name: trimmedName }
        });

        if (error) throw error;

        if (data.user) {
          const updatedName = data.user.user_metadata?.full_name || trimmedName;
          setFullName(updatedName);
          setEditName(updatedName);
          localStorage.setItem("lifesaver_user_full_name", updatedName);
          
          // Emit custom event to notify ProfileMenu avatar of instant updates
          window.dispatchEvent(
            new CustomEvent("profile-updated", { detail: { fullName: updatedName } })
          );
          setSuccessMessage("Your profile name has been successfully updated in Supabase!");
          setIsEditing(false);
        }
      } else {
        // Offline sandbox edit
        setTimeout(() => {
          setFullName(trimmedName);
          setEditName(trimmedName);
          localStorage.setItem("lifesaver_user_full_name", trimmedName);
          
          // Emit custom event
          window.dispatchEvent(
            new CustomEvent("profile-updated", { detail: { fullName: trimmedName } })
          );
          setSuccessMessage("Profile name updated locally!");
          setIsEditing(false);
          setUpdateLoading(false);
        }, 600);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update profile name.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#232323] flex flex-col font-sans">
      {/* Header */}
      <header className="w-full border-b border-[#ECE9E3]/40 bg-white/40 backdrop-blur-md sticky top-0 z-10 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => onNavigate("/")}
            id="profile-header-logo"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF6B4A] flex items-center justify-center text-white shadow-xs">
              <span className="font-extrabold text-[12px]">L</span>
            </div>
            <span className="font-outfit text-md font-bold tracking-tight">Last-Minute Life Saver</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate("/app")}
              className="px-4 py-1.5 border border-gray-200 hover:border-[#FF6B4A] hover:bg-[#FF6B4A]/5 text-gray-600 hover:text-[#FF6B4A] text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              id="profile-back-dashboard-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>

            <ProfileMenu onNavigate={onNavigate} onLogout={onLogout} userEmail={userEmail} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-xl w-full mx-auto px-6 py-12">
        <button
          onClick={() => onNavigate("/app")}
          className="mb-6 flex items-center gap-1.5 text-gray-400 hover:text-[#FF6B4A] text-xs font-semibold transition-colors cursor-pointer"
          id="profile-back-link"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to my rescue board
        </button>

        {loading ? (
          <div className="custom-card p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B4A] mb-3" />
            <p className="text-xs text-gray-500 font-light">Loading account details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Page Title */}
            <div>
              <h1 className="font-outfit text-2xl font-black text-[#232323] tracking-tight">Account Profile</h1>
              <p className="text-xs text-gray-400 mt-1 font-light">View and customize your rescuer identity settings.</p>
            </div>

            {/* Notification messages */}
            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-xs text-[#4CAF82] rounded-xl font-medium flex items-start gap-2 animate-fade-in" id="profile-success-alert">
                <span className="mt-0.5">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-100 text-xs text-red-600 rounded-xl font-medium flex items-start gap-2 animate-fade-in" id="profile-error-alert">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Main Profile Info Card */}
            <div className="custom-card p-6 space-y-6" id="profile-details-card">
              
              {/* Header profile initials banner */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100/60">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF6B4A] to-[#ff8c73] text-white flex items-center justify-center font-outfit font-black text-2xl shadow-md">
                  {fullName ? fullName.split(" ").map(p => p[0]).join("").toUpperCase().substring(0,2) : email.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#232323]">{fullName || "Rescue Cadet"}</h3>
                  <p className="text-xs text-gray-400 font-light truncate max-w-xs">{email}</p>
                </div>
              </div>

              {/* Account Details list */}
              <div className="space-y-4">
                
                {/* Full Name display & edit */}
                <div className="space-y-1.5" id="profile-name-section">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-3 h-3 text-[#FF6B4A]" /> Full Name
                    </label>
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditName(fullName);
                          setIsEditing(true);
                        }}
                        className="text-[10px] text-[#FF6B4A] hover:text-[#ff5631] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        id="profile-edit-name-btn"
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Edit name
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleUpdateName} className="flex gap-2 items-center mt-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="E.g., John Doe"
                        className="flex-grow px-3 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] focus:ring-1 focus:ring-[#FF6B4A] outline-none text-xs rounded-lg transition-colors font-medium"
                        required
                        disabled={updateLoading}
                        id="profile-name-input"
                      />
                      <button
                        type="submit"
                        disabled={updateLoading}
                        className="px-3 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        id="profile-save-name-btn"
                      >
                        {updateLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" /> Save
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                        id="profile-cancel-name-btn"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs font-semibold text-[#232323] bg-[#FAFAF9] px-3.5 py-2.5 rounded-lg border border-[#ECE9E3]/50">
                      {fullName || <span className="text-gray-400 italic font-light">No name registered yet.</span>}
                    </p>
                  )}
                </div>

                {/* Email address */}
                <div className="space-y-1.5" id="profile-email-section">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-[#FF6B4A]" /> Registered Email Address
                  </label>
                  <p className="text-xs font-semibold text-gray-600 bg-gray-50/60 px-3.5 py-2.5 rounded-lg border border-gray-100 cursor-not-allowed select-all truncate">
                    {email}
                  </p>
                  <p className="text-[9px] text-gray-400 font-light leading-relaxed">
                    Account email address is secure and managed via auth providers.
                  </p>
                </div>

                {/* Account Created At */}
                <div className="space-y-1.5" id="profile-created-section">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[#FF6B4A]" /> Account Created Date
                  </label>
                  <p className="text-xs font-semibold text-gray-600 bg-gray-50/60 px-3.5 py-2.5 rounded-lg border border-gray-100 cursor-not-allowed">
                    {formatDate(createdAt)}
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
