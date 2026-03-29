'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCheck,
  Settings,
  X,
  Clock,
  ClipboardList,
  TrendingUp,
  AlarmClock,
  BookOpen,
  Flame,
  ShieldCheck,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Inbox,
} from 'lucide-react';
import styles from './notifications.module.css';
import { notifAnimations, getStaggerClass } from '../../../../animations/notifications/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────
type NotifType = 'exam' | 'progress' | 'reminder' | 'study' | 'streak' | 'system';
type FilterTab = 'all' | 'unread' | 'exams' | 'progress' | 'reminders' | 'system';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;   // ISO — maps to Supabase `created_at`
  is_read: boolean;
  link?: string;
  ctaLabel?: string;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<NotifType, { icon: React.ReactNode; cls: string }> = {
  exam:     { icon: <ClipboardList size={18} />, cls: styles.iconExam },
  progress: { icon: <TrendingUp    size={18} />, cls: styles.iconProgress },
  reminder: { icon: <AlarmClock   size={18} />, cls: styles.iconReminder },
  study:    { icon: <BookOpen     size={18} />, cls: styles.iconStudy },
  streak:   { icon: <Flame        size={18} />, cls: styles.iconStreak },
  system:   { icon: <ShieldCheck  size={18} />, cls: styles.iconSystem },
};

