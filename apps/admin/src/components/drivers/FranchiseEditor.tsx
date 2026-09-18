import {
  FormEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  Info,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Driver, UpdateFranchiseInput } from "../../api";
import { ModalShell } from "../shared/ModalShell";
import { displayPersonName } from "../../utils/personName";

export function FranchiseEditor({
  driver,
  onCancel,
  onSave,
  onError,
}: {
  driver: Driver;
  onCancel: () => void;
  onSave: (input: UpdateFranchiseInput) => Promise<void>;
  onError: (message: string) => void;
}) {
  const franchise = driver.franchise;
  const [status, setStatus] = useState<UpdateFranchiseInput["status"]>(
    (franchise?.status as UpdateFranchiseInput["status"]) ?? "VERIFIED",
  );
  const [expiresAt, setExpiresAt] = useState(
    franchise?.expiresAt?.slice(0, 10) ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [informationOpen, setInformationOpen] = useState(false);
  const [informationClosing, setInformationClosing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarPlacement, setCalendarPlacement] = useState<"above" | "below">(
    "below",
  );
  const [calendarMonth, setCalendarMonth] = useState(() =>
    monthFromDate(franchise?.expiresAt?.slice(0, 10) ?? localDate()),
  );
  const informationControl = useRef<HTMLDivElement>(null);
  const statusControl = useRef<HTMLDivElement>(null);
  const calendarControl = useRef<HTMLDivElement>(null);
  const calendarPopover = useRef<HTMLDivElement>(null);
  const statusListId = useId();
  const calendarId = useId();
  const currentStatus = franchise?.status ?? driver.verification;
  const currentStatusLabel = statusLabel(currentStatus);
  const expirationLabel = franchise?.expiresAt
    ? formatFranchiseDate(franchise.expiresAt)
    : "No expiration date";

  useEffect(() => {
    if (!informationOpen || informationClosing) return;
    const dismissTimer = window.setTimeout(
      () => setInformationClosing(true),
      5_000,
    );
    function closeOutside(event: PointerEvent) {
      if (!informationControl.current?.contains(event.target as Node))
        setInformationClosing(true);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.clearTimeout(dismissTimer);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [informationClosing, informationOpen]);

  useEffect(() => {
    if (!statusOpen && !calendarOpen) return;
    function closeOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (!statusControl.current?.contains(target)) setStatusOpen(false);
      if (!calendarControl.current?.contains(target)) setCalendarOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [calendarOpen, statusOpen]);

  useLayoutEffect(() => {
    if (!calendarOpen) return;
    function placeCalendar() {
      const control = calendarControl.current;
      const popover = calendarPopover.current;
      if (!control || !popover) return;
      const bounds = control.getBoundingClientRect();
      const spaceBelow = window.innerHeight - bounds.bottom;
      const requiredSpace = popover.offsetHeight + 12;
      setCalendarPlacement(spaceBelow >= requiredSpace ? "below" : "above");
    }
    placeCalendar();
    window.addEventListener("resize", placeCalendar);
    return () => window.removeEventListener("resize", placeCalendar);
  }, [calendarMonth, calendarOpen]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      const message = "Select a valid franchise expiration date.";
      setError(message);
      onError(message);
      return;
    }
    if (status === "VERIFIED" && expiresAt <= localDate()) {
      const message =
        "A verified driver must have a future franchise expiration date.";
      setError(message);
      onError(message);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        status,
        expiresAt: new Date(`${expiresAt}T23:59:59+08:00`).toISOString(),
      });
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Unable to update the franchise.";
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      eyebrow="FRANCHISE MANAGEMENT"
      title={`Update ${displayPersonName(driver.fullName)}`}
      description="Control transport eligibility and keep the BPLO franchise expiration record current."
      onClose={onCancel}
      busy={saving}
      size="large"
      className="franchise-modal"
      headerAction={
        <div className="franchise-info-control" ref={informationControl}>
          <button
            type="button"
            aria-label="Show franchise information"
            aria-expanded={informationOpen && !informationClosing}
            aria-controls="franchise-information"
            onClick={() => {
              if (informationOpen) {
                setInformationClosing(true);
                return;
              }
              setInformationClosing(false);
              setInformationOpen(true);
            }}
          >
            <Info aria-hidden="true" />
          </button>
          {informationOpen && (
            <div
              id="franchise-information"
              className={`franchise-info-popover${informationClosing ? " closing" : ""}`}
              role="status"
              onAnimationEnd={() => {
                if (!informationClosing) return;
                setInformationOpen(false);
                setInformationClosing(false);
              }}
            >
              <strong>Automatic protection</strong>
              <p>
                If the expiration date passes, TriSafe automatically marks the
                franchise and driver as Expired.
              </p>
            </div>
          )}
        </div>
      }
      footer={
        <>
          <button
            className="secondary"
            onClick={onCancel}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>
          <button
            className="primary"
            form="franchise-update-form"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <div
        className={`franchise-modal-summary franchise-modal-summary-${currentStatus.toLowerCase()}`}
      >
        <span className="franchise-summary-icon">
          {currentStatus === "EXPIRED" ? (
            <FileWarning aria-hidden="true" />
          ) : currentStatus === "SUSPENDED" ? (
            <ShieldAlert aria-hidden="true" />
          ) : (
            <ShieldCheck aria-hidden="true" />
          )}
        </span>
        <div className="franchise-summary-item franchise-number-summary">
          <small>Franchise number</small>
          <strong>{franchise?.franchiseNumber ?? "Not assigned"}</strong>
        </div>
        <div className="franchise-summary-item franchise-status-summary">
          <small>Current status</small>
          <strong
            className={`franchise-status-pill ${currentStatus.toLowerCase()}`}
          >
            <i aria-hidden="true" /> {currentStatusLabel}
          </strong>
          <span>{statusTimeline(currentStatus, expirationLabel)}</span>
        </div>
        <div className="franchise-summary-account">
          <UsersRound aria-hidden="true" />
          <p>The driver account follows franchise eligibility.</p>
        </div>
      </div>
      {error && (
        <div className="error franchise-modal-error" role="alert">
          {error}
        </div>
      )}
      <div className="franchise-details-heading">
        <h3>Franchise details</h3>
        <p>Update the driver’s franchise status and expiration date.</p>
      </div>
      <form
        id="franchise-update-form"
        className="franchise-modal-form"
        onSubmit={submit}
        noValidate
      >
        <div className="field">
          <label id="franchise-status-label">
            Driver and franchise status <em>*</em>
          </label>
          <div
            className={`franchise-status-select${statusOpen ? " is-open" : ""}`}
            ref={statusControl}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.stopPropagation();
              setStatusOpen(false);
            }}
          >
            <button
              className="franchise-select-trigger"
              type="button"
              role="combobox"
              aria-labelledby="franchise-status-label"
              aria-controls={statusListId}
              aria-expanded={statusOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setCalendarOpen(false);
                setStatusOpen((open) => !open);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setStatusOpen(true);
                }
              }}
            >
              <StatusIcon status={status} />
              <span>
                <strong>{statusLabel(status)}</strong>
                <small>{statusDescription(status)}</small>
              </span>
              <ChevronDown
                className="franchise-select-chevron"
                aria-hidden="true"
              />
            </button>
            {statusOpen && (
              <div
                className="franchise-status-menu"
                id={statusListId}
                role="listbox"
                aria-labelledby="franchise-status-label"
              >
                {FRANCHISE_STATUSES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={status === option.value}
                    className={status === option.value ? "selected" : ""}
                    onClick={() => {
                      setStatus(option.value);
                      setStatusOpen(false);
                      setError("");
                    }}
                  >
                    <StatusIcon status={option.value} />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    {status === option.value && <Check aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <small className="field-input-hint">
            The selected status applies to both the driver and franchise.
          </small>
        </div>
        <div className="field">
          <label id="franchise-expiration-label">
            Franchise expiration date <em>*</em>
          </label>
          <div
            className={`franchise-calendar-control opens-${calendarPlacement}`}
            ref={calendarControl}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.stopPropagation();
              setCalendarOpen(false);
            }}
          >
            <button
              className={`franchise-date-trigger${
                status === "EXPIRED" ||
                (expiresAt !== "" && expiresAt < localDate())
                  ? " is-expired"
                  : ""
              }`}
              type="button"
              aria-labelledby="franchise-expiration-label"
              aria-controls={calendarId}
              aria-expanded={calendarOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setStatusOpen(false);
                setCalendarMonth(monthFromDate(expiresAt || localDate()));
                setCalendarOpen((open) => !open);
              }}
            >
              <CalendarClock aria-hidden="true" />
              <span className={expiresAt ? "" : "placeholder"}>
                {expiresAt
                  ? formatCalendarDate(expiresAt)
                  : "Select expiration date"}
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
            {calendarOpen && (
              <FranchiseCalendar
                id={calendarId}
                popoverRef={calendarPopover}
                month={calendarMonth}
                value={expiresAt}
                onMonthChange={setCalendarMonth}
                onChange={(value) => {
                  setExpiresAt(value);
                  setCalendarOpen(false);
                  setError("");
                }}
              />
            )}
          </div>
          <small className="field-input-hint">
            Verified status requires a date later than today.
          </small>
        </div>
      </form>
    </ModalShell>
  );
}

