// app/(pages)/roadmap/page.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  GraduationCap, Users, ShieldCheck,
  UserPlus, ClipboardList, BookOpen, BarChart2, RefreshCw, Award,
  FilePlus, CheckSquare, UserCheck, PieChart, FileText,
  UserCog, ThumbsUp, SlidersHorizontal, Activity, CreditCard, Download,
  ArrowRight,
} from 'lucide-react'
import { heroContainer, heroItem } from '@/animations/presets/publicPage'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import styles from './roadmap.module.css'

interface SubStep {
  text: string
}

interface Step {
  icon:     React.ElementType
  title:    string
  substeps: SubStep[]
}

interface Role {
  id:       string
  label:    string
  icon:     React.ElementType
  color:    'blue' | 'purple' | 'teal'
  tagline:  string
  endBadge: string
  steps:    Step[]
}

const ROLES: Role[] = [
  {
    id: 'student', label: 'Student', icon: GraduationCap,
    color: 'blue', tagline: 'From sign-up to board exam success',
    endBadge: 'Licensed professional',
    steps: [
      {
        icon: UserPlus, title: 'Register & pick exam program',
        substeps: [
          { text: 'Create account with email or school credentials' },
          { text: 'Select PRC licensure program (LLE, LET, ALE, IDLE, PLE…)' },
          { text: 'Set target exam date and study preferences' },
        ],
      },
      {
        icon: ClipboardList, title: 'Take diagnostic test',
        substeps: [
          { text: 'Answer an adaptive question set per subject area' },
          { text: 'System identifies strong and weak topic coverage' },
          { text: 'Baseline score recorded for progress tracking' },
        ],
      },
      {
        icon: BookOpen, title: 'Take mock & practice exams',
        substeps: [
          { text: 'Choose a full mock exam or per-subject drill' },
          { text: 'Timed, PRC-format questions with auto-scoring' },
          { text: 'Questions vetted by licensed faculty members' },
        ],
      },
      {
        icon: BarChart2, title: 'View results & analytics',
        substeps: [
          { text: 'Item-level answer explanations and rationales' },
          { text: 'Subject breakdown showing which topics need work' },
          { text: 'Flagged items saved for targeted review later' },
        ],
      },
      {
        icon: RefreshCw, title: 'Track progress over time',
        substeps: [
          { text: 'Score trends and improvement charts per session' },
          { text: 'Comparison against program pass rate benchmarks' },
          { text: 'Retake exams as many times as needed until ready' },
        ],
      },
      {
        icon: Award, title: 'Pass the board exam',
        substeps: [
          { text: 'Sit the actual PRC licensure examination with confidence' },
          { text: 'Earn your PRC license and become a registered professional' },
        ],
      },
    ],
  },
  {
    id: 'faculty', label: 'Faculty', icon: Users,
    color: 'purple', tagline: 'Build and manage quality question banks',
    endBadge: 'Quality question bank maintained',
    steps: [
      {
        icon: UserCheck, title: 'Log in & access faculty dashboard',
        substeps: [
          { text: 'Sign in with faculty credentials provided by admin' },
          { text: 'View assigned exam programs and content areas' },
          { text: 'See pending tasks: submissions, reviews, analytics' },
        ],
      },
      {
        icon: FilePlus, title: 'Upload or create questions',
        substeps: [
          { text: 'Write new items with correct answer and distractors' },
          { text: 'Tag each item by subject topic and difficulty level' },
          { text: 'Add detailed answer rationale for student review' },
        ],
      },
      {
        icon: CheckSquare, title: 'Review & validate questions',
        substeps: [
          { text: 'Check items for accuracy against the PRC syllabus' },
          { text: 'Submit to admin for final approval and publishing' },
          { text: 'Revise rejected items based on admin feedback' },
        ],
      },
      {
        icon: UserCog, title: 'Assign exams to students',
        substeps: [
          { text: 'Create exam sets from the approved question bank' },
          { text: 'Assign specific exams or drills to student groups' },
          { text: 'Set availability windows and attempt limits' },
        ],
      },
      {
        icon: PieChart, title: 'Monitor & view class analytics',
        substeps: [
          { text: 'View class-level score summaries per subject area' },
          { text: 'See topics students consistently struggle with' },
          { text: 'Identify items with poor discrimination index' },
        ],
      },
      {
        icon: FileText, title: 'Manage exam content per program',
        substeps: [
          { text: 'Update or retire outdated and low-quality questions' },
          { text: 'Ensure question bank coverage matches PRC syllabus' },
        ],
      },
    ],
  },
  {
    id: 'admin', label: 'Admin', icon: ShieldCheck,
    color: 'teal', tagline: 'Keep the platform running smoothly',
    endBadge: 'Platform operating at full capacity',
    steps: [
      {
        icon: ShieldCheck, title: 'Log in & access admin panel',
        substeps: [
          { text: 'Sign in with administrator credentials' },
          { text: 'Overview dashboard: users, programs, system activity' },
          { text: 'Quick actions: approvals, reports, user flags' },
        ],
      },
      {
        icon: UserPlus, title: 'Manage user accounts',
        substeps: [
          { text: 'Approve, suspend, or remove student and faculty accounts' },
          { text: 'Assign faculty members to specific exam programs' },
          { text: 'Reset credentials and manage role permissions' },
        ],
      },
      {
        icon: ThumbsUp, title: 'Approve faculty-submitted questions',
        substeps: [
          { text: 'Review each submitted item for quality and accuracy' },
          { text: 'Approve items to publish into the live question bank' },
          { text: 'Return rejected items with detailed revision notes' },
        ],
      },
      {
        icon: SlidersHorizontal, title: 'Configure exam programs',
        substeps: [
          { text: 'Set up or update available PRC licensure programs' },
          { text: 'Configure time limits, question counts, passing scores' },
          { text: 'Toggle program availability (active / coming soon)' },
        ],
      },
      {
        icon: CreditCard, title: 'Manage subscriptions & access',
        substeps: [
          { text: 'Review and process subscription plans and payments' },
          { text: 'Grant or revoke access to specific programs or features' },
          { text: 'Handle student and institutional account upgrades' },
        ],
      },
      {
        icon: Activity, title: 'View platform-wide analytics',
        substeps: [
          { text: 'Overall pass rates per program and exam period' },
          { text: 'Student engagement, activity, and retention metrics' },
          { text: 'Question bank health: coverage and item count per topic' },
        ],
      },
      {
        icon: Download, title: 'Generate reports',
        substeps: [
          { text: 'Export performance reports per program or cohort' },
          { text: 'Share insights with faculty and institutional stakeholders' },
        ],
      },
    ],
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const stepVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export default function RoadmapPage() {
  return (
    <>
      <Navbar />

      <main className={styles.page}>

        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroBg}>
            <Image
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80"
              alt="Team collaborating on a platform"
              fill style={{ objectFit: 'cover' }} priority
            />
            <div className={styles.heroBgOverlay} />
          </div>
          <div className={styles.heroInner}>
            <motion.div {...heroContainer} className={styles.heroContent}>
              <motion.span {...heroItem} className={styles.heroBadge}>
                How It Works
              </motion.span>
              <motion.h1 {...heroItem} className={styles.heroTitle}>
                A platform built for{' '}
                <span className={styles.heroAccent}>every role</span>
              </motion.h1>
              <motion.p {...heroItem} className={styles.heroSub}>
                Whether you&apos;re a student preparing for your board exam,
                a faculty member building question banks, or an admin keeping
                everything running — here&apos;s exactly how VeriPraxis works
                for you, start to finish.
              </motion.p>

              {/* Role legend */}
              <motion.div {...heroItem} className={styles.legend}>
                {ROLES.map((r) => {
                  const Icon = r.icon
                  return (
                    <div key={r.id} className={`${styles.legendItem} ${styles[`legendItem_${r.color}`]}`}>
                      <Icon size={13} strokeWidth={2} />
                      {r.label}
                    </div>
                  )
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── THREE-COLUMN JOURNEYS ── */}
        <section className={styles.journeySection}>
          <div className={styles.journeyGrid}>
            {ROLES.map((role) => {
              const RoleIcon = role.icon
              return (
                <div key={role.id} className={`${styles.column} ${styles[`column_${role.color}`]}`}>

                  {/* Column header */}
                  <div className={styles.columnHeader}>
                    <div className={`${styles.columnIconWrap} ${styles[`columnIconWrap_${role.color}`]}`}>
                      <RoleIcon size={20} strokeWidth={2} />
                    </div>
                    <div>
                      <div className={styles.columnLabel}>{role.label}</div>
                      <div className={styles.columnTagline}>{role.tagline}</div>
                    </div>
                  </div>

                  {/* Steps */}
                  <motion.div
                    className={styles.steps}
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                  >
                    {role.steps.map((step, si) => {
                      const StepIcon = step.icon
                      const isLast = si === role.steps.length - 1
                      return (
                        <motion.div
                          key={step.title}
                          className={styles.step}
                          variants={stepVariants}
                        >
                          {/* Node + connector line */}
                          <div className={styles.nodeCol}>
                            <div className={`${styles.stepNode} ${styles[`stepNode_${role.color}`]}`}>
                              <StepIcon size={14} strokeWidth={2} />
                            </div>
                            {!isLast && (
                              <div className={`${styles.connector} ${styles[`connector_${role.color}`]}`} />
                            )}
                          </div>

                          {/* Step content */}
                          <div className={`${styles.stepBody} ${isLast ? styles.stepBodyLast : ''}`}>
                            <div className={styles.stepTitle}>{step.title}</div>
                            <ul className={styles.substeps}>
                              {step.substeps.map((sub, ssi) => (
                                <li
                                  key={ssi}
                                  className={`${styles.substep} ${styles[`substep_${role.color}`]}`}
                                >
                                  {sub.text}
                                </li>
                              ))}
                            </ul>

                            {/* End badge on last step */}
                            {isLast && (
                              <div className={`${styles.endBadge} ${styles[`endBadge_${role.color}`]}`}>
                                {role.endBadge}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaBg}>
            <Image
              src="https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1400&q=80"
              alt="University campus"
              fill style={{ objectFit: 'cover' }}
            />
            <div className={styles.ctaBgOverlay} />
          </div>
          <motion.div
            className={styles.ctaInner}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2 className={styles.ctaTitle}>Ready to get started?</h2>
            <p className={styles.ctaSub}>
              Join students, faculty, and institutions already using VeriPraxis
              to prepare for Philippine licensure examinations.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/register" className={styles.btnPrimary}>
                Start Reviewing Free
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
              <Link href="/programs" className={styles.btnGhost}>
                Browse Programs
              </Link>
            </div>
          </motion.div>
        </section>

      </main>

      <Footer />
    </>
  )
}