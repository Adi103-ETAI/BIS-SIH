"use client";

import { useEffect, useRef, useState } from "react";
import { Stethoscope, Sun, Moon, Monitor, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getLogoStyle, setLogoStyle, type LogoStyle } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import avatar1 from "@/assets/avatar_1.png";
import avatar2 from "@/assets/avatar_2.png";
import avatar3 from "@/assets/avatar_3.png";
import avatar4 from "@/assets/avatar_4.png";
import avatar5 from "@/assets/avatar_5.png";
import avatar6 from "@/assets/avatar_6.png";

const AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

// Convert stored avatar_url back to a renderable src.
// Cartoon picks are stored as "cartoon:1".."cartoon:6"; uploads as full URLs.
const resolveAvatar = (stored: string | null | undefined): string | null => {
  if (!stored) return null;
  if (stored.startsWith("cartoon:")) {
    const idx = parseInt(stored.split(":")[1], 10) - 1;
    return AVATARS[idx] ?? null;
  }
  return stored;
};

const avatarToStored = (src: string | null): string | null => {
  if (!src) return null;
  const idx = AVATARS.indexOf(src);
  if (idx >= 0) return `cartoon:${idx + 1}`;
  return src;
};

const getInitials = (name: string, email: string) => {
  const source = (name || "").trim() || (email || "").split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const InitialsAvatar = ({
  name,
  email,
  className = "",
}: {
  name: string;
  email: string;
  className?: string;
}) => (
  <div
    className={`flex items-center justify-center w-full h-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold select-none ${className}`}
    aria-label="User initials"
  >
    {getInitials(name, email)}
  </div>
);

const GeneralTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Profile State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(() => {
    if (typeof window === "undefined") return "Director";
    return window.localStorage.getItem("bis-sih_display_name") || "Director";
  });

  useEffect(() => {
    localStorage.setItem("bis-sih_display_name", displayName);
  }, [displayName]);

  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    role: string;
    specialization: string;
    experience: string;
    country: string;
    avatarImg: string | null;
  }>({
    name: "Director A",
    email: "director@sentarc.labs",
    role: "Doctor",
    specialization: "Cardiology",
    experience: "15+",
    country: "India",
    avatarImg: avatar1,
  });

  // Load profile from Supabase when signed in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, specialty, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Failed to load profile", error);
        return;
      }
      setProfile((p) => ({
        ...p,
        name: data?.display_name || p.name,
        email: user.email || p.email,
        specialization: data?.specialty || p.specialization,
        avatarImg: data?.avatar_url !== undefined
          ? (data.avatar_url === null ? null : resolveAvatar(data.avatar_url))
          : p.avatarImg,
      }));
      if (data?.display_name) setDisplayName(data.display_name);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Toggles State
  const [newGuidanceAlerts, setNewGuidanceAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === "undefined") return "dark";
    return (window.localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'dark';
  });
  const [logoStyle, setLogoStyleState] = useState<LogoStyle>(getLogoStyle);

  // Apply persisted theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (saved) {
      const root = document.documentElement;
      const body = document.body;
      root.classList.remove("dark", "light");
      body.classList.remove("dark", "light");
      if (saved === "dark") {
        root.classList.add("dark");
        body.classList.add("dark");
      } else if (saved === "system") {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
          body.classList.add("dark");
        }
      }
    }
  }, []);

  const handleAvatarUpload = async (file: File) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to upload a custom avatar.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Pick an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Too large", description: "Avatar must be under 2 MB.", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (upErr) {
      setAvatarUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setProfile((p) => ({ ...p, avatarImg: pub.publicUrl }));
    setAvatarUploading(false);
    toast({ title: "Avatar uploaded", description: "Don't forget to save your profile." });
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.name,
          specialty: profile.specialization,
          avatar_url: avatarToStored(profile.avatarImg),
        })
        .eq("id", user.id);
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        return;
      }
    }
    setIsProfileOpen(false);
    toast({
      title: "Profile Updated",
      description: user ? "Your details have been saved to your account." : "Saved locally. Sign in to sync.",
    });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    const root = window.document.documentElement;
    const body = window.document.body;

    root.classList.remove("dark", "light");
    body.classList.remove("dark", "light");

    if (newTheme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      if (systemTheme === "dark") {
        root.classList.add("dark");
        body.classList.add("dark");
      }
    }

    let themeName = 'System Default';
    if (newTheme === 'dark') themeName = 'Dark Mode';
    if (newTheme === 'light') themeName = 'Light Mode';

    toast({ title: "Appearance Updated", description: `Theme has been set to ${themeName}.` });
  };

  const handleLogoStyleChange = (newStyle: LogoStyle) => {
    setLogoStyleState(newStyle);
    setLogoStyle(newStyle);
    toast({
      title: "Font Updated",
      description: newStyle === "classic" ? "Switched to Classic font." : "Switched to Modern font.",
    });
  };

  return (
    <div className="space-y-0">
      {/* ── Profile ── */}
      <section>
        <h2 className="settings-section-header">Profile</h2>

        {/* Claude-style inline profile fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {/* Full name */}
          <div className="space-y-2">
            <Label className="text-base text-muted-foreground">Full name</Label>
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border border-border/30 rounded-md focus-within:ring-1 focus-within:ring-ring transition-all">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0 text-xs">
                {profile.avatarImg ? (
                  <img src={profile.avatarImg} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <InitialsAvatar name={profile.name} email={profile.email} />
                )}
              </div>
              <input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-transparent border-none focus:outline-none flex-1 text-base text-foreground h-8"
              />
            </div>
          </div>

          {/* What should BIS-SIH call you? */}
          <div className="space-y-2">
            <Label className="text-base text-muted-foreground">
              What should BIS-SIH call you? <span className="text-destructive">*</span>
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Director"
              className="bg-muted/40 border-border/30 h-12 text-base"
              onBlur={() => {
                if (displayName.trim()) {
                  toast({ title: "Display name saved", description: `BIS-SIH will call you "${displayName}".` });
                }
              }}
            />
          </div>
        </div>

        {/* Tags + Edit profile */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20">
            <Stethoscope className="w-4 h-4" />
            {profile.role}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground">
            {profile.specialization}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-high border border-border/40 text-foreground">
            {profile.country}
          </span>
        </div>

        <div className="mt-4">
          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs px-3">
                Edit Profile
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Profile Context</DialogTitle>
                  <DialogDescription>
                    Update your professional details to help BIS-SIH tailor clinical guidelines and ranking algorithms for your specialty.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleProfileSave} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Avatar Picker */}
                    <div className="space-y-3 col-span-2 pb-4 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <Label>Choose Your Avatar</Label>
                        {profile.avatarImg && (
                          <button
                            type="button"
                            onClick={() => setProfile({ ...profile, avatarImg: null })}
                            className="text-xs font-medium text-destructive hover:underline"
                          >
                            Remove avatar
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pick a cartoon avatar, upload your own, or use your initials.
                      </p>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAvatarUpload(f);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarUploading || !user}
                        >
                          {avatarUploading ? (
                            <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Uploading…</>
                          ) : (
                            <><Upload className="w-3 h-3 mr-1.5" /> Upload custom</>
                          )}
                        </Button>
                        {!user && (
                          <span className="ml-2 text-[11px] text-muted-foreground">Sign in to upload</span>
                        )}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {/* Initials / no-avatar option */}
                        <button
                          type="button"
                          onClick={() => setProfile({ ...profile, avatarImg: null })}
                          className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 border-2 text-sm ${
                            profile.avatarImg === null
                              ? "border-primary ring-2 ring-primary/30 scale-105 shadow-md"
                              : "border-border/50 opacity-70 hover:opacity-100 hover:border-primary/40 hover:scale-105"
                          }`}
                          aria-label="Use initials instead of avatar"
                        >
                          <InitialsAvatar name={profile.name} email={profile.email} />
                          {profile.avatarImg === null && (
                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                        {AVATARS.map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setProfile({ ...profile, avatarImg: src })}
                            className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 border-2 ${
                              profile.avatarImg === src
                                ? "border-primary ring-2 ring-primary/30 scale-105 shadow-md"
                                : "border-border/50 opacity-70 hover:opacity-100 hover:border-primary/40 hover:scale-105"
                            }`}
                          >
                            <img src={src} alt="Avatar option" className="w-full h-full object-cover" />
                            {profile.avatarImg === src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="email">Email Address <span className="text-muted-foreground font-normal">(Login)</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-muted text-muted-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Primary Role</Label>
                      <Select
                        value={profile.role}
                        onValueChange={(val) => setProfile({...profile, role: val})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Doctor">Doctor</SelectItem>
                          <SelectItem value="Medical Student">Medical Student</SelectItem>
                          <SelectItem value="Researcher">Researcher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Specialization</Label>
                      <Input
                        placeholder="e.g. Cardiology"
                        value={profile.specialization}
                        onChange={(e) => setProfile({...profile, specialization: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Region / Country</Label>
                      <Select
                        value={profile.country}
                        onValueChange={(val) => setProfile({...profile, country: val})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select diagnostic region" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">US (CDC / NIH)</SelectItem>
                          <SelectItem value="India">India (ICMR)</SelectItem>
                          <SelectItem value="UK">UK (NICE)</SelectItem>
                          <SelectItem value="Global">Global / Default</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Years Exper. <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Select
                        value={profile.experience}
                        onValueChange={(val) => setProfile({...profile, experience: val})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="0-5">0-5 years</SelectItem>
                          <SelectItem value="5-15">5-15 years</SelectItem>
                          <SelectItem value="15+">15+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter className="mt-6">
                    <Button type="button" variant="ghost" onClick={() => setIsProfileOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
      </section>

      {/* ── Appearance ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Appearance</h2>

        {/* Color mode */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">Color mode</Label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {([
              { value: 'light' as const, label: 'Light', icon: Sun, iconColor: 'text-amber-500' },
              { value: 'system' as const, label: 'Auto', icon: Monitor, iconColor: 'text-muted-foreground' },
              { value: 'dark' as const, label: 'Dark', icon: Moon, iconColor: 'text-indigo-400' },
            ]).map(({ value, label, icon: Icon, iconColor }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  theme === value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                {/* Mini preview */}
                <div className={`w-full h-12 rounded-lg border border-border/30 overflow-hidden ${
                  value === 'dark' ? 'bg-[#1a1c1e]' : value === 'light' ? 'bg-[#fbf9f2]' : 'bg-gradient-to-r from-[#fbf9f2] to-[#1a1c1e]'
                }`}>
                  <div className="p-1.5 space-y-1">
                    <div className={`h-1 w-8 rounded-full ${value === 'dark' ? 'bg-white/20' : value === 'light' ? 'bg-black/15' : 'bg-white/20'}`} />
                    <div className={`h-1 w-6 rounded-full ${value === 'dark' ? 'bg-white/10' : value === 'light' ? 'bg-black/10' : 'bg-white/10'}`} />
                    <div className={`h-1 w-10 rounded-full ${value === 'dark' ? 'bg-white/10' : value === 'light' ? 'bg-black/10' : 'bg-white/10'}`} />
                  </div>
                </div>
                <span className={`text-xs font-medium ${theme === value ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                {theme === value && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Chat font</Label>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {([
              { value: 'classic' as const, label: 'Classic' },
              { value: 'modern' as const, label: 'Modern' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleLogoStyleChange(value)}
                className={`relative flex items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                  logoStyle === value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <span className={`text-lg font-medium ${value === 'classic' ? 'font-heading' : 'font-body'} text-foreground`}>Aa</span>
                {logoStyle === value && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-3 max-w-xs mt-1">
            <span className={`text-xs flex-1 text-center ${logoStyle === 'classic' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Classic</span>
            <span className={`text-xs flex-1 text-center ${logoStyle === 'modern' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>Modern</span>
          </div>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="settings-section-divider">
        <h2 className="settings-section-header">Notifications</h2>

        <div className="space-y-1">
          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Response completions</p>
              <p className="text-xs text-muted-foreground">Get notified when BIS-SIH has finished a response. Most useful for long running tasks.</p>
            </div>
            <Switch
              checked={newGuidanceAlerts}
              onCheckedChange={(checked) => {
                setNewGuidanceAlerts(checked);
                toast({ title: "Preferences Updated", description: "Guidance alerts preference saved." });
              }}
            />
          </div>

          <div className="settings-row">
            <div>
              <p className="text-sm font-medium text-foreground">Weekly Digest</p>
              <p className="text-xs text-muted-foreground">Get a summary of your queries and new guideline updates.</p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={(checked) => {
                setWeeklyDigest(checked);
                toast({ title: "Preferences Updated", description: "Weekly digest preference saved." });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default GeneralTab;
