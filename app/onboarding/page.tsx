import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Set up your workspace — Agentmi",
};

export default function OnboardingPage() {
  return (
    <div className="aurora-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <main>
        <OnboardingFlow />
      </main>
    </div>
  );
}
