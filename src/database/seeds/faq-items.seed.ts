import { DataSource } from 'typeorm';

/**
 * Real, SEO-meaningful FAQ content for the public /faq page (its own JSON-LD FAQPage schema
 * markup already exists — see the frontend's app/(marketing)/faq/page.tsx — this is what fills
 * it with something search engines and AI answer engines can actually index instead of an empty
 * list). Montenegrin only: `faq_items` has no locale column (see
 * src/modules/faq-items/entities/faq-item.entity.ts) — unlike categories, which resolve their
 * display label from the frontend's own message files per locale, FAQ answers are the same raw
 * text for every viewer regardless of `next-intl` locale. Montenegrin was chosen to match this
 * app's actual home market and the marketing copy already live on the site; an English variant
 * would need a locale column added to this table first, not just a second seed pass.
 *
 * `category` is rendered verbatim as an `<h2>` heading on the FAQ page (FaqAccordion groups by
 * it), so these are real display strings, not internal slugs/enum keys.
 *
 * Every claim below is grounded in this app's actual behavior (checked against the relevant
 * modules, not invented): free/0%-commission (no fee-charging code anywhere), an account is
 * required to file a repair request (ReportFaultCta / the /report → /dashboard/requests/new
 * redirect — the old anonymous form is gone), one review per completed request with exactly one
 * provider response (reviews module), off-platform payment (no payment/checkout module exists),
 * and the live category/city lists (categories.seed.ts, cities.seed.ts).
 */
