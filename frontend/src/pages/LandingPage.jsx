import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { LayoutDashboard, Shield, BarChart2, Workflow, CheckSquare, Smartphone, ArrowRight, CheckCircle2, Globe, Users, Zap, MessageSquare, ChevronDown } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTranslation } from "react-i18next";

export default function LandingPage() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const { t } = useTranslation();
  
  if (user) {
    const isAdmin = user.role === "ADMIN";
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/workspace/home"} replace />;
  }

  const features = [
    { icon: LayoutDashboard, title: t('landing.feat_build_title', "Dynamic Form Builder"), desc: t('landing.feat_build_desc', "Drag and drop interface to build complex forms in minutes without writing code.") },
    { icon: CheckSquare, title: t('landing.feat_logic_title', "Conditional Logic"), desc: t('landing.feat_logic_desc', "Set up advanced rules to show/hide fields based on user input intelligently.") },
    { icon: Shield, title: t('landing.feat_role_title', "Role Based Access"), desc: t('landing.feat_role_desc', "Secure your platform with enterprise-grade roles and granular permissions.") },
    { icon: BarChart2, title: t('landing.feat_analytics_title', "Analytics Dashboard"), desc: t('landing.feat_analytics_desc', "Gain actionable insights with real-time analytics and custom visualizations.") },
    { icon: Globe, title: t('landing.feat_lang_title', "Multi-language Support"), desc: t('landing.feat_lang_desc', "Instantly translate your forms and reach a global audience effortlessly.") },
    { icon: Smartphone, title: t('landing.feat_resp_title', "Responsive Design"), desc: t('landing.feat_resp_desc', "Forms automatically adapt to look beautiful on desktop, tablet, and mobile devices.") }
  ];

  const faqs = [
    { q: t('landing.faq_1_q', "Is it really no-code?"), a: t('landing.faq_1_a', "Yes! Our drag-and-drop builder allows you to create highly complex forms and workflows without writing a single line of code.") },
    { q: t('landing.faq_2_q', "Can I integrate with my existing tools?"), a: t('landing.faq_2_a', "Absolutely. We support webhooks and REST API integrations to seamlessly connect with your existing tech stack.") },
    { q: t('landing.faq_3_q', "How secure is my data?"), a: t('landing.faq_3_a', "We use enterprise-grade encryption and comply with major privacy standards to ensure your data is always safe.") },
    { q: t('landing.faq_4_q', "Do you offer custom branding?"), a: t('landing.faq_4_a', "Yes, you can fully customize the look and feel of your forms to match your brand's identity.") }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#030712', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Dynamic Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div className="animate-blob" style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="animate-blob animation-delay-2000" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="animate-blob animation-delay-4000" style={{ position: 'absolute', top: '40%', left: '30%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Navbar */}
      <header style={{ height: 72, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(3, 7, 18, 0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onMouseOver={e => e.currentTarget.querySelector('.logo-icon').style.transform='rotate(180deg)'} onMouseOut={e => e.currentTarget.querySelector('.logo-icon').style.transform='rotate(0deg)'}>
          <div className="logo-icon" style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7c3aed 0%, #38bdf8 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18, transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>{t('ui.f', `F`)}</div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('ui.formflow', `FormFlow`)}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/login" style={{ fontSize: 15, color: '#cbd5e1', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#cbd5e1'}>{t('landing.nav_login', 'Log In')}</Link>
          <Link to="/register" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)', color: '#0f172a', fontWeight: 700, fontSize: 15, borderRadius: 999, textDecoration: 'none', transition: 'all 0.2s ease', boxShadow: '0 4px 14px rgba(255,255,255,0.15)' }} onMouseOver={e => { e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 6px 20px rgba(255,255,255,0.25)' }} onMouseOut={e => { e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 4px 14px rgba(255,255,255,0.15)' }}>{t('landing.nav_get_started', 'Get Started')}</Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, paddingTop: 72, position: 'relative', zIndex: 1 }}>
        
        {/* Hero Section */}
        <section className="animate-fade-in-up" style={{ padding: '120px 24px 80px', textAlign: 'center', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 32 }}>
            <Zap size={14} /> {t('landing.hero_badge', 'The Future of Data Collection')}
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', color: 'white', marginBottom: 24 }}>
            {t('landing.hero_title_1', 'Build intelligent forms,')} <br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('landing.hero_title_2', 'gather deeper insights.')}</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#94a3b8', maxWidth: 640, margin: '0 auto 48px', lineHeight: 1.6 }}>
            {t('landing.hero_subtitle', 'The ultimate low-code platform to design dynamic workflows, implement complex validation rules, and scale your data collection flawlessly.')}
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: 'white', borderRadius: 999, fontSize: 16, fontWeight: 600, textDecoration: 'none', boxShadow: '0 8px 24px rgba(124,58,237,0.4)', transition: 'transform 0.2s' }} onMouseOver={e => e.target.style.transform='translateY(-2px)'} onMouseOut={e => e.target.style.transform='translateY(0)'}>
              {t('landing.hero_btn_start', 'Start for free')} <ArrowRight size={18} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 32px', color: 'white', borderRadius: 999, fontSize: 16, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onMouseOver={e => { e.target.style.background='rgba(255,255,255,0.08)'; e.target.style.borderColor='rgba(124,58,237,0.4)'; e.target.style.boxShadow='0 0 20px rgba(124,58,237,0.2)'; e.target.style.transform='translateY(-2px)' }} onMouseOut={e => { e.target.style.background='rgba(255,255,255,0.03)'; e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; e.target.style.transform='translateY(0)' }}>
              {t('landing.hero_btn_demo', 'Request Demo')}
            </Link>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="animate-fade-in-up animation-delay-400" style={{ padding: '40px 24px 120px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              <Workflow size={14} /> {t('landing.workflow_badge', 'How it works')}
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-0.02em' }}>{t('landing.workflow_title', 'Streamlined data collection')}</h2>
            <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, margin: '0 auto' }}>{t('landing.workflow_subtitle', 'From idea to insights in four simple steps.')}</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {[
              { step: 1, title: t('landing.step_1_title', 'Design'), desc: t('landing.step_1_desc', 'Drag and drop fields to create custom forms instantly.'), icon: LayoutDashboard, color: "#a78bfa" },
              { step: 2, title: t('landing.step_2_title', 'Add Logic'), desc: t('landing.step_2_desc', 'Set up smart conditional rules to adapt to user responses.'), icon: Zap, color: "#38bdf8" },
              { step: 3, title: t('landing.step_3_title', 'Publish'), desc: t('landing.step_3_desc', 'Share your form with a single click and collect responses.'), icon: Globe, color: "#10b981" },
              { step: 4, title: t('landing.step_4_title', 'Analyze'), desc: t('landing.step_4_desc', 'View real-time analytics and extract actionable insights.'), icon: BarChart2, color: "#f43f5e" }
            ].map((s, i) => (
              <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${(i+2)*200}ms`, position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 32, textAlign: 'center', transition: 'all 0.3s ease', cursor: 'default' }} onMouseOver={e => { e.currentTarget.style.transform='translateY(-8px)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor=`${s.color}40`; }} onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.background='rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; }}>
                <div style={{ width: 80, height: 80, margin: '0 auto 24px', borderRadius: '50%', background: `rgba(255,255,255,0.03)`, border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, boxShadow: `0 0 30px ${s.color}20`, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -10, right: -10, width: 28, height: 28, borderRadius: '50%', background: s.color, color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{s.step}</div>
                  <s.icon size={36} strokeWidth={1.5} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 12 }}>{s.title}</h3>
                <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Statistics Section */}
        <section style={{ padding: '80px 24px', position: 'relative' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {[
              { value: "500k+", label: t('landing.stat_forms', "Total Forms Created") },
              { value: "1.2M+", label: t('landing.stat_users', "Active Users") },
              { value: "50M+", label: t('landing.stat_responses', "Responses Collected") },
              { value: "10k+", label: t('landing.stat_orgs', "Organizations") }
            ].map((stat, i) => (
              <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '40px 24px', textAlign: 'center', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 12, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stat.value}</div>
                <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section style={{ padding: '120px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-0.02em' }}>{t('landing.features_title', 'Everything you need to scale')}</h2>
            <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, margin: '0 auto' }}>{t('landing.features_subtitle', 'Powerful features designed for enterprise-grade data collection and workflow automation.')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
            {features.map((f, i) => (
              <div key={i} style={{ position: 'relative', padding: 40, borderRadius: 24, background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default', overflow: 'hidden' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.boxShadow = '0 24px 48px -12px rgba(124,58,237,0.2)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)' }} />
                <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(56,189,248,0.15) 100%)', color: '#38bdf8', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: '1px solid rgba(124,58,237,0.2)', boxShadow: 'inset 0 0 20px rgba(124,58,237,0.1)' }}>
                  <f.icon size={32} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 12, letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: 'white', marginBottom: 16 }}>{t('landing.testimonials_title', 'Loved by data teams')}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
              {[
                { quote: t('landing.testim_1_quote', "FormFlow completely transformed how we collect patient feedback. The conditional logic is incredibly powerful."), author: "Sarah Jenkins", role: t('landing.testim_1_role', "Head of Data, MedTech Inc."), initials: "SJ", color: "#8b5cf6" },
                { quote: t('landing.testim_2_quote', "We replaced three different tools with FormFlow. The analytics dashboard gives us exactly what we need in real-time."), author: "Marcus Thorne", role: t('landing.testim_2_role', "Product Manager, StartupX"), initials: "MT", color: "#38bdf8" },
                { quote: t('landing.testim_3_quote', "The most intuitive form builder I've ever used. We deployed enterprise workflows in days instead of months."), author: "Elena Rodriguez", role: t('landing.testim_3_role', "CTO, Global Logistics"), initials: "ER", color: "#10b981" }
              ].map((t_item, i) => (
                <div key={i} style={{ padding: 40, borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -20, left: 40, width: 40, height: 40, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '4px solid #020617' }}>
                    <MessageSquare size={16} fill="white" />
                  </div>
                  <p style={{ fontSize: 17, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 32, marginTop: 12 }}>"{t_item.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: `rgba(255,255,255,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t_item.color, fontWeight: 700, fontSize: 16, border: `1px solid ${t_item.color}40` }}>{t_item.initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: 16 }}>{t_item.author}</div>
                      <div style={{ fontSize: 14, color: '#94a3b8' }}>{t_item.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section style={{ padding: '120px 24px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: 'white' }}>{t('landing.faq_title', 'Frequently Asked Questions')}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ padding: '24px 32px', borderRadius: 20, background: openFaq === i ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: openFaq === i ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.3s ease' }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: openFaq === i ? 'white' : '#e2e8f0', margin: 0, transition: 'color 0.3s' }}>{faq.q}</h4>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: openFaq === i ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
                    <ChevronDown size={20} color={openFaq === i ? '#a78bfa' : '#94a3b8'} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                  </div>
                </div>
                {openFaq === i && (
                  <p style={{ marginTop: 20, marginBottom: 0, fontSize: 16, color: '#94a3b8', lineHeight: 1.7, animation: 'fadeInUp 0.3s ease' }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ padding: '80px 24px 40px', background: '#020617', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 60, marginBottom: 60 }}>
            <div style={{ maxWidth: 300 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #7c3aed 0%, #38bdf8 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>{t('ui.f', `F`)}</div>
                <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>{t('ui.formflow', `FormFlow`)}</span>
              </div>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{t('landing.footer_desc', 'The modern low-code dynamic form and workflow platform for ambitious teams.')}</p>
            </div>
            <div style={{ display: 'flex', gap: 80, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ display: 'block', fontSize: 14, color: 'white', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('landing.footer_product', 'Product')}</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <a href="#" style={{ fontSize: 15, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>{t('landing.footer_about', 'About')}</a>
                  <a href="#" style={{ fontSize: 15, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>{t('landing.footer_docs', 'Documentation')}</a>
                  <a href="#" style={{ fontSize: 15, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>{t('landing.footer_contact', 'Contact')}</a>
                </div>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 14, color: 'white', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('landing.footer_legal', 'Legal')}</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <a href="#" style={{ fontSize: 15, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>{t('landing.footer_privacy', 'Privacy Policy')}</a>
                  <a href="#" style={{ fontSize: 15, color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>{t('landing.footer_terms', 'Terms of Service')}</a>
                </div>
              </div>
            </div>
          </div>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 14, color: '#64748b' }}>&copy; {new Date().getFullYear()} {t('landing.footer_rights', 'FormFlow Platform. All rights reserved.')}</span>
            <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='#94a3b8'}>{t('ui.github', `GitHub`)}</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
