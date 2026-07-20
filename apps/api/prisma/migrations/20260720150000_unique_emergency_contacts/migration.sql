DELETE FROM "EmergencyContact" older
USING "EmergencyContact" newer
WHERE older.name = newer.name
  AND older.phone = newer.phone
  AND older.id > newer.id;

CREATE UNIQUE INDEX "EmergencyContact_name_phone_key"
ON "EmergencyContact"("name", "phone");
