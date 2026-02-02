import { redirect } from "next/navigation";

export default function DashboardPage() {
    // Redirect to projects for now, or show a summary
    redirect("/projects");
}
