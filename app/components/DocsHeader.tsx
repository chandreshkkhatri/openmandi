import Image from "next/image";
import Link from "next/link";

export default function DocsHeader() {
  return (
    <header className="border-b border-border bg-black/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-white"
          >
            <Image src="/logo.svg" alt="Open Mandi" width={32} height={32} className="h-8 w-auto" />
            Open Mandi
          </Link>
          <span className="text-zinc-700">|</span>
          <Link href="/docs" className="text-sm text-zinc-400 hover:text-white">
            Documentation
          </Link>
        </div>
        <Link
          href="/exchange/dashboard"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
        >
          Launch App
        </Link>
      </div>
    </header>
  );
}
