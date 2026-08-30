import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  VehicleFarePolicy,
  VehicleFarePolicyInput,
} from "../../api";

const vehicleTypes = ["TRICYCLE", "HABAL_HABAL"] as const;

function emptyPolicy(
  vehicleType: (typeof vehicleTypes)[number],
): VehicleFarePolicyInput {
  return {
    vehicleType,
    baseFare: vehicleType === "TRICYCLE" ? 15 : 20,
    ratePerKm: vehicleType === "TRICYCLE" ? 8 : 12,
    minimumFare: vehicleType === "TRICYCLE" ? 15 : 20,
    studentDiscountPercent: 20,
    seniorDiscountPercent: 20,
    version: `LGU-${new Date().getFullYear()}-01`,
    active: true,
    effectiveFrom: new Date().toISOString().slice(0, 10),
  };
}

function toInput(policy: VehicleFarePolicy): VehicleFarePolicyInput {
  return {
    vehicleType: policy.vehicleType,
    baseFare: Number(policy.baseFare),
    ratePerKm: Number(policy.ratePerKm),
    minimumFare: Number(policy.minimumFare),
    studentDiscountPercent: Number(policy.studentDiscountPercent),
    seniorDiscountPercent: Number(policy.seniorDiscountPercent),
    version: policy.version,
    active: policy.active,
    effectiveFrom: policy.effectiveFrom.slice(0, 10),
    effectiveTo: policy.effectiveTo?.slice(0, 10),
  };
}

