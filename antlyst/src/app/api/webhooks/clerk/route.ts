import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(webhookSecret);
  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const eventType = evt.type;

  // Handle organization events
  if (eventType === 'organization.created') {
    await prisma.organization.create({
      data: {
        id: evt.data.id,
        name: evt.data.name,
      },
    });
  }

  if (eventType === 'organization.updated') {
    await prisma.organization.update({
      where: { id: evt.data.id },
      data: { name: evt.data.name },
    });
  }

  if (eventType === 'organization.deleted') {
    await prisma.organization.delete({
      where: { id: evt.data.id },
    });
  }

  // Handle user events
  if (eventType === 'user.created') {
    await prisma.user.create({
      data: {
        id: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim(),
        imageUrl: evt.data.image_url,
      },
    });
  }

  if (eventType === 'user.updated') {
    await prisma.user.update({
      where: { id: evt.data.id },
      data: {
        email: evt.data.email_addresses[0].email_address,
        name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim(),
        imageUrl: evt.data.image_url,
      },
    });
  }

  if (eventType === 'organizationMembership.created') {
    await prisma.user.update({
      where: { id: evt.data.public_user_data.user_id },
      data: { organizationId: evt.data.organization.id },
    });
  }

  return NextResponse.json({ received: true });
}