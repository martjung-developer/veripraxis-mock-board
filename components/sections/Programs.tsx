// src/components/sections/Programs.tsx
import Image from 'next/image'
import styles from '@/app/page.module.css'

const PROGRAMS = [
  {
    code: 'SBIT',
    name: 'Library & Information Science',
    desc: 'Board Exam for Librarians — covers cataloging, reference, library management, and information systems.',
    img: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80',
    imgAlt: 'Library stacks and books',
  },
  {
    code: 'SSLATE',
    name: 'Education, Psychology & Liberal Arts',
    desc: 'Licensure Examination for Teachers and Psychometricians — education theory, psychology, and practice.',
    img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80',
    imgAlt: 'Classroom and education setting',
  },
  {
    code: 'SARFAID',
    name: 'Architecture & Interior Design',
    desc: 'Board Exam for Architects and Interior Designers — design principles, structures, and professional practice.',
    img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80',
    imgAlt: 'Architecture blueprints and drafting',
  },
]

export default function Programs() {
  return (
    <section id="programs" className={styles.sectionAlt} aria-labelledby="programs-heading">
      <div className={styles.sectionAltInner}>
        <div className={`${styles.sectionHeader} ${styles.sectionHeaderCenter} reveal`}>
          <span className={styles.sectionLabel}>Available Programs</span>
          <h2 id="programs-heading" className={styles.sectionTitle}>
            Covering Major Philippine Licensure Exams
          </h2>
          <p className={styles.sectionSub}>
            Each program is tailored to the PRC syllabus with questions vetted
            by licensed professionals and recent board exam passers.
          </p>
        </div>

        <div className={styles.programsGrid}>
          {PROGRAMS.map((p, i) => (
            <article
              key={p.code}
              className={`${styles.programCard} reveal reveal-delay-${i + 1}`}
            >
              <Image
                src={p.img}
                alt={p.imgAlt}
                width={600}
                height={280}
                className={styles.programImg}
              />
              <div>
                <div className={styles.programCode}>{p.code}</div>
                <div className={styles.programName}>{p.name}</div>
              </div>
              <p className={styles.programDesc}>{p.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}