import 'urlpattern-polyfill';

import { deepFreeze } from './utils.js';

import type {
  Method,
  Handle,
  Routes,
  RouterMethod,
  RouterOptions,
  HandleResponse,
  HandleResolve,
  HandleProps,
  Platform,
} from './types.js';

/**
 * Router class
 */
export class Router<P = Platform> {
  #onError: Exclude<RouterOptions<P>['onError'], undefined>;
  #onNoMatch: Exclude<RouterOptions<P>['onNoMatch'], undefined>;
  #routes: Map<Method, Routes<P>>;
  #autoHead = true;
  #order = 0;

  /** Attach a route handle for all HTTP methods */
  all!: RouterMethod<P>;
  /** Attach a `CONNECT` HTTP method handle */
  connect!: RouterMethod<P>;
  /** Attach a `DELETE` HTTP method handle */
  delete!: RouterMethod<P>;
  /** Attach a `GET` HTTP method handle */
  get!: RouterMethod<P>;
  /** Attach a `HEAD` HTTP method handle */
  head!: RouterMethod<P>;
  /** Attach a `OPTIONS` HTTP method handle */
  options!: RouterMethod<P>;
  /** Attach a `PATCH` HTTP method handle */
  patch!: RouterMethod<P>;
  /** Attach a `POST` HTTP method handle */
  post!: RouterMethod<P>;
  /** Attach a `PUT` HTTP method handle */
  put!: RouterMethod<P>;
  /** Attach a `TRACE` HTTP method handle */
  trace!: RouterMethod<P>;

  /**
   * Create a new Router
   * @param options {@link RouterOptions} {@link Platform}
   */
  constructor(options: RouterOptions<P> = {}) {
    // Setup default response handles
    this.#onError =
      options.onError ?? (() => new Response(null, { status: 500 }));
    this.#onNoMatch =
      options.onNoMatch ?? (() => new Response(null, { status: 404 }));
    this.#autoHead = options.autoHead ?? true;
    // Setup route map
    this.#routes = new Map();
    // Bind router methods
    for (const method of METHODS) {
      this.#routes.set(method as Method, []);
      const key = method.toLowerCase() as Lowercase<Method>;
      this[key] = this.#add.bind(this, method);
    }
  }

  /**
   * Set the fallback handle for when an error is thrown in a route handle
   */
  set onError(handle: Exclude<RouterOptions<P>['onError'], undefined>) {
    this.#onError = handle;
  }

  /**
   * Set the fallback handle for when no matching handles are found for a request
   */
  set onNoMatch(handle: Exclude<RouterOptions<P>['onNoMatch'], undefined>) {
    this.#onNoMatch = handle;
  }

  #add(method: Method, pattern: URLPatternInit, ...handle: Array<Handle<P>>) {
    this.use(handle, method, pattern);
  }

  async #head(handle: Handle<P>, props: HandleProps<P>) {
    const { request } = props;
    const { response } = await this.resolve(request, handle(props));
    if (response) {
      return { request, response: new Response(null, response) };
    }
    return { request };
  }

  /**
   * Resolve and unwrap a handle response
   * @param request   The request
   * @param response  The handle response {@link HandleResponse}
   * @returns The resolved request and response {@link HandleResolve}
   */
  async resolve(
    request: Request,
    response: HandleResponse,
  ): Promise<HandleResolve> {
    // Final return object
    const resolved: HandleResolve = { request };
    // Resolve handle
    const maybe = await Promise.resolve(response);
    // Handle had no impact
    if (maybe === undefined) {
      return resolved;
    }
    // Handle reset or modified response only
    if (maybe === null || maybe instanceof Response) {
      resolved.response = maybe;
      return resolved;
    }
    // Handle modified request
    if (maybe.request instanceof Request) {
      resolved.request = maybe.request;
    }
    // Resolve response
    maybe.response = await Promise.resolve(maybe.response);
    // Handle modified response
    if (maybe.response instanceof Response) {
      resolved.response = maybe.response;
    }
    // Handle reset response
    else if (maybe.response === null) {
      resolved.response = undefined;
    }
    return resolved;
  }

  /**
   * Attach a route handle to match an HTTP method and URL pattern
   * @param handle  Callback handle(s)
   * @param method  HTTP method
   * @param input   `URLPattern` input
   */
  use(
    handle: Handle<P> | Array<Handle<P>>,
    method?: Method,
    input: URLPatternInit = {},
  ): void {
    let pattern: URLPattern;
    if (input instanceof URLPattern) {
      pattern = input;
    } else if (typeof input === 'string') {
      pattern = new URLPattern({ pathname: input });
    } else {
      pattern = new URLPattern(input);
    }
    if (Array.isArray(handle)) {
      for (const h of handle) {
        this.use(h, method, pattern);
      }
      return;
    }
    let order = this.#order++;
    // Ensure middleware is always first
    if (!method) {
      method = METHODS[0];
      order = Number.MIN_SAFE_INTEGER + order;
    }
    this.#routes.get(method)!.push({ order, handle, pattern });
    if (this.#autoHead && method === 'GET') {
      this.#routes.get('HEAD')!.push({
        order: this.#order++,
        handle: this.#head.bind(this, handle),
        pattern,
      });
    }
  }

  /**
   * Pass a request through all matching route handles and return a response
   * @param request   The `Request`
   * @param platform  Platform specific context {@link Platform}
   * @returns The final `Response`
   */
  async handle(request: Request, platform?: P): Promise<Response> {
    platform ??= {} as P;
    try {
      let response: Response | undefined;
      // Get all middleware and method specific routes in order
      const routes = [
        ...this.#routes.get(METHODS[0])!,
        ...this.#routes.get(request.method as Method)!,
      ].toSorted((a, b) => a.order - b.order);
      // Allow handles to skip remaing routes
      let stopped = false;
      const stopPropagation = () => {
        stopped = true;
      };
      // Pass request/response through each route
      for (const route of routes) {
        if (stopped) break;
        const match = route.pattern.exec(request.url);
        if (!match) continue;
        deepFreeze(match);
        const maybe = route.handle({
          request,
          response,
          match,
          platform,
          stopPropagation,
        });
        const { response: newResponse, request: newRequest } =
          await this.resolve(request, maybe);
        if (newRequest instanceof Request) {
          request = newRequest;
        }
        if (newResponse instanceof Response) {
          response = newResponse;
        } else if (newResponse === null) {
          response = undefined;
        }
      }
      return response ?? this.#onNoMatch(request, platform);
    } catch (err) {
      return this.#onError(err, request, platform);
    }
  }
}

const METHODS = [
  'ALL',
  'CONNECT',
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
  'TRACE',
] as const;
