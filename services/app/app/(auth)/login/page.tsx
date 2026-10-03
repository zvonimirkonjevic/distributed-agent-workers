"use client";

import Link from "next/link";
import Field from "../field";

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-4xl text-zinc-950">Welcome back</h1>
      <p className="mt-2 text-[15px] text-zinc-600">Log in to your OpenAgent account.</p>
      {/* No auth endpoint exists yet; preventDefault stops the browser's default GET submit from putting the password in the URL. */}
      <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        <button
          type="submit"
          className="mt-2 h-11 rounded-lg bg-zinc-950 text-[15px] font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Log in
        </button>
      </form>
      <p className="mt-6 text-center text-[15px] text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-zinc-950 hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