export function VehicleFarePolicyPanel({
  onChanged,
  onNotify,
}: {
  onChanged: () => Promise<void>;
  onNotify: (type: "success" | "error" | "info", message: string) => void;
}) {
  const [policies, setPolicies] = useState<Record<string, VehicleFarePolicyInput>>(
    () =>
      Object.fromEntries(
        vehicleTypes.map((type) => [type, emptyPolicy(type)]),
      ),
  );
  const [distanceKm, setDistanceKm] = useState(4.5);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .vehicleFarePolicies()
      .then((data) => {
        setPolicies((current) => ({
          ...current,
          ...Object.fromEntries(data.map((policy) => [policy.vehicleType, toInput(policy)])),
        }));
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load distance rates.",
        ),
      );
  }, []);

  function update(
    vehicleType: (typeof vehicleTypes)[number],
    field: keyof VehicleFarePolicyInput,
    value: string | number | boolean,
  ) {
    setPolicies((current) => ({
      ...current,
      [vehicleType]: { ...current[vehicleType], [field]: value },
    }));
    setNotice("");
  }

  async function save(
    event: FormEvent,
    vehicleType: (typeof vehicleTypes)[number],
  ) {
    event.preventDefault();
    setSaving(vehicleType);
    setError("");
    setNotice("");
    try {
      const saved = await api.saveVehicleFarePolicy(policies[vehicleType]);
      setPolicies((current) => ({
        ...current,
        [vehicleType]: toInput(saved),
      }));
      await onChanged();
      const message = `${vehicleType === "TRICYCLE" ? "Tricycle" : "Habal-habal"} distance fare policy was published.`;
      setNotice(message);
      onNotify("success", message);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to save the fare rate.";
      setError(message);
      onNotify("error", message);
    } finally {
      setSaving("");
    }
  }

  const examples = useMemo(
    () =>
      vehicleTypes.map((type) => {
        const policy = policies[type];
        const total = Math.max(
          policy.minimumFare,
          policy.baseFare + distanceKm * policy.ratePerKm,
        );
        return {
          type,
          total,
          student: total * (1 - policy.studentDiscountPercent / 100),
          senior: total * (1 - policy.seniorDiscountPercent / 100),
        };
      }),
    [distanceKm, policies],
  );

  return (
    <section className="card fare-policy-card" aria-labelledby="distance-rates-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">OFFICIAL DISTANCE RATES</span>
          <h3 id="distance-rates-title">Vehicle fare matrix</h3>
          <p className="section-description">
            Configure the base fare and price per kilometer used for the tracked
            GPS distance. Each vehicle type has its own official rate.
          </p>
        </div>
        <span className="formula-chip">
          Fare = base + (tracked km × rate)
        </span>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      {notice && <div className="success" role="status"><span>✓</span>{notice}</div>}
      <div className="fare-policy-layout">
        <div className="policy-grid">
          {vehicleTypes.map((vehicleType) => {
            const policy = policies[vehicleType];
            const label =
              vehicleType === "TRICYCLE" ? "Tricycle" : "Habal-habal";
            return (
              <form
                className="policy-form"
                key={vehicleType}
                onSubmit={(event) => void save(event, vehicleType)}
              >
                <div className="policy-heading">
                  <span className={`vehicle-symbol ${vehicleType.toLowerCase()}`}>
                    {vehicleType === "TRICYCLE" ? "T" : "H"}
                  </span>
                  <div>
                    <h4>{label}</h4>
                    <small>Rate applied to verified {label.toLowerCase()} rides</small>
                  </div>
                  <label className="policy-switch">
                    <input
                      checked={policy.active}
                      onChange={(event) =>
                        update(vehicleType, "active", event.target.checked)
                      }
                      type="checkbox"
                    />
                    Active
                  </label>
                </div>
                <div className="policy-fields">
                  <label>
                    Base fare
                    <span className="money-input">
                      <i>₱</i>
                      <input
                        min="0"
                        onChange={(event) =>
                          update(vehicleType, "baseFare", Number(event.target.value))
                        }
                        required
                        step="0.01"
                        type="number"
                        value={policy.baseFare}
                      />
                    </span>
                  </label>
                  <label>
                    Rate per kilometer
                    <span className="money-input">
                      <i>₱</i>
                      <input
                        min="0"
                        onChange={(event) =>
                          update(vehicleType, "ratePerKm", Number(event.target.value))
                        }
                        required
                        step="0.01"
                        type="number"
                        value={policy.ratePerKm}
                      />
                    </span>
                  </label>
                  <label>
                    Minimum fare
                    <span className="money-input">
                      <i>₱</i>
                      <input
                        min="0"
                        onChange={(event) =>
                          update(vehicleType, "minimumFare", Number(event.target.value))
                        }
                        required
                        step="0.01"
                        type="number"
                        value={policy.minimumFare}
                      />
                    </span>
                  </label>
                  <label>
                    Student discount
                    <span className="money-input">
                      <i>%</i>
                      <input min="0" max="100" onChange={(event) => update(vehicleType, "studentDiscountPercent", Number(event.target.value))} required step="0.01" type="number" value={policy.studentDiscountPercent} />
                    </span>
                  </label>
                  <label>
                    Senior citizen discount
                    <span className="money-input">
                      <i>%</i>
                      <input min="0" max="100" onChange={(event) => update(vehicleType, "seniorDiscountPercent", Number(event.target.value))} required step="0.01" type="number" value={policy.seniorDiscountPercent} />
                    </span>
                  </label>
                  <label>
                    Matrix version
                    <input
                      onChange={(event) =>
                        update(vehicleType, "version", event.target.value)
                      }
                      required
                      type="text"
                      value={policy.version}
                    />
                  </label>
                  <label>
                    Effective from
                    <input
                      onChange={(event) =>
                        update(vehicleType, "effectiveFrom", event.target.value)
                      }
                      required
                      type="date"
                      value={policy.effectiveFrom}
                    />
                  </label>
                </div>
                <button className="primary policy-save" disabled={saving === vehicleType} type="submit">
                  {saving === vehicleType ? "Publishing…" : `Publish ${label} rate`}
                </button>
              </form>
            );
          })}
        </div>
        <aside className="fare-simulator">
          <span className="eyebrow">FARE PREVIEW</span>
          <h4>Test the active formula</h4>
          <label>
            Distance traveled
            <div className="range-value">
              <input
                max="30"
                min="0"
                onChange={(event) => setDistanceKm(Number(event.target.value))}
                step="0.1"
                type="range"
                value={distanceKm}
              />
              <strong>{distanceKm.toFixed(1)} km</strong>
            </div>
          </label>
          <div className="preview-results">
            {examples.map((example) => (
              <div key={example.type}>
                <span>{example.type.replaceAll("_", " ")} · Regular</span>
                <strong>₱{example.total.toFixed(2)}</strong>
                <span>Student ₱{example.student.toFixed(2)} · Senior ₱{example.senior.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p>
            Discounts apply after the official base, distance, and minimum-fare calculation. Passenger eligibility must be verified with the required ID at boarding.
          </p>
        </aside>
      </div>
    </section>
  );
}
