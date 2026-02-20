import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { Footer } from '../components/Footer';
import '../styles/landing.css';

export function LandingPage() {
  return (
    <div className="landing">
      <Navbar />
      <main className="landing__main">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
