import { Users, Sparkles, Eye, Crown, Award } from 'lucide-react';
import React from 'react';

export interface ApplicationForm {
  instagram: string;
  codmName: string;
  securityPin: string;
  school: 'TNA' | 'GD Goenka' | '';
  admissionNumber: string;
}

export interface Profile {
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
  admissionNumber?: string;
}

export interface Tier {
  id: 'tier100' | 'tier200' | 'tier300' | 'tier400';
  name: string;
  price: number;
  badge: string;
  featureTitle: string;
  description: string;
  perks: string[];
}

export const TIERS: Tier[] = [
  {
    id: 'tier100',
    name: 'Tier 1',
    price: 99,
    badge: 'MEMBER',
    featureTitle: 'Added to IG Chat + Registered List',
    description: 'Added to the exclusive Instagram group chat, and your name officially listed on the Registered School Player List (Google Sheet pinned in chat bio).',
    perks: [
      'Added to the Instagram group chat',
      'Name listed on the pinned Google Sheet bio directory'
    ]
  },
  {
    id: 'tier200',
    name: 'Tier 2',
    price: 199,
    badge: 'RED VERIFIED',
    featureTitle: 'Red Verified 🔴',
    description: 'Stand out every single time you text the group. We change your Instagram group chat nickname to have the red verified emoji modifier ("🔴 [Name]").',
    perks: [
      'All Tier 1 features included',
      'Nickname changed to "🔴 [Name]"'
    ]
  },
  {
    id: 'tier300',
    name: 'Tier 3',
    price: 299,
    badge: 'RED VERIFIED + STATS',
    featureTitle: 'Red Verified + Profile Views 📊',
    description: 'Get the prominent red verified nickname modifier, plus a custom section on the pinned Google Sheet that tracks and displays exactly how many times people have viewed your stats/profile link.',
    perks: [
      'All Tier 2 features included',
      'Profile view & click count analytics tracked on the pinned Google Sheet'
    ]
  },
  {
    id: 'tier400',
    name: 'Tier 4',
    price: 399,
    badge: 'THE HOST TAG 👑',
    featureTitle: 'The Host Tag (Ultimate Clout)',
    description: 'The absolute highest visual clout in the community. Change your Instagram group nickname to "👑 🔴 [Name]" signaling instantly that you are the final boss of the chat. Includes all lower tier perks.',
    perks: [
      'All Tier 3 features included',
      'Premium host crown emoji modifier: "👑 🔴 [Name]"'
    ]
  }
];


