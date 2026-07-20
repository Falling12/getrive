"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AuthMark } from "@/components/auth/auth-mark";
import { AccountLink } from "@/components/app-shell/account-link";
import { ProjectSwitcher, type ProjectSummary } from "@/components/app-shell/project-switcher";
import { NavList } from "@/components/app-shell/nav-list";
import { UserAvatar } from "@/components/app-shell/user-avatar";
import { MOBILE_NAV_OPEN_EVENT } from "@/lib/mobile-nav-events";
import { cn } from "@/lib/utils";

// Replaces the old always-visible bottom tab bar (7-8 cramped icon+label
// slots, no room for the desktop sidebar's "Signal ops"/"Growth" grouping)
// with an off-canvas drawer that reuses the exact same grouped NavList the
// desktop sidebar renders — mobile and desktop nav can no longer drift into
// two different structures. The top bar (brand mark replaced by a
// hamburger trigger, project switcher, account avatar) lives in the same
// component as the drawer since both share `isOpen` state.
export function MobileNavDrawer({
  projectId,
  projectName,
  projects,
  unrepliedSignalCount,
  email,
  image,
}: {
  projectId: string;
  projectName: string;
  projects: ProjectSummary[];
  unrepliedSignalCount: number;
  email: string;
  image?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  // Closes on navigation (link clicks via onNavigate below, and
  // back/forward) — adjusted during render rather than in an effect, per
  // React's documented pattern for resetting state when a value changes
  // (react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (isOpen) setIsOpen(false);
  }

  // ProductTour needs to highlight a nav row that lives inside this drawer
  // on mobile viewports — it dispatches this event rather than reaching
  // into component state directly (see mobile-nav-events.ts).
  useEffect(() => {
    function open() {
      setIsOpen(true);
    }
    window.addEventListener(MOBILE_NAV_OPEN_EVENT, open);
    return () => window.removeEventListener(MOBILE_NAV_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Move focus into the panel on open, back to the trigger on close — but
  // only when *this component* closed it (not on initial mount, where
  // isOpen starts false and there's nothing to return focus from).
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur-md md:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
          className="flex size-8 items-center justify-center rounded border border-transparent transition-colors active:border-border active:bg-secondary/30"
        >
          <Menu className="size-[18px] text-foreground" />
        </button>

        <ProjectSwitcher
          variant="compact"
          currentProjectId={projectId}
          currentProjectName={projectName}
          projects={projects}
        />

        <Link href="/settings" aria-label="Account settings" className="shrink-0">
          <UserAvatar email={email} image={image} className="size-7 border border-border" />
        </Link>
      </header>

      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 md:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        inert={!isOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[260px] max-w-[80vw] flex-col border-r border-border bg-background transition-transform duration-200 ease-out motion-reduce:transition-none md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 pt-2">
          <AuthMark />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors active:border-border active:bg-secondary/30"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="mb-2 px-3">
          <ProjectSwitcher currentProjectId={projectId} currentProjectName={projectName} projects={projects} />
        </div>

        <NavList
          projectId={projectId}
          unrepliedSignalCount={unrepliedSignalCount}
          onNavigate={() => setIsOpen(false)}
        />

        <AccountLink email={email} image={image} />
      </div>
    </>
  );
}
