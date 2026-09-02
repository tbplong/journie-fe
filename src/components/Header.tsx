import { useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { navItems, siteConfig } from '../content/site'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-forest/10 bg-paper/90 backdrop-blur-xl">
      <div className="container-shell flex h-18 items-center justify-between">
        <a
          href="#top"
          className="group flex items-center gap-3 font-semibold text-ink"
          aria-label={`${siteConfig.name}, về đầu trang`}
          onClick={() => setIsOpen(false)}
        >
          <img
            src={siteConfig.logoMark}
            alt=""
            className="h-12 w-auto transition-transform duration-300 group-hover:-rotate-3"
            width="384"
            height="512"
          />
          <span className="font-display text-xl tracking-[-0.03em]">{siteConfig.name}</span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink/70 transition-colors hover:text-terracotta"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a href="#hanh-trinh" className="button-primary hidden lg:inline-flex">
          Xem hành trình
          <ArrowUpRight aria-hidden="true" size={17} />
        </a>

        <button
          type="button"
          className="grid size-11 place-items-center border border-forest/20 text-ink lg:hidden"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? 'Đóng menu' : 'Mở menu'}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
        </button>
      </div>

      {isOpen && (
        <nav
          id="mobile-navigation"
          className="border-t border-forest/10 bg-paper px-4 py-5 lg:hidden"
          aria-label="Điều hướng di động"
        >
          <div className="container-shell flex flex-col">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="border-b border-forest/10 py-4 font-medium text-ink last:border-0"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
