import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { renderIcon } from '../utils/renderIcon';
import StatusBar from '../components/StatusBar';

// The 4 sidebar nav items. Order matters: the e2e addresses them by anchor
// index (0=edit, 1=results, 2=explorer, 3=config).
const NAV_ITEMS = [
  { to: '/editor', title: 'edit', icon: 'punchCard' },
  { to: '/results', title: 'results', icon: 'printout' },
  { to: '/explorer', title: 'explorer', icon: 'mainframe' },
  { to: '/config', title: 'config', icon: 'settings' }
];

function App(props) {
  return (
    <div className={`app-root theme-${props.theme}`}>
      <div className="app-body">
        <nav className="nav-pane">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'nav-item nav-item-active' : 'nav-item'
              }
              title={item.title}
            >
              {renderIcon(item.icon, props.theme)}
            </NavLink>
          ))}
        </nav>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

function mapStateToProps(state) {
  return {
    theme: state.uiStyle.theme,
    color: state.uiStyle.color
  };
}

export default connect(mapStateToProps)(App);
