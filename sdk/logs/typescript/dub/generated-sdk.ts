import { EventSourceParserStream } from 'eventsource-parser/stream'
import * as types from './components'

export class ExampleClient {
  private baseUrl: string
  token?: string
  constructor({ baseUrl = 'http://localhost:3000', token }) {
    this.baseUrl = baseUrl
    this.token = token
  }

  async fetch<T = any>({
    method,
    path,
    query,
    body,
    headers: customHeaders = {},
  }: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    path: string
    query?: Record<string, string | number | boolean | null | undefined>
    body?: T
    headers?: Record<string, string>
  }): Promise<Response> {
    const url = new URL(path, this.baseUrl)

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: this.token ? `Bearer ${this.token}` : '',
      ...customHeaders,
    }

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }

    return fetch(url.toString(), options)
  }

  /**
   * GET /links
   * Retrieve a list of links
   * Tags: Links
   */
  async getLinks({
    domain,
    tagId,
    tagIds,
    tagNames,
    search,
    userId,
    showArchived = false,
    sort = 'createdAt',
    page = 1,
    pageSize = 100,
  }: {
    domain?: string;
    tagId?: string;
    tagIds?: string | string[];
    tagNames?: string | string[];
    search?: string;
    userId?: string;
    showArchived?: boolean;
    sort?: 'createdAt' | 'clicks' | 'lastClicked';
    page?: number;
    pageSize?: number;
  }): Promise<Link[]> {
    const response = await this.fetch<Link[]>({
      method: 'GET',
      path: '/links',
      query: {
        domain,
        tagId,
        tagIds,
        tagNames,
        search,
        userId,
        showArchived,
        sort,
        page,
        pageSize,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  /**
   * POST /links
   * Create a new link
   * Tags: Links
   */
  async createLink(data: {
    url: string;
    domain?: string;
    key?: string;
    externalId?: string | null;
    prefix?: string;
    trackConversion?: boolean;
    archived?: boolean;
    publicStats?: boolean;
    tagIds?: string | string[];
    tagNames?: string | string[];
    comments?: string | null;
    expiresAt?: string | null;
    expiredUrl?: string | null;
    password?: string | null;
    proxy?: boolean;
    title?: string | null;
    description?: string | null;
    image?: string | null;
    video?: string | null;
    rewrite?: boolean;
    ios?: string | null;
    android?: string | null;
    geo?: types.linkGeoTargeting | null;
    doIndex?: boolean;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
    ref?: string | null;
    programId?: string | null;
    webhookIds?: string[] | null;
  }): Promise<types.Link> {
    const response = await this.fetch<types.Link>({
      method: 'POST',
      path: '/links',
      body: data,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<types.Link>;
  }

  // GET /links/count
  // Retrieves the number of links for the authenticated workspace.
  async getLinksCount({
    domain,
    tagId,
    tagIds,
    tagNames,
    search,
    userId,
    showArchived = false,
    withTags = false,
    groupBy,
  }: {
    domain?: string;
    tagId?: string; // Deprecated
    tagIds?: string | string[];
    tagNames?: string | string[];
    search?: string;
    userId?: string;
    showArchived?: boolean;
    withTags?: boolean; // Deprecated
    groupBy?: 'domain' | 'tagId' | 'userId';
  }): Promise<number> {
    const response = await this.fetch<number>({
      method: 'GET',
      path: '/links/count',
      query: {
        domain,
        tagId,
        tagIds,
        tagNames,
        search,
        userId,
        showArchived,
        withTags,
        groupBy,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  // GET /links/info
  // Retrieve the info for a link.
  async getLinkInfo({
    domain,
    key,
    linkId,
    externalId,
  }: {
    domain: string;
    key?: string;
    linkId?: string;
    externalId?: string;
  }): Promise<Link> {
    const query: Record<string, string | undefined> = {
      domain,
      key,
      linkId,
      externalId,
    };

    const response = await this.fetch<Link>({
      method: 'GET',
      path: '/links/info',
      query,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<Link>;
  }

  // DELETE /links/{linkId}
  // Method: DELETE
  // Tags: Links
  async deleteLink(linkId: string): Promise<{ id: string }> {
    const response = await this.fetch<{ id: string }>({
      method: 'DELETE',
      path: `/links/${encodeURIComponent(linkId)}`,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // PATCH /links/{linkId}
  // Tags: Links
  async updateLink(linkId: string, body: Partial<Omit<Link, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Link> {
    const response = await this.fetch<Link>({
      method: 'PATCH',
      path: `/links/${linkId}`,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<Link>;
  }

  // POST /links/bulk
  // Tags: Links
  async bulkCreateLinks(
    links: Array<{
      url: string;
      domain?: string;
      key?: string;
      externalId?: string | null;
      prefix?: string;
      trackConversion?: boolean;
      archived?: boolean;
      publicStats?: boolean;
      tagId?: string | null;
      tagIds?: string | string[];
      tagNames?: string | string[];
      comments?: string | null;
      expiresAt?: string | null;
      expiredUrl?: string | null;
      password?: string | null;
      proxy?: boolean;
      title?: string | null;
      description?: string | null;
      image?: string | null;
      video?: string | null;
      rewrite?: boolean;
      ios?: string | null;
      android?: string | null;
      geo?: types.linkGeoTargeting | null;
      doIndex?: boolean;
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      utm_term?: string | null;
      utm_content?: string | null;
      ref?: string | null;
      programId?: string | null;
      webhookIds?: string[] | null;
    }>
  ): Promise<types.linkSchema[]> {
    const response = await this.fetch<{
      links: types.linkSchema[];
    }>({
      method: 'POST',
      path: '/links/bulk',
      body: links,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    const data = await response.json();
    return data.links;
  }

  // DELETE /links/bulk
  // Tags: Links
  async bulkDeleteLinks(
    linkIds: string[]
  ): Promise<{ deletedCount: number }> {
    if (!linkIds || linkIds.length === 0 || linkIds.length > 100) {
      throw new ExampleError('Invalid linkIds', { status: 400 });
    }

    const response = await this.fetch<{ deletedCount: number }>({
      method: 'DELETE',
      path: '/links/bulk',
      query: { linkIds: linkIds.join(',') },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  // PATCH /links/bulk
  // Tags: Links
  async bulkUpdateLinks({
    linkIds,
    externalIds,
    data,
  }: {
    linkIds?: string[];
    externalIds?: string[];
    data: {
      url?: string;
      trackConversion?: boolean;
      archived?: boolean;
      publicStats?: boolean;
      tagId?: string | null;
      tagIds?: string | string[];
      tagNames?: string | string[];
      comments?: string | null;
      expiresAt?: string | null;
      expiredUrl?: string | null;
      password?: string | null;
      proxy?: boolean;
      title?: string | null;
      description?: string | null;
      image?: string | null;
      video?: string | null;
      rewrite?: boolean;
      ios?: string | null;
      android?: string | null;
      geo?: types.linkGeoTargeting;
      doIndex?: boolean;
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      utm_term?: string | null;
      utm_content?: string | null;
      ref?: string | null;
      programId?: string | null;
      webhookIds?: string[] | null;
    };
  }): Promise<types.linkSchema[]> {
    const response = await this.fetch<{
      linkIds?: string[];
      externalIds?: string[];
      data: {
        url?: string;
        trackConversion?: boolean;
        archived?: boolean;
        publicStats?: boolean;
        tagId?: string | null;
        tagIds?: string | string[];
        tagNames?: string | string[];
        comments?: string | null;
        expiresAt?: string | null;
        expiredUrl?: string | null;
        password?: string | null;
        proxy?: boolean;
        title?: string | null;
        description?: string | null;
        image?: string | null;
        video?: string | null;
        rewrite?: boolean;
        ios?: string | null;
        android?: string | null;
        geo?: types.linkGeoTargeting;
        doIndex?: boolean;
        utm_source?: string | null;
        utm_medium?: string | null;
        utm_campaign?: string | null;
        utm_term?: string | null;
        utm_content?: string | null;
        ref?: string | null;
        programId?: string | null;
        webhookIds?: string[] | null;
      };
    }>({
      method: 'PATCH',
      path: '/links/bulk',
      body: { linkIds, externalIds, data },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  

  // PUT /links/upsert
  // Tags: Links
  async upsertLink(data: {
    url: string;
    domain?: string;
    key?: string;
    externalId?: string | null;
    prefix?: string;
    trackConversion?: boolean;
    archived?: boolean;
    publicStats?: boolean;
    tagId?: string | null;
    tagIds?: string | string[];
    tagNames?: string | string[];
    comments?: string | null;
    expiresAt?: string | null;
    expiredUrl?: string | null;
    password?: string | null;
    proxy?: boolean;
    title?: string | null;
    description?: string | null;
    image?: string | null;
    video?: string | null;
    rewrite?: boolean;
    ios?: string | null;
    android?: string | null;
    geo?: types.linkGeoTargeting | null;
    doIndex?: boolean;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
    ref?: string | null;
    programId?: string | null;
    webhookIds?: string[] | null;
  }): Promise<types.linkSchema> {
    const response = await this.fetch<types.linkSchema>({
      method: 'PUT',
      path: '/links/upsert',
      body: data,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<types.linkSchema>;
  }

  /**
   * GET /analytics
   * Tags: Analytics
   */
  async retrieveAnalytics({
    event = 'clicks',
    groupBy = 'count',
    domain,
    key,
    linkId,
    externalId,
    interval,
    start,
    end,
    timezone = 'UTC',
    country,
    city,
    region,
    continent,
    device,
    browser,
    os,
    trigger,
    referer,
    refererUrl,
    url,
    tagId,
    tagIds,
    qr,
    root,
  }: {
    event?: 'clicks' | 'leads' | 'sales' | 'composite';
    groupBy?: 'count' | 'timeseries' | 'continents' | 'regions' | 'countries' | 'cities' | 'devices' | 'browsers' | 'os' | 'trigger' | 'triggers' | 'referers' | 'referer_urls' | 'top_links' | 'top_urls';
    domain?: string;
    key?: string;
    linkId?: string;
    externalId?: string;
    interval?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all' | 'all_unfiltered';
    start?: string;
    end?: string;
    timezone?: string;
    country?: Country;
    city?: string;
    region?: string;
    continent?: Continent;
    device?: string;
    browser?: string;
    os?: string;
    trigger?: 'qr' | 'link';
    referer?: string;
    refererUrl?: string;
    url?: string;
    tagId?: string;
    tagIds?: string | string[];
    qr?: boolean;
    root?: boolean;
  }): Promise<
    | AnalyticsCount
    | AnalyticsTimeseries[]
    | AnalyticsContinents[]
    | AnalyticsCountries[]
    | AnalyticsCities[]
    | AnalyticsDevices[]
    | AnalyticsBrowsers[]
    | AnalyticsOS[]
    | AnalyticsTriggers[]
    | AnalyticsReferers[]
    | AnalyticsRefererUrls[]
    | AnalyticsTopLinks[]
    | AnalyticsTopUrls[]
  > {
    const response = await this.fetch({
      method: 'GET',
      path: '/analytics',
      query: {
        event,
        groupBy,
        domain,
        key,
        linkId,
        externalId,
        interval,
        start,
        end,
        timezone,
        country,
        city,
        region,
        continent,
        device,
        browser,
        os,
        trigger,
        referer,
        refererUrl,
        url,
        tagId,
        tagIds,
        qr,
        root,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  /**
   * GET /events
   * Retrieve a list of events
   * Tags: Events
   */
  async listEvents({
    event = 'clicks',
    domain,
    key,
    linkId,
    externalId,
    interval = '24h',
    start,
    end,
    timezone = 'UTC',
    country,
    city,
    region,
    continent,
    device,
    browser,
    os,
    trigger,
    referer,
    refererUrl,
    url,
    tagId,
    tagIds,
    qr,
    root,
    page = 1,
    limit = 100,
    order = 'desc',
    sortBy = 'timestamp',
  }: {
    event?: 'clicks' | 'leads' | 'sales';
    domain?: string;
    key?: string;
    linkId?: string;
    externalId?: string;
    interval?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all';
    start?: string;
    end?: string;
    timezone?: string;
    country?: CountryCode;
    city?: string;
    region?: string;
    continent?: ContinentCode;
    device?: string;
    browser?: string;
    os?: string;
    trigger?: 'qr' | 'link';
    referer?: string;
    refererUrl?: string;
    url?: string;
    tagId?: string;
    tagIds?: string | string[];
    qr?: boolean;
    root?: boolean;
    page?: number;
    limit?: number;
    order?: 'asc' | 'desc';
    sortBy?: 'timestamp';
  }): Promise<(ClickEvent | LeadEvent | SaleEvent)[]> {
    const response = await this.fetch({
      method: 'GET',
      path: '/events',
      query: {
        event,
        domain,
        key,
        linkId,
        externalId,
        interval,
        start,
        end,
        timezone,
        country,
        city,
        region,
        continent,
        device,
        browser,
        os,
        trigger,
        referer,
        refererUrl,
        url,
        tagId,
        tagIds,
        qr,
        root,
        page,
        limit,
        order,
        sortBy,
      },
    });

    if (!response.ok) {
      throw new ExampleError('Failed to fetch events', { status: response.status, data: await response.json() });
    }

    return response.json();
  }

  // GET /tags
  // Retrieves a list of tags for the authenticated workspace.
  async getTags(): Promise<Tag[]> {
    const response = await this.fetch<Tag[]>({
      method: 'GET',
      path: '/tags',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // POST /tags
  // Create a new tag
  // Tags
  async createTag({
    name,
    color,
  }: {
    name: string;
    color?: "red" | "yellow" | "green" | "blue" | "purple" | "pink" | "brown";
  }): Promise<Tag> {
    const response = await this.fetch<Tag>({
      method: 'POST',
      path: '/tags',
      body: { name, color },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<Tag>;
  }

  // DELETE /tags/{id} - Tags
  async deleteTag(id: string): Promise<{ id: string }> {
    const response = await this.fetch<{ id: string }>({
      method: 'DELETE',
      path: `/tags/${encodeURIComponent(id)}`,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // PATCH /tags/{id} - Update a tag
  async updateTag(
    id: string,
    body?: {
      name?: string;
      color?: Color;
    }
  ): Promise<Tag> {
    const response = await this.fetch<Tag>({
      method: 'PATCH',
      path: `/tags/${id}`,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<Tag>;
  }

  // GET /domains - Retrieve a list of domains
  async listDomains({
    archived = false,
    search,
    page = 1,
    pageSize = 50,
  }: {
    archived?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<DomainSchema[]> {
    const response = await this.fetch<undefined>({
      method: 'GET',
      path: '/domains',
      query: { archived, search, page, pageSize },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<DomainSchema[]>;
  }

  // POST /domains
  // Creates a domain for the authenticated workspace.
  // Tags: Domains
  async createDomain(
    body: {
      slug: string;
      expiredUrl?: string | null;
      notFoundUrl?: string | null;
      archived?: boolean;
      placeholder?: string | null;
      logo?: string | null;
    }
  ): Promise<DomainSchema> {
    const response = await this.fetch<{
      slug: string;
      expiredUrl?: string | null;
      notFoundUrl?: string | null;
      archived?: boolean;
      placeholder?: string | null;
      logo?: string | null;
    }>({
      method: 'POST',
      path: '/domains',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to create domain', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<DomainSchema>;
  }

  // DELETE /domains/{slug}
  // Deletes a domain from a workspace. It cannot be undone.
  async deleteDomain(slug: string): Promise<{ slug: string } | ExampleError> {
    const response = await this.fetch<{ slug: string }>({
      method: 'DELETE',
      path: `/domains/${encodeURIComponent(slug)}`,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // PATCH /domains/{slug}
  // Tags: Domains
  async updateDomain(
    slug: string,
    body: {
      slug: string;
      expiredUrl?: string | null;
      notFoundUrl?: string | null;
      archived?: boolean;
      placeholder?: string | null;
      logo?: string | null;
    }
  ): Promise<DomainSchema> {
    const response = await this.fetch<{
      slug: string;
      expiredUrl?: string | null;
      notFoundUrl?: string | null;
      archived?: boolean;
      placeholder?: string | null;
      logo?: string | null;
    }>({
      method: 'PATCH',
      path: `/domains/${slug}`,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<DomainSchema>;
  }

 

  // POST /track/lead
  // Tags: Track
  async trackLead(
    body: {
      clickId: string
      eventName: string
      externalId?: string
      customerId?: string | null
      customerName?: string | null
      customerEmail?: string | null
      customerAvatar?: string | null
      metadata?: Record<string, any> | null
    }
  ): Promise<{
    click: { id: string }
    customer: {
      name: string | null
      email: string | null
      avatar: string | null
      externalId: string | null
    }
  }> {
    const response = await this.fetch<{ clickId: string; eventName: string; externalId?: string; customerId?: string | null; customerName?: string | null; customerEmail?: string | null; customerAvatar?: string | null; metadata?: Record<string, any> | null }>({
      method: 'POST',
      path: '/track/lead',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  /**
   * POST /track/sale
   * Track a sale
   * Tags: Track
   */
  async trackSale({
    externalId = '',
    customerId = null,
    amount,
    paymentProcessor,
    eventName = 'Purchase',
    invoiceId = null,
    currency = 'usd',
    metadata = null,
  }: {
    externalId?: string;
    customerId?: string | null;
    amount: number;
    paymentProcessor: 'stripe' | 'shopify' | 'paddle';
    eventName?: string;
    invoiceId?: string | null;
    currency?: string;
    metadata?: Record<string, any> | null;
  }): Promise<{
    eventName: string;
    customer: {
      id: string;
      name: string | null;
      email: string | null;
      avatar: string | null;
      externalId: string | null;
    };
    sale: {
      amount: number;
      currency: string;
      paymentProcessor: string;
      invoiceId: string | null;
      metadata: Record<string, any> | null;
    };
  }> {
    const response = await this.fetch({
      method: 'POST',
      path: '/track/sale',
      body: {
        externalId,
        customerId,
        amount,
        paymentProcessor,
        eventName,
        invoiceId,
        currency,
        metadata,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // Global scope declarations
  export type TrackSaleRequest = {
    externalId?: string;
    customerId?: string | null;
    amount: number;
    paymentProcessor: 'stripe' | 'shopify' | 'paddle';
    eventName?: string;
    invoiceId?: string | null;
    currency?: string;
    metadata?: Record<string, any> | null;
  };

  export type TrackSaleResponse = {
    eventName: string;
    customer: {
      id: string;
      name: string | null;
      email: string | null;
      avatar: string | null;
      externalId: string | null;
    };
    sale: {
      amount: number;
      currency: string;
      paymentProcessor: string;
      invoiceId: string | null;
      metadata: Record<string, any> | null;
    };
  };

  // GET /customers
  // Retrieves a list of customers for the authenticated workspace.
  // Tags: Customers
  async getCustomers({
    email,
    externalId,
    includeExpandedFields,
  }: {
    email?: string
    externalId?: string
    includeExpandedFields?: boolean
  }): Promise<types.Customer[]> {
    const response = await this.fetch<undefined>({
      method: 'GET',
      path: '/customers',
      query: {
        email,
        externalId,
        includeExpandedFields,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<types.Customer[]>;
  }

  // Type declarations for the response
  declare global {
    namespace types {
      export type Customer = {
        id: string;
        externalId: string;
        name: string;
        email?: string | null;
        avatar?: string | null;
        country?: string | null;
        createdAt: string;
        link?: {
          id: string;
          domain: string;
          key: string;
          shortLink: string;
          programId?: string | null;
        };
        partner?: {
          id: string;
          name: string;
          email: string;
          image?: string | null;
        };
        discount?: {
          id: string;
          couponId?: string | null;
          couponTestId?: string | null;
          amount: number;
          type: 'percentage' | 'flat';
          duration?: number | null;
          interval?: 'month' | 'year' | null;
        };
      }[];
    }
  }

  // POST /customers
  // Creates a customer for the authenticated workspace.
  // Tags: Customers
  async createCustomer(
    body: {
      email?: string | null;
      name?: string | null;
      avatar?: string | null;
      externalId: string;
    }
  ): Promise<{
    id: string;
    externalId: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
    country?: string | null;
    createdAt: string;
    link?: {
      id: string;
      domain: string;
      key: string;
      shortLink: string;
      programId?: string | null;
    };
    partner?: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
    discount?: {
      id: string;
      couponId?: string | null;
      couponTestId?: string | null;
      amount: number;
      type: 'percentage' | 'flat';
      duration?: number | null;
      interval?: 'month' | 'year' | null;
    };
  }> {
    const response = await this.fetch<{
      email?: string | null;
      name: string;
      avatar?: string | null;
      externalId: string;
      id: string;
      country?: string | null;
      createdAt: string;
      link?: {
        id: string;
        domain: string;
        key: string;
        shortLink: string;
        programId?: string | null;
      };
      partner?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
      };
      discount?: {
        id: string;
        couponId?: string | null;
        couponTestId?: string | null;
        amount: number;
        type: 'percentage' | 'flat';
        duration?: number | null;
        interval?: 'month' | 'year' | null;
      };
    }>({
      method: 'POST',
      path: '/customers',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  // Global scope declarations
  declare global {
    type CreateCustomerRequest = {
      email?: string | null;
      name?: string | null;
      avatar?: string | null;
      externalId: string;
    };

    type CreateCustomerResponse = {
      id: string;
      externalId: string;
      name: string;
      email?: string | null;
      avatar?: string | null;
      country?: string | null;
      createdAt: string;
      link?: {
        id: string;
        domain: string;
        key: string;
        shortLink: string;
        programId?: string | null;
      };
      partner?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
      };
      discount?: {
        id: string;
        couponId?: string | null;
        couponTestId?: string | null;
        amount: number;
        type: 'percentage' | 'flat';
        duration?: number | null;
        interval?: 'month' | 'year' | null;
      };
    };
  }

  // GET /customers/{id}
  // Retrieves a customer by ID for the authenticated workspace.
  async getCustomer(
    id: string,
    includeExpandedFields?: boolean
  ): Promise<types.Customer | ExampleError> {
    const response = await this.fetch<undefined>({
      method: 'GET',
      path: `/customers/${id}`,
      query: { includeExpandedFields },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<types.Customer>;
  }

  // DELETE /customers/{id} - Delete a customer
  async deleteCustomer(id: string): Promise<{ id: string }> {
    const response = await this.fetch<{ id: string }>({
      method: 'DELETE',
      path: `/customers/${encodeURIComponent(id)}`,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // PATCH /customers/{id}
  // Tags: Customers
  async updateCustomer(
    id: string,
    body: {
      email?: string | null;
      name?: string | null;
      avatar?: string | null;
      externalId: string;
    },
    includeExpandedFields?: boolean
  ): Promise<{
    id: string;
    externalId: string;
    name: string;
    email: string | null;
    avatar: string | null;
    country: string | null;
    createdAt: string;
    link: {
      id: string;
      domain: string;
      key: string;
      shortLink: string;
      programId: string | null;
    } | null;
    partner: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    } | null;
    discount: {
      id: string;
      couponId: string | null;
      couponTestId: string | null;
      amount: number;
      type: 'percentage' | 'flat';
      duration: number | null;
      interval: 'month' | 'year' | null;
    } | null;
  }> {
    const response = await this.fetch<{
      email?: string | null;
      name?: string | null;
      avatar?: string | null;
      externalId: string;
    }>({
      method: 'PATCH',
      path: `/customers/${id}`,
      body,
      query: { includeExpandedFields },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // GET /workspaces/{idOrSlug} - Retrieve a workspace
  async getWorkspace(idOrSlug: string): Promise<Workspace> {
    const response = await this.fetch<undefined>({
      method: 'GET',
      path: `/workspaces/${encodeURIComponent(idOrSlug)}`,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<Workspace>;
  }

  // PATCH /workspaces/{idOrSlug}
  // Update a workspace
  // Tags: Workspaces
  async updateWorkspace(
    idOrSlug: string,
    body: {
      name?: string;
      slug?: string;
      logo?: string;
    }
  ): Promise<Workspace> {
    const response = await this.fetch<Workspace>({
      method: 'PATCH',
      path: `/workspaces/${idOrSlug}`,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<Workspace>;
  }

  // POST /tokens/embed
  // Creates a new embed token
  async createEmbedToken(
    body: { linkId: string }
  ): Promise<{
    publicToken: string;
    expires: string;
  }> {
    const response = await this.fetch<{ linkId: string }, { publicToken: string; expires: string }>({
      method: 'POST',
      path: '/tokens/embed',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }

  // GET /qr
  // Retrieves a QR code for a link.
  async getQRCode({
    url,
    logo,
    size = 600,
    level = 'L',
    fgColor = '#000000',
    bgColor = '#FFFFFF',
    hideLogo = false,
    margin = 2,
    includeMargin = true,
  }: {
    url: string
    logo?: string
    size?: number
    level?: 'L' | 'M' | 'Q' | 'H'
    fgColor?: string
    bgColor?: string
    hideLogo?: boolean
    margin?: number
    includeMargin?: boolean
  }): Promise<string> {
    const response = await this.fetch({
      method: 'GET',
      path: '/qr',
      query: {
        url,
        logo,
        size,
        level,
        fgColor,
        bgColor,
        hideLogo,
        margin,
        includeMargin,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.blob().then(blob => URL.createObjectURL(blob));
  }

  // GET /metatags - Retrieve the metatags for a URL
  async getMetatags(
    url: string
  ): Promise<{
    title: string | null;
    description: string | null;
    image: string | null;
  }> {
    const response = await this.fetch<{ url: string }>({
      method: 'GET',
      path: '/metatags',
      query: { url },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError('Failed to retrieve metatags', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  // Global scope declarations
  declare global {
    type MetatagsResponse = {
      title: string | null;
      description: string | null;
      image: string | null;
    };
  }
}

export class ExampleError extends Error {
  status: number
  data: any
  constructor(
    public error: string,
    { status, data }: { status: number; data?: any },
  ) {
    super(error)
    this.status = status
    this.data = data
  }
}

// this function should not be removed even if not used
export async function* streamSSEResponse(
  response: Response,
): AsyncGenerator<any> {
  const body = response.body
  if (!body) return

  const eventStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())

  let reader = eventStream.getReader()
  while (true) {
    const { done, value: event } = await reader.read()
    if (done) break
    if (event?.event === 'error') {
      throw new ExampleError(event.data, { status: 500 })
    }
    if (event) {
      try {
        yield JSON.parse(event.data)
      } catch (error) {}
    }
  }
}

// Global scope declarations
export type DeleteLinkResponse = { id: string };
export type DeleteLinkError = {
  error: {
    code: string;
    message: string;
    doc_url: string;
  };
};
export type BulkDeleteLinksResponse = { deletedCount: number };
export interface CreateDomainRequest {
  slug: string;
  expiredUrl?: string | null;
  notFoundUrl?: string | null;
  archived?: boolean;
  placeholder?: string | null;
  logo?: string | null;
}

// Global type declarations
type TrackLeadRequest = {
  clickId: string;
  eventName: string;
  externalId?: string;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAvatar?: string | null;
  metadata?: Record<string, any> | null;
};

type TrackLeadResponse = {
  click: { id: string };
  customer: {
    name: string | null;
    email: string | null;
    avatar: string | null;
    externalId: string | null;
  };
};

export type TrackSaleRequest = {
  externalId?: string;
  customerId?: string | null;
  amount: number;
  paymentProcessor: 'stripe' | 'shopify' | 'paddle';
  eventName?: string;
  invoiceId?: string | null;
  currency?: string;
  metadata?: Record<string, any> | null;
};

export type TrackSaleResponse = {
  eventName: string;
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
    externalId: string | null;
  };
  sale: {
    amount: number;
    currency: string;
    paymentProcessor: string;
    invoiceId: string | null;
    metadata: Record<string, any> | null;
  };
};

// Global scope declarations
export interface UpdateWorkspaceRequest {
  name?: string;
  slug?: string;
  logo?: string;
}
































