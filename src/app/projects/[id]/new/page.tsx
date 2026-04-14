'use client';

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectNewRedirect() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      sessionStorage.setItem("currentProjectId", projectId);
      router.replace(`/projects/${projectId}/edit`);
    }
  }, [projectId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">正在跳转...</p>
    </div>
  );
}
