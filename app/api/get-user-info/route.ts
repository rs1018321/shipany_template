import { respData, respErr, respJson } from "@/lib/resp";

import { findUserByUuid } from "@/models/user";
import { getUserUuid } from "@/services/user";
import { getUserCredits } from "@/services/credit";

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respJson(-2, "no auth");
    }

    const user = await findUserByUuid(user_uuid);
    if (!user) {
      return respErr("user not exist");
    }

    user.credits = await getUserCredits(user_uuid);

    return respData(user);
  } catch (e) {
    console.log("get user info failed: ", e);
    return respErr("get user info failed");
  }
}
