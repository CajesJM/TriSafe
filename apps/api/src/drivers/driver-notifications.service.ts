import { Injectable, NotFoundException } from '@nestjs/common';
import { DriverNotificationPriority, DriverNotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CreateDriverNotification = {
  driverId: string;
  type: DriverNotificationType;
  priority?: DriverNotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class DriverNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateDriverNotification) {
    return this.prisma.driverNotification.create({
      data: {
        ...input,
        priority: input.priority ?? DriverNotificationPriority.INFO,
      },
    });
  }

  createMany(inputs: CreateDriverNotification[]) {
    if (inputs.length === 0) return Promise.resolve({ count: 0 });
    return this.prisma.driverNotification.createMany({
      data: inputs.map((input) => ({
        ...input,
        priority: input.priority ?? DriverNotificationPriority.INFO,
      })),
    });
  }

  async listForUser(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return this.prisma.driverNotification.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    const result = await this.prisma.driverNotification.updateMany({
      where: { id: notificationId, driverId: driver.id },
      data: { readAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Notification not found');
    return { read: true };
  }

  async markAllRead(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    const result = await this.prisma.driverNotification.updateMany({
      where: { driverId: driver.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { markedRead: result.count };
  }

  markEntityRead(driverId: string, entityType: string, entityId: string) {
    return this.prisma.driverNotification.updateMany({
      where: { driverId, entityType, entityId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
