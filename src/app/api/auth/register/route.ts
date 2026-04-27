import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{4,24}$/;

function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function buildInternalEmail(username: string): string {
  return `${username}@internal.farmghg.local`;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, inviteCode } = await request.json();

    const normalizedUsername = normalizeUsername(username);
    const normalizedInviteCode = String(inviteCode ?? "").trim();

    if (!normalizedUsername || !password || !normalizedInviteCode) {
      return NextResponse.json(
        { error: "用户名、密码和邀请码不能为空" },
        { status: 400 }
      );
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return NextResponse.json(
        {
          error:
            "用户名需为 4–24 位，只能包含字母、数字、下划线或短横线",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "密码至少需要 8 位" },
        { status: 400 }
      );
    }

    const invite = await db.inviteCode.findUnique({
      where: { code: normalizedInviteCode },
    });

    if (!invite || invite.isUsed) {
      return NextResponse.json(
        { error: "邀请码无效或已被使用" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { username: normalizedUsername },
          { email: buildInternalEmail(normalizedUsername) },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "该用户名已被使用" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: normalizedUsername,
        email: buildInternalEmail(normalizedUsername),
        password: hashedPassword,
        name: String(name ?? "").trim() || normalizedUsername,
      },
    });

    await db.inviteCode.update({
      where: { code: normalizedInviteCode },
      data: {
        isUsed: true,
        usedBy: user.id,
        usedAt: new Date(),
      },
    });

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("注册错误:", error);

    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}