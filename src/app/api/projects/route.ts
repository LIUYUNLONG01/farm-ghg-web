import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// 获取当前用户的项目列表
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const projects = await db.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ projects });
}

// 创建新项目
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { name, data } = await request.json();
  if (!name) return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });

  const project = await db.project.create({
    data: {
      userId: user.id,
      name,
      data: data ?? {},
    },
  });

  return NextResponse.json({ project });
}
