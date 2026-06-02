// app.jsx — App shell: state, navigation, bottom nav, transitions
// Mounts into #root
(function () {
  const { useState, useEffect, useRef } = React;

  const TABS = ['home', 'roster', 'tasks', 'profile'];
  const OVERLAYS = ['attendance', 'leave', 'driver'];

  function BottomNav({ t, role, tab, go }) {
    const items = [
      { key: 'home', icon: 'home', label: tr('nav_home') },
      { key: 'roster', icon: 'calendar', label: tr('nav_roster') },
      { key: 'tasks', icon: 'tasks', label: tr('nav_tasks') },
      { key: 'profile', icon: 'user', label: tr('nav_me') },
    ];
    return (
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 26, height: 66, zIndex: 30,
        background: t.dark ? 'rgba(20,36,30,0.86)' : 'rgba(255,255,255,0.86)', backdropFilter: 'blur(16px)',
        borderRadius: 26, border: `1px solid ${t.line}`, boxShadow: t.shadowLg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
        {items.slice(0, 2).map(it => <NavItem key={it.key} {...{ t, role, it, tab, go }} />)}
        {/* center FAB */}
        <button onClick={() => go('attendance')} style={{ position: 'relative', top: -22, width: 60, height: 60, borderRadius: 22, border: `4px solid ${t.dark ? t.bg : t.bg}`, cursor: 'pointer',
          background: `radial-gradient(circle at 38% 30%, ${role.accent}, ${role.accent}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 14px 30px -8px ${role.accent}` }}>
          <Icon name="gps" size={28} color="#fff" strokeWidth={2} />
          <span className="sm-pulse" style={{ position: 'absolute', inset: -4, borderRadius: 24, border: `2px solid ${role.accent}66` }} />
        </button>
        {items.slice(2).map(it => <NavItem key={it.key} {...{ t, role, it, tab, go }} />)}
      </div>
    );
  }

  function NavItem({ t, role, it, tab, go }) {
    const on = tab === it.key;
    return (
      <button onClick={() => go(it.key)} style={{ flex: 1, maxWidth: 70, height: 56, border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Icon name={it.icon} size={23} color={on ? role.accent : t.inkFaint} strokeWidth={on ? 2.2 : 1.8} />
        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 10.5, color: on ? role.accent : t.inkFaint }}>{it.label}</span>
      </button>
    );
  }

  function App() {
    const [dark, setDark] = useState(false);
    const [authed, setAuthed] = useState(false);
    const [step, setStep] = useState('splash');
    const [lang, setLang] = useState('en');
    const [roleKey, setRoleKey] = useState('driver');
    const [tab, setTab] = useState('home');
    const [overlay, setOverlay] = useState(null);
    const [checkedIn, setCheckedIn] = useState(false);
    const [checkInAt, setCheckInAt] = useState(null);
    const [elapsed, setElapsed] = useState('0m');
    const [tasks, setTasks] = useState([
      { id: 1, tkey: 'task1', where: 'Bus HR-26-BX-4412', tmKey: 'task1_time', byKey: 'by_transport', priority: 'high', icon: 'bus', done: false },
      { id: 2, tkey: 'task2', where: 'North Depot', tmKey: 'task2_time', byKey: 'by_transport', priority: 'high', icon: 'drop', done: false },
      { id: 3, tkey: 'task3', whereK: 'task3_where', tmKey: 'task3_time', byKey: 'by_admin', priority: 'normal', icon: 'broom', done: false },
      { id: 4, tkey: 'task4', whereK: 'task4_where', tmKey: 'task4_time', byKey: 'by_clerk', priority: 'normal', icon: 'doc', done: false },
    ]);
    const t = makeTheme(dark);
    const role = ROLES[roleKey];
    window.__appLang = lang; // make tr() resolve to current language before children render

    // elapsed timer
    useEffect(() => {
      if (!checkedIn || !checkInAt) return;
      const tick = () => {
        const s = Math.floor((Date.now() - checkInAt) / 1000);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
      };
      tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
    }, [checkedIn, checkInAt]);

    const go = (name) => {
      if (TABS.includes(name)) { setTab(name); setOverlay(null); }
      else if (OVERLAYS.includes(name)) setOverlay(name);
      else if (name === 'home') { setTab('home'); setOverlay(null); }
    };

    const app = {
      user: roleKey === 'driver' ? 'Ramesh Kumar' : 'Ramesh Kumar',
      role, dark, tab, overlay,
      checkedIn, checkInTime: checkInAt ? new Date(checkInAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '8:42 AM', elapsed,
      tasks,
      lang, setLang,
      go,
      toggleTheme: () => setDark(d => !d),
      checkIn: () => { setCheckedIn(true); setCheckInAt(Date.now()); },
      checkOut: () => { setCheckedIn(false); setCheckInAt(null); setElapsed('0m'); },
      completeTask: (id) => setTasks(ts => ts.map(x => x.id === id ? { ...x, done: true } : x)),
      logout: () => { setAuthed(false); setStep('login'); setOverlay(null); setTab('home'); },
    };

    // which view + chrome
    const view = authed ? (overlay || tab) : step;
    const showNav = authed && !overlay;
    const isOverlay = OVERLAYS.includes(view);

    // status / gesture bar chrome per view
    const chrome = {
      splash: { sBg: '#16735C', sTint: '#fff', gBg: '#0a3e32', gTint: '#fff' },
      login:  { sBg: '#16735C', sTint: '#fff', gBg: t.bg, gTint: t.ink },
    }[view] || { sBg: t.bg, sTint: t.ink, gBg: t.bg, gTint: t.ink };

    let screen;
    if (!authed && view === 'splash') screen = <Splash t={t} go={() => setStep('login')} />;
    else if (!authed) screen = <Login t={t} lang={lang} setLang={setLang} onAuth={(rk) => { setRoleKey(rk); setAuthed(true); setTab('home'); setCheckedIn(false); setCheckInAt(null); }} />;
    else if (view === 'home') screen = <HomeScreen t={t} app={app} role={role} />;
    else if (view === 'roster') screen = <RosterScreen t={t} app={app} role={role} />;
    else if (view === 'tasks') screen = <TasksScreen t={t} app={app} role={role} />;
    else if (view === 'profile') screen = <ProfileScreen t={t} app={app} role={role} />;
    else if (view === 'attendance') screen = <AttendanceScreen t={t} app={app} role={role} />;
    else if (view === 'leave') screen = <LeaveScreen t={t} app={app} role={role} />;
    else if (view === 'driver') screen = <DriverScreen t={t} app={app} role={role} />;

    return (
      <div style={{ width: 400, height: 858, borderRadius: 46, padding: 7, background: 'linear-gradient(160deg,#2a2a2e,#0d0d0f)', boxShadow: '0 50px 110px -30px rgba(0,0,0,0.6)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 40, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: chrome.sBg }}><StatusBar t={t} tint={chrome.sTint} /></div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: t.bg }}>
            <div key={view} className={isOverlay ? 'sm-view-push' : 'sm-view-fade'} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              {screen}
            </div>
            {showNav && <BottomNav t={t} role={role} tab={tab} go={go} />}
          </div>
          <div style={{ background: chrome.gBg }}><GestureBar t={t} tint={chrome.gTint} /></div>
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
