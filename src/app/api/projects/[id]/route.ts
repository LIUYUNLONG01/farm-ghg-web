import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function getProject(id: string, userId: string) {
  return db.project.findFirst({
    where: { id, userId },
  });
}

// 获取单个项目
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const project = await getProject(id, user.id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  return NextResponse.json({ project });
}

// 更新项目数据
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const existing = await getProject(id, user.id);
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

// 删除项目
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const existing = await getProject(id, user.id);
  if (!existing) return NextResponse.json({ error: "项目不存在" }, { status: 404 });

  await db.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
