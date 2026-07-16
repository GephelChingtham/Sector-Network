import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";

interface Profile {
  instagram: string;
  codmName: string;
  tierId: 'tier100' | 'tier200' | 'tier300' | 'tier400';
  registeredAt: string;
  profileViews?: number;
  securityPin: string;
  saleRemoved?: boolean;
  school?: 'TNA' | 'GD Goenka';
  role?: 'admin' | 'user';
  status?: 'active' | 'banned' | 'pending';
  warnings?: number;
  recentActivity?: { action: string; timestamp: string }[];
  utrNumber?: string;
  screenshot?: string;
}

const DB_FILE = path.join(process.cwd(), "profiles_db.json");
const DELETED_FILE = path.join(process.cwd(), "deleted_profiles.json");

function getDeletedProfiles(): string[] {
  if (fs.existsSync(DELETED_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DELETED_FILE, "utf-8"));
    } catch (e) {
      return [];
    }
  }
  return [];
}

function addDeletedProfile(instagram: string) {
  const list = getDeletedProfiles();
  const normalized = instagram.trim().toLowerCase();
  if (!list.includes(normalized)) {
    list.push(normalized);
    fs.writeFileSync(DELETED_FILE, JSON.stringify(list, null, 2), "utf-8");
  }
}

// Helper to load profiles
function loadDB(): Profile[] {
  const deletedList = getDeletedProfiles();
  let db: Profile[] = [];
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading database file, using mock data", e);
    }
  }

  if (db.length === 0 && !fs.existsSync(DB_FILE)) {
  const seed: Profile[] = [
    {
      instagram: '@sct_alpha',
      codmName: 'ALPHA',
      tierId: 'tier400',
      registeredAt: '2026-07-10T12:00:00Z',
      profileViews: 384,
      securityPin: bcrypt.hashSync('7777', 10),
      school: 'TNA',
      role: 'admin',
      status: 'active',
      recentActivity: [
        { action: 'Logged into admin panel', timestamp: '2026-07-13T01:30:00Z' },
        { action: 'Updated tier status to Tier 4', timestamp: '2026-07-12T18:15:00Z' },
        { action: 'Registered under TNA school roster', timestamp: '2026-07-10T12:00:00Z' }
      ]
    },
    {
      instagram: '@cgphl',
      codmName: 'GEPHS',
      tierId: 'tier400',
      registeredAt: '2026-07-15T00:00:00Z',
      profileViews: 521,
      securityPin: bcrypt.hashSync('Zayden@08', 10),
      school: 'TNA',
      role: 'admin',
      status: 'active',
      recentActivity: [
        { action: 'Founder profile activated with Free Tier 4 privileges', timestamp: '2026-07-15T00:00:00Z' }
      ]
    },
    {
      instagram: '@jiji.gtk',
      codmName: 'JIJI',
      tierId: 'tier400',
      registeredAt: '2026-07-15T00:00:00Z',
      profileViews: 412,
      securityPin: bcrypt.hashSync('SECTORPASS', 10),
      school: 'TNA',
      role: 'admin',
      status: 'active',
      recentActivity: [
        { action: 'Founder profile activated with Free Tier 4 privileges', timestamp: '2026-07-15T00:00:00Z' }
      ]
    },
    {
      instagram: '@juino.57',
      codmName: 'ANANDITA',
      tierId: 'tier400',
      registeredAt: '2026-07-15T00:00:00Z',
      profileViews: 318,
      securityPin: bcrypt.hashSync('ilovekairi@125', 10),
      school: 'GD Goenka',
      role: 'admin',
      status: 'active',
      recentActivity: [
        { action: 'Founder profile activated with Free Tier 4 privileges', timestamp: '2026-07-15T00:00:00Z' }
      ]
    },
    {
      instagram: '@nedupla._.a',
      codmName: 'NEDUPLA',
      tierId: 'tier400',
      registeredAt: '2026-07-15T00:00:00Z',
      profileViews: 289,
      securityPin: bcrypt.hashSync('Cyberpunk', 10),
      school: 'GD Goenka',
      role: 'admin',
      status: 'active',
      recentActivity: [
        { action: 'Founder profile activated with Free Tier 4 privileges', timestamp: '2026-07-15T00:00:00Z' }
      ]
    },
    {
      instagram: '@codm_spectre',
      codmName: 'SPECTRE',
      tierId: 'tier300',
      registeredAt: '2026-07-11T14:23:00Z',
      profileViews: 142,
      securityPin: bcrypt.hashSync('1234', 10),
      school: 'GD Goenka',
      role: 'user',
      status: 'active',
      recentActivity: [
        { action: 'Viewed community leaderboard', timestamp: '2026-07-12T22:45:00Z' },
        { action: 'Updated security PIN code', timestamp: '2026-07-11T15:10:00Z' },
        { action: 'Purchased Red Verified + Stats tier', timestamp: '2026-07-11T14:23:00Z' }
      ]
    },
    {
      instagram: '@vortex_player',
      codmName: 'VORTEX',
      tierId: 'tier200',
      registeredAt: '2026-07-12T09:12:00Z',
      profileViews: 0,
      securityPin: bcrypt.hashSync('9999', 10),
      school: 'TNA',
      role: 'user',
      status: 'banned',
      recentActivity: [
        { action: 'Account flagged for code-of-conduct breach', timestamp: '2026-07-13T00:05:00Z' },
        { action: 'Registered under TNA school roster', timestamp: '2026-07-12T09:12:00Z' }
      ]
    },
    {
      instagram: '@reaper_09',
      codmName: 'REAPER',
      tierId: 'tier100',
      registeredAt: '2026-07-12T16:40:00Z',
      profileViews: 0,
      securityPin: bcrypt.hashSync('0000', 10),
      school: 'GD Goenka',
      role: 'user',
      status: 'active',
      recentActivity: [
        { action: 'Created member directory profile', timestamp: '2026-07-12T16:40:00Z' }
      ]
    }
  ];
    const filteredSeed = seed.filter(p => !deletedList.includes(p.instagram.toLowerCase()));
    db = filteredSeed;
    saveDB(db);
  }

  const finalFiltered = db.filter(p => !deletedList.includes(p.instagram.toLowerCase()));
  if (finalFiltered.length !== db.length) {
    saveDB(finalFiltered);
    db = finalFiltered;
  }
  return db;
}