interface FaqItemSeed {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

const FAQ_ITEMS: FaqItemSeed[] = [
  {
    category: 'Za korisnike',
    sortOrder: 0,
    question: 'Šta je Popravi Me?',
    answer:
      'Popravi Me je besplatna platforma koja povezuje ljude u Crnoj Gori sa provjerenim serviserima za popravku uređaja — od mobilnih telefona, računara i bijele tehnike, do klimatizacije, vodoinstalacija i automobila. Prijavite kvar jednom, a serviseri u vašoj blizini vam šalju ponude sa cijenom i rokom izrade, bez posrednika.',
  },
  {
    category: 'Za korisnike',
    sortOrder: 1,
    question: 'Kako da prijavim kvar?',
    answer:
      'Kreirajte besplatan nalog, opišite problem, po želji dodajte fotografiju uređaja, i izaberite svoj grad i kategoriju kvara. Prijava zatim postaje vidljiva serviserima koji rade u toj kategoriji i tom gradu, a vi upoređujete ponude koje stignu i birate onu koja vam najviše odgovara.',
  },
  {
    category: 'Za korisnike',
    sortOrder: 2,
    question: 'Da li moram imati nalog da bih prijavio kvar?',
    answer:
      'Da. Prijava kvara zahtijeva besplatnu registraciju — nalog vam omogućava da pratite status prijave, upoređujete pristigle ponude i komunicirate sa izabranim serviserom direktno kroz platformu, bez potrebe da ostavljate kontakt podatke na više mjesta.',
  },
  {
    category: 'Za korisnike',
    sortOrder: 3,
    question: 'Koliko brzo ću dobiti ponudu od servisera?',
    answer:
      'Zavisi od kategorije i grada, ali serviseri najčešće odgovaraju u roku od nekoliko sati od objave prijave. Za kvarove koji ne trpe odlaganje, prijavu možete označiti kao hitnu kako bi bila istaknutija serviserima u vašoj blizini.',
  },
  {
    category: 'Za korisnike',
    sortOrder: 4,
    question: 'Koje vrste kvarova mogu prijaviti?',
    answer:
      'Preko 24 kategorije — mobilni telefoni, računari, TV i monitori, bijela tehnika, klimatizacija i grijanje, audio oprema, kamere, kućni aparati, vodoinstalacije, električni radovi, stolarija, krovopokrivački radovi, bravarija, kao i sve vezano za automobile (mehanika, elektronika, gume, limarija, auto klima). Kompletnu listu kategorija pronaći ćete na početnoj strani.',
  },
  {
    category: 'Za servisere',
    sortOrder: 0,
    question: 'Kako moj servis može da se pridruži platformi Popravi Me?',
    answer:
      'Registrujte se kao serviser, kreirajte profil svoje firme sa adresom, kategorijama usluga koje pružate i radnim vremenom, i odmah počinjete da primate prijave kvarova iz vašeg grada i vaših kategorija.',
  },
  {
    category: 'Za servisere',
    sortOrder: 1,
    question: 'Mogu li birati koje prijave da prihvatim?',
    answer:
      'Da. Vidite sve otvorene prijave iz kategorija i gradova koje ste izabrali u svom profilu i sami odlučujete na koje ćete odgovoriti ponudom sa cijenom, rokom izrade i tipom dijelova (originalni ili zamjenski).',
  },
  {
    category: 'Za servisere',
    sortOrder: 2,
    question: 'Kako se serviseri verifikuju na platformi?',
    answer:
      'Serviser može podnijeti zahtjev za verifikaciju uz dokumentaciju o registrovanoj djelatnosti. Verifikovani serviseri dobijaju oznaku povjerenja na svom profilu, što klijentima olakšava izbor pouzdanog izvođača.',
  },
  {
    category: 'Cijene i plaćanje',
    sortOrder: 0,
    question: 'Da li je prijava kvara besplatna za korisnike?',
    answer:
      'Da, u potpunosti je besplatna — nema nikakve naknade za prijavu kvara, pregled ponuda niti komunikaciju sa serviserom kroz platformu.',
  },
  {
    category: 'Cijene i plaćanje',
    sortOrder: 1,
    question: 'Da li Popravi Me naplaćuje proviziju serviserima?',
    answer:
      'Ne — 0% provizije na svaki posao. Popravi Me ne učestvuje u finansijskoj transakciji: cijenu i način plaćanja dogovarate direktno sa serviserom, a plaćanje se vrši van platforme, najčešće nakon završene popravke.',
  },
  {
    category: 'Povjerenje i sigurnost',
    sortOrder: 0,
    question: 'Da li mogu ostaviti recenziju serviseru?',
    answer:
      'Da. Nakon što je popravka označena kao završena, možete ostaviti ocjenu od 1 do 5 i komentar o iskustvu. Serviser može jednom odgovoriti na vašu recenziju, a recenzija ostaje javno vidljiva na njegovom profilu.',
  },
  {
    category: 'Povjerenje i sigurnost',
    sortOrder: 1,
    question: 'Da li su moji kontakt podaci sigurni?',
    answer:
      'Vaši kontakt podaci se dijele samo sa serviserom čiju ponudu prihvatite, isključivo radi dogovora oko popravke. Popravi Me ne prodaje niti dijeli vaše podatke sa trećim stranama u marketinške svrhe.',
  },
  {
    category: 'Povjerenje i sigurnost',
    sortOrder: 2,
    question: 'U kojim gradovima je Popravi Me dostupan?',
    answer:
      'Platforma pokriva cijelu Crnu Goru — od Podgorice, Nikšića i Budve, preko Bara, Kotora, Herceg Novog i Tivta, do Bijelog Polja i Pljevalja — a broj servisera se stalno povećava i u drugim gradovima.',
  },
];

/** Idempotent by `question` text (the table has no unique column to key an `ON CONFLICT` on —
 * see the entity/migration) so re-running `seed:run` in an environment that already has these
 * rows doesn't duplicate them; it also won't touch rows an admin has since edited through the
 * `/faq-items` CRUD endpoints, since those keep their original question text. */
export async function SeedFaqItems(dataSource: DataSource): Promise<void> {
  for (const item of FAQ_ITEMS) {
    await dataSource.query(
      `INSERT INTO "faq_items" ("question", "answer", "category", "sort_order")
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (SELECT 1 FROM "faq_items" WHERE "question" = $1)`,
      [item.question, item.answer, item.category, item.sortOrder],
    );
  }
}
