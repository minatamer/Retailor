import Link from "next/link";
import { Icon } from "../../components/ui/icon";
import { Runway, StoreIllustration } from "./runway";
import { RUNWAY_LOOKS } from "./illustration";
import styles from "./landing.module.css";

const STEPS = [
  {
    number: "01",
    title: "Bring the clothes.",
    copy: "Upload clothing photos, or start with our fifteen-photo collection.",
  },
  {
    number: "02",
    title: "Review your draft.",
    copy: "AI gives your collection a starting point. You keep the final say on every detail.",
  },
  {
    number: "03",
    title: "Make it yours.",
    copy: "Choose a complete look, colour mood and typography with Tailor beside you.",
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
      "Clothing photos: jeans, tees, hoodies, dresses, formalwear, beachwear and more. Static JPEG, PNG or WebP, up to 4 MiB per image and 24 photos. Every garment needs a valid photograph. You can also start with fifteen original generated sample photos.",
  },
  {
    question: "Is the storefront really mine to customize?",
    answer:
      "Yes. Choose from three complete home/collection/product layouts, four colour moods and three type presets. Add a name, headline or your own hero photograph. Tailor guides the choices through visual chat cards; no typing is required. Your wordmark is ready by default, with an optional three-logo AI path after you choose colour and type.",
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
    <div className={styles.landing}>
      <a className={styles.skip} href="#hero-title">
        Skip to the store story
      </a>
      <header className={styles.header}>
        <a
          href="#hero-title"
          className={styles.wordmark}
          aria-label="Retailor home"
        >
          retailor <Icon name="sparkle" size={24} />
        </a>
        <nav aria-label="Retailor navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#storefronts">Storefronts</a>
          <a href="#owner-view">Owner view</a>
        </nav>
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
                Your clothing. A beautiful storefront. Make it yours with Tailor
                beside you.
              </span>
              <span className={styles.compactLead}>
                Clothing photos. Your store. With Tailor.
              </span>
            </p>
            <div className={styles.heroAction}>
              <Link className={styles.cta} href="/demo" prefetch={false}>
                Build my demo store <Icon name="arrow" />
              </Link>
              <p>No signup. No real payments.</p>
            </div>
          </div>
          <Runway />
          <a className={styles.heroNext} href="#how-it-works">
            A whole new chapter for your clothes{" "}
            <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section
          className={styles.story}
          id="how-it-works"
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
          aria-labelledby="family-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Three complete points of view</p>
            <h2 id="family-title">
              Different looks.
              <br />
              <em>All good choices.</em>
            </h2>
            <p>
              Each family dresses the whole store: home, collection and product
              detail. Your clothes stay yours.
            </p>
          </div>
          <div className={styles.familyGrid}>
            {RUNWAY_LOOKS.map((look) => (
              <article key={look.name}>
                <div className={styles.familyPreview}>
                  <StoreIllustration design={look.design} />
                </div>
                <div className={styles.familyCaption}>
                  <span>{look.label}</span>
                  <h3>{look.name}</h3>
                  <p>{look.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.caption}>
            Illustrative FORME collection. Three layouts, four colour moods,
            three type presets. Your real demo starts with your photos.
          </p>
        </section>

        <section
          className={styles.connected}
          id="owner-view"
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
          <div
            className={styles.ownerExample}
            aria-label="One illustrative jeans order, connected across views"
          >
            <div className={styles.ownerExampleTop}>
              <span>One demo order</span>
              <Icon name="bag" />
              <strong>Every view catches up.</strong>
            </div>
            <dl>
              <div>
                <dt>The store</dt>
                <dd>
                  $68<span>One pair of jeans</span>
                </dd>
              </div>
              <div>
                <dt>The order</dt>
                <dd>
                  $74<span>Includes $6 sample delivery</span>
                </dd>
              </div>
              <div>
                <dt>The stock</dt>
                <dd>
                  20 → 19<span>One unit, once</span>
                </dd>
              </div>
            </dl>
            <div className={styles.connectionLine} aria-hidden="true">
              <i />
              <span />
              <i />
              <span />
              <i />
            </div>
            <p>Illustrative amounts · No real payment or shipment</p>
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
              Make the look yours, find the right clothes, understand the
              numbers. One friendly companion across the whole demo.
            </p>
            <div className={styles.roles}>
              <span>Your styling guide</span>
              <span>Your shopping helper</span>
              <span>Your business companion</span>
            </div>
          </div>
          <div
            className={styles.chatExample}
            aria-label="Illustrative Tailor conversation"
          >
            <header>
              <span>
                <Icon name="sparkle" />
              </span>
              <div>
                <strong>Tailor</strong>
                <small>Let’s make it yours</small>
              </div>
            </header>
            <p className={styles.chatUser}>Show me the jeans.</p>
            <p className={styles.chatReply}>
              Here they are. I’ve filtered your collection for you.
              <span>
                Jeans × <Icon name="check" size={14} />
              </span>
            </p>
            <p className={styles.chatUser}>And my store’s look?</p>
            <p className={styles.chatReply}>
              Let’s find your point of view. Every choice comes with a real
              preview.<span>Layout · Colour · Typography</span>
            </p>
            <small className={styles.caption}>
              Example conversation. Your demo uses your actual catalogue.
            </small>
          </div>
        </section>

        <section
          className={styles.faq}
          id="questions"
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.eyebrow}>A few good questions</p>
            <h2 id="faq-title">
              Before you
              <br />
              <em>step inside.</em>
            </h2>
          </div>
          <div>
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
        <a className={styles.wordmark} href="#hero-title">
          retailor <Icon name="sparkle" />
        </a>
        <p>
          A clothing ecommerce demo. Fictional activity, beautifully connected.
        </p>
        <a href="#questions">
          About the demo <Icon name="arrow" size={14} />
        </a>
      </footer>
    </div>
  );
}
