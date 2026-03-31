// app/(dashboard)/student/help/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search, X, ChevronDown, ChevronRight,
  ClipboardList, BarChart2, BookOpen, Clock,
  ShieldCheck, UserCircle, AlertTriangle,
  Mail, Phone, MessageSquare,
  CheckCircle, AlertCircle, Loader2, Send,
  HelpCircle, FileQuestion,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import styles from "./help.module.css";

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface TicketForm {
  subject: string;
  category: string;
  priority: string;
  description: string;
}

// ── Categories — exam-system specific ────────────────────────────────────────
const CATEGORIES = [
  { key: "all",        label: "All Topics",        icon: HelpCircle,    color: "#1e3a5f", bg: "#dce8f5" },
  { key: "taking",     label: "Taking Exams",       icon: ClipboardList, color: "#2563a8", bg: "#dbeafe" },
  { key: "results",    label: "Results & Scores",   icon: BarChart2,     color: "#059669", bg: "#d1fae5" },
  { key: "reviewers",  label: "Reviewers",          icon: BookOpen,      color: "#7c3aed", bg: "#ede9fe" },
  { key: "timing",     label: "Timers & Limits",    icon: Clock,         color: "#d97706", bg: "#fef3c7" },
  { key: "programs",   label: "Degree Programs",    icon: ShieldCheck,   color: "#0e7490", bg: "#cffafe" },
  { key: "account",    label: "My Account",         icon: UserCircle,    color: "#64748b", bg: "#f1f5f9" },
  { key: "technical",  label: "Technical Issues",   icon: AlertTriangle, color: "#dc2626", bg: "#fee2e2" },
];

