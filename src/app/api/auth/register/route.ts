import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, inviteCode } = await request.json();

    // 基本验证
    if (!email || !password || !inviteCode) {
      return NextResponse.json(
        { error: "邮箱、密码和邀请码不能为空" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "密码至少需要 8 位" },
        { status: 400 }
      );
    }

    // 验证邀请码
    const invite = await db.inviteCode.findUnique({
      where: { code: inviteCode },
    });

    if (!invite || invite.isUsed) {
      return NextResponse.json(
        { error: "邀请码无效或已被使用" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已注册
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已注册" },
        { status: 400 }
      );
    }

    // 创建用户
    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
      },
    });

    // 标记邀请码已使用
    await db.inviteCode.update({
      where: { code: inviteCode },
      data: {
        isUsed: true,
        usedBy: user.id,
        usedAt: new Date(),
      },
    });

    // 创建 session（注册后自动登录）
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("注册错误:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
