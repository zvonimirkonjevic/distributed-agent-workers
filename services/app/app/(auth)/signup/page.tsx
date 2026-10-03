"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import Field from "../field";
import FormMessage from "../form-message";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, {});

  return (
    <>
      <h1 className="font-display text-4xl text-zinc-950">Create an account</h1>
      <p className="mt-2 text-[15px] text-zinc-600">Start running agents with OpenAgent.</p>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="First name"
            name="firstname"
            autoComplete="given-name"
            defaultValue={state.values?.firstname}
            error={state.fieldErrors?.firstname}
          />
          <Field
            label="Last name"
            name="lastname"
            autoComplete="family-name"
            defaultValue={state.values?.lastname}
            error={state.fieldErrors?.lastname}
          />
        </div>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          error={state.fieldErrors?.password}
        />
        <FormMessage message={state.message} />
        <button
          type="submit"
          disabled={pending}
          className="mt-2 h-11 rounded-lg bg-zinc-950 text-[15px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Creating account..." : "Sign up"}
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
