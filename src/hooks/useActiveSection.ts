import { useEffect, useState } from 'react'

/**
 * Returns the id of the section crossing the middle of the viewport.
 * With `sticky`, the last active id is kept while between sections instead of resetting to null.
 */
export function useActiveSection(ids: readonly string[], sticky = false) {
  const [active, setActive] = useState<string | null>(sticky ? ids[0] : null)

  useEffect(() => {
    const crossing = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) crossing.add(entry.target.id)
          else crossing.delete(entry.target.id)
        })

        const current = ids.find((id) => crossing.has(id))
        if (current) setActive(current)
        else if (!sticky) setActive(null)
      },
      { rootMargin: '-45% 0px -54% 0px' },
    )

    ids.forEach((id) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [ids, sticky])

  return active
}
