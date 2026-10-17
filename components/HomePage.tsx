"use client";

import { useState } from "react";
import { Navigation } from "@/components/interface/Navigation";
import { TripFinder } from "@/components/interface/TripFinder";
import { TravelExperience } from "@/components/experience/TravelExperience";
import { DestinationDetails } from "@/components/sections/DestinationDetails";
import { TourPackage } from "@/components/sections/TourPackage";
import { FinalCallToAction } from "@/components/sections/FinalCallToAction";

export function HomePage() {
  const [finderOpen, setFinderOpen] = useState(false);
  const openFinder = () => setFinderOpen(true);
  return (
    <>
      <a className="skip-link" href="#destination">
        Skip the animated journey
      </a>
      <Navigation onPlanTrip={openFinder} />
      <main>
        <TravelExperience onPlanTrip={openFinder} />
        <DestinationDetails />
        <TourPackage onPlanTrip={openFinder} />
      </main>
      <FinalCallToAction onPlanTrip={openFinder} />
      <TripFinder open={finderOpen} onClose={() => setFinderOpen(false)} />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
