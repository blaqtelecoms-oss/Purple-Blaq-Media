import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const [inputPath] = process.argv.slice(2);
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!inputPath) throw new Error("Usage: node scripts/import-legacy-data.mjs <export.json>");
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.");
}

const tables = {
  clients: {
    required: ["company_name"],
    fields: ["company_name", "logo", "description", "contact_person", "email", "phone"],
    assets: ["logo"],
  },
  enquiries: {
    required: ["full_name", "email", "message"],
    fields: ["full_name", "email", "phone", "company", "enquiry_type", "message", "status"],
  },
  projects: {
    required: ["name", "kind"],
    fields: [
      "name", "kind", "client_id", "type", "description", "image", "goals", "tasks",
      "budget", "spent", "platform", "workspace_name", "app_url", "workspace_url",
    ],
    assets: ["image"],
  },
  team_members: {
    required: ["full_name", "email", "role"],
    fields: ["full_name", "email", "job_title", "role"],
  },
  support_tickets: {
    required: ["sender_name", "sender_email"],
    fields: ["sender_name", "sender_email", "subject", "status", "assigned_to_id", "messages"],
  },
  transactions: {
    required: ["type", "date", "amount"],
    fields: ["type", "date", "description", "category", "client_id", "amount", "status", "invoice"],
    assets: ["invoice"],
  },
};

const exportData = JSON.parse(await readFile(inputPath, "utf8"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function localAssetPath(value, table, field) {
  if (!value || value.startsWith("/assets/media/")) return value;
  let filename;
  try {
    filename = path.basename(new URL(value).pathname);
  } catch {
    throw new Error(`${table}.${field} contains a file reference that needs to be exported separately.`);
  }
  const localPath = path.join(root, "public", "assets", "media", filename);
  try {
    await access(localPath);
  } catch {
    throw new Error(`${table}.${field} refers to media that is not present in public/assets/media.`);
  }
  return `/assets/media/${filename}`;
}

async function normalizeRecord(record, table, specification) {
  if (!record || typeof record !== "object" || !record.id) {
    throw new Error(`Every ${table} record must contain its original ID.`);
  }
  const row = { id: String(record.id), source_data: record };
  for (const field of specification.fields) {
    if (Object.hasOwn(record, field)) row[field] = record[field];
  }
  for (const field of specification.assets || []) {
    if (row[field]) row[field] = await localAssetPath(row[field], table, field);
  }
  if (table === "team_members") row.email = row.email?.toLowerCase();
  if (table === "support_tickets") row.sender_email = row.sender_email?.toLowerCase();
  if (table === "enquiries") row.email = row.email?.toLowerCase();
  if (table === "projects" && row.platform && !["Supabase", "GitHub", "Other"].includes(row.platform)) {
    row.platform = "Other";
  }
  for (const field of specification.required) {
    if (row[field] === null || row[field] === undefined || row[field] === "") {
      throw new Error(`${table} record ${row.id} is missing required field "${field}".`);
    }
  }
  for (const field of ["created_date", "updated_date", "created_by_id", "created_by"]) {
    if (Object.hasOwn(record, field)) row[field] = record[field];
  }
  return row;
}

async function importRows(table, rows) {
  for (let offset = 0; offset < rows.length; offset += 500) {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}?on_conflict=id`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(rows.slice(offset, offset + 500)),
      },
    );
    if (!response.ok) {
      throw new Error(`Import into ${table} failed with HTTP ${response.status}: ${await response.text()}`);
    }
  }
}

async function fetchExistingTeamMembers() {
  const members = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/team_members?select=id,email,role&offset=${offset}&limit=1000`,
      {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Could not read existing team members: HTTP ${response.status}`);
    }
    const page = await response.json();
    members.push(...page);
    if (page.length < 1000) break;
  }
  return new Map(members.map((member) => [member.email.toLowerCase(), member]));
}

const summary = [];
const existingTeamMembers = await fetchExistingTeamMembers();
const teamMemberIds = new Map();
for (const [table, specification] of Object.entries(tables)) {
  const records = exportData[table] || [];
  if (!Array.isArray(records)) throw new Error(`The "${table}" export must be an array.`);
  const rows = await Promise.all(records.map((record) => normalizeRecord(record, table, specification)));
  if (table === "team_members") {
    for (const row of rows) {
      const existing = existingTeamMembers.get(row.email);
      if (existing) {
        teamMemberIds.set(row.id, existing.id);
        row.id = existing.id;
        if (existing.role === "Admin") row.role = "Admin";
      }
    }
  }
  if (table === "support_tickets") {
    for (const row of rows) {
      if (teamMemberIds.has(row.assigned_to_id)) {
        row.assigned_to_id = teamMemberIds.get(row.assigned_to_id);
      }
    }
  }
  await importRows(table, rows);
  summary.push({ table, imported: rows.length });
}

console.log(JSON.stringify(summary, null, 2));
