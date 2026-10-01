import { Instagram, Linkedin, Twitter } from "lucide-react";

// Replace these with your real profile links
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/",
  twitter: "https://x.com/",
  linkedin: "https://www.linkedin.com/",
};

const items = [
  { href: SOCIAL_LINKS.instagram, label: "Instagram", Icon: Instagram },
  { href: SOCIAL_LINKS.twitter, label: "Twitter / X", Icon: Twitter },
  { href: SOCIAL_LINKS.linkedin, label: "LinkedIn", Icon: Linkedin },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
        <div>
          <p className="font-display text-xl font-bold">Taskboard<span className="text-accent">.</span></p>
          <p className="mt-1 text-sm opacity-70">© {new Date().getFullYear()} Taskboard. Built for teams that ship.</p>
        </div>
        <div className="flex gap-3">
          {items.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/20 transition hover:scale-110 hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
