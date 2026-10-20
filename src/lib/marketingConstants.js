// Marketing Hub shared constants and helpers.

export const LEAD_STAGES = ["New", "Contacted", "Proposal sent", "Won", "Lost"];

export const LEAD_SOURCES = [
  "Website form", "Instagram", "Facebook", "LinkedIn", "TikTok",
  "WhatsApp", "Referral", "Email", "Other",
];

export const CAMPAIGN_CHANNELS = [
  "Facebook Ads", "Instagram", "Google Ads", "WhatsApp", "Email", "LinkedIn", "TikTok", "Referral", "Other",
];

export const CAMPAIGN_STATUSES = ["Planned", "Active", "Ended"];

export const CONTENT_PLATFORMS = ["Blog", "Instagram", "Facebook", "LinkedIn", "TikTok", "X", "Email"];

export const CONTENT_STATUSES = ["Idea", "Drafting", "Review", "Scheduled", "Published"];

export const TASK_STATUSES = ["To do", "In progress", "Done"];

export const ASSET_KINDS = ["file", "colour", "font", "guideline"];

// Integration catalog: key, label, description, usedIn tab, phase
export const INTEGRATIONS = [
  { key: "resend", label: "Resend", description: "Send and receive email as sales@purpleblaq.co.za", usedIn: "Email", phase: 1 },
  { key: "forms", label: "Website form webhooks", description: "New enquiries become leads instantly", usedIn: "Leads", phase: 1 },
  { key: "wa", label: "WhatsApp Business Cloud API", description: "Capture WhatsApp chats as leads", usedIn: "Leads", phase: 2 },
  { key: "ga4", label: "Google Analytics 4", description: "Visitors, top pages and traffic sources", usedIn: "Overview", phase: 2, oauth: "google" },
  { key: "gsc", label: "Google Search Console", description: "Keywords, impressions and rankings", usedIn: "Overview", phase: 2, oauth: "google" },
  { key: "meta", label: "Meta Graph API", description: "Publish to Facebook and Instagram, pull reach and likes", usedIn: "Social", phase: 3 },
  { key: "li", label: "LinkedIn API", description: "Publish posts, pull engagement", usedIn: "Social", phase: 3 },
  { key: "tt", label: "TikTok API", description: "Publish videos, pull views", usedIn: "Social", phase: 3 },
  { key: "gads", label: "Google Ads API", description: "Real spend and leads per campaign", usedIn: "Campaigns", phase: 3, oauth: "google" },
  { key: "mads", label: "Meta Ads API", description: "Real spend and leads per campaign", usedIn: "Campaigns", phase: 3 },
  { key: "drive", label: "Google Drive", description: "Asset library syncs with team files", usedIn: "Assets", phase: 3, oauth: "google" },
  { key: "canva", label: "Canva Connect", description: "Open and import designs", usedIn: "Assets", phase: 3 },
  { key: "gcal", label: "Google Calendar", description: "Content calendar appears in team calendars", usedIn: "Calendar", phase: 3, oauth: "google" },
];

export const RESEND_CHECKLIST = [
  "Verify purpleblaq.co.za in Resend (add the SPF and DKIM records it gives).",
  "Add the MX record Resend provides on a receiving subdomain such as inbound.purpleblaq.co.za.",
  "In your current mail provider, forward sales@purpleblaq.co.za to the Resend inbound address on that subdomain.",
  "In Resend, add a webhook for the email.received event pointing to the resend-inbound-webhook function URL.",
  "Test: send an email to sales@purpleblaq.co.za and confirm it appears in the Email tab, then reply from the page.",
];

export const statusPillClass = (status) => {
  const map = {
    Published: "ok", Scheduled: "ok", Active: "ok", Won: "ok", Done: "ok", connected: "ok", Paid: "ok",
    Review: "warn", Planned: "warn", "In progress": "warn", "Proposal sent": "in", Drafting: "in",
    Ended: "", Lost: "bad", disconnected: "", needs_setup: "warn", "To do": "",
  };
  return map[status] || "";
};

export const roi = (campaign) => {
  const spend = Number(campaign?.spend) || 0;
  const revenue = Number(campaign?.revenue) || 0;
  if (spend <= 0) return null;
  return Math.round(((revenue - spend) / spend) * 100);
};

export const leadsForCampaign = (leads, campaignId) =>
  leads.filter((l) => l.campaign_id === campaignId);
