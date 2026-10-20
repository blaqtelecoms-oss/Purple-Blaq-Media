import { useState } from "react";
import PageHeader from "@/components/pb/PageHeader";
import CTA from "@/components/pb/CTA";
import { useSeo } from "@/hooks/useSeo";
import { supabase } from "@/utils/supabase";
import { CONTACT } from "@/lib/pbConstants";
import { IconPin, IconPhone, IconMail } from "@/components/pb/Icons";

const ENQUIRY_TYPES = [
  "Workflow System",
  "Web Application",
  "Process Digitisation",
  "Ongoing Support",
  "Not sure yet",
];

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  enquiry_type: "",
  message: "",
};

export default function Contact() {
  useSeo(
    "Contact | Purple Blaq Media",
    "Get in touch with Purple Blaq Media to make your business work better. Based in Vanderbijlpark, Gauteng with national reach across South Africa."
  );

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!form.full_name.trim()) er.full_name = "Please enter your full name.";
    if (!form.email.trim()) er.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      er.email = "Please enter a valid email address.";
    if (!form.message.trim()) er.message = "Please tell us what you need.";
    return er;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const er = validate();
    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("website-contact", { body: form });
      if (error) throw error;
      setSuccess(true);
      setForm(EMPTY);
    } catch (err) {
      setErrors((er) => ({
        ...er,
        submit: err?.message || "Something went wrong. Please try again.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "13px 16px",
    borderRadius: 12,
    border: `1.5px solid ${errors[field] ? "var(--destructive, #dc2626)" : "var(--line)"}`,
    fontSize: 15,
    fontFamily: "inherit",
    background: "#fff",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's make your business <em>work better</em>"
      />

      <section className="pb-blk">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 48,
            alignItems: "start",
          }}
          className="pb-contact-grid"
        >
          {/* Left: contact cards */}
          <div style={{ display: "grid", gap: 20 }}>
            <ContactCard Icon={IconPin} title="Location" lines={[CONTACT.location]} />
            <ContactCard
              Icon={IconPhone}
              title="Phone"
              lines={CONTACT.phones}
              hrefs={CONTACT.phones.map((p) => `tel:${p.replace(/\s/g, "")}`)}
            />
            <ContactCard
              Icon={IconMail}
              title="Email"
              lines={[CONTACT.email, CONTACT.website]}
              hrefs={[`mailto:${CONTACT.email}`, undefined]}
            />
          </div>

          {/* Right: form */}
          <div
            className="pb-form-card"
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 24,
              padding: 36,
            }}
          >
            {success ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--soft)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{ width: 32, height: 32, stroke: "var(--p)", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 24, margin: "0 0 8px" }}>
                  Thank you — enquiry sent
                </h3>
                <p style={{ color: "var(--mut)", margin: 0 }}>
                  We'll be in touch shortly. For anything urgent, call us on{" "}
                  {CONTACT.phones[0]}.
                </p>
                <button
                  className="pb-btn ghost"
                  style={{ marginTop: 24 }}
                  onClick={() => setSuccess(false)}
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 18 }}>
                <Field label="Full name" required error={errors.full_name}>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={set("full_name")}
                    style={inputStyle("full_name")}
                    placeholder="Your name"
                  />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="pb-form-row">
                  <Field label="Email" required error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      style={inputStyle("email")}
                      placeholder="you@company.co.za"
                    />
                  </Field>
                  <Field label="Phone" error={errors.phone}>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      style={inputStyle("phone")}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
                <Field label="Company" error={errors.company}>
                  <input
                    type="text"
                    value={form.company}
                    onChange={set("company")}
                    style={inputStyle("company")}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="What do you need?" error={errors.enquiry_type}>
                  <select
                    value={form.enquiry_type}
                    onChange={set("enquiry_type")}
                    style={inputStyle("enquiry_type")}
                  >
                    <option value="">Select an option…</option>
                    {ENQUIRY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Message" required error={errors.message}>
                  <textarea
                    value={form.message}
                    onChange={set("message")}
                    style={{ ...inputStyle("message"), minHeight: 120, resize: "vertical" }}
                    placeholder="Tell us how your team works today…"
                  />
                </Field>
                {errors.submit && (
                  <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>
                    {errors.submit}
                  </p>
                )}
                <button
                  type="submit"
                  className="pb-btn"
                  disabled={submitting}
                  style={{ justifySelf: "start", opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "Sending…" : "Send enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6, display: "block" }}>
        {label} {required && <span style={{ color: "var(--p)" }}>*</span>}
      </span>
      {children}
      {error && (
        <span style={{ color: "#dc2626", fontSize: 13, marginTop: 4, display: "block" }}>
          {error}
        </span>
      )}
    </label>
  );
}

function ContactCard({ Icon, title, lines, hrefs }) {
  return (
    <div
      className="pb-contact-card"
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        padding: 24,
        border: "1px solid var(--line)",
        borderRadius: 20,
        background: "#fff",
      }}
    >
      <div
        style={{
          flex: "none",
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--p)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon style={{ width: 22, height: 22, fill: "#fff" }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{title}</div>
        {lines.map((l, i) =>
          hrefs && hrefs[i] ? (
            <a
              key={l}
              href={hrefs[i]}
              style={{ display: "block", color: "var(--mut)", textDecoration: "none", fontSize: 15, lineHeight: 1.6 }}
            >
              {l}
            </a>
          ) : (
            <div key={l} style={{ color: "var(--mut)", fontSize: 15, lineHeight: 1.6 }}>
              {l}
            </div>
          )
        )}
      </div>
    </div>
  );
}