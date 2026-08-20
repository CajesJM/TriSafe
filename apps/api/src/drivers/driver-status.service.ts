import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DriverVerificationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class DriverStatusService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    void this.syncExpiredDrivers();
    this.timer = setInterval(
      () => void this.syncExpiredDrivers(),
      60 * 60 * 1000,
    );
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async syncExpiredDrivers() {
    const expired = await this.prisma.driver.findMany({
      where: { franchise: { is: { expiresAt: { lt: new Date() } } } },
      include: { franchise: true },
    });
    for (const driver of expired) {
      if (
        !driver.franchise ||
        (driver.verification === DriverVerificationStatus.EXPIRED &&
          driver.franchise.status === DriverVerificationStatus.EXPIRED)
      )
        continue;
      await this.prisma.$transaction([
        this.prisma.driver.update({
          where: { id: driver.id },
          data: { verification: DriverVerificationStatus.EXPIRED },
        }),
        this.prisma.franchise.update({
          where: { id: driver.franchise.id },
          data: { status: DriverVerificationStatus.EXPIRED },
        }),
      ]);
      await this.audit.record({
        action: "DRIVER_AUTO_EXPIRED",
        entityType: "Driver",
        entityId: driver.id,
        details: {
          franchiseId: driver.franchise.id,
          expiredAt: driver.franchise.expiresAt.toISOString(),
        },
      });
    }
    return expired.length;
  }
}
