import React from 'react';
import { Link } from 'react-router-dom';

const LOGO = 'https://media.base44.com/images/public/6a0383b6225245c6dd116653/1946bb15d_ChatGPTImageAug6202612_27_39PM.png';

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={LOGO} alt="Skiduel" className="h-7 w-7 rounded-lg object-cover" />
          <span className="font-semibold tracking-tight">Skiduel</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#why" className="hover:text-foreground transition-colors">Why switch</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
        </nav>
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Open app
        </Link>
      </div>
    </header>
  );
}