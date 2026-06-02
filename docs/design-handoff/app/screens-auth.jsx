// screens-auth.jsx — Splash + role-aware login/onboarding
// Exports: AuthFlow
(function () {
  const { useState, useEffect, useRef } = React;

  function Logo({ size = 72, t, glow }) {
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ width: size, height: size, borderRadius: size * 0.3,
          background: 'linear-gradient(150deg,#16735C,#0B4A3B)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: glow ? '0 0 0 1px rgba(255,255,255,0.12), 0 18px 40px -10px rgba(0,0,0,0.5)' : 'none' }}>
          {/* monogram: stylised open book / roof */}
          <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
            <path d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Z" fill="#F2EEE4"/>
            <path d="M6 9v5.5c0 1.6 2.7 3 6 3s6-1.4 6-3V9" stroke="#E7A92F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="20.5" cy="11.5" r="1.4" fill="#E7A92F"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 22,
          background: '#E7A92F', border: '3px solid #0E5C4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={11} color="#3A2A06" strokeWidth="3" />
        </div>
      </div>
    );
  }
  window.Logo = Logo;

  function Splash({ t, go }) {
    const [show, setShow] = useState(false);
    useEffect(() => { const a = setTimeout(() => setShow(true), 60); const b = setTimeout(go, 2200); return () => { clearTimeout(a); clearTimeout(b); }; }, []);
    return (
      <div className="sm-screen" onClick={go} style={{ flex: 1, background: 'radial-gradient(120% 90% at 50% 0%, #16735C 0%, #0E5C4A 45%, #093B30 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
        {/* drifting orbs */}
        <div className="sm-float" style={{ position: 'absolute', top: '14%', left: '-18%', width: 240, height: 240, borderRadius: '50%', background: 'rgba(231,169,47,0.12)', filter: 'blur(8px)' }} />
        <div className="sm-float2" style={{ position: 'absolute', bottom: '12%', right: '-22%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(8px)' }} />
        {/* pulse ring behind logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="sm-pulse" style={{ position: 'absolute', width: 96, height: 96, borderRadius: '50%', border: '2px solid rgba(231,169,47,0.5)' }} />
          <span className="sm-pulse" style={{ position: 'absolute', width: 96, height: 96, borderRadius: '50%', border: '2px solid rgba(231,169,47,0.5)', animationDelay: '.9s' }} />
          <div style={{ transform: show ? 'scale(1)' : 'scale(0.6)', opacity: show ? 1 : 0, transition: 'all .8s cubic-bezier(.2,.8,.2,1)' }}>
            <Logo size={96} t={t} glow />
          </div>
        </div>
        <div style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(14px)', transition: 'all .7s ease .35s', textAlign: 'center', marginTop: 30 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 30, color: '#fff', letterSpacing: -0.6 }}>SchoolMate</div>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: '#E7A92F', letterSpacing: 3, marginTop: 4 }}>STAFF</div>
        </div>
        <div style={{ position: 'absolute', bottom: 54, display: 'flex', gap: 7, opacity: show ? 1 : 0, transition: 'opacity .6s ease .8s' }}>
          {[0,1,2].map(i => <span key={i} className="sm-dot" style={{ width: 8, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.7)', animationDelay: `${i * 0.16}s` }} />)}
        </div>
      </div>
    );
  }

  function Login({ t, lang, setLang, onAuth }) {
    const [roleKey, setRoleKey] = useState('driver');
    const [phone, setPhone] = useState('98765 43210');
    const [langOpen, setLangOpen] = useState(false);
    const roles = Object.values(ROLES);
    const role = ROLES[roleKey];
    const curLang = LANGS.find(l => l.code === lang) || LANGS[0];
    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, position: 'relative' }}>
        {/* brand cap */}
        <div style={{ background: 'radial-gradient(120% 110% at 30% 0%, #16735C, #0E5C4A 70%)', padding: '14px 24px 30px', borderRadius: '0 0 30px 30px', position: 'relative', overflow: 'hidden' }}>
          <div className="sm-float2" style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(231,169,47,0.14)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative' }}>
            <Logo size={46} t={t} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>SchoolMate Staff</div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Greenfield Public School</div>
            </div>
            {/* language selector */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setLangOpen(o => !o)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 11px', borderRadius: 100, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(6px)' }}>
                <Icon name="globe" size={16} color="#fff" strokeWidth={1.9} />
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#fff', whiteSpace: 'nowrap' }}>{curLang.native}</span>
                <Icon name="chevron" size={14} color="rgba(255,255,255,0.8)" strokeWidth={2.4} style={{ transform: langOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .2s' }} />
              </button>
            </div>
          </div>
          <div style={{ marginTop: 22, position: 'relative' }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 26, color: '#fff', letterSpacing: -0.5, lineHeight: 1.15 }}>{tr('login_welcome')} 👋</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: 600 }}>{tr('login_sub')}</div>
          </div>
        </div>

        {/* language dropdown — rendered at screen root so it escapes the cap's overflow:hidden */}
        {langOpen && <>
          <div onClick={() => setLangOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 39 }} />
          <div style={{ position: 'absolute', top: 66, right: 20, zIndex: 40, width: 168, background: t.surface, borderRadius: 16, border: `1px solid ${t.line}`, boxShadow: t.shadowLg, overflow: 'hidden', padding: 5 }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 10.5, color: t.inkFaint, letterSpacing: 0.6, padding: '8px 10px 5px' }}>{tr('langLabel').toUpperCase()}</div>
            {LANGS.map(l => {
              const sel = l.code === lang;
              return (
                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 10px', borderRadius: 11, border: 'none', cursor: 'pointer',
                    background: sel ? (t.dark ? 'rgba(51,191,159,0.15)' : '#0E5C4A12') : 'transparent', textAlign: 'left' }}>
                  <span style={{ flex: 1, fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14.5, color: sel ? t.primary : t.ink }}>{l.native}</span>
                  {sel && <Icon name="check" size={16} color={t.primary} strokeWidth={2.6} />}
                </button>
              );
            })}
          </div>
        </>}

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 24px' }}>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: t.ink, marginBottom: 4 }}>{tr('login_workAs')}</div>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.inkSoft, marginBottom: 14, fontWeight: 600 }}>{tr('login_tapRole')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
            {roles.map(r => {
              const on = r.key === roleKey;
              return (
                <button key={r.key} onClick={() => setRoleKey(r.key)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '13px 4px', borderRadius: 18, cursor: 'pointer',
                    background: on ? r.accent : t.surface, border: `1.5px solid ${on ? r.accent : t.line}`,
                    boxShadow: on ? `0 10px 22px -8px ${r.accent}aa` : t.shadow, transform: on ? 'translateY(-2px)' : 'none', transition: 'all .2s' }}>
                  <Icon name={r.icon} size={24} color={on ? '#fff' : r.accent} strokeWidth={1.9} />
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 10.5, color: on ? '#fff' : t.inkSoft, textAlign: 'center', lineHeight: 1.1 }}>{tr('role_' + r.key)}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: t.ink, marginBottom: 10 }}>{tr('login_mobile')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.surface, border: `1.5px solid ${t.line}`, borderRadius: 16, padding: '0 16px', height: 58, boxShadow: t.shadow, marginBottom: 14 }}>
            <Icon name="phone" size={20} color={role.accent} strokeWidth={1.9} />
            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, color: t.ink }}>+91</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="numeric"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, color: t.ink, letterSpacing: 1 }} />
          </div>

          <Btn t={t} kind="primary" full accent={role.accent} iconRight="arrowR" onClick={() => onAuth(roleKey)}>{tr('login_cta')}</Btn>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, opacity: 0.9 }}>
            <Icon name="shield" size={15} color={t.inkFaint} strokeWidth={1.8} />
            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: t.inkFaint, fontWeight: 600 }}>{tr('login_secured')}</span>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { Splash, Login });
})();
