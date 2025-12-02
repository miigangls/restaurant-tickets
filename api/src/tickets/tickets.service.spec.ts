import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Decimal } from '@prisma/client/runtime/library';

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    ticket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new ticket', async () => {
      const createTicketDto: CreateTicketDto = {
        title: 'Test Ticket',
        description: 'Test Description',
        price: 10.99,
        stock: 100,
        isActive: true,
      };

      const mockTicket = {
        id: 'ticket-id',
        title: createTicketDto.title,
        description: createTicketDto.description,
        price: new Decimal(10.99),
        stock: createTicketDto.stock,
        isActive: createTicketDto.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.ticket.create.mockResolvedValue(mockTicket);

      const result = await service.create(createTicketDto);

      expect(prismaService.ticket.create).toHaveBeenCalledWith({
        data: createTicketDto,
      });
      expect(result).toEqual(mockTicket);
    });
  });

  describe('findAll', () => {
    it('should return all active tickets', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          title: 'Ticket 1',
          price: new Decimal(10.99),
          isActive: true,
        },
        {
          id: 'ticket-2',
          title: 'Ticket 2',
          price: new Decimal(20.99),
          isActive: true,
        },
      ];

      mockPrismaService.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await service.findAll();

      expect(prismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTickets);
    });
  });

  describe('findOne', () => {
    it('should return a ticket by id', async () => {
      const ticketId = 'ticket-id';
      const mockTicket = {
        id: ticketId,
        title: 'Test Ticket',
        price: new Decimal(10.99),
        isActive: true,
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.findOne(ticketId);

      expect(prismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: ticketId },
      });
      expect(result).toEqual(mockTicket);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      const ticketId = 'non-existent-id';

      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne(ticketId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(ticketId)).rejects.toThrow(
        `Ticket with ID ${ticketId} not found`,
      );
    });
  });

  describe('update', () => {
    it('should update a ticket', async () => {
      const ticketId = 'ticket-id';
      const updateTicketDto: UpdateTicketDto = {
        title: 'Updated Ticket',
        price: 15.99,
      };

      const existingTicket = {
        id: ticketId,
        title: 'Original Ticket',
        price: new Decimal(10.99),
        isActive: true,
      };

      const updatedTicket = {
        ...existingTicket,
        ...updateTicketDto,
        updatedAt: new Date(),
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.ticket.update.mockResolvedValue(updatedTicket);

      const result = await service.update(ticketId, updateTicketDto);

      expect(prismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: ticketId },
      });
      expect(prismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: ticketId },
        data: updateTicketDto,
      });
      expect(result).toEqual(updatedTicket);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      const ticketId = 'non-existent-id';
      const updateTicketDto: UpdateTicketDto = {
        title: 'Updated Ticket',
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.update(ticketId, updateTicketDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(ticketId, updateTicketDto)).rejects.toThrow(
        `Ticket with ID ${ticketId} not found`,
      );
      expect(prismaService.ticket.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a ticket', async () => {
      const ticketId = 'ticket-id';
      const existingTicket = {
        id: ticketId,
        title: 'Test Ticket',
        isActive: true,
      };

      const softDeletedTicket = {
        ...existingTicket,
        isActive: false,
        updatedAt: new Date(),
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.ticket.update.mockResolvedValue(softDeletedTicket);

      const result = await service.remove(ticketId);

      expect(prismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: ticketId },
      });
      expect(prismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: ticketId },
        data: { isActive: false },
      });
      expect(result).toEqual(softDeletedTicket);
    });

    it('should throw NotFoundException when ticket does not exist', async () => {
      const ticketId = 'non-existent-id';

      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.remove(ticketId)).rejects.toThrow(NotFoundException);
      await expect(service.remove(ticketId)).rejects.toThrow(
        `Ticket with ID ${ticketId} not found`,
      );
      expect(prismaService.ticket.update).not.toHaveBeenCalled();
    });
  });
});
