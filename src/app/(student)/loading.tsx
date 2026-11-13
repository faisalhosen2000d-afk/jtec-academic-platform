import { StudentSidebar } from "@/components/dashboard/student-sidebar";
import { StudentHeader } from "@/components/dashboard/student-header";

export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="flex min-h-screen">
        <StudentSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <StudentHeader />
          <main className="flex-1 p-6" />
        </div>
      </div>
    </div>
  );
}