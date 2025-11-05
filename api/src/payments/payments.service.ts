import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const { orderId, provider, amount, providerRef } = createPaymentDto;

    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Check if order is already paid
    if (order.status === 'PAID') {
      throw new BadRequestException('Order is already paid');
    }

    const paymentAmount = new Decimal(amount.toString());

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        provider,
        providerRef,
        amount: paymentAmount,
        status: paymentAmount.equals(order.total) ? 'SUCCESS' : 'FAILED',
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                ticket: true,
              },
            },
          },
        },
      },
    });

    // If payment amount equals order total, mark order as PAID
    if (paymentAmount.equals(order.total)) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
      payment.order.status = 'PAID';
    }

    return payment;
  }

  findOne(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                ticket: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
