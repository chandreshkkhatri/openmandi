import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-white"
        >
          <Image src="/logo.svg" alt="Open Mandi" width={36} height={36} className="h-9 w-auto" />
          Open Mandi
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
