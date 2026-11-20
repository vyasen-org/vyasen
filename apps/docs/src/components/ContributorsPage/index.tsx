import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

interface Contributor {
  login: string;
  html_url: string;
  avatar_url: string;
  contributions: number;
}

interface ProjectData {
  repository: {
    name: string;
    url: string;
    stars: number;
    forks: number;
    openIssues: number;
  } | null;
  contributors: Contributor[];
  contributorsAvailable: boolean;
  contributorsTruncated: boolean;
  fetchedAt: string;
  errors: string[];
}

interface ContributorsPageProps {
  projectData: ProjectData;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}): ReactNode {
  return (
    <div className="project-stat">
      <span className="project-stat__value">{value}</span>
      <span className="project-stat__label">{label}</span>
    </div>
  );
}

export default function ContributorsPage({
  projectData,
}: ContributorsPageProps): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const repositoryUrl =
    projectData.repository?.url ??
    `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}`;
  const formattedDate = new Date(projectData.fetchedAt).toLocaleString(
    undefined,
    { dateStyle: "medium", timeStyle: "short" },
  );

  return (
    <Layout>
      <Head>
        <title>Contributors | Vyasen</title>
        <meta
          name="description"
          content="Meet the people helping build Vyasen."
        />
      </Head>
      <main className="hub-page hub-page--narrow">
        <p className="hub-eyebrow">Community</p>
        <h1>Built in the open, together.</h1>
        <p className="hub-lead">
          This page recognizes GitHub accounts attributed to public repository
          activity. The counts come from GitHub and are not a complete measure
          of a person&apos;s contribution or impact.
        </p>

        {projectData.repository ? (
          <section aria-label="Public repository statistics">
            <div className="project-stats">
              <Stat label="Stars" value={projectData.repository.stars} />
              <Stat label="Forks" value={projectData.repository.forks} />
              <Stat
                label="Open issues and PRs"
                value={projectData.repository.openIssues}
              />
            </div>
            <p className="hub-data-note">
              Public repository data for{" "}
              <a href={projectData.repository.url}>
                {projectData.repository.name}
              </a>
              . Build snapshot updated {formattedDate}.
            </p>
          </section>
        ) : (
          <p className="hub-notice" role="status">
            Repository statistics are temporarily unavailable. Visit the{" "}
            <a href={repositoryUrl}>Vyasen repository</a> for current
            information.
          </p>
        )}
        {projectData.contributorsTruncated && (
          <p className="hub-data-note">
            This build lists the first 2,000 contributor accounts returned by
            GitHub.
          </p>
        )}

        <section className="hub-section" aria-labelledby="contributors-title">
          <div className="hub-section__heading">
            <div>
              <p className="hub-eyebrow">Recognition</p>
              <h2 id="contributors-title">Contributors</h2>
            </div>
            <a href={`${repositoryUrl}/graphs/contributors`}>
              View GitHub graph
            </a>
          </div>

          {projectData.contributorsAvailable &&
          projectData.contributors.length > 0 ? (
            <ul className="contributor-grid">
              {projectData.contributors.map((contributor) => (
                <li className="contributor-card" key={contributor.login}>
                  <img
                    className="contributor-card__avatar"
                    src={contributor.avatar_url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    width={48}
                    height={48}
                  />
                  <div className="contributor-card__details">
                    <a
                      className="contributor-card__name"
                      href={contributor.html_url}
                      rel="noreferrer"
                    >
                      @{contributor.login}
                    </a>
                    <span>
                      {contributor.contributions.toLocaleString()} attributed
                      commits
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : projectData.contributorsAvailable ? (
            <p className="hub-notice">
              No public contributor data is available yet. You can still help by
              opening an issue or proposing a change.
            </p>
          ) : (
            <p className="hub-notice" role="status">
              Contributor data could not be loaded for this build. See the{" "}
              <a href={`${repositoryUrl}/graphs/contributors`}>
                GitHub contributor graph
              </a>{" "}
              for the latest public data.
            </p>
          )}
        </section>

        <p className="hub-data-note">
          GitHub commit attribution can be incomplete and may change over time.
          It does not include every kind of project work.
        </p>
      </main>
    </Layout>
  );
}
