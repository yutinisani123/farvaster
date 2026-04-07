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
    imageUrl: `${baseUrl}/hero.png`,
    button: {
      title: getButtonTitle(),
      action: {
        type: "launch_frame",
        name: getAppName(),
        url: baseUrl,
        splashImageUrl: `${baseUrl}/splash.png`,
        splashBackgroundColor: getSplashBackgroundColor(),
      },
    },
  };
}

export function buildMiniAppManifest() {
  const baseUrl = getBaseUrl();
  const accountAssociation = getAccountAssociation();
  const miniapp = {
    version: "1",
    name: getAppName(),
    homeUrl: baseUrl,
    iconUrl: `${baseUrl}/icon.png`,
    imageUrl: `${baseUrl}/hero.png`,
    splashImageUrl: `${baseUrl}/splash.png`,
    splashBackgroundColor: getSplashBackgroundColor(),
    buttonTitle: getButtonTitle(),
    description: getAppDescription(),
    primaryCategory: getPrimaryCategory(),
    tags: getTags(),
    screenshotUrls: [`${baseUrl}/screenshot-1.png`],
    heroImageUrl: `${baseUrl}/hero.png`,
    tagline: "Quick Auth miniapp login",
  };

  return {
    ...(accountAssociation ? { accountAssociation } : {}),
    miniapp,
    frame: miniapp,
  };
}
