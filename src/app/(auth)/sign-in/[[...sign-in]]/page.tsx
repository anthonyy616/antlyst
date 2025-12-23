import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <SignIn routing="path" path="/sign-in" afterSignInUrl="/projects" />
    </div>
  );
}