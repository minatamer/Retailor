import Link from "next/link";
import Image from "next/image";
import { Icon } from "../../components/ui/icon";
import { Brand } from "../../components/ui/brand";
import { Runway } from "./runway";
import { StoreFamilies } from "./families";
import { OwnerLayoutExample } from "./owner-layout-example";
import { LandingNavigation, SectionNavigation } from "./section-navigation";
import styles from "./landing.module.css";

const CUSTOMER_JEANS = [
  { src: "/landing/jeans-indigo.webp", alt: "Indigo straight-leg denim jeans" },
  { src: "/landing/jeans-black.webp", alt: "Black wide-leg denim jeans" },
  { src: "/landing/jeans-light.webp", alt: "Light-wash wide-leg denim jeans" },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Bring the clothes.",
    copy: "Upload clothing photos, or try our sample collection with multiple views.",
  },
  {
    number: "02",
    title: "Review your draft.",
    copy: "AI gives your collection a starting point. You keep the final say on every detail.",
  },
  {
    number: "03",
    title: "Personalize your store.",
    copy: "Pick page layouts, colours and type with Tailor. Add your name and an optional logo.",
  },
  {
    number: "04",
    title: "Step inside.",
    copy: "Explore your store, try a demo order and see the business behind the clothes.",
  },
] as const;
const FAQ = [
  {
    question: "What can I bring?",
    answer:
      "Clothing photos: jeans, tees, hoodies, dresses, formalwear, beachwear and more. Static JPEG, PNG or WebP, up to 4 MiB per image and 24 photos. Every garment needs a valid photograph. You can also try nineteen original generated sample photos, with linked views of the same garment.",
  },
  {
    question: "How can I personalize my store?",
    answer:
      "Start with Studio, Pulse or Gallery, or mix layouts for Home, Collection and Product. Personalize colours, type, your store name, headline and hero photo with Tailor or the manual controls. Keep your wordmark or review an optional three-logo batch. You choose what to apply.",
  },
  {
    question: "What does the AI do?",
    answer:
      "It drafts your catalogue from the photographs you approve for processing. You review uncertain details instead of accepting invented fabric, care or fit claims. Tailor can also find clothes, explain charts, offer tours and prepare changes for review. The animated collection on this page is an illustration, not recognition of your photos.",
  },
  {
    question: "Can I actually shop and manage the store?",
    answer:
      "You can browse, choose sizes, fill a bag and place a simulated order. The dashboard and Tailor help manage photo-backed garments, stock, orders, returns, refunds and expenses. The same records connect each view. English and USD are the baseline; optional dated EUR conversion changes storefront display only.",
  },
  {
    question: "Are the sales and orders real?",
    answer:
      "They are fictional demo activity. Try healthy-profit, near-break-even or heavy-loss scenarios tied to your actual catalogue. No payment, carrier or Shopify connection runs, and no real customer information is needed.",
  },
  {
    question: "How long does my demo last?",
    answer:
      "Two hours from creation, with local recovery when you refresh. There is no signup or hosted merchant account. You can save a JSON report or reset your workspace. Reset cannot recall files you already saved or AI requests already sent. Browser close does not guarantee immediate physical deletion.",
  },
] as const;