// ── Fallback FAQs — 100% exam-system focused ──────────────────────────────────
const FALLBACK_FAQS: FaqItem[] = [
  // Taking Exams
  {
    id: "1", category: "taking",
    question: "How do I start a mock board exam?",
    answer:
      "Go to Mock Exams in the left sidebar. Find the exam for your degree program — if its status is Available, click Start Exam. You will be taken to an instructions screen before the timer begins. Make sure you have a stable internet connection and enough time before starting, as leaving mid-exam may count as a submission.",
  },
  {
    id: "2", category: "taking",
    question: "Can I pause or save my progress mid-exam?",
    answer:
      "No. Once you start an exam, the countdown timer runs continuously even if you close the browser tab. Exams are designed to simulate actual PRC board exam conditions and cannot be paused. If your connection drops during the exam, your answers up to that point may be auto-saved depending on system configuration — contact support if you believe your session was cut short unfairly.",
  },
  {
    id: "3", category: "taking",
    question: "What happens if I accidentally close the browser during an exam?",
    answer:
      "If you close the browser, your session timer continues running in the background. You may be able to resume by navigating back to Mock Exams and selecting the same exam — a Resume button will appear if your session is still active. Sessions expire when the time runs out. Any answers already marked are retained and submitted automatically at expiry.",
  },
  {
    id: "4", category: "taking",
    question: "Can I go back and change my answers before submitting?",
    answer:
      "Yes. You can navigate between questions freely using the question navigator panel on the side. Answered items are highlighted so you can track which ones you have completed. Review all flagged or skipped items before hitting Submit Exam. Once submitted, answers are final.",
  },
  {
    id: "5", category: "taking",
    question: "Are the mock exam questions the same every time I retake?",
    answer:
      "Questions may be randomized from a question bank, so you may see a different set each time you retake the same exam. This helps simulate the unpredictability of the actual PRC licensure examination and discourages rote memorization of question sequences.",
  },
  {
    id: "6", category: "taking",
    question: "How many times can I retake a mock exam?",
    answer:
      "Retake limits are set by your assigned faculty or admin. By default, most exams allow unlimited retakes so you can practice as many times as needed. Check the exam details card — it will indicate if a retake limit has been set for that specific exam.",
  },

  // Results & Scores
  {
    id: "7", category: "results",
    question: "Where can I view my exam results and scores?",
    answer:
      "After submitting an exam, your score is displayed immediately on the Results screen. You can also access all past results anytime via Results in the left sidebar. Each result shows your score, percentage, time taken, and a breakdown per subject area.",
  },
  {
    id: "8", category: "results",
    question: "What is the passing score for mock board exams?",
    answer:
      "The system follows PRC standards: a general weighted average of 75% is required to pass, with no subject rating below 50%. Your results screen will clearly indicate Pass or Failed alongside your score. Some programs have different cut-off rules — these are noted in the exam details.",
  },
  {
    id: "9", category: "results",
    question: "Can I review which questions I got wrong after submitting?",
    answer:
      "Yes. On the Results page, click Review Answers next to any completed exam. This shows each question, your selected answer, the correct answer, and a brief rationale. Use this to identify your weak areas and focus your reviewer sessions accordingly.",
  },
  {
    id: "10", category: "results",
    question: "Will my scores be visible to my faculty or admin?",
    answer:
      "Yes. Faculty and administrators can view your exam scores, attempt history, and progress overview through their dashboards. This is intentional — it allows your faculty to monitor your readiness and assign targeted exams if needed. Your scores are not shared with other students.",
  },

  // Reviewers
  {
    id: "11", category: "reviewers",
    question: "What is the difference between a Reviewer and a Mock Exam?",
    answer:
      "A Reviewer is an untimed, practice-mode question set designed for learning. You can answer at your own pace, see instant feedback per item, and retake as many times as you like. A Mock Exam, by contrast, is timed and simulates actual board exam conditions — it is meant to assess your readiness under pressure.",
  },
  {
    id: "12", category: "reviewers",
    question: "How do I access reviewers for my degree program?",
    answer:
      "Navigate to Reviewers in the sidebar. Reviewers are organized by degree program (e.g., BLIS, BSPsych, BEEd). Select your program to see available reviewer sets. You can filter by subject area — for example, BLIS reviewers include Library Science, Reference Services, and Cataloging sets.",
  },
  {
    id: "13", category: "reviewers",
    question: "Can I download reviewer materials as a PDF or print them?",
    answer:
      "Currently, reviewers are only available within the platform and cannot be exported or printed. This ensures question integrity is maintained. Study Materials, however, may include downloadable reading guides — check the Study Materials section for downloadable resources.",
  },

  // Timers & Limits
  {
    id: "14", category: "timing",
    question: "How is the exam timer structured?",
    answer:
      "Each exam has a fixed total duration set by the admin — typically matching PRC board exam time limits (e.g., 5 hours for most engineering boards, 2 hours for BLIS). The timer appears at the top of the exam screen and counts down in real time. A warning is shown when 15 minutes remain.",
  },
  {
    id: "15", category: "timing",
    question: "What happens when the timer reaches zero?",
    answer:
      "The exam is automatically submitted with all answers you have marked up to that point. Unanswered items are scored as incorrect. You will be taken to the Results screen immediately. There is no grace period — manage your time carefully and use the flagging feature to mark items you want to revisit.",
  },

  // Degree Programs
  {
    id: "16", category: "programs",
    question: "Which degree programs currently have available mock exams?",
    answer:
      "The following programs currently have exams ready: Bachelor of Library and Information Science (BLIS), BS Psychology (BSPsych), BS Architecture (BSArch), BS Interior Design (BSID), Bachelor of Elementary Education (BEEd), BSEd - English, BSEd - Filipino, BSEd - Science, and BSEd - Mathematics. Other programs are Coming Soon and will be activated once exams are assigned by your admin.",
  },
  {
    id: "17", category: "programs",
    question: "My program is listed as Coming Soon. When will it be available?",
    answer:
      "Coming Soon status means no exam has been assigned to that program yet by an administrator. Availability depends on your faculty uploading question sets for your degree. You may contact your program coordinator or the support team to request a timeline. You will receive a notification once an exam is activated for your program.",
  },
  {
    id: "18", category: "programs",
    question: "I am enrolled in BSEd-Mathematics. Which subjects are covered in the mock exam?",
    answer:
      "The BSEd-Mathematics mock board exam covers the Licensure Examination for Professional Teachers (LPT) content: General Education, Professional Education, and Specialization in Mathematics (covering Algebra, Geometry, Trigonometry, Calculus, Statistics, and Number Theory). Subject area breakdowns are visible on the Results page after completing an exam.",
  },

  // Account
  {
    id: "19", category: "account",
    question: "How do I update my name or degree program on my profile?",
    answer:
      "Go to Profile in the sidebar and click Edit Info. You can update your display name and contact details. Changing your registered degree program requires a request to your administrator, as it affects which exams and reviewers you have access to. Contact support with your student ID and the program change you need.",
  },
  {
    id: "20", category: "account",
    question: "How do I reset my password?",
    answer:
      "On the login page, click Forgot Password and enter your registered email address. A reset link will be sent within a few minutes. If you do not receive it, check your spam/junk folder. If your account is locked after multiple failed attempts, contact the support team directly.",
  },

  // Technical
  {
    id: "21", category: "technical",
    question: "The exam page is not loading or shows a blank screen. What should I do?",
    answer:
      "First, do a hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac). Clear your browser cache and try again. Ensure you are using a modern browser (Chrome 110+, Firefox 115+, or Edge). Disable browser extensions that might block scripts. If the issue persists, note the exact error message and contact support — do not attempt to start another exam session until the issue is resolved.",
  },
  {
    id: "22", category: "technical",
    question: "My answers were not saved and my session was lost. Can my exam be reset?",
    answer:
      "If you experienced a verified technical failure (network outage, server error), contact support immediately with your student ID, the exam name, the approximate time of failure, and any error messages or screenshots. Support can investigate session logs and, if a technical fault is confirmed, an admin may reset your attempt count so you can retake without penalty.",
  },
];

