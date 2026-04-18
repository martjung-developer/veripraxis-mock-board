// app/(dashboard)/student/mock-exams/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useMockExams }         from '@/lib/hooks/student/mock-exams/useMockExams'
import { MockExamsHeader }      from '@/components/dashboard/student/mock-exams/MockExamsHeader'
import { MockExamsFilters }     from '@/components/dashboard/student/mock-exams/MockExamsFilters'
import { MockExamsGrid }        from '@/components/dashboard/student/mock-exams/MockExamsGrid'
import { MockExamsEmpty, MockExamsSkeleton } from '@/components/dashboard/student/mock-exams/MockExamsEmpty'
import { MockExamsPagination }  from '@/components/dashboard/student/mock-exams/MockExamsPagination'
import { ALL_CATEGORIES }       from '@/lib/constants/student/mock-exams/mock-exams'
import styles from './mock-exams.module.css'

export default function MockExamsPage() {
  const router  = useRouter()
  const exams   = useMockExams()

  const {
    search, setSearch,
    category, setCategory,
    sort, setSort,
    page, setPage, totalPages,
    paginated, filtered,
    categories,
    availableCount, completedCount, inProgressCount, total,
    loading, error,
  } = exams

  return (
    <div className={styles.page}>
      <MockExamsHeader
        availableCount={availableCount}
        completedCount={completedCount}
        inProgressCount={inProgressCount}
        total={total}
      />

      <MockExamsFilters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        sort={sort}
        setSort={setSort}
        categories={categories}
        totalFound={filtered.length}
      />

      {loading ? (
        <MockExamsSkeleton />
      ) : error ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Something went wrong</p>
          <p className={styles.emptyText}>{error}</p>
        </div>
      ) : paginated.length > 0 ? (
        <MockExamsGrid
          exams={paginated}
          onStart={(id) => router.push(`/student/mock-exams/${id}`)}
          onContinue={(id) => router.push(`/student/mock-exams/${id}`)}
          onViewAttempt={(id) => router.push(`/student/mock-exams/${id}`)}
        />
      ) : (
        <MockExamsEmpty
          onClear={() => { setSearch(''); setCategory(ALL_CATEGORIES) }}
        />
      )}

      {!loading && !error && totalPages > 1 && (
        <MockExamsPagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          setPage={setPage}
        />
      )}
    </div>
  )
}