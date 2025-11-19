import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getSignedUploadUrl } from '@/lib/r2';
import { generateR2Key } from '@/lib/utils';
import { z } from 'zod';

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  orgId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId: userOrgId } = await auth();

    if (!userId || !userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = uploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { fileName, fileSize, mimeType, orgId } = validation.data;

    // Security: verify user has access to this org
    if (orgId !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create project in database
    const project = await prisma.project.create({
      data: {
        name: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        organizationId: orgId,
        ownerId: userId,
        status: 'pending',
      },
    });

    // Generate unique R2 key
    const r2Key = generateR2Key(orgId, project.id, fileName);

    // Create file record
    const file = await prisma.file.create({
      data: {
        projectId: project.id,
        fileName,
        fileSize,
        mimeType,
        r2Key,
        r2Url: `${process.env.R2_PUBLIC_URL}/${r2Key}`,
        uploadStatus: 'pending',
      },
    });

    // Generate signed URL for direct upload to R2
    const signedUrl = await getSignedUploadUrl(r2Key, mimeType, 3600);

    return NextResponse.json({
      signedUrl,
      fileId: file.id,
      projectId: project.id,
      r2Key,
    });
  } catch (error) {
    console.error('Upload initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize upload' },
      { status: 500 }
    );
  }
}