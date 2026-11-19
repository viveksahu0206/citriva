import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Workflow from '@/components/landing/Workflow';
import Faq from '@/components/landing/Faq';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Workflow />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
