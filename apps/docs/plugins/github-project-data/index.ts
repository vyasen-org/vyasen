import type { LoadContext, Plugin } from "@docusaurus/types";

interface GitHubRepository {
  full_name: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

interface GitHubContributor {
  login: string;
  html_url: string;
  avatar_url: string;
  contributions: number;
}

interface GitHubProjectData {
  repository: {
    name: string;
    url: string;
    stars: number;
    forks: number;
    openIssues: number;
  } | null;
  contributors: GitHubContributor[];
  contributorsAvailable: boolean;
  contributorsTruncated: boolean;
  fetchedAt: string;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isUrlOnHost(value: unknown, hostname: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname;
  } catch {
    return false;
  }
}

function parseRepository(value: unknown): GitHubRepository | null {
  if (
    !isRecord(value) ||
    typeof value.full_name !== "string" ||
    !isUrlOnHost(value.html_url, "github.com") ||
    !isCount(value.stargazers_count) ||
    !isCount(value.forks_count) ||
    !isCount(value.open_issues_count)
  ) {
    return null;
  }

  return {
    full_name: value.full_name,
    html_url: value.html_url,
    stargazers_count: value.stargazers_count,
    forks_count: value.forks_count,
    open_issues_count: value.open_issues_count,
  };
}

function parseContributors(value: unknown): GitHubContributor[] | null {
  if (!Array.isArray(value)) return null;

  const contributors = value.flatMap((entry): GitHubContributor[] => {
    if (
      !isRecord(entry) ||
      typeof entry.login !== "string" ||
      entry.login.length === 0 ||
      entry.login.length > 100 ||
      entry.login.trim() !== entry.login ||
      !isUrlOnHost(entry.html_url, "github.com") ||
      !isUrlOnHost(entry.avatar_url, "avatars.githubusercontent.com") ||
      !isCount(entry.contributions)
    ) {
      return [];
    }

    return [
      {
        login: entry.login,
        html_url: entry.html_url,
        avatar_url: entry.avatar_url,
        contributions: entry.contributions,
      },
    ];
  });

  return value.length > 0 && contributors.length === 0 ? null : contributors;
}

function nextPage(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  for (const part of linkHeader.split(",")) {
    const [urlPart, relationPart] = part.trim().split(";");
    if (relationPart?.trim() === 'rel="next"') {
      return urlPart?.trim().replace(/^<|>$/g, "") ?? null;
    }
  }

  return null;
}

async function requestGitHub(url: string): Promise<Response> {
  if (!isUrlOnHost(url, "api.github.com")) {
    throw new Error("GitHub returned an invalid pagination URL.");
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Vyasen-Project-Hub",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      const reset = response.headers.get("x-ratelimit-reset");
      const resetTime = reset
        ? new Date(Number(reset) * 1_000).toLocaleString("en", {
            timeZone: "UTC",
            timeZoneName: "short",
          })
        : null;
      throw new Error(
        resetTime
          ? `GitHub rate limit reached. It resets at ${resetTime}.`
          : "GitHub rate limit reached. Try again later.",
      );
    }

    throw new Error(`GitHub returned HTTP ${response.status}.`);
  }

  return response;
}

async function fetchContributors(
  repositoryUrl: string,
): Promise<{ contributors: GitHubContributor[]; truncated: boolean }> {
  const contributors: GitHubContributor[] = [];
  let url: string | null = `${repositoryUrl}/contributors?per_page=100`;
  let pageCount = 0;

  while (url && pageCount < 20) {
    const response = await requestGitHub(url);
    const page: unknown = await response.json();
    const parsedPage = parseContributors(page);
    if (!parsedPage)
      throw new Error("GitHub returned an invalid contributors response.");

    contributors.push(...parsedPage);
    url = nextPage(response.headers.get("link"));
    pageCount += 1;
  }

  return { contributors, truncated: url !== null };
}

async function loadProjectData(
  repositoryUrl: string,
): Promise<GitHubProjectData> {
  const errors: string[] = [];
  let repository: GitHubProjectData["repository"] = null;
  let contributors: GitHubContributor[] = [];
  let contributorsAvailable = false;
  let contributorsTruncated = false;

  const [repositoryResult, contributorResult] = await Promise.allSettled([
    requestGitHub(repositoryUrl).then((response) => response.json()),
    fetchContributors(repositoryUrl),
  ]);

  if (repositoryResult.status === "fulfilled") {
    const parsedRepository = parseRepository(repositoryResult.value);
    if (parsedRepository) {
      repository = {
        name: parsedRepository.full_name,
        url: parsedRepository.html_url,
        stars: parsedRepository.stargazers_count,
        forks: parsedRepository.forks_count,
        openIssues: parsedRepository.open_issues_count,
      };
    } else {
      errors.push("GitHub returned an invalid repository response.");
    }
  } else {
    errors.push(
      repositoryResult.reason instanceof Error
        ? repositoryResult.reason.message
        : "Repository information is temporarily unavailable.",
    );
  }

  if (contributorResult.status === "fulfilled") {
    contributors = contributorResult.value.contributors;
    contributorsTruncated = contributorResult.value.truncated;
    contributorsAvailable = true;
  } else {
    errors.push(
      contributorResult.reason instanceof Error
        ? contributorResult.reason.message
        : "Contributor information is temporarily unavailable.",
    );
  }

  return {
    repository,
    contributors,
    contributorsAvailable,
    contributorsTruncated,
    fetchedAt: new Date().toISOString(),
    errors,
  };
}

export default function githubProjectDataPlugin(
  context: LoadContext,
): Plugin<GitHubProjectData> {
  const organizationName = context.siteConfig.organizationName ?? "vyasen-org";
  const projectName = context.siteConfig.projectName ?? "vyasen";
  const repositoryUrl = `https://api.github.com/repos/${encodeURIComponent(organizationName)}/${encodeURIComponent(projectName)}`;

  return {
    name: "github-project-data",
    async loadContent() {
      try {
        return await loadProjectData(repositoryUrl);
      } catch {
        console.warn(
          "[github-project-data] GitHub data is temporarily unavailable.",
        );
        return {
          repository: null,
          contributors: [],
          contributorsAvailable: false,
          contributorsTruncated: false,
          fetchedAt: new Date().toISOString(),
          errors: ["GitHub data is temporarily unavailable."],
        };
      }
    },
    async contentLoaded({ content, actions }) {
      if (content.errors.length > 0) {
        console.warn(`[github-project-data] ${content.errors.join(" ")}`);
      }

      const dataPath = await actions.createData(
        "github-project-data.json",
        JSON.stringify(content),
      );

      actions.addRoute({
        path: "/community/contributors",
        component: "@site/src/components/ContributorsPage/index.tsx",
        modules: { projectData: dataPath },
      });
    },
  };
}
