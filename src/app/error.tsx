"use client";
import { Button } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x flex min-h-[50vh] flex-col justify-center py-24">
      <p className="eyebrow mb-6 text-bad">Something went wrong</p>
      <h1 className="display text-[clamp(2rem,5vw,4rem)]">We hit a pothole.</h1>
      <p className="mt-4 max-w-lg text-sm text-muted">{error.message || "An unexpected error occurred."} Your garage and builds are stored locally and are not affected.</p>
      <Button className="mt-8 w-fit" onClick={reset}>Try again</Button>
    </div>
  );
}
