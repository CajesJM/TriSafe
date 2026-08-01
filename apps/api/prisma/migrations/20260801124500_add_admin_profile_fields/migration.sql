ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarData" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
