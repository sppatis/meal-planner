import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <h1 className="text-2xl font-bold text-stone-900">Dinner Planner</h1>
        <p className="mt-2 mb-6 text-sm text-stone-600">
          Enter the household passcode to see this week&apos;s dinners.
        </p>
        <LoginForm next={typeof next === "string" ? next : "/"} />
      </div>
    </main>
  );
}
