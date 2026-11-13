const configuredBasePath = (process.env.DOCS_BASE_URL ?? "/").replace(
  /^\/+|\/+$/g,
  "",
);
const baseUrl = configuredBasePath ? `/${configuredBasePath}/` : "/";

const sidebars = {
  projectSidebar: [
    {
      type: "category",
      label: "Start here",
      items: ["introduction"],
    },
    {
      type: "category",
      label: "Product",
      items: [
        "product/vision",
        "product/overview",
        "product/goals-and-principles",
        "product/scope-and-boundaries",
        "product/initial-requirements",
      ],
    },
    {
      type: "category",
      label: "Architecture",
      items: [
        "architecture/current-architecture",
        "architecture/phase-1-database-design",
      ],
    },
    {
      type: "category",
      label: "Project & community",
      items: [
        "project/development-status",
        "deployment/deployment-model",
        "community/contributing",
        "community/community-standards",
        "brand/brand-and-design",
      ],
    },
    {
      type: "link",
      label: "Contributors",
      href: `${baseUrl}community/contributors`,
    },
  ],
} as const;

export default sidebars;
