import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function getProject(id: string, userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return db.project.findFirst({ where: { id } });
  }
  return db.project.findFirst({ where: { id, userId } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const project = await getProject(id, user.id, user.role === "admin");
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  return NextResponse.json({ project });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const existing = await getProject(id, user.id, user.role === "admin");
  if (!existing) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  const { name, data } = await request.json();

  const project = await db.project.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(data ? { data } : {}),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const existing = await getProject(id, user.id, user.role === "admin");
  if (!existing) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  await db.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
