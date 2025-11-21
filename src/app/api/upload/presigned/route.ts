import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { fileName, fileType, fileSize, projectId } = await req.json();

        if (!fileName || !fileType || !projectId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Create a unique key for the file
        const fileKey = `${projectId}/${Date.now()}-${fileName}`;

        // Create the database record first
        const fileRecord = await prisma.file.create({
            data: {
                fileName,
                mimeType: fileType,
                fileSize,
                projectId,
                r2Key: fileKey,
                r2Url: `https://${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`, // Assuming public domain is set
                uploadStatus: "pending",
            },
        });

        // Generate Presigned URL
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
        });

        const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

        return NextResponse.json({
            url: signedUrl,
            fileId: fileRecord.id,
            key: fileKey,
        });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json(
            { error: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}
