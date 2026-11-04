import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  LockKeyhole,
  UsersRound
} from 'lucide-react';
import {
  fadeUp,
  floatElement,
  parallax,
  revealTimeline,
  staggerCards,
  tiltOnHover
} from '../../animations';

const featureCards = [
  {
    icon: UsersRound,
    title: 'Know the people you serve',
    copy: 'Keep beneficiary profiles and essential contact details organized in one NGO-scoped workspace.'
  },
  {
    icon: ClipboardList,
    title: 'Coordinate programs clearly',
    copy: 'Manage program details, schedules, assignments, and status without spreading records across tools.'
  },
  {
    icon: BarChart3,
    title: 'See useful trends',
    copy: 'Explore six-month record trends and request an optional AI-assisted summary of aggregate counts.'
  }
];

const signupSteps = [
  'Create your organization account',
  'Verify your email with a one-time code',
  'Complete organization details and upload a document',
  'Wait for platform approval before signing in'
];

export default function PublicLandingPage() {
  const heroRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroActionsRef = useRef(null);
  const featuresHeadingRef = useRef(null);
  const featureGridRef = useRef(null);
  const stepsRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    const cleanups = [];
    cleanups.push(fadeUp(heroTitleRef.current, { duration: 0.58, distance: 22 }));
    cleanups.push(fadeUp(heroActionsRef.current, { duration: 0.4, delay: 0.1, distance: 12 }));

    heroRef.current?.querySelectorAll('.landing-shape').forEach((shape, index) => {
      cleanups.push(floatElement(shape, { distance: index % 2 ? -10 : -15, duration: 4.5 + index * 0.6, delay: index * 0.25 }));
      const parallaxLayer = shape.querySelector('.landing-parallax-layer');
      if (parallaxLayer) cleanups.push(parallax(parallaxLayer, 12 + index * 4));
    });

    [featuresHeadingRef.current].forEach((element) => {
      if (element) cleanups.push(fadeUp(element, {
        duration: 0.38,
        distance: 12,
        scrollTrigger: { trigger: element, start: 'top 86%' }
      }));
    });
    if (featureGridRef.current) {
      cleanups.push(staggerCards(featureGridRef.current.children, {
        duration: 0.42,
        stagger: 0.09,
        distance: 18,
        scrollTrigger: { trigger: featureGridRef.current, start: 'top 84%' }
      }));
      featureGridRef.current.querySelectorAll('[data-motion-tilt]').forEach((card) => {
        cleanups.push(tiltOnHover(card));
      });
    }

    if (stepsRef.current) {
      cleanups.push(fadeUp(stepsRef.current, {
        duration: 0.4,
        distance: 14,
        scrollTrigger: { trigger: stepsRef.current, start: 'top 86%' }
      }));
      cleanups.push(staggerCards(stepsRef.current.parentElement?.querySelectorAll('.landing-step'), {
        duration: 0.32,
        stagger: 0.055,
        distance: 8,
        scrollTrigger: { trigger: stepsRef.current.parentElement, start: 'top 84%' }
      }));
    }
    if (timelineRef.current) {
      cleanups.push(revealTimeline(timelineRef.current, {
        scrollTrigger: { trigger: timelineRef.current, start: 'top 84%' }
      }));
    }

    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="NGOcore home">
          <span className="landing-brand-mark" aria-hidden="true">NC</span>
          <span><strong>NGOcore</strong><small>Digital Records for NGOs</small></span>
        </Link>
        <nav className="landing-nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="landing-nav-actions">
          <Link className="landing-sign-in" to="/login">Staff login</Link>
          <Link className="landing-student-cta" to="/student/login">Student portal</Link>
          <Link className="landing-nav-cta" to="/signup">Create workspace <ArrowRight size={15} /></Link>
        </div>
      </header>

      <main>
        <section className="landing-hero" ref={heroRef} data-parallax-root>
          <div className="landing-ambient" aria-hidden="true">
            <div className="landing-shape landing-shape-one"><div className="landing-parallax-layer" /></div>
            <div className="landing-shape landing-shape-two"><div className="landing-parallax-layer" /></div>
            <div className="landing-shape landing-shape-three"><div className="landing-parallax-layer" /></div>
          </div>
          <div className="landing-hero-content">
            <div className="landing-eyebrow"><HeartHandshake size={15} /> PURPOSE-BUILT FOR COMMUNITY WORK</div>
            <h1 ref={heroTitleRef}>Your mission deserves <span>clear records.</span></h1>
            <p className="landing-hero-copy">
              Bring beneficiary profiles and program coordination into one secure workspace—so your team can spend less time searching and more time supporting people.
            </p>
            <div className="landing-hero-actions" ref={heroActionsRef}>
              <Link className="landing-primary-cta" to="/signup">Start your organization <ArrowRight size={17} /></Link>
              <Link className="landing-secondary-cta" to="/login">Staff sign in</Link>
              <Link className="landing-student-cta landing-student-inline" to="/student/login">Student portal</Link>
            </div>
            <div className="landing-trust-note"><LockKeyhole size={14} /> Private organization workspaces with approval-gated access</div>
          </div>
          <div className="landing-preview-card" aria-label="NGOcore capabilities">
            <div className="landing-preview-top">
              <span className="landing-preview-dot" /><span className="landing-preview-dot" /><span className="landing-preview-dot" />
              <span className="landing-preview-label">A CLEARER WAY TO WORK</span>
            </div>
            <div className="landing-preview-heading"><div><small>NGOCORE WORKSPACE</small><strong>Everyday operations, together</strong></div><span className="landing-preview-status"><CheckCircle2 size={13} /> Connected</span></div>
            <div className="landing-preview-stats">
              <div><span>People</span><strong>Student records</strong><i className="landing-preview-line line-green" /></div>
              <div><span>Programs</span><strong>Activities</strong><i className="landing-preview-line line-blue" /></div>
            </div>
            <div className="landing-preview-list">
              <div><span className="landing-preview-avatar avatar-one"><UsersRound size={16} /></span><span><strong>People and profiles</strong><small>Keep important details together</small></span><CheckCircle2 size={15} /></div>
              <div><span className="landing-preview-avatar avatar-two"><ClipboardList size={16} /></span><span><strong>Programs and schedules</strong><small>Coordinate the work in progress</small></span><CheckCircle2 size={15} /></div>
            </div>
            <div className="landing-preview-foot"><span>Organization-scoped access</span><span className="landing-preview-lock"><LockKeyhole size={13} /> Secure</span></div>
          </div>
        </section>

        <section className="landing-features-section" id="features" aria-labelledby="landing-features-heading">
          <div className="landing-section-heading" ref={featuresHeadingRef}>
            <span className="landing-section-kicker">One calmer workflow</span>
            <h2 id="landing-features-heading">The essential tools, working together.</h2>
            <p>Designed to keep everyday NGO records clear, scoped, and useful.</p>
          </div>
          <div className="landing-feature-grid" ref={featureGridRef}>
            {featureCards.map(({ icon: Icon, title, copy }, index) => (
              <article className={`landing-feature-card feature-tone-${index + 1}`} key={title} data-motion-tilt>
                <span className="landing-feature-icon"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className="landing-feature-arrow" aria-hidden="true"><ArrowRight size={17} /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-process-section" id="how-it-works" aria-labelledby="landing-process-heading">
          <div className="landing-process-copy" ref={stepsRef}>
            <span className="landing-section-kicker">Get started with confidence</span>
            <h2 id="landing-process-heading">A clear path from signup to workspace.</h2>
            <p>Your organization keeps control of its information. Sign-in is enabled after your submitted details and supporting document are approved.</p>
            <Link className="landing-primary-cta" to="/signup">Create your workspace <ArrowRight size={17} /></Link>
          </div>
          <div className="landing-timeline">
            <div className="landing-timeline-line" ref={timelineRef} aria-hidden="true" />
            {signupSteps.map((step, index) => (
              <div className="landing-step" key={step}>
                <span className="landing-step-number">{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{step}</strong><small>{index === 3 ? 'Your access begins after approval.' : 'Securely complete this step online.'}</small></div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <Link className="landing-brand" to="/">
          <span className="landing-brand-mark" aria-hidden="true">NC</span>
          <span><strong>NGOcore</strong><small>Digital Records for NGOs</small></span>
        </Link>
        <span>Clear records. More room for impact.</span>
        <Link to="/login">Sign in</Link>
      </footer>
    </div>
  );
}
