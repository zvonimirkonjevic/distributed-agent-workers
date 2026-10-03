export default function FormMessage({ message }: { message?: string }) {
  return (
    <p aria-live="polite" className="text-sm text-red-600 empty:hidden">
      {message}
    </p>
  );
}
