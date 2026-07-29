import { FormEvent, useState } from "react";
import { AnnouncementInput, api } from "../../api";

export function AnnouncementComposer({
  onPublished,
}: {
  onPublished: (message: string) => void;
}) {
  const [values, setValues] = useState<AnnouncementInput>({
    title: "",
    body: "",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof AnnouncementInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createAnnouncement({
        ...values,
        expiresAt: values.expiresAt || undefined,
      });
      setValues({ title: "", body: "", expiresAt: "" });
      onPublished("The announcement was sent to all verified drivers.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to publish the announcement.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="registration-layout announcement-layout">
      <form className="card registration-form" onSubmit={submit}>
        <div className="form-heading">
          <div>
            <span className="eyebrow">DRIVER COMMUNICATION</span>
            <h3>Send an announcement</h3>
            <p>
              Every verified driver will receive this announcement in the mobile
              driver workspace.
            </p>
          </div>
        </div>
        {error && (
          <div className="error form-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-section">
          <div className="form-grid">
            <label className="field">
              <span>
                Title <em>*</em>
              </span>
              <input
                value={values.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Franchise renewal reminder"
                required
              />
            </label>
            <label className="field">
              <span>Expires on</span>
              <input
                type="date"
                value={values.expiresAt}
                onChange={(event) => update("expiresAt", event.target.value)}
              />
            </label>
          </div>
          <label className="field announcement-body">
            <span>
              Message <em>*</em>
            </span>
            <textarea
              rows={8}
              value={values.body}
              onChange={(event) => update("body", event.target.value)}
              placeholder="Write the message for verified drivers."
              required
            />
          </label>
        </div>
        <div className="form-actions">
          <button
            className="primary submit-button"
            disabled={saving}
            type="submit"
          >
            {saving ? "Publishing…" : "Publish announcement"}
          </button>
        </div>
      </form>
      <aside className="card form-help">
        <div className="help-icon">!</div>
        <h3>Before you publish</h3>
        <p>
          Use announcements for official LGU reminders, renewal dates, route
          notices, and safety advisories.
        </p>
      </aside>
    </section>
  );
}