// Helper to save profiles
function saveDB(profiles: Profile[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(profiles, null, 2), "utf-8");
}

// Memory structures for active sessions and login rate limits
const sessions = new Map<string, { instagram: string; role: 'admin' | 'user'; username?: string }>();
const loginFailures = new Map<string, { attempts: number; lockUntil: number }>();
const adminFailures = new Map<string, { attempts: number; lockUntil: number }>();
const founderFailures = new Map<string, { attempts: number; lockUntil: number }>();

function sanitizeProfile(profile: Profile) {
  const { securityPin, screenshot, utrNumber, ...rest } = profile;
  return rest;
}

const FREE_USERS = ['cgphl', 'juino.57', 'jiji.gtk', 'nedupla._.a'];
function isFreeUser(handle: string): boolean {
  if (!handle) return false;
  const normalized = handle.trim().toLowerCase().replace(/^@/, '');
  return FREE_USERS.includes(normalized);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Middleware to authenticate Bearer tokens
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = sessions.get(token);
      if (session) {
        (req as any).user = session;
      }
    }
    next();
  });

  // Endpoints:

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { instagram, pin } = req.body;
    if (!instagram || !pin) {
      return res.status(400).json({ error: "Instagram handle and security PIN are required." });
    }

    const normalized = (instagram.trim().startsWith('@') ? instagram.trim() : `@${instagram.trim()}`).toLowerCase();

    // Check rate limit
    const failure = loginFailures.get(normalized);
    if (failure && failure.lockUntil > Date.now()) {
      const remainingMins = Math.ceil((failure.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ error: `Account locked due to 5 failed attempts. Please try again in ${remainingMins} minutes.` });
    }

    const db = loadDB();
    const profile = db.find(p => p.instagram.toLowerCase() === normalized);

    if (!profile) {
      return res.status(404).json({ error: "No registered profile matches this Instagram handle." });
    }

    if (profile.status === 'banned') {
      return res.status(403).json({ error: "Your account is banned for a code-of-conduct breach." });
    }

    // Verify PIN (supports bcrypt hash and plaintext fallback for backwards compatibility)
    let isMatch = false;
    try {
      if (profile.securityPin.startsWith('$2a$') || profile.securityPin.startsWith('$2b$')) {
        isMatch = bcrypt.compareSync(pin, profile.securityPin);
      } else {
        isMatch = profile.securityPin === pin;
      }
    } catch (e) {
      isMatch = profile.securityPin === pin;
    }

    if (isMatch) {
      // Clear failure record
      loginFailures.delete(normalized);

      // Create session
      const token = crypto.randomBytes(24).toString("hex");
      sessions.set(token, { instagram: profile.instagram, role: profile.role || 'user' });

      // Add activity log
      profile.recentActivity = profile.recentActivity || [];
      profile.recentActivity.unshift({
        action: "Logged into profile",
        timestamp: new Date().toISOString()
      });
      if (profile.recentActivity.length > 10) profile.recentActivity.pop();
      saveDB(db);

      return res.json({ token, profile: sanitizeProfile(profile) });
    } else {
      // Increment failure rate limit
      const prevAttempts = failure ? failure.attempts : 0;
      const newAttempts = prevAttempts + 1;
      let lockUntil = 0;

      if (newAttempts >= 5) {
        lockUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
        loginFailures.set(normalized, { attempts: newAttempts, lockUntil });
        return res.status(423).json({ error: "Incorrect PIN. You have tried 5 times. Your account has been locked for 15 minutes." });
      } else {
        loginFailures.set(normalized, { attempts: newAttempts, lockUntil: 0 });
        return res.status(401).json({ error: `Incorrect PIN. Attempt ${newAttempts}/5. Account locks for 15 minutes after 5 failures.` });
      }
    }
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      sessions.delete(token);
    }
    res.json({ success: true });
  });

  // Register
  app.post("/api/register", (req, res) => {
    const { instagram, codmName, securityPin, school, tierId, utrNumber, screenshot } = req.body;

    if (!instagram || !codmName || !securityPin || !school || !tierId) {
      return res.status(400).json({ error: "Missing required registration parameters." });
    }

    const normalizedInsta = (instagram.trim().startsWith('@') ? instagram.trim() : `@${instagram.trim()}`);
    const normalizedInstaLower = normalizedInsta.toLowerCase();

    const db = loadDB();

    // Check duplicate profile
    if (db.some(p => p.instagram.toLowerCase() === normalizedInstaLower)) {
      return res.status(409).json({ error: `Instagram handle ${normalizedInsta} is already registered.` });
    }

    const isFree = isFreeUser(normalizedInstaLower);

    // 4. Server-side check on duplicate UPI transaction ID
    if (!isFree && utrNumber) {
      const trimmedUtr = utrNumber.trim();
      const duplicateUtr = db.some(p => p.utrNumber && p.utrNumber.trim() === trimmedUtr && !isFreeUser(p.instagram));
      if (duplicateUtr) {
        return res.status(409).json({ error: `PAYMENT VERIFICATION FAILED: The UPI transaction UTR "${trimmedUtr}" has already been used to register another profile.` });
      }
    }

    // Server-side check for limits
    if (isFree) {
      const freeCount = db.filter(p => p.school === school && isFreeUser(p.instagram)).length;
      if (freeCount >= 2) {
        return res.status(403).json({ error: `REGISTRATION BLOCKED: ${school} already has its split of 2 free founders registered.` });
      }
    } else {
      const paidTierCount = db.filter(p => p.school === school && p.tierId === tierId && !isFreeUser(p.instagram)).length;
      const tierLimit = tierId === 'tier100' ? 55 : tierId === 'tier200' ? 40 : tierId === 'tier300' ? 20 : 8;
      if (paidTierCount >= tierLimit) {
        return res.status(403).json({ error: `REGISTRATION BLOCKED: ${school} registrations for this tier are full (${paidTierCount}/${tierLimit} claimed).` });
      }

      const totalPaidCount = db.filter(p => p.school === school && !isFreeUser(p.instagram)).length;
      if (totalPaidCount >= 123) {
        return res.status(403).json({ error: `REGISTRATION BLOCKED: ${school} paid registrations are full (123/123 slots claimed).` });
      }
    }

    // 2. Hash PIN server-side with bcrypt
    const hashedPin = bcrypt.hashSync(securityPin, 10);

    const newProfile: Profile = {
      instagram: normalizedInsta,
      codmName: codmName.trim(),
      tierId,
      registeredAt: new Date().toISOString().substring(0, 10),
      profileViews: tierId === 'tier300' || tierId === 'tier400' ? Math.floor(Math.random() * 20) + 5 : 0,
      securityPin: hashedPin,
      school,
      role: isFree ? 'admin' : 'user',
      status: isFree ? 'active' : 'pending',
      utrNumber: utrNumber ? utrNumber.trim() : undefined,
      screenshot: screenshot || undefined,
      recentActivity: [
        { action: "Registered account", timestamp: new Date().toISOString() }
      ]
    };

    db.unshift(newProfile);
    saveDB(db);

    // Create session on successful registration
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, { instagram: newProfile.instagram, role: isFree ? 'admin' : 'user' });

    return res.json({ success: true, token, profile: sanitizeProfile(newProfile) });
  });

  // Self Delete Profile
  app.post("/api/profiles/self-delete", (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized. Please login first." });
    }

    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "Security PIN is required for account deletion." });
    }

    const db = loadDB();
    const index = db.findIndex(p => p.instagram.toLowerCase() === user.instagram.toLowerCase());

    if (index === -1) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const profile = db[index];

    let isMatch = false;
    try {
      if (profile.securityPin.startsWith('$2a$') || profile.securityPin.startsWith('$2b$')) {
        isMatch = bcrypt.compareSync(pin, profile.securityPin);
      } else {
        isMatch = profile.securityPin === pin;
      }
    } catch (e) {
      isMatch = profile.securityPin === pin;
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect PIN. Deletion aborted." });
    }

    db.splice(index, 1);
    saveDB(db);
    addDeletedProfile(user.instagram);

    // Invalidate sessions
    for (const [token, sess] of sessions.entries()) {
      if (sess.instagram.toLowerCase() === user.instagram.toLowerCase()) {
        sessions.delete(token);
      }
    }

    return res.json({ success: true });
  });

  // Get directory
  app.get("/api/profiles/directory", (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    // Find requesting user profile
    const db = loadDB();
    const requester = db.find(p => p.instagram.toLowerCase() === user.instagram.toLowerCase());

    // 9. dont show list of registered chat profiles too unless they have paid
    // Admins or Active Paid/Free Users can see directory
    const isAdmin = user.role === 'admin' || (requester && requester.role === 'admin');
    const isActive = requester && requester.status === 'active';

    if (!isAdmin && !isActive) {
      return res.status(403).json({ error: "Access denied. You must register and be active to view the directory." });
    }

    // 8. Sanitize directory response completely
    const directory = db.map(p => ({
      instagram: p.instagram,
      codmName: p.codmName,
      tierId: p.tierId,
      school: p.school,
      registeredAt: p.registeredAt,
      profileViews: p.profileViews || 0,
      status: p.status || 'active',
      saleRemoved: p.saleRemoved || false
    }));

    return res.json(directory);
  });

  // Get current user profile
  app.get("/api/profiles/me", (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const db = loadDB();
    const profile = db.find(p => p.instagram.toLowerCase() === user.instagram.toLowerCase());

    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    return res.json(sanitizeProfile(profile));
  });

  // Increment profile views securely
  app.post("/api/profiles/view", (req, res) => {
    const user = (req as any).user;
    const { targetInstagram } = req.body;

    if (!user || !targetInstagram) {
      return res.status(400).json({ error: "Unauthorized or missing targets." });
    }

    const db = loadDB();
    const target = db.find(p => p.instagram.toLowerCase() === targetInstagram.toLowerCase());

    if (target) {
      target.profileViews = (target.profileViews || 0) + 1;
      saveDB(db);
      return res.json(sanitizeProfile(target));
    }

    res.status(404).json({ error: "Target profile not found." });
  });

  // Secure founder passcode verification
  app.post("/api/auth/unlock-founder", (req, res) => {
    const { founder, passcode } = req.body;
    if (!founder || !passcode) {
      return res.status(400).json({ error: "Missing founder or passcode." });
    }

    const key = founder.trim().toLowerCase();

    // Check lock
    const failure = founderFailures.get(key);
    if (failure && failure.lockUntil > Date.now()) {
      const remainingMins = Math.ceil((failure.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        error: `DECRYPTION LOCKED: TOO MANY FAILED ATTEMPTS. TRY AGAIN IN ${remainingMins} MINUTE(S).`
      });
    }

    const FOUNDER_PASSCODES: Record<string, string | undefined> = {
      jiji: process.env.FOUNDER_JIJI_PASSCODE || 'SECTORPASS',
      nedupla: process.env.FOUNDER_NEDUPLA_PASSCODE || 'Cyberpunk',
      anandita: process.env.FOUNDER_ANANDITA_PASSCODE || 'ilovekairi@125',
      gephs: process.env.FOUNDER_GEPHS_PASSCODE || 'Zayden@08'
    };

    const correct = FOUNDER_PASSCODES[key];
    if (correct && passcode === correct) {
      founderFailures.delete(key);
      return res.json({ success: true });
    } else {
      const prevAttempts = failure ? failure.attempts : 0;
      const newAttempts = prevAttempts + 1;
      let lockUntil = 0;

      if (newAttempts >= 3) {
        lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
        founderFailures.set(key, { attempts: newAttempts, lockUntil });
        return res.status(423).json({
          error: `DECRYPTION LOCKED: TOO MANY FAILED ATTEMPTS. RETRY IN 15 MINUTES. (${newAttempts}/3 ATTEMPTS USED)`
        });
      } else {
        founderFailures.set(key, { attempts: newAttempts, lockUntil: 0 });
        return res.status(401).json({
          error: `ACCESS DENIED: INVALID DECRYPTION PASSCODE. (${newAttempts}/3 ATTEMPTS USED)`
        });
      }
    }
  });

  // 5. Secure invite link retrieval endpoint
  app.get("/api/join-gc", (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(401).send("UNAUTHORIZED: Session token is missing.");
    }

    const session = sessions.get(token);
    if (!session) {
      return res.status(401).send("UNAUTHORIZED: Invalid or expired session.");
    }

    const db = loadDB();
    const profile = db.find(p => p.instagram.toLowerCase() === session.instagram.toLowerCase());

    if (!profile || profile.status === 'banned') {
      return res.status(403).send("ACCESS DENIED: Account is inactive or banned.");
    }

    // Verified! Redirect securely
    return res.redirect(302, "https://www.instagram.com/j/AbYKXWBJn8-BEBCG/");
  });

  // Admin login endpoint
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Passcode is required." });
    }

    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || 'global_admin';

    // Rate limit
    const failure = adminFailures.get(clientIp);
    if (failure && failure.lockUntil > Date.now()) {
      const remainingMins = Math.ceil((failure.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ error: `ADMIN PANEL LOCKED. TOO MANY ATTEMPTS. RETRY IN ${remainingMins} MINUTE(S).` });
    }

    // 6 & 7. Move passwords to server-side check and individual accounts
    const ADMIN_ACCOUNTS: Record<string, string | undefined> = {
      admin: process.env.ADMIN_PASSWORD || 'secnetgeph',
      master: process.env.ADMIN_PASSWORD || 'secnetgeph',
      jiji: process.env.FOUNDER_JIJI_PASSCODE || 'SECTORPASS',
      nedupla: process.env.FOUNDER_NEDUPLA_PASSCODE || 'Cyberpunk',
      anandita: process.env.FOUNDER_ANANDITA_PASSCODE || 'ilovekairi@125',
      gephs: process.env.FOUNDER_GEPHS_PASSCODE || 'Zayden@08'
    };

    const trimmedPassword = password.trim();
    let matchedKey: string | null = null;
    for (const [key, val] of Object.entries(ADMIN_ACCOUNTS)) {
      if (val === trimmedPassword) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      adminFailures.delete(clientIp);

      const token = crypto.randomBytes(24).toString("hex");
      sessions.set(token, { instagram: `@admin_${matchedKey}`, role: 'admin', username: matchedKey });

      return res.json({ token, username: matchedKey, role: 'admin' });
    } else {
      const prevAttempts = failure ? failure.attempts : 0;
      const newAttempts = prevAttempts + 1;
      let lockUntil = 0;

      if (newAttempts >= 3) {
        lockUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
        adminFailures.set(clientIp, { attempts: newAttempts, lockUntil });
        return res.status(423).json({ error: `ADMIN PANEL LOCKED. TOO MANY ATTEMPTS. RETRY IN 15 MINUTES. (${newAttempts}/3 ATTEMPTS USED)` });
      } else {
        adminFailures.set(clientIp, { attempts: newAttempts, lockUntil: 0 });
        return res.status(401).json({ error: `INVALID AUTHORIZATION KEY. ACCESS DENIED. (${3 - newAttempts} ATTEMPTS REMAINING)` });
      }
    }
  });

  // Admin get full profiles (un-sanitized)
  app.get("/api/admin/profiles", (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const db = loadDB();
    return res.json(db);
  });

  // Admin trigger secure actions
  app.post("/api/admin/action", (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const { action, targetInstagram } = req.body;
    const db = loadDB();

    const targetLower = targetInstagram ? targetInstagram.trim().toLowerCase() : '';
    const targetIdx = db.findIndex(p => p.instagram.toLowerCase() === targetLower);
    const target = targetIdx !== -1 ? db[targetIdx] : null;

    const actionTime = new Date().toISOString();

    if (action === 'reset-mocks') {
      fs.unlinkSync(DB_FILE); // delete current file to force mock reload
      const loaded = loadDB();
      return res.json({ success: true, message: "Database reseeded with secure default mocks." });
    }

    if (action === 'clear-all') {
      saveDB([]);
      return res.json({ success: true, message: "Cleared all database entries." });
    }

    if (!target) {
      return res.status(404).json({ error: "Target profile not found." });
    }

    switch (action) {
      case 'delete':
        db.splice(targetIdx, 1);
        addDeletedProfile(targetInstagram);
        break;

      case 'toggle-sale':
        target.saleRemoved = !target.saleRemoved;
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: `${target.saleRemoved ? 'Removed' : 'Re-activated'} lobby tag modifier sale listing`,
          timestamp: actionTime
        });
        break;

      case 'toggle-status':
        if (target.status === 'pending') {
          target.status = 'active';
        } else {
          target.status = target.status === 'banned' ? 'active' : 'banned';
        }
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: `Account status updated to ${target.status.toUpperCase()}`,
          timestamp: actionTime
        });
        break;

      case 'approve-payment':
        target.status = 'active';
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: "Payment verified - Account marked as ACTIVE",
          timestamp: actionTime
        });
        break;

      case 'warn-user': {
        const curr = target.warnings || 0;
        target.warnings = curr + 1;
        if (target.warnings >= 3) {
          target.status = 'banned';
        }
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: `Issued security warning (${target.warnings}/3).${target.warnings >= 3 ? ' Profile auto-banned.' : ''}`,
          timestamp: actionTime
        });
        break;
      }

      case 'clear-warnings':
        target.warnings = 0;
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: "Cleared all warning counts",
          timestamp: actionTime
        });
        break;

      case 'reduce-warnings': {
        const curr = target.warnings || 0;
        if (curr > 0) {
          target.warnings = curr - 1;
        }
        if (target.warnings < 3 && target.status === 'banned') {
          target.status = 'active';
        }
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: `Reduced warnings / forgave ban (${target.warnings}/3 warnings remaining)`,
          timestamp: actionTime
        });
        break;
      }

      case 'toggle-role':
        target.role = target.role === 'admin' ? 'user' : 'admin';
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: `Account authorization role updated to ${target.role.toUpperCase()}`,
          timestamp: actionTime
        });
        break;

      case 'reset-lockout':
        loginFailures.delete(targetLower);
        target.recentActivity = target.recentActivity || [];
        target.recentActivity.unshift({
          action: "Cleared security lockout timers & login failure counts",
          timestamp: actionTime
        });
        break;

      default:
        return res.status(400).json({ error: "Unknown action." });
    }

    if (target.recentActivity && target.recentActivity.length > 10) {
      target.recentActivity.pop();
    }

    saveDB(db);
    return res.json({ success: true });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
