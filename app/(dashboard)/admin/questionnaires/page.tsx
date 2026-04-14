// app/(dashboard)/admin/questionnaires/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Plus, Search, X, ChevronDown,
  Pencil, Trash2, AlertTriangle, Loader2, CheckCircle2,
  HelpCircle, ListChecks, Upload, FileSpreadsheet,
  AlertCircle, CheckCheck, Download, ArrowLeft, GraduationCap,
  Layers, RefreshCw, Link2, FileType, File, Globe,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@/lib/context/AuthContext'
import { useQuestionnaires } from '@/lib/hooks/admin/questionnaires/useQuestionnaires'
import { downloadTemplate } from '@/lib/utils/questionnaires/questionnaires.utils'
import { TYPE_ORDER, TYPE_COLORS, PROGRAM_COLORS } from '@/lib/constants/admin/questionnaires/questionnaires.constants'
import { ProgramCard }         from '@/components/dashboard/admin/questionnaires/ProgramCard'
import { QuestionTypeSection } from '@/components/dashboard/admin/questionnaires/QuestionTypeSection'
import { ParseSummary }        from '@/components/dashboard/admin/questionnaires/ParseSummary'
import { TypeTag }             from '@/components/dashboard/admin/questionnaires/TypeTag'
import { DiffBadge }           from '@/components/dashboard/admin/questionnaires/DiffBadge'
import { pageVariants, modalVariants, childVariants } from '@/animations/admin/questionnaires/questionnaires'
import type { QuestionType } from '@/lib/types/database'
import styles from './questionnaires.module.css'
import { useRef } from 'react'

