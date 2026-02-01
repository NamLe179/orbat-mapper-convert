"use client";

import { ExternalLink, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/GithubIcon";
import { CheckIcon } from "@heroicons/react/24/outline";
import ProseSection from "@/components/ProseSection";
import LandingPageScenarios from "./_components/LandingPageScenarios";

const features = [
  {
    name: "Create ORBATs",
    description: "Quickly build ORBATs.",
  },
  {
    name: "Draw features",
    description: "",
  },
  {
    name: "Client side only",
    description: "Everything is stored on your computer.",
  },
  {
    name: "Grid edit mode",
    description: "Efficient editing.",
  },
  {
    name: "Export to KML/KMZ",
    description: "View your scenario in 3D with Google Earth.",
  },
  {
    name: "Export as GeoJSON",
    description: "",
  },
  {
    name: "Import MilX",
    description: "Import military map overlays from map.army.",
  },
  {
    name: "Import GeoJSON",
    description: "",
  },
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggleDark = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="relative top-0 right-0 left-0 flex items-center justify-center gap-8 bg-muted p-1 text-center">
        <p>
          This is a work in progress prototype. Follow the{" "}
          <a href="https://github.com/orbat-mapper/orbat-mapper" className="underline">
            development on GitHub <GithubIcon className="inline size-6 sm:size-10" />
          </a>
        </p>
        <Button variant="ghost" size="icon" onClick={toggleDark} title="Toggle dark mode">
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </header>

      <main>
        <section className="mt-16 sm:mt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-5xl md:text-6xl">
                <span className="text-red-900 dark:text-red-900/90">ORBAT</span>
                Mapper
                <span className="absolute text-sm uppercase tracking-normal text-muted-foreground">
                  beta
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
                Recreate historic battles and military scenarios in your browser
              </p>
              <p className="mt-4">
                <Button asChild variant="link">
                  <a
                    href="https://docs.orbat-mapper.app/guide/about-orbat-mapper"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View documentation
                    <ExternalLink className="-ml-1 text-muted-foreground" />
                  </a>
                </Button>
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-md text-center lg:max-w-xl">
            <p className="text-lg font-semibold leading-8 tracking-tight text-primary">
              Features
            </p>
          </div>
          <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3 lg:gap-y-4">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-10">
                  <dt className="font-semibold leading-6 text-heading">
                    <div className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                      <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="text-sm text-muted-foreground">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mt-10">
          <LandingPageScenarios />
        </section>
      </main>
    </div>
  );
}