export function Landing() {
  return (
    <LandingNavigation className={styles.landing}>
      <a className={styles.skip} href="#hero-title">
        Skip to the store story
      </a>
      <header className={styles.header}>
        <a
          href="#hero-title"
          className={styles.wordmark}
          aria-label="Retailor home"
        >
          <Brand />
        </a>
        <SectionNavigation />
        <Link className={styles.headerCta} href="/demo" prefetch={false}>
          Try demo <Icon name="arrow" size={16} />
        </Link>
      </header>
      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span />
              For the clothes you believe in
            </p>
            <h1 id="hero-title" tabIndex={-1}>
              <span>Bring your products.</span>
              <em>See your store.</em>
            </h1>
            <p className={styles.heroLead}>
              <span className={styles.fullLead}>
                Your clothing. A beautiful storefront. Personalize it with
                Tailor beside you.
              </span>
              <span className={styles.compactLead}>
                Your clothes. Your store. Personalize with Tailor.
              </span>
            </p>
            <div className={styles.heroAction}>
              <Link className={styles.cta} href="/demo" prefetch={false}>
                Build my demo store <Icon name="arrow" />
              </Link>
            </div>
          </div>
          <Runway />
          <a
            className={styles.heroNext}
            href="#how-it-works"
            aria-label="See how it works"
          >
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section
          className={styles.story}
          id="how-it-works"
          tabIndex={-1}
          aria-labelledby="how-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>The path to your next chapter</p>
            <h2 id="how-title">
              A little input.
              <br />
              <em>A lot of possibility.</em>
            </h2>
            <p>
              From your first photo to the first “that’s my store” moment. One
              calm, continuous flow.
            </p>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={styles.families}
          id="storefronts"
          tabIndex={-1}
          aria-labelledby="family-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Personalize your store</p>
            <h2 id="family-title">
              Your store.
              <br />
              <em>Your style.</em>
            </h2>
            <p>
              Compare three starting looks below. In your demo, personalize page
              layouts, colours, type and your store name with Tailor, then keep
              your wordmark or choose an optional logo.
            </p>
          </div>
          <StoreFamilies />
        </section>

        <section
          className={styles.connected}
          id="owner-view"
          tabIndex={-1}
          aria-labelledby="owner-title"
        >
          <div className={styles.connectedCopy}>
            <p className={styles.eyebrow}>
              Beautiful in front. Connected behind.
            </p>
            <h2 id="owner-title">
              The clothes.
              <br />
              <em>The whole picture.</em>
            </h2>
            <p>
              Try a demo order and watch the store, stock and dashboard agree.
              Follow a chart point to the exact record behind it.
            </p>
            <ul>
              <li>
                <Icon name="check" />
                Photo-backed products you can create and edit.
              </li>
              <li>
                <Icon name="check" />
                Interactive charts, orders, returns and expenses.
              </li>
              <li>
                <Icon name="check" />
                Three fictional profit-and-loss stories to explore.
              </li>
            </ul>
          </div>
          <div className={styles.faq} id="questions" tabIndex={-1}>
            {FAQ.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className={styles.tailor}
          id="meet-tailor"
          aria-labelledby="tailor-heading"
        >
          <div className={styles.tailorCopy}>
            <p className={styles.eyebrow}>
              <Icon name="sparkle" size={16} />
              Meet Tailor
            </p>
            <h2 id="tailor-heading">
              A good eye.
              <br />
              <em>A helping hand.</em>
            </h2>
            <p>
              Find the right clothes, personalize your store and understand the
              numbers. Tailor is here for customers and store owners, with help
              at every step.
            </p>
            <div className={styles.roles}>
              <span>Your personalization guide</span>
              <span>Your shopping helper</span>
              <span>Your business companion</span>
            </div>
          </div>
          <div className={styles.tailorExamples}>
            <article
              className={styles.chatExample}
              aria-labelledby="tailor-customer-heading"
            >
              <header>
                <span>
                  <Icon name="sparkle" />
                </span>
                <div>
                  <h3 id="tailor-customer-heading">For customers</h3>
                  <small>Tailor · Your shopping helper</small>
                </div>
              </header>
              <p className={styles.chatUser}>Show me the jeans.</p>
              <div className={styles.chatReply}>
                <p>Here they are. I’ve filtered the collection for you.</p>
                <div className={styles.chatProducts}>
                  {CUSTOMER_JEANS.map((jeans) => (
                    <Image
                      key={jeans.src}
                      src={jeans.src}
                      alt={jeans.alt}
                      width={216}
                      height={270}
                      loading="lazy"
                      unoptimized
                    />
                  ))}
                </div>
              </div>
            </article>
            <article
              className={styles.chatExample}
              aria-labelledby="tailor-owner-heading"
            >
              <header>
                <span>
                  <Icon name="sparkle" />
                </span>
                <div>
                  <h3 id="tailor-owner-heading">For store owners</h3>
                  <small>Tailor · Your styling and business companion</small>
                </div>
              </header>
              <p className={styles.chatUser}>Help me personalize my store.</p>
              <OwnerLayoutExample />
            </article>
            <small className={styles.caption}>
              Example conversations. Your demo uses your actual catalogue.
            </small>
          </div>
        </section>

        <section className={styles.closing}>
          <p className={styles.eyebrow}>Your next chapter is waiting</p>
          <h2>
            Good clothes deserve
            <br />
            <em>a great storefront.</em>
          </h2>
          <Link className={styles.cta} href="/demo" prefetch={false}>
            Build my demo store <Icon name="arrow" />
          </Link>
          <p>No signup. No real payments. Just possibility.</p>
        </section>
      </main>
      <footer className={styles.footer}>
        <a
          className={styles.wordmark}
          href="#hero-title"
          aria-label="Retailor home"
        >
          <Brand />
        </a>
      </footer>
    </LandingNavigation>
  );
}
