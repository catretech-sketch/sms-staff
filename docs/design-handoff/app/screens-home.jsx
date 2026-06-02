// screens-home.jsx — Home dashboard
// Exports: HomeScreen
(function () {
  const { useState, useEffect } = React;

  function HeroToday({ t, app, role }) {
    const ci = app.checkedIn;
    return (
      <div style={{ borderRadius: 26, padding: 20, position: 'relative', overflow: 'hidden',
        background: ci ? `linear-gradient(150deg, ${role.accent}, ${role.accent}cc)` : 'linear-gradient(155deg,#16735C,#0B4A3B)',
        boxShadow: `0 20px 44px -16px ${ci ? role.accent : '#0E5C4A'}99` }}>
        <div className="sm-float2" style={{ position: 'absolute', top: -50, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2, whiteSpace: 'nowrap' }}>{tr('day_mon')} · 02 {tr('mon_jun')}</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 23, color: '#fff', letterSpacing: -0.4, marginTop: 5 }}>{tr('home_today')}</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: ci ? '#9BF0C4' : '#F2C766', boxShadow: `0 0 0 4px ${ci ? 'rgba(155,240,196,0.25)' : 'rgba(242,199,102,0.25)'}` }} className="sm-blink" />
            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12.5, color: '#fff' }}>{ci ? tr('home_onDuty') : tr('home_notStarted')}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 18, position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="clock" size={15} color="rgba(255,255,255,0.8)" />
              <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 0.4 }}>{tr('home_timing')}</span>
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', marginTop: 3 }}>7:30 – 3:30</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="pin" size={15} color="rgba(255,255,255,0.8)" />
              <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 0.4 }}>{tr('home_dutyPost')}</span>
            </div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', marginTop: 3 }}>{role.key === 'driver' ? 'Route 7 · Bus' : tr('home_postMain')}</div>
          </div>
        </div>
        <div style={{ marginTop: 18, position: 'relative' }}>
          {ci ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.16)' }}>
              <Icon name="check" size={20} color="#fff" strokeWidth={2.6} />
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14.5, color: '#fff' }}>{tr('home_checkedInAt', { time: app.checkInTime })}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff' }}>{app.elapsed}</span>
            </div>
          ) : (
            <Btn t={t} kind="gold" full icon="gps" onClick={() => app.go('attendance')}>{tr('home_tapCheckIn')}</Btn>
          )}
        </div>
      </div>
    );
  }

  function StatTrio({ t, app, role }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 11 }}>
        <Card t={t} pad={14} onClick={() => app.go('attendance')}>
          <Ring value={0.78} size={46} stroke={6} color={role.accent} t={t}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: t.ink }}>34</span>
          </Ring>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12.5, color: t.ink, marginTop: 9 }}>{tr('stat_hrsWeek')}</div>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11, color: t.inkSoft, fontWeight: 600 }}>{tr('stat_of', { n: 44 })}</div>
        </Card>
        <Card t={t} pad={14}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: t.warnSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="fire" size={24} color={t.warn} strokeWidth={1.8} />
          </div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 19, color: t.ink, marginTop: 9, lineHeight: 1 }}>21<span style={{ fontSize: 12, color: t.inkSoft, fontWeight: 700 }}> {tr('unit_days')}</span></div>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11.5, color: t.inkSoft, fontWeight: 700 }}>{tr('stat_streak')}</div>
        </Card>
        <Card t={t} pad={14} onClick={() => app.go('leave')}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: t.dark ? 'rgba(51,191,159,0.15)' : '#0E5C4A14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gift" size={24} color={t.primary} strokeWidth={1.8} />
          </div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 19, color: t.ink, marginTop: 9, lineHeight: 1 }}>12<span style={{ fontSize: 12, color: t.inkSoft, fontWeight: 700 }}> {tr('unit_left')}</span></div>
          <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 11.5, color: t.inkSoft, fontWeight: 700 }}>{tr('stat_leaveDays')}</div>
        </Card>
      </div>
    );
  }

  function RouteCard({ t, app, role }) {
    return (
      <Card t={t} onClick={() => app.go('driver')} style={{ background: t.dark ? t.surface : '#fff', borderLeft: `4px solid ${role.accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 48, height: 48, borderRadius: 15, background: role.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bus" size={26} color={role.accent} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: t.ink }}>Route 7 · Greenfield North</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.inkSoft, fontWeight: 600, marginTop: 2 }}>Bus HR-26-BX-4412 · 18 stops</div>
          </div>
          <Icon name="chevron" size={20} color={t.inkFaint} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
          <Pill t={t} tone="danger" icon="alert">{tr('route_license')}</Pill>
          <Pill t={t} tone="success" icon="check">{tr('route_fitness')}</Pill>
        </div>
      </Card>
    );
  }

  function TaskPeek({ t, app }) {
    const pend = app.tasks.filter(x => !x.done).slice(0, 2);
    return (
      <div>
        <SectionLabel t={t} right={<button onClick={() => app.go('tasks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 13, color: t.primary }}>{tr('home_viewAll')}</button>}>{tr('home_pendingTasks')}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pend.map(task => (
            <Card t={t} key={task.id} pad={14} onClick={() => app.go('tasks')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: t.sunken, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={task.icon} size={21} color={t.inkSoft} strokeWidth={1.9} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14.5, color: t.ink }}>{tr(task.tkey)}</div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: t.inkSoft, fontWeight: 600, marginTop: 1 }}>{task.whereK ? tr(task.whereK) : task.where} · {tr(task.tmKey)}</div>
                </div>
                <Pill t={t} tone={task.priority === 'high' ? 'danger' : 'warn'}>{task.priority === 'high' ? tr('prio_urgent') : tr('prio_today')}</Pill>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  function AlertCard({ t }) {
    return (
      <Card t={t} style={{ background: t.dark ? 'rgba(242,199,102,0.10)' : t.goldSoft, border: `1px solid ${t.dark ? 'rgba(242,199,102,0.25)' : '#F2D89A'}` }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: t.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="bell" size={21} color="#3A2A06" strokeWidth={1.9} />
          </div>
          <div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14.5, color: t.dark ? t.gold : '#7A5510' }}>{tr('alert_title')}</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, color: t.dark ? t.inkSoft : '#9A7A3A', fontWeight: 600, marginTop: 2 }}>{tr('alert_sub')}</div>
          </div>
        </div>
      </Card>
    );
  }

  function HomeScreen({ t, app, role }) {
    const [on, setOn] = useState(false);
    useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(r); }, []);
    let i = 0;
    const blocks = [];
    blocks.push(<div key="hero" style={useStagger(on, i++)}><HeroToday t={t} app={app} role={role} /></div>);
    blocks.push(<div key="stats" style={useStagger(on, i++)}><StatTrio t={t} app={app} role={role} /></div>);
    if (role.key === 'driver') blocks.push(<div key="route" style={useStagger(on, i++)}><RouteCard t={t} app={app} role={role} /></div>);
    blocks.push(<div key="tasks" style={useStagger(on, i++)}><TaskPeek t={t} app={app} /></div>);
    blocks.push(<div key="alert" style={useStagger(on, i++)}><AlertCard t={t} /></div>);

    return (
      <div className="sm-screen" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden' }}>
        {/* greeting bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 18px 12px' }}>
          <Avatar t={t} name={app.user} accent={role.accent} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, color: t.inkSoft, fontWeight: 700 }}>{tr('home_greeting')}</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 18, color: t.ink, letterSpacing: -0.3, lineHeight: 1.05 }}>{app.user.split(' ')[0]} 👋</div>
          </div>
          <IconBtn t={t} name={t.dark ? 'sun' : 'moon'} onClick={app.toggleTheme} />
          <IconBtn t={t} name="bell" badge onClick={() => {}} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {blocks}
        </div>
      </div>
    );
  }

  window.HomeScreen = HomeScreen;
})();
