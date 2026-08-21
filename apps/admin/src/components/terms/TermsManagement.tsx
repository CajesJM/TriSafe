import { FormEvent, useEffect, useState } from "react";
import { BookOpenCheck, Eye, FilePenLine, Send } from "lucide-react";
import { api, SaveTermsInput, TermsDocument } from "../../api";
import { EmptyState } from "../shared/Feedback";
import { ModalShell } from "../shared/ModalShell";
import { ConfirmModal } from "../shared/ConfirmModal";

export function TermsManagement({
  onNotify,
}: {
  onNotify: (type: "success" | "error" | "info", message: string) => void;
}) {
  const [documents, setDocuments] = useState<TermsDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TermsDocument | null>(null);
  const [preview, setPreview] = useState<TermsDocument | null>(null);
  const [publishing, setPublishing] = useState<TermsDocument | null>(null);
  async function load() {
    setLoading(true);
    try {
      setDocuments(await api.terms());
    } catch (error) {
      onNotify(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to load Terms documents.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="terms-workspace">
      <section className="card data-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BPLO COMMUNICATION & POLICY</span>
            <h3>Terms & Conditions Management</h3>
            <p className="section-description">
              Create traceable policy drafts, preview them, then publish one
              official Terms & Conditions version for TriSafe users.
            </p>
          </div>
          <button
            className="primary"
            type="button"
            onClick={() =>
              setEditing({
                id: "",
                version: `TRISAFE-${new Date().getFullYear()}-01`,
                title: "TriSafe Terms & Conditions",
                content: "",
                status: "DRAFT",
                createdAt: "",
                updatedAt: "",
              })
            }
          >
            <FilePenLine /> New draft
          </button>
        </div>
        {loading ? (
          <div className="terms-loading">Loading policy versions…</div>
        ) : documents.length === 0 ? (
          <EmptyState
            title="No Terms document yet"
            text="Create the first draft before publishing terms for passengers and drivers."
          />
        ) : (
          <div className="terms-list">
            {documents.map((item) => (
              <article key={item.id} className="terms-row">
                <span
                  className={`status ${item.status === "PUBLISHED" ? "verified" : item.status === "DRAFT" ? "pending" : "dismissed"}`}
                >
                  {item.status}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.version} · Updated {formatDate(item.updatedAt)}
                    {item.effectiveFrom
                      ? ` · Effective ${formatDate(item.effectiveFrom)}`
                      : ""}
                  </small>
                </div>
                <span className="terms-actions">
                  <button
                    className="row-action"
                    type="button"
                    onClick={() => setPreview(item)}
                  >
                    <Eye /> Preview
                  </button>
                  {item.status === "DRAFT" && (
                    <>
                      <button
                        className="row-action"
                        type="button"
                        onClick={() => setEditing(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="row-action"
                        type="button"
                        onClick={() => setPublishing(item)}
                      >
                        <Send /> Publish
                      </button>
                    </>
                  )}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <TermsEditor
          document={editing.id ? editing : undefined}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            await load();
            onNotify("success", message);
            setEditing(null);
          }}
          onError={(message) => onNotify("error", message)}
        />
      )}
      {preview && (
        <TermsPreview document={preview} onClose={() => setPreview(null)} />
      )}
      {publishing && (
        <ConfirmModal
          title={`Publish ${publishing.version}?`}
          message="Publishing archives the current official Terms & Conditions version. This action is recorded in the audit trail."
          confirmLabel="Publish official terms"
          tone="warning"
          onCancel={() => setPublishing(null)}
          onError={(message) => onNotify("error", message)}
          onConfirm={async () => {
            await api.publishTerms(publishing.id);
            await load();
            onNotify(
              "success",
              `${publishing.version} is now the official Terms & Conditions document.`,
            );
          }}
        />
      )}
    </div>
  );
}
function TermsEditor({
  document,
  onClose,
  onSaved,
  onError,
}: {
  document?: TermsDocument;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [values, setValues] = useState<SaveTermsInput>({
    version: document?.version ?? `TRISAFE-${new Date().getFullYear()}-01`,
    title: document?.title ?? "TriSafe Terms & Conditions",
    content: document?.content ?? "",
    effectiveFrom: document?.effectiveFrom?.slice(0, 10) ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      !values.version.trim() ||
      !values.title.trim() ||
      !values.content.trim()
    ) {
      setError("Version, title, and policy content are required.");
      return;
    }
    setSaving(true);
    try {
      if (document)
        await api.updateTerms(document.id, {
          ...values,
          effectiveFrom: values.effectiveFrom || undefined,
        });
      else
        await api.createTerms({
          ...values,
          effectiveFrom: values.effectiveFrom || undefined,
        });
      await onSaved(
        document
          ? "Terms draft updated successfully."
          : "Terms draft created successfully.",
      );
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to save the Terms draft.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <ModalShell
      eyebrow="VERSIONED POLICY DRAFT"
      title={document ? "Edit Terms draft" : "Create Terms draft"}
      description="Use a clear version number. Published documents cannot be changed; create a new draft for each revision."
      onClose={onClose}
      busy={saving}
      size="large"
      footer={
        <>
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            type="submit"
            form="terms-form"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
        </>
      }
    >
      <form id="terms-form" className="terms-form" onSubmit={save}>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="form-grid">
          <label className="field">
            <span>
              Policy version <em>*</em>
            </span>
            <input
              value={values.version}
              maxLength={60}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  version: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="field">
            <span>Effective from</span>
            <input
              type="date"
              value={values.effectiveFrom ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  effectiveFrom: event.target.value,
                }))
              }
            />
          </label>
          <label className="field field-wide">
            <span>
              Document title <em>*</em>
            </span>
            <input
              value={values.title}
              maxLength={160}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="field field-wide">
            <span>
              Terms & Conditions content <em>*</em>
            </span>
            <textarea
              rows={16}
              maxLength={50000}
              value={values.content}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              placeholder="Write the official TriSafe Terms & Conditions here."
              required
            />
            <small>{values.content.length}/50000 characters</small>
          </label>
        </div>
      </form>
    </ModalShell>
  );
}
function TermsPreview({
  document,
  onClose,
}: {
  document: TermsDocument;
  onClose: () => void;
}) {
  return (
    <ModalShell
      eyebrow={
        document.status === "PUBLISHED"
          ? "OFFICIAL PUBLISHED POLICY"
          : "DRAFT POLICY PREVIEW"
      }
      title={document.title}
      description={`${document.version}${document.effectiveFrom ? ` · Effective ${formatDate(document.effectiveFrom)}` : ""}`}
      onClose={onClose}
      size="large"
      footer={
        <button className="primary" type="button" onClick={onClose}>
          Close preview
        </button>
      }
    >
      <article className="terms-preview">
        <BookOpenCheck />
        <pre>{document.content}</pre>
      </article>
    </ModalShell>
  );
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