// ── Contact channels — exam-system specific ───────────────────────────────────
const CONTACT_CHANNELS = [
  {
    icon: Mail,
    color: "#1e3a5f",
    bg: "#dce8f5",
    title: "Email Support",
    desc: "For exam issues, score disputes, or account problems. Response within 1–2 business days.",
    action: "examsupport@veripraxis.edu.ph",
    href: "mailto:examsupport@veripraxis.edu.ph",
  },
  {
    icon: MessageSquare,
    color: "#059669",
    bg: "#d1fae5",
    title: "Live Chat",
    desc: "Chat with a coordinator during office hours. Best for urgent exam session issues.",
    action: "Start a chat",
    href: "#chat",
  },
  {
    icon: Phone,
    color: "#d97706",
    bg: "#fef3c7",
    title: "Program Coordinator",
    desc: "Mon–Fri, 8 AM – 5 PM. Call for degree program concerns or assignment issues.",
    action: "(034) 123-4567",
    href: "tel:+63341234567",
  },
];

const TICKET_CATEGORIES = [
  { value: "taking",    label: "Taking an Exam" },
  { value: "results",   label: "Results or Scores" },
  { value: "reviewers", label: "Reviewer Access" },
  { value: "timing",    label: "Timer or Session Issue" },
  { value: "programs",  label: "Degree Program Access" },
  { value: "account",   label: "Account or Login" },
  { value: "technical", label: "Technical / Bug Report" },
  { value: "other",     label: "Other" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudentHelpPage() {
  const [faqs,            setFaqs]            = useState<FaqItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [activeCategory,  setActiveCategory]  = useState("all");
  const [openFaq,         setOpenFaq]         = useState<string | null>(null);
  const [form,            setForm]            = useState<TicketForm>({ subject: "", category: "", priority: "normal", description: "" });
  const [submitting,      setSubmitting]      = useState(false);
  const [submitSuccess,   setSubmitSuccess]   = useState(false);
  const [submitError,     setSubmitError]     = useState<string | null>(null);

  useEffect(() => {
    async function fetchFaqs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("help_faqs")
          .select("id, question, answer, category")
          .order("category");
        setFaqs((!error && data && data.length > 0) ? (data as FaqItem[]) : FALLBACK_FAQS);
      } catch {
        setFaqs(FALLBACK_FAQS);
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  const categoriesWithCounts = useMemo(() =>
    CATEGORIES.map((cat) => ({
      ...cat,
      count: cat.key === "all" ? faqs.length : faqs.filter((f) => f.category === cat.key).length,
    })),
    [faqs]
  );

  const filteredFaqs = useMemo(() => {
    const q = search.toLowerCase();
    return faqs.filter((faq) => {
      const matchCat    = activeCategory === "all" || faq.category === activeCategory;
      const matchSearch = !q || faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [faqs, activeCategory, search]);

  async function handleSubmitTicket(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.subject || !form.description) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.from("support_tickets").insert([{
        subject: form.subject, category: form.category || "other",
        priority: form.priority, description: form.description,
        status: "open", created_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setSubmitSuccess(true);
      setForm({ subject: "", category: "", priority: "normal", description: "" });
      setTimeout(() => setSubmitSuccess(false), 7000);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeCatLabel = categoriesWithCounts.find((c) => c.key === activeCategory)?.label ?? "All Topics";

  return (
    <div className={styles.page}>

      {/* ── Hero banner ──────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <HelpCircle size={14} strokeWidth={2.5} />
            Help Center
          </div>
          <h1 className={styles.heroTitle}>How can we help you?</h1>
          <p className={styles.heroSub}>
            Find answers about mock board exams, reviewers, scores, and your degree program.
          </p>

          {/* Search */}
          <div className={styles.searchWrap}>
            <Search size={16} strokeWidth={2.2} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder='Search — e.g. "timer", "BLIS exam", "retake"…'
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setActiveCategory("all"); }}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch("")} aria-label="Clear">
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Quick program pills */}
          <div className={styles.programPills}>
            {["BLIS","BSPsych","BSArch","BSID","BEEd","BSEd-ENG","BSEd-FIL","BSEd-SCI","BSEd-MATH"].map((p) => (
              <button
                key={p}
                className={styles.programPill}
                onClick={() => { setSearch(p); setActiveCategory("programs"); }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.body}>

        {/* ── Category strip ────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <ClipboardList size={16} strokeWidth={2} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Browse by Topic</h2>
          </div>

          {loading ? (
            <div className={styles.catGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeletonCat} />
              ))}
            </div>
          ) : (
            <div className={styles.catGrid}>
              {categoriesWithCounts.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    className={`${styles.catCard} ${isActive ? styles.catCardActive : ""}`}
                    onClick={() => { setActiveCategory(cat.key); setSearch(""); }}
                  >
                    <div className={styles.catIcon} style={{ background: cat.bg }}>
                      <Icon size={18} color={cat.color} strokeWidth={2} />
                    </div>
                    <span className={styles.catLabel}>{cat.label}</span>
                    <span className={styles.catCount}>{cat.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── FAQ accordion ─────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <FileQuestion size={16} strokeWidth={2} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>
              {search
                ? `Results for "${search}"`
                : activeCategory === "all"
                  ? "Frequently Asked Questions"
                  : `${activeCatLabel} — FAQ`}
            </h2>
            {!loading && (
              <span className={styles.faqCount}>{filteredFaqs.length} article{filteredFaqs.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {loading ? (
            <div className={styles.faqList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={styles.skeletonFaq} />
              ))}
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className={styles.emptyFaq}>
              <Search size={36} strokeWidth={1.4} color="#cbd5e1" />
              <p className={styles.emptyTitle}>No results found</p>
              <p className={styles.emptyText}>Try a different keyword or select another topic above.</p>
              <button className={styles.emptyReset} onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className={styles.faqList}>
              {filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                const catMeta = CATEGORIES.find((c) => c.key === faq.category);
                return (
                  <div key={faq.id} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`}>
                    <button
                      className={styles.faqQ}
                      onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    >
                      <div className={styles.faqQLeft}>
                        {catMeta && (
                          <span className={styles.faqCatTag} style={{ background: catMeta.bg, color: catMeta.color }}>
                            {catMeta.label}
                          </span>
                        )}
                        <span className={styles.faqQText}>{faq.question}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        strokeWidth={2.5}
                        className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className={styles.faqA}>
                        <p className={styles.faqAText}>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Contact channels ──────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <MessageSquare size={16} strokeWidth={2} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Contact Support</h2>
          </div>

          <div className={styles.contactGrid}>
            {CONTACT_CHANNELS.map((ch) => {
              const Icon = ch.icon;
              return (
                <a key={ch.title} href={ch.href} className={styles.contactCard}>
                  <div className={styles.contactIcon} style={{ background: ch.bg }}>
                    <Icon size={20} color={ch.color} strokeWidth={2} />
                  </div>
                  <div className={styles.contactBody}>
                    <p className={styles.contactTitle}>{ch.title}</p>
                    <p className={styles.contactDesc}>{ch.desc}</p>
                    <span className={styles.contactAction}>
                      {ch.action}
                      <ChevronRight size={13} strokeWidth={2.5} />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* ── Ticket form ───────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <Send size={16} strokeWidth={2} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Submit a Support Ticket</h2>
          </div>

          <div className={styles.ticketBox}>
            <p className={styles.ticketLead}>
              Can&apos;t find your answer? Describe your issue and our team will get back to you within 1–2 business days.
            </p>

            <form onSubmit={handleSubmitTicket} className={styles.ticketForm}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Subject *</label>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="e.g. Exam timer did not stop after submission"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Topic</label>
                  <select
                    className={styles.formSelect}
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">Select a topic</option>
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Priority</label>
                  <select
                    className={styles.formSelect}
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="low">Low — Not urgent</option>
                    <option value="normal">Normal — Within a few days</option>
                    <option value="high">High — Affects my exam attempt</option>
                    <option value="urgent">Urgent — Exam in progress / score error</option>
                  </select>
                </div>
              </div>

              <div className={styles.formField} style={{ marginTop: "0.875rem" }}>
                <label className={styles.formLabel}>Description *</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Describe the issue in detail. Include your degree program, the exam name, time of occurrence, and any error messages you saw."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              {submitError && (
                <div className={`${styles.banner} ${styles.bannerError}`}>
                  <AlertCircle size={16} strokeWidth={2} />
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className={`${styles.banner} ${styles.bannerSuccess}`}>
                  <CheckCircle size={16} strokeWidth={2} />
                  Ticket submitted! We&apos;ll be in touch soon.
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? (
                  <><Loader2 size={15} className={styles.spinner} /> Submitting…</>
                ) : (
                  <><Send size={15} strokeWidth={2} /> Submit Ticket</>
                )}
              </button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}