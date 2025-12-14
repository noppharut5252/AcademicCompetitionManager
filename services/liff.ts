// Wrapper for LINE LIFF SDK

const LIFF_ID = "2006490627-uva5V8Q6";

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  email?: string;
}

export const initLiff = async (): Promise<LiffProfile | null> => {
  try {
    // @ts-ignore
    await liff.init({ liffId: LIFF_ID });
    // @ts-ignore
    if (liff.isLoggedIn()) {
      // @ts-ignore
      const profile = await liff.getProfile();
      // @ts-ignore
      const email = liff.getDecodedIDToken()?.email;
      return { ...profile, email };
    }
    return null;
  } catch (error) {
    console.error("LIFF Initialization failed", error);
    return null;
  }
};

export const loginLiff = () => {
  // @ts-ignore
  if (!liff.isLoggedIn()) {
    // @ts-ignore
    liff.login();
  }
};

export const logoutLiff = () => {
  // @ts-ignore
  if (liff.isLoggedIn()) {
    // @ts-ignore
    liff.logout();
    window.location.reload();
  }
};