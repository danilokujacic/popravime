import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { BuildDataSourceOptions } from '../../src/database/data-source-options';
import { City } from '../../src/modules/cities/entities/city.entity';
import { Category } from '../../src/modules/categories/entities/category.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { Provider } from '../../src/modules/providers/entities/provider.entity';
import { RepairRequest } from '../../src/modules/repair-requests/entities/repair-request.entity';
import { Offer } from '../../src/modules/offers/entities/offer.entity';
import { UserRole } from '../../src/modules/users/users.types';
import { VerificationStatus } from '../../src/modules/providers/providers.types';
import {
  RequestStatus,
  Urgency,
} from '../../src/modules/repair-requests/repair-requests.types';
import { OfferStatus, PartsType } from '../../src/modules/offers/offers.types';
import { Review } from '../../src/modules/reviews/entities/review.entity';
import { DirectInquiry } from '../../src/modules/direct-inquiries/entities/direct-inquiry.entity';
import { Message } from '../../src/modules/messages/entities/message.entity';
import { InquiryStatus } from '../../src/modules/direct-inquiries/direct-inquiries.types';

jest.setTimeout(180000);

describe('Database integration', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    dataSource = new DataSource(
      BuildDataSourceOptions({
        host: container.getHost(),
        port: container.getPort(),
        username: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
      }),
    );

    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  it('runs every migration cleanly against a real Postgres instance', async () => {
    const executed = await dataSource.query<{ name: string }[]>(
      'SELECT name FROM migrations',
    );
    expect(executed.length).toBeGreaterThanOrEqual(19);
  });

  it('round-trips a full repair-request lifecycle, including the circular accepted_offer_id FK', async () => {
    const cityRepo = dataSource.getRepository(City);
    const categoryRepo = dataSource.getRepository(Category);
    const userRepo = dataSource.getRepository(User);
    const providerRepo = dataSource.getRepository(Provider);
    const requestRepo = dataSource.getRepository(RepairRequest);
    const offerRepo = dataSource.getRepository(Offer);

    const city = await cityRepo.save(
      cityRepo.create({
        name: 'Podgorica',
        slug: 'podgorica-it',
        region: 'Central',
      }),
    );
    const category = await categoryRepo.save(
      categoryRepo.create({ name: 'Mobile phones', slug: 'mobile-phones-it' }),
    );
    const customer = await userRepo.save(
      userRepo.create({
        email: 'customer-it@popravime.me',
        passwordHash: 'hash',
        fullName: 'Customer',
        role: UserRole.Customer,
      }),
    );
    const owner = await userRepo.save(
      userRepo.create({
        email: 'owner-it@popravime.me',
        passwordHash: 'hash',
        fullName: 'Owner',
        role: UserRole.ProviderOwner,
      }),
    );
    const provider = await providerRepo.save(
      providerRepo.create({
        ownerUserId: owner.id,
        businessName: 'Test Repair',
        slug: 'test-repair-it',
        address: 'Address 1',
        cityId: city.id,
        verificationStatus: VerificationStatus.Pending,
      }),
    );

    const request = await requestRepo.save(
      requestRepo.create({
        customerId: customer.id,
        categoryId: category.id,
        description: 'Screen broken',
        photoUrls: [],
        cityId: city.id,
        urgency: Urgency.Standard,
        status: RequestStatus.Open,
      }),
    );

    const offer = await offerRepo.save(
      offerRepo.create({
        requestId: request.id,
        providerId: provider.id,
        priceMin: '1000',
        priceMax: '2000',
        estimatedDuration: '1 day',
        partsType: PartsType.Oem,
        status: OfferStatus.Pending,
      }),
    );

    request.status = RequestStatus.Accepted;
    request.acceptedOfferId = offer.id;
    await requestRepo.save(request);

    const reloadedRequest = await requestRepo.findOne({
      where: { id: request.id },
    });
    expect(reloadedRequest?.status).toBe(RequestStatus.Accepted);
    expect(reloadedRequest?.acceptedOfferId).toBe(offer.id);

    const reloadedOffer = await offerRepo.findOne({ where: { id: offer.id } });
    expect(reloadedOffer?.requestId).toBe(request.id);
    expect(reloadedOffer?.providerId).toBe(provider.id);
  });

  it('enforces the Phase 2 review, message, and inquiry constraints', async () => {
    const cityRepo = dataSource.getRepository(City);
    const categoryRepo = dataSource.getRepository(Category);
    const userRepo = dataSource.getRepository(User);
    const providerRepo = dataSource.getRepository(Provider);
    const requestRepo = dataSource.getRepository(RepairRequest);
    const reviewRepo = dataSource.getRepository(Review);
    const inquiryRepo = dataSource.getRepository(DirectInquiry);
    const messageRepo = dataSource.getRepository(Message);

    const city = await cityRepo.save(
      cityRepo.create({
        name: 'Niksic',
        slug: 'niksic-it2',
        region: 'Central',
      }),
    );
    const category = await categoryRepo.save(
      categoryRepo.create({ name: 'Laptops', slug: 'laptops-it2' }),
    );
    const customer = await userRepo.save(
      userRepo.create({
        email: 'customer-it2@popravime.me',
        passwordHash: 'hash',
        fullName: 'Customer Two',
        role: UserRole.Customer,
      }),
    );
    const owner = await userRepo.save(
      userRepo.create({
        email: 'owner-it2@popravime.me',
        passwordHash: 'hash',
        fullName: 'Owner Two',
        role: UserRole.ProviderOwner,
      }),
    );
    const provider = await providerRepo.save(
      providerRepo.create({
        ownerUserId: owner.id,
        businessName: 'Test Repair Two',
        slug: 'test-repair-it2',
        address: 'Address 2',
        cityId: city.id,
        verificationStatus: VerificationStatus.Pending,
      }),
    );
    const request = await requestRepo.save(
      requestRepo.create({
        customerId: customer.id,
        categoryId: category.id,
        description: 'Keyboard broken',
        photoUrls: [],
        cityId: city.id,
        urgency: Urgency.Standard,
        status: RequestStatus.Completed,
      }),
    );

    const review = await reviewRepo.save(
      reviewRepo.create({
        requestId: request.id,
        customerId: customer.id,
        providerId: provider.id,
        rating: 5,
        comment: 'Fast and reliable',
      }),
    );
    expect(review.id).toBeDefined();

    await expect(
      reviewRepo.save(
        reviewRepo.create({
          requestId: request.id,
          customerId: customer.id,
          providerId: provider.id,
          rating: 4,
          comment: 'Second review for the same request',
        }),
      ),
    ).rejects.toThrow();

    await expect(
      dataSource.query(
        `INSERT INTO "reviews" ("customer_id", "provider_id", "rating", "comment")
         VALUES ($1, $2, $3, $4)`,
        [customer.id, provider.id, 6, 'Out of range rating'],
      ),
    ).rejects.toThrow();

    const inquiry = await inquiryRepo.save(
      inquiryRepo.create({
        providerId: provider.id,
        customerId: customer.id,
        message: 'Do you repair laptops?',
        status: InquiryStatus.New,
      }),
    );
    expect(inquiry.id).toBeDefined();

    const requestMessage = await messageRepo.save(
      messageRepo.create({
        requestId: request.id,
        senderId: customer.id,
        body: 'When can you look at it?',
      }),
    );
    expect(requestMessage.id).toBeDefined();

    const inquiryMessage = await messageRepo.save(
      messageRepo.create({
        inquiryId: inquiry.id,
        senderId: owner.id,
        body: 'Yes, we do laptop repairs',
      }),
    );
    expect(inquiryMessage.id).toBeDefined();

    await expect(
      dataSource.query(
        `INSERT INTO "messages" ("request_id", "inquiry_id", "sender_id", "body")
         VALUES ($1, $2, $3, $4)`,
        [request.id, inquiry.id, customer.id, 'both set, should fail'],
      ),
    ).rejects.toThrow();

    await expect(
      dataSource.query(
        `INSERT INTO "messages" ("sender_id", "body") VALUES ($1, $2)`,
        [customer.id, 'neither set, should fail'],
      ),
    ).rejects.toThrow();
  });
});
