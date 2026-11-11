import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { OBJECT_SPECS, type ObjectKey } from '../src/schema/objects';
import { clearToken, getToken, signIn } from './api';
import { NAVIGATION, OBJECT_VIEWS } from './config';
import { displayName, specOf } from './fields';
import { ListPage, RecordPage } from './generic';
import {
  AssessmentPanel,
  FrameworkPanel,
  HeatMap,
  Overview,
  VendorPanel,
} from './panels';
import { StoreProvider, useStore } from './store';
import styles from './styles.css';

type Route = { objectKey?: ObjectKey; recordId?: string };

const parseRoute = (hash: string): Route => {
  const [, kind, objectKey, recordId] = hash.replace(/^#/, '').split('/');

  return kind === 'o' && objectKey in OBJECT_SPECS
    ? { objectKey: objectKey as ObjectKey, recordId }
    : {};
};

const useRoute = () => {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  // The hash is the only navigation state, so the URL is shareable and the
  // browser's back button works.
  useEffect(() => {
    const handleChange = () => setRoute(parseRoute(window.location.hash));

    window.addEventListener('hashchange', handleChange);

    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return route;
};

type Toast = { message: string; isError: boolean } | null;

const Login = ({ onSignedIn }: { onSignedIn: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setError(null);

    try {
      await signIn(email, password);
      onSignedIn();
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : 'Sign-in failed',
      );
      setIsBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="row">
          <span className="brand-mark" style={{ color: '#fff' }}>
            G
          </span>
          <h2>GRC Console</h2>
        </div>
        <div className="sub">Sign in with your workspace account.</div>
        <label>
          Email
          <input
            id="login-email"
            className="input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            id="login-password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? (
          <div
            className="badge red"
            style={{ height: 'auto', padding: '6px 8px', whiteSpace: 'normal' }}
          >
            {error}
          </div>
        ) : null}
        <button type="submit" className="btn primary" disabled={isBusy}>
          {isBusy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

const Shell = ({ onSignOut }: { onSignOut: () => void }) => {
  const store = useStore();
  const route = useRoute();
  const [toast, setToast] = useState<Toast>(null);
  const notify = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 4000);
  }, []);
  const record =
    route.objectKey && route.recordId
      ? store.find(route.objectKey, route.recordId)
      : undefined;
  const view = route.objectKey ? OBJECT_VIEWS[route.objectKey] : undefined;

  const renderPage = () => {
    if (store.isLoading)
      return <div className="empty">Loading the program…</div>;
    if (store.error) return <div className="empty">{store.error}</div>;
    if (!route.objectKey) return <Overview />;
    if (!route.recordId) {
      return (
        <ListPage
          key={route.objectKey}
          objectKey={route.objectKey}
          notify={notify}
          header={route.objectKey === 'risk' ? <HeatMap /> : undefined}
        />
      );
    }
    if (!record)
      return <div className="empty">This record no longer exists.</div>;

    return (
      <RecordPage
        key={record.id}
        objectKey={route.objectKey}
        record={record}
        notify={notify}
      >
        {route.objectKey === 'vendor' ? (
          <VendorPanel vendor={record} notify={notify} />
        ) : null}
        {route.objectKey === 'vendorAssessment' ? (
          <AssessmentPanel assessment={record} notify={notify} />
        ) : null}
        {route.objectKey === 'framework' ? (
          <FrameworkPanel framework={record} />
        ) : null}
      </RecordPage>
    );
  };

  return (
    <div className="shell">
      <nav className="side" aria-label="Modules">
        <div className="brand">
          <span className="brand-mark">G</span>GRC Console
        </div>
        <div className="nav-group">
          <button
            type="button"
            className={`nav-item ${route.objectKey ? '' : 'active'}`}
            onClick={() => {
              window.location.hash = '#/';
            }}
          >
            Program overview
          </button>
        </div>
        {NAVIGATION.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((objectKey) => (
              <button
                key={objectKey}
                type="button"
                className={`nav-item ${route.objectKey === objectKey ? 'active' : ''}`}
                onClick={() => {
                  window.location.hash = `#/o/${objectKey}`;
                }}
              >
                {specOf(objectKey).labelPlural}
                <span className="nav-count">
                  {store.records(objectKey).length || ''}
                </span>
              </button>
            ))}
          </div>
        ))}
        <div className="side-foot">
          <a href="/" target="_blank" rel="noreferrer">
            Admin workspace
          </a>
          <button type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </nav>
      {/* Keyed by route so each page opens scrolled to the top. */}
      <div className="main" key={`${route.objectKey}/${route.recordId}`}>
        <div className="topbar">
          <div className="crumbs">
            <a href="#/">Overview</a>
            {route.objectKey ? (
              <>
                <span>/</span>
                <a href={`#/o/${route.objectKey}`}>
                  {view?.title ?? specOf(route.objectKey).labelPlural}
                </a>
              </>
            ) : null}
            {record ? (
              <>
                <span>/</span>
                <b>{displayName(record)}</b>
              </>
            ) : null}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() =>
              void store.reload().then(() => notify('Data refreshed'))
            }
          >
            Refresh
          </button>
        </div>
        <div className="content">{renderPage()}</div>
      </div>
      {toast ? (
        <div className={`toast ${toast.isError ? 'error' : ''}`} role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
};

const App = () => {
  const [isSignedIn, setIsSignedIn] = useState(() => getToken() !== null);
  const handleSignOut = useCallback(() => {
    clearToken();
    setIsSignedIn(false);
  }, []);

  return isSignedIn ? (
    <StoreProvider onSessionExpired={handleSignOut}>
      <Shell onSignOut={handleSignOut} />
    </StoreProvider>
  ) : (
    <Login onSignedIn={() => setIsSignedIn(true)} />
  );
};

const style = document.createElement('style');

style.textContent = styles;
document.head.append(style);
createRoot(document.getElementById('root') as HTMLElement).render(<App />);
