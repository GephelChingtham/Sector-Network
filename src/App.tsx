import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowRight, Upload, Smartphone, Instagram, 
  ChevronRight, CheckCircle2, Check, Sparkles, Eye, EyeOff, Crown, Users, Award,
  Lock, Unlock, ShieldCheck, LogIn, LogOut, RefreshCw, Layers, TrendingUp,
  Settings, Trash2, Search, ShieldAlert, Key, Ban, UserCheck
} from 'lucide-react';
import BackgroundGrid from './components/BackgroundGrid';
import Iridescence from './components/Iridescence';
import LiquidChrome from './components/LiquidChrome';
import { 
  ApplicationForm, Profile, Tier, TIERS 
} from './types';
import Directory from './components/Directory';

const BLOCKED_WORDS = [
  // Direct Slurs & Hate Speech
  "nigga", "nigger", "chink", "paki", "faggot", "fag", "tranny", "retard", "tard",
  // Explicit / NSFW Terms
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "horny", "porn", "slut", "whore",
  // System & Admin Spoofing
  "admin", "administrator", "moderator", "mod", "staff", "founder", "owner", "host", "sector", "network", "verified", "official", "gephel", "nedupla", "jigme", "jiji", "geph", "ndl"
];

const checkBlockedWord = (name: string): string | null => {
  const lower = name.toLowerCase().trim();
  // Remove special characters, numbers, and spaces to catch hidden/spaced versions
  const normalized = lower.replace(/[^a-z]/g, '');

  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word) || normalized.includes(word)) {
      return word;
    }
  }
  return null;
};

const FREE_USERS = ['cgphl', 'juino.57', 'jiji.gtk', 'nedupla._.a'];

export const TIER_LIMITS: Record<string, number> = {
  tier100: 110,
  tier200: 80,
  tier300: 40,
  tier400: 16,
};

export const isFreeUser = (handle: string): boolean => {
  if (!handle) return false;
  const normalized = handle.trim().toLowerCase().replace(/^@/, '');
  return FREE_USERS.includes(normalized);
};

export const checkRegistrationLimit = (
  school: 'TNA' | 'GD Goenka',
  instagram: string,
  tierId: string,
  profiles: Profile[]
): string | null => {
  const isFree = isFreeUser(instagram);
  
  if (isFree) {
    const freeCount = profiles.filter(p => p.school === school && isFreeUser(p.instagram)).length;
    if (freeCount >= 2) {
      return `REGISTRATION BLOCKED: ${school} already has its split of 2 free founders registered (Total 4 split evenly).`;
    }
  } else {
    // Paid limits per school
    const paidTierCount = profiles.filter(p => p.school === school && p.tierId === tierId && !isFreeUser(p.instagram)).length;
    const tierLimit = tierId === 'tier100' ? 55 : tierId === 'tier200' ? 40 : tierId === 'tier300' ? 20 : 8;
    const tierName = tierId === 'tier100' ? 'Tier 1' : tierId === 'tier200' ? 'Tier 2' : tierId === 'tier300' ? 'Tier 3' : 'Tier 4';
    
    if (paidTierCount >= tierLimit) {
      return `REGISTRATION BLOCKED: ${school} registrations for ${tierName} are full (${paidTierCount}/${tierLimit} slots claimed).`;
    }
    
    const totalPaidCount = profiles.filter(p => p.school === school && !isFreeUser(p.instagram)).length;
    if (totalPaidCount >= 123) {
      return `REGISTRATION BLOCKED: ${school} paid registrations are full (123/123 slots claimed).`;
    }
  }
  
  return null;
};

