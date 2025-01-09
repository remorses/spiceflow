openapi: 3.0.3
info:
  title: Dub.co API
  description: Dub is link management infrastructure for companies to create marketing campaigns, link sharing features, and referral programs.
  version: 0.0.1
  contact:
    name: Dub.co Support
    email: support@dub.co
    url: https://dub.co/api
  license:
    name: AGPL-3.0 license
    url: https://github.com/dubinc/dub/blob/main/LICENSE.md
servers:
  - url: https://api.dub.co
    description: Production API
paths:
  /analytics:
    get:
      operationId: retrieveAnalytics
      x-speakeasy-name-override: retrieve
      summary: Retrieve analytics for a link, a domain, or the authenticated workspace.
      description: Retrieve analytics for a link, a domain, or the authenticated workspace. The response type depends on the `event` and `type` query parameters.
      tags:
        - Analytics
      parameters:
        - in: query
          name: event
          description: The type of event to retrieve analytics for. Defaults to `clicks`.
          schema:
            type: string
            enum:
              - clicks
              - leads
              - sales
              - composite
            default: clicks
            description: The type of event to retrieve analytics for. Defaults to `clicks`.
        - in: query
          name: groupBy
          description: The parameter to group the analytics data points by. Defaults to `count` if undefined. Note that `trigger` is deprecated (use `triggers` instead), but kept for backwards compatibility.
          schema:
            type: string
            enum:
              - count
              - timeseries
              - continents
              - regions
              - countries
              - cities
              - devices
              - browsers
              - os
              - trigger
              - triggers
              - referers
              - referer_urls
              - top_links
              - top_urls
            default: count
            description: The parameter to group the analytics data points by. Defaults to `count` if undefined. Note that `trigger` is deprecated (use `triggers` instead), but kept for backwards compatibility.
        - in: query
          name: domain
          description: The domain to filter analytics for.
          schema:
            type: string
            description: The domain to filter analytics for.
        - in: query
          name: key
          description: The short link slug.
          schema:
            type: string
            description: The short link slug.
        - in: query
          name: linkId
          description: The unique ID of the short link on Dub.
          schema:
            type: string
            description: The unique ID of the short link on Dub.
        - in: query
          name: externalId
          description: This is the ID of the link in the your database. Must be prefixed with 'ext_' when passed as a query parameter.
          schema:
            type: string
            description: This is the ID of the link in the your database. Must be prefixed with 'ext_' when passed as a query parameter.
        - in: query
          name: interval
          description: The interval to retrieve analytics for. If undefined, defaults to 24h.
          schema:
            type: string
            enum:
              - 24h
              - 7d
              - 30d
              - 90d
              - ytd
              - 1y
              - all
              - all_unfiltered
            description: The interval to retrieve analytics for. If undefined, defaults to 24h.
        - in: query
          name: start
          description: The start date and time when to retrieve analytics from. Takes precedence over `interval`.
          schema:
            type: string
            description: The start date and time when to retrieve analytics from. Takes precedence over `interval`.
        - in: query
          name: end
          description: The end date and time when to retrieve analytics from. If not provided, defaults to the current date. Takes precedence over `interval`.
          schema:
            type: string
            description: The end date and time when to retrieve analytics from. If not provided, defaults to the current date. Takes precedence over `interval`.
        - in: query
          name: timezone
          description: The IANA time zone code for aligning timeseries granularity (e.g. America/New_York). Defaults to UTC.
          schema:
            type: string
            description: The IANA time zone code for aligning timeseries granularity (e.g. America/New_York). Defaults to UTC.
            example: America/New_York
            default: UTC
        - in: query
          name: country
          description: The country to retrieve analytics for.
          schema:
            $ref: '#/components/schemas/countryCode'
        - in: query
          name: city
          description: The city to retrieve analytics for.
          schema:
            type: string
            description: The city to retrieve analytics for.
            example: New York
        - in: query
          name: region
          description: The ISO 3166-2 region code to retrieve analytics for.
          schema:
            $ref: '#/components/schemas/regionCode'
        - in: query
          name: continent
          description: The continent to retrieve analytics for.
          schema:
            $ref: '#/components/schemas/continentCode'
        - in: query
          name: device
          description: The device to retrieve analytics for.
          schema:
            type: string
            description: The device to retrieve analytics for.
            example: Desktop
        - in: query
          name: browser
          description: The browser to retrieve analytics for.
          schema:
            type: string
            description: The browser to retrieve analytics for.
            example: Chrome
        - in: query
          name: os
          description: The OS to retrieve analytics for.
          schema:
            type: string
            description: The OS to retrieve analytics for.
            example: Windows
        - in: query
          name: trigger
          description: The trigger to retrieve analytics for. If undefined, return both QR and link clicks.
          schema:
            type: string
            enum:
              - qr
              - link
            description: The trigger to retrieve analytics for. If undefined, return both QR and link clicks.
        - in: query
          name: referer
          description: The referer to retrieve analytics for.
          schema:
            type: string
            description: The referer to retrieve analytics for.
            example: google.com
        - in: query
          name: refererUrl
          description: The full referer URL to retrieve analytics for.
          schema:
            type: string
            description: The full referer URL to retrieve analytics for.
            example: https://dub.co/blog
        - in: query
          name: url
          description: The URL to retrieve analytics for.
          schema:
            type: string
            description: The URL to retrieve analytics for.
        - in: query
          name: tagId
          description: Deprecated. Use `tagIds` instead. The tag ID to retrieve analytics for.
          schema:
            type: string
            description: Deprecated. Use `tagIds` instead. The tag ID to retrieve analytics for.
            deprecated: true
        - in: query
          name: tagIds
          description: The tag IDs to retrieve analytics for.
          schema:
            anyOf:
              - type: string
              - type: array
                items:
                  type: string
            description: The tag IDs to retrieve analytics for.
        - in: query
          name: qr
          description: Deprecated. Use the `trigger` field instead. Filter for QR code scans. If true, filter for QR codes only. If false, filter for links only. If undefined, return both.
          schema:
            type: boolean
            description: Deprecated. Use the `trigger` field instead. Filter for QR code scans. If true, filter for QR codes only. If false, filter for links only. If undefined, return both.
            deprecated: true
        - in: query
          name: root
          description: Filter for root domains. If true, filter for domains only. If false, filter for links only. If undefined, return both.
          schema:
            type: boolean
            description: Filter for root domains. If true, filter for domains only. If false, filter for links only. If undefined, return both.
      responses:
        '200':
          description: Analytics data
          content:
            application/json:
              schema:
                anyOf:
                  - $ref: '#/components/schemas/AnalyticsCount'
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsTimeseries'
                    title: AnalyticsTimeseries
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsContinents'
                    title: AnalyticsContinents
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsCountries'
                    title: AnalyticsCountries
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsCities'
                    title: AnalyticsCities
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsDevices'
                    title: AnalyticsDevices
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsBrowsers'
                    title: AnalyticsBrowsers
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsOS'
                    title: AnalyticsOS
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsTriggers'
                    title: AnalyticsTriggers
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsReferers'
                    title: AnalyticsReferers
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsRefererUrls'
                    title: AnalyticsRefererUrls
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsTopLinks'
                    title: AnalyticsTopLinks
                  - type: array
                    items:
                      $ref: '#/components/schemas/AnalyticsTopUrls'
                    title: AnalyticsTopUrls
        '400':
          $ref: '#/components/responses/400'
        '401':
          $ref: '#/components/responses/401'
        '403':
          $ref: '#/components/responses/403'
        '404':
          $ref: '#/components/responses/404'
        '409':
          $ref: '#/components/responses/409'
        '410':
          $ref: '#/components/responses/410'
        '422':
          $ref: '#/components/responses/422'
        '429':
          $ref: '#/components/responses/429'
        '500':
          $ref: '#/components/responses/500'
