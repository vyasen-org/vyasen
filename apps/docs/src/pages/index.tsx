import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import Head from "@docusaurus/Head";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const repositoryUrl = `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}`;

  return (
    <Layout>
      <Head>
        <title>Project Hub | Vyasen</title>
        <meta
          name="description"
          content="Explore Vyasen's product vision, architecture, development status, and community."
        />
      </Head>
      <main className="hub-home">
        <section className="hub-hero">
          <p className="hub-eyebrow">The Vyasen Project</p>
          <h1>Education, connected around people and institutions.</h1>
          <p className="hub-lead">
            Vyasen is an open-source education platform in early development.
            This hub explains the vision, the boundaries we are designing
            around, what exists in the repository today, and how to take part.
          </p>
          <div className="hub-actions">
            <Link
              className="button button--primary button--lg"
              to="/docs/introduction"
            >
              Explore the project
            </Link>
            <Link
              className="button button--secondary button--lg"
              to={repositoryUrl}
            >
              View source on GitHub
            </Link>
          </div>
          <div className="hub-status" role="note">
            <span className="hub-status__dot" aria-hidden="true" />
            <span>
              Early development · scope and release priorities are evolving
            </span>
          </div>
        </section>

        <section className="hub-journeys" aria-labelledby="journeys-title">
          <div className="hub-section__heading">
            <div>
              <p className="hub-eyebrow">Find your path</p>
              <h2 id="journeys-title">What would you like to explore?</h2>
            </div>
          </div>
          <div className="journey-grid">
            <Link className="journey-card" to="/docs/product/vision">
              <span className="journey-card__number">01</span>
              <h3>Understand the vision</h3>
              <p>
                Discover the problem Vyasen wants to solve and the principles
                shaping it.
              </p>
              <span className="journey-card__link">
                Read the vision <span aria-hidden="true">→</span>
              </span>
            </Link>
            <Link
              className="journey-card"
              to="/docs/architecture/current-architecture"
            >
              <span className="journey-card__number">02</span>
              <h3>Explore the architecture</h3>
              <p>
                See what the repository implements today and what remains design
                work.
              </p>
              <span className="journey-card__link">
                View architecture <span aria-hidden="true">→</span>
              </span>
            </Link>
            <Link className="journey-card" to="/docs/community/contributing">
              <span className="journey-card__number">03</span>
              <h3>Get involved</h3>
              <p>
                Find contribution guidance and understand how to participate
                responsibly.
              </p>
              <span className="journey-card__link">
                Start contributing <span aria-hidden="true">→</span>
              </span>
            </Link>
          </div>
        </section>

        <section className="hub-principles" aria-labelledby="principles-title">
          <div>
            <p className="hub-eyebrow">A foundational idea</p>
            <h2 id="principles-title">
              One identity. Contextual relationships. Clear ownership.
            </h2>
          </div>
          <p>
            The product direction separates a person&apos;s global identity,
            their personal area, and each organization&apos;s workspace. This is
            a design principle—not a claim that every related workflow is
            already implemented.
          </p>
        </section>

        <section className="hub-cta">
          <div>
            <p className="hub-eyebrow">Open source</p>
            <h2>Help shape what comes next.</h2>
            <p>
              Browse current work, raise a thoughtful issue, or contribute a
              focused improvement.
            </p>
          </div>
          <div className="hub-actions">
            <Link
              className="button button--primary"
              to="/docs/project/development-status"
            >
              See project status
            </Link>
            <Link
              className="button button--secondary"
              to="/community/contributors"
            >
              Meet contributors
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
