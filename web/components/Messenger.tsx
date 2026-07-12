'use client';

import { useEffect, useRef, useState } from 'react';

import { avatarColor, initials, statusMark, timeLabel } from '@/lib/format';
import { useKith } from '@/lib/store';
import { Brand } from './Brand';

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function Messenger() {
  const username = useKith((s) => s.username);
  const conversations = useKith((s) => s.conversations);
  const messages = useKith((s) => s.messages);
  const activeId = useKith((s) => s.activeId);
  const error = useKith((s) => s.error);
  const select = useKith((s) => s.select);
  const startChat = useKith((s) => s.startChat);
  const sendText = useKith((s) => s.sendText);
  const logout = useKith((s) => s.logout);

  const [handle, setHandle] = useState('');
  const [draft, setDraft] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId);
  const thread = activeId ? (messages[activeId] ?? []) : [];
  const sorted = [...conversations].sort((a, b) => b.lastAt - a.lastAt);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, activeId]);

  const onNewChat = () => {
    const u = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (u.length >= 3) {
      void startChat(u);
      setHandle('');
    }
  };

  const onSend = () => {
    if (draft.trim()) {
      void sendText(draft);
      setDraft('');
    }
  };

  return (
    <div className="app" data-active={!!activeId}>
      <aside className="sidebar">
        <div className="side-head">
          <Brand size={34} />
          <span className="name">{username ? `@${username}` : 'Kith'}</span>
          <button className="iconbtn" title="Sign out" aria-label="Sign out" onClick={() => void logout()}>
            <IconLogout />
          </button>
        </div>

        <div className="newchat">
          <div className="control" style={{ height: 46 }}>
            <span>@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Message a username" autoCapitalize="none" autoComplete="off" onKeyDown={(e) => e.key === 'Enter' && onNewChat()} />
          </div>
          {error ? <p className="err" style={{ marginTop: 8 }}>{error}</p> : null}
        </div>

        <div className="convlist">
          {sorted.length === 0 ? (
            <p className="hint" style={{ padding: 20 }}>No conversations yet. Enter a username above to start an encrypted chat.</p>
          ) : (
            sorted.map((c) => (
              <button key={c.id} className="conv" data-on={c.id === activeId} onClick={() => void select(c.id)}>
                <span className="avatar" style={{ background: avatarColor(c.id) }}>{initials(c.title)}</span>
                <span className="conv-body">
                  <span className="conv-top">
                    <span className="conv-title">{c.title}</span>
                    <span className="conv-time">{timeLabel(c.lastAt)}</span>
                  </span>
                  <span className="conv-top">
                    <span className="conv-prev">{c.lastPreview || (c.kind === 'group' ? 'Group' : 'Say hello')}</span>
                    {c.unread > 0 ? <span className="badge">{c.unread}</span> : null}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="main">
        {!active ? (
          <div className="empty">
            <Brand size={72} />
            <p style={{ marginTop: 18, fontSize: 15 }}>Select a conversation to start messaging.</p>
            <p style={{ marginTop: 6, fontSize: 13 }}>Every message is end-to-end encrypted. The relay only ever sees ciphertext.</p>
          </div>
        ) : (
          <>
            <div className="main-head">
              <span className="avatar" style={{ width: 40, height: 40, fontSize: 15, background: avatarColor(active.id) }}>{initials(active.title)}</span>
              <div className="who">
                <div className="t">{active.title}</div>
                <div className="enc">{active.kind === 'group' ? `${active.members.length + 1} members, encrypted` : 'end-to-end encrypted'}</div>
              </div>
              <button className="iconbtn" onClick={() => select('')} aria-label="Back" title="Back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            </div>

            <div className="thread" ref={threadRef}>
              {thread.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--ink-3)', fontSize: 14 }}>No messages yet. Say hello.</div>
              ) : (
                thread.map((m) => (
                  <div key={m.id} className={`row ${m.mine ? 'mine' : 'them'}`}>
                    <div className="bubble">
                      {m.text}
                      <div className="meta">
                        <span>{timeLabel(m.at)}</span>
                        {m.mine ? <span>{statusMark(m.status)}</span> : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="composer">
              <div className="field-wrap">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                />
              </div>
              <button className="send" disabled={!draft.trim()} onClick={onSend} aria-label="Send">
                <IconSend />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
