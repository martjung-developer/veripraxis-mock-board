// /app/student/study-materials/page.tsx

'use client'

import styles from './study-materials.module.css'
import { useState, useMemo } from 'react'
import { FileText, Video, File, Search, Inbox, ChevronLeft, ChevronRight } from 'lucide-react'

type Material = {
  id: number
  title: string
  program: string
  type: 'PDF' | 'Video' | 'Notes'
  description: string
}

const programs = [
  'Bachelor of Library and Information Science',
  'Bachelor of Science in Psychology',
  'Bachelor of Science in Elementary Education',
  'BSEd Filipino',
  'BSEd Mathematics',
  'BSEd English',
  'BSEd Science',
  'BS Architecture',
  'BS Interior Design',
]

const materials: Material[] = [
  { id: 1, title: 'Intro to Library Science', program: programs[0], type: 'PDF', description: 'Basics of library systems' },
  { id: 2, title: 'Psychology Notes 101', program: programs[1], type: 'Notes', description: 'Core concepts in psychology' },
  { id: 3, title: 'Child Development Video', program: programs[2], type: 'Video', description: 'Learning stages of children' },
  { id: 4, title: 'Filipino Grammar Guide', program: programs[3], type: 'PDF', description: 'Advanced grammar rules' },
  { id: 5, title: 'Math Lesson Plan', program: programs[4], type: 'Notes', description: 'Teaching strategies in math' },
  { id: 6, title: 'English Literature Review', program: programs[5], type: 'PDF', description: 'Classic literature summary' },
  { id: 7, title: 'Science Experiments', program: programs[6], type: 'Video', description: 'Basic science demos' },
  { id: 8, title: 'Architecture Basics', program: programs[7], type: 'PDF', description: 'Design fundamentals' },
  { id: 9, title: 'Interior Design Concepts', program: programs[8], type: 'Notes', description: 'Color & space theory' },
  { id: 10, title: 'Cataloging Systems', program: programs[0], type: 'Video', description: 'Library cataloging tutorial' },
  { id: 11, title: 'Cognitive Psychology', program: programs[1], type: 'PDF', description: 'Brain and behavior' },
  { id: 12, title: 'Teaching Strategies', program: programs[2], type: 'Notes', description: 'Effective teaching methods' },
  { id: 13, title: 'Filipino Literature', program: programs[3], type: 'Video', description: 'Famous Filipino works' },
  { id: 14, title: 'Algebra Basics', program: programs[4], type: 'PDF', description: 'Equations and functions' },
  { id: 15, title: 'Creative Writing', program: programs[5], type: 'Notes', description: 'Writing techniques' },
  { id: 16, title: 'Biology Overview', program: programs[6], type: 'PDF', description: 'Introduction to biology' },
  { id: 17, title: 'Architectural Drafting', program: programs[7], type: 'Video', description: 'Drafting basics' },
  { id: 18, title: 'Furniture Design', program: programs[8], type: 'PDF', description: 'Interior elements' },
  { id: 19, title: 'Library Management', program: programs[0], type: 'Notes', description: 'Managing libraries' },
  { id: 20, title: 'Behavioral Analysis', program: programs[1], type: 'Video', description: 'Understanding behavior' },
]

const ITEMS_PER_PAGE = 6

export default function StudyMaterialsPage() {
  const [search, setSearch] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      return (
        (m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.description.toLowerCase().includes(search.toLowerCase())) &&
        (selectedProgram ? m.program === selectedProgram : true) &&
        (selectedType ? m.type === selectedType : true)
      )
    })
  }, [search, selectedProgram, selectedType])

  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE)

  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getIcon = (type: string) => {
    if (type === 'PDF') return <FileText size={18} />
    if (type === 'Video') return <Video size={18} />
    return <File size={18} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Study Materials</h1>
        <p>Browse and access learning resources by program</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        <select onChange={(e) => { setSelectedProgram(e.target.value); setCurrentPage(1) }}>
          <option value="">All Programs</option>
          {programs.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <select onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1) }}>
          <option value="">All Types</option>
          <option value="PDF">PDF</option>
          <option value="Video">Video</option>
          <option value="Notes">Notes</option>
        </select>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className={styles.empty}>
          <Inbox size={42} />
          <h3>No study materials available yet</h3>
          <p>Materials will appear once uploaded by faculty or students</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {paginatedMaterials.map((m) => (
              <div key={m.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  {getIcon(m.type)}
                  <span>{m.type}</span>
                </div>
                <h3>{m.title}</h3>
                <span className={styles.tag}>{m.program}</span>
                <p>{m.description}</p>
                <button className={styles.button}>View Material</button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}