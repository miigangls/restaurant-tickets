import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeApp, cleanupDatabase } from './setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let ticketId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanupDatabase(prisma);

    // Use unique email to avoid conflicts in parallel tests
    const uniqueEmail = `user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

    // Register and login to get auth token
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: uniqueEmail,
      password: 'password123',
      name: 'Test User',
    });

    if (registerResponse.status !== 201) {
      throw new Error(`Failed to register user: ${JSON.stringify(registerResponse.body)}`);
    }

    authToken = registerResponse.body.access_token;

    if (!authToken) {
      throw new Error('No auth token received from registration');
    }

    // Create a ticket for orders
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Test Ticket',
        description: 'Test Description',
        price: new Decimal(10.0),
        stock: 100,
        isActive: true,
      },
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    await closeApp(app);
  });

  afterEach(async () => {
    // Only clean orders and payments, keep user and ticket
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();

    // Restore ticket stock and ensure ticket exists
    if (ticketId) {
      try {
        const existingTicket = await prisma.ticket.findUnique({
          where: { id: ticketId },
        });

        if (existingTicket) {
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { stock: 100, isActive: true },
          });
        } else {
          // Ticket doesn't exist, recreate it
          await prisma.ticket.create({
            data: {
              id: ticketId,
              title: 'Test Ticket',
              description: 'Test Description',
              price: new Decimal(10.0),
              stock: 100,
              isActive: true,
            },
          });
        }
      } catch (error) {
        // If update fails, try to recreate
        try {
          await prisma.ticket.create({
            data: {
              id: ticketId,
              title: 'Test Ticket',
              description: 'Test Description',
              price: new Decimal(10.0),
              stock: 100,
              isActive: true,
            },
          });
        } catch (createError) {
          // If create also fails (e.g., ID conflict), create without ID
          const newTicket = await prisma.ticket.create({
            data: {
              title: 'Test Ticket',
              description: 'Test Description',
              price: new Decimal(10.0),
              stock: 100,
              isActive: true,
            },
          });
          ticketId = newTicket.id;
        }
      }
    }
  });

  describe('/orders (POST)', () => {
    it('should create an order with valid items', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: 2,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.status).toBe('PENDING');
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].quantity).toBe(2);
          expect(res.body.subtotal).toBeDefined();
          expect(res.body.tax).toBeDefined();
          expect(res.body.total).toBeDefined();
        });
    });

    it('should calculate tax correctly (19%)', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const subtotal = parseFloat(response.body.subtotal);
      const tax = parseFloat(response.body.tax);
      const total = parseFloat(response.body.total);

      expect(tax).toBeCloseTo(subtotal * 0.19, 2);
      expect(total).toBeCloseTo(subtotal + tax, 2);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: 1,
            },
          ],
        })
        .expect(401);
    });

    it('should fail with non-existent ticket', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: 'non-existent-id',
              quantity: 1,
            },
          ],
        });

      // Should return 404 (NotFoundException) or 400 (BadRequestException)
      // depending on validation order - NotFoundException is thrown by findOne
      expect([400, 404]).toContain(response.status);
      expect(response.body.message).toBeDefined();
    });

    it('should fail with insufficient stock', async () => {
      // Update ticket stock to 5
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { stock: 5 },
      });

      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: 10, // More than available stock
            },
          ],
        })
        .expect(400);
    });

    it('should update stock after order creation', async () => {
      const initialStock = 100;
      const orderQuantity = 5;

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: orderQuantity,
            },
          ],
        })
        .expect(201);

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      expect(ticket.stock).toBe(initialStock - orderQuantity);
    });
  });

  describe('/orders/me (GET)', () => {
    it('should return user orders', async () => {
      // Create an order
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: 1,
            },
          ],
        });

      return request(app.getHttpServer())
        .get('/orders/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer()).get('/orders/me').expect(401);
    });
  });

  describe('/orders/:id (GET)', () => {
    it('should return an order by id', async () => {
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const orderId = orderResponse.body.id;
      expect(orderId).toBeDefined();

      return request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(orderId);
          expect(res.body.items).toBeDefined();
        });
    });

    it('should fail without authentication', async () => {
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              ticketId: ticketId,
              quantity: 1,
            },
          ],
        });

      const orderId = orderResponse.body.id;

      return request(app.getHttpServer()).get(`/orders/${orderId}`).expect(401);
    });
  });
});
