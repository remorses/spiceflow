import { EventSourceParserStream } from 'eventsource-parser/stream'

export interface CreateLinkRequest {
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
  geo?: Record<string, string> | null;
  doIndex?: boolean;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  ref?: string | null;
  programId?: string | null;
  webhookIds?: string[] | null;
}

export interface LinkSchema {
  id: string;
  domain: string;
  key: string;
  url: string;
  trackConversion: boolean;
  externalId: string | null;
  archived: boolean;
  expiresAt: string | null;
  expiredUrl: string | null;
  password: string | null;
  proxy: boolean;
  title: string | null;
  description: string | null;
  image: string | null;
  video: string | null;
  rewrite: boolean;
  doIndex: boolean;
  ios: string | null;
  android: string | null;
  geo: Record<string, string> | null;
  publicStats: boolean;
  tagId: string | null;
  tags: TagSchema[] | null;
  webhookIds: string[];
  comments: string | null;
  shortLink: string;
  qrCode: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  userId: string | null;
  workspaceId: string;
  clicks: number;
  lastClicked: string | null;
  leads: number;
  sales: number;
  saleAmount: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  programId: string | null;
}

interface UpsertLinkRequest {
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
  doIndex?: boolean;
  ios?: string | null;
  android?: string | null;
  geo?: Record<string, string> | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  ref?: string | null;
  programId?: string | null;
  webhookIds?: string[] | null;
}

interface LinkResponse {
  id: string;
  domain: string;
  key: string;
  url: string;
  trackConversion: boolean;
  externalId: string | null;
  archived: boolean;
  expiresAt: string | null;
  expiredUrl: string | null;
  password: string | null;
  proxy: boolean;
  title: string | null;
  description: string | null;
  image: string | null;
  video: string | null;
  rewrite: boolean;
  doIndex: boolean;
  ios: string | null;
  android: string | null;
  geo: Record<string, string> | null;
  publicStats: boolean;
  tagId: string | null;
  tags: any[] | null;
  webhookIds: string[];
  comments: string | null;
  shortLink: string;
  qrCode: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  userId: string | null;
  workspaceId: string;
  clicks: number;
  lastClicked: string | null;
  leads: number;
  sales: number;
  saleAmount: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  programId: string | null;
}

export type CreateCustomerRequest = {
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
  externalId: string;
};

export type CreateCustomerResponseLink = {
  id: string;
  domain: string;
  key: string;
  shortLink: string;
  programId: string | null;
};

export type CreateCustomerResponsePartner = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type CreateCustomerResponseDiscount = {
  id: string;
  couponId: string | null;
  couponTestId: string | null;
  amount: number;
  type: 'percentage' | 'flat';
  duration?: number | null;
  interval?: 'month' | 'year' | null;
};

