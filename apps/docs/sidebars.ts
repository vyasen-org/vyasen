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
        "product/principles",
        "product/scope",
        "product/product-requirements",
      ],
    },
    {
      type: "category",
      label: "Architecture",
      items: [
        "architecture/current-architecture",
        "architecture/identity-and-authentication",
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
