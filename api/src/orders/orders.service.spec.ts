import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let ticketsService: TicketsService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    ticket: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockTicketsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    ticketsService = module.get<TicketsService>(TicketsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an order with valid items', async () => {
      const userId = 'user-id';
      const createOrderDto: CreateOrderDto = {
        items: [
          {
            ticketId: 'ticket-1',
            quantity: 2,
          },
        ],
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockTicket = {
        id: 'ticket-1',
        title: 'Test Ticket',
        price: new Decimal(10.0),
        stock: 100,
        isActive: true,
      };

      const mockOrder = {
        id: 'order-id',
        userId,
        subtotal: new Decimal(20.0),
        tax: new Decimal(3.8),
        total: new Decimal(23.8),
        status: 'PENDING',
        items: [
          {
            ticketId: 'ticket-1',
            quantity: 2,
            unitPrice: new Decimal(10.0),
            lineTotal: new Decimal(20.0),
            ticket: mockTicket,
          },
        ],
        user: mockUser,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTicketsService.findOne.mockResolvedValue(mockTicket);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            create: jest.fn().mockResolvedValue(mockOrder),
          },
          ticket: {
            update: jest.fn().mockResolvedValue({ ...mockTicket, stock: 98 }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(userId, createOrderDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(ticketsService.findOne).toHaveBeenCalledWith('ticket-1');
      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when user does not exist', async () => {
      const userId = 'non-existent-user-id';
      const createOrderDto: CreateOrderDto = {
        items: [
          {
            ticketId: 'ticket-1',
            quantity: 1,
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(userId, createOrderDto)).rejects.toThrow('User not found');
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      const userId = 'user-id';
      const createOrderDto: CreateOrderDto = {
        items: [
          {
            ticketId: 'non-existent-ticket',
            quantity: 1,
          },
        ],
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTicketsService.findOne.mockRejectedValue(
        new NotFoundException(`Ticket with ID non-existent-ticket not found`),
      );

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        `Ticket with ID non-existent-ticket not found`,
      );
    });

    it('should throw BadRequestException when ticket is not active', async () => {
      const userId = 'user-id';
      const createOrderDto: CreateOrderDto = {
        items: [
          {
            ticketId: 'ticket-1',
            quantity: 1,
          },
        ],
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockTicket = {
        id: 'ticket-1',
        title: 'Inactive Ticket',
        price: new Decimal(10.0),
        stock: 100,
        isActive: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTicketsService.findOne.mockResolvedValue(mockTicket);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        `Ticket Inactive Ticket is not active`,
      );
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const userId = 'user-id';
      const createOrderDto: CreateOrderDto = {
        items: [
          {
            ticketId: 'ticket-1',
            quantity: 100,
          },
        ],
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockTicket = {
        id: 'ticket-1',
        title: 'Test Ticket',
        price: new Decimal(10.0),
        stock: 50,
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTicketsService.findOne.mockResolvedValue(mockTicket);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        `Insufficient stock for ticket Test Ticket`,
      );
    });

    it('should calculate tax correctly (19%)', async () => {
      const userId = 'user-id';
      const createOrderDto: CreateOrderDto = {
        items: [
          {
            ticketId: 'ticket-1',
            quantity: 1,
          },
        ],
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockTicket = {
        id: 'ticket-1',
        title: 'Test Ticket',
        price: new Decimal(100.0),
        stock: 100,
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTicketsService.findOne.mockResolvedValue(mockTicket);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            create: jest.fn().mockResolvedValue({
              id: 'order-id',
              subtotal: new Decimal(100.0),
              tax: new Decimal(19.0),
              total: new Decimal(119.0),
              status: 'PENDING',
            }),
          },
          ticket: {
            update: jest.fn().mockResolvedValue({ ...mockTicket, stock: 99 }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(userId, createOrderDto);

      expect(result).toBeDefined();
      // Tax should be 19% of subtotal
      expect(result.tax.toNumber()).toBeCloseTo(19.0, 2);
      expect(result.total.toNumber()).toBeCloseTo(119.0, 2);
    });
  });

  describe('findByUser', () => {
    it('should return all orders for a user', async () => {
      const userId = 'user-id';
      const mockOrders = [
        {
          id: 'order-1',
          userId,
          total: new Decimal(23.8),
          status: 'PENDING',
        },
        {
          id: 'order-2',
          userId,
          total: new Decimal(50.0),
          status: 'PAID',
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findByUser(userId);

      expect(prismaService.order.findMany).toHaveBeenCalledWith({
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
      expect(result).toEqual(mockOrders);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const orderId = 'order-id';
      const mockOrder = {
        id: orderId,
        userId: 'user-id',
        total: new Decimal(23.8),
        status: 'PENDING',
        items: [],
        payments: [],
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(orderId);

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
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
      expect(result).toEqual(mockOrder);
    });
  });
});
