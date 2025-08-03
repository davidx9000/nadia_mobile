import * as ExpoLinking from 'expo-linking';
import { usePathname } from 'expo-router';

/**
 * Creates a dynamic redirect URL based on the current path and optional search parameters.
 * @param extraParams Optional query parameters to include in the redirect URL
 * @returns A full app URL with current pathname and query params
 */
const useDynamicRedirect = (extraParams?: Record<string, string>) => {
  const pathname = usePathname();
  const searchParams = new URLSearchParams(extraParams);
  const url = ExpoLinking.createURL(pathname + '?' + searchParams.toString());
  return url;
};

export default useDynamicRedirect;
