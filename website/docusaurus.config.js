// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Ionio - Smart contract language',
  tagline: 'Easily write and interact with Simplicity smart contracts for the Elements blockchain',
  url: 'https://ionio-lang.org',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.png',
  organizationName: 'ionio-lang', // Usually your GitHub org/user name.
  projectName: 'ionio', // Usually your repo name.

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/ionio-lang/ionio/tree/main/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Ionio Language',
        logo: {
          alt: 'Ionio Logo',
          src: 'img/logo.svg',
          target: '_self',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Docs',
          },
          { to: 'blog', label: 'Blog', position: 'left'}, // or position: 'right'
          {
            href: 'https://github.com/ionio-lang/ionio',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/ionio-lang',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/ionio-lang',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/ionio-lang/ionio',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Vulpem Ventures OU. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer/themes/nightOwlLight'),
        darkTheme: require('prism-react-renderer/themes/nightOwl'),
      },
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
    }),
};

module.exports = config;