const FRANCHISE_STATUSES: Array<{
  value: UpdateFranchiseInput["status"];
  label: string;
  description: string;
}> = [
  {
    value: "VERIFIED",
    label: "Verified",
    description: "Eligible for passenger rides",
  },
  {
    value: "SUSPENDED",
    label: "Suspended",
    description: "Transport access temporarily blocked",
  },
  {
    value: "EXPIRED",
    label: "Expired",
    description: "Franchise validity has ended",
  },
];

function StatusIcon({ status }: { status: UpdateFranchiseInput["status"] }) {
  const Icon =
    status === "VERIFIED"
      ? ShieldCheck
      : status === "SUSPENDED"
        ? ShieldAlert
        : FileWarning;
  return (
    <span className={`franchise-option-icon ${status.toLowerCase()}`}>
      <Icon aria-hidden="true" />
    </span>
  );
}

function FranchiseCalendar({
  id,
  popoverRef,
  month,
  value,
  onMonthChange,
  onChange,
}: {
  id: string;
  popoverRef: RefObject<HTMLDivElement | null>;
  month: Date;
  value: string;
  onMonthChange: (month: Date) => void;
  onChange: (value: string) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingDays = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = localDate();

  return (
    <div
      ref={popoverRef}
      className="franchise-calendar-popover"
      id={id}
      role="dialog"
      aria-label="Choose franchise expiration date"
    >
      <div className="franchise-calendar-header">
        <label>
          <span>Month and year</span>
          <input
            type="month"
            aria-label="Calendar month and year"
            value={`${year}-${String(monthIndex + 1).padStart(2, "0")}`}
            onChange={(event) => {
              if (/^\d{4}-\d{2}$/.test(event.target.value))
                onMonthChange(monthFromDate(`${event.target.value}-01`));
            }}
          />
        </label>
        <span>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="franchise-calendar-weekdays" aria-hidden="true">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="franchise-calendar-grid">
        {Array.from({ length: leadingDays }, (_, index) => (
          <span key={`empty-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const date = toDateValue(year, monthIndex, day);
          return (
            <button
              key={date}
              type="button"
              className={`${date === value ? "selected" : ""}${date === today ? " today" : ""}`}
              aria-label={formatCalendarDate(date)}
              aria-pressed={date === value}
              onClick={() => onChange(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="franchise-calendar-footer">
        <span>{value ? formatCalendarDate(value) : "No date selected"}</span>
        <button
          type="button"
          onClick={() => {
            onMonthChange(monthFromDate(today));
            onChange(today);
          }}
        >
          Today
        </button>
      </div>
    </div>
  );
}

function formatFranchiseDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function statusDescription(value: UpdateFranchiseInput["status"]) {
  return (
    FRANCHISE_STATUSES.find((option) => option.value === value)?.description ??
    "Choose a franchise status"
  );
}

function statusTimeline(status: string, expiration: string) {
  if (status === "EXPIRED") return `Expired since ${expiration}`;
  if (status === "SUSPENDED") return `Franchise expires ${expiration}`;
  return `Valid until ${expiration}`;
}

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function monthFromDate(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function toDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
