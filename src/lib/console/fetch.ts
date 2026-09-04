/**
 * A fetch that honours the sandbox's proxy env vars. In normal deployments Node reaches the
 * console directly; behind an egress proxy it must be told, which Node 24 does when
 * NODE_USE_ENV_PROXY=1. This wrapper is the single outbound call site for console requests.
 */
export const proxiedFetch: typeof fetch = (input, init) => fetch(input, init);
