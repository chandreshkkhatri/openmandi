import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-white">
              <Image src="/logo.svg" alt="Open Mandi" width={24} height={24} className="h-6 w-auto" />
              Open Mandi
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Where crypto meets commodities ✨
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
            <a href="/docs" className="transition-colors hover:text-white">
              Docs
            </a>
            <a href="/terms" className="transition-colors hover:text-white">
              Terms
            </a>
            <a
              href="/exchange/dashboard"
              className="transition-colors hover:text-white"
            >
              Launch App
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-xs text-zinc-600">
          &copy; 2026 Open Mandi. Built with 🫶
        </div>
      </div>
    </footer>
  );
}
