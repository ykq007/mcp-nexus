import React from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { Footer } from '../components/Footer';
import '../styles/landing.css';

export function LandingPage() {
  return (
    <div className="landing">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}

export default LandingPage;