export default function App() {
  const [selectedTierId, setSelectedTierId] = useState<'tier100' | 'tier200' | 'tier300' | 'tier400'>('tier100');
  const [step, setStep] = useState<'select' | 'apply' | 'pay' | 'confirm'>('select');
  const [formData, setFormData] = useState<ApplicationForm>({
    instagram: '',
    codmName: '',
    securityPin: '',
    school: ''
  });
  
  // Registered profiles loaded from local storage
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Logged-in profile state
  const [loggedInProfile, setLoggedInProfile] = useState<Profile | null>(null);

  // Profile detailed view popup state
  const [selectedProfileView, setSelectedProfileView] = useState<Profile | null>(null);
  // Track lowercase instagram handles of profiles viewed in the current session to prevent abuse/spam
  const [sessionViewedList, setSessionViewedList] = useState<string[]>([]);
  
  // Login input states
  const [loginInstagram, setLoginInstagram] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Lockout states: map of lowecased instagram handle to { attempts: number, lockUntil: string | null }
  const [lockouts, setLockouts] = useState<Record<string, { attempts: number, lockUntil: string | null }>>({});

  // Admin section states
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminAttempts, setAdminAttempts] = useState(0);
  const [adminLockUntil, setAdminLockUntil] = useState<string | null>(null);
  const [adminProfileToDelete, setAdminProfileToDelete] = useState<Profile | null>(null);
  const [adminSchoolFilter, setAdminSchoolFilter] = useState<'ALL' | 'TNA' | 'GD Goenka'>('ALL');
  const [adminTierFilter, setAdminTierFilter] = useState<'ALL' | 'tier100' | 'tier200' | 'tier300' | 'tier400'>('ALL');
  const [adminRoleFilter, setAdminRoleFilter] = useState<'ALL' | 'admin' | 'user'>('ALL');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'ALL' | 'active' | 'banned'>('ALL');
  const [adminSortBy, setAdminSortBy] = useState<'NAME' | 'TIER' | 'REVENUE' | 'DATE'>('DATE');
  const [adminSortOrder, setAdminSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(50);
  const [adminSelectedProfileForDetail, setAdminSelectedProfileForDetail] = useState<Profile | null>(null);

  // Sync details view when profiles update
  useEffect(() => {
    if (adminSelectedProfileForDetail) {
      const updated = profiles.find(p => p.instagram.toLowerCase() === adminSelectedProfileForDetail.instagram.toLowerCase());
      if (updated) {
        setAdminSelectedProfileForDetail(updated);
      }
    }
  }, [profiles]);
  
  // Personal sub-revenue dashboards states
  const [selectedFounder, setSelectedFounder] = useState<'jiji' | 'nedupla' | 'anandita' | 'gephs' | null>(null);
  const [founderPasscodeInput, setFounderPasscodeInput] = useState('');
  const [founderPasscodeError, setFounderPasscodeError] = useState('');
  const [unlockedFounders, setUnlockedFounders] = useState<Record<'jiji' | 'nedupla' | 'anandita' | 'gephs', boolean>>({
    jiji: false,
    nedupla: false,
    anandita: false,
    gephs: false
  });

  useEffect(() => {
    if (adminUsername && ['jiji', 'nedupla', 'anandita', 'gephs'].includes(adminUsername)) {
      setUnlockedFounders(prev => ({
        ...prev,
        [adminUsername]: true
      }));
    }
  }, [adminUsername]);

  useEffect(() => {
    if (step === 'confirm') {
      // Primary burst
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#00F0FF', '#33F3FF', '#ffffff', '#0099ff', '#8B8695']
      });

      // Side cannons
      const end = Date.now() + 2 * 1000;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          return clearInterval(interval);
        }
        confetti({
          particleCount: 30,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#00F0FF', '#ffffff', '#0099ff']
        });
        confetti({
          particleCount: 30,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#00F0FF', '#ffffff', '#0099ff']
        });
      }, 350);

      return () => clearInterval(interval);
    }
  }, [step]);

  const [isSelfDeleteOpen, setIsSelfDeleteOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showUserPin, setShowUserPin] = useState(false);
  const [showRegPin, setShowRegPin] = useState(false);
  const [showFounderPasscode, setShowFounderPasscode] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDirectory = (tokenToUse?: string) => {
    const token = tokenToUse || localStorage.getItem('sector_token');
    if (!token) {
      setProfiles([]);
      return;
    }
    fetch('/api/profiles/directory', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      } else {
        setProfiles([]);
      }
    })
    .catch(() => setProfiles([]));
  };

  const fetchAdminProfiles = (tokenToUse?: string) => {
    const token = tokenToUse || localStorage.getItem('sector_admin_token') || localStorage.getItem('sector_token');
    if (!token) return;
    fetch('/api/admin/profiles', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    })
    .catch(console.error);
  };

  // Initialize profiles and sessions from server API
  useEffect(() => {
    const userToken = localStorage.getItem('sector_token');
    const adminToken = localStorage.getItem('sector_admin_token');

    if (adminToken) {
      const storedAdminUsername = localStorage.getItem('sector_admin_username') || 'admin';
      setAdminUsername(storedAdminUsername);
      fetch('/api/admin/profiles', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setProfiles(data);
          setIsAdminAuthenticated(true);
        } else {
          localStorage.removeItem('sector_admin_token');
          localStorage.removeItem('sector_admin_username');
        }
      })
      .catch(() => {
        localStorage.removeItem('sector_admin_token');
        localStorage.removeItem('sector_admin_username');
      });
    } else if (userToken) {
      fetch('/api/profiles/me', {
        headers: { 'Authorization': `Bearer ${userToken}` }
      })
      .then(async res => {
        if (res.ok) {
          const profileData = await res.json();
          setLoggedInProfile(profileData);
          if (profileData.role === 'admin') {
            setIsAdminAuthenticated(true);
            setAdminUsername(profileData.codmName);
            fetchAdminProfiles(userToken);
          } else {
            fetchDirectory(userToken);
          }
        } else {
          localStorage.removeItem('sector_token');
        }
      })
      .catch(() => {
        localStorage.removeItem('sector_token');
      });
    } else {
      setProfiles([]);
    }
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setAdminPage(1);
  }, [adminSearch, adminSchoolFilter, adminTierFilter, adminRoleFilter, adminStatusFilter, adminSortBy, adminSortOrder]);

  // Auto-correct selectedTierId if the current one gets full or is already full
  useEffect(() => {
    if (profiles.length === 0) return;
    const limit = TIER_LIMITS[selectedTierId];
    const count = profiles.filter(p => p.tierId === selectedTierId).length;
    if (count >= limit) {
      const available = TIERS.find(t => {
        const tLimit = TIER_LIMITS[t.id];
        const tCount = profiles.filter(p => p.tierId === t.id).length;
        return tCount < tLimit;
      });
      if (available) {
        setSelectedTierId(available.id);
      }
    }
  }, [profiles, selectedTierId]);

  const selectedTier = TIERS.find(t => t.id === selectedTierId) || TIERS[0];

  const upiId = "chingtham@okhdfcbank";

  const getGPayUrl = () => {
    const params = `pa=${upiId}&pn=SECTOR%20NETWORK&am=${selectedTier.price}&cu=INR&tn=SCTR%20Entry%20-${encodeURIComponent(formData.instagram)}`;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    if (ua.includes('android')) {
      return `intent://pay?${params}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return `gpay://upi/pay?${params}`;
    } else {
      return `upi://pay?${params}`;
    }
  };

  const currentTimestamp = new Date().toISOString().substring(0, 10);

  const handleRedirectAndDirectLogin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const blocked = checkBlockedWord(formData.codmName);
    if (blocked) {
      alert(`The nickname "${formData.codmName}" contains a disallowed word/phrase ("${blocked}"). Please choose another nickname.`);
      return;
    }
    if (!/^\d{4}$/.test(formData.securityPin)) {
      alert('Security PIN must be exactly 4 numeric digits (0-9).');
      return;
    }
    if (!formData.school) {
      alert('Please select your school (TNA or GD Goenka) to continue.');
      return;
    }
    const formattedInsta = formData.instagram.startsWith('@') ? formData.instagram : `@${formData.instagram}`;

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instagram: formattedInsta,
        codmName: formData.codmName,
        securityPin: formData.securityPin,
        school: formData.school,
        tierId: selectedTierId
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Registration failed.');
        return;
      }
      localStorage.setItem('sector_token', data.token);
      setLoggedInProfile(data.profile);
      fetchDirectory(data.token);
      
      // Open GPay/UPI redirect link
      window.location.href = getGPayUrl();
      setStep('confirm');
    })
    .catch(() => {
      alert('Network error connecting to verification servers.');
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = TIER_LIMITS[selectedTierId];
    const count = getTierUserCount(selectedTierId);
    if (count >= limit) {
      alert(`REGISTRATION BLOCKED: ${selectedTier.name} registrations are full (${count}/${limit} slots claimed). Please select another tier.`);
      return;
    }
    setStep('apply');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const blocked = checkBlockedWord(formData.codmName);
    if (blocked) {
      alert(`The nickname "${formData.codmName}" contains a disallowed word/phrase ("${blocked}"). Please choose another nickname.`);
      return;
    }
    if (!/^\d{4}$/.test(formData.securityPin)) {
      alert('Security PIN must be exactly 4 numeric digits (0-9).');
      return;
    }
    if (!formData.school) {
      alert('Please select your school (TNA or GD Goenka) to continue.');
      return;
    }

    const formattedInsta = formData.instagram.startsWith('@') ? formData.instagram : `@${formData.instagram}`;
    const isExisting = profiles.some(p => p.instagram.toLowerCase() === formattedInsta.toLowerCase());
    if (isExisting) {
      alert(`REGISTRATION BLOCKED: The Instagram handle "${formattedInsta}" is already registered. Upgrades or re-registrations are not permitted (No upgrades after one entry). Please use the Access Hub Console to log in to your existing account.`);
      return;
    }
    const isNameTaken = profiles.some(p => p.codmName.trim().toLowerCase() === formData.codmName.trim().toLowerCase());
    if (isNameTaken) {
      alert(`REGISTRATION BLOCKED: The nickname/username "${formData.codmName}" is already taken by another registered member. Please choose a unique username.`);
      return;
    }
    if (profiles.length >= 250) {
      alert('REGISTRATION BLOCKED: SECTOR Network registrations are full (250/250 slots claimed). No new profiles can be added.');
      return;
    }

    const limitError = checkRegistrationLimit(formData.school as 'TNA' | 'GD Goenka', formData.instagram, selectedTierId, profiles);
    if (limitError) {
      alert(limitError);
      return;
    }

    if (isFreeUser(formData.instagram)) {
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram: formattedInsta,
          codmName: formData.codmName,
          securityPin: formData.securityPin,
          school: formData.school,
          tierId: selectedTierId
        })
      })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Registration failed.');
          return;
        }
        localStorage.setItem('sector_token', data.token);
        setLoggedInProfile(data.profile);
        if (data.profile.role === 'admin') {
          setIsAdminAuthenticated(true);
          setAdminUsername(data.profile.codmName);
          fetchAdminProfiles(data.token);
        } else {
          fetchDirectory(data.token);
        }
        resetForm();
        setStep('select');
        
        // Trigger celebratory confetti burst immediately for the free founder/user
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.65 },
          colors: ['#00F0FF', '#33F3FF', '#ffffff', '#0099ff', '#8B8695']
        });

        // Staggered side cannon bursts
        const end = Date.now() + 1.5 * 1000;
        const interval = setInterval(() => {
          if (Date.now() > end) {
            return clearInterval(interval);
          }
          confetti({
            particleCount: 30,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: ['#00F0FF', '#ffffff', '#0099ff']
          });
          confetti({
            particleCount: 30,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: ['#00F0FF', '#ffffff', '#0099ff']
          });
        }, 350);

        // Smooth scroll to directory section showing the user list
        setTimeout(() => {
          const el = document.getElementById('directory-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 400);
      })
      .catch(() => {
        alert('Network error connecting to verification servers.');
      });
      return;
    }

    setStep('pay');
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Invalid file format. Please upload an image screenshot.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setScreenshot(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaymentConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot && !utrNumber) {
      alert("Please upload a payment screenshot or supply the 12-digit transaction UTR number.");
      return;
    }
    if (!/^\d{4}$/.test(formData.securityPin)) {
      alert('Security PIN must be exactly 4 numeric digits (0-9).');
      return;
    }
    if (!formData.school) {
      alert('Please select your school (TNA or GD Goenka) to continue.');
      return;
    }

    const formattedInsta = formData.instagram.startsWith('@') ? formData.instagram : `@${formData.instagram}`;

    // POST registration payload to server-side endpoint
    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instagram: formattedInsta,
        codmName: formData.codmName,
        securityPin: formData.securityPin,
        school: formData.school,
        tierId: selectedTierId,
        utrNumber: utrNumber ? utrNumber.trim() : undefined,
        screenshot: screenshot || undefined
      })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Registration failed.');
        return;
      }
      // On success, save the generated session token and log in
      localStorage.setItem('sector_token', data.token);
      setLoggedInProfile(data.profile);
      fetchDirectory(data.token);
      setStep('confirm');
    })
    .catch(() => {
      alert('Network error connecting to verification servers.');
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginInstagram || !loginPin) {
      setLoginError('Both Instagram handle and Security PIN are required.');
      return;
    }
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instagram: loginInstagram, pin: loginPin })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed.');
        return;
      }
      localStorage.setItem('sector_token', data.token);
      setLoggedInProfile(data.profile);
      setLoginInstagram('');
      setLoginPin('');
      setIsLoginOpen(false);
      if (data.profile.role === 'admin') {
        setIsAdminAuthenticated(true);
        setAdminUsername(data.profile.codmName);
        fetchAdminProfiles(data.token);
      } else {
        fetchDirectory(data.token);
      }
    })
    .catch(() => {
      setLoginError('Server connectivity issue. Please try again.');
    });
  };

  const handleViewProfile = (targetProfile: Profile) => {
    setSelectedProfileView(targetProfile);
    
    if (loggedInProfile && loggedInProfile.instagram.toLowerCase() !== targetProfile.instagram.toLowerCase()) {
      const targetHandleLower = targetProfile.instagram.toLowerCase();
      
      if (!sessionViewedList.includes(targetHandleLower)) {
        setSessionViewedList(prev => [...prev, targetHandleLower]);
        
        fetch('/api/profiles/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sector_token') || localStorage.getItem('sector_admin_token')}`
          },
          body: JSON.stringify({ targetInstagram: targetProfile.instagram })
        })
        .then(async res => {
          if (res.ok) {
            const updatedTarget = await res.json();
            setProfiles(prev => prev.map(p => p.instagram.toLowerCase() === targetHandleLower ? { ...p, profileViews: updatedTarget.profileViews } : p));
            setSelectedProfileView(prev => prev && prev.instagram.toLowerCase() === targetHandleLower ? { ...prev, profileViews: updatedTarget.profileViews } : prev);
          }
        });
      }
    }
  };

  const generatedTemplateText = `SECTOR NETWORK APPLICATION
Player: ${formData.codmName}
Instagram: ${formData.instagram}
Selected Tier: ${selectedTier.name} (${isFreeUser(formData.instagram) ? 'FREE ACCESS' : `₹${selectedTier.price}`})
Perk Option: ${selectedTier.featureTitle}
Security PIN: [Saved Securely]
Transaction reference: ${isFreeUser(formData.instagram) ? 'FREE PROMOTIONAL PASS' : (utrNumber || 'Screenshot attached')}`;

  const resetForm = () => {
    setStep('select');
    setFormData({ instagram: '', codmName: '', securityPin: '', school: '' });
    setScreenshot(null);
    setUtrNumber('');
  };

  const handleLogout = () => {
    const userToken = localStorage.getItem('sector_token');
    const adminToken = localStorage.getItem('sector_admin_token');

    if (adminToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      .finally(() => {
        localStorage.removeItem('sector_admin_token');
        localStorage.removeItem('sector_admin_username');
        setIsAdminAuthenticated(false);
        setAdminUsername('');
        setProfiles([]);
        resetForm();
      });
    } else if (userToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userToken}` }
      })
      .finally(() => {
        localStorage.removeItem('sector_token');
        setLoggedInProfile(null);
        setProfiles([]);
        resetForm();
      });
    } else {
      setLoggedInProfile(null);
      setIsAdminAuthenticated(false);
      setProfiles([]);
      resetForm();
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if currently locked out
    const now = Date.now();
    if (adminLockUntil) {
      const lockTime = new Date(adminLockUntil).getTime();
      if (lockTime > now) {
        const remainingMins = Math.ceil((lockTime - now) / 60000);
        setAdminError(`ADMIN PANEL LOCKED. TOO MANY ATTEMPTS. RETRY IN ${remainingMins} MINUTE(S).`);
        return;
      } else {
        setAdminLockUntil(null);
      }
    }

    setAdminError('');
    if (!adminPasscode) {
      setAdminError('Secure passcode is required.');
      return;
    }

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPasscode })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || 'Authentication failed.');
        if (res.status === 423) {
          // Locked out! Lock until 15 minutes from now
          setAdminLockUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
          setAdminAttempts(3);
        } else {
          setAdminAttempts(prev => {
            const next = prev + 1;
            if (next >= 3) {
              setAdminLockUntil(new Date(Date.now() + 15 * 60 * 1000).toISOString());
              return 3;
            }
            return next;
          });
        }
        return;
      }
      localStorage.setItem('sector_admin_token', data.token);
      localStorage.setItem('sector_admin_username', data.username);
      setAdminUsername(data.username);
      setIsAdminAuthenticated(true);
      setAdminPasscode('');
      setAdminError('');
      setAdminAttempts(0);
      setAdminLockUntil(null);
      fetchAdminProfiles(data.token);
    })
    .catch(() => {
      setAdminError('Server connectivity issue. Please try again.');
    });
  };

  const executeAdminAction = (action: string, targetInstagram?: string) => {
    const token = localStorage.getItem('sector_admin_token');
    if (!token) {
      alert("Session expired. Please log in again.");
      setIsAdminAuthenticated(false);
      return;
    }

    fetch('/api/admin/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, targetInstagram })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Action failed.');
        return;
      }
      fetchAdminProfiles(token);
      if (targetInstagram && loggedInProfile && loggedInProfile.instagram.toLowerCase() === targetInstagram.toLowerCase()) {
        if (action === 'delete') {
          setLoggedInProfile(null);
        } else {
          fetch('/api/profiles/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('sector_token')}` }
          })
          .then(async pRes => {
            if (pRes.ok) {
              const pData = await pRes.json();
              setLoggedInProfile(pData);
            } else {
              setLoggedInProfile(null);
            }
          });
        }
      }
    })
    .catch(() => alert('Network error executing admin action.'));
  };

  const handleAdminDeleteProfile = (instagram: string) => {
    const matched = profiles.find(p => p.instagram.toLowerCase() === instagram.toLowerCase());
    if (matched) {
      setAdminProfileToDelete(matched);
    }
  };

  const handleAdminConfirmDelete = () => {
    if (!adminProfileToDelete) return;
    executeAdminAction('delete', adminProfileToDelete.instagram);
    setAdminProfileToDelete(null);
  };

  const handleAdminToggleSale = (instagram: string) => {
    executeAdminAction('toggle-sale', instagram);
  };

  const handleAdminToggleStatus = (instagram: string) => {
    executeAdminAction('toggle-status', instagram);
  };

  const handleAdminToggleRole = (instagram: string) => {
    executeAdminAction('toggle-role', instagram);
  };

  const handleAdminResetLockout = (instagram: string) => {
    executeAdminAction('reset-lockout', instagram);
  };

  const handleAdminApprovePayment = (instagram: string) => {
    executeAdminAction('approve-payment', instagram);
  };

  const handleAdminWarnUser = (instagram: string) => {
    executeAdminAction('warn-user', instagram);
  };

  const handleAdminClearWarnings = (instagram: string) => {
    executeAdminAction('clear-warnings', instagram);
  };

  const handleAdminReduceWarnings = (instagram: string) => {
    executeAdminAction('reduce-warnings', instagram);
  };

  const handleAdminResetMocks = () => {
    if (window.confirm('Reset database back to original pre-registered user list? Your current custom registrations will be overwritten.')) {
      executeAdminAction('reset-mocks');
    }
  };

  const handleAdminClearAll = () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL registered profiles? This will completely empty the directory.')) {
      executeAdminAction('clear-all');
    }
  };

  const handleDeleteOwnProfile = () => {
    if (!loggedInProfile) return;
    setIsSelfDeleteOpen(true);
  };

  const handleSelfConfirmDelete = () => {
    if (!loggedInProfile) return;
    const pin = prompt("Please enter your 4-digit Security PIN to confirm deletion:");
    if (!pin) return;

    fetch('/api/profiles/self-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sector_token')}`
      },
      body: JSON.stringify({ pin })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete profile.');
        return;
      }
      alert('Your profile has been successfully deleted.');
      setLoggedInProfile(null);
      localStorage.removeItem('sector_token');
      setProfiles([]);
      setIsSelfDeleteOpen(false);
    })
    .catch(() => alert('Server connection issue.'));
  };

  const calculateNetProfit = () => {
    return profiles.reduce((sum, p) => {
      if (isFreeUser(p.instagram)) return sum;
      if (p.saleRemoved) return sum;
      const tier = TIERS.find(t => t.id === p.tierId);
      return sum + (tier?.price || 0);
    }, 0);
  };

  const getTierUserCount = (tierId: string) => {
    return profiles.filter(p => p.tierId === tierId).length;
  };

  const getTierRevenue = (tierId: string) => {
    const tier = TIERS.find(t => t.id === tierId);
    return profiles
      .filter(p => p.tierId === tierId)
      .reduce((sum, p) => {
        if (isFreeUser(p.instagram)) return sum;
        if (p.saleRemoved) return sum;
        return sum + (tier?.price || 0);
      }, 0);
  };

  const calculateShare = (name: 'jiji' | 'nedupla' | 'anandita' | 'gephs') => {
    return profiles.reduce((sum, p) => {
      if (isFreeUser(p.instagram)) return sum;
      if (p.saleRemoved) return sum;
      
      if (p.tierId === 'tier400') {
        if (name === 'jiji') return sum + 120;
        if (name === 'nedupla') return sum + 50;
        if (name === 'anandita') return sum + 50;
        if (name === 'gephs') return sum + 179;
      } else if (p.tierId === 'tier300') {
        if (name === 'jiji') return sum + 90;
        if (name === 'nedupla') return sum + 37;
        if (name === 'anandita') return sum + 37;
        if (name === 'gephs') return sum + 135;
      } else if (p.tierId === 'tier200') {
        if (name === 'jiji') return sum + 60;
        if (name === 'nedupla') return sum + 25;
        if (name === 'anandita') return sum + 25;
        if (name === 'gephs') return sum + 89;
      } else if (p.tierId === 'tier100') {
        if (name === 'jiji') return sum + 30;
        if (name === 'nedupla') return sum + 12;
        if (name === 'anandita') return sum + 12;
        if (name === 'gephs') return sum + 45;
      }
      return sum;
    }, 0);
  };

  const handleUnlockFounder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFounder) return;
    fetch('/api/auth/unlock-founder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founder: selectedFounder, passcode: founderPasscodeInput })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        setFounderPasscodeError(data.error || 'ACCESS DENIED: INVALID DECRYPTION PASSCODE.');
        return;
      }
      setUnlockedFounders(prev => ({ ...prev, [selectedFounder]: true }));
      setFounderPasscodeInput('');
      setFounderPasscodeError('');
    })
    .catch(() => {
      setFounderPasscodeError('Server connection error.');
    });
  };

  const getTierIcon = (id: string) => {
    switch (id) {
      case 'tier100': return <Users className="w-4 h-4 text-text-muted" />;
      case 'tier200': return <Sparkles className="w-4 h-4 text-accent" />;
      case 'tier300': return <Eye className="w-4 h-4 text-accent" />;
      case 'tier400': return <Crown className="w-4 h-4 text-crown-gradient-end" />;
      default: return <Award className="w-4 h-4 text-text-primary" />;
    }
  };

  // Helper to format verified visual nicknames in the directory list
  const formatDirectoryNickname = (profile: Profile) => {
    switch (profile.tierId) {
      case 'tier400':
        return (
          <span className="flex items-center gap-1.5 font-sans font-bold text-text-primary text-sm">
            <span className="text-crown-gradient-end">👑</span>
            <span className="text-status">🔴</span>
            <span>{profile.codmName}</span>
          </span>
        );
      case 'tier300':
      case 'tier200':
        return (
          <span className="flex items-center gap-1.5 font-sans font-bold text-text-primary text-sm">
            <span className="text-status">🔴</span>
            <span>{profile.codmName}</span>
          </span>
        );
      default:
        return (
          <span className="font-sans text-text-muted text-sm">
            {profile.codmName}
          </span>
        );
    }
  };

  // Computed filtered and sorted profiles for Admin Dashboard
  const adminProfiles = profiles
    .filter(p => {
      const searchTerms = adminSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => {
        const matchesCodm = p.codmName.toLowerCase().includes(term);
        const matchesInsta = p.instagram.toLowerCase().includes(term);
        return matchesCodm || matchesInsta;
      });
      const matchesSchool = adminSchoolFilter === 'ALL' || p.school === adminSchoolFilter;
      const matchesTier = adminTierFilter === 'ALL' || p.tierId === adminTierFilter;
      const matchesRole = adminRoleFilter === 'ALL' || (p.role || 'user') === adminRoleFilter;
      const matchesStatus = adminStatusFilter === 'ALL' || (p.status || 'active') === adminStatusFilter;
      return matchesSearch && matchesSchool && matchesTier && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (adminSortBy === 'NAME') {
        comparison = a.codmName.localeCompare(b.codmName);
      } else if (adminSortBy === 'TIER') {
        comparison = a.tierId.localeCompare(b.tierId);
      } else if (adminSortBy === 'REVENUE') {
        const aPrice = isFreeUser(a.instagram) || a.saleRemoved ? 0 : (TIERS.find(t => t.id === a.tierId)?.price || 0);
        const bPrice = isFreeUser(b.instagram) || b.saleRemoved ? 0 : (TIERS.find(t => t.id === b.tierId)?.price || 0);
        comparison = aPrice - bPrice;
      } else {
        comparison = (a.registeredAt || '').localeCompare(b.registeredAt || '');
      }
      return adminSortOrder === 'ASC' ? comparison : -comparison;
    });

  const isTier400Active = selectedTierId === 'tier400' || (loggedInProfile && loggedInProfile.tierId === 'tier400');

  return (
    <div 
      className="relative text-text-primary min-h-screen selection:bg-accent selection:text-bg font-sans antialiased overflow-x-hidden transition-colors duration-300"
      style={{
        '--color-bg': isTier400Active ? 'var(--color-tier400-bg)' : '#0B0A0F',
        '--color-card': isTier400Active ? 'var(--color-tier400-card)' : '#14121B',
      } as React.CSSProperties}
    >
      {/* Solid Background Color Base */}
      <div 
        className="fixed inset-0 -z-50 bg-bg transition-colors duration-300 pointer-events-none"
        style={{
          backgroundColor: isTier400Active ? 'var(--color-tier400-bg)' : '#0B0A0F'
        }}
      />

      {/* Liquid Chrome Background Shader from React Bits */}
      <div className="fixed inset-0 -z-40 pointer-events-none opacity-[0.35] transition-opacity duration-1000">
        <LiquidChrome
          baseColor={isTier400Active ? [0.35, 0.25, 0.1] : [0.0, 0.12, 0.18]}
          speed={0.45}
          amplitude={0.25}
          interactive={true}
        />
      </div>

      {/* Background Grid Lines */}
      <BackgroundGrid />

      {/* Background Gradient Overlay */}
      <div 
        className="fixed inset-0 -z-30 pointer-events-none transition-all duration-1000"
        style={{
          background: isTier400Active 
            ? 'radial-gradient(circle at 50% 50%, rgba(139, 92, 26, 0.12) 0%, transparent 80%)' 
            : 'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.06) 0%, transparent 80%)'
        }}
      />

      {/* Top micro announcement bar */}
      <div className="bg-card border-b border-border text-text-muted py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-center select-none font-medium flex items-center justify-center gap-3">
        <span>SECTOR NETWORK PORTAL</span>
        <span className="w-1.5 h-1.5 bg-text-muted" />
        <span className="hidden sm:inline-block">THE MASTER TIER CHAT REGISTRATIONS ARE ACTIVE</span>
        <span className="w-1.5 h-1.5 bg-text-muted" />
        <span>LIMITED ROOM FOR NEW ENTRIES</span>
      </div>

      {/* Simplified, Brutalist Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-bg border-b border-border transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg md:text-xl font-black tracking-widest text-text-primary select-none">
              SECTOR //
            </span>
            <span className="hidden md:inline-block px-2 py-0.5 border border-border bg-card font-mono text-[9px] text-text-muted tracking-widest uppercase rounded-none">
              NETWORK
            </span>
          </div>

          {/* Central navigation links */}
          <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none max-w-[40%] sm:max-w-none shrink-0 pr-2">
            <button
              onClick={() => {
                const el = document.getElementById('registration-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="font-mono text-[10px] text-text-muted hover:text-text-primary uppercase tracking-widest cursor-pointer focus:outline-none transition-colors duration-200 shrink-0"
            >
              Permit
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('directory-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="font-mono text-[10px] text-text-muted hover:text-text-primary uppercase tracking-widest cursor-pointer focus:outline-none transition-colors duration-200 shrink-0"
            >
              Directory
            </button>
            <button
              onClick={() => {
                setIsPrivacyOpen(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-mono text-[10px] text-accent hover:text-text-primary uppercase tracking-widest cursor-pointer focus:outline-none transition-colors duration-200 shrink-0 flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3 text-accent" />
              Privacy
            </button>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            {!loggedInProfile && (
              <button
                type="button"
                onClick={() => {
                  setIsLoginOpen(true);
                  setLoginError('');
                }}
                className="inline-flex items-center gap-1.5 font-mono text-[9px] text-accent hover:text-text-primary uppercase tracking-widest border border-accent/40 px-2.5 py-1.5 bg-accent/5 hover:bg-accent/15 transition-all cursor-pointer rounded-none hover:border-accent focus:outline-none"
              >
                <LogIn className="w-3 h-3 text-accent font-bold" />
                ACCESS HUB
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsAdminOpen(true);
                setAdminError('');
              }}
              className="inline-flex items-center gap-1.5 font-mono text-[9px] text-text-muted hover:text-text-primary uppercase tracking-widest border border-border px-2.5 py-1.5 bg-card/50 transition-all cursor-pointer rounded-none hover:border-accent focus:outline-none"
            >
              <Settings className="w-3 h-3 text-text-muted font-bold" />
              ADMIN ACCESS
            </button>
            <span className="hidden lg:inline-flex items-center gap-2 font-mono text-[9px] text-text-muted uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-status animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
        </div>
      </header>

      {/* Main Single-Screen Brutalist Portal Layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* LEFT SIDE: Brand Title, Registration Flow, and Live Receipt */}
          <div className="lg:col-span-7 space-y-12 text-left">
            
            {/* PRIVACY POLICY & DATA USAGE COLLAPSIBLE BANNER */}
            <div className="border border-border bg-card/60 p-4 space-y-3 text-left backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-accent animate-pulse" />
                  <div className="space-y-0.5">
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest block font-bold">
                      🛡️ PRIVACY POLICY & DATA USAGE
                    </span>
                    <span className="font-sans text-[11px] text-text-primary uppercase font-bold tracking-tight block">
                      Your data is safe, simple, and 100% transparent.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                  className="inline-flex items-center justify-center gap-1.5 font-mono text-[9px] text-accent hover:text-text-primary uppercase tracking-widest border border-accent/40 px-3.5 py-1.5 bg-accent/5 hover:bg-accent/15 transition-all cursor-pointer rounded-none hover:border-accent focus:outline-none shrink-0"
                >
                  {isPrivacyOpen ? 'Hide Info [-]' : 'Show Info [+]'}
                </button>
              </div>

              {isPrivacyOpen && (
                <div className="space-y-4 font-sans text-xs text-text-muted font-light leading-relaxed border-t border-border/50 pt-3 mt-1.5">
                  <p className="uppercase text-[10px] tracking-wide text-text-primary font-bold">
                    We believe in keeping your data safe, simple, and transparent. We only collect the bare minimum information required to set up your account and get you into the network.
                  </p>
                  
                  <p className="text-[10px] tracking-wide uppercase text-text-primary font-bold">
                    Here is exactly what we collect and why we need it:
                  </p>
                  
                  <div className="space-y-3 pl-3 border-l-2 border-accent/30 font-mono text-[10px] uppercase">
                    <div className="space-y-1">
                      <span className="text-text-primary font-bold block"> Custom Username:</span>
                      <span className="text-text-muted/80 block normal-case">Collected so you can create a unique identity on the platform and be easily recognized within the network.</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-text-primary font-bold block"> Instagram Handle:</span>
                      <span className="text-text-muted/80 block normal-case">Collected strictly for administrative purposes so we can manually verify your profile and add you to the official group chat.</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-text-primary font-bold block"> 4-Digit PIN Code:</span>
                      <span className="text-text-muted/80 block normal-case">Collected as a secure, lightweight authentication method. This PIN is required to securely re-verify your identity if you ever need to re-login to your account.</span>
                    </div>
                  </div>

                  <div className="p-3 bg-bg border border-border flex items-start gap-2.5">
                    <span className="text-sm shrink-0">🔒</span>
                    <div className="space-y-0.5">
                      <span className="font-mono text-[9px] text-text-primary font-bold block uppercase tracking-wider">🔒 DATA SECURITY</span>
                      <p className="font-sans text-[10px] text-text-muted uppercase leading-relaxed font-light">
                        Your information is securely stored and is never shared, sold, or used for advertising. It exists solely to manage your access to the network and keep the community secure.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Massive Title Block */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-card border border-border font-mono text-[9px] tracking-widest text-accent uppercase">
                <span className="w-1.5 h-1.5 bg-accent animate-pulse" />
                // SYSTEM_OVERRIDE // DEPLOY_SECTOR
              </div>

              <h1 
                className={`font-sans text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase leading-none ${
                  isTier400Active ? 'bg-crown-gradient bg-clip-text text-transparent' : 'text-text-primary'
                }`}
                style={{ letterSpacing: '-0.05em' }}
              >
                # SECTOR<br />
                // NETWORK.
              </h1>

              <div className="flex items-center gap-2 font-mono text-[10px] text-text-muted uppercase tracking-wider">
                <span className="w-2 h-2 bg-status rounded-full animate-pulse shrink-0" />
                <span>STATUS: LIVE TELEMETRY // CODM LOBBY CHAT MODIFIERS ACTIVE</span>
              </div>

              <hr className="border-border/60" />

              <p className="font-sans text-text-muted font-light text-base sm:text-lg leading-relaxed max-w-xl">
                One elite radar group. Maximum leverage. Lock in your premium callsign modifier, bypass standard constraints, and deploy high-impact visual tags directly to the active lobby feed.
              </p>

              {/* Liquid Chrome Interactive Visualizer */}
              <div className="relative w-full h-[140px] md:h-[180px] border border-border bg-[#0B0A0F] overflow-hidden group">
                <div className="absolute inset-0 z-0 opacity-85 hover:opacity-100 transition-opacity duration-300">
                  <LiquidChrome
                    baseColor={isTier400Active ? [0.65, 0.45, 0.15] : [0.05, 0.35, 0.45]}
                    speed={1.2}
                    amplitude={0.4}
                    interactive={true}
                  />
                </div>
                {/* HUD Overlays */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none font-mono text-[8px] text-accent tracking-widest uppercase bg-bg/80 px-2 py-0.5 border border-accent/20">
                  REAL-TIME DISTORTION WAVE // VISUAL ENGINE
                </div>
                <div className="absolute bottom-3 right-3 z-10 pointer-events-none font-mono text-[8px] text-text-muted uppercase bg-bg/80 px-2 py-0.5 border border-border/40">
                  [ INTERACTIVE SHADER ACTIVE // MOUSE REACTIVE ]
                </div>
              </div>
            </div>

            {/* DYNAMIC REGISTRATION FLOW CARD */}
            <div id="registration-section" className="border border-border bg-card p-6 md:p-8 relative scroll-mt-24">
              {/* Top Indicator */}
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6 font-mono text-[9px] text-text-muted tracking-widest">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-accent animate-pulse" />
                  INITIALIZE REGISTRATION // SECURE SLOT
                </span>
                <span>
                  {step === 'select' ? 'STEP 01/04' : step === 'apply' ? 'STEP 02/04' : step === 'pay' ? 'STEP 03/04' : 'STEP 04/04'}
                </span>
              </div>

              {/* Simple Step Navigation indicators during Registration */}
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6 font-mono text-[9px] text-text-muted tracking-widest overflow-x-auto whitespace-nowrap scrollbar-none">
                <div className="flex items-center gap-2">
                  <span className={`${step === 'select' ? 'text-text-primary font-bold' : 'text-text-muted/60'}`}>01 CHOOSE</span>
                  <ChevronRight className="w-2.5 h-2.5 text-text-muted/40 shrink-0" />
                  <span className={`${step === 'apply' ? 'text-text-primary font-bold' : 'text-text-muted/60'}`}>02 IDENTITY</span>
                  <ChevronRight className="w-2.5 h-2.5 text-text-muted/40 shrink-0" />
                  <span className={`${step === 'pay' ? 'text-text-primary font-bold' : 'text-text-muted/60'}`}>03 PAYMENT</span>
                  <ChevronRight className="w-2.5 h-2.5 text-text-muted/40 shrink-0" />
                  <span className={`${step === 'confirm' ? 'text-text-primary font-bold' : 'text-text-muted/60'}`}>04 HANDSHAKE</span>
                </div>
              </div>

                {profiles.length >= 250 && step !== 'confirm' ? (
                  <div
                    key="locked-slots"
                    className="space-y-6 text-center py-8"
                  >
                    <div className="inline-flex p-4 bg-status/10 border border-status/30 rounded-none mb-2">
                      <ShieldAlert className="w-10 h-10 text-status animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-sans font-black text-xl text-text-primary uppercase tracking-tight">
                        REGISTRATIONS CLOSED
                      </h3>
                      <p className="font-mono text-[9px] text-status uppercase tracking-widest font-bold">
                        MAXIMUM CAPACITY DETECTED (250 / 250 SLOTS FILLED)
                      </p>
                    </div>
                    <p className="font-sans text-text-muted font-light text-xs max-w-sm mx-auto leading-relaxed uppercase">
                      The SECTOR Network registration directory has reached its strict limit of 250 users (125 per school: 123 paid + 2 free founders split evenly). No new slots can be opened at this time. Existing members can still log in and authenticate using the Access Hub Console.
                    </p>
                    <div className="pt-6 border-t border-border flex justify-center">
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">
                        ERROR_CRITICAL_SLOT_DESYNC_LIMIT_REACHED
                      </span>
                    </div>
                  </div>
                ) : step === 'select' ? (
                  <form 
                    key="select"
                    onSubmit={handleTierSubmit} 
                    className="space-y-6 text-left"
                  >
                    <div>
                      <h3 className="font-sans font-black text-lg text-text-primary uppercase tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                        SELECT CLOUT TIER.
                      </h3>
                      <p className="font-sans text-text-muted font-light text-xs mt-1">
                        Choose your premium profile status modifier for the active season.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      {TIERS.map((tier) => {
                        const isSelected = selectedTierId === tier.id;
                        const limit = TIER_LIMITS[tier.id];
                        const count = getTierUserCount(tier.id);
                        const isFull = count >= limit;
                        const isCrownTier = tier.id === 'tier400';
                        return (
                          <div
                            key={tier.id}
                            onClick={() => !isFull && setSelectedTierId(tier.id)}
                            className={`p-4 border transition-all duration-150 select-none flex flex-col justify-between ${
                              isFull
                                ? 'bg-bg/50 border-status/20 opacity-60 cursor-not-allowed text-text-muted/60'
                                : isCrownTier
                                  ? isSelected
                                    ? 'bg-tier400-card border-[#F3BA2F] cursor-pointer'
                                    : 'bg-tier400-card border-border hover:border-[#F3BA2F]/60 cursor-pointer'
                                  : isSelected 
                                    ? 'bg-accent/10 border-accent cursor-pointer' 
                                    : 'bg-bg border-border hover:border-accent/50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                  isFull 
                                    ? 'border-status bg-transparent' 
                                    : isCrownTier
                                      ? 'border-[#F3BA2F]'
                                      : isSelected 
                                        ? 'border-accent bg-accent' 
                                        : 'border-border'
                                }`}>
                                  {isSelected && !isFull && (
                                    <div className={`w-1 h-1 rounded-full ${isCrownTier ? 'bg-[#F3BA2F]' : 'bg-bg'}`} />
                                  )}
                                  {isFull && <span className="text-[8px] text-status font-bold font-sans">×</span>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {getTierIcon(tier.id)}
                                  <span className={`font-sans font-black text-sm ${
                                    isFull 
                                      ? 'text-text-muted/40 line-through' 
                                      : isCrownTier 
                                        ? 'text-[#F3BA2F]' 
                                        : 'text-text-primary'
                                  }`}>{tier.name}</span>
                                </div>
                                <span className={`font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 border ${
                                  isFull 
                                    ? 'border-status/30 bg-bg text-status/70' 
                                    : isCrownTier
                                      ? 'border-[#F3BA2F]/30 bg-tier400-bg text-[#F3BA2F]'
                                      : 'border-border bg-bg text-text-muted'
                                }`}>
                                  {isFull ? 'CLOSED' : tier.badge}
                                </span>
                              </div>
                              <span className={`font-sans font-bold text-xs ${
                                isFull 
                                  ? 'text-text-muted/40 line-through' 
                                  : isCrownTier
                                    ? 'text-[#F3BA2F]'
                                    : 'text-text-primary'
                              }`}>₹{tier.price}</span>
                            </div>
                            
                            <p className="font-sans text-[10px] text-text-muted font-light mt-2 leading-relaxed pl-5">
                              {tier.description}
                            </p>

                            <div className="mt-2.5 pl-5 flex items-center justify-between font-mono text-[8px] uppercase tracking-wider">
                              <span className={isFull ? "text-status font-bold" : isCrownTier ? "text-[#F3BA2F]" : "text-accent"}>
                                {isFull 
                                  ? "● SOLD OUT" 
                                  : (isAdminAuthenticated || loggedInProfile?.role === 'admin')
                                    ? `● ${limit - count} Spots Left` 
                                    : "● SPOTS AVAILABLE"}
                              </span>
                              {(isAdminAuthenticated || loggedInProfile?.role === 'admin') && (
                                <span className="text-text-muted font-bold">
                                  ({count} / {limit} CLAIMED)
                                </span>
                              )}
                            </div>

                            <div className="mt-3 pl-5 space-y-1 border-t border-border pt-2.5">
                              <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest block mb-1 font-bold">
                                INCLUDED FEATURES
                              </span>
                              {tier.perks.map((perk, index) => (
                                <div key={index} className="flex items-start gap-1.5 font-sans text-[9px] text-text-muted">
                                  <span className={`${isCrownTier ? 'text-[#F3BA2F]' : 'text-accent'} shrink-0 font-black`}>✓</span>
                                  <span>{perk}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Policy Warning Card */}
                    <div className={`p-3.5 border flex items-start gap-3 transition-colors ${
                      selectedTierId === 'tier400' 
                        ? 'bg-amber-950/10 border-amber-900/30' 
                        : 'bg-status/5 border-status/20'
                    }`}>
                      <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 animate-pulse ${
                        selectedTierId === 'tier400' ? 'text-amber-500' : 'text-status'
                      }`} />
                      <div className="space-y-0.5 text-left">
                        <span className={`font-sans font-black text-[9px] uppercase tracking-wider block ${
                          selectedTierId === 'tier400' ? 'text-amber-500' : 'text-status'
                        }`}>
                          POLICY: NO UPGRADES & NO REFUNDS
                        </span>
                        <p className="font-sans text-[10px] text-text-muted font-light leading-relaxed uppercase">
                          Each profile is permitted only ONE entry. Upgrades after registration are strictly NOT supported. Please select your tier carefully as all registrations are final and non-refundable.
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <button
                        type="submit"
                        className="w-full py-4 bg-accent text-bg hover:bg-accent-hover font-mono text-xs font-bold uppercase tracking-widest rounded-none border border-transparent transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Select Tier & Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : step === 'apply' ? (
                  <form 
                    key="apply"
                    onSubmit={handleFormSubmit} 
                    className="space-y-6 text-left"
                  >
                    <div>
                      <h3 className="font-sans font-black text-lg text-text-primary uppercase tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                        AUTHENTICATE PROFILE.
                      </h3>
                      <p className="font-sans text-text-muted font-light text-xs mt-1">
                        Provide your telemetry handles and define your access security PIN.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Selected Tier quick display */}
                      <div className="p-3 bg-bg border border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTierIcon(selectedTier.id)}
                          <span className="font-mono text-[10px] text-text-primary uppercase font-bold tracking-wider">
                            {selectedTier.name} selected
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-text-muted">
                          {isFreeUser(formData.instagram) ? '₹0.00 (FREE ACCESS)' : `₹${selectedTier.price}`}
                        </span>
                      </div>

                      {/* Instagram Handle */}
                      <div>
                        <label className="block font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5 flex justify-between items-center">
                          <span>Instagram Handle</span>
                          {isFreeUser(formData.instagram) && (
                            <span className="text-accent font-bold tracking-wider text-[8px] animate-pulse">✓ FREE PORTAL SLOT GRANTED</span>
                          )}
                        </label>
                        <input
                          type="text"
                          name="instagram"
                          placeholder="e.g., @yourname"
                          required
                          value={formData.instagram}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-bg border rounded-none font-mono text-xs text-text-primary placeholder-text-muted/40 focus:outline-none transition-colors ${
                            isFreeUser(formData.instagram) 
                              ? 'border-status/60 focus:border-status' 
                              : 'border-border focus:border-accent'
                          }`}
                        />
                      </div>

                      {/* Username Nickname */}
                      <div>
                        <label className="block font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5">
                          Group Nickname Display (Name)
                        </label>
                        {(() => {
                          const blockedWordUsed = checkBlockedWord(formData.codmName);
                          const isNameTaken = formData.codmName.trim() !== '' && profiles.some(p => p.codmName.trim().toLowerCase() === formData.codmName.trim().toLowerCase());
                          return (
                            <>
                              <input
                                type="text"
                                name="codmName"
                                placeholder="e.g., SPECTRE"
                                required
                                value={formData.codmName}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-bg rounded-none font-mono text-xs placeholder-text-muted/40 focus:outline-none transition-colors border ${
                                  blockedWordUsed || isNameTaken
                                    ? 'border-status/60 focus:border-status text-status' 
                                    : 'border-border focus:border-accent text-text-primary'
                                }`}
                              />
                              {blockedWordUsed && (
                                <span className="text-status font-bold block mt-1.5 font-mono text-[9px] uppercase animate-pulse">
                                  ⚠️ ERROR: DISALLOWED TERM DETECTED ("{blockedWordUsed}"). PLEASE CHANGE.
                                </span>
                              )}
                              {isNameTaken && (
                                <span className="text-status font-bold block mt-1.5 font-mono text-[9px] uppercase animate-pulse">
                                  ⚠️ ERROR: USERNAME TAKEN. CHOOSE A UNIQUE USERNAME.
                                </span>
                              )}
                            </>
                          );
                        })()}
                        <p className="font-sans text-text-muted/60 text-[9px] mt-1.5 leading-normal uppercase">
                          This is the display nickname that will be modified inside the Instagram chat group.
                          {selectedTierId !== 'tier100' && (
                            <span className="text-status block mt-0.5">
                              Format will stand out as: {selectedTierId === 'tier400' ? '👑 🔴 ' : '🔴 '}{formData.codmName || '[Name]'}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* School Selection (Compulsory) */}
                      <div>
                        <label className="block font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5 flex justify-between">
                          <span>Select School (Compulsory)</span>
                          <span className="text-status font-bold">* REQUIRED</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, school: 'TNA' }))}
                            className={`p-3.5 border font-mono text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 rounded-none cursor-pointer ${
                              formData.school === 'TNA'
                                ? 'bg-accent text-bg border-transparent'
                                : 'bg-bg text-text-muted border-border hover:border-accent/50'
                            }`}
                          >
                            <span className="text-[10px]">TNA</span>
                            <span className="text-[7px] tracking-widest opacity-60">Tashi Namgyal Academy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, school: 'GD Goenka' }))}
                            className={`p-3.5 border font-mono text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 rounded-none cursor-pointer ${
                              formData.school === 'GD Goenka'
                                ? 'bg-accent text-bg border-transparent'
                                : 'bg-bg text-text-muted border-border hover:border-accent/50'
                            }`}
                          >
                            <span className="text-[10px]">GD Goenka</span>
                            <span className="text-[7px] tracking-widest opacity-60">GD Goenka Public School</span>
                          </button>
                        </div>
                        <p className="font-sans text-text-muted/60 text-[9px] mt-1.5 leading-normal uppercase">
                          You must select your school affiliation to proceed with the clearance launch.
                        </p>
                      </div>

                      {/* Security PIN Field */}
                      <div>
                        <label className="block font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5 flex justify-between">
                          <span>Define Security PIN (4-digit number)</span>
                          <span className="text-text-muted font-bold">{formData.securityPin.length}/4</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showRegPin ? "text" : "password"}
                            name="securityPin"
                            placeholder="e.g., 1234"
                            required
                            maxLength={4}
                            value={formData.securityPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setFormData(prev => ({ ...prev, securityPin: val }));
                            }}
                            className={`w-full pl-4 pr-12 py-3 bg-bg border rounded-none font-mono text-xs text-text-primary placeholder-text-muted/40 focus:outline-none transition-colors ${
                              formData.securityPin && formData.securityPin.length !== 4
                                ? 'border-status/60 focus:border-status'
                                : 'border-border focus:border-accent'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPin(!showRegPin)}
                            className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-text-muted hover:text-text-primary focus:outline-none border-l border-border/40 bg-card/40 transition-colors"
                            title={showRegPin ? "Hide PIN" : "Show PIN"}
                          >
                            {showRegPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {formData.securityPin && formData.securityPin.length !== 4 && (
                          <span className="text-status font-bold block mt-1.5 font-mono text-[9px] uppercase animate-pulse">
                            ⚠️ PIN must be exactly 4 digits (current: {formData.securityPin.length}/4)
                          </span>
                        )}
                        <p className="font-sans text-text-muted/60 text-[9px] mt-1.5 leading-normal uppercase">
                          Choose a private 4-digit PIN to secure your profile slot. You will use this PIN to log in and verify your status anytime.
                        </p>
                      </div>

                      {/* Pin safe notification */}
                      <div className="p-3 bg-bg border border-border flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <span className="font-sans text-[10px] text-text-muted uppercase leading-snug">
                          🔒 PIN SAFE & SECURE: Your PIN is stored with client-side protection and used strictly to restrict unauthorized profile view edits.
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep('select')}
                        className="px-4 py-4 border border-border bg-card text-text-muted font-mono text-xs uppercase hover:text-text-primary hover:border-accent rounded-none transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      {(() => {
                        const blockedWordUsed = checkBlockedWord(formData.codmName);
                        const isNameTaken = formData.codmName.trim() !== '' && profiles.some(p => p.codmName.trim().toLowerCase() === formData.codmName.trim().toLowerCase());
                        const isSubmitDisabled = !!blockedWordUsed || isNameTaken;
                        return (
                          <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className={`flex-1 py-4 font-mono text-xs font-bold uppercase tracking-widest rounded-none border transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                              isSubmitDisabled
                                ? 'bg-status/10 text-status/50 border-status/20 cursor-not-allowed'
                                : 'bg-accent text-bg border-transparent hover:bg-accent-hover'
                            }`}
                          >
                            Initialize Permit
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        );
                      })()}
                    </div>
                  </form>
                ) : step === 'pay' ? (
                  <div 
                    key="pay"
                    className="space-y-6 text-left"
                  >
                    <div>
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest block">
                        SECURED PERMIT RESERVATION
                      </span>
                      <h3 className="font-sans font-black text-lg text-text-primary uppercase tracking-tight mt-0.5" style={{ letterSpacing: '-0.03em' }}>
                        UPI REDIRECT CLEARANCE.
                      </h3>
                      <p className="font-sans text-text-muted font-light text-xs mt-1">
                        Redirect to complete the ₹{selectedTier.price} clearance transfer. Your profile slot will be registered automatically.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* UPI Copy Input */}
                      <div className="p-3 border border-border bg-bg flex items-center justify-between">
                        <div className="font-mono text-xs">
                          <span className="text-text-muted uppercase mr-1 text-[9px]">UPI ID:</span>
                          <span className="text-text-primary font-bold text-[11px]">{upiId}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(upiId, setCopiedUpi)}
                          className="px-3 py-1.5 bg-card border border-border hover:bg-accent hover:text-bg hover:border-transparent transition-colors rounded-none font-mono text-[9px] text-text-muted uppercase tracking-widest cursor-pointer"
                        >
                          {copiedUpi ? "COPIED" : "COPY ID"}
                        </button>
                      </div>

                      {/* Direct redirect and activate button */}
                      <div className="space-y-2">
                        <a
                          href={getGPayUrl()}
                          onClick={handleRedirectAndDirectLogin}
                          className="flex items-center justify-center gap-2.5 w-full py-4 bg-accent text-bg hover:bg-accent-hover border border-transparent transition-colors duration-150 rounded-none font-mono text-xs font-bold uppercase tracking-widest text-center cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4 animate-pulse" />
                          Pay ₹{selectedTier.price} & Register
                        </a>
                        <p className="font-sans text-text-muted text-[10px] text-center uppercase leading-relaxed">
                          ⚡ Redirects to Google Pay / UPI client app & completes handshake activation immediately.
                        </p>
                      </div>
                    </div>

                    {/* Policy warning inline */}
                    <div className={`p-3 border flex items-start gap-2.5 transition-colors ${
                      selectedTierId === 'tier400' 
                        ? 'bg-amber-950/15 border-amber-900/30' 
                        : 'bg-status/5 border-status/20'
                    }`}>
                      <ShieldAlert className={`w-3.5 h-3.5 shrink-0 mt-0.5 animate-pulse ${
                        selectedTierId === 'tier400' ? 'text-amber-500' : 'text-status'
                      }`} />
                      <p className="font-sans text-[9px] text-text-muted uppercase leading-normal">
                        ⚠️ ENTRY STRICTLY FINAL: No upgrades after entry and no refunds. Verify that Instagram Handle and Clout Tier selection are 100% correct before redirecting.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep('apply')}
                        className="px-4 py-4 border border-border bg-card text-text-muted font-mono text-xs uppercase hover:text-text-primary hover:border-accent rounded-none transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ) : step === 'confirm' ? (
                  <div 
                    key="confirm"
                    className="space-y-6 text-left"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 border border-border bg-card flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      </div>
                      <h3 className="font-sans font-black text-lg text-text-primary uppercase tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                        TELEMETRY PACKED.
                      </h3>
                      <p className="font-sans text-text-muted font-light text-xs max-w-sm mt-1 leading-relaxed">
                        Your entry profile and transaction proof have been compiled into a secure handshake packet. Copy this packet and DM our Instagram inbox to finalize activation.
                      </p>
                    </div>

                    {/* Precompiled code output packet */}
                    <div className="space-y-2">
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest block">
                        SECURE PORTAL DATA PACKET
                      </span>
                      <div className="relative bg-bg border border-border rounded-none p-4 text-left">
                        <pre className="font-mono text-[10px] text-text-muted leading-relaxed whitespace-pre-wrap select-all">
                          {generatedTemplateText}
                        </pre>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedTemplateText, setCopiedTemplate)}
                          className="absolute bottom-4 right-4 px-3 py-1.5 bg-card border border-border hover:bg-accent hover:text-bg hover:border-transparent transition-colors rounded-none font-mono text-[8px] text-text-muted uppercase tracking-widest cursor-pointer"
                        >
                          {copiedTemplate ? "COPIED" : "COPY PACKET"}
                        </button>
                      </div>
                    </div>

                    {/* Call to action launch buttons */}
                    <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
                      <a
                        href={`/api/join-gc?token=${localStorage.getItem('sector_token') || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-4 bg-accent text-bg font-mono text-xs font-bold uppercase tracking-widest rounded-none border border-transparent hover:bg-accent-hover transition-colors duration-150 flex items-center justify-center gap-2"
                      >
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          // Auto-login to portal hub since registration just completed successfully
                          const formattedInsta = formData.instagram.startsWith('@') ? formData.instagram : `@${formData.instagram}`;
                          const registered = profiles.find(p => p.instagram.toLowerCase() === formattedInsta.toLowerCase());
                          if (registered) {
                            setLoggedInProfile(registered);
                          } else {
                            handleLogout();
                          }
                          setStep('select');
                          resetForm();
                          setTimeout(() => {
                            const el = document.getElementById('directory-section');
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 100);
                        }}
                        className="flex-1 px-4 py-4 border border-accent bg-card text-text-primary font-mono text-xs uppercase hover:bg-accent hover:text-bg hover:border-transparent rounded-none transition-colors cursor-pointer"
                      >
                        Access Profile Hub
                      </button>
                    </div>
                  </div>
                ) : null}
            </div>

            {/* Live Receipt block based on active Tier selection */}
            <div className="bg-card border border-border p-6 md:p-8 relative overflow-hidden select-none">
              <div className={`absolute top-0 right-0 w-20 h-20 flex items-center justify-center border-l border-b font-mono text-[8px] font-bold uppercase tracking-widest select-none ${
                selectedTierId === 'tier400' 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                  : 'bg-accent/5 text-accent border-accent/20'
              }`}>
                VERIFIED
              </div>

              <div className="border-b border-border pb-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest block">ISSUER BRAND</span>
                  <h3 className="font-sans font-black text-base text-text-primary tracking-wider uppercase">SECTOR // NETWORK</h3>
                  <p className="font-sans text-[9px] text-text-muted uppercase">THE INSTAGRAM PRIVATE CHAT GATEWAY</p>
                </div>
                
                <div className="space-y-0.5 text-left md:text-right font-mono text-[9px] text-text-muted">
                  <div><span className="text-text-muted/60">INVOICE:</span> SCTR-2026-{selectedTier.id.toUpperCase()}</div>
                  <div><span className="text-text-muted/60">DATE:</span> {currentTimestamp}</div>
                  <div><span className="text-text-muted/60">CLASS:</span> {selectedTier.name} PERMIT</div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest block">ITEMIZED DESCRIPTION</span>
                
                <div className="border border-border bg-bg divide-y divide-border">
                  <div className="p-4 flex justify-between gap-4 font-mono text-[11px]">
                    <div>
                      <span className="text-text-primary font-bold block uppercase tracking-tight">01 // {selectedTier.name} Access Permit</span>
                      <span className="text-text-muted text-[9px] mt-0.5 block">{selectedTier.featureTitle}</span>
                    </div>
                    <div className="text-text-primary font-bold whitespace-nowrap">
                      {isFreeUser(formData.instagram) ? '₹0.00' : `₹${selectedTier.price}.00`}
                    </div>
                  </div>

                  <div className="p-4 flex justify-between gap-4 font-mono text-[11px]">
                    <div>
                      <span className="text-text-primary font-bold block uppercase tracking-tight">02 // Name Registration & Pinned Bio</span>
                      <span className="text-text-muted text-[9px] mt-0.5 block">Official inclusion in the high-school network database sheet.</span>
                    </div>
                    <div className="text-text-muted font-bold whitespace-nowrap">INCLUDED</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-1 font-sans text-[11px] text-text-muted">
                  <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest block">TERMS</span>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-accent" /> Pure visual modifier access</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-accent" /> Nickname update done manually in under 5 mins</div>
                </div>

                <div className="text-left sm:text-right font-mono border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto">
                  <div className="text-[9px] text-text-muted uppercase">Grand Total</div>
                  <div className="font-sans font-black text-2xl text-text-primary tracking-tighter mt-0.5">
                    {isFreeUser(formData.instagram) ? '₹0.00 (PROMO)' : `₹${selectedTier.price}.00`}
                  </div>
                  <div className="text-[8px] text-text-muted uppercase tracking-widest">
                    {isFreeUser(formData.instagram) ? 'Free authorized promotional permit.' : 'One-time fee, pure clout status.'}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Interactive Access Hub Console & Registered Directory */}
          <div id="directory-section" className="lg:col-span-5 space-y-8 scroll-mt-24">
            
            {loggedInProfile ? (
              /* IF LOGGED IN: SHOW EXCLUSIVE PORTAL HUB */
              <div id="access-hub-console" className="border border-border bg-card p-6 md:p-8 relative">
                {/* Top Indicator */}
                <div className="flex items-center justify-between border-b border-border pb-4 mb-6 font-mono text-[9px] text-text-muted tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    ACCESS HUB CONSOLE // SESSION LIVE
                  </span>
                  <span className="text-text-muted/60 font-mono text-[8px] uppercase">
                    SESSION VERIFIED
                  </span>
                </div>

                {/* USER-SIDE WARNING BANNERS */}
                {loggedInProfile.warnings === 1 && (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-500 font-mono text-[10px] uppercase space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <ShieldAlert className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>⚠️ WARNING DIRECTIVE [ 1 / 2 ] (ACTIVE)</span>
                    </div>
                    <p className="text-[9px] text-text-muted/80 leading-normal uppercase">
                      An administrator has issued a formal policy warning against your account. Ensure full compliance with the community directives. A subsequent violation will result in an immediate permanent ban.
                    </p>
                  </div>
                )}

                {loggedInProfile.warnings && loggedInProfile.warnings >= 2 && (
                  <div className="mb-6 space-y-3 font-mono text-[10px] uppercase">
                    {/* First archived warning banner */}
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-amber-500/70 space-y-1">
                      <div className="flex items-center gap-2 font-bold">
                        <ShieldAlert className="w-4 h-4 text-amber-500/60" />
                        <span>⚠️ WARNING DIRECTIVE [ 1 / 2 ] (RECORDED)</span>
                      </div>
                      <p className="text-[9px] text-text-muted/65 leading-normal uppercase">
                        Formal code-of-conduct policy warning issued and filed.
                      </p>
                    </div>

                    {/* Second urgent double-warning banner */}
                    <div className="p-4 bg-status/10 border border-status text-status space-y-1.5 animate-pulse">
                      <div className="flex items-center gap-2 font-bold text-status">
                        <ShieldAlert className="w-4.5 h-4.5 text-status animate-bounce" />
                        <span>❌ CRITICAL WARNING DIRECTIVE [ 2 / 2 ] (FINAL ALERT)</span>
                      </div>
                      <p className="text-[9px] text-status font-bold leading-normal uppercase">
                        THIS IS YOUR SECOND AND FINAL WARNING. ANY SUBSEQUENT POLICY INFRINGEMENT WILL PERMANENTLY TERMINATE AND BAN YOUR INSTAGRAM PROFILE LOBBY STATUS.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-6 text-left">
                  <div className="border border-border bg-bg p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 flex items-center gap-1 font-mono text-[8px] text-accent font-bold uppercase tracking-wider bg-accent/10 border border-accent/20 px-2 py-0.5">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                      SECURE ACTIVE
                    </div>

                    <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest block">
                      COMMUNITY PASS IDENTIFICATION
                    </span>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        {getTierIcon(loggedInProfile.tierId)}
                        <h3 className="font-sans font-black text-2xl text-text-primary tracking-tight uppercase">
                          {loggedInProfile.codmName}
                        </h3>
                      </div>
                      
                      <div className="font-mono text-[11px] text-text-muted space-y-1 pt-1.5 border-t border-border">
                        <div><span className="text-text-muted/60 uppercase">HANDLE:</span> {loggedInProfile.instagram}</div>
                        <div><span className="text-text-muted/60 uppercase">TIER STATUS:</span> <span className="text-text-primary font-bold">{TIERS.find(t => t.id === loggedInProfile.tierId)?.name}</span></div>
                        {loggedInProfile.school && (
                          <div><span className="text-text-muted/60 uppercase">SCHOOL:</span> <span className="text-text-primary font-bold">{loggedInProfile.school}</span></div>
                        )}
                        <div><span className="text-text-muted/60 uppercase">REGISTERED ON:</span> {loggedInProfile.registeredAt}</div>
                        <div>
                          <span className="text-text-muted/60 uppercase">VISUAL FORMAT: </span>
                          <span className="font-sans text-status font-bold">
                            {loggedInProfile.tierId === 'tier400' ? '👑 🔴 ' : loggedInProfile.tierId === 'tier100' ? 'None' : '🔴 '}{loggedInProfile.codmName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Perks and Analytics section */}
                  <div className="space-y-4 border border-border p-5 bg-card">
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest block">
                      REAL-TIME PROFILE METRICS
                    </span>

                    {loggedInProfile.tierId === 'tier300' || loggedInProfile.tierId === 'tier400' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-bg border border-border">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-accent" />
                            <div>
                              <span className="font-mono text-[10px] text-text-primary uppercase block font-bold">PROFILE VIEWS</span>
                              <span className="font-sans text-[10px] text-text-muted">Registered User Tracking</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-sans text-xl font-black text-text-primary">
                              {profiles.find(p => p.instagram.toLowerCase() === loggedInProfile.instagram.toLowerCase())?.profileViews || 0}
                            </span>
                            <div className="w-2 h-2 bg-accent rounded-full animate-ping" title="Active Tracker" />
                          </div>
                        </div>
                        <p className="font-sans text-[10px] text-text-muted leading-relaxed uppercase">
                          📈 Views increment automatically when another logged-in registered user clicks your profile card in the directory.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-bg border border-border text-center space-y-2">
                        <Lock className="w-5 h-5 text-text-muted/40 mx-auto" />
                        <div>
                          <span className="font-mono text-[9px] text-text-muted uppercase font-bold tracking-widest block">ANALYTICS LOCKED</span>
                          <p className="font-sans text-text-muted/50 text-[9px] max-w-xs mx-auto leading-normal uppercase mt-1">
                            Profile views analytics are exclusive to Tier 3 and Tier 4. Upgrades are not permitted after entry.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gateway Direct Group Chat Link */}
                  <div className="space-y-3">
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest block">
                      GATEWAY CHAT ACCESS
                    </span>
                    {loggedInProfile.status === 'pending' ? (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/30 text-center space-y-2">
                        <Lock className="w-5 h-5 text-amber-500 animate-pulse mx-auto" />
                        <div>
                          <span className="font-mono text-[9px] text-amber-500 uppercase font-bold tracking-widest block">
                            PAYMENT APPROVAL PENDING
                          </span>
                          <p className="font-sans text-text-muted text-[9px] max-w-xs mx-auto leading-normal uppercase mt-1">
                            Your transaction (UTR: <span className="font-mono text-text-primary font-bold">{loggedInProfile.utrNumber || 'N/A'}</span>) is currently awaiting manual review. Upon confirmation, your launch link will automatically decrypt.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <a
                          href={`/api/join-gc?token=${localStorage.getItem('sector_token') || ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-4 bg-accent text-bg font-mono text-xs font-bold uppercase tracking-widest rounded-none border border-transparent hover:bg-accent-hover transition-colors duration-150 flex items-center justify-center gap-2 text-center"
                        >
                          <Instagram className="w-4 h-4" />
                          Launch Instagram Group Chat
                        </a>
                        <p className="font-sans text-text-muted/60 text-center uppercase">
                          ⚠️ Secure Link. Opens directly inside the Instagram app group.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 font-sans text-text-muted text-[10px] uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                      Session encrypted
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleDeleteOwnProfile}
                        className="px-3 py-2 border border-status/30 bg-status/10 text-status font-mono text-[10px] uppercase hover:bg-status/20 rounded-none transition-all cursor-pointer flex items-center gap-1.5"
                        title="Permanently Delete Registration Profile"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Profile
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3.5 py-2 border border-border bg-bg text-text-muted font-mono text-[10px] uppercase hover:text-text-primary hover:border-accent rounded-none transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut className="w-3 h-3" />
                        Exit Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Sleek login button replacing the whole separate section */
              <button
                type="button"
                onClick={() => {
                  setIsLoginOpen(true);
                  setLoginError('');
                }}
                className="w-full py-4 bg-card hover:bg-card/80 text-text-primary hover:text-accent font-mono text-[10px] uppercase tracking-widest transition-colors rounded-none flex items-center justify-center gap-2 cursor-pointer border border-border hover:border-accent focus:outline-none"
              >
                <LogIn className="w-3.5 h-3.5 text-accent" />
                Authenticate PIN // Access Hub Login
              </button>
            )}

            {/* REGISTERED PROFILES DIRECTORY */}
            <Directory 
              profiles={profiles} 
              formatDirectoryNickname={formatDirectoryNickname} 
              isAdmin={isAdminAuthenticated || loggedInProfile?.role === 'admin'}
              isLoggedIn={!!loggedInProfile || isAdminAuthenticated}
              loggedInProfile={loggedInProfile}
              onViewProfile={(profile) => {
                if (loggedInProfile) {
                  handleViewProfile(profile);
                } else {
                  setIsLoginOpen(true);
                  setLoginError('Authentication required to view detailed member profiles and track live telemetry. Please log in first.');
                }
              }}
            />
          </div>

        </div>
      </main>

      {/* PROFILE DETAIL OVERLAY MODAL */}
        {selectedProfileView && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0A0F]/90 backdrop-blur-md"
            onClick={() => setSelectedProfileView(null)}
          >
            <div
              className="bg-card border border-border p-6 md:p-8 max-w-sm w-full relative space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top border highlight decoration */}
              <div className={`absolute top-0 inset-x-0 h-1 ${selectedProfileView.tierId === 'tier400' ? 'bg-[#F3BA2F]' : 'bg-accent'}`} />
              
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${selectedProfileView.tierId === 'tier400' ? 'bg-[#F3BA2F]' : 'bg-accent'}`} />
                  MEMBER PASS IDENTITY // SECURE VERIFIED
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedProfileView(null)}
                  className="font-mono text-[9px] text-text-muted hover:text-text-primary uppercase transition-colors cursor-pointer border border-border px-2 py-1 bg-bg hover:border-accent"
                >
                  [ CLOSE ]
                </button>
              </div>

              <div className="space-y-4">
                <div className="border border-border bg-bg p-5 relative overflow-hidden flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 border border-border bg-card flex items-center justify-center text-2xl">
                    {selectedProfileView.tierId === 'tier400' ? '👑' : selectedProfileView.tierId === 'tier300' ? '⚡' : selectedProfileView.tierId === 'tier200' ? '🔴' : '⚫'}
                  </div>

                  <div>
                    <h3 className="font-sans font-black text-xl text-text-primary tracking-tight uppercase">
                      {selectedProfileView.codmName}
                    </h3>
                    <span className="font-mono text-[11px] text-text-muted mt-0.5 block">
                      {selectedProfileView.instagram}
                    </span>
                  </div>

                  <div className="w-full font-mono text-[11px] text-text-muted space-y-2 pt-4 border-t border-border text-left">
                    <div className="flex justify-between">
                      <span className="text-text-muted/60 uppercase">TIER STATUS:</span> 
                      <span className={`font-bold ${selectedProfileView.tierId === 'tier400' ? 'text-[#F3BA2F]' : 'text-text-primary'}`}>
                        {TIERS.find(t => t.id === selectedProfileView.tierId)?.name}
                      </span>
                    </div>
                    {selectedProfileView.school && (
                      <div className="flex justify-between">
                        <span className="text-text-muted/60 uppercase">SCHOOL:</span> 
                        <span className="text-text-primary font-bold">{selectedProfileView.school}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-muted/60 uppercase">REGISTERED:</span> 
                      <span className="text-text-primary">{selectedProfileView.registeredAt}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted/60 uppercase">PROFILE VIEWS:</span> 
                      <span className="px-2 py-0.5 bg-card text-text-primary font-bold rounded-none border border-border">
                        {selectedProfileView.profileViews || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {loggedInProfile && loggedInProfile.instagram.toLowerCase() !== selectedProfileView.instagram.toLowerCase() ? (
                  <div className="p-3 bg-accent/10 border border-accent/20 font-mono text-[9px] text-accent uppercase tracking-wider text-center">
                    ✓ VIEW COMPLETED // Telemetry log updated successfully.
                  </div>
                ) : loggedInProfile && loggedInProfile.instagram.toLowerCase() === selectedProfileView.instagram.toLowerCase() ? (
                  <div className="p-3 bg-bg border border-border font-mono text-[9px] text-text-muted uppercase tracking-wider text-center">
                    Self-viewing mode. Views do not increment for your own profile.
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setSelectedProfileView(null)}
                className="w-full py-3 bg-accent text-bg font-mono text-xs font-bold uppercase tracking-widest hover:bg-accent-hover border border-transparent transition-colors rounded-none cursor-pointer"
              >
                Return to Directory
              </button>
            </div>
          </div>
        )}

      {/* ADMIN OPERATIONS OVERLAY MODAL */}
        {isAdminOpen && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-[#0B0A0F]/95 backdrop-blur-md p-4 flex justify-center items-start sm:items-center"
            onClick={() => {
              setIsAdminOpen(false);
              setAdminPasscode('');
              setAdminError('');
            }}
          >
            <div
              className={`bg-card border border-border p-6 md:p-8 w-full relative space-y-5 transition-all duration-300 my-4 sm:my-auto max-h-none sm:max-h-[95vh] overflow-y-visible sm:overflow-y-auto ${
                isAdminAuthenticated ? 'max-w-4xl' : 'max-w-2xl'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-status animate-pulse" />

              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-mono text-[9px] text-status uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-status animate-pulse" />
                  SECTOR NETWORK // CORE ADMINISTRATION CONSOLE
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminOpen(false);
                    setAdminPasscode('');
                    setAdminError('');
                  }}
                  className="font-mono text-[9px] text-text-muted hover:text-text-primary uppercase transition-colors cursor-pointer border border-border px-2.5 py-1 bg-[#14121A] hover:border-status hover:text-status"
                >
                  [ DISCONNECT / EXIT ]
                </button>
              </div>

              {!isAdminAuthenticated ? (
                /* SECTION 1: PASSCODE ENTRY SCREEN */
                <form onSubmit={handleAdminAuth} className="space-y-6">
                  <div className="p-4 bg-status/10 border border-status/20 text-status font-mono text-[10px] leading-relaxed uppercase space-y-1.5">
                    <p className="font-bold">⚠️ CRITICAL DATA BOUNDARY</p>
                    <p>UNAUTHORIZED RECONNAISSANCE IS LOGGED AND TERMINATED INSTANTLY. PROVIDE THE CRITICAL ADMINISTRATIVE DECRYPTION PASSCODE TO ESTABLISH SECURITY TERMINAL.</p>
                    <p className="text-text-muted/60 text-[9px] mt-1 italic">Note: Only 3 tries are allowed before the console is locked out for 15 minutes.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5 flex justify-between">
                        <span>ADMIN SECURE KEY</span>
                        <span className="text-status/70 font-bold">
                          {adminAttempts > 0 ? `${adminAttempts}/3 ATTEMPTS USED` : 'SECURE PORTAL'}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminPasscode ? "text" : "password"}
                          placeholder={
                            adminLockUntil && new Date(adminLockUntil).getTime() > Date.now()
                              ? "PORTAL LOCKED - RETRY DELAY ACTIVE"
                              : "ENTER ADMINISTRATIVE CONSOLE PASSWORD"
                          }
                          required
                          disabled={!!(adminLockUntil && new Date(adminLockUntil).getTime() > Date.now())}
                          value={adminPasscode}
                          onChange={(e) => setAdminPasscode(e.target.value)}
                          className="w-full pl-4 pr-12 py-3.5 bg-[#0B0A0F] border border-border rounded-none font-mono text-xs text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent transition-colors disabled:opacity-55"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                          className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-text-muted hover:text-text-primary focus:outline-none border-l border-border/40 bg-card/40 transition-colors"
                          title={showAdminPasscode ? "Hide Passcode" : "Show Passcode"}
                        >
                          {showAdminPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {adminError && (
                        <span className="text-status font-bold block mt-2 font-mono text-[9px] uppercase animate-shake">
                          ❌ {adminError}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAdminOpen(false)}
                      className="flex-1 py-3 border border-border text-text-muted font-mono text-[10px] uppercase tracking-wider hover:bg-bg transition-colors"
                    >
                      Abstain
                    </button>
                    <button
                      type="submit"
                      disabled={!!(adminLockUntil && new Date(adminLockUntil).getTime() > Date.now())}
                      className="flex-1 py-3 bg-accent hover:bg-accent-hover text-bg font-mono text-[10px] font-bold uppercase tracking-wider border border-transparent transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:hover:bg-accent"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Decrypt Console
                    </button>
                  </div>
                </form>
              ) : (
                /* SECTION 2: AUTHORIZED ADMINISTRATION DASHBOARD */
                <div className="space-y-6">
                  {/* Exit & Status Banner */}
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-[#14121A] border border-status/20 p-3 gap-2 font-mono text-[9px]">
                    <span className="text-status uppercase font-bold animate-pulse flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-status block" />
                      ⚡ SECURE ADMINISTRATIVE PANEL ACTIVE // TOTAL CLEARANCE LEVEL
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminOpen(false);
                        setAdminPasscode('');
                        setAdminError('');
                      }}
                      className="px-3 py-1.5 bg-status hover:bg-[#E53E3E] text-bg font-bold uppercase transition-colors cursor-pointer tracking-wider"
                    >
                      EXIT ADMIN CONSOLE
                    </button>
                  </div>

                  {/* Operations header */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-bg border border-border flex flex-col">
                      <span className="font-mono text-[9px] text-text-muted uppercase">ACTIVE DATABASE ROSTER</span>
                      <span className="font-sans text-xl font-black text-text-primary mt-1">{profiles.length} Members</span>
                    </div>
                    <div className="p-3.5 bg-accent/5 border border-accent/20 flex flex-col">
                      <span className="font-mono text-[9px] text-accent uppercase font-bold">TOTAL NET PROFIT</span>
                      <span className="font-sans text-xl font-black text-accent mt-1">₹{calculateNetProfit()}</span>
                    </div>
                    <div className="p-3.5 bg-bg border border-border flex flex-col">
                      <span className="font-mono text-[9px] text-text-muted uppercase">LOCKED IP OUTPOSTS</span>
                      <span className="font-sans text-xl font-black text-status mt-1">
                        {Object.keys(lockouts).filter(key => {
                          const l = lockouts[key];
                          return l && l.lockUntil && new Date(l.lockUntil).getTime() > Date.now();
                        }).length} Active
                      </span>
                    </div>
                  </div>

                  {/* Financial Ledger & Net Profit Dashboard */}
                  <div className="p-4 bg-bg border border-border space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="font-mono text-[9px] text-accent uppercase tracking-widest font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-accent" />
                          ✓ NET PROFIT REAL-TIME BALANCE SHEET
                        </span>
                        <span className="font-sans text-[8px] text-text-muted uppercase tracking-wider">ACTIVE FISCAL REVENUE</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        {TIERS.map(t => {
                          const count = getTierUserCount(t.id);
                          const rev = getTierRevenue(t.id);
                          return (
                            <div key={t.id} className="p-2.5 bg-card border border-border flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[8px] text-text-muted uppercase">{t.name.replace('SECTOR ', '')}</span>
                                <span className="font-sans text-[9px] text-text-muted font-bold">{count} Qty</span>
                              </div>
                              <span className="font-sans text-xs font-black text-text-primary mt-1">₹{rev}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Co-founder Revenue Shares */}
                      <div className="pt-3.5 border-t border-border space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[8px] text-text-muted uppercase tracking-wider font-bold block">
                            CO-FOUNDER REVENUE SHARE SPLITS (REAL-TIME)
                          </span>
                          <span className="font-mono text-[7px] text-text-muted/60 uppercase tracking-wider block">
                            [ CLICK ANY FOUNDER TO DECRYPT & VIEW ]
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {/* JIJI CARD */}
                          <div 
                            onClick={() => {
                              setSelectedFounder('jiji');
                              setFounderPasscodeInput('');
                              setFounderPasscodeError('');
                            }}
                            className={`p-2.5 bg-card border ${unlockedFounders.jiji ? 'border-accent/40 bg-accent/5' : 'border-border'} hover:border-accent flex flex-col justify-between cursor-pointer transition-all hover:bg-bg`}
                            title="Click to view Jiji's personal revenue dashboard and decrypt"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-sans text-[10px] font-black text-text-primary block">JIJI</span>
                                {unlockedFounders.jiji ? (
                                  <Unlock className="w-2.5 h-2.5 text-accent" />
                                ) : (
                                  <Lock className="w-2.5 h-2.5 text-text-muted/40" />
                                )}
                              </div>
                              <span className="font-mono text-[7px] text-text-muted uppercase tracking-wider block">30.0% MARGIN SPLIT</span>
                            </div>
                            {unlockedFounders.jiji ? (
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-sans text-xs font-black text-accent">₹{calculateShare('jiji')}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUnlockedFounders(prev => ({ ...prev, jiji: false }));
                                  }}
                                  className="text-[7px] text-status font-mono font-bold hover:bg-status/10 tracking-wider uppercase px-1.5 py-0.5 border border-status/30 bg-status/5"
                                  title="Close and lock Jiji's revenue data"
                                >
                                  LOCK
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono text-[8px] text-text-muted mt-2 block tracking-wider uppercase">[ LOCKED ]</span>
                            )}
                          </div>

                          {/* NEDUPLA CARD */}
                          <div 
                            onClick={() => {
                              setSelectedFounder('nedupla');
                              setFounderPasscodeInput('');
                              setFounderPasscodeError('');
                            }}
                            className={`p-2.5 bg-card border ${unlockedFounders.nedupla ? 'border-accent/40 bg-accent/5' : 'border-border'} hover:border-accent flex flex-col justify-between cursor-pointer transition-all hover:bg-bg`}
                            title="Click to view Nedupla's personal revenue dashboard and decrypt"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-sans text-[10px] font-black text-text-primary block">NEDUPLA</span>
                                {unlockedFounders.nedupla ? (
                                  <Unlock className="w-2.5 h-2.5 text-accent" />
                                ) : (
                                  <Lock className="w-2.5 h-2.5 text-text-muted/40" />
                                )}
                              </div>
                              <span className="font-mono text-[7px] text-text-muted uppercase tracking-wider block">12.5% MARGIN SPLIT</span>
                            </div>
                            {unlockedFounders.nedupla ? (
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-sans text-xs font-black text-accent">₹{calculateShare('nedupla')}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUnlockedFounders(prev => ({ ...prev, nedupla: false }));
                                  }}
                                  className="text-[7px] text-status font-mono font-bold hover:bg-status/10 tracking-wider uppercase px-1.5 py-0.5 border border-status/30 bg-status/5"
                                  title="Close and lock Nedupla's revenue data"
                                >
                                  LOCK
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono text-[8px] text-text-muted mt-2 block tracking-wider uppercase">[ LOCKED ]</span>
                            )}
                          </div>

                          {/* ANANDITA CARD */}
                          <div 
                            onClick={() => {
                              setSelectedFounder('anandita');
                              setFounderPasscodeInput('');
                              setFounderPasscodeError('');
                            }}
                            className={`p-2.5 bg-card border ${unlockedFounders.anandita ? 'border-accent/40 bg-accent/5' : 'border-border'} hover:border-accent flex flex-col justify-between cursor-pointer transition-all hover:bg-bg`}
                            title="Click to view Anandita's personal revenue dashboard and decrypt"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-sans text-[10px] font-black text-text-primary block">ANANDITA</span>
                                {unlockedFounders.anandita ? (
                                  <Unlock className="w-2.5 h-2.5 text-accent" />
                                ) : (
                                  <Lock className="w-2.5 h-2.5 text-text-muted/40" />
                                )}
                              </div>
                              <span className="font-mono text-[7px] text-text-muted uppercase tracking-wider block">12.5% MARGIN SPLIT</span>
                            </div>
                            {unlockedFounders.anandita ? (
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-sans text-xs font-black text-accent">₹{calculateShare('anandita')}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUnlockedFounders(prev => ({ ...prev, anandita: false }));
                                  }}
                                  className="text-[7px] text-status font-mono font-bold hover:bg-status/10 tracking-wider uppercase px-1.5 py-0.5 border border-status/30 bg-status/5"
                                  title="Close and lock Anandita's revenue data"
                                >
                                  LOCK
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono text-[8px] text-text-muted mt-2 block tracking-wider uppercase">[ LOCKED ]</span>
                            )}
                          </div>

                          {/* GEPHS CARD */}
                          <div 
                            onClick={() => {
                              setSelectedFounder('gephs');
                              setFounderPasscodeInput('');
                              setFounderPasscodeError('');
                            }}
                            className={`p-2.5 bg-card border ${unlockedFounders.gephs ? 'border-accent/40 bg-accent/5' : 'border-border'} hover:border-accent flex flex-col justify-between cursor-pointer transition-all hover:bg-bg`}
                            title="Click to view Geph's personal revenue dashboard and decrypt"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-sans text-[10px] font-black text-accent block">GEPHS</span>
                                {unlockedFounders.gephs ? (
                                  <Unlock className="w-2.5 h-2.5 text-accent" />
                                ) : (
                                  <Lock className="w-2.5 h-2.5 text-text-muted/40" />
                                )}
                              </div>
                              <span className="font-mono text-[7px] text-text-muted uppercase tracking-wider block">45.0% MARGIN SPLIT</span>
                            </div>
                            {unlockedFounders.gephs ? (
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-sans text-xs font-black text-accent">₹{calculateShare('gephs')}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUnlockedFounders(prev => ({ ...prev, gephs: false }));
                                  }}
                                  className="text-[7px] text-status font-mono font-bold hover:bg-status/10 tracking-wider uppercase px-1.5 py-0.5 border border-status/30 bg-status/5"
                                  title="Close and lock Geph's revenue data"
                                >
                                  LOCK
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono text-[8px] text-text-muted mt-2 block tracking-wider uppercase">[ LOCKED ]</span>
                            )}
                          </div>
                        </div>

                        {/* Split Matrix Rules Table */}
                        <div className="p-2.5 bg-bg border border-border font-mono text-[7px] text-text-muted/80 space-y-1 uppercase leading-relaxed">
                          <div className="font-bold text-text-muted border-b border-border pb-1 mb-1">MARGIN MATRIX PER PRICE POINT:</div>
                          <div className="flex justify-between">
                            <span>PRICE POINT ₹399 (TIER 4):</span>
                            <span>JIJI ₹120 (30%) | NEDUPLA ₹50 (12.5%) | ANANDITA ₹50 (12.5%) | GEPHS ₹179 (45%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PRICE POINT ₹299 (TIER 3):</span>
                            <span>JIJI ₹90 (30%) | NEDUPLA ₹37 (12.5%) | ANANDITA ₹37 (12.5%) | GEPHS ₹135 (45%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PRICE POINT ₹199 (TIER 2):</span>
                            <span>JIJI ₹60 (30%) | NEDUPLA ₹25 (12.5%) | ANANDITA ₹25 (12.5%) | GEPHS ₹89 (45%)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>PRICE POINT ₹99 (TIER 1):</span>
                            <span>JIJI ₹30 (30%) | NEDUPLA ₹12 (12.5%) | ANANDITA ₹12 (12.5%) | GEPHS ₹45 (45%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* Search, Filters and Sorting Deck */}
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-3.5 h-3.5 text-text-muted/50" />
                      </div>
                      <input
                        type="text"
                        placeholder="SEARCH BY CODM NAME / INSTAGRAM HANDLE..."
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-none font-mono text-[10px] text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent transition-colors uppercase tracking-wider"
                      />
                    </div>

                    {/* Interactive Filter and Sorting Decks */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 p-3 bg-bg border border-border font-mono text-[8px]">
                      {/* School Filter */}
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase tracking-widest font-bold block">SCHOOL:</span>
                        <select
                          value={adminSchoolFilter}
                          onChange={(e) => setAdminSchoolFilter(e.target.value as any)}
                          className="w-full bg-card border border-border text-text-primary font-bold uppercase py-1 px-1.5 focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="ALL" className="bg-card text-text-primary">ALL SCHOOLS</option>
                          <option value="TNA" className="bg-card text-text-primary">TNA</option>
                          <option value="GD Goenka" className="bg-card text-text-primary">GD GOENKA</option>
                        </select>
                      </div>

                      {/* Tier Filter */}
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase tracking-widest font-bold block">TIER LEVEL:</span>
                        <select
                          value={adminTierFilter}
                          onChange={(e) => setAdminTierFilter(e.target.value as any)}
                          className="w-full bg-card border border-border text-text-primary font-bold uppercase py-1 px-1.5 focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="ALL" className="bg-card text-text-primary">ALL TIERS</option>
                          <option value="tier100" className="bg-card text-text-primary">TIER 1 (MEMBER)</option>
                          <option value="tier200" className="bg-card text-text-primary">TIER 2 (VERIFIED)</option>
                          <option value="tier300" className="bg-card text-text-primary">TIER 3 (ANALYTICS)</option>
                          <option value="tier400" className="bg-card text-text-primary">TIER 4 (HOST CLOUT)</option>
                        </select>
                      </div>

                      {/* Role Filter */}
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase tracking-widest font-bold block">ROLE:</span>
                        <select
                          value={adminRoleFilter}
                          onChange={(e) => setAdminRoleFilter(e.target.value as any)}
                          className="w-full bg-card border border-border text-text-primary font-bold uppercase py-1 px-1.5 focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="ALL" className="bg-card text-text-primary">ALL ROLES</option>
                          <option value="admin" className="bg-card text-text-primary">ADMINS</option>
                          <option value="user" className="bg-card text-text-primary">USERS</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase tracking-widest font-bold block">STATUS:</span>
                        <select
                          value={adminStatusFilter}
                          onChange={(e) => setAdminStatusFilter(e.target.value as any)}
                          className="w-full bg-card border border-border text-text-primary font-bold uppercase py-1 px-1.5 focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="ALL" className="bg-card text-text-primary">ALL STATUSES</option>
                          <option value="active" className="bg-card text-text-primary">ACTIVE</option>
                          <option value="banned" className="bg-card text-text-primary">BANNED</option>
                        </select>
                      </div>

                      {/* Sort Engine */}
                      <div className="space-y-1">
                        <span className="text-text-muted uppercase tracking-widest font-bold block">SORT ENGINE:</span>
                        <div className="flex bg-card border border-border p-0.5 h-[23px] items-center">
                          <select
                            value={adminSortBy}
                            onChange={(e) => setAdminSortBy(e.target.value as any)}
                            className="flex-1 bg-transparent text-text-primary hover:text-text-primary border-0 font-mono text-[8px] uppercase font-bold focus:outline-none focus:ring-0 cursor-pointer pr-1"
                          >
                            <option value="DATE" className="bg-card text-text-primary">DATE</option>
                            <option value="NAME" className="bg-card text-text-primary">CODM NAME</option>
                            <option value="TIER" className="bg-card text-text-primary">TIER STATUS</option>
                            <option value="REVENUE" className="bg-card text-text-primary">PRICE POINT</option>
                          </select>
                          <button
                            key="sort-order-btn"
                            type="button"
                            onClick={() => setAdminSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                            className="px-1.5 text-text-muted hover:text-text-primary border-l border-border font-mono text-[8px] cursor-pointer"
                          >
                            {adminSortOrder === 'ASC' ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Filter Stats Banner */}
                  <div className="flex flex-wrap justify-between items-center gap-1.5 px-1">
                    <span className="font-mono text-[8px] text-text-muted uppercase tracking-wider font-bold">
                      MATCHING DATABASE ROSTER ({adminProfiles.length} OF {profiles.length} ITEMS)
                    </span>
                    {(adminSchoolFilter !== 'ALL' || adminTierFilter !== 'ALL' || adminRoleFilter !== 'ALL' || adminStatusFilter !== 'ALL' || adminSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminSchoolFilter('ALL');
                          setAdminTierFilter('ALL');
                          setAdminRoleFilter('ALL');
                          setAdminStatusFilter('ALL');
                          setAdminSearch('');
                        }}
                        className="font-mono text-[8px] text-status hover:text-status/80 uppercase tracking-wider font-bold cursor-pointer underline underline-offset-2"
                      >
                        RESET ACTIVE FILTERS
                      </button>
                    )}
                  </div>

                  {/* Members roster spreadsheet view */}
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-widest text-text-muted">
                      <span>Roster Spreadsheet Roster</span>
                      <span className="lg:hidden text-accent animate-pulse font-bold">↔ SWIPE HORIZONTALLY TO VIEW ALL COLUMNS</span>
                    </div>
                    <div className="border border-border bg-bg flex flex-col overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-border [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-bg [&::-webkit-scrollbar-thumb]:bg-border">
                      <div className="min-w-[980px]">
                        <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-card border-b border-border font-mono text-[8px] text-text-muted uppercase tracking-widest font-bold">
                          <div className="col-span-3">CODM PROFILE</div>
                          <div className="col-span-2">INSTAGRAM</div>
                          <div className="col-span-2">SCHOOL</div>
                          <div className="col-span-2">TIER / ROLE</div>
                          <div className="col-span-1 text-center">STATUS</div>
                          <div className="col-span-2 text-right">QUICK ACTIONS</div>
                        </div>

                        <div className="divide-y divide-border max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-bg scrollbar-thumb-border [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-bg [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-accent/45">
                      {adminProfiles.length === 0 ? (
                        <div className="p-12 text-center font-mono text-[10px] text-text-muted uppercase">
                          No matching registered profiles found. Try adjusting your query parameters.
                        </div>
                      ) : (
                        adminProfiles.slice((adminPage - 1) * adminPageSize, adminPage * adminPageSize).map((profile, idx) => {
                          const matchedTier = TIERS.find(t => t.id === profile.tierId) || TIERS[0];
                          const handleLower = profile.instagram.toLowerCase();
                          const lInfo = lockouts[handleLower];
                          const isLocked = lInfo && lInfo.lockUntil && new Date(lInfo.lockUntil).getTime() > Date.now();
                          const actualIdx = (adminPage - 1) * adminPageSize + idx + 1;
                          const isUserAdmin = (profile.role || 'user') === 'admin';
                          const isUserBanned = (profile.status || 'active') === 'banned';

                          return (
                            <div key={profile.instagram} className="grid grid-cols-12 gap-1 px-4 py-3 items-center hover:bg-card/40 font-mono text-[10px]">
                              {/* Nickname / Name */}
                              <div 
                                className="col-span-3 font-sans font-bold text-text-primary truncate flex items-center gap-1.5 cursor-pointer hover:text-text-primary/80 transition-colors"
                                onClick={() => setAdminSelectedProfileForDetail(profile)}
                                title="Click to view details dossier & logs"
                              >
                                <span className="text-text-muted text-[9px] font-mono">{actualIdx}.</span>
                                {isUserAdmin && <Crown className="w-3 h-3 text-accent shrink-0" title="System Administrator" />}
                                <span className="truncate">{profile.codmName}</span>
                              </div>

                              {/* Instagram info */}
                              <div className="col-span-2 text-text-muted truncate text-[10px] lowercase">
                                {profile.instagram}
                              </div>

                              {/* School info */}
                              <div className="col-span-2">
                                {profile.school ? (
                                  <span className="inline-block bg-card border border-border px-1.5 py-0.5 text-[7px] text-text-muted font-bold uppercase tracking-wider rounded-none">
                                    {profile.school}
                                  </span>
                                ) : (
                                  <span className="text-text-muted/65 text-[8px]">—</span>
                                )}
                              </div>

                              {/* Tier & Role column */}
                              <div className="col-span-2 flex flex-wrap items-center gap-1">
                                <span className={`inline-block px-1.5 py-0.5 text-[7px] uppercase font-bold tracking-wide border ${
                                  profile.tierId === 'tier400' 
                                    ? 'bg-amber-950/40 text-amber-400 border-amber-900/40' 
                                    : profile.tierId === 'tier300' 
                                    ? 'bg-accent/10 text-accent border-accent/25'
                                    : profile.tierId === 'tier200' 
                                    ? 'bg-status/10 text-status border-status/25'
                                    : 'bg-card text-text-muted border-border'
                                }`}>
                                  {matchedTier.name.replace('Tier ', 'T')}
                                </span>
                                <span className={`inline-block px-1 py-0.5 text-[6px] uppercase font-bold border rounded-none ${
                                  isUserAdmin ? 'bg-accent/10 text-accent border-accent/20' : 'bg-card text-text-muted border-border'
                                }`}>
                                  {profile.role || 'USER'}
                                </span>
                              </div>

                              {/* Status column */}
                              <div className="col-span-1 text-center">
                                {profile.status === 'pending' ? (
                                  <span className="inline-block px-1 py-0.5 text-[7px] font-bold uppercase rounded-none tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    PENDING
                                  </span>
                                ) : isUserBanned ? (
                                  <span className="inline-block px-1 py-0.5 text-[7px] font-bold uppercase rounded-none tracking-wider bg-status/10 text-status border border-status/20 animate-pulse">
                                    BANNED
                                  </span>
                                ) : (
                                  <span className="inline-block px-1 py-0.5 text-[7px] font-bold uppercase rounded-none tracking-wider bg-accent/10 text-accent border border-accent/20">
                                    ACTIVE
                                  </span>
                                )}
                              </div>

                              {/* Action controls */}
                              <div className="col-span-2 text-right flex items-center justify-end gap-1 shrink-0 font-mono">
                                {isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdminResetLockout(profile.instagram)}
                                    className="px-1 py-0.5 border border-status/30 text-status text-[7px] uppercase font-bold hover:bg-status/10 transition-colors cursor-pointer shrink-0"
                                    title="Unlock Locked Pin Account"
                                  >
                                    UNLOCK
                                  </button>
                                )}

                                {/* Confirm Payment / Mark He Paid & Is Now In */}
                                <button
                                  type="button"
                                  onClick={() => handleAdminApprovePayment(profile.instagram)}
                                  disabled={profile.status === 'active'}
                                  className={`p-1 border transition-all rounded-none cursor-pointer ${
                                    profile.status === 'active'
                                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500/40 cursor-default'
                                      : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300 animate-pulse'
                                  }`}
                                  title={profile.status === 'active' ? "Payment Confirmed & Verified" : "Verify Payment & Confirm Entry"}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>

                                {/* Issue Policy Warning */}
                                <button
                                  type="button"
                                  onClick={() => handleAdminWarnUser(profile.instagram)}
                                  disabled={profile.status === 'banned'}
                                  className={`p-1 border relative transition-all rounded-none cursor-pointer ${
                                    profile.status === 'banned'
                                      ? 'border-amber-500/20 bg-amber-500/5 text-amber-500/30 cursor-default'
                                      : 'border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/25'
                                  }`}
                                  title={`Issue Warning Banner (Current: ${profile.warnings || 0}/2 warnings)`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  {profile.warnings && profile.warnings > 0 ? (
                                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-bg text-[6px] font-black w-2.5 h-2.5 rounded-full flex items-center justify-center">
                                      {profile.warnings}
                                    </span>
                                  ) : null}
                                </button>

                                {/* Dossier detailed modal view button */}
                                <button
                                  type="button"
                                  onClick={() => setAdminSelectedProfileForDetail(profile)}
                                  className="p-1 border border-border hover:border-accent text-text-muted hover:text-text-primary transition-all rounded-none cursor-pointer"
                                  title="View Full Profile Details & Logs"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Toggle status (Ban / Unban) button */}
                                <button
                                  type="button"
                                  onClick={() => handleAdminToggleStatus(profile.instagram)}
                                  className={`p-1 border transition-all rounded-none cursor-pointer ${
                                    isUserBanned 
                                      ? 'border-accent/40 bg-accent/5 text-accent hover:bg-accent/25'
                                      : 'border-status/40 bg-status/5 text-status hover:bg-status/25'
                                  }`}
                                  title={isUserBanned ? "Activate Profile" : "Ban Profile"}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>

                                {/* Toggle system role (Promote / Demote) button */}
                                <button
                                  type="button"
                                  onClick={() => handleAdminToggleRole(profile.instagram)}
                                  className={`p-1 border transition-all rounded-none cursor-pointer ${
                                    isUserAdmin 
                                      ? 'border-border text-text-muted hover:text-text-primary hover:border-accent'
                                      : 'border-accent/40 bg-accent/5 text-accent hover:bg-accent/20'
                                  }`}
                                  title={isUserAdmin ? "Demote to Roster User" : "Promote to Administrator"}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>

                                {/* Remove / Delete button */}
                                <button
                                  type="button"
                                  onClick={() => handleAdminDeleteProfile(profile.instagram)}
                                  className="p-1 bg-status/5 hover:bg-status/20 border border-status/30 hover:border-status text-status transition-all duration-150 rounded-none cursor-pointer shrink-0"
                                  title="Delete Profile Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-bg border border-border border-t-0 font-mono text-[9px]">
                    <div className="text-text-muted uppercase font-bold">
                      Showing {adminProfiles.length > 0 ? (adminPage - 1) * adminPageSize + 1 : 0}-{Math.min(adminPage * adminPageSize, adminProfiles.length)} of {adminProfiles.length} matching entries
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Page Size Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-muted/70 uppercase font-bold text-[8px]">Per Page:</span>
                        <select
                          value={adminPageSize}
                          onChange={(e) => {
                            setAdminPageSize(Number(e.target.value));
                            setAdminPage(1);
                          }}
                          className="bg-card text-text-primary border border-border font-mono text-[8px] uppercase font-bold py-0.5 px-1 focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value={5} className="bg-card text-text-primary">5 ITEMS</option>
                          <option value={10} className="bg-card text-text-primary">10 ITEMS</option>
                          <option value={20} className="bg-card text-text-primary">20 ITEMS</option>
                          <option value={50} className="bg-card text-text-primary">50 ITEMS</option>
                          <option value={100} className="bg-card text-text-primary">100 ITEMS</option>
                          <option value={9999} className="bg-card text-text-primary">ALL / SCROLLABLE</option>
                        </select>
                      </div>
                      {/* Page Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={adminPage === 1}
                          onClick={() => setAdminPage(prev => Math.max(1, prev - 1))}
                          className={`px-2 py-1 border font-bold uppercase transition-all ${
                            adminPage === 1
                              ? 'border-border text-text-muted/40 cursor-not-allowed'
                              : 'border-border hover:border-accent text-text-primary cursor-pointer'
                          }`}
                        >
                          Prev
                        </button>
                        <span className="text-text-muted font-bold px-2 font-mono">
                          {adminPage} / {Math.ceil(adminProfiles.length / adminPageSize) || 1}
                        </span>
                        <button
                          type="button"
                          disabled={adminPage === (Math.ceil(adminProfiles.length / adminPageSize) || 1)}
                          onClick={() => setAdminPage(prev => Math.min(Math.ceil(adminProfiles.length / adminPageSize) || 1, prev + 1))}
                          className={`px-2 py-1 border font-bold uppercase transition-all ${
                            adminPage === (Math.ceil(adminProfiles.length / adminPageSize) || 1)
                              ? 'border-border text-text-muted/40 cursor-not-allowed'
                              : 'border-border hover:border-accent text-text-primary cursor-pointer'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* System database controls bar */}
                  <div className="p-4 bg-bg border border-border space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <p className="font-mono text-[9px] text-text-muted uppercase font-bold">DATABASE RE-SEED OPERATIONS</p>
                        <p className="font-sans text-[9px] text-text-muted/60 uppercase mt-0.5">Re-populate pre-registered mock rosters or empty the active database list.</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleAdminResetMocks}
                          className="px-2.5 py-1.5 border border-border hover:border-accent text-text-muted hover:text-text-primary font-mono text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          RESTORE MOCKS
                        </button>
                        <button
                          type="button"
                          onClick={handleAdminClearAll}
                          className="px-2.5 py-1.5 border border-status/30 hover:bg-status/10 text-status font-mono text-[8px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          WIPE REGISTERED
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem('sector_admin_token');
                            localStorage.removeItem('sector_admin_username');
                            setIsAdminAuthenticated(false);
                            setAdminPasscode('');
                            setAdminError('');
                            setAdminUsername('');
                          }}
                          className="font-mono text-[9px] text-text-muted hover:text-text-primary uppercase transition-colors tracking-widest cursor-pointer"
                        >
                          [ Lock Console Session ]
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAdminOpen(false);
                            setAdminPasscode('');
                            setAdminError('');
                          }}
                          className="font-mono text-[9px] text-status hover:text-status/80 uppercase transition-colors tracking-widest cursor-pointer font-bold"
                        >
                          [ EXIT CONSOLE ]
                        </button>
                      </div>
                      <p className="font-mono text-[8px] text-text-muted/50 uppercase">
                        Active Terminal ID: SCTR-ADM-09
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* CUSTOM USER DETAILS MODAL */}
        {adminSelectedProfileForDetail && (
          <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B0A0F]/95 backdrop-blur-md p-4 flex justify-center items-start sm:items-center"
            onClick={() => setAdminSelectedProfileForDetail(null)}
          >
            <div
              className="bg-card border border-border p-6 md:p-8 max-w-2xl w-full relative space-y-6 text-left my-4 sm:my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-accent" />

              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-5 h-5 text-text-primary" />
                  <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest font-bold">
                    SECURED SYSTEM USER PROFILE DOSSIER
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminSelectedProfileForDetail(null)}
                  className="font-mono text-[9px] text-text-muted hover:text-text-primary uppercase transition-colors tracking-widest cursor-pointer"
                >
                  [ CLOSE ]
                </button>
              </div>

              {/* Grid content split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Profile Identity Details (col-span-6) */}
                <div className="md:col-span-6 space-y-4 font-mono text-[11px]">
                  <span className="text-[8px] text-text-muted uppercase tracking-widest font-bold block">IDENTITY METRICS:</span>
                  <div className="space-y-2 border border-border p-3 bg-bg">
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">CODM ALIAS:</span>
                      <span className="text-text-primary font-bold">{adminSelectedProfileForDetail.codmName}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">INSTAGRAM:</span>
                      <span className="text-text-primary hover:underline cursor-pointer lowercase">{adminSelectedProfileForDetail.instagram}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">SCHOOL:</span>
                      <span className="text-text-primary font-bold uppercase">{adminSelectedProfileForDetail.school || 'NOT SPECIFIED'}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">TIER ASSIGNED:</span>
                      <span className="text-text-primary font-bold uppercase">
                        {TIERS.find(t => t.id === adminSelectedProfileForDetail.tierId)?.name || 'NONE'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">REVENUE GENERATED:</span>
                      <span className="text-accent font-bold">
                        {isFreeUser(adminSelectedProfileForDetail.instagram) ? 'FREE ACCESS' : adminSelectedProfileForDetail.saleRemoved ? '₹0 (VOIDED)' : `₹${TIERS.find(t => t.id === adminSelectedProfileForDetail.tierId)?.price || 0}`}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">SECURITY PIN:</span>
                      <span className="text-accent font-bold tracking-widest">{adminSelectedProfileForDetail.securityPin}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">SECURITY ROLE:</span>
                      <span className="text-text-primary font-bold uppercase">{adminSelectedProfileForDetail.role || 'user'}</span>
                    </div>
                    <div className="flex justify-between border-b border-border pb-1.5">
                      <span className="text-text-muted">WARNING COUNTER:</span>
                      <span className={`font-bold uppercase ${adminSelectedProfileForDetail.warnings && adminSelectedProfileForDetail.warnings >= 2 ? 'text-status animate-pulse' : 'text-amber-500'}`}>
                        {adminSelectedProfileForDetail.warnings || 0} / 2 WARNINGS
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">LOCKOUT STATUS:</span>
                      <span className="text-text-primary font-bold uppercase">
                        {(() => {
                          const hLower = adminSelectedProfileForDetail.instagram.toLowerCase();
                          const lInfo = lockouts[hLower];
                          const isLocked = lInfo && lInfo.lockUntil && new Date(lInfo.lockUntil).getTime() > Date.now();
                          return isLocked ? 'TEMPORARILY LOCKED' : 'UNLOCKED / ACTIVE';
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[8px] text-text-muted uppercase tracking-widest font-bold block">REGISTRATION TIMELINE:</span>
                    <p className="font-sans text-[10px] text-text-muted/85 leading-normal bg-bg p-2.5 border border-border">
                      Profile registered on <span className="font-mono text-text-primary text-[9px] font-bold">{new Date(adminSelectedProfileForDetail.registeredAt || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> with verified Instagram link.
                    </p>
                  </div>
                </div>

                {/* Profile Activities (col-span-6) */}
                <div className="md:col-span-6 flex flex-col space-y-4">
                  <div>
                    <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest font-bold block">SYSTEM ACTIVITY LOGS:</span>
                    <p className="font-sans text-[9px] text-text-muted/60 uppercase mt-0.5">Incremental state alterations recorded inside local ledger</p>
                  </div>

                  <div className="border border-border bg-bg divide-y divide-card flex-1 overflow-y-auto max-h-[200px] font-mono text-[9px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-bg [&::-webkit-scrollbar-thumb]:bg-border">
                    {!adminSelectedProfileForDetail.recentActivity || adminSelectedProfileForDetail.recentActivity.length === 0 ? (
                      <div className="p-8 text-center text-text-muted/40 uppercase">
                        No recorded ledger history found for this slot
                      </div>
                    ) : (
                      adminSelectedProfileForDetail.recentActivity.map((act, aIdx) => (
                        <div key={aIdx} className="p-2.5 space-y-1 hover:bg-card/40">
                          <div className="text-text-primary font-bold uppercase leading-tight">
                            {act.action}
                          </div>
                          <div className="text-text-muted/70 text-[8px]">
                            {new Date(act.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick-action buttons directly within detail drawer */}
                  <div className="space-y-2">
                    <span className="font-mono text-[8px] text-text-muted uppercase tracking-widest font-bold block">
                      ADMIN COMMAND INTERACTION CONSOLE:
                    </span>
                    <div className="max-h-[170px] overflow-y-auto pr-1 border border-border/40 bg-bg/50 p-2 space-y-2 scrollbar-thin scrollbar-thumb-border">
                      <div className="grid grid-cols-2 gap-2 font-mono text-[8px]">
                        <button
                          type="button"
                          onClick={() => handleAdminToggleStatus(adminSelectedProfileForDetail.instagram)}
                          className={`py-2.5 px-2 border uppercase font-bold tracking-wider text-center cursor-pointer transition-colors ${
                            (adminSelectedProfileForDetail.status || 'active') === 'banned'
                              ? 'border-accent bg-accent/10 text-accent hover:bg-accent hover:text-bg'
                              : 'border-status/40 bg-status/5 text-status hover:bg-status hover:text-bg'
                          }`}
                        >
                          {(adminSelectedProfileForDetail.status || 'active') === 'banned' ? '🔓 Activate / Unban' : '🚫 Ban Profile'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleAdminToggleRole(adminSelectedProfileForDetail.instagram)}
                          className="py-2.5 px-2 border border-border bg-card text-text-primary hover:border-accent hover:text-accent uppercase font-bold tracking-wider text-center cursor-pointer transition-colors"
                        >
                          ⚙️ Toggle Role
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdminApprovePayment(adminSelectedProfileForDetail.instagram)}
                          disabled={adminSelectedProfileForDetail.status === 'active'}
                          className={`py-2.5 px-2 border uppercase font-bold tracking-wider text-center transition-colors col-span-2 ${
                            adminSelectedProfileForDetail.status === 'active'
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500/40 cursor-default'
                              : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-bg cursor-pointer'
                          }`}
                        >
                          {adminSelectedProfileForDetail.status === 'active' ? '✓ Paid & Authorized' : '💵 Verify Payment / Approve'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdminWarnUser(adminSelectedProfileForDetail.instagram)}
                          className="py-2.5 px-2 border border-amber-500/40 bg-amber-500/5 text-amber-500 hover:bg-amber-500 hover:text-bg uppercase font-bold tracking-wider text-center cursor-pointer transition-colors"
                        >
                          ⚠️ Warn User ({adminSelectedProfileForDetail.warnings || 0}/3)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdminReduceWarnings(adminSelectedProfileForDetail.instagram)}
                          disabled={!adminSelectedProfileForDetail.warnings}
                          className={`py-2.5 px-2 border uppercase font-bold tracking-wider text-center transition-colors ${
                            !adminSelectedProfileForDetail.warnings
                              ? 'border-border/35 text-text-muted/30 cursor-not-allowed bg-transparent'
                              : 'border-indigo-500/40 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500 hover:text-bg cursor-pointer'
                          }`}
                        >
                          🤝 Reduce Warnings
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdminClearWarnings(adminSelectedProfileForDetail.instagram)}
                          disabled={!adminSelectedProfileForDetail.warnings}
                          className={`py-2.5 px-2 border col-span-2 uppercase font-bold tracking-wider text-center transition-colors ${
                            !adminSelectedProfileForDetail.warnings
                              ? 'border-border/35 text-text-muted/30 cursor-not-allowed bg-transparent'
                              : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500 hover:text-bg cursor-pointer'
                          }`}
                        >
                          🔄 Clear All Warning Counts
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAdminSelectedProfileForDetail(null)}
                  className="px-5 py-2.5 bg-accent text-bg font-mono text-[9px] uppercase tracking-widest font-bold hover:bg-accent-hover transition-colors cursor-pointer"
                >
                  Terminate Dossier View
                </button>
              </div>
            </div>
          </div>
        )}

      {/* PERSONAL SUB-REVENUE DASHBOARD MODAL */}
        {selectedFounder && (
          <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B0A0F]/95 backdrop-blur-md p-4 flex justify-center items-start sm:items-center"
            onClick={() => {
              setSelectedFounder(null);
              setFounderPasscodeInput('');
              setFounderPasscodeError('');
            }}
          >
            <div
              className="bg-card border border-border p-6 md:p-8 max-w-lg w-full relative space-y-6 text-left font-mono my-4 sm:my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-accent" />

              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                    SUB-REVENUE DOSSIER // {selectedFounder === 'gephs' ? 'GEPH' : selectedFounder.toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFounder(null);
                    setFounderPasscodeInput('');
                    setFounderPasscodeError('');
                  }}
                  className="text-[9px] text-text-muted hover:text-text-primary uppercase transition-colors tracking-widest cursor-pointer"
                >
                  [ CLOSE ]
                </button>
              </div>

              {/* SHOW TOTAL NET PROFIT ACCUMULATED ONLY WHEN UNLOCKED */}
              {unlockedFounders[selectedFounder] && (
                <div className="p-4 bg-accent/10 border border-accent/20 space-y-1">
                  <span className="text-[8px] text-accent tracking-widest font-bold uppercase block">
                    TOTAL NET PROFIT ACCUMULATED (SYSTEM GLOBAL)
                  </span>
                  <span className="text-2xl font-black text-accent block font-sans">
                    ₹{calculateNetProfit()}
                  </span>
                  <p className="text-[8px] text-text-muted uppercase">
                    Real-time aggregated ledger balance across all active tiers
                  </p>
                </div>
              )}

              {/* CONDITIONAL CONTENT: LOCKED VS UNLOCKED */}
              {!unlockedFounders[selectedFounder] ? (
                /* LOCKED SCREEN */
                <div className="space-y-4">
                  <div className="p-3 bg-status/10 border border-status/20 text-center space-y-1">
                    <span className="text-status font-bold text-[9px] tracking-wider uppercase block">
                      ⚠ [ SECURITY WARNING ]
                    </span>
                    <p className="text-text-muted text-[8px] uppercase leading-tight">
                      This partition is restricted. Individual margin shares require specialized decryption passcodes.
                    </p>
                  </div>

                  <form onSubmit={handleUnlockFounder} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[8px] text-text-muted uppercase tracking-wider font-bold block">
                        ENTER PRIVATE PASSCODE FOR {selectedFounder === 'gephs' ? 'GEPH' : selectedFounder.toUpperCase()}:
                      </label>
                      <div className="relative">
                        <input
                          type={showFounderPasscode ? "text" : "password"}
                          required
                          value={founderPasscodeInput}
                          onChange={(e) => {
                            setFounderPasscodeInput(e.target.value);
                            setFounderPasscodeError('');
                          }}
                          placeholder="••••••••"
                          className="w-full bg-bg border border-border text-text-primary font-mono text-xs py-2 pl-3 pr-12 focus:outline-none focus:border-accent uppercase tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFounderPasscode(!showFounderPasscode)}
                          className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-text-muted hover:text-text-primary focus:outline-none border-l border-border/40 bg-card/40 transition-colors"
                          title={showFounderPasscode ? "Hide Passcode" : "Show Passcode"}
                        >
                          {showFounderPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {founderPasscodeError && (
                      <div className="text-[8px] text-status font-bold uppercase tracking-wider animate-pulse">
                        {founderPasscodeError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 bg-accent hover:bg-[#33F3FF] text-[#0B0A0F] font-bold uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                    >
                      [ DECRYPT & AUTHORIZE ACCESS ]
                    </button>
                  </form>
                </div>
              ) : (
                /* UNLOCKED SCREEN */
                <div className="space-y-4">
                  {/* UNLOCKED BADGE */}
                  <div className="flex items-center gap-1.5 p-2 bg-accent/10 border border-accent/20">
                    <Unlock className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-[8px] text-accent uppercase font-bold tracking-widest">
                      ACCESS GRANTED // PRIVATE REVENUE SPLIT ACTIVE
                    </span>
                  </div>

                  {/* PERSONAL EARNINGS CARD */}
                  <div className="p-4 bg-bg border border-border flex items-center justify-between">
                    <div>
                      <span className="text-[8px] text-text-muted tracking-wider font-bold uppercase block">
                        PERSONAL NET PROFIT ACCUMULATED
                      </span>
                      <span className="text-xl font-black text-accent font-sans block mt-0.5">
                        ₹{calculateShare(selectedFounder)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-text-muted tracking-wider font-bold uppercase block">
                        MARGIN CONTRIBUTION
                      </span>
                      <span className="text-sm font-black text-text-primary font-sans block mt-0.5">
                        {((calculateShare(selectedFounder) / (calculateNetProfit() || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* TIER-BY-TIER BREAKDOWN */}
                  <div className="space-y-2">
                    <span className="text-[8px] text-text-muted uppercase tracking-wider font-bold block">
                      TIER-BY-TIER MARGIN BREAKDOWN
                    </span>
                    <div className="border border-border bg-bg divide-y divide-card text-[9px]">
                      {TIERS.map(t => {
                        const count = profiles.filter(p => !isFreeUser(p.instagram) && !p.saleRemoved && p.tierId === t.id).length;
                        
                        // Calculate rate per sale
                        let rate = 0;
                        if (t.id === 'tier400') {
                          if (selectedFounder === 'jiji') rate = 120;
                          if (selectedFounder === 'nedupla') rate = 50;
                          if (selectedFounder === 'anandita') rate = 50;
                          if (selectedFounder === 'gephs') rate = 179;
                        } else if (t.id === 'tier300') {
                          if (selectedFounder === 'jiji') rate = 90;
                          if (selectedFounder === 'nedupla') rate = 37;
                          if (selectedFounder === 'anandita') rate = 37;
                          if (selectedFounder === 'gephs') rate = 135;
                        } else if (t.id === 'tier200') {
                          if (selectedFounder === 'jiji') rate = 60;
                          if (selectedFounder === 'nedupla') rate = 25;
                          if (selectedFounder === 'anandita') rate = 25;
                          if (selectedFounder === 'gephs') rate = 89;
                        } else if (t.id === 'tier100') {
                          if (selectedFounder === 'jiji') rate = 30;
                          if (selectedFounder === 'nedupla') rate = 12;
                          if (selectedFounder === 'anandita') rate = 12;
                          if (selectedFounder === 'gephs') rate = 45;
                        }

                        const subTotal = count * rate;

                        return (
                          <div key={t.id} className="flex justify-between items-center p-2 hover:bg-card/40">
                            <div>
                              <span className="text-text-primary font-bold block uppercase">{t.name}</span>
                              <span className="text-text-muted text-[8px] uppercase">
                                QTY: {count} × RATE: ₹{rate}
                              </span>
                            </div>
                            <span className="text-accent font-bold font-sans">
                              ₹{subTotal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RE-LOCK ACTION */}
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockedFounders(prev => ({ ...prev, [selectedFounder]: false }));
                    }}
                    className="w-full py-1.5 border border-status/35 hover:bg-status/10 text-status font-bold uppercase tracking-widest text-[8px] transition-colors cursor-pointer text-center block"
                  >
                    [ RE-LOCK REVENUE DOSSIER ]
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFounder(null);
                    setFounderPasscodeInput('');
                    setFounderPasscodeError('');
                  }}
                  className="px-4 py-2 bg-bg text-text-muted hover:text-text-primary text-[8px] uppercase tracking-widest font-bold border border-border transition-colors cursor-pointer"
                >
                  TERMINATE DOSSIER VIEW
                </button>
              </div>
            </div>
          </div>
        )}

      {/* CUSTOM ADMIN PROFILE DELETE CONFIRMATION MODAL */}
        {adminProfileToDelete && (
          <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B0A0F]/95 backdrop-blur-md p-4 flex justify-center items-start sm:items-center"
            onClick={() => setAdminProfileToDelete(null)}
          >
            <div
              className="bg-card border border-status/40 p-6 md:p-8 max-w-md w-full relative space-y-6 text-left my-4 sm:my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-status" />

              <div className="flex items-center gap-2.5 border-b border-border pb-4">
                <ShieldAlert className="w-5 h-5 text-status animate-pulse shrink-0" />
                <span className="font-mono text-[9px] text-status uppercase tracking-widest font-bold">
                  WARNING // CRITICAL DELETION DESYNC
                </span>
              </div>

              <div className="space-y-4">
                <p className="font-sans text-text-muted text-xs uppercase leading-relaxed">
                  You are initiating a <span className="text-status font-bold">permanent destruction command</span> against the following member profile slot:
                </p>

                <div className="p-4 bg-bg border border-status/25 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">CODM PLAYER:</span>
                    <span className="text-text-primary font-bold">{adminProfileToDelete.codmName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">INSTAGRAM:</span>
                    <span className="text-status font-bold lowercase">{adminProfileToDelete.instagram}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">REGISTRATION DATE:</span>
                    <span className="text-text-primary">{adminProfileToDelete.registeredAt}</span>
                  </div>
                </div>

                <p className="font-sans text-text-muted text-[10px] uppercase leading-normal">
                  ⚠️ This will immediately purge their session logs, revoke access permits, delete metadata, and terminate billing/sales records. This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAdminConfirmDelete}
                  className="w-full py-3 bg-status hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Confirm Destruction
                </button>
                <button
                  type="button"
                  onClick={() => setAdminProfileToDelete(null)}
                  className="w-full py-3 border border-border hover:border-accent text-text-muted hover:text-text-primary font-mono text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Abort Operation
                </button>
              </div>
            </div>
          </div>
        )}

      {/* CUSTOM USER SELF DELETE CONFIRMATION MODAL */}
        {isSelfDeleteOpen && loggedInProfile && (
          <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B0A0F]/95 backdrop-blur-md p-4 flex justify-center items-start sm:items-center"
            onClick={() => setIsSelfDeleteOpen(false)}
          >
            <div
              className="bg-card border border-status/45 p-6 md:p-8 max-w-md w-full relative space-y-6 text-left my-4 sm:my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-status" />

              <div className="flex items-center gap-2.5 border-b border-border pb-4">
                <ShieldAlert className="w-5 h-5 text-status animate-pulse shrink-0" />
                <span className="font-mono text-[9px] text-status uppercase tracking-widest font-bold">
                  PERMANENT DELETION WARNING
                </span>
              </div>

              <div className="space-y-4">
                <p className="font-sans text-text-muted text-xs uppercase leading-relaxed">
                  Are you absolutely sure you want to <span className="text-status font-bold">DELETE your registered player profile</span>?
                </p>

                <div className="p-4 bg-bg border border-status/25 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">CODM NAME:</span>
                    <span className="text-text-primary font-bold">{loggedInProfile.codmName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">INSTAGRAM:</span>
                    <span className="text-text-primary font-bold">{loggedInProfile.instagram}</span>
                  </div>
                </div>

                <p className="font-sans text-text-muted text-[10px] uppercase leading-normal">
                  ⚠️ Wiping your profile is IRREVERSIBLE. It will completely erase you from the active roster directory, clear your views analytics, and invalidate your Instagram chat bio authentication access.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSelfConfirmDelete}
                  className="w-full py-3 bg-status hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Wipe Profile Permanently
                </button>
                <button
                  type="button"
                  onClick={() => setIsSelfDeleteOpen(false)}
                  className="w-full py-3 border border-border hover:border-accent text-text-muted hover:text-text-primary font-mono text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Abort / Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ACCESS HUB MODAL OVERLAY */}
        {isLoginOpen && (
          <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-[#0B0A0F]/95 backdrop-blur-md p-4 flex justify-center items-start sm:items-center"
            onClick={() => setIsLoginOpen(false)}
          >
            <div
              className="bg-card border border-border p-6 md:p-8 max-w-md w-full relative space-y-6 text-left my-4 sm:my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top border highlight decoration */}
              <div className="absolute top-0 inset-x-0 h-1 bg-accent" />
              
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-accent" />
                  ACCESS HUB CONSOLE // SECURE VERIFIED
                </span>
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(false)}
                  className="font-mono text-[9px] text-text-muted hover:text-text-primary uppercase transition-colors cursor-pointer border border-border px-2 py-1 bg-bg hover:border-accent"
                >
                  [ CLOSE ]
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6 text-left">
                <div>
                  <h3 className="font-sans font-black text-lg text-text-primary uppercase tracking-tight" style={{ letterSpacing: '-0.03em' }}>
                    ACCESS HUB LOGIN.
                  </h3>
                  <p className="font-sans text-text-muted font-light text-[10px] mt-1 uppercase leading-relaxed">
                    Check your active slot status, analytics, and direct group chat credentials using your Security PIN.
                  </p>
                </div>

                <div className="space-y-4">
                  {loginError && (
                    <div className="p-3 bg-status/10 border border-status/20 text-status font-mono text-[11px] leading-snug uppercase">
                      ⚠️ {loginError}
                    </div>
                  )}

                  {/* Instagram Handle */}
                  <div>
                    <label className="block font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5">
                      Instagram Handle
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., @yourname"
                      required
                      value={loginInstagram}
                      onChange={(e) => setLoginInstagram(e.target.value)}
                      className="w-full px-4 py-3 bg-bg border border-border rounded-none font-mono text-xs text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  {/* Security PIN */}
                  <div>
                    <label className="block font-mono text-[9px] text-text-muted uppercase tracking-widest mb-1.5 flex justify-between">
                      <span>Security PIN</span>
                      <span className="text-text-muted font-bold">{loginPin.length}/4</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showUserPin ? "text" : "password"}
                        placeholder="e.g., 1234"
                        required
                        maxLength={4}
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full pl-4 pr-12 py-3 bg-bg border border-border rounded-none font-mono text-xs text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPin(!showUserPin)}
                        className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-text-muted hover:text-text-primary focus:outline-none border-l border-border/40 bg-card/40 transition-colors"
                        title={showUserPin ? "Hide PIN" : "Show PIN"}
                      >
                        {showUserPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="font-sans text-text-muted/60 text-[9px] mt-1.5 leading-normal uppercase">
                      Enter the exactly 4-digit secret pin created during registration. PIN matches are securely verified.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-accent text-bg font-mono text-xs font-bold uppercase tracking-widest rounded-none border border-transparent hover:bg-accent-hover transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
                  >
                    <LogIn className="w-4 h-4" />
                    Authenticate PIN
                  </button>
                  
                  <div className="p-3.5 bg-bg border border-border flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p className="font-sans text-[10px] text-text-muted leading-normal uppercase">
                      🔐 PIN Safe & Secured: Connection is fully secured. Access slots are only accessible by users holding the correct credential PIN.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Minimalist Footer */}
      <footer className="py-20 border-t border-border bg-bg text-center font-sans">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8 text-text-muted text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-text-primary tracking-widest text-sm">SECTOR //</span>
          </div>
          
          <div className="flex flex-col md:text-right gap-1.5">
            <p className="font-light tracking-wide text-text-muted text-[11px]">
              © {new Date().getFullYear()} SECTOR NETWORK. All rights reserved.
            </p>
            <p className="text-[9px] text-text-muted/60 uppercase tracking-widest leading-relaxed max-w-sm md:max-w-none">
              This platform is not affiliated with Activision Publishing, Call of Duty, or Meta Platforms.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
