import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { BellRing, CalendarClock, Send, UsersRound } from "lucide-react";
import { Announcement, AnnouncementInput, api } from "../../api";
import { EmptyState } from "../shared/Feedback";

export function AnnouncementComposer({
  onNotify,
}: {
  onNotify: (type: "success" | "error" | "info", message: string) => void;
}) {
  const [values, setValues] = useState<AnnouncementInput>({ title: "", body: "", expiresAt: "" });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnnouncements() {
    setLoading(true);
    try {
      setAnnouncements(await api.announcements());
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to load announcement history.";
      setError(message);
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadAnnouncements(); }, []);
  const summary = useMemo(() => ({
    total: announcements.length,
    active: announcements.filter((item) => !item.expiresAt || new Date(item.expiresAt) > new Date()).length,
    delivered: announcements.reduce((total, item) => total + item.recipientCount, 0),
  }), [announcements]);

  function update(field: keyof AnnouncementInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function chooseImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Announcement images must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("imageData", String(reader.result));
    reader.onerror = () => setError("The selected image could not be read.");
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (values.expiresAt && values.expiresAt < new Date().toISOString().slice(0, 10)) {
      setError("The announcement expiry date cannot be in the past.");
      return;
    }
    setSaving(true);
    try {
      await api.createAnnouncement({ ...values, title: values.title.trim(), body: values.body.trim(), expiresAt: values.expiresAt || undefined, imageData: values.imageData || undefined });
      setValues({ title: "", body: "", expiresAt: "" });
      await loadAnnouncements();
      onNotify("success", "Announcement was published to all verified drivers.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to publish the announcement.";
      setError(message);
      onNotify("error", message);
    } finally { setSaving(false); }
  }

  return <div className="announcement-workspace">
    <section className="announcement-summary" aria-label="Announcement overview">
      <AnnouncementMetric icon={<BellRing />} label="Published" value={summary.total} detail="Official LGU notices" />
      <AnnouncementMetric icon={<CalendarClock />} label="Active" value={summary.active} detail="Visible to drivers now" />
      <AnnouncementMetric icon={<UsersRound />} label="Deliveries" value={summary.delivered} detail="Verified-driver recipients" />
    </section>
    <div className="announcement-grid">
      <form className="card announcement-composer-card" onSubmit={submit}>
        <div className="form-heading"><div><span className="eyebrow">LGU DRIVER COMMUNICATION</span><h3>Publish announcement</h3><p>Verified driver accounts receive this notice in their TriSafe driver workspace.</p></div><span className="announcement-heading-icon"><Send /></span></div>
        {error && <div className="error form-error" role="alert">{error}</div>}
        <div className="form-section"><div className="form-grid"><label className="field"><span>Title <em>*</em></span><input value={values.title} maxLength={120} onChange={(event) => update("title", event.target.value)} placeholder="Franchise renewal reminder" required /></label><label className="field"><span>Expires on <small>Optional</small></span><input type="date" min={new Date().toISOString().slice(0, 10)} value={values.expiresAt} onChange={(event) => update("expiresAt", event.target.value)} /></label></div><label className="field announcement-body"><span>Message <em>*</em></span><textarea rows={8} maxLength={2500} value={values.body} onChange={(event) => update("body", event.target.value)} placeholder="Write an official message for verified drivers." required /><small>{values.body.length}/2500 characters</small></label><label className="field announcement-image-field"><span>Announcement image <small>Optional · JPG, PNG, or WebP · maximum 2 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} />{values.imageData && <div className="announcement-image-preview"><img src={values.imageData} alt="Announcement preview" /><button className="text-button" type="button" onClick={() => update("imageData", "")}>Remove image</button></div>}</label></div>
        <div className="form-actions"><button className="primary submit-button" disabled={saving} type="submit">{saving ? "Publishing…" : "Publish announcement"}</button></div>
      </form>
      <section className="card announcement-history-card"><div className="section-heading"><div><span className="eyebrow">PUBLICATION HISTORY</span><h3>Recent official notices</h3><p className="section-description">Delivery counts and read acknowledgements come from the live driver recipient records.</p></div></div>{loading ? <div className="announcement-history-loading">Loading announcement history…</div> : announcements.length === 0 ? <EmptyState title="No announcements yet" text="Publish the first official notice for verified drivers." /> : <div className="announcement-history-list">{announcements.slice(0, 8).map((item) => <AnnouncementHistoryItem item={item} key={item.id} />)}</div>}</section>
    </div>
  </div>;
}

function AnnouncementMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail: string }) { return <div className="announcement-metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></div>; }
function AnnouncementHistoryItem({ item }: { item: Announcement }) { const expired = item.expiresAt && new Date(item.expiresAt) <= new Date(); return <article className="announcement-history-item"><span className={`announcement-state ${expired ? "expired" : "active"}`}>{expired ? "Expired" : "Active"}</span>{item.imageData && <img className="announcement-history-image" src={item.imageData} alt="" />}<div><strong>{item.title}</strong><p>{item.body}</p><small>Published {new Date(item.publishedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}{item.expiresAt ? ` · Expires ${new Date(item.expiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}` : " · No expiry"}</small></div><span className="announcement-reach"><b>{item.readCount}/{item.recipientCount}</b><small>read</small></span></article>; }
