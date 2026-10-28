import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ChevronDoubleLeft20Regular,
  ChevronDoubleRight20Regular,
  Dismiss24Regular,
  Navigation24Regular,
} from '@fluentui/react-icons'
import { navigationGroups } from './navigation'
import './AppShell.css'

export function AppShell() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="app-shell">
      <button
        className="mobile-menu-button"
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isMobileOpen}
        onClick={() => setIsMobileOpen(true)}
      >
        <Navigation24Regular />
      </button>
      <aside className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''} ${isMobileOpen ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar__brand">
          <div className="brand-mark" aria-hidden="true">AP</div>
          {!isCollapsed && (
            <div className="sidebar__brand-text">
              <strong>NPMotors</strong>
              <span>Accounting System</span>
            </div>
          )}
          <button
            className="sidebar__close mobile-only"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileOpen(false)}
          >
            <Dismiss24Regular />
          </button>
        </div>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {navigationGroups.map((group) => (
            <div key={group.section} className="sidebar__group">
              {isCollapsed ? <hr className="sidebar__divider" /> : <p className="sidebar__label">{group.section}</p>}
              {group.items.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
                  title={isCollapsed ? label : undefined}
                  aria-label={isCollapsed ? label : undefined}
                >
                  <Icon />
                  {!isCollapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar" aria-hidden="true">PC</div>
            {!isCollapsed && (
              <div className="sidebar__user-text">
                <strong>Patricia Chen</strong>
                <span>CFO · Accountant</span>
              </div>
            )}
          </div>
          <button
            className="collapse-button"
            type="button"
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? <ChevronDoubleRight20Regular /> : <ChevronDoubleLeft20Regular />}
          </button>
        </div>
      </aside>
      {isMobileOpen && <button className="sidebar-overlay" aria-label="Close navigation menu" type="button" onClick={() => setIsMobileOpen(false)} />}
      <main className="main-content"><Outlet /></main>
    </div>
  )
}
