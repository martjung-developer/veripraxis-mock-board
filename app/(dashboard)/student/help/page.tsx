// app/(dashboard)/student/help/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  X,
  BookOpen,
  GraduationCap,
  FileText,
  CreditCard,
  Calendar,
  Settings,
  ChevronDown,
  Mail,
  MessageSquare,
  Phone,
  ArrowRight,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import styles from "./help.module.css";
import {
  staggerFadeInUp,
  cardStagger,
  faqStagger,
  SECTION_DELAYS,
} from "@/animations/help/helpAnimations";

// ─── Supabase client ─────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Static data ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "all",
    label: "All Topics",
    icon: HelpCircle,
    color: "#3b82f6",
    bg: "#eff6ff",
    count: null,
  },
  {
    key: "enrollment",
    label: "Enrollment",
    icon: GraduationCap,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    count: null,
  },
  {
    key: "grades",
    label: "Grades & Records",
    icon: FileText,
    color: "#10b981",
    bg: "#ecfdf5",
    count: null,
  },
  {
    key: "payments",
    label: "Payments & Fees",
    icon: CreditCard,
    color: "#f59e0b",
    bg: "#fffbeb",
    count: null,
  },
  {
    key: "schedule",
    label: "Schedule",
    icon: Calendar,
    color: "#ef4444",
    bg: "#fef2f2",
    count: null,
  },
  {
    key: "courses",
    label: "Courses",
    icon: BookOpen,
    color: "#06b6d4",
    bg: "#ecfeff",
    count: null,
  },
  {
    key: "account",
    label: "Account & Settings",
    icon: Settings,
    color: "#64748b",
    bg: "#f8fafc",
    count: null,
  },
];

