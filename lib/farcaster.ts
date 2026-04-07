import {
  getAccountAssociation,
  getAppDescription,
  getAppName,
  getBaseUrl,
  getButtonTitle,
  getPrimaryCategory,
  getSplashBackgroundColor,
  getTags,
} from "@/lib/env";

export function buildFrameEmbed() {
  const baseUrl = getBaseUrl();

  return {
    version: "next",
    imageUrl: `${baseUrl}/feed.svg`,
    button: {
      title: getButtonTitle(),
      action: {
        type: "launch_frame",
        name: getAppName(),
        url: baseUrl,
        splashImageUrl: `${baseUrl}/splash.svg`,
        splashBackgroundColor: getSplashBackgroundColor(),
      },
    },
  };
}

export function buildMiniAppManifest() {
  const baseUrl = getBaseUrl();
  const accountAssociation = getAccountAssociation();

  return {
    ...(accountAssociation ? { accountAssociation } : {}),
    frame: {
      version: "1",
      name: getAppName(),
      homeUrl: baseUrl,
      iconUrl: `${baseUrl}/icon.svg`,
      imageUrl: `${baseUrl}/feed.svg`,
      splashImageUrl: `${baseUrl}/splash.svg`,
      splashBackgroundColor: getSplashBackgroundColor(),
      buttonTitle: getButtonTitle(),
      description: getAppDescription(),
      primaryCategory: getPrimaryCategory(),
      tags: getTags(),
      screenshotUrls: [`${baseUrl}/feed.svg`],
      heroImageUrl: `${baseUrl}/feed.svg`,
      tagline: "Quick Auth login plus a protected miniapp action",
    },
  };
}
