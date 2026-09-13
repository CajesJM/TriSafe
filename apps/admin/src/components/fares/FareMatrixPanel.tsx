import { VehicleFarePolicyPanel } from "./VehicleFarePolicyPanel";

type Props = {
  onChanged: () => Promise<void>;
  onNotify: (type: "success" | "error" | "info", message: string) => void;
};

export function FareMatrixPanel({ onChanged, onNotify }: Props) {
  return (
    <div className="fare-workspace">
      <VehicleFarePolicyPanel onChanged={onChanged} onNotify={onNotify} />
    </div>
  );
}
