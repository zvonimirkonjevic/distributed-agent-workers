"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { setSessionCookie } from "@/lib/session";

export type AuthFormState = {
  message?: string;
  fieldErrors?: Record<string, string>;
  // Echoed back because React resets uncontrolled forms after an action runs;
  // the password is deliberately never included.
  values?: Record<string, string>;
};

const UNAVAILABLE = "Something went wrong. Please try again.";

function read<K extends string>(formData: FormData, ...names: K[]): Record<K, string> {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  ) as Record<K, string>;
}

function toFieldErrors(error: components["schemas"]["HTTPValidationError"] | undefined) {
  const fieldErrors: Record<string, string> = {};
  for (const { loc, msg } of error?.detail ?? []) {
    const field = String(loc.at(-1));
    fieldErrors[field] ??= msg;
  }
  return fieldErrors;
}

async function startSession(email: string, password: string): Promise<AuthFormState | null> {
  const { data, response } = await api().POST("/auth/login", { body: { email, password } });
  if (!data) {
    const rejected = response.status === 401 || response.status === 422;
    return { message: rejected ? "Invalid email or password." : UNAVAILABLE };
  }
  await setSessionCookie(data.token, data.expires_at);
  return null;
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = read(formData, "email");
  const password = String(formData.get("password") ?? "");

  let failure: AuthFormState | null;
  try {
    failure = await startSession(values.email, password);
  } catch {
    failure = { message: UNAVAILABLE };
  }
  if (failure) {
    return { ...failure, values };
  }
  // redirect throws, so it must stay outside the try block.
  redirect("/");
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = read(formData, "firstname", "lastname", "email");
  const password = String(formData.get("password") ?? "");

  let failure: AuthFormState | null;
  try {
    const { error, response } = await api().POST("/users", { body: { ...values, password } });
    if (response.status === 409) {
      failure = { fieldErrors: { email: "This email is already registered." } };
    } else if (response.status === 422) {
      failure = { fieldErrors: toFieldErrors(error) };
    } else if (!response.ok) {
      failure = { message: UNAVAILABLE };
    } else {
      failure = await startSession(values.email, password);
    }
  } catch {
    failure = { message: UNAVAILABLE };
  }
  if (failure) {
    return { ...failure, values };
  }
  redirect("/");
}
