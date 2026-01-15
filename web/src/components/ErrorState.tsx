"use client";

import Link from "next/link";

interface ErrorStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function ErrorState({ title, message, action }: ErrorStateProps) {
  return (
    <div className="container py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-[var(--foreground-muted)] mb-4">{message}</p>
        {action && (
          action.href ? (
            <Link href={action.href} className="btn btn-primary mt-4 inline-flex">
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="btn btn-primary mt-4 inline-flex items-center gap-2"
            >
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
