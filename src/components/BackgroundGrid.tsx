import React from 'react';

export default function BackgroundGrid() {
  return (
    <div className="fixed inset-0 -z-40 overflow-hidden">
      {/* Strict background vertical guidelines for brutalist layout structure */}
      <div className="absolute inset-0 flex justify-between pointer-events-none opacity-40 max-w-7xl mx-auto px-4 md:px-8">
        <div className="w-[1px] h-full bg-border" />
        <div className="w-[1px] h-full bg-border hidden sm:block" />
        <div className="w-[1px] h-full bg-border hidden md:block" />
        <div className="w-[1px] h-full bg-border hidden lg:block" />
        <div className="w-[1px] h-full bg-border" />
      </div>
    </div>
  );
}
