import { Feedback } from "@/types/feedback";
import { getSupabaseClient } from "./db";
import { getUsersByUuids } from "./user";

export async function insertFeedback(feedback: Feedback) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("feedbacks").insert(feedback);

  if (error) {
    throw error;
  }

  return data;
}

export async function findFeedbackByUuid(
  uuid: string
): Promise<Feedback | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("uuid", uuid)
    .single();

  if (error) {
    return undefined;
  }

  return data;
}

export async function getFeedbacks(
  page: number = 1,
  limit: number = 50
): Promise<Feedback[] | undefined> {
  if (page < 1) page = 1;
  if (limit <= 0) limit = 50;

  const offset = (page - 1) * limit;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("feedbacks")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const user_uuids = Array.from(new Set(data.map((item) => item.user_uuid)));
  const users = await getUsersByUuids(user_uuids);

  const feedbacks = data.map((item) => {
    const user = users.find((user) => user.uuid === item.user_uuid);
    return { ...item, user };
  });

  return feedbacks;
}
