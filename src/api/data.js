import { supabase } from "@/utils/supabase";

/**
 * @param {string} table
 * @param {{ orderBy?: string, ascending?: boolean, limit?: number, filters?: Record<string, string | number | boolean> }} [options]
 */
export async function listRecords(table, { orderBy, ascending = true, limit, filters = {} } = {}) {
  let query = supabase.from(table).select("*");
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }
  if (orderBy) query = query.order(orderBy, { ascending });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getRecord(table, id) {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createRecord(table, values) {
  const { data, error } = await supabase.from(table).insert(values).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateRecord(table, id, values) {
  const { data, error } = await supabase.from(table).update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}
