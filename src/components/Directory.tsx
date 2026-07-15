import React from 'react';
import { Profile, TIERS } from '../types';
import { Eye } from 'lucide-react';

interface DirectoryProps {
  profiles: Profile[];
  formatDirectoryNickname: (profile: Profile) => React.ReactNode;
  onViewProfile?: (profile: Profile) => void;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  loggedInProfile?: Profile | null;
}

const FREE_USERS = ['cgphl', 'juino.57', 'jiji.gtk', 'nedupla._.a'];
function isFreeUser(handle?: string): boolean {
  if (!handle) return false;
  const normalized = handle.trim().toLowerCase().replace(/^@/, '');
  return FREE_USERS.includes(normalized);
}

export default function Directory({ 
  profiles, 
  formatDirectoryNickname, 
  onViewProfile, 
  isAdmin, 
  isLoggedIn,
  loggedInProfile
}: DirectoryProps) {
  const isPending = loggedInProfile && loggedInProfile.status === 'pending';
  const isFree = loggedInProfile && isFreeUser(loggedInProfile.instagram);

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-status rounded-full animate-pulse" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-text-muted">
            REGISTERED CHAT PROFILES DIRECTORY
          </h2>
        </div>
        <span className="font-mono text-[10px] text-text-muted">
          {isAdmin ? `[ ${profiles.length} / 124 ACTIVE ]` : '[ ACTIVE CHAT DIRECTORY ]'}
        </span>
      </div>

      <div className="border border-border bg-card divide-y divide-border font-mono text-xs overflow-hidden flex flex-col">
        <div className="p-3 bg-bg grid grid-cols-12 gap-2 text-text-muted text-[10px] uppercase font-bold tracking-widest select-none shrink-0 border-b border-border">
          <div className="col-span-5">MEMBER NICKNAME</div>
          <div className="col-span-4">INSTAGRAM</div>
          <div className="col-span-3 text-right">TIER CLASS</div>
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-border scrollbar-thin scrollbar-thumb-border">
          {!isLoggedIn ? (
            <div className="p-10 text-center text-text-muted/60 flex flex-col items-center justify-center gap-3">
              <span className="font-mono text-[10px] text-accent font-bold tracking-widest block">🔒 SECURITY GATE ACTIVE</span>
              <p className="font-sans text-[9px] max-w-xs mx-auto leading-normal uppercase">
                MEMBER DIRECTORY ROSTER AND LIVE TELEMETRY ARE EXCLUSIVE TO REGISTERED AND VERIFIED ACTIVE MEMBERS.
              </p>
            </div>
          ) : !isAdmin && isPending ? (
            <div className="p-10 text-center text-text-muted/60 flex flex-col items-center justify-center gap-3">
              <span className="font-mono text-[10px] text-accent font-bold tracking-widest block">⏳ VERIFICATION PENDING</span>
              <p className="font-sans text-[9px] max-w-xs mx-auto leading-normal uppercase">
                OUR ADMINS WILL CHECK AND GET BACK TO YOU AS SOON AS POSSIBLE.
              </p>
            </div>
          ) : !isAdmin && isFree ? (
            <div className="p-10 text-center text-text-muted/60 flex flex-col items-center justify-center gap-3">
              <span className="font-mono text-[10px] text-accent font-bold tracking-widest block">🔒 PAID ACCESS REQUIRED</span>
              <p className="font-sans text-[9px] max-w-xs mx-auto leading-normal uppercase">
                THE DIRECTORY ROSTER OF REGISTERED CHAT PROFILES IS RESTRICTED TO ACTIVE PAID TIERS.
              </p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-8 text-center text-text-muted italic">
              No active registrations. Complete clearance to claim your identity slot.
            </div>
          ) : (
            profiles.map((profile, idx) => {
              const matchedTier = TIERS.find(t => t.id === profile.tierId) || TIERS[0];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onViewProfile?.(profile)}
                  className="w-full p-4 grid grid-cols-12 gap-2 items-center hover:bg-bg/50 transition-all text-left border-0 bg-transparent cursor-pointer group text-text-primary focus:outline-none focus:bg-bg/50"
                >
                  <div className="col-span-5 flex flex-wrap items-center gap-2">
                    {formatDirectoryNickname(profile)}
                    {profile.school && (
                      <span className="text-[8px] font-mono font-bold bg-bg border border-border text-text-muted px-1 py-0.5 rounded-none tracking-wider uppercase shrink-0">
                        {profile.school}
                      </span>
                    )}
                  </div>
                  <div className="col-span-4 text-text-muted truncate text-[11px] flex items-center gap-1">
                     <span>{profile.instagram}</span>
                  </div>
                  <div className="col-span-3 text-right flex items-center justify-end gap-2">
                    <span className="inline-block px-2 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded-none bg-status/10 text-status border border-status/30">
                      {matchedTier.name}
                    </span>
                    <Eye className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors duration-150" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      
      <p className="text-[10px] text-text-muted font-sans uppercase leading-relaxed text-left">
        * Note: Profile view analytics are recorded live when registered members verify each other through this Access Hub directory. Nickname visual indicators are deployed in the group manually.
      </p>
    </div>
  );
}