export type CreateCustomerResponse = {
  id: string;
  externalId: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  country?: string | null;
  createdAt: string;
  link?: CreateCustomerResponseLink | null;
  partner?: CreateCustomerResponsePartner | null;
  discount?: CreateCustomerResponseDiscount | null;
};

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
};

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
   * Retrieve a paginated list of links for the authenticated workspace.
   * Tags: Links
   */
  async getLinks(params?: {
    domain?: string;
    tagId?: string;
    tagIds?: string | string[];
    tagNames?: string | string[];
    search?: string;
    userId?: string;
    showArchived?: boolean;
    withTags?: boolean;
    sort?: 'createdAt' | 'clicks' | 'lastClicked';
    page?: number;
    pageSize?: number;
  }): Promise<LinkSchema[]> {
    // Convert array parameters to comma-separated strings
    const query: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            query[key] = value.join(',');
          } else {
            query[key] = String(value);
          }
        }
      });
    }

    const response = await this.fetch({
      method: 'GET',
      path: '/links',
      query,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError('Failed to get links', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  /**
   * POST /links
   * Create a new link for the authenticated workspace.
   * @tags Links
   */
  async createLink(body: CreateLinkRequest): Promise<LinkSchema> {
    const response = await this.fetch({
      method: 'POST',
      path: '/links',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError('Failed to create link', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  /**
   * GET /links/count
   * Retrieve the number of links for the authenticated workspace.
   * Tags: Links
   */
  async countLinks(params?: {
    domain?: string;
    tagId?: string;
    tagIds?: string | string[];
    tagNames?: string | string[];
    search?: string;
    userId?: string;
    showArchived?: boolean;
    withTags?: boolean;
    groupBy?: 'domain' | 'tagId' | 'userId';
  }): Promise<number> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/links/count',
        query: params ? {
          domain: params.domain,
          tagId: params.tagId,
          tagIds: Array.isArray(params.tagIds) ? params.tagIds.join(',') : params.tagIds,
          tagNames: Array.isArray(params.tagNames) ? params.tagNames.join(',') : params.tagNames,
          search: params.search,
          userId: params.userId,
          showArchived: params.showArchived?.toString(),
          withTags: params.withTags?.toString(),
          groupBy: params.groupBy,
        } : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  /**
   * GET /links/info
   * Retrieve the info for a link.
   * Tags: Links
   */
  async getLinkInfo(params?: {
    domain?: string;
    key?: string;
    linkId?: string;
    externalId?: string;
  }): Promise<LinkSchema> {
    const response = await this.fetch({
      method: 'GET',
      path: '/links/info',
      query: params,
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

  /**
   * DELETE /links/{linkId}
   * Tags: Links
   * Delete a link for the authenticated workspace.
   */
  async deleteLink(linkId: string): Promise<{ id: string }> {
    try {
      const response = await this.fetch({
        method: 'DELETE',
        path: `/links/${encodeURIComponent(linkId)}`
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  /**
   * PATCH /links/{linkId} - Update a link
   * @tags Links
   */
  async updateLink(
    linkId: string,
    body: {
      url?: string;
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
      doIndex?: boolean;
      ios?: string | null;
      android?: string | null;
      geo?: Record<string, string> | null;
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      utm_term?: string | null;
      utm_content?: string | null;
      ref?: string | null;
      programId?: string | null;
      webhookIds?: string[] | null;
    }
  ): Promise<{
    id: string;
    domain: string;
    key: string;
    url: string;
    trackConversion: boolean;
    externalId: string | null;
    archived: boolean;
    expiresAt: string | null;
    expiredUrl: string | null;
    password: string | null;
    proxy: boolean;
    title: string | null;
    description: string | null;
    image: string | null;
    video: string | null;
    rewrite: boolean;
    doIndex: boolean;
    ios: string | null;
    android: string | null;
    geo: Record<string, string> | null;
    publicStats: boolean;
    tagId: string | null;
    tags: Array<{ id: string; name: string }> | null;
    webhookIds: string[];
    comments: string | null;
    shortLink: string;
    qrCode: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_term: string | null;
    utm_content: string | null;
    userId: string | null;
    workspaceId: string;
    clicks: number;
    lastClicked: string | null;
    leads: number;
    sales: number;
    saleAmount: number;
    createdAt: string;
    updatedAt: string;
    projectId: string;
    programId: string | null;
  }> {
    const response = await this.fetch({
      method: 'PATCH',
      path: `/links/${encodeURIComponent(linkId)}`,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError(errorData.error?.message || 'Failed to update link', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  // POST /links/bulk - Bulk create links
  async createMany(
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
      geo?: Record<string, string> | null;
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
  ): Promise<Array<LinkSchema>> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/links/bulk',
        body: links,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', {
        status: 500,
        data: error,
      });
    }
  }

  /**
   * DELETE /links/bulk
   * @tags Links
   * @summary Bulk delete links
   * @description Bulk delete up to 100 links for the authenticated workspace.
   */
  async deleteMany(linkIds: string[]): Promise<{ deletedCount: number }> {
    try {
      const response = await this.fetch({
        method: 'DELETE',
        path: '/links/bulk',
        query: { linkIds: linkIds.join(',') }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', {
        status: 500,
        data: error
      });
    }
  }

  /**
   * PATCH /links/bulk
   * Bulk update up to 100 links with the same data for the authenticated workspace.
   * Tags: Links
   */
  async bulkUpdateLinks(params: {
    linkIds?: string[]
    externalIds?: string[]
    data: {
      url?: string
      trackConversion?: boolean
      archived?: boolean
      publicStats?: boolean
      tagId?: string | null
      tagIds?: string | string[]
      tagNames?: string | string[]
      comments?: string | null
      expiresAt?: string | null
      expiredUrl?: string | null
      password?: string | null
      proxy?: boolean
      title?: string | null
      description?: string | null
      image?: string | null
      video?: string | null
      rewrite?: boolean
      doIndex?: boolean
      ios?: string | null
      android?: string | null
      geo?: LinkGeoTargeting
      utm_source?: string | null
      utm_medium?: string | null
      utm_campaign?: string | null
      utm_term?: string | null
      utm_content?: string | null
      ref?: string | null
      programId?: string | null
      webhookIds?: string[] | null
    }
  }): Promise<LinkSchema[]> {
    const response = await this.fetch({
      method: 'PATCH',
      path: '/links/bulk',
      body: params
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ExampleError(error.error.message, {
        status: response.status,
        data: error
      })
    }

    return response.json()
  }

  /**
   * PUT /links/upsert
   * Upsert a link for the authenticated workspace by its URL
   * Tags: Links
   */
  async upsertLink(body: UpsertLinkRequest): Promise<LinkResponse> {
    const response = await this.fetch({
      method: 'PUT',
      path: '/links/upsert',
      body
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData
      });
    }

    return response.json();
  }

  /**
   * GET /analytics
   * Retrieve analytics for a link, a domain, or the authenticated workspace.
   * Tags: Analytics
   */
  async retrieveAnalytics(params: AnalyticsParams): Promise<AnalyticsResponse> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/analytics',
        query: params as Record<string, string | number | boolean | null | undefined>
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData
        })
      }

      return response.json()
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error
      }
      throw new ExampleError('Unknown error occurred', { status: 500 })
    }
  }

  /**
   * GET /events
   * Retrieve a paginated list of events for the authenticated workspace.
   * @tags Events
   */
  async listEvents(params?: ListEventsQueryParams): Promise<EventResponse> {
    const response = await this.fetch({
      method: 'GET',
      path: '/events',
      query: params as Record<string, string | number | boolean | null | undefined>,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new ExampleError(error?.message || 'Failed to fetch events', {
        status: response.status,
        data: error,
      })
    }

    return response.json()
  }

  /**
   * GET /tags
   * Retrieve a list of tags for the authenticated workspace.
   * @tags Tags
   */
  async listTags(): Promise<TagSchema[]> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/tags',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  /**
   * POST /tags
   * Create a new tag for the authenticated workspace.
   * Tags: Tags
   */
  async createTag(body: {
    name: string;
    color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown';
    tag?: string; // deprecated
  }): Promise<{
    id: string;
    name: string;
    color: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown';
  }> {
    const response = await this.fetch({
      method: 'POST',
      path: '/tags',
      body,
    });

    if (response.status === 201) {
      return response.json();
    }

    const errorData = await response.json().catch(() => ({}));
    throw new ExampleError(errorData.error?.message || 'Failed to create tag', {
      status: response.status,
      data: errorData,
    });
  }

  /**
   * DELETE /tags/{id}
   * Tags: Tags
   * Delete a tag from the workspace. All existing links will still work, but they will no longer be associated with this tag.
   */
  async deleteTag(id: string): Promise<{ id: string }> {
    const response = await this.fetch({
      method: 'DELETE',
      path: `/tags/${id}`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError(errorData.error?.message || 'Failed to delete tag', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  /**
   * PATCH /tags/{id}
   * @tags Tags
   * @summary Update a tag
   * @description Update a tag in the workspace.
   */
  async updateTag(
    id: string,
    body: {
      name?: string;
      color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown';
      tag?: string; // deprecated
    }
  ): Promise<{
    id: string;
    name: string;
    color: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown';
  }> {
    const response = await this.fetch({
      method: 'PATCH',
      path: `/tags/${id}`,
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

  // GET /domains - Retrieve a list of domains
  // Tags: Domains
  async listDomains(params?: {
    archived?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Array<{
    id: string;
    slug: string;
    verified: boolean;
    primary: boolean;
    archived: boolean;
    placeholder: string | null;
    expiredUrl: string | null;
    notFoundUrl: string | null;
    logo: string | null;
    createdAt: string;
    updatedAt: string;
    registeredDomain: {
      id: string;
      createdAt: string;
      expiresAt: string;
    } | null;
  }>> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/domains',
        query: {
          archived: params?.archived,
          search: params?.search,
          page: params?.page,
          pageSize: params?.pageSize,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  // POST /domains - Create a domain
  // Tags: Domains
  async createDomain(body: {
    slug: string;
    expiredUrl?: string | null;
    notFoundUrl?: string | null;
    archived?: boolean;
    placeholder?: string | null;
    logo?: string | null;
  }): Promise<DomainSchema> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/domains',
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
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error', { status: 500 });
    }
  }

  // DELETE /domains/{slug} - Domains
  async deleteDomain(slug: string): Promise<DeleteDomainResponse> {
    try {
      const response = await this.fetch({
        method: 'DELETE',
        path: `/domains/${slug}`,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  /**
   * PATCH /domains/{slug}
   * @tags Domains
   * @summary Update a domain
   * @description Update a domain for the authenticated workspace.
   */
  async updateDomain(
    slug: string,
    body?: {
      slug?: string
      expiredUrl?: string | null
      notFoundUrl?: string | null
      archived?: boolean
      placeholder?: string | null
      logo?: string | null
    }
  ): Promise<{
    id: string
    slug: string
    verified: boolean
    primary: boolean
    archived: boolean
    placeholder: string | null
    expiredUrl: string | null
    notFoundUrl: string | null
    logo: string | null
    createdAt: string
    updatedAt: string
    registeredDomain: {
      id: string
      createdAt: string
      expiresAt: string
    } | null
  }> {
    const response = await this.fetch({
      method: 'PATCH',
      path: `/domains/${slug}`,
      body
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ExampleError(errorData?.error?.message || 'Failed to update domain', {
        status: response.status,
        data: errorData
      })
    }

    return response.json()
  }

  /**
   * POST /track/lead
   * Track a lead for a short link.
   * Tags: Track
   */
  async trackLead(params: {
    clickId: string;
    eventName: string;
    externalId?: string;
    customerId?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerAvatar?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<{
    click: { id: string };
    customer: {
      name: string | null;
      email: string | null;
      avatar: string | null;
      externalId: string | null;
    };
  }> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/track/lead',
        body: params,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', {
        status: 500,
        data: error,
      });
    }
  }

  /**
   * POST /track/sale
   * @tags Track
   * @summary Track a sale
   * @description Track a sale for a short link.
   */
  async trackSale(
    request: {
      externalId?: string
      customerId?: string | null
      amount: number
      paymentProcessor: 'stripe' | 'shopify' | 'paddle'
      eventName?: string
      invoiceId?: string | null
      currency?: string
      metadata?: Record<string, any> | null
    }
  ): Promise<{
    eventName: string
    customer: {
      id: string
      name: string | null
      email: string | null
      avatar: string | null
      externalId: string | null
    }
    sale: {
      amount: number
      currency: string
      paymentProcessor: string
      invoiceId: string | null
      metadata: Record<string, any> | null
    }
  }> {
    const response = await this.fetch({
      method: 'POST',
      path: '/track/sale',
      body: request
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ExampleError(
        errorData?.error?.message || 'Failed to track sale',
        {
          status: response.status,
          data: errorData
        }
      )
    }

    return response.json()
  }

  // GET /customers - Retrieve a list of customers
  // Tags: Customers
  async listCustomers(params?: {
    email?: string;
    externalId?: string;
    includeExpandedFields?: boolean;
  }): Promise<Customer[]> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/customers',
        query: params,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  /**
   * POST /customers
   * @tags Customers
   * @summary Create a customer
   * @description Create a customer for the authenticated workspace.
   */
  async create(
    data: CreateCustomerRequest
  ): Promise<CreateCustomerResponse> {
    const response = await this.fetch({
      method: 'POST',
      path: '/customers',
      body: data
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData
      });
    }

    return response.json() as Promise<CreateCustomerResponse>;
  }

  // GET /customers/{id} - Customers
  async getCustomer(
    id: string,
    params?: {
      includeExpandedFields?: boolean
    }
  ): Promise<{
    id: string
    externalId: string
    name: string
    email: string | null
    avatar: string | null
    country: string | null
    createdAt: string
    link?: {
      id: string
      domain: string
      key: string
      shortLink: string
      programId: string | null
    } | null
    partner?: {
      id: string
      name: string
      email: string
      image: string | null
    } | null
    discount?: {
      id: string
      couponId: string | null
      couponTestId: string | null
      amount: number
      type: 'percentage' | 'flat'
      duration: number | null
      interval: 'month' | 'year' | null
    } | null
  }> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: `/customers/${id}`,
        query: {
          includeExpandedFields: params?.includeExpandedFields
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData
        })
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error
      }
      throw new ExampleError('Unknown error occurred', {
        status: 500,
        data: error
      })
    }
  }

  // DELETE /customers/{id} - Customers
  /**
   * Delete a customer from a workspace.
   * @param id The unique identifier of the customer in Dub.
   * @returns Promise<DeleteCustomerResponse>
   */
  async deleteCustomer(id: string): Promise<DeleteCustomerResponse> {
    try {
      const response = await this.fetch({
        method: 'DELETE',
        path: `/customers/${id}`,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('An unexpected error occurred', {
        status: 500,
        data: error,
      });
    }
  }

  // PATCH /customers/{id} - Customers
  async updateCustomer(
    id: string,
    body: {
      email?: string | null;
      name?: string | null;
      avatar?: string | null;
      externalId: string;
    },
    params?: {
      includeExpandedFields?: boolean;
    }
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
      type: "percentage" | "flat";
      duration: number | null;
      interval: "month" | "year" | null;
    } | null;
  }> {
    try {
      const response = await this.fetch({
        method: 'PATCH',
        path: `/customers/${id}`,
        query: params ? {
          includeExpandedFields: params.includeExpandedFields?.toString()
        } : undefined,
        body
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', {
        status: 500,
        data: error
      });
    }
  }

  /**
   * PATCH /workspaces/{idOrSlug}
   * Update a workspace by ID or slug
   * Tags: Workspaces
   */
  async updateWorkspace(
    idOrSlug: string,
    body?: {
      name?: string
      slug?: string
      logo?: string
    }
  ): Promise<WorkspaceSchema> {
    const response = await this.fetch({
      method: 'PATCH',
      path: `/workspaces/${idOrSlug}`,
      body,
    })

    if (response.ok) {
      return response.json()
    }

    const errorData = await response.json().catch(() => null)
    throw new ExampleError(errorData?.error?.message || 'Failed to update workspace', {
      status: response.status,
      data: errorData,
    })
  }

  // POST /tokens/embed - Create a new embed token
  // Tags: Embed Tokens
  async createEmbedToken(params: { linkId: string }): Promise<CreateEmbedTokenResponse> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/tokens/embed',
        body: params
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  /**
   * GET /qr
   * Retrieve a QR code for a link
   * Tags: QR Codes
   */
  async getQRCode(params: {
    url: string;
    logo?: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    fgColor?: string;
    bgColor?: string;
    hideLogo?: boolean;
    margin?: number;
    includeMargin?: boolean;
  }): Promise<Blob> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/qr',
        query: params,
        headers: {
          Accept: 'image/png',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError(errorData.error?.message || 'Failed to fetch QR code', {
          status: response.status,
          data: errorData,
        });
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error', { status: 500 });
    }
  }

  /**
   * GET /metatags
   * Retrieve the metatags for a URL
   * Tags: Metatags
   */
  async getMetatags(
    params: { url: string }
  ): Promise<{ title: string | null; description: string | null; image: string | null }> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/metatags',
        query: { url: params.url }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Failed to retrieve metatags', {
          status: response.status,
          data: errorData
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error', { status: 500 });
    }
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

export interface TagSchema {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Error types based on the schema
type ApiError = {
  code: string;
  message: string;
  doc_url?: string;
};

type BadRequestError = { error: ApiError & { code: 'bad_request' } };
type UnauthorizedError = { error: ApiError & { code: 'unauthorized' } };
type ForbiddenError = { error: ApiError & { code: 'forbidden' } };
type NotFoundError = { error: ApiError & { code: 'not_found' } };
type ConflictError = { error: ApiError & { code: 'conflict' } };
type InviteExpiredError = { error: ApiError & { code: 'invite_expired' } };
type UnprocessableEntityError = { error: ApiError & { code: 'unprocessable_entity' } };
type RateLimitExceededError = { error: ApiError & { code: 'rate_limit_exceeded' } };
type InternalServerError = { error: ApiError & { code: 'internal_server_error' } };

type BulkDeleteLinksSuccessResponse = {
  deletedCount: number;
};

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
};

type BadRequestError = ErrorResponse;
type UnauthorizedError = ErrorResponse;
type ForbiddenError = ErrorResponse;
type NotFoundError = ErrorResponse;
type ConflictError = ErrorResponse;
type InviteExpiredError = ErrorResponse;
type UnprocessableEntityError = ErrorResponse;
type RateLimitExceededError = ErrorResponse;
type InternalServerError = ErrorResponse;

interface LinkGeoTargeting {
  [countryCode: string]: string
}

// Type definitions for analytics parameters
type AnalyticsEvent = 'clicks' | 'leads' | 'sales' | 'composite'
type AnalyticsGroupBy = 'count' | 'timeseries' | 'continents' | 'regions' | 'countries' | 'cities' | 'devices' | 'browsers' | 'os' | 'trigger' | 'triggers' | 'referers' | 'referer_urls' | 'top_links' | 'top_urls'
type AnalyticsInterval = '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all' | 'all_unfiltered'
type AnalyticsTrigger = 'qr' | 'link'

interface AnalyticsParams {
  event?: AnalyticsEvent
  groupBy?: AnalyticsGroupBy
  domain?: string
  key?: string
  linkId?: string
  externalId?: string
  interval?: AnalyticsInterval
  start?: string
  end?: string
  timezone?: string
  country?: string
  city?: string
  region?: string
  continent?: string
  device?: string
  browser?: string
  os?: string
  trigger?: AnalyticsTrigger
  referer?: string
  refererUrl?: string
  url?: string
  tagId?: string
  tagIds?: string | string[]
  qr?: boolean
  root?: boolean
}

// Response types
type AnalyticsCount = {
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsTimeseries = {
  start: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsContinents = {
  continent: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsCountries = {
  country: string
  city: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsCities = {
  city: string
  country: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsDevices = {
  device: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsBrowsers = {
  browser: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsOS = {
  os: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsTriggers = {
  trigger: AnalyticsTrigger
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsReferers = {
  referer: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsRefererUrls = {
  refererUrl: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsTopLinks = {
  id: string
  domain: string
  key: string
  shortLink: string
  url: string
  createdAt: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsTopUrls = {
  url: string
  clicks: number
  leads: number
  sales: number
  saleAmount: number
}

type AnalyticsResponse = 
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

// Type definitions for /events endpoint
export type ListEventsQueryParams = {
  event?: 'clicks' | 'leads' | 'sales'
  domain?: string
  key?: string
  linkId?: string
  externalId?: string
  interval?: '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all'
  start?: string
  end?: string
  timezone?: string
  country?: string
  city?: string
  region?: string
  continent?: string
  device?: string
  browser?: string
  os?: string
  trigger?: 'qr' | 'link'
  referer?: string
  refererUrl?: string
  url?: string
  tagId?: string
  tagIds?: string | string[]
  qr?: boolean
  root?: boolean
  page?: number
  limit?: number
  order?: 'asc' | 'desc'
  sortBy?: 'timestamp'
}

export type ClickEvent = {
  event: 'click'
  timestamp: string
  click: {
    id: string
    url: string
    country: string
    city: string
    region: string
    continent: string
    device: string
    browser: string
    os: string
    referer: string
    refererUrl: string
    qr: boolean
    ip: string
  }
  link: {
    id: string
    domain: string
    key: string
    url: string
    // ... other link properties ...
  }
  // ... other deprecated fields ...
}

export type LeadEvent = {
  event: 'lead'
  timestamp: string
  eventId: string
  eventName: string
  click: {
    id: string
    url: string
    country: string
    city: string
    region: string
    continent: string
    device: string
    browser: string
    os: string
    referer: string
    refererUrl: string
    qr: boolean
    ip: string
  }
  link: {
    id: string
    domain: string
    key: string
    url: string
    // ... other link properties ...
  }
  customer: {
    id: string
    externalId: string
    name: string
    email?: string
    avatar?: string
    country?: string
    createdAt: string
    // ... other customer properties ...
  }
  // ... other deprecated fields ...
}

export type SaleEvent = {
  event: 'sale'
  timestamp: string
  eventId: string
  eventName: string
  link: {
    id: string
    domain: string
    key: string
    url: string
    // ... other link properties ...
  }
  click: {
    id: string
    url: string
    country: string
    city: string
    region: string
    continent: string
    device: string
    browser: string
    os: string
    referer: string
    refererUrl: string
    qr: boolean
    ip: string
  }
  customer: {
    id: string
    externalId: string
    name: string
    email?: string
    avatar?: string
    country?: string
    createdAt: string
    // ... other customer properties ...
  }
  sale: {
    amount: number
    invoiceId?: string
    paymentProcessor: 'stripe' | 'shopify' | 'paddle'
  }
  // ... other deprecated fields ...
}

export type EventResponse = ClickEvent[] | LeadEvent[] | SaleEvent[]

// Type declarations
type CreateTagRequest = {
  name: string;
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown';
  tag?: string; // deprecated
};

type TagSchema = {
  id: string;
  name: string;
  color: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'brown';
};

// Type definitions
interface DomainSchema {
  id: string;
  slug: string;
  verified: boolean;
  primary: boolean;
  archived: boolean;
  placeholder: string | null;
  expiredUrl: string | null;
  notFoundUrl: string | null;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
  registeredDomain: {
    id: string;
    createdAt: string;
    expiresAt: string;
  } | null;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
}

// Response types
type DeleteDomainResponse = {
  slug: string;
};

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
};

type BadRequestError = ErrorResponse;
type UnauthorizedError = ErrorResponse;
type ForbiddenError = ErrorResponse;
type NotFoundError = ErrorResponse;
type ConflictError = ErrorResponse;
type InviteExpiredError = ErrorResponse;
type UnprocessableEntityError = ErrorResponse;
type RateLimitExceededError = ErrorResponse;
type InternalServerError = ErrorResponse;

// Type definitions
type CustomerLink = {
  id: string;
  domain: string;
  key: string;
  shortLink: string;
  programId: string | null;
};

type CustomerPartner = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

type CustomerDiscount = {
  id: string;
  couponId: string | null;
  couponTestId: string | null;
  amount: number;
  type: 'percentage' | 'flat';
  duration: number | null;
  interval: 'month' | 'year' | null;
};

type Customer = {
  id: string;
  externalId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  country: string | null;
  createdAt: string;
  link: CustomerLink | null;
  partner: CustomerPartner | null;
  discount: CustomerDiscount | null;
};

// Response and Error Types
interface DeleteCustomerResponse {
  id: string;
}

interface DubError {
  code: string;
  message: string;
  doc_url?: string;
}

interface DubErrorResponse {
  error: DubError;
}

// Error type aliases for specific error responses
type BadRequestError = DubErrorResponse;
type UnauthorizedError = DubErrorResponse;
type ForbiddenError = DubErrorResponse;
type NotFoundError = DubErrorResponse;
type ConflictError = DubErrorResponse;
type InviteExpiredError = DubErrorResponse;
type UnprocessableEntityError = DubErrorResponse;
type RateLimitExceededError = DubErrorResponse;
type InternalServerError = DubErrorResponse;

export class WorkspacesClient extends ExampleClient {
  /**
   * GET /workspaces/{idOrSlug}
   * @tags Workspaces
   * @summary Retrieve a workspace
   * @description Retrieve a workspace for the authenticated user.
   */
  async get(idOrSlug: string): Promise<WorkspaceSchema> {
    const response = await this.fetch({
      method: 'GET',
      path: `/workspaces/${encodeURIComponent(idOrSlug)}`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError(errorData.error?.message || 'Failed to fetch workspace', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
}

// Type definitions
export interface WorkspaceSchema {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  inviteCode: string | null;
  plan: 'free' | 'pro' | 'business' | 'business plus' | 'business extra' | 'business max' | 'enterprise';
  stripeId: string | null;
  billingCycleStart: number;
  paymentFailedAt: string | null;
  stripeConnectId: string | null;
  payoutMethodId: string | null;
  usage: number;
  usageLimit: number;
  linksUsage: number;
  linksLimit: number;
  salesUsage: number;
  salesLimit: number;
  domainsLimit: number;
  tagsLimit: number;
  usersLimit: number;
  aiUsage: number;
  aiLimit: number;
  conversionEnabled: boolean;
  dotLinkClaimed: boolean;
  partnersEnabled: boolean;
  createdAt: string;
  users: Array<{
    role: 'owner' | 'member';
  }>;
  domains: Array<{
    slug: string;
    primary: boolean;
    verified: boolean;
  }>;
  flags?: Record<string, boolean>;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
}

// Type definitions
interface CreateEmbedTokenRequest {
  linkId: string;
}

interface CreateEmbedTokenResponse {
  publicToken: string;
  expires: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    doc_url?: string;
  };
}

const client = new ExampleClient({ baseUrl: 'https://api.dub.co', token: 'your-token' });
const result = await client.createEmbedToken({ linkId: 'your-link-id' });
console.log(result.publicToken);
































