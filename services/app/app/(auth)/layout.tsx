import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-[15px] font-medium text-zinc-600 transition-colors hover:text-zinc-900"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M13 8H3M7 4 3 8l4 4" />
        </svg>
        Back
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