// ─── Empty seed — replace with Supabase `notifications` table fetch ───────────
// Schema: id | user_id | type | title | message | is_read | link | created_at
const SEED_NOTIFICATIONS: Notification[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function dateGroup(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return 'This Week';
  return 'Earlier';
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'];

function groupNotifications(list: Notification[]) {
  const map: Record<string, Notification[]> = {};
  list.forEach(n => {
    const g = dateGroup(n.timestamp);
    if (!map[g]) map[g] = [];
    map[g].push(n);
  });
  return GROUP_ORDER.filter(g => map[g]).map(g => ({ label: g, items: map[g] }));
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS: { key: FilterTab; label: string; match: (n: Notification) => boolean }[] = [
  { key: 'all',       label: 'All',       match: () => true },
  { key: 'unread',    label: 'Unread',    match: n => !n.is_read },
  { key: 'exams',     label: 'Exams',     match: n => n.type === 'exam' },
  { key: 'progress',  label: 'Progress',  match: n => n.type === 'progress' },
  { key: 'reminders', label: 'Reminders', match: n => n.type === 'reminder' || n.type === 'streak' },
  { key: 'system',    label: 'System',    match: n => n.type === 'system' },
];

// ─── Settings state ───────────────────────────────────────────────────────────
interface NotifSettings {
  examAlerts: boolean;
  studyReminders: boolean;
  progressUpdates: boolean;
  streakAlerts: boolean;
  systemAlerts: boolean;
  frequency: 'realtime' | 'daily';
}

const DEFAULT_SETTINGS: NotifSettings = {
  examAlerts: true,
  studyReminders: true,
  progressUpdates: true,
  streakAlerts: true,
  systemAlerts: true,
  frequency: 'realtime',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [activeTab, setActiveTab]         = useState<FilterTab>('all');
  const [showSettings, setShowSettings]   = useState(false);
  const [settings, setSettings]           = useState<NotifSettings>(DEFAULT_SETTINGS);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filtered = notifications.filter(TABS.find(t => t.key === activeTab)!.match);
  const groups   = groupNotifications(filtered);

  // ─── Actions ──────────────────────────────────────────────────────────────
  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  function toggleRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: !n.is_read } : n)
    );
  }

  function deleteNotif(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  function toggleSetting(key: keyof Omit<NotifSettings, 'frequency'>) {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={`${styles.header} ${notifAnimations.fadeSlideIn}`}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Notifications</h2>
          <p className={styles.subtitle}>Stay updated with your exams, progress, and reminders</p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.btnMarkAll}
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={15} />
            Mark all as read
          </button>

          <button
            className={styles.btnSettings}
            onClick={() => setShowSettings(true)}
            title="Notification settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={`${styles.tabs} ${notifAnimations.fadeSlideIn}`}>
        {TABS.map(tab => {
          const badgeCount =
            tab.key === 'unread'
              ? unreadCount
              : tab.key === 'all'
                ? unreadCount
                : notifications.filter(tab.match).filter(n => !n.is_read).length;

          return (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {badgeCount > 0 && (
                <span className={styles.tabBadge}>{badgeCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notification list ── */}
      <div className={styles.content}>
        {filtered.length === 0 ? (

          /* ── Empty state ── */
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Inbox size={26} />
            </div>
            <p className={styles.emptyTitle}>
              {activeTab === 'unread' ? 'No unread notifications' : "You're all caught up"}
            </p>
            <p className={styles.emptySubtitle}>
              {activeTab === 'unread'
                ? 'All your notifications have been read.'
                : 'Notifications will appear here once available.'}
            </p>
            <div className={styles.emptyActions}>
              {/* Redirects to student/mock-exam */}
              <Link href="/student/mock-exams" className={styles.emptyBtnPrimary}>
                <ClipboardList size={14} />
                Start a Mock Exam
              </Link>
              {/* Redirects to student/study-materials */}
              <Link href="/student/study-materials" className={styles.emptyBtnSecondary}>
                <BookOpen size={14} />
                Review Study Materials
              </Link>
            </div>
          </div>

        ) : (

          /* ── Grouped list ── */
          groups.map(group => (
            <div key={group.label} className={styles.group}>
              <p className={styles.groupLabel}>{group.label}</p>
              <div className={styles.groupList}>
                {group.items.map((n, i) => {
                  const { icon, cls } = ICON_MAP[n.type];
                  return (
                    <div
                      key={n.id}
                      className={[
                        styles.notifItem,
                        !n.is_read ? styles.notifItemUnread : '',
                        getStaggerClass(i),
                      ].join(' ')}
                      onClick={() => {
                        if (!n.is_read) toggleRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                    >
                      {/* Icon */}
                      <div className={`${styles.iconWrap} ${cls}`}>{icon}</div>

                      {/* Body */}
                      <div className={styles.notifBody}>
                        <div className={styles.notifTitleRow}>
                          <span className={styles.notifTitle}>{n.title}</span>
                          {!n.is_read && (
                            <span className={`${styles.unreadDot} ${notifAnimations.dotPulse}`} />
                          )}
                        </div>
                        <p className={styles.notifMessage}>{n.message}</p>
                        <div className={styles.notifMeta}>
                          <span className={styles.notifTime}>
                            <Clock size={11} />
                            {timeAgo(n.timestamp)}
                          </span>
                          {n.ctaLabel && n.link && (
                            <a
                              href={n.link}
                              className={styles.notifCta}
                              onClick={e => e.stopPropagation()}
                            >
                              {n.ctaLabel}
                              <ChevronRight size={11} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className={styles.notifActions}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          className={styles.actionBtn}
                          title={n.is_read ? 'Mark as unread' : 'Mark as read'}
                          onClick={() => toggleRead(n.id)}
                        >
                          {n.is_read ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          title="Delete"
                          onClick={() => deleteNotif(n.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Settings modal ── */}
      {showSettings && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowSettings(false)}
        >
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <p className={styles.modalTitle}>Notification Settings</p>
              <button className={styles.modalClose} onClick={() => setShowSettings(false)}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>

              {/* Alert toggles */}
              <div>
                <p className={styles.settingsSectionTitle}>Alert Types</p>
                <div className={styles.settingsList}>
                  {(
                    [
                      { key: 'examAlerts',      name: 'Exam Alerts',      desc: 'New exams and graded results' },
                      { key: 'studyReminders',  name: 'Study Reminders',  desc: 'Daily nudges and streak alerts' },
                      { key: 'progressUpdates', name: 'Progress Updates', desc: 'Score milestones and improvements' },
                      { key: 'streakAlerts',    name: 'Streak Alerts',    desc: 'Keep your study streak alive' },
                      { key: 'systemAlerts',    name: 'System',           desc: 'Account and security notices' },
                    ] as { key: keyof Omit<NotifSettings, 'frequency'>; name: string; desc: string }[]
                  ).map(item => (
                    <div key={item.key} className={styles.settingRow}>
                      <div>
                        <p className={styles.settingName}>{item.name}</p>
                        <p className={styles.settingDesc}>{item.desc}</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          className={styles.toggleInput}
                          checked={settings[item.key] as boolean}
                          onChange={() => toggleSetting(item.key)}
                        />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <p className={styles.settingsSectionTitle}>Delivery Frequency</p>
                <div className={styles.settingsList}>
                  <div className={styles.settingRow}>
                    <div>
                      <p className={styles.settingName}>Frequency</p>
                      <p className={styles.settingDesc}>How often to receive notifications</p>
                    </div>
                    <select
                      className={styles.frequencySelect}
                      value={settings.frequency}
                      onChange={e =>
                        setSettings(prev => ({
                          ...prev,
                          frequency: e.target.value as 'realtime' | 'daily',
                        }))
                      }
                    >
                      <option value="realtime">Real-time</option>
                      <option value="daily">Daily Summary</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}