import type { Ride } from "../models/trisafe";

export const money = (value: number) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const asNumber = (value: number | string | null | undefined) =>
  Number(value ?? 0);
export const rideFare = (ride: Ride) => {
  const currentFare =
    typeof ride.currentFare === "object"
      ? ride.currentFare?.amount
      : ride.currentFare;
  return asNumber(ride.finalFare ?? currentFare ?? ride.estimatedFare);
};
export const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not available";
export const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
