import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <>
      <header className="shell">
        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/" className="brand">
            <span className="brand-mark">
              Drive<span>SA</span>
            </span>
            <span className="brand-tag">Instruct</span>
          </NavLink>
          <div className="nav-links">
            <NavLink to="/book" className={({ isActive }) => (isActive ? 'active' : '')}>
              Book a lesson
            </NavLink>
            <NavLink to="/manage" className={({ isActive }) => (isActive ? 'active' : '')}>
              My bookings
            </NavLink>
          </div>
        </nav>
      </header>
      <Outlet />
      <footer className="shell footer">
        <span>DriveSA Instruct · South Australia</span>
        <span>Lessons across Adelaide metro · AUD pricing</span>
      </footer>
    </>
  )
}
