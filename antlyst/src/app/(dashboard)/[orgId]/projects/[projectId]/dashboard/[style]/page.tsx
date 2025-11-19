import { requireOrg, checkOrgAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId: userOrgId } = await requireOrg();
  const { orgId, projectId } = await params;

  const hasAccess = await checkOrgAccess(orgId);
  if (!hasAccess || orgId !== userOrgId) {
    redirect(`/${userOrgId}/projects`);
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: orgId,
    },
    include: {
      files: true,
      dashboards: true,
      analyses: true,
      owner: true,
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold">{project.name}</h1>
          <Badge
            variant={
              project.status === 'ready'
                ? 'default'
                : project.status === 'processing'
                ? 'secondary'
                : 'outline'
            }
          >
            {project.status}
          </Badge>
        </div>
        <p className="text-slate-600">
          {project.description || 'No description provided'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>Uploaded data sources</CardDescription>
          </CardHeader>
          <CardContent>
            {project.files.length === 0 ? (
              <p className="text-slate-500 text-sm">No files uploaded</p>
            ) : (
              <ul className="space-y-2">
                {project.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium">{file.fileName}</span>
                    <Badge variant="outline">{file.uploadStatus}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analyses</CardTitle>
            <CardDescription>Completed processing tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {project.analyses.length === 0 ? (
              <p className="text-slate-500 text-sm">No analyses completed yet</p>
            ) : (
              <ul className="space-y-2">
                {project.analyses.map((analysis) => (
                  <li key={analysis.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium">{analysis.analysisType}</span>
                    <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                      {analysis.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {project.status === 'ready' && project.dashboards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dashboards</CardTitle>
            <CardDescription>View your data in different styles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['simple', 'ml', 'powerbi'].map((style) => {
                const dashboard = project.dashboards.find((d) => d.style === style);
                return (
                  <Link
                    key={style}
                    href={`/${orgId}/projects/${projectId}/dashboard/${style}`}
                  >
                    <Button variant="outline" className="w-full h-24 flex-col">
                      <span className="text-lg font-semibold capitalize">{style}</span>
                      <span className="text-xs text-slate-500 mt-1">
                        {style