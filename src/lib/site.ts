export const SITE_URL = "https://readme.hackclub.com";

export const SITE_NAME = "README";

export const SITE_DESCRIPTION =
  "README is a fun, concise guide for new Hack Clubbers covering what it means to be a hacker, the culture at Hack Club, how the programs work, how to use the Slack, and how to get started with hacking in general.";

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).href;
}

export const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  "@id": "https://hackclub.com/#organization",
  name: "Hack Club",
  description:
    "Hack Club is the world's largest nonprofit movement of teenagers making cool projects.",
  url: "https://hackclub.com",
  logo: "https://assets.hackclub.com/flag-standalone.png",
  sameAs: [
    "https://twitter.com/hackclub",
    "https://github.com/hackclub",
    "https://www.youtube.com/c/HackClubHQ",
    "https://www.instagram.com/starthackclub",
    "https://en.wikipedia.org/wiki/Hack_Club",
    "https://www.wikidata.org/wiki/Q98127305",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "212 Battery St",
    addressLocality: "Burlington",
    addressRegion: "VT",
    postalCode: "05401",
    addressCountry: "US",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "general inquiries",
    email: "team@hackclub.com",
    telephone: "+1-855-625-4225",
    areaServed: "Worldwide",
    availableLanguage: "English",
  },
} as const;
