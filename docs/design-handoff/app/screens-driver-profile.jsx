// screens-driver-profile.jsx — Driver view + Profile
// Exports: DriverScreen, ProfileScreen
(function () {
  const { useState, useEffect, useRef } = React;

  const STOPS = [
    { name: 'Greenfield North Depot', time: '7:00', kids: 0, status: 'done' },
    { name: 'Sector 12 Market', time: '7:14', kids: 6, status: 'done' },
    { name: 'Rosewood Apartments', time: '7:26', kids: 9, status: 'next' },
    { name: 'Lake View Colony', time: '7:38', kids: 7, status: 'todo' },
    { name: 'School Main Gate', time: '7:55', kids: 0, status: 'todo' },
  ];

  function DriverScreen({ t, app, role }) {
    const [trip, setTrip] = useState(false);
    const [sec, setSec] = useState(0);
    const btnRef = useRef(null);
    useEffect(() => { if (!trip) return; const id = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(id); }, [trip]);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
    const onboard = trip ? 15 : 0;
    const toggle = () => {
      if (!trip) { setTrip(true); setSec(0); burstConfetti(btnRef.current, [role.accent, t.gold, t.success]); }
      else { setTrip(false); }
    };
    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden' }}>
        <Header t={t} title={tr('drv_title')} sub="Route 7" onBack={() => app.go('home')}
          right={<IconBtn t={t} name="phone" tint={role.accent} onClick={() => {}} />} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* license banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 15, borderRadius: 18, background: t.warnSoft, border: `1px solid ${t.dark ? 'rgba(240,181,96,0.3)' : '#F2D89A'}` }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: t.warn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="alert" size={22} color="#3A2A06" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: t.dark ? t.warn : '#7A5510' }}>{tr('drv_licBanner')}</div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: t.dark ? t.inkSoft : '#9A7A3A', fontWeight: 600 }}>DL-HR2620 · Renew before 26 Jun</div>
            </div>
            <Btn t={t} kind="gold" style={{ height: 40, padding: '0 14px', fontSize: 13 }} onClick={() => {}}>{tr('drv_renew')}</Btn>
          </div>

          {/* vehicle card */}
          <Card t={t} raised style={{ background: `linear-gradient(150deg, ${role.accent}, ${role.accent}cc)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 }}>{tr('drv_assignedBus')}</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 24, color: '#fff', marginTop: 4 }}>HR-26-BX-4412</div>
              </div>
              <div style={{ width: 56, height: 56, borderRadius: 17, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bus" size={30} color="#fff" strokeWidth={1.8} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              {[[tr('drv_capacity'), tr('drv_seats')], [tr('drv_fuel'), '78%'], [tr('drv_fitness'), tr('drv_valid')]].map(([k, v]) => (
                <div key={k} style={{ flex: 1, background: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: '11px 12px' }}>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10.5, color: 'rgba(255,255,255,0.75)', fontWeight: 800, letterSpacing: 0.4 }}>{k.toUpperCase()}</div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* trip status / start */}
          <Card t={t}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: trip ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 11, height: 11, borderRadius: 11, background: trip ? t.success : t.inkFaint, boxShadow: trip ? `0 0 0 5px ${t.successSoft}` : 'none' }} className={trip ? 'sm-blink' : ''} />
                <div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: t.ink }}>{trip ? tr('drv_inProgress') : tr('drv_morningPickup')}</div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.inkSoft, fontWeight: 600 }}>{trip ? tr('drv_onboard', { n: onboard }) : tr('drv_stopsStudents')}</div>
                </div>
              </div>
              {trip && <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 22, color: role.accent, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10.5, color: t.inkSoft, fontWeight: 700, letterSpacing: 0.5 }}>{tr('drv_elapsed')}</div>
              </div>}
            </div>
            <button ref={btnRef} onClick={toggle} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', marginTop: 14,
              background: trip ? t.dangerSoft : role.accent, color: trip ? t.danger : '#fff', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: trip ? 'none' : `0 12px 26px -10px ${role.accent}` }}>
              <Icon name={trip ? 'stop' : 'play'} size={22} color={trip ? t.danger : '#fff'} strokeWidth={2} />
              {trip ? tr('drv_endTrip') : tr('drv_startTrip')}
            </button>
          </Card>

          {/* stops timeline */}
          <div>
            <SectionLabel t={t}>{tr('drv_stopsTitle')}</SectionLabel>
            <Card t={t}>
              {STOPS.map((s, k) => {
                const done = s.status === 'done', next = s.status === 'next';
                return (
                  <div key={k} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? t.success : next ? role.accent : t.sunken, border: next ? `2px solid ${role.accent}` : 'none', boxShadow: next ? `0 0 0 4px ${role.accent}22` : 'none' }}>
                        {done ? <Icon name="check" size={15} color="#fff" strokeWidth={3} /> : <Icon name="pin" size={15} color={next ? '#fff' : t.inkFaint} strokeWidth={2} />}
                      </div>
                      {k < STOPS.length - 1 && <div style={{ width: 2, height: 30, background: done ? t.success : t.line, marginTop: 2 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: done ? t.inkSoft : t.ink }}>{s.name}</span>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: next ? role.accent : t.inkSoft }}>{s.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        {s.kids > 0 && <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: t.inkSoft, fontWeight: 600 }}>{tr('drv_students', { n: s.kids })}</span>}
                        {next && <Pill t={t} tone="brand">{tr('drv_nextStop')}</Pill>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────── PROFILE ───────────────────────────
  function Row({ t, icon, label, value, onClick, right, accent }) {
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 12px', cursor: onClick ? 'pointer' : 'default' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: (accent || t.inkSoft) + (t.dark ? '26' : '14'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={20} color={accent || t.inkSoft} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14, color: t.ink }}>{label}</div>
          {value && <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.inkSoft, fontWeight: 600, marginTop: 1 }}>{value}</div>}
        </div>
        {right || (onClick && <Icon name="chevron" size={18} color={t.inkFaint} />)}
      </div>
    );
  }
  function Divider({ t }) { return <div style={{ height: 1, background: t.line, margin: '0 12px' }} />; }

  function ProfileScreen({ t, app, role }) {
    const [langOpen, setLangOpen] = useState(false);
    const curLang = LANGS.find(l => l.code === app.lang) || LANGS[0];
    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden', position: 'relative' }}>
        <Header t={t} title={tr('pf_title')} right={<IconBtn t={t} name={t.dark ? 'sun' : 'moon'} onClick={app.toggleTheme} />} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* identity card */}
          <Card t={t} raised style={{ textAlign: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70, background: `linear-gradient(150deg, ${role.accent}, ${role.accent}cc)` }} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>
              <div style={{ padding: 4, borderRadius: 24, background: t.surface }}>
                <Avatar t={t} name={app.user} accent={role.accent} size={78} />
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 22, color: t.ink, marginTop: 12, letterSpacing: -0.4 }}>{app.user}</div>
              <div style={{ marginTop: 8 }}><RolePill t={t} role={role} big /></div>
              <div style={{ display: 'flex', gap: 22, marginTop: 18 }}>
                {[[tr('pf_empId'), 'SM-2241'], [tr('pf_joined'), 'Mar 2021'], [tr('pf_rating'), '4.9★']].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: t.ink }}>{v}</div>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: t.inkSoft, fontWeight: 700, letterSpacing: 0.3 }}>{k.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div>
            <SectionLabel t={t}>{tr('pf_documents')}</SectionLabel>
            <Card t={t} pad={6}>
              <Row t={t} icon="doc" label={tr('doc_license')} value={tr('doc_licExp')} accent={t.warn} right={<Pill t={t} tone="warn">{tr('doc_expiring')}</Pill>} onClick={() => {}} />
              <Divider t={t} />
              <Row t={t} icon="doc" label={tr('doc_id')} value={tr('doc_verified')} accent={t.success} right={<Pill t={t} tone="success" icon="check">{tr('doc_ok')}</Pill>} onClick={() => {}} />
              <Divider t={t} />
              <Row t={t} icon="doc" label={tr('doc_contract')} value={tr('doc_contractValid')} accent={t.primary} right={<Pill t={t} tone="success" icon="check">{tr('doc_ok')}</Pill>} onClick={() => {}} />
            </Card>
          </div>

          <div>
            <SectionLabel t={t}>{tr('pf_emergency')}</SectionLabel>
            <Card t={t} pad={6}>
              <Row t={t} icon="phone" label={`Sunita Kumar (${tr('pf_wifeRel')})`} value="+91 99887 21100" accent={t.danger}
                right={<IconBtn t={t} name="phone" tint="#fff" bg={t.success} size={38} onClick={() => {}} />} />
            </Card>
          </div>

          <div>
            <SectionLabel t={t}>{tr('pf_settings')}</SectionLabel>
            <Card t={t} pad={6}>
              <Row t={t} icon="globe" label={tr('set_language')} value={curLang.native} accent={t.primary} onClick={() => setLangOpen(true)} />
              <Divider t={t} />
              <Row t={t} icon={t.dark ? 'moon' : 'sun'} label={tr('set_darkMode')} accent={t.primary} onClick={app.toggleTheme}
                right={<div onClick={app.toggleTheme} style={{ width: 46, height: 28, borderRadius: 100, background: t.dark ? t.primary : t.sunken, padding: 3, cursor: 'pointer', transition: 'background .2s' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: t.dark ? 'translateX(18px)' : 'translateX(0)', transition: 'transform .2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </div>} />
              <Divider t={t} />
              <Row t={t} icon="bell" label={tr('set_notifications')} value={tr('set_notifSub')} accent={t.primary} onClick={() => {}} />
            </Card>
          </div>

          <Btn t={t} kind="danger" full icon="logout" onClick={app.logout}>{tr('pf_signOut')}</Btn>
          <div style={{ textAlign: 'center', fontFamily: 'Manrope, sans-serif', fontSize: 11.5, color: t.inkFaint, fontWeight: 600 }}>SchoolMate Staff · v1.0.0</div>
        </div>

        {langOpen && (
          <div onClick={() => setLangOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={e => e.stopPropagation()} className="sm-sheet" style={{ width: '100%', background: t.surface, borderRadius: '26px 26px 0 0', padding: '10px 14px max(20px, env(safe-area-inset-bottom))', boxShadow: t.shadowLg }}>
              <div style={{ width: 42, height: 5, borderRadius: 5, background: t.lineStrong, margin: '6px auto 14px' }} />
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 18, color: t.ink, padding: '0 8px 10px', letterSpacing: -0.3 }}>{tr('set_language')}</div>
              {LANGS.map(l => {
                const sel = l.code === app.lang;
                return (
                  <button key={l.code} onClick={() => { app.setLang(l.code); setLangOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '15px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: sel ? (t.dark ? 'rgba(51,191,159,0.15)' : '#0E5C4A12') : 'transparent', textAlign: 'left' }}>
                    <span style={{ flex: 1, fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, color: sel ? t.primary : t.ink }}>{l.native}</span>
                    {sel && <Icon name="check" size={19} color={t.primary} strokeWidth={2.6} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  Object.assign(window, { DriverScreen, ProfileScreen });
})();