const FALLBACK_FAQS: FaqItem[] = [
  {
    id: "1",
    category: "enrollment",
    question: "How do I enroll in a course for the upcoming semester?",
    answer:
      "You can enroll in courses through the Student Portal during the enrollment period. Navigate to 'My Courses' → 'Add Course', search by course code or name, then click 'Enroll'. Make sure you meet all prerequisites before enrolling. If the section is full, you may join the waitlist and will be notified if a spot opens.",
  },
  {
    id: "2",
    category: "enrollment",
    question: "What is the deadline for adding or dropping a course?",
    answer:
      "The add/drop deadline is typically within the first two weeks of the semester. You can drop a course without penalty during this period. After the deadline, you will need to file a formal Withdrawal Request through the Registrar's Office, which may show a 'W' on your transcript.",
  },
  {
    id: "3",
    category: "grades",
    question: "How do I request an official copy of my transcript?",
    answer:
      "Official transcripts can be requested through the Student Portal under 'Records' → 'Request Transcript'. Processing takes 3–5 business days. A fee applies for physical copies; electronic copies delivered via secure PDF are faster and free. You may track the status of your request in the portal.",
  },
  {
    id: "4",
    category: "grades",
    question: "How is my Grade Point Average (GPA) calculated?",
    answer:
      "Your GPA is calculated by multiplying each course's grade points by its credit hours, summing the results, then dividing by total credit hours attempted. Letter grades correspond to: A = 4.0, B = 3.0, C = 2.0, D = 1.0, F = 0.0. Plus/minus grades receive ±0.3 points. Incomplete (INC) grades are not counted until resolved.",
  },
  {
    id: "5",
    category: "payments",
    question: "What payment methods are accepted for tuition?",
    answer:
      "We accept online payments via credit/debit card (Visa, Mastercard, GCash, Maya) through the Student Portal under 'Billing'. Bank transfers to our partner banks are also accepted — upload your proof of payment within 24 hours. Installment plans may be available; contact the Finance Office for eligibility.",
  },
  {
    id: "6",
    category: "payments",
    question: "How do I apply for a scholarship or financial aid?",
    answer:
      "Scholarship applications open at the start of each semester. Log in to the Student Portal, go to 'Financial Aid' → 'Apply for Scholarship', and complete the form. Required documents include your latest grades, a certificate of income, and recommendation letters. Applications are reviewed within 15 business days.",
  },
  {
    id: "7",
    category: "schedule",
    question: "How do I view my class schedule?",
    answer:
      "Your class schedule is displayed on the Dashboard under 'My Schedule'. You can also access it via 'Courses' → 'My Schedule'. The schedule shows room assignments, instructors, and meeting times. You can export it to Google Calendar or download it as a PDF.",
  },
  {
    id: "8",
    category: "courses",
    question: "What happens if I miss too many classes?",
    answer:
      "Attendance policies vary by instructor but the institutional policy states that exceeding 20% absences in a course may result in a failing grade (FA — Failure due to Absences). Your attendance is tracked per class session. If you have a medical or personal emergency, contact your instructor and the Office of Student Affairs with supporting documents.",
  },
  {
    id: "9",
    category: "account",
    question: "How do I reset my student portal password?",
    answer:
      "On the login page, click 'Forgot Password' and enter your registered email address or student ID. A reset link will be sent within a few minutes. If you don't receive it, check your spam folder. Accounts are locked after 5 failed attempts — contact the IT Help Desk at helpdesk@school.edu to unlock your account.",
  },
  {
    id: "10",
    category: "account",
    question: "How do I update my personal information on file?",
    answer:
      "You can update your contact number and email address directly in the Student Portal under 'Profile' → 'Edit Info'. Changes to legal name, date of birth, or ID numbers require a written request to the Registrar's Office along with a valid government-issued ID.",
  },
];

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    color: "#3b82f6",
    bg: "#eff6ff",
    title: "Email Support",
    desc: "Get a response within 1–2 business days.",
    actionLabel: "Send an email",
    href: "mailto:helpdesk@school.edu",
  },
  {
    icon: MessageSquare,
    color: "#10b981",
    bg: "#ecfdf5",
    title: "Live Chat",
    desc: "Chat with a student advisor in real time.",
    actionLabel: "Start chat",
    href: "#chat",
  },
  {
    icon: Phone,
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "Phone Hotline",
    desc: "Mon–Fri, 8 AM – 5 PM. (034) 123-4567",
    actionLabel: "Call now",
    href: "tel:+6334-123-4567",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentHelpPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [form, setForm] = useState<TicketForm>({
    subject: "",
    category: "",
    priority: "normal",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Fetch FAQs from Supabase (falls back to local data) ──────────────────
  useEffect(() => {
    async function fetchFaqs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("help_faqs")
          .select("id, question, answer, category")
          .order("category", { ascending: true });

        if (error || !data || data.length === 0) {
          setFaqs(FALLBACK_FAQS);
        } else {
          setFaqs(data as FaqItem[]);
        }
      } catch {
        setFaqs(FALLBACK_FAQS);
      } finally {
        setLoading(false);
      }
    }

    fetchFaqs();
  }, []);

  // ── Category counts ────────────────────────────────────────────────────────
  const categoriesWithCounts = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      ...cat,
      count:
        cat.key === "all"
          ? faqs.length
          : faqs.filter((f) => f.category === cat.key).length,
    }));
  }, [faqs]);

  // ── Filtered FAQs ──────────────────────────────────────────────────────────
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory =
        activeCategory === "all" || faq.category === activeCategory;
      const matchesSearch =
        !search ||
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, search]);

  // ── Submit support ticket to Supabase ─────────────────────────────────────
  async function handleSubmitTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.subject || !form.description) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.from("support_tickets").insert([
        {
          subject: form.subject,
          category: form.category || "general",
          priority: form.priority,
          description: form.description,
          status: "open",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setSubmitSuccess(true);
      setForm({ subject: "", category: "", priority: "normal", description: "" });
      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit ticket. Please try again.";
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Skeleton cards ────────────────────────────────────────────────────────
  function SkeletonGrid({ count }: { count: number }) {
    return (
      <div className={styles.categoriesGrid}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonBlock} style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div className={styles.skeletonBlock} style={{ width: "70%", height: 14 }} />
            <div className={styles.skeletonBlock} style={{ width: "40%", height: 11 }} />
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon}>
            <HelpCircle size={28} />
          </div>
          <h1 className={styles.heroTitle}>How can we help you?</h1>
          <p className={styles.heroSubtitle}>
            Browse topics, read FAQs, or submit a support ticket — we&apos;re
            here to help you succeed.
          </p>

          {/* Search */}
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search for answers…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveCategory("all");
              }}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch("")}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </section>

      <main className={styles.main}>
        {/* ── Category filter ── */}
        <section style={staggerFadeInUp(0, SECTION_DELAYS.categories)}>
          <div className={styles.sectionHeader}>
            <Lightbulb size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Browse by Topic</h2>
          </div>

          {loading ? (
            <SkeletonGrid count={7} />
          ) : (
            <div className={styles.categoriesGrid}>
              {categoriesWithCounts.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    className={`${styles.categoryCard} ${
                      activeCategory === cat.key ? styles.active : ""
                    }`}
                    style={{ animationDelay: `${cardStagger(i)}ms` }}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setSearch("");
                    }}
                  >
                    <div
                      className={styles.categoryCardIcon}
                      style={{ background: cat.bg }}
                    >
                      <Icon size={20} color={cat.color} />
                    </div>
                    <p className={styles.categoryCardLabel}>{cat.label}</p>
                    <p className={styles.categoryCardCount}>
                      {cat.count} article{cat.count !== 1 ? "s" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── FAQ accordion ── */}
        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <HelpCircle size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>
              {search
                ? `Results for "${search}"`
                : activeCategory === "all"
                ? "Frequently Asked Questions"
                : `${categoriesWithCounts.find((c) => c.key === activeCategory)?.label} — FAQ`}
            </h2>
          </div>

          {loading ? (
            <div className={styles.faqList}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} style={{ gap: 14 }}>
                  <div className={styles.skeletonBlock} style={{ width: "80%", height: 14 }} />
                  <div className={styles.skeletonBlock} style={{ width: "55%", height: 11 }} />
                </div>
              ))}
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>
                <Search size={40} />
              </div>
              <p className={styles.noResultsText}>No results found</p>
              <p className={styles.noResultsSub}>
                Try a different search term or browse another topic.
              </p>
            </div>
          ) : (
            <div className={styles.faqList}>
              {filteredFaqs.map((faq, i) => (
                <div
                  key={faq.id}
                  className={`${styles.faqItem} ${
                    openFaq === faq.id ? styles.open : ""
                  }`}
                  style={{ animationDelay: `${faqStagger(i)}ms` }}
                >
                  <button
                    className={styles.faqQuestion}
                    onClick={() =>
                      setOpenFaq(openFaq === faq.id ? null : faq.id)
                    }
                  >
                    <span className={styles.faqQuestionText}>
                      {faq.question}
                    </span>
                    <ChevronDown size={18} className={styles.faqChevron} />
                  </button>
                  {openFaq === faq.id && (
                    <p className={styles.faqAnswer}>{faq.answer}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Contact channels ── */}
        <section>
          <div className={styles.sectionHeader}>
            <MessageSquare size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Contact Support</h2>
          </div>
          <div className={styles.contactGrid}>
            {CONTACT_CHANNELS.map((ch, i) => {
              const Icon = ch.icon;
              return (
                <div
                  key={ch.title}
                  className={styles.contactCard}
                  style={{ animationDelay: `${SECTION_DELAYS.contact + i * 80}ms` }}
                >
                  <div
                    className={styles.contactCardIcon}
                    style={{ background: ch.bg }}
                  >
                    <Icon size={22} color={ch.color} />
                  </div>
                  <p className={styles.contactCardTitle}>{ch.title}</p>
                  <p className={styles.contactCardDesc}>{ch.desc}</p>
                  <a href={ch.href} className={styles.contactCardAction}>
                    {ch.actionLabel} <ArrowRight size={14} />
                  </a>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Submit a ticket ── */}
        <section>
          <div className={styles.sectionHeader}>
            <Send size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Submit a Support Ticket</h2>
          </div>

          <div className={styles.ticketSection}>
            <p className={styles.ticketTitle}>Can&apos;t find what you need?</p>
            <p className={styles.ticketSubtitle}>
              Fill out the form below and our support team will get back to you
              within 1–2 business days.
            </p>

            <form onSubmit={handleSubmitTicket}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Subject *</label>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="Brief description of your concern"
                    value={form.subject}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subject: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Category</label>
                  <select
                    className={styles.formSelect}
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Priority</label>
                  <select
                    className={styles.formSelect}
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priority: e.target.value }))
                    }
                  >
                    <option value="low">Low — Not urgent</option>
                    <option value="normal">Normal — Within a few days</option>
                    <option value="high">High — Affects my enrollment/grades</option>
                    <option value="urgent">Urgent — Immediate attention needed</option>
                  </select>
                </div>

                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.formLabel}>Description *</label>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="Describe your issue in detail. Include any relevant dates, course codes, or error messages."
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              {submitError && (
                <div
                  className={styles.successBanner}
                  style={{
                    background: "#fef2f2",
                    borderColor: "#fca5a5",
                    color: "#991b1b",
                  }}
                >
                  <AlertCircle size={18} />
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className={styles.successBanner}>
                  <CheckCircle size={18} />
                  Your ticket has been submitted! We&apos;ll be in touch soon.
                </div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: "helpSpinner 0.8s linear infinite" }} />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}