import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { generateDashboard as generateAnalysis } from '@/lib/analysis-engine';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Initialize S3 Client (R2)
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function getFileContent(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  try {
    const response = await r2.send(command);
    if (!response.Body) return '';

    // Convert stream to string
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  } catch (e) {
    console.error("Failed to read file from R2:", e);
    return '';
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // 1. Fetch Project & Dashboard
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        dashboards: { take: 1, orderBy: { createdAt: 'desc' } },
        files: { where: { uploadStatus: 'completed' }, take: 1, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get completed file
    const file = project.files[0];
    if (!file) {
      return NextResponse.json({ error: 'No completed files found for this project' }, { status: 404 });
    }

    // Create dashboard if it doesn't exist
    let dashboard = project.dashboards[0];
    if (!dashboard) {
      console.log(`Creating dashboard on-demand for project ${project.id}`);
      dashboard = await prisma.dashboard.create({
        data: {
          projectId: project.id,
          style: 'simple',
          config: {}
        }
      });
    }

    let config = dashboard.config as any;

    // Generate config on-demand if empty
    if (!config || Object.keys(config).length === 0) {
      console.log(`Generating config on-demand for dashboard ${dashboard.id}`);
      const csvContent = await getFileContent(file.r2Key);
      if (csvContent) {
        config = await generateAnalysis(csvContent, dashboard.style as 'simple' | 'ml' | 'powerbi');

        // Save generated config
        await prisma.dashboard.update({
          where: { id: dashboard.id },
          data: { config }
        });
      }
    }

    if (!config) {
      return NextResponse.json({ context: "No data available." });
    }

    // 3. Build AI Context - extract useful summaries from config
    let contextSummary = `## Project: ${project.name}\n`;
    contextSummary += `Dashboard Style: ${dashboard.style}\n\n`;

    // Add stats if available
    if (config.stats) {
      contextSummary += `### Data Overview\n`;
      contextSummary += `- Total Rows: ${config.stats.rowCount || 'Unknown'}\n`;
      contextSummary += `- Columns: ${(config.stats.columns || []).join(', ')}\n\n`;
    }

    // Add KPIs
    const kpis = config.kpis || [];
    if (kpis.length > 0) {
      contextSummary += `### Key Metrics\n`;
      contextSummary += kpis.map((k: any) => `- ${k.label || k.title}: ${k.value}`).join('\n') + '\n\n';
    }

    // Add chart summaries with actual data points
    const charts = config.charts || [];
    if (charts.length > 0) {
      contextSummary += `### Charts & Visualizations\n`;
      for (const chart of charts) {
        contextSummary += `\n**${chart.title}** (${chart.type})\n`;

        // Extract top values from chart data
        if (chart.data && chart.data[0]) {
          const chartData = chart.data[0];
          if (chartData.x && chartData.y && Array.isArray(chartData.x)) {
            const topItems = chartData.x.slice(0, 5).map((x: any, i: number) =>
              `  - ${x}: ${chartData.y[i]}`
            );
            contextSummary += `Top values:\n${topItems.join('\n')}\n`;
          }
        }
      }
      contextSummary += '\n';
    }

    // Add insights if available
    const insights = config.insights || [];
    if (insights.length > 0) {
      contextSummary += `### AI-Generated Insights\n`;
      contextSummary += insights.map((i: any) => `- [${i.severity?.toUpperCase() || 'INFO'}] ${i.title}: ${i.description}`).join('\n') + '\n';
    }

    return NextResponse.json({
      type: 'dashboard',
      formattedContext: contextSummary,
      rawConfig: config // Optional, maybe too large
    });

  } catch (error: any) {
    console.error("Context Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
