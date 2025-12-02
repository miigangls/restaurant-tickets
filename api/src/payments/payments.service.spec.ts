import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a successful payment when amount matches order total', async () => {
      const createPaymentDto: CreatePaymentDto = {
        orderId: 'order-id',
        provider: 'STRIPE',
        amount: 119.0,
        providerRef: 'stripe-ref-123',
      };

      const mockOrder = {
        id: 'order-id',
        total: new Decimal(119.0),
        status: 'PENDING',
      };

      const mockPayment = {
        id: 'payment-id',
        orderId: 'order-id',
        provider: 'STRIPE',
        providerRef: 'stripe-ref-123',
        amount: new Decimal(119.0),
        status: 'SUCCESS',
        order: {
          ...mockOrder,
          status: 'PAID',
          items: [],
        },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PAID',
      });

      const result = await service.create(createPaymentDto);

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-id' },
      });
      expect(prismaService.payment.create).toHaveBeenCalled();
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-id' },
        data: { status: 'PAID' },
      });
      expect(result.status).toBe('SUCCESS');
      expect(result.order.status).toBe('PAID');
    });

    it('should create a failed payment when amount does not match order total', async () => {
      const createPaymentDto: CreatePaymentDto = {
        orderId: 'order-id',
        provider: 'STRIPE',
        amount: 100.0,
        providerRef: 'stripe-ref-123',
      };

      const mockOrder = {
        id: 'order-id',
        total: new Decimal(119.0),
        status: 'PENDING',
      };

      const mockPayment = {
        id: 'payment-id',
        orderId: 'order-id',
        provider: 'STRIPE',
        providerRef: 'stripe-ref-123',
        amount: new Decimal(100.0),
        status: 'FAILED',
        order: {
          ...mockOrder,
          items: [],
        },
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await service.create(createPaymentDto);

      expect(result.status).toBe('FAILED');
      expect(prismaService.order.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      const createPaymentDto: CreatePaymentDto = {
        orderId: 'non-existent-order',
        provider: 'STRIPE',
        amount: 119.0,
        providerRef: 'stripe-ref-123',
      };

      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.create(createPaymentDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createPaymentDto)).rejects.toThrow(
        `Order with ID non-existent-order not found`,
      );
      expect(prismaService.payment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when order is already paid', async () => {
      const createPaymentDto: CreatePaymentDto = {
        orderId: 'order-id',
        provider: 'STRIPE',
        amount: 119.0,
        providerRef: 'stripe-ref-123',
      };

      const mockOrder = {
        id: 'order-id',
        total: new Decimal(119.0),
        status: 'PAID',
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.create(createPaymentDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createPaymentDto)).rejects.toThrow('Order is already paid');
      expect(prismaService.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      const paymentId = 'payment-id';
      const mockPayment = {
        id: paymentId,
        orderId: 'order-id',
        provider: 'STRIPE',
        amount: new Decimal(119.0),
        status: 'SUCCESS',
        order: {
          id: 'order-id',
          items: [],
          user: {
            id: 'user-id',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.findOne(paymentId);

      expect(prismaService.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId },
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
      expect(result).toEqual(mockPayment);
    });
  });
});
