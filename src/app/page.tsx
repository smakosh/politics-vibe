import { FundingSlider } from "@/components/funding-slider";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Politics Sides
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              Pay to push the political mood.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
              Every dollar moves the slider. The side with more money steers the
              face left or right, turning Trump for red and Mamdani for blue.
            </p>
          </div>
        </header>

        <FundingSlider />

        <footer className="text-sm text-zinc-500">
          Payments are processed securely with Stripe. Totals update as payments
          succeed.
        </footer>
      </main>
    </div>
  );
}