components:
  responses:
    '400':
      description: The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).
      content:
        application/json:
          schema:
            x-speakeasy-name-override: BadRequest
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - bad_request
                    description: A short code indicating the error code returned.
                    example: bad_request
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#bad-request
                required:
                  - code
                  - message
            required:
              - error
    '401':
      description: Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: Unauthorized
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - unauthorized
                    description: A short code indicating the error code returned.
                    example: unauthorized
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#unauthorized
                required:
                  - code
                  - message
            required:
              - error
    '403':
      description: The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource. Unlike 401 Unauthorized, the client's identity is known to the server.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: Forbidden
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - forbidden
                    description: A short code indicating the error code returned.
                    example: forbidden
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#forbidden
                required:
                  - code
                  - message
            required:
              - error
    '404':
      description: The server cannot find the requested resource.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: NotFound
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - not_found
                    description: A short code indicating the error code returned.
                    example: not_found
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#not-found
                required:
                  - code
                  - message
            required:
              - error
    '409':
      description: This response is sent when a request conflicts with the current state of the server.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: Conflict
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - conflict
                    description: A short code indicating the error code returned.
                    example: conflict
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#conflict
                required:
                  - code
                  - message
            required:
              - error
    '410':
      description: This response is sent when the requested content has been permanently deleted from server, with no forwarding address.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: InviteExpired
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - invite_expired
                    description: A short code indicating the error code returned.
                    example: invite_expired
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#invite-expired
                required:
                  - code
                  - message
            required:
              - error
    '422':
      description: The request was well-formed but was unable to be followed due to semantic errors.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: UnprocessableEntity
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - unprocessable_entity
                    description: A short code indicating the error code returned.
                    example: unprocessable_entity
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#unprocessable-entity
                required:
                  - code
                  - message
            required:
              - error
    '429':
      description: The user has sent too many requests in a given amount of time ("rate limiting")
      content:
        application/json:
          schema:
            x-speakeasy-name-override: RateLimitExceeded
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - rate_limit_exceeded
                    description: A short code indicating the error code returned.
                    example: rate_limit_exceeded
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#rate-limit_exceeded
                required:
                  - code
                  - message
            required:
              - error
    '500':
      description: The server has encountered a situation it does not know how to handle.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: InternalServerError
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - internal_server_error
                    description: A short code indicating the error code returned.
                    example: internal_server_error
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#internal-server_error
                required:
                  - code
                  - message
            required:
              - error
  schemas:
    AnalyticsTopUrls:
      type: object
      properties:
        url:
          type: string
          description: The destination URL
        clicks:
          type: number
          description: The number of clicks from this URL
          default: 0
        leads:
          type: number
          description: The number of leads from this URL
          default: 0
        sales:
          type: number
          description: The number of sales from this URL
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this URL, in cents
          default: 0
      required:
        - url
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsTopLinks:
      type: object
      properties:
        link:
          type: string
          description: The unique ID of the short link
          deprecated: true
        id:
          type: string
          description: The unique ID of the short link
        domain:
          type: string
          description: The domain of the short link
        key:
          type: string
          description: The key of the short link
        shortLink:
          type: string
          description: The short link URL
        url:
          type: string
          description: The destination URL of the short link
        createdAt:
          type: string
          description: The creation timestamp of the short link
        clicks:
          type: number
          description: The number of clicks from this link
          default: 0
        leads:
          type: number
          description: The number of leads from this link
          default: 0
        sales:
          type: number
          description: The number of sales from this link
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this link, in cents
          default: 0
      required:
        - link
        - id
        - domain
        - key
        - shortLink
        - url
        - createdAt
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsRefererUrls:
      type: object
      properties:
        refererUrl:
          type: string
          description: The full URL of the referer. If unknown, this will be `(direct)`
        clicks:
          type: number
          description: The number of clicks from this referer to this URL
          default: 0
        leads:
          type: number
          description: The number of leads from this referer to this URL
          default: 0
        sales:
          type: number
          description: The number of sales from this referer to this URL
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this referer to this URL, in cents
          default: 0
      required:
        - refererUrl
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsReferers:
      type: object
      properties:
        referer:
          type: string
          description: The name of the referer. If unknown, this will be `(direct)`
        clicks:
          type: number
          description: The number of clicks from this referer
          default: 0
        leads:
          type: number
          description: The number of leads from this referer
          default: 0
        sales:
          type: number
          description: The number of sales from this referer
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this referer, in cents
          default: 0
      required:
        - referer
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsTriggers:
      type: object
      properties:
        trigger:
          type: string
          enum:
            - qr
            - link
          description: 'The type of trigger method: link click or QR scan'
        clicks:
          type: number
          description: The number of clicks from this trigger method
          default: 0
        leads:
          type: number
          description: The number of leads from this trigger method
          default: 0
        sales:
          type: number
          description: The number of sales from this trigger method
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this trigger method, in cents
          default: 0
      required:
        - trigger
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsOS:
      type: object
      properties:
        os:
          type: string
          description: The name of the OS
        clicks:
          type: number
          description: The number of clicks from this OS
          default: 0
        leads:
          type: number
          description: The number of leads from this OS
          default: 0
        sales:
          type: number
          description: The number of sales from this OS
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this OS, in cents
          default: 0
      required:
        - os
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsBrowsers:
      type: object
      properties:
        browser:
          type: string
          description: The name of the browser
        clicks:
          type: number
          description: The number of clicks from this browser
          default: 0
        leads:
          type: number
          description: The number of leads from this browser
          default: 0
        sales:
          type: number
          description: The number of sales from this browser
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this browser, in cents
          default: 0
      required:
        - browser
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsDevices:
      type: object
      properties:
        device:
          type: string
          description: The name of the device
        clicks:
          type: number
          description: The number of clicks from this device
          default: 0
        leads:
          type: number
          description: The number of leads from this device
          default: 0
        sales:
          type: number
          description: The number of sales from this device
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this device, in cents
          default: 0
      required:
        - device
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsCities:
      type: object
      properties:
        city:
          type: string
          description: The name of the city
        country:
          type: string
          enum:
            - AF
            - AL
            - DZ
            - AS
            - AD
            - AO
            - AI
            - AQ
            - AG
            - AR
            - AM
            - AW
            - AU
            - AT
            - AZ
            - BS
            - BH
            - BD
            - BB
            - BY
            - BE
            - BZ
            - BJ
            - BM
            - BT
            - BO
            - BA
            - BW
            - BV
            - BR
            - IO
            - BN
            - BG
            - BF
            - BI
            - KH
            - CM
            - CA
            - CV
            - KY
            - CF
            - TD
            - CL
            - CN
            - CX
            - CC
            - CO
            - KM
            - CG
            - CD
            - CK
            - CR
            - CI
            - HR
            - CU
            - CY
            - CZ
            - DK
            - DJ
            - DM
            - DO
            - EC
            - EG
            - SV
            - GQ
            - ER
            - EE
            - ET
            - FK
            - FO
            - FJ
            - FI
            - FR
            - GF
            - PF
            - TF
            - GA
            - GM
            - GE
            - DE
            - GH
            - GI
            - GR
            - GL
            - GD
            - GP
            - GU
            - GT
            - GN
            - GW
            - GY
            - HT
            - HM
            - VA
            - HN
            - HK
            - HU
            - IS
            - IN
            - ID
            - IR
            - IQ
            - IE
            - IL
            - IT
            - JM
            - JP
            - JO
            - KZ
            - KE
            - KI
            - KP
            - KR
            - KW
            - KG
            - LA
            - LV
            - LB
            - LS
            - LR
            - LY
            - LI
            - LT
            - LU
            - MO
            - MG
            - MW
            - MY
            - MV
            - ML
            - MT
            - MH
            - MQ
            - MR
            - MU
            - YT
            - MX
            - FM
            - MD
            - MC
            - MN
            - MS
            - MA
            - MZ
            - MM
            - NA
            - NR
            - NP
            - NL
            - NC
            - NZ
            - NI
            - NE
            - NG
            - NU
            - NF
            - MK
            - MP
            - 'NO'
            - OM
            - PK
            - PW
            - PS
            - PA
            - PG
            - PY
            - PE
            - PH
            - PN
            - PL
            - PT
            - PR
            - QA
            - RE
            - RO
            - RU
            - RW
            - SH
            - KN
            - LC
            - PM
            - VC
            - WS
            - SM
            - ST
            - SA
            - SN
            - SC
            - SL
            - SG
            - SK
            - SI
            - SB
            - SO
            - ZA
            - GS
            - ES
            - LK
            - SD
            - SR
            - SJ
            - SZ
            - SE
            - CH
            - SY
            - TW
            - TJ
            - TZ
            - TH
            - TL
            - TG
            - TK
            - TO
            - TT
            - TN
            - TR
            - TM
            - TC
            - TV
            - UG
            - UA
            - AE
            - GB
            - US
            - UM
            - UY
            - UZ
            - VU
            - VE
            - VN
            - VG
            - VI
            - WF
            - EH
            - YE
            - ZM
            - ZW
            - AX
            - BQ
            - CW
            - GG
            - IM
            - JE
            - ME
            - BL
            - MF
            - RS
            - SX
            - SS
            - XK
          description: 'The 2-letter country code of the city: https://d.to/geo'
        clicks:
          type: number
          description: The number of clicks from this city
          default: 0
        leads:
          type: number
          description: The number of leads from this city
          default: 0
        sales:
          type: number
          description: The number of sales from this city
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this city, in cents
          default: 0
      required:
        - city
        - country
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsCountries:
      type: object
      properties:
        country:
          type: string
          enum:
            - AF
            - AL
            - DZ
            - AS
            - AD
            - AO
            - AI
            - AQ
            - AG
            - AR
            - AM
            - AW
            - AU
            - AT
            - AZ
            - BS
            - BH
            - BD
            - BB
            - BY
            - BE
            - BZ
            - BJ
            - BM
            - BT
            - BO
            - BA
            - BW
            - BV
            - BR
            - IO
            - BN
            - BG
            - BF
            - BI
            - KH
            - CM
            - CA
            - CV
            - KY
            - CF
            - TD
            - CL
            - CN
            - CX
            - CC
            - CO
            - KM
            - CG
            - CD
            - CK
            - CR
            - CI
            - HR
            - CU
            - CY
            - CZ
            - DK
            - DJ
            - DM
            - DO
            - EC
            - EG
            - SV
            - GQ
            - ER
            - EE
            - ET
            - FK
            - FO
            - FJ
            - FI
            - FR
            - GF
            - PF
            - TF
            - GA
            - GM
            - GE
            - DE
            - GH
            - GI
            - GR
            - GL
            - GD
            - GP
            - GU
            - GT
            - GN
            - GW
            - GY
            - HT
            - HM
            - VA
            - HN
            - HK
            - HU
            - IS
            - IN
            - ID
            - IR
            - IQ
            - IE
            - IL
            - IT
            - JM
            - JP
            - JO
            - KZ
            - KE
            - KI
            - KP
            - KR
            - KW
            - KG
            - LA
            - LV
            - LB
            - LS
            - LR
            - LY
            - LI
            - LT
            - LU
            - MO
            - MG
            - MW
            - MY
            - MV
            - ML
            - MT
            - MH
            - MQ
            - MR
            - MU
            - YT
            - MX
            - FM
            - MD
            - MC
            - MN
            - MS
            - MA
            - MZ
            - MM
            - NA
            - NR
            - NP
            - NL
            - NC
            - NZ
            - NI
            - NE
            - NG
            - NU
            - NF
            - MK
            - MP
            - 'NO'
            - OM
            - PK
            - PW
            - PS
            - PA
            - PG
            - PY
            - PE
            - PH
            - PN
            - PL
            - PT
            - PR
            - QA
            - RE
            - RO
            - RU
            - RW
            - SH
            - KN
            - LC
            - PM
            - VC
            - WS
            - SM
            - ST
            - SA
            - SN
            - SC
            - SL
            - SG
            - SK
            - SI
            - SB
            - SO
            - ZA
            - GS
            - ES
            - LK
            - SD
            - SR
            - SJ
            - SZ
            - SE
            - CH
            - SY
            - TW
            - TJ
            - TZ
            - TH
            - TL
            - TG
            - TK
            - TO
            - TT
            - TN
            - TR
            - TM
            - TC
            - TV
            - UG
            - UA
            - AE
            - GB
            - US
            - UM
            - UY
            - UZ
            - VU
            - VE
            - VN
            - VG
            - VI
            - WF
            - EH
            - YE
            - ZM
            - ZW
            - AX
            - BQ
            - CW
            - GG
            - IM
            - JE
            - ME
            - BL
            - MF
            - RS
            - SX
            - SS
            - XK
          description: 'The 2-letter ISO 3166-1 country code for the country associated with the location of the user. Learn more: https://d.to/geo'
        city:
          type: string
          enum:
            - '*'
          default: '*'
        clicks:
          type: number
          description: The number of clicks from this country
          default: 0
        leads:
          type: number
          description: The number of leads from this country
          default: 0
        sales:
          type: number
          description: The number of sales from this country
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this country, in cents
          default: 0
      required:
        - country
        - city
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsContinents:
      type: object
      properties:
        continent:
          type: string
          enum:
            - AF
            - AN
            - AS
            - EU
            - NA
            - OC
            - SA
          description: The 2-letter ISO 3166-1 code representing the continent associated with the location of the user.
        clicks:
          type: number
          description: The number of clicks from this continent
          default: 0
        leads:
          type: number
          description: The number of leads from this continent
          default: 0
        sales:
          type: number
          description: The number of sales from this continent
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales from this continent, in cents
          default: 0
      required:
        - continent
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsTimeseries:
      type: object
      properties:
        start:
          type: string
          description: The starting timestamp of the interval
        clicks:
          type: number
          description: The number of clicks in the interval
          default: 0
        leads:
          type: number
          description: The number of leads in the interval
          default: 0
        sales:
          type: number
          description: The number of sales in the interval
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales in the interval, in cents
          default: 0
      required:
        - start
        - clicks
        - leads
        - sales
        - saleAmount
    AnalyticsCount:
      type: object
      properties:
        clicks:
          type: number
          description: The total number of clicks
          default: 0
        leads:
          type: number
          description: The total number of leads
          default: 0
        sales:
          type: number
          description: The total number of sales
          default: 0
        saleAmount:
          type: number
          description: The total amount of sales, in cents
          default: 0
      required:
        - clicks
        - leads
        - sales
        - saleAmount
      title: AnalyticsCount
    continentCode:
      type: string
      enum:
        - AF
        - AN
        - AS
        - EU
        - NA
        - OC
        - SA
      description: The continent to retrieve analytics for.
    regionCode:
      type: string
      description: The ISO 3166-2 region code to retrieve analytics for.
    countryCode:
      type: string
      enum:
        - AF
        - AL
        - DZ
        - AS
        - AD
        - AO
        - AI
        - AQ
        - AG
        - AR
        - AM
        - AW
        - AU
        - AT
        - AZ
        - BS
        - BH
        - BD
        - BB
        - BY
        - BE
        - BZ
        - BJ
        - BM
        - BT
        - BO
        - BA
        - BW
        - BV
        - BR
        - IO
        - BN
        - BG
        - BF
        - BI
        - KH
        - CM
        - CA
        - CV
        - KY
        - CF
        - TD
        - CL
        - CN
        - CX
        - CC
        - CO
        - KM
        - CG
        - CD
        - CK
        - CR
        - CI
        - HR
        - CU
        - CY
        - CZ
        - DK
        - DJ
        - DM
        - DO
        - EC
        - EG
        - SV
        - GQ
        - ER
        - EE
        - ET
        - FK
        - FO
        - FJ
        - FI
        - FR
        - GF
        - PF
        - TF
        - GA
        - GM
        - GE
        - DE
        - GH
        - GI
        - GR
        - GL
        - GD
        - GP
        - GU
        - GT
        - GN
        - GW
        - GY
        - HT
        - HM
        - VA
        - HN
        - HK
        - HU
        - IS
        - IN
        - ID
        - IR
        - IQ
        - IE
        - IL
        - IT
        - JM
        - JP
        - JO
        - KZ
        - KE
        - KI
        - KP
        - KR
        - KW
        - KG
        - LA
        - LV
        - LB
        - LS
        - LR
        - LY
        - LI
        - LT
        - LU
        - MO
        - MG
        - MW
        - MY
        - MV
        - ML
        - MT
        - MH
        - MQ
        - MR
        - MU
        - YT
        - MX
        - FM
        - MD
        - MC
        - MN
        - MS
        - MA
        - MZ
        - MM
        - NA
        - NR
        - NP
        - NL
        - NC
        - NZ
        - NI
        - NE
        - NG
        - NU
        - NF
        - MK
        - MP
        - 'NO'
        - OM
        - PK
        - PW
        - PS
        - PA
        - PG
        - PY
        - PE
        - PH
        - PN
        - PL
        - PT
        - PR
        - QA
        - RE
        - RO
        - RU
        - RW
        - SH
        - KN
        - LC
        - PM
        - VC
        - WS
        - SM
        - ST
        - SA
        - SN
        - SC
        - SL
        - SG
        - SK
        - SI
        - SB
        - SO
        - ZA
        - GS
        - ES
        - LK
        - SD
        - SR
        - SJ
        - SZ
        - SE
        - CH
        - SY
        - TW
        - TJ
        - TZ
        - TH
        - TL
        - TG
        - TK
        - TO
        - TT
        - TN
        - TR
        - TM
        - TC
        - TV
        - UG
        - UA
        - AE
        - GB
        - US
        - UM
        - UY
        - UZ
        - VU
        - VE
        - VN
        - VG
        - VI
        - WF
        - EH
        - YE
        - ZM
        - ZW
        - AX
        - BQ
        - CW
        - GG
        - IM
        - JE
        - ME
        - BL
        - MF
        - RS
        - SX
        - SS
        - XK
      description: The country to retrieve analytics for.

---
Let me break down the implementation step by step:

1. First, we need to define all the types for the request parameters and response types based on the OpenAPI schema.

2. The request parameters are all optional query parameters with specific types and enums.

3. The response can be one of many different types (AnalyticsCount, AnalyticsTimeseries[], etc.), so we'll create a union type for all possible responses.

4. We'll add a new method to the ExampleClient class that:
   - Takes all the query parameters as an object
   - Makes a GET request to /analytics
   - Handles the response and returns the appropriate type
   - Includes error handling

Here's the implementation:

```typescript
// ... existing code ...

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

// Add to ExampleClient class
export class ExampleClient {
  // ... existing code ...

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
}
```