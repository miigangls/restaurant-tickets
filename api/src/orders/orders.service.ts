import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TicketsService } from '../tickets/tickets.service';
import { Decimal } from '@prisma/client/runtime/library';

const TAX_RATE = 0.19;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items } = createOrderDto;

    // Validate tickets and calculate totals
    let subtotal = new Decimal(0);
    const orderItems = [];

    for (const item of items) {
      const ticket = await this.ticketsService.findOne(item.ticketId);
      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${item.ticketId} not found`);
      }
      if (!ticket.isActive) {
        throw new BadRequestException(`Ticket ${ticket.title} is not active`);
      }
      if (ticket.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ticket ${ticket.title}`);
      }

      const unitPrice = new Decimal(ticket.price.toString());
      const lineTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);

      orderItems.push({
        ticketId: item.ticketId,
        quantity: item.quantity,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
      });
    }

    // Calculate tax (19%)
    const tax = subtotal.mul(TAX_RATE);
    const total = subtotal.add(tax);

    // Create order with items in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          userId,
          subtotal,
          tax,
          total,
          status: 'PENDING',
          items: {
            create: orderItems,
          },
        },
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
      });

      // Update stock for each ticket
      for (const item of items) {
        const ticket = await this.ticketsService.findOne(item.ticketId);
        await tx.ticket.update({
          where: { id: item.ticketId },
          data: {
            stock: ticket.stock - item.quantity,
          },
        });
      }

      return order;
    });

    return order;
  }

  findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            ticket: true,
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ticket: true,
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }
}
