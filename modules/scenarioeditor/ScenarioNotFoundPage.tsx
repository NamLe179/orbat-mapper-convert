import Link from "next/link";
import React from "react";

export default function ScenarioNotFoundPage() {
  return (
    <main className="bg-background grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-primary text-base font-semibold">404</p>
        <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
          Scenario not found
        </h1>
        <p className="text-muted-foreground mt-6 max-w-md text-base leading-7">
          Sorry, we could not find the scenario you were looking for. It may have
          been deleted or it does not exists in this browser.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-8">
          <Link href="/" className="text-primary text-sm font-semibold">
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
          <a
            href="https://docs.orbat-mapper.app/guide/storage"
            className="text-foreground text-sm font-semibold"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}