import React from 'react'
import { FileText, Mail, Phone, MapPin, Link } from 'lucide-react'
import { EmptyState } from '../EmptyState'

interface ParsedResumeTabProps {
  resume: any   // full parsed resume object from getLatest()
}

/**
 * Structured document-preview style parsed resume.
 * Renders every extracted field in a readable, clean format.
 * Never dumps raw JSON or raw_text directly.
 */
export const ParsedResumeTab: React.FC<ParsedResumeTabProps> = ({ resume }) => {
  if (!resume) {
    return (
      <EmptyState
        icon={<FileText size={16} />}
        title="Parsed resume unavailable"
        description="Upload a resume to see the structured information ACE extracted from it."
        compact
      />
    )
  }

  const info = resume.personal_info || {}
  const skills: string[] = resume.skills || []
  const experience = resume.work_experience || []
  const projects = resume.projects || []
  const education = resume.education || []
  const summary = resume.summary || ''
  const languages: string[] = resume.languages || []

  const hasAnyContent = skills.length > 0 || experience.length > 0 || projects.length > 0 || education.length > 0 || summary

  if (!hasAnyContent && !info.name) {
    return (
      <EmptyState
        icon={<FileText size={16} />}
        title="No structured content extracted"
        description="ACE was unable to parse meaningful content from the uploaded file. Try re-uploading in PDF or DOCX format."
        compact
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans text-[12px]">

      {/* Contact / Header */}
      <div className="text-center pb-5 border-b border-neutral-200 dark:border-neutral-800">
        {info.name && (
          <h2 className="text-[20px] font-bold text-neutral-800 dark:text-white mb-2 tracking-tight">{info.name}</h2>
        )}
        <div className="flex flex-wrap justify-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
          {info.email && (
            <span className="flex items-center gap-1.5"><Mail size={11} /> {info.email}</span>
          )}
          {info.phone && (
            <span className="flex items-center gap-1.5"><Phone size={11} /> {info.phone}</span>
          )}
          {info.location && (
            <span className="flex items-center gap-1.5"><MapPin size={11} /> {info.location}</span>
          )}
          {info.links && info.links.map((link: string, i: number) => (
            <a
              key={i}
              href={link.startsWith('http') ? link : `https://${link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-primary hover:underline"
            >
              <Link size={10} />
              {link.replace(/^https?:\/\//, '').slice(0, 40)}
            </a>
          ))}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <Section title="Professional Summary">
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{summary}</p>
        </Section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-brand-light dark:bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-lg text-[10px] font-semibold">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <Section title="Work Experience">
          <div className="space-y-4">
            {experience.map((exp: any, i: number) => (
              <div key={i} className="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-bold text-neutral-800 dark:text-white text-[12px]">{exp.role}</div>
                    <div className="text-brand-primary font-semibold text-[11px]">{exp.company}</div>
                  </div>
                  {(exp.start_date || exp.end_date) && (
                    <div className="text-[10px] text-neutral-400 flex-shrink-0">
                      {exp.start_date} – {exp.end_date || 'Present'}
                    </div>
                  )}
                </div>
                {exp.description?.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {exp.description.map((b: string, k: number) => (
                      <li key={k} className="flex items-start gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-ai flex-shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {exp.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {exp.technologies.map((t: string, ti: number) => (
                      <span key={ti} className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-[9px] text-neutral-500 rounded border border-neutral-200 dark:border-neutral-700">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-4">
            {projects.map((proj: any, i: number) => (
              <div key={i} className="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-neutral-800 dark:text-white text-[12px]">{proj.title}</div>
                  {proj.link && (
                    <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-brand-primary text-[10px] hover:underline flex-shrink-0">
                      View →
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed mb-2">{proj.description}</p>
                {proj.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {proj.technologies.map((t: string, ti: number) => (
                      <span key={ti} className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-[9px] text-neutral-500 rounded border border-neutral-200 dark:border-neutral-700">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Section title="Education">
          <div className="space-y-3">
            {education.map((edu: any, i: number) => (
              <div key={i} className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-neutral-800 dark:text-white text-[12px]">
                    {edu.degree}{edu.field_of_study && ` in ${edu.field_of_study}`}
                  </div>
                  <div className="text-brand-primary text-[11px] font-semibold">{edu.institution}</div>
                  {edu.gpa && <div className="text-[10px] text-neutral-400 mt-0.5">GPA: {edu.gpa}</div>}
                </div>
                {edu.graduation_date && (
                  <div className="text-[10px] text-neutral-400 flex-shrink-0">{edu.graduation_date}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <Section title="Languages">
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, i) => (
              <span key={i} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 rounded-lg border border-neutral-200 dark:border-neutral-700">
                {lang}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{title}</h3>
      <div className="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
    </div>
    {children}
  </div>
)