// ── File-type icon helper (UI-only, lives here) ───────────────────────────────
function getFileTypeIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf')                 { return <FileType size={15} color="#dc2626" /> }
  if (['docx', 'doc'].includes(ext)) { return <File size={15} color="#2563eb" /> }
  if (['xlsx', 'xls'].includes(ext)) { return <FileSpreadsheet size={15} color="#059669" /> }
  return <FileText size={15} color="#4f5ff7" />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuestionnairesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()
  const q = useQuestionnaires()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth guard
  useEffect(() => {
    if (authLoading) { return }
    if (!user) { router.replace('/login'); return }
    const role =
      (user.user_metadata?.['role'] as string | undefined) ??
      (user.app_metadata?.['role']  as string | undefined)
    if (role !== 'admin' && role !== 'faculty') { router.replace('/unauthorized') }
  }, [user, authLoading, router])

  if (authLoading) { return null }

  // ── Modals ─────────────────────────────────────────────────────────────────

  const modals = (
    <>
      {/* ════ IMPORT MODAL ════ */}
      <AnimatePresence>
        {q.showImport && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) { q.closeImport() } }}
          >
            <motion.div
              className={styles.formModal}
              style={{ maxWidth: 720 }}
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
            >
              <div className={styles.formModalHeader}>
                <span className={styles.formModalTitle}>
                  <span className={styles.formModalTitleIcon}><Upload size={13} color="#fff" /></span>
                  Import Questions
                </span>
                <button className={styles.btnIconClose} onClick={q.closeImport}><X size={14} /></button>
              </div>

              <div className={styles.form}>
                {q.importDone ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <CheckCheck size={26} color="#059669" />
                    </div>
                    <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0d1523', marginBottom: 6 }}>Import Complete</p>
                    <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      <strong style={{ color: '#059669' }}>{q.importCounts.inserted}</strong>{' '}
                      question{q.importCounts.inserted !== 1 ? 's' : ''} imported
                      {q.importCounts.skipped > 0 && (
                        <>, <strong style={{ color: '#dc2626' }}>{q.importCounts.skipped}</strong> skipped</>
                      )}
                    </p>
                    <button className={styles.btnPrimary} onClick={q.closeImport} style={{ marginTop: '1.25rem' }}>Done</button>
                  </div>
                ) : (
                  <>
                    <div className={styles.importTabs}>
                      <button
                        className={`${styles.importTab} ${q.importTab === 'file' ? styles.importTabActive : ''}`}
                        onClick={() => { q.setImportTab('file') }}
                      >
                        <Upload size={13} /> Upload File
                      </button>
                      <button
                        className={`${styles.importTab} ${q.importTab === 'link' ? styles.importTabActive : ''}`}
                        onClick={() => { q.setImportTab('link') }}
                      >
                        <Link2 size={13} /> Import from Link
                      </button>
                    </div>

                    {q.importTab === 'file' && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(79,95,247,0.06)', border: '1px solid rgba(79,95,247,0.15)', borderRadius: 10, padding: '0.6rem 0.9rem' }}>
                          <FileSpreadsheet size={15} color="#4f5ff7" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0d1523' }}>Need a template? </span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Download the CSV template to see required columns.</span>
                          </div>
                          <button className={styles.btnSecondary} onClick={downloadTemplate} style={{ fontSize: '0.74rem', padding: '0.28rem 0.65rem', flexShrink: 0 }}>
                            <Download size={12} /> Template
                          </button>
                        </div>

                        <div className={styles.facultyHint}>
                          <div className={styles.facultyHintIcon}><FileText size={13} color="#7c3aed" /></div>
                          <div>
                            <span className={styles.facultyHintTitle}>Any exam formats supported</span>
                            <span className={styles.facultyHintDesc}>DOCX files with numbered questions and bold correct answers are automatically detected.</span>
                          </div>
                        </div>

                        <div className={styles.supportedFormats}>
                          <span className={styles.supportedFormatsLabel}>Supported formats:</span>
                          <div className={styles.formatPills}>
                            {[
                              { ext: 'CSV',        color: '#059669', bg: '#ecfdf5' },
                              { ext: 'XLSX / XLS', color: '#059669', bg: '#ecfdf5' },
                              { ext: 'DOCX / DOC', color: '#2563eb', bg: '#eff6ff' },
                              { ext: 'PDF',        color: '#dc2626', bg: '#fef2f2' },
                            ].map((f) => (
                              <span key={f.ext} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: f.bg, color: f.color }}>{f.ext}</span>
                            ))}
                          </div>
                        </div>

                        <div
                          className={`${styles.dropZone} ${q.dragOver ? styles.dropZoneActive : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); q.setDragOver(true) }}
                          onDragLeave={() => q.setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault(); q.setDragOver(false)
                            const f = e.dataTransfer.files[0]
                            if (f) { void q.handleFileDrop(f) }
                          }}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls,.docx,.doc,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) { void q.handleFileDrop(f) }
                              e.target.value = ''
                            }}
                          />
                          {q.importParsing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <Loader2 size={22} color="#4f5ff7" style={{ animation: 'spin 1s linear infinite' }} />
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Parsing file…</span>
                            </div>
                          ) : q.importedFileName && q.importRows.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              {getFileTypeIcon(q.importedFileName)}
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0d1523' }}>
                                {q.importedFileName.length > 40 ? q.importedFileName.slice(0, 40) + '…' : q.importedFileName}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Click to replace</span>
                            </div>
                          ) : (
                            <>
                              <Upload size={22} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                              <p style={{ fontSize: '0.83rem', fontWeight: 600, color: '#0d1523', marginBottom: 4 }}>
                                Drag &amp; drop or click to browse
                              </p>
                              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CSV, XLSX, DOCX, PDF — max 20 MB</p>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {q.importTab === 'link' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className={styles.linkSourceCards}>
                          {[
                            { icon: <Globe size={14} color="#ea4335" />,          label: 'Google Forms',  desc: 'Public form URL',     bg: '#fef2f2', border: '#fecaca' },
                            { icon: <FileSpreadsheet size={14} color="#34a853" />, label: 'Google Sheets', desc: 'Shared spreadsheet',  bg: '#f0fdf4', border: '#bbf7d0' },
                            { icon: <File size={14} color="#4285f4" />,            label: 'Google Docs',   desc: 'Shared document',     bg: '#eff6ff', border: '#bfdbfe' },
                            { icon: <Link2 size={14} color="#7c3aed" />,           label: 'Custom URL',    desc: 'CSV / JSON endpoint', bg: '#f5f3ff', border: '#ddd6fe' },
                          ].map((src) => (
                            <div key={src.label} className={styles.linkSourceCard} style={{ background: src.bg, borderColor: src.border }}>
                              {src.icon}
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0d1523' }}>{src.label}</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{src.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 9, padding: '0.55rem 0.8rem', fontSize: '0.75rem', color: '#92400e' }}>
                          <strong>Note:</strong> Google Forms / Drive links must be set to <em>&quot;Anyone with the link → Viewer&quot;</em>.
                        </div>

                        <div>
                          <label className={styles.formLabel} style={{ marginBottom: 5, display: 'block' }}>Paste your link</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <Link2 size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                              <input
                                className={styles.formInput}
                                style={{ paddingLeft: '2rem' }}
                                placeholder="https://docs.google.com/forms/…"
                                value={q.linkUrl}
                                onChange={(e) => q.handleLinkChange(e.target.value)}
                              />
                            </div>
                            <button
                              className={styles.btnPrimary}
                              onClick={() => { void q.handleFetchLink() }}
                              disabled={!q.linkSource?.valid || q.linkFetching}
                              style={{ flexShrink: 0 }}
                            >
                              {q.linkFetching ? <Loader2 size={14} className={styles.spinner} /> : <Download size={14} />}
                              {q.linkFetching ? 'Fetching…' : 'Fetch'}
                            </button>
                          </div>
                          {q.linkSource && (
                            <p style={{ fontSize: '0.72rem', color: q.linkSource.valid ? '#059669' : '#dc2626', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {q.linkSource.valid ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                              {q.linkSource.hint}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {q.importRows.length > 0 && (
                      <>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.08)', borderRadius: 20, padding: '0.2rem 0.65rem' }}>
                            <CheckCircle2 size={12} /> {q.validCount} valid
                          </span>
                          {q.invalidCount > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', fontWeight: 600, color: '#dc2626', background: 'rgba(220,38,38,0.08)', borderRadius: 20, padding: '0.2rem 0.65rem' }}>
                              <AlertCircle size={12} /> {q.invalidCount} with errors
                            </span>
                          )}
                          <span style={{ fontSize: '0.76rem', color: '#94a3b8', marginLeft: 'auto' }}>
                            {q.importRows.length} rows detected
                          </span>
                        </div>

                        <ParseSummary rows={q.importRows} />

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', maxHeight: 210, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                                {['#', 'Question', 'Type', 'Diff.', 'Pts', 'Status'].map((h) => (
                                  <th key={h} style={{ padding: '0.42rem 0.6rem', textAlign: 'left', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {q.importRows.map((row) => (
                                <tr key={row._rowIndex} style={{ borderBottom: '1px solid #f1f5f9', background: row._valid ? 'transparent' : 'rgba(220,38,38,0.025)' }}>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#94a3b8' }}>{row._rowIndex}</td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#0d1523', maxWidth: 220 }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {row.question_text || <span style={{ color: '#dc2626', fontStyle: 'italic' }}>missing</span>}
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568', whiteSpace: 'nowrap' }}>
                                    <span style={{
                                      fontSize: '0.67rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                                      background: TYPE_COLORS[row.question_type as QuestionType]?.bg ?? '#f1f5f9',
                                      color:      TYPE_COLORS[row.question_type as QuestionType]?.color ?? '#64748b',
                                    }}>
                                      {row.question_type === 'multiple_choice' ? 'MCQ' : row.question_type === 'true_false' ? 'T/F' : row.question_type || '—'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568', textTransform: 'capitalize' }}>{row.difficulty}</td>
                                  <td style={{ padding: '0.38rem 0.6rem', color: '#4a5568' }}>{row.points}</td>
                                  <td style={{ padding: '0.38rem 0.6rem' }}>
                                    {row._valid
                                      ? <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> OK</span>
                                      : <span title={row._errors.join(' · ')} style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
                                          <AlertCircle size={12} />
                                          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row._errors[0]}</span>
                                        </span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Degree Program <span style={{ color: '#dc2626' }}>*</span></label>
                            <div className={styles.selectWrap}>
                              <select
                                className={styles.formSelect}
                                value={q.importProgramId}
                                onChange={(e) => { q.setImportProgramId(e.target.value); q.setImportExamId('') }}
                              >
                                <option value="">— Select program —</option>
                                {q.programs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                              </select>
                              <ChevronDown size={13} className={styles.selectChevron} />
                            </div>
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Assign to Exam <span style={{ color: '#dc2626' }}>*</span></label>
                            <div className={styles.selectWrap}>
                              <select
                                className={styles.formSelect}
                                value={q.importExamId}
                                onChange={(e) => q.setImportExamId(e.target.value)}
                                disabled={!q.importProgramId}
                              >
                                <option value="">{q.importProgramId ? '— Select exam —' : '— Select program first —'}</option>
                                {q.examsForImport.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                              </select>
                              <ChevronDown size={13} className={styles.selectChevron} />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {q.importError && (
                      <p className={styles.formError} style={{ marginTop: '0.4rem' }}>
                        <AlertTriangle size={13} /> {q.importError}
                      </p>
                    )}
                  </>
                )}
              </div>

              {!q.importDone && (
                <div className={styles.formModalFooter}>
                  <button className={styles.btnSecondary} onClick={q.closeImport}><X size={13} /> Cancel</button>
                  {q.importRows.length > 0 && q.validCount > 0 && (
                    <button
                      className={styles.btnPrimary}
                      onClick={() => { void q.handleImportSave() }}
                      disabled={q.importSaving || !q.importExamId}
                    >
                      {q.importSaving ? <Loader2 size={14} className={styles.spinner} /> : <Upload size={14} />}
                      {q.importSaving ? 'Importing…' : `Import ${q.validCount} Question${q.validCount !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ CREATE / EDIT MODAL ════ */}
      <AnimatePresence>
        {q.showForm && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) { q.closeForm() } }}
          >
            <motion.div className={styles.formModal} variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <div className={styles.formModalHeader}>
                <span className={styles.formModalTitle}>
                  <span className={styles.formModalTitleIcon}>
                    {q.formMode === 'create' ? <Plus size={14} color="#fff" /> : <Pencil size={13} color="#fff" />}
                  </span>
                  {q.formMode === 'create' ? 'Add Question' : 'Edit Question'}
                </span>
                <button className={styles.btnIconClose} onClick={q.closeForm}><X size={14} /></button>
              </div>

              <div className={styles.form}>
                <div className={styles.formGroupFull}>
                  <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Question Text</label>
                  <textarea className={styles.formTextarea} placeholder="Enter the full question here…" rows={3}
                    value={q.form.question_text} onChange={(e) => q.setField('question_text', e.target.value)} />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Degree Program</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={q.form.program_id}
                        onChange={(e) => q.setField('program_id', e.target.value)}>
                        <option value="">— Select program —</option>
                        {q.programs.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Assign to Exam</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={q.form.exam_id}
                        onChange={(e) => q.setField('exam_id', e.target.value)} disabled={!q.form.program_id}>
                        <option value="">{q.form.program_id ? '— Select exam —' : '— Select program first —'}</option>
                        {q.examsForForm.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Question Type</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={q.form.question_type}
                        onChange={(e) => { q.setField('question_type', e.target.value as QuestionType); q.setField('correct_answer', '') }}>
                        {TYPE_ORDER.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Difficulty</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={q.form.difficulty}
                        onChange={(e) => q.setField('difficulty', e.target.value as 'easy' | 'medium' | 'hard')}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Points</label>
                    <input className={styles.formInput} type="number" min={1}
                      value={q.form.points} onChange={(e) => q.setField('points', Number(e.target.value))} />
                  </div>
                </div>

                {q.form.question_type === 'multiple_choice' && (
                  <div className={styles.formGroupFull}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>
                      Answer Choices <span className={styles.choicesHint}>&nbsp;— click ✓ to mark correct</span>
                    </label>
                    <div className={styles.choicesSection}>
                      {q.form.choices.map((choice, idx) => (
                        <div key={choice.label} className={styles.choiceRow}>
                          <span className={styles.choiceLabel}>{choice.label}</span>
                          <input className={styles.choiceInput} placeholder={`Choice ${choice.label}`}
                            value={choice.text} onChange={(e) => q.setChoiceText(idx, e.target.value)} />
                          <button type="button"
                            className={`${styles.choiceCorrectBtn} ${q.form.correct_answer === choice.label ? styles.choiceCorrectActive : ''}`}
                            onClick={() => q.setField('correct_answer', choice.label)}>
                            <CheckCircle2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {q.form.question_type === 'true_false' && (
                  <div className={styles.formGroupFull}>
                    <label className={`${styles.formLabel} ${styles.formLabelRequired}`}>Correct Answer</label>
                    <div className={styles.selectWrap}>
                      <select className={styles.formSelect} value={q.form.correct_answer}
                        onChange={(e) => q.setField('correct_answer', e.target.value)}>
                        <option value="">— Select —</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                      <ChevronDown size={13} className={styles.selectChevron} />
                    </div>
                  </div>
                )}

                {(['short_answer', 'fill_blank', 'matching'] as QuestionType[]).includes(q.form.question_type) && (
                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>Correct Answer</label>
                    <input className={styles.formInput}
                      placeholder={q.form.question_type === 'matching' ? 'e.g. 1-C, 2-A, 3-B' : 'Enter the expected answer'}
                      value={q.form.correct_answer}
                      onChange={(e) => q.setField('correct_answer', e.target.value)} />
                  </div>
                )}

                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>Explanation (optional)</label>
                  <textarea className={styles.formTextarea} placeholder="Provide an explanation…" rows={2}
                    value={q.form.explanation} onChange={(e) => q.setField('explanation', e.target.value)} />
                </div>

                {q.formError && <p className={styles.formError}><AlertTriangle size={13} /> {q.formError}</p>}
              </div>

              <div className={styles.formModalFooter}>
                <button className={styles.btnSecondary} onClick={q.closeForm}><X size={13} /> Cancel</button>
                <button className={styles.btnPrimary} onClick={() => { void q.handleSave() }} disabled={q.saving}>
                  {q.saving ? <Loader2 size={14} className={styles.spinner} /> : q.formMode === 'create' ? <Plus size={14} /> : <Pencil size={14} />}
                  {q.saving ? 'Saving…' : q.formMode === 'create' ? 'Add Question' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ DELETE MODAL ════ */}
      <AnimatePresence>
        {q.deleteId && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) { q.setDeleteId(null) } }}
          >
            <motion.div className={styles.deleteModal} variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <div className={styles.deleteIcon}><Trash2 size={22} color="#dc2626" /></div>
              <p className={styles.deleteTitle}>Delete Question?</p>
              <p className={styles.deleteBody}>This will permanently remove the question. This action cannot be undone.</p>
              <div className={styles.deleteActions}>
                <button className={styles.btnSecondary} onClick={() => q.setDeleteId(null)} disabled={q.deleting}>Cancel</button>
                <button className={styles.btnDanger} onClick={() => { void q.handleDelete() }} disabled={q.deleting}>
                  {q.deleting ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />}
                  {q.deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ VIEW MODAL ════ */}
      <AnimatePresence>
        {q.viewQ && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => { if (e.target === e.currentTarget) { q.setViewQ(null) } }}
          >
            <motion.div className={styles.viewModal} variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <div className={styles.viewModalHeader}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.92rem', color: '#0d1523', marginBottom: 6, lineHeight: 1.4 }}>
                    {q.viewQ.question_text}
                  </div>
                  <div className={styles.viewModalMeta}>
                    <TypeTag type={q.viewQ.question_type} />
                    <DiffBadge diff={q.viewQ.difficulty} />
                  </div>
                </div>
                <button className={styles.btnIconClose} onClick={() => q.setViewQ(null)}><X size={14} /></button>
              </div>

              <div className={styles.viewModalBody}>
                {q.viewQ.question_type === 'multiple_choice' && q.viewQ.options && (
                  <div className={styles.viewSection}>
                    <div className={styles.viewSectionTitle}>Answer Choices</div>
                    {q.viewQ.options.map((opt) => (
                      <div key={opt.label} className={`${styles.viewChoice} ${q.viewQ?.correct_answer === opt.label ? styles.viewChoiceCorrect : ''}`}>
                        <span className={styles.viewChoiceLabel}>{opt.label}</span>{opt.text}
                        {q.viewQ?.correct_answer === opt.label && <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />}
                      </div>
                    ))}
                  </div>
                )}
                {q.viewQ.question_type !== 'multiple_choice' && q.viewQ.question_type !== 'essay' && q.viewQ.correct_answer && (
                  <div className={styles.viewSection}>
                    <div className={styles.viewSectionTitle}>Correct Answer</div>
                    <div className={styles.correctAnswerBox}><CheckCircle2 size={14} /> {q.viewQ.correct_answer}</div>
                  </div>
                )}
                {q.viewQ.explanation && (
                  <div className={styles.viewSection}>
                    <div className={styles.viewSectionTitle}>Explanation</div>
                    <div className={styles.explanationBox}>{q.stripDifficultyTag(q.viewQ.explanation)}</div>
                  </div>
                )}
                <div className={styles.viewSection}>
                  <div className={styles.viewSectionTitle}>Details</div>
                  <div className={styles.viewSectionContent} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span><strong>Points:</strong> {q.viewQ.points}</span>
                    {q.viewQ.examTitle && <span><strong>Exam:</strong> {q.viewQ.examTitle}</span>}
                    <span><strong>Added:</strong> {new Date(q.viewQ.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button className={styles.btnSecondary} onClick={() => { if (q.viewQ) { q.setViewQ(null); q.openEdit(q.viewQ) } }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className={styles.btnSecondary} onClick={() => q.setViewQ(null)}>Close</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  // ── PROGRAM DETAIL VIEW ────────────────────────────────────────────────────

  if (q.viewMode === 'program-detail' && q.selectedProgram) {
    const colorIdx       = q.programs.findIndex((p) => p.id === q.selectedProgram!.id)
    const color          = PROGRAM_COLORS[colorIdx % PROGRAM_COLORS.length]
    const totalInProgram = q.programDetailQuestions.length

    return (
      <motion.div className={styles.page} variants={pageVariants} initial="hidden" animate="visible">
        <motion.div className={styles.breadcrumb} variants={childVariants}>
          <button className={styles.backBtn} onClick={q.backToPrograms}><ArrowLeft size={14} /> Question Bank</button>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent} style={{ color: color.accent }}>{q.selectedProgram.code}</span>
        </motion.div>

        <motion.div className={styles.header} variants={childVariants}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon} style={{ background: color.accent }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <div>
              <h1 className={styles.heading}>{q.selectedProgram.code}</h1>
              <p className={styles.headingSub}>
                {q.selectedProgram.name} — {totalInProgram} question{totalInProgram !== 1 ? 's' : ''} across{' '}
                {TYPE_ORDER.filter((t) => q.questionsByType[t].length > 0).length} type{TYPE_ORDER.filter((t) => q.questionsByType[t].length > 0).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.btnSecondary} ${styles.refreshBtn}`} onClick={q.handleRefresh} disabled={q.refreshing}>
              <RefreshCw size={14} className={q.refreshing ? styles.spinning : ''} />
              {q.refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className={styles.btnSecondary} onClick={q.openImport}><Upload size={14} /> Import</button>
            <button className={styles.btnPrimary} onClick={q.openCreate}><Plus size={15} /> Add Question</button>
          </div>
        </motion.div>

        <motion.div className={styles.typeSummaryStrip} variants={childVariants}>
          {TYPE_ORDER.map((t) => {
            const count = q.questionsByType[t].length
            const c     = TYPE_COLORS[t]
            return (
              <div key={t} className={styles.typeSummaryCard} style={{ borderLeftColor: c.color }}>
                <div className={styles.typeSummaryCount} style={{ color: c.color }}>{count}</div>
                <div className={styles.typeSummaryLabel}>{t.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}</div>
              </div>
            )
          })}
        </motion.div>

        <motion.div variants={childVariants} style={{ marginBottom: '1.25rem' }}>
          <div className={styles.searchWrap} style={{ maxWidth: 420 }}>
            <Search size={15} className={styles.searchIcon} />
            <input className={styles.searchInput}
              placeholder={`Search questions in ${q.selectedProgram.code}…`}
              value={q.search} onChange={(e) => q.setSearch(e.target.value)} />
            {q.search && <button className={styles.searchClear} onClick={() => q.setSearch('')}><X size={13} /></button>}
          </div>
        </motion.div>

        <motion.div className={styles.typeSections} variants={childVariants}>
          {TYPE_ORDER.map((t) => (
            <QuestionTypeSection key={t} type={t} questions={q.questionsByType[t]} loading={q.loading}
              onView={q.setViewQ} onEdit={q.openEdit} onDelete={q.setDeleteId} />
          ))}
        </motion.div>

        {modals}
      </motion.div>
    )
  }

  // ── PROGRAMS GRID VIEW ─────────────────────────────────────────────────────

  return (
    <motion.div className={styles.page} variants={pageVariants} initial="hidden" animate="visible">
      <motion.div className={styles.header} variants={childVariants}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><FileText size={20} color="#fff" /></div>
          <div>
            <h1 className={styles.heading}>Question Bank</h1>
            <p className={styles.headingSub}>Select a degree program to manage its questions</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btnSecondary} ${styles.refreshBtn}`} onClick={q.handleRefresh} disabled={q.refreshing}>
            <RefreshCw size={14} className={q.refreshing ? styles.spinning : ''} />
            {q.refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className={styles.btnSecondary} onClick={q.openImport}><Upload size={14} /> Import</button>
          <button className={styles.btnPrimary} onClick={q.openCreate}><Plus size={15} /> Add Question</button>
        </div>
      </motion.div>

      <motion.div className={styles.statStrip} variants={childVariants}>
        {([
          { label: 'Total Questions', value: q.overallStats.total, icon: <HelpCircle    size={16} color="#0d2540" />, bg: 'rgba(13,37,64,0.1)'  },
          { label: 'Multiple Choice', value: q.overallStats.mcq,   icon: <ListChecks    size={16} color="#4f5ff7" />, bg: 'rgba(79,95,247,0.1)' },
          { label: 'Easy',            value: q.overallStats.easy,  icon: <CheckCircle2  size={16} color="#059669" />, bg: 'rgba(5,150,105,0.1)' },
          { label: 'Hard',            value: q.overallStats.hard,  icon: <AlertTriangle size={16} color="#dc2626" />, bg: 'rgba(220,38,38,0.1)' },
        ] as const).map((stat) => (
          <div className={styles.statCard} key={stat.label}>
            <div className={styles.statIconWrap} style={{ background: stat.bg }}>{stat.icon}</div>
            <div>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      <AnimatePresence>
        {q.error && (
          <motion.div className={styles.errorBanner} variants={childVariants}
            initial="hidden" animate="visible"
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}>
            <AlertTriangle size={15} /> {q.error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={childVariants} className={styles.sectionLabel}>
        <Layers size={13} />
        <span>{q.programs.length} Degree Programs</span>
      </motion.div>

      <motion.div className={styles.programsGrid} variants={childVariants}>
        {q.loading ? (
          Array.from({ length: q.programs.length || 9 }).map((_, i) => (
            <div key={i} className={styles.programCardSkeleton}>
              <div className={styles.skeleton} style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 12 }} />
              <div className={styles.skeleton} style={{ width: '50%', height: 16, marginBottom: 8 }} />
              <div className={styles.skeleton} style={{ width: '80%', height: 11 }} />
            </div>
          ))
        ) : q.programs.length === 0 ? (
          <div className={styles.emptyState} style={{ gridColumn: '1/-1' }}>
            <div className={styles.emptyIcon}><GraduationCap size={22} color="#94a3b8" /></div>
            <p className={styles.emptyTitle}>No programs found</p>
            <p className={styles.emptySub}>Add programs first to organize your question bank.</p>
          </div>
        ) : (
          q.programs.map((program, idx) => (
            <ProgramCard
              key={program.id}
              program={program}
              questions={q.questionsByProgram[program.id] ?? []}
              colorScheme={PROGRAM_COLORS[idx % PROGRAM_COLORS.length]}
              onClick={() => q.openProgram(program)}
            />
          ))
        )}
      </motion.div>

      {modals}
    </motion.div>
  )
}