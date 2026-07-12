'use client';

import { useState } from 'react';

import { useKith } from '@/lib/store';
import { Brand } from './Brand';

type Tab = 'new' | 'signin' | 'restore';

export function Welcome() {
  const register = useKith((s) => s.register);
  const login = useKith((s) => s.login);
  const restoreWithPhrase = useKith((s) => s.restoreWithPhrase);

  const [tab, setTab] = useState<Tab>('new');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onUser = (v: string) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''));

  const valid =
    tab === 'new'
      ? username.length >= 3 && displayName.trim().length >= 1
      : tab === 'signin'
        ? username.length >= 3
        : username.length >= 3 && phrase.trim().split(/\s+/).length >= 12;

  const submit = async () => {
    if (!valid || busy) return;
    setErr('');
    setBusy(true);
    try {
      if (tab === 'new') await register(username, displayName.trim());
      else if (tab === 'signin') await login(username);
      else await restoreWithPhrase(username, phrase);
    } catch {
      setErr(
        tab === 'signin'
          ? 'Could not sign in. Check the username, and that this browser holds your keys.'
          : tab === 'restore'
            ? 'Could not restore. Check the username and that all twelve words are correct.'
            : 'Could not create the account. That username may be taken, or the relay is unreachable.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-head">
          <Brand size={44} />
          <h1>Kith for Web</h1>
        </div>
        <p className="welcome-sub">Private by default, end-to-end encrypted before your message leaves the tab. No phone number, just a key that stays on this device.</p>

        <div className="tabs" role="tablist">
          <button role="tab" data-on={tab === 'new'} onClick={() => setTab('new')}>New account</button>
          <button role="tab" data-on={tab === 'signin'} onClick={() => setTab('signin')}>Sign in</button>
          <button role="tab" data-on={tab === 'restore'} onClick={() => setTab('restore')}>Restore</button>
        </div>

        {tab === 'new' ? (
          <div className="field">
            <label htmlFor="dn">Display name</label>
            <div className="control">
              <input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ada Okafor" maxLength={60} />
            </div>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="un">Username</label>
          <div className="control">
            <span>@</span>
            <input id="un" value={username} onChange={(e) => onUser(e.target.value)} placeholder="username" autoComplete="off" autoCapitalize="none" onKeyDown={(e) => e.key === 'Enter' && tab !== 'restore' && submit()} />
          </div>
        </div>

        {tab === 'restore' ? (
          <div className="field">
            <label htmlFor="ph">Recovery phrase</label>
            <textarea id="ph" className="control" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Twelve words, separated by spaces" autoCapitalize="none" autoComplete="off" />
          </div>
        ) : null}

        {err ? <p className="err">{err}</p> : null}

        <button className="btn" disabled={!valid || busy} onClick={submit}>
          {busy ? 'One moment' : tab === 'new' ? 'Create account' : tab === 'signin' ? 'Sign in' : 'Restore account'}
        </button>

        <p className="hint">
          Heads-up: on the web your keys live in this browser, which is less protected than a phone&apos;s secure enclave. Use the app on a device you trust.
        </p>
      </div>
    </div>
  );
}
