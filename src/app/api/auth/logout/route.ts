import { deleteSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("退出错误:", error);
    return NextResponse.json(
      { error: "退出失败" },
      { status: 500 }
    );
  }
}
