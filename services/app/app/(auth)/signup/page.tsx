"use client";

import Link from "next/link";
import Field from "../field";

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-4xl text-zinc-950">Create an account</h1>
      <p className="mt-2 text-[15px] text-zinc-600">Start running agents with OpenAgent.</p>
      {/* No auth endpoint exists yet; preventDefault stops the browser's default GET submit from putting the password in the URL. */}
      <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="firstname" autoComplete="given-name" />
          <Field label="Last name" name="lastname" autoComplete="family-name" />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} />
        <button
          type="submit"
          className="mt-2 h-11 rounded-lg bg-zinc-950 text-[15px] font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Sign up
        </button>
      </form>
      <p className="mt-6 text-center text-[15px] text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-950 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
