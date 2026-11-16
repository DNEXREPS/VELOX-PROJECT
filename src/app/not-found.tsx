import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col justify-center py-24">
      <p className="eyebrow mb-6">404</p>
      <h1 className="display text-[clamp(2.6rem,7vw,6rem)]">Off route.</h1>
      <p className="mt-6 max-w-md text-muted">This page doesn&apos;t exist. Head back to the start or find a bike instead.</p>
      <div className="mt-10 flex gap-3">
        <ButtonLink href="/">Home</ButtonLink>
        <ButtonLink href="/bikes" variant="secondary">Bike Finder</ButtonLink>
      </div>
    </div>
  );
}
