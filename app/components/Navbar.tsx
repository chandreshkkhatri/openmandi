import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a
          href="#"
          className="flex items-center gap-2 text-xl font-bold text-white"
        >
          <Image src="/logo.svg" alt="Open Mandi" width={36} height={36} className="h-9 w-auto" />
          Open Mandi
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            How It Works
          </a>
          <a
            href="#markets"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Markets
          </a>
          <a
            href="/docs"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Docs
          </a>
          <a
            href="/exchange/dashboard"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Launch App
          </a>
        </div>
      </div>
    </nav>
  );
}
