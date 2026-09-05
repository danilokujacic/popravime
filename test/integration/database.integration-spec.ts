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
import { ProviderRepository } from '../../src/modules/providers/repositories/provider.repository';
import { ProviderCategoryRepository } from '../../src/modules/providers/repositories/provider-category.repository';
import { ProviderCategory } from '../../src/modules/providers/entities/provider-category.entity';
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
    await dataSource.runMigrations({ transaction: 'each' });
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

  it('only lists verified providers through the public directory', async () => {
    const cityRepo = dataSource.getRepository(City);
    const userRepo = dataSource.getRepository(User);
    const providerRepo = dataSource.getRepository(Provider);
    const providerRepository = new ProviderRepository(providerRepo);

    const city = await cityRepo.save(
      cityRepo.create({ name: 'Bar', slug: 'bar-it3', region: 'Coastal' }),
    );

    async function CreateOwnerWithProvider(
      email: string,
      businessName: string,
      slug: string,
      verificationStatus: VerificationStatus,
    ): Promise<void> {
      const owner = await userRepo.save(
        userRepo.create({
          email,
          passwordHash: 'hash',
          fullName: businessName,
          role: UserRole.ProviderOwner,
        }),
      );
      await providerRepo.save(
        providerRepo.create({
          ownerUserId: owner.id,
          businessName,
          slug,
          address: 'Address',
          cityId: city.id,
          verificationStatus,
        }),
      );
    }

    await CreateOwnerWithProvider(
      'pending-owner-it3@popravime.me',
      'Pending Repair',
      'pending-repair-it3',
      VerificationStatus.Pending,
    );
    await CreateOwnerWithProvider(
      'verified-owner-it3@popravime.me',
      'Verified Repair',
      'verified-repair-it3',
      VerificationStatus.Verified,
    );
    await CreateOwnerWithProvider(
      'rejected-owner-it3@popravime.me',
      'Rejected Repair',
      'rejected-repair-it3',
      VerificationStatus.Rejected,
    );

    const result = await providerRepository.List({ cityId: city.id }, 1, 10);

    expect(result.items.map((item) => item.businessName)).toEqual([
      'Verified Repair',
    ]);
  });

  it('only counts a provider owner’s verified providers toward their serviced categories', async () => {
    const cityRepo = dataSource.getRepository(City);
    const categoryRepo = dataSource.getRepository(Category);
    const userRepo = dataSource.getRepository(User);
    const providerRepo = dataSource.getRepository(Provider);
    const providerCategoryRepo = dataSource.getRepository(ProviderCategory);
    const providerCategoryRepository = new ProviderCategoryRepository(
      providerCategoryRepo,
    );

    const city = await cityRepo.save(
      cityRepo.create({ name: 'Ulcinj', slug: 'ulcinj-it4', region: 'Coastal' }),
    );
    const pendingCategory = await categoryRepo.save(
      categoryRepo.create({ name: 'TVs', slug: 'tvs-it4' }),
    );
    const verifiedCategory = await categoryRepo.save(
      categoryRepo.create({ name: 'Washing machines', slug: 'washers-it4' }),
    );

    const soleOwnerPending = await userRepo.save(
      userRepo.create({
        email: 'sole-pending-owner-it4@popravime.me',
        passwordHash: 'hash',
        fullName: 'Sole Pending Owner',
        role: UserRole.ProviderOwner,
      }),
    );
    const solePendingProvider = await providerRepo.save(
      providerRepo.create({
        ownerUserId: soleOwnerPending.id,
        businessName: 'Sole Pending Repair',
        slug: 'sole-pending-repair-it4',
        address: 'Address',
        cityId: city.id,
        verificationStatus: VerificationStatus.Pending,
      }),
    );
    await providerCategoryRepo.save(
      providerCategoryRepo.create({
        providerId: solePendingProvider.id,
        categoryId: pendingCategory.id,
      }),
    );

    const soleOwnerVerified = await userRepo.save(
      userRepo.create({
        email: 'sole-verified-owner-it4@popravime.me',
        passwordHash: 'hash',
        fullName: 'Sole Verified Owner',
        role: UserRole.ProviderOwner,
      }),
    );
    const soleVerifiedProvider = await providerRepo.save(
      providerRepo.create({
        ownerUserId: soleOwnerVerified.id,
        businessName: 'Sole Verified Repair',
        slug: 'sole-verified-repair-it4',
        address: 'Address',
        cityId: city.id,
        verificationStatus: VerificationStatus.Verified,
      }),
    );
    await providerCategoryRepo.save(
      providerCategoryRepo.create({
        providerId: soleVerifiedProvider.id,
        categoryId: verifiedCategory.id,
      }),
    );

    const solePendingCategories =
      await providerCategoryRepository.ListCategoryIdsForOwner(
        soleOwnerPending.id,
      );
    expect(solePendingCategories).toEqual([]);

    const soleVerifiedCategories =
      await providerCategoryRepository.ListCategoryIdsForOwner(
        soleOwnerVerified.id,
      );
    expect(soleVerifiedCategories).toEqual([verifiedCategory.id]);
  });

  it('rejects creating a second provider for an owner who already has one', async () => {
    const cityRepo = dataSource.getRepository(City);
    const userRepo = dataSource.getRepository(User);
    const providerRepo = dataSource.getRepository(Provider);

    const city = await cityRepo.save(
      cityRepo.create({ name: 'Herceg Novi', slug: 'hn-it5', region: 'Coastal' }),
    );
    const owner = await userRepo.save(
      userRepo.create({
        email: 'one-provider-owner-it5@popravime.me',
        passwordHash: 'hash',
        fullName: 'One Provider Owner',
        role: UserRole.ProviderOwner,
      }),
    );
    await providerRepo.save(
      providerRepo.create({
        ownerUserId: owner.id,
        businessName: 'First Repair',
        slug: 'first-repair-it5',
        address: 'Address',
        cityId: city.id,
      }),
    );

    await expect(
      providerRepo.save(
        providerRepo.create({
          ownerUserId: owner.id,
          businessName: 'Second Repair',
          slug: 'second-repair-it5',
          address: 'Address',
          cityId: city.id,
        }),
      ),
    ).rejects.toThrow();
  });
});
