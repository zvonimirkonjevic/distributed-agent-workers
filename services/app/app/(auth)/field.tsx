import type { ComponentProps } from "react";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  error?: string;
};

export default function Field({ label, name, error, ...props }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        id={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-[15px] font-normal text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-950 aria-invalid:border-red-600"
        {...props}
      />
      {error && (
        <span id={`${name}-error`} className="text-[13px] font-normal text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
