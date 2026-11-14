import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const organizationName = process.env.DOCS_GITHUB_ORG ?? "vyasen-org";
const projectName = process.env.DOCS_GITHUB_REPO ?? "vyasen";
const repositoryUrl = `https://github.com/${organizationName}/${projectName}`;
const configuredBasePath = (process.env.DOCS_BASE_URL ?? "/").replace(
  /^\/+|\/+$/g,
  "",
);
const baseUrl = configuredBasePath ? `/${configuredBasePath}/` : "/";

const config: Config = {
  title: process.env.DOCS_SITE_NAME ?? "Vyasen Project Hub",
  tagline: "The vision, architecture, and community behind Vyasen",
  favicon: "img/app-icon.jpg",
  url: process.env.DOCS_URL ?? "https://doc.vyasen.com",
  baseUrl,
  organizationName,
  projectName,
  deploymentBranch: "main",
  trailingSlash: false,
  onBrokenLinks: "throw",
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },
  themes: ["@docusaurus/theme-mermaid"],
  plugins: [
    path.join(siteDir, "plugins/github-project-data/index.ts"),
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        language: ["en"],
        docsRouteBasePath: "/docs",
        indexBlog: false,
        indexPages: true,
      },
    ],
  ],
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
          editUrl: `${repositoryUrl}/edit/develop/apps/docs/`,
          showLastUpdateTime: true,
        },
        blog: false,
        pages: {
          path: "src/pages",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      },
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Vyasen",
      logo: {
        alt: "Vyasen",
        src: "img/app-icon.jpg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "projectSidebar",
          position: "left",
          label: "Explore",
        },
        {
          to: "/community/contributors",
          label: "Contributors",
          position: "left",
        },
        {
          href: repositoryUrl,
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Explore",
          items: [
            { label: "Project overview", to: "/docs/introduction" },
            {
              label: "Development status",
              to: "/docs/project/development-status",
            },
          ],
        },
        {
          title: "Community",
          items: [
            { label: "Contributors", to: "/community/contributors" },
            { label: "Contributing", to: "/docs/community/contributing" },
            {
              label: "Code of conduct",
              href: `${repositoryUrl}/blob/develop/CODE_OF_CONDUCT.md`,
            },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "GitHub repository", href: repositoryUrl },
            {
              label: "Security policy",
              href: `${repositoryUrl}/blob/develop/SECURITY.md`,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Vyasen contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;
