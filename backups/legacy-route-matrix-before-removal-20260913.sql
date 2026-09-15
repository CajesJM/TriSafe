--
-- PostgreSQL database dump
--

\restrict 0rSPpxKOskwlBqLcQFnA1PKTPXS0XbTSBArXbWqewGyUejaULqJkeOWctZVChTu

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Location; Type: TABLE DATA; Schema: public; Owner: trisafe
--

INSERT INTO public."Location" (id, name, latitude, longitude, active) VALUES ('loc-trinidad-terminal', 'Trinidad Transport Terminal', 9.8170000, 124.1451000, true);
INSERT INTO public."Location" (id, name, latitude, longitude, active) VALUES ('loc-trinidad-market', 'Trinidad Public Market', 9.8108000, 124.1435000, true);


--
-- Data for Name: FareRule; Type: TABLE DATA; Schema: public; Owner: trisafe
--

INSERT INTO public."FareRule" (id, "fromLocationId", "toLocationId", "baseFare", "distanceKm", "perKm", "minimumFare", version, "effectiveFrom", "effectiveTo", active) VALUES ('fare-trinidad-demo', 'loc-trinidad-market', 'loc-trinidad-terminal', 15.00, 2.10, 2.00, 15.00, 'LGU-2026-01', '2026-07-19 15:33:12.627', NULL, true);
INSERT INTO public."FareRule" (id, "fromLocationId", "toLocationId", "baseFare", "distanceKm", "perKm", "minimumFare", version, "effectiveFrom", "effectiveTo", active) VALUES ('fare-trinidad-terminal-to-market', 'loc-trinidad-terminal', 'loc-trinidad-market', 15.00, 2.10, 2.00, 15.00, 'LGU-2026-01', '2026-01-01 00:00:00', NULL, true);
INSERT INTO public."FareRule" (id, "fromLocationId", "toLocationId", "baseFare", "distanceKm", "perKm", "minimumFare", version, "effectiveFrom", "effectiveTo", active) VALUES ('fare-trinidad-market-to-terminal', 'loc-trinidad-market', 'loc-trinidad-terminal', 15.00, 2.10, 2.00, 15.00, 'LGU-2026-01', '2026-01-01 00:00:00', NULL, true);


--
-- Data for Name: Ride; Type: TABLE DATA; Schema: public; Owner: trisafe
--

INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmrss2rje0001fhestnljal0n', 'passenger-demo', 'cmrs2ab5v0004fh1w2k7spw9g', 'loc-trinidad-market', 'loc-trinidad-terminal', 29.20, 'LGU-2026-01', 'COMPLETED', '2026-07-20 05:22:24.362', '2026-07-20 05:22:48.699', NULL, NULL, NULL, NULL, 0, NULL, 1, 'TRICYCLE', NULL, NULL, NULL, NULL, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmrssgbo60001fh2g2bsscn9x', 'passenger-demo', 'vehicle-demo', 'loc-trinidad-terminal', 'loc-trinidad-market', 19.20, 'LGU-2026-01', 'COMPLETED', '2026-07-20 05:32:56.981', '2026-07-20 05:33:22.381', NULL, NULL, NULL, NULL, 0, NULL, 1, 'TRICYCLE', NULL, NULL, NULL, NULL, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmrsvc5ed0001fhqgyw4iy341', 'passenger-demo', 'cmrs2ab5v0004fh1w2k7spw9g', 'loc-trinidad-market', 'loc-trinidad-terminal', 19.20, 'LGU-2026-01', 'COMPLETED', '2026-07-20 06:53:41.078', '2026-07-20 06:53:41.315', NULL, NULL, NULL, NULL, 0, NULL, 1, 'TRICYCLE', NULL, NULL, NULL, NULL, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmrsvpvtv0001fh3srqdyaev4', 'passenger-demo', 'cmrs2ab5v0004fh1w2k7spw9g', 'loc-trinidad-market', 'loc-trinidad-terminal', 19.20, 'LGU-2026-01', 'COMPLETED', '2026-07-20 07:04:21.858', '2026-07-20 07:04:22.087', NULL, NULL, NULL, NULL, 0, NULL, 1, 'TRICYCLE', NULL, NULL, NULL, NULL, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmrsvx6h60001fhu8dx5fp9ui', 'passenger-demo', 'cmrs2ab5v0004fh1w2k7spw9g', 'loc-trinidad-market', 'loc-trinidad-terminal', 19.20, 'LGU-2026-01', 'COMPLETED', '2026-07-20 07:10:02.25', '2026-07-20 07:10:02.487', NULL, NULL, NULL, NULL, 0, NULL, 1, 'TRICYCLE', NULL, NULL, NULL, NULL, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmrsw72770003fhn8zmeo88bq', 'passenger-demo', 'cmrs2ab5v0004fh1w2k7spw9g', 'loc-trinidad-market', 'loc-trinidad-terminal', 19.20, 'LGU-2026-01', 'COMPLETED', '2026-07-20 07:17:43.268', '2026-07-20 07:17:43.515', NULL, NULL, NULL, NULL, 0, NULL, 1, 'TRICYCLE', NULL, NULL, NULL, NULL, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cms67vphh0005fhtcm28bsfo8', 'passenger-demo', 'vehicle-demo', 'loc-trinidad-market', 'loc-trinidad-terminal', 31.80, 'LGU-DISTANCE-2026-01', 'COMPLETED', '2026-07-29 15:05:49.254', '2026-07-29 15:06:09.422', 9.8108000, 124.1435000, 9.8208000, 124.1435000, 1111.949266445564, 23.90, 1, 'TRICYCLE', NULL, NULL, NULL, NULL, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmshh82yr000pfh50c8qepdpd', 'passenger-demo', 'cmsd479vs0005fhako3uxsxq2', NULL, NULL, 27.14, 'LGU-DISTANCE-2026-01', 'COMPLETED', '2026-08-06 12:12:51.075', '2026-08-06 12:14:58.299', 10.0798129, 124.3396966, 10.0790310, 124.3386733, 256.53210784703174, 23.11, 1, 'HABAL_HABAL', 'Current location (10.07981, 124.33970)', 'Map destination (10.07944, 124.34538)', 10.0794381, 124.3453847, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmtebs3t9000ffhssgvoevdx8', 'passenger-demo', 'cmt1g3yc50007fhe4nwb1ojyz', NULL, NULL, 141.50, 'LGU-DISTANCE-2026-01', 'COMPLETED', '2026-08-29 11:56:51.406', '2026-08-29 12:30:30.222', 10.0792169, 124.3386316, 10.0790151, 124.3386625, 651.3942185408678, 20.21, 1, 'TRICYCLE', 'Current location (10.07922, 124.33863)', 'Map destination (10.05400, 124.47506)', 10.0539976, 124.4750569, 'REGULAR');
INSERT INTO public."Ride" (id, "passengerId", "vehicleId", "fromLocationId", "toLocationId", "estimatedFare", "fareVersion", status, "startedAt", "endedAt", "startLatitude", "startLongitude", "endLatitude", "endLongitude", "actualDistanceMeters", "finalFare", "passengerCount", "vehicleType", "fromLocationName", "toLocationName", "destinationLatitude", "destinationLongitude", "passengerType") VALUES ('cmtfr67hk000jfhqskcalu524', 'passenger-demo', 'cmsd479vs0005fhako3uxsxq2', NULL, NULL, 70.35, 'LGU-DISTANCE-2026-01', 'COMPLETED', '2026-08-30 11:55:29.768', '2026-08-30 13:48:26.355', 10.0790674, 124.3388018, 10.0790562, 124.3385855, 260.23219341588157, 23.15, 1, 'HABAL_HABAL', 'Poblacion, Trinidad, Bohol', 'Tagum Norte, Trinidad, Bohol', 10.0795354, 124.3746745, 'REGULAR');


--
-- PostgreSQL database dump complete
--

\unrestrict 0rSPpxKOskwlBqLcQFnA1PKTPXS0XbTSBArXbWqewGyUejaULqJkeOWctZVChTu

