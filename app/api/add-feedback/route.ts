import { respData, respErr } from "@/lib/resp";

import { Feedback } from "@/types/feedback";
import { getIsoTimestr } from "@/lib/time";
import { getUserUuid } from "@/services/user";
import { insertFeedback } from "@/models/feedback";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    let { content, rating } = await req.json();
    if (!content) {
      return respErr("invalid params");
    }

    const user_uuid = await getUserUuid();

    const feedback: Feedback = {
      user_uuid: user_uuid,
      content: content,
      rating: rating,
      created_at: getIsoTimestr(),
      status: "created",
    };

    await insertFeedback(feedback);

    return respData(feedback);
  } catch (e) {
    console.log("add feedback failed", e);
    return respErr("add feedback failed");
  }
}
