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
  /events:
    get:
      operationId: listEvents
      x-speakeasy-name-override: list
      summary: Retrieve a list of events
      description: Retrieve a paginated list of events for the authenticated workspace.
      tags:
        - Events
      parameters:
        - in: query
          name: event
          description: The type of event to retrieve analytics for. Defaults to 'clicks'.
          schema:
            type: string
            enum:
              - clicks
              - leads
              - sales
            default: clicks
            description: The type of event to retrieve analytics for. Defaults to 'clicks'.
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
          description: The interval to retrieve events for. Takes precedence over start and end. If undefined, defaults to 24h.
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
            default: 24h
            description: The interval to retrieve events for. Takes precedence over start and end. If undefined, defaults to 24h.
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
        - in: query
          name: page
          schema:
            type: number
            default: 1
        - in: query
          name: limit
          schema:
            type: number
            default: 100
        - in: query
          name: order
          schema:
            type: string
            enum:
              - asc
              - desc
            default: desc
        - in: query
          name: sortBy
          schema:
            type: string
            enum:
              - timestamp
            default: timestamp
      responses:
        '200':
          description: A list of events
          content:
            application/json:
              schema:
                anyOf:
                  - type: array
                    items:
                      $ref: '#/components/schemas/ClickEvent'
                    title: ClickEvents
                  - type: array
                    items:
                      $ref: '#/components/schemas/LeadEvent'
                    title: LeadEvents
                  - type: array
                    items:
                      $ref: '#/components/schemas/SaleEvent'
                    title: SaleEvents
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
    SaleEvent:
      type: object
      properties:
        event:
          type: string
          enum:
            - sale
        timestamp:
          type: string
        eventId:
          type: string
        eventName:
          type: string
        link:
          type: object
          properties:
            id:
              type: string
              description: The unique ID of the short link.
            domain:
              type: string
              description: The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
            key:
              type: string
              description: The short link slug. If not provided, a random 7-character slug will be generated.
            url:
              type: string
            trackConversion:
              type: boolean
            externalId:
              type: string
              nullable: true
              description: This is the ID of the link in your database that is unique across your workspace. If set, it can be used to identify the link in future API requests. Must be prefixed with 'ext_' when passed as a query parameter.
            archived:
              type: boolean
            expiresAt:
              type: string
            expiredUrl:
              type: string
              nullable: true
            password:
              type: string
              nullable: true
              description: The password required to access the destination URL of the short link.
            proxy:
              type: boolean
            title:
              type: string
              nullable: true
              description: The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            description:
              type: string
              nullable: true
              description: The description of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            image:
              type: string
              nullable: true
              description: The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            video:
              type: string
              nullable: true
              description: 'The custom link preview video (og:video). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og'
            rewrite:
              type: boolean
            doIndex:
              type: boolean
            ios:
              type: string
              nullable: true
              description: The iOS destination URL for the short link for iOS device targeting.
            android:
              type: string
              nullable: true
              description: The Android destination URL for the short link for Android device targeting.
            geo:
              type: object
              nullable: true
              properties:
                AF:
                  type: string
                  format: uri
                AL:
                  type: string
                  format: uri
                DZ:
                  type: string
                  format: uri
                AS:
                  type: string
                  format: uri
                AD:
                  type: string
                  format: uri
                AO:
                  type: string
                  format: uri
                AI:
                  type: string
                  format: uri
                AQ:
                  type: string
                  format: uri
                AG:
                  type: string
                  format: uri
                AR:
                  type: string
                  format: uri
                AM:
                  type: string
                  format: uri
                AW:
                  type: string
                  format: uri
                AU:
                  type: string
                  format: uri
                AT:
                  type: string
                  format: uri
                AZ:
                  type: string
                  format: uri
                BS:
                  type: string
                  format: uri
                BH:
                  type: string
                  format: uri
                BD:
                  type: string
                  format: uri
                BB:
                  type: string
                  format: uri
                BY:
                  type: string
                  format: uri
                BE:
                  type: string
                  format: uri
                BZ:
                  type: string
                  format: uri
                BJ:
                  type: string
                  format: uri
                BM:
                  type: string
                  format: uri
                BT:
                  type: string
                  format: uri
                BO:
                  type: string
                  format: uri
                BA:
                  type: string
                  format: uri
                BW:
                  type: string
                  format: uri
                BV:
                  type: string
                  format: uri
                BR:
                  type: string
                  format: uri
                IO:
                  type: string
                  format: uri
                BN:
                  type: string
                  format: uri
                BG:
                  type: string
                  format: uri
                BF:
                  type: string
                  format: uri
                BI:
                  type: string
                  format: uri
                KH:
                  type: string
                  format: uri
                CM:
                  type: string
                  format: uri
                CA:
                  type: string
                  format: uri
                CV:
                  type: string
                  format: uri
                KY:
                  type: string
                  format: uri
                CF:
                  type: string
                  format: uri
                TD:
                  type: string
                  format: uri
                CL:
                  type: string
                  format: uri
                CN:
                  type: string
                  format: uri
                CX:
                  type: string
                  format: uri
                CC:
                  type: string
                  format: uri
                CO:
                  type: string
                  format: uri
                KM:
                  type: string
                  format: uri
                CG:
                  type: string
                  format: uri
                CD:
                  type: string
                  format: uri
                CK:
                  type: string
                  format: uri
                CR:
                  type: string
                  format: uri
                CI:
                  type: string
                  format: uri
                HR:
                  type: string
                  format: uri
                CU:
                  type: string
                  format: uri
                CY:
                  type: string
                  format: uri
                CZ:
                  type: string
                  format: uri
                DK:
                  type: string
                  format: uri
                DJ:
                  type: string
                  format: uri
                DM:
                  type: string
                  format: uri
                DO:
                  type: string
                  format: uri
                EC:
                  type: string
                  format: uri
                EG:
                  type: string
                  format: uri
                SV:
                  type: string
                  format: uri
                GQ:
                  type: string
                  format: uri
                ER:
                  type: string
                  format: uri
                EE:
                  type: string
                  format: uri
                ET:
                  type: string
                  format: uri
                FK:
                  type: string
                  format: uri
                FO:
                  type: string
                  format: uri
                FJ:
                  type: string
                  format: uri
                FI:
                  type: string
                  format: uri
                FR:
                  type: string
                  format: uri
                GF:
                  type: string
                  format: uri
                PF:
                  type: string
                  format: uri
                TF:
                  type: string
                  format: uri
                GA:
                  type: string
                  format: uri
                GM:
                  type: string
                  format: uri
                GE:
                  type: string
                  format: uri
                DE:
                  type: string
                  format: uri
                GH:
                  type: string
                  format: uri
                GI:
                  type: string
                  format: uri
                GR:
                  type: string
                  format: uri
                GL:
                  type: string
                  format: uri
                GD:
                  type: string
                  format: uri
                GP:
                  type: string
                  format: uri
                GU:
                  type: string
                  format: uri
                GT:
                  type: string
                  format: uri
                GN:
                  type: string
                  format: uri
                GW:
                  type: string
                  format: uri
                GY:
                  type: string
                  format: uri
                HT:
                  type: string
                  format: uri
                HM:
                  type: string
                  format: uri
                VA:
                  type: string
                  format: uri
                HN:
                  type: string
                  format: uri
                HK:
                  type: string
                  format: uri
                HU:
                  type: string
                  format: uri
                IS:
                  type: string
                  format: uri
                IN:
                  type: string
                  format: uri
                ID:
                  type: string
                  format: uri
                IR:
                  type: string
                  format: uri
                IQ:
                  type: string
                  format: uri
                IE:
                  type: string
                  format: uri
                IL:
                  type: string
                  format: uri
                IT:
                  type: string
                  format: uri
                JM:
                  type: string
                  format: uri
                JP:
                  type: string
                  format: uri
                JO:
                  type: string
                  format: uri
                KZ:
                  type: string
                  format: uri
                KE:
                  type: string
                  format: uri
                KI:
                  type: string
                  format: uri
                KP:
                  type: string
                  format: uri
                KR:
                  type: string
                  format: uri
                KW:
                  type: string
                  format: uri
                KG:
                  type: string
                  format: uri
                LA:
                  type: string
                  format: uri
                LV:
                  type: string
                  format: uri
                LB:
                  type: string
                  format: uri
                LS:
                  type: string
                  format: uri
                LR:
                  type: string
                  format: uri
                LY:
                  type: string
                  format: uri
                LI:
                  type: string
                  format: uri
                LT:
                  type: string
                  format: uri
                LU:
                  type: string
                  format: uri
                MO:
                  type: string
                  format: uri
                MG:
                  type: string
                  format: uri
                MW:
                  type: string
                  format: uri
                MY:
                  type: string
                  format: uri
                MV:
                  type: string
                  format: uri
                ML:
                  type: string
                  format: uri
                MT:
                  type: string
                  format: uri
                MH:
                  type: string
                  format: uri
                MQ:
                  type: string
                  format: uri
                MR:
                  type: string
                  format: uri
                MU:
                  type: string
                  format: uri
                YT:
                  type: string
                  format: uri
                MX:
                  type: string
                  format: uri
                FM:
                  type: string
                  format: uri
                MD:
                  type: string
                  format: uri
                MC:
                  type: string
                  format: uri
                MN:
                  type: string
                  format: uri
                MS:
                  type: string
                  format: uri
                MA:
                  type: string
                  format: uri
                MZ:
                  type: string
                  format: uri
                MM:
                  type: string
                  format: uri
                NA:
                  type: string
                  format: uri
                NR:
                  type: string
                  format: uri
                NP:
                  type: string
                  format: uri
                NL:
                  type: string
                  format: uri
                NC:
                  type: string
                  format: uri
                NZ:
                  type: string
                  format: uri
                NI:
                  type: string
                  format: uri
                NE:
                  type: string
                  format: uri
                NG:
                  type: string
                  format: uri
                NU:
                  type: string
                  format: uri
                NF:
                  type: string
                  format: uri
                MK:
                  type: string
                  format: uri
                MP:
                  type: string
                  format: uri
                'NO':
                  type: string
                  format: uri
                OM:
                  type: string
                  format: uri
                PK:
                  type: string
                  format: uri
                PW:
                  type: string
                  format: uri
                PS:
                  type: string
                  format: uri
                PA:
                  type: string
                  format: uri
                PG:
                  type: string
                  format: uri
                PY:
                  type: string
                  format: uri
                PE:
                  type: string
                  format: uri
                PH:
                  type: string
                  format: uri
                PN:
                  type: string
                  format: uri
                PL:
                  type: string
                  format: uri
                PT:
                  type: string
                  format: uri
                PR:
                  type: string
                  format: uri
                QA:
                  type: string
                  format: uri
                RE:
                  type: string
                  format: uri
                RO:
                  type: string
                  format: uri
                RU:
                  type: string
                  format: uri
                RW:
                  type: string
                  format: uri
                SH:
                  type: string
                  format: uri
                KN:
                  type: string
                  format: uri
                LC:
                  type: string
                  format: uri
                PM:
                  type: string
                  format: uri
                VC:
                  type: string
                  format: uri
                WS:
                  type: string
                  format: uri
                SM:
                  type: string
                  format: uri
                ST:
                  type: string
                  format: uri
                SA:
                  type: string
                  format: uri
                SN:
                  type: string
                  format: uri
                SC:
                  type: string
                  format: uri
                SL:
                  type: string
                  format: uri
                SG:
                  type: string
                  format: uri
                SK:
                  type: string
                  format: uri
                SI:
                  type: string
                  format: uri
                SB:
                  type: string
                  format: uri
                SO:
                  type: string
                  format: uri
                ZA:
                  type: string
                  format: uri
                GS:
                  type: string
                  format: uri
                ES:
                  type: string
                  format: uri
                LK:
                  type: string
                  format: uri
                SD:
                  type: string
                  format: uri
                SR:
                  type: string
                  format: uri
                SJ:
                  type: string
                  format: uri
                SZ:
                  type: string
                  format: uri
                SE:
                  type: string
                  format: uri
                CH:
                  type: string
                  format: uri
                SY:
                  type: string
                  format: uri
                TW:
                  type: string
                  format: uri
                TJ:
                  type: string
                  format: uri
                TZ:
                  type: string
                  format: uri
                TH:
                  type: string
                  format: uri
                TL:
                  type: string
                  format: uri
                TG:
                  type: string
                  format: uri
                TK:
                  type: string
                  format: uri
                TO:
                  type: string
                  format: uri
                TT:
                  type: string
                  format: uri
                TN:
                  type: string
                  format: uri
                TR:
                  type: string
                  format: uri
                TM:
                  type: string
                  format: uri
                TC:
                  type: string
                  format: uri
                TV:
                  type: string
                  format: uri
                UG:
                  type: string
                  format: uri
                UA:
                  type: string
                  format: uri
                AE:
                  type: string
                  format: uri
                GB:
                  type: string
                  format: uri
                US:
                  type: string
                  format: uri
                UM:
                  type: string
                  format: uri
                UY:
                  type: string
                  format: uri
                UZ:
                  type: string
                  format: uri
                VU:
                  type: string
                  format: uri
                VE:
                  type: string
                  format: uri
                VN:
                  type: string
                  format: uri
                VG:
                  type: string
                  format: uri
                VI:
                  type: string
                  format: uri
                WF:
                  type: string
                  format: uri
                EH:
                  type: string
                  format: uri
                YE:
                  type: string
                  format: uri
                ZM:
                  type: string
                  format: uri
                ZW:
                  type: string
                  format: uri
                AX:
                  type: string
                  format: uri
                BQ:
                  type: string
                  format: uri
                CW:
                  type: string
                  format: uri
                GG:
                  type: string
                  format: uri
                IM:
                  type: string
                  format: uri
                JE:
                  type: string
                  format: uri
                ME:
                  type: string
                  format: uri
                BL:
                  type: string
                  format: uri
                MF:
                  type: string
                  format: uri
                RS:
                  type: string
                  format: uri
                SX:
                  type: string
                  format: uri
                SS:
                  type: string
                  format: uri
                XK:
                  type: string
                  format: uri
              additionalProperties: false
              description: 'Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`. Learn more: https://d.to/geo'
            publicStats:
              type: boolean
            tagId:
              type: string
              nullable: true
              description: The unique ID of the tag assigned to the short link. This field is deprecated – use `tags` instead.
              deprecated: true
            tags:
              type: array
              nullable: true
              items:
                $ref: '#/components/schemas/TagSchema'
              description: The tags assigned to the short link.
            webhookIds:
              type: array
              items:
                type: string
              description: The IDs of the webhooks that the short link is associated with.
            comments:
              type: string
              nullable: true
              description: The comments for the short link.
            shortLink:
              type: string
              format: uri
              description: The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
            qrCode:
              type: string
              format: uri
              description: The full URL of the QR code for the short link (e.g. `https://api.dub.co/qr?url=https://dub.sh/try`).
            utm_source:
              type: string
              nullable: true
              description: The UTM source of the short link.
            utm_medium:
              type: string
              nullable: true
              description: The UTM medium of the short link.
            utm_campaign:
              type: string
              nullable: true
              description: The UTM campaign of the short link.
            utm_term:
              type: string
              nullable: true
              description: The UTM term of the short link.
            utm_content:
              type: string
              nullable: true
              description: The UTM content of the short link.
            userId:
              type: string
              nullable: true
            workspaceId:
              type: string
              description: The workspace ID of the short link.
            clicks:
              type: number
              default: 0
              description: The number of clicks on the short link.
            lastClicked:
              type: string
            leads:
              type: number
              default: 0
              description: '[BETA]: The number of leads the short links has generated.'
            sales:
              type: number
              default: 0
              description: '[BETA]: The number of sales the short links has generated.'
            saleAmount:
              type: number
              default: 0
              description: '[BETA]: The total dollar amount of sales the short links has generated (in cents).'
            createdAt:
              type: string
            updatedAt:
              type: string
            projectId:
              type: string
              description: The project ID of the short link. This field is deprecated – use `workspaceId` instead.
              deprecated: true
            programId:
              type: string
              nullable: true
              description: The ID of the program the short link is associated with.
          required:
            - id
            - domain
            - key
            - url
            - externalId
            - expiresAt
            - expiredUrl
            - password
            - title
            - description
            - image
            - video
            - ios
            - android
            - geo
            - tagId
            - tags
            - webhookIds
            - comments
            - shortLink
            - qrCode
            - utm_source
            - utm_medium
            - utm_campaign
            - utm_term
            - utm_content
            - userId
            - workspaceId
            - clicks
            - lastClicked
            - leads
            - sales
            - saleAmount
            - createdAt
            - updatedAt
            - projectId
            - programId
        click:
          type: object
          properties:
            id:
              type: string
            url:
              type: string
            country:
              type: string
            city:
              type: string
            region:
              type: string
            continent:
              type: string
            device:
              type: string
            browser:
              type: string
            os:
              type: string
            referer:
              type: string
            refererUrl:
              type: string
            qr:
              type: boolean
            ip:
              type: string
          required:
            - id
            - url
            - country
            - city
            - region
            - continent
            - device
            - browser
            - os
            - referer
            - refererUrl
            - ip
        customer:
          type: object
          properties:
            id:
              type: string
              description: The unique identifier of the customer in Dub.
            externalId:
              type: string
              description: Unique identifier for the customer in the client's app.
            name:
              type: string
              description: Name of the customer.
            email:
              type: string
              nullable: true
              description: Email of the customer.
            avatar:
              type: string
              nullable: true
              description: Avatar URL of the customer.
            country:
              type: string
              nullable: true
              description: Country of the customer.
            createdAt:
              type: string
              description: The date the customer was created.
            link:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                  description: The unique ID of the short link.
                domain:
                  type: string
                  description: The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
                key:
                  type: string
                  description: The short link slug. If not provided, a random 7-character slug will be generated.
                shortLink:
                  type: string
                  format: uri
                  description: The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
                programId:
                  type: string
                  nullable: true
                  description: The ID of the program the short link is associated with.
              required:
                - id
                - domain
                - key
                - shortLink
                - programId
            partner:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                name:
                  type: string
                email:
                  type: string
                image:
                  type: string
                  nullable: true
              required:
                - id
                - name
                - email
            discount:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                couponId:
                  type: string
                  nullable: true
                couponTestId:
                  type: string
                  nullable: true
                amount:
                  type: number
                type:
                  type: string
                  enum:
                    - percentage
                    - flat
                duration:
                  type: number
                  nullable: true
                interval:
                  type: string
                  nullable: true
                  enum:
                    - month
                    - year
                    - null
              required:
                - id
                - couponId
                - couponTestId
                - amount
                - type
                - duration
                - interval
          required:
            - id
            - externalId
            - name
            - createdAt
        sale:
          type: object
          properties:
            amount:
              type: integer
              minimum: 0
              description: The amount of the sale. Should be passed in cents.
            invoiceId:
              type: string
              nullable: true
              default: null
              description: The invoice ID of the sale.
            paymentProcessor:
              type: string
              enum:
                - stripe
                - shopify
                - paddle
              description: The payment processor via which the sale was made.
          required:
            - amount
            - invoiceId
            - paymentProcessor
        saleAmount:
          type: number
          description: Deprecated. Use `sale.amount` instead.
          deprecated: true
        invoice_id:
          type: string
          description: Deprecated. Use `sale.invoiceId` instead.
          deprecated: true
        payment_processor:
          type: string
          description: Deprecated. Use `sale.paymentProcessor` instead.
        click_id:
          type: string
          description: Deprecated. Use `click.id` instead.
          deprecated: true
        link_id:
          type: string
          description: Deprecated. Use `link.id` instead.
          deprecated: true
        domain:
          type: string
          description: Deprecated. Use `link.domain` instead.
          deprecated: true
        key:
          type: string
          description: Deprecated. Use `link.key` instead.
          deprecated: true
        url:
          type: string
          description: Deprecated. Use `click.url` instead.
          deprecated: true
        continent:
          type: string
          description: Deprecated. Use `click.continent` instead.
          deprecated: true
        country:
          type: string
          description: Deprecated. Use `click.country` instead.
          deprecated: true
        city:
          type: string
          description: Deprecated. Use `click.city` instead.
          deprecated: true
        device:
          type: string
          description: Deprecated. Use `click.device` instead.
          deprecated: true
        browser:
          type: string
          description: Deprecated. Use `click.browser` instead.
          deprecated: true
        os:
          type: string
          description: Deprecated. Use `click.os` instead.
          deprecated: true
        qr:
          type: number
          description: Deprecated. Use `click.qr` instead.
          deprecated: true
        ip:
          type: string
          description: Deprecated. Use `click.ip` instead.
          deprecated: true
      required:
        - event
        - eventId
        - eventName
        - link
        - click
        - customer
        - sale
        - saleAmount
        - invoice_id
        - payment_processor
        - click_id
        - link_id
        - domain
        - key
        - url
        - continent
        - country
        - city
        - device
        - browser
        - os
        - qr
        - ip
    TagSchema:
      type: object
      properties:
        id:
          type: string
          description: The unique ID of the tag.
        name:
          type: string
          description: The name of the tag.
        color:
          type: string
          enum:
            - red
            - yellow
            - green
            - blue
            - purple
            - pink
            - brown
          description: The color of the tag.
      required:
        - id
        - name
        - color
      title: Tag
    LeadEvent:
      type: object
      properties:
        event:
          type: string
          enum:
            - lead
        timestamp:
          type: string
        eventId:
          type: string
        eventName:
          type: string
        click:
          type: object
          properties:
            id:
              type: string
            url:
              type: string
            country:
              type: string
            city:
              type: string
            region:
              type: string
            continent:
              type: string
            device:
              type: string
            browser:
              type: string
            os:
              type: string
            referer:
              type: string
            refererUrl:
              type: string
            qr:
              type: boolean
            ip:
              type: string
          required:
            - id
            - url
            - country
            - city
            - region
            - continent
            - device
            - browser
            - os
            - referer
            - refererUrl
            - ip
        link:
          type: object
          properties:
            id:
              type: string
              description: The unique ID of the short link.
            domain:
              type: string
              description: The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
            key:
              type: string
              description: The short link slug. If not provided, a random 7-character slug will be generated.
            url:
              type: string
            trackConversion:
              type: boolean
            externalId:
              type: string
              nullable: true
              description: This is the ID of the link in your database that is unique across your workspace. If set, it can be used to identify the link in future API requests. Must be prefixed with 'ext_' when passed as a query parameter.
            archived:
              type: boolean
            expiresAt:
              type: string
            expiredUrl:
              type: string
              nullable: true
            password:
              type: string
              nullable: true
              description: The password required to access the destination URL of the short link.
            proxy:
              type: boolean
            title:
              type: string
              nullable: true
              description: The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            description:
              type: string
              nullable: true
              description: The description of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            image:
              type: string
              nullable: true
              description: The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            video:
              type: string
              nullable: true
              description: 'The custom link preview video (og:video). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og'
            rewrite:
              type: boolean
            doIndex:
              type: boolean
            ios:
              type: string
              nullable: true
              description: The iOS destination URL for the short link for iOS device targeting.
            android:
              type: string
              nullable: true
              description: The Android destination URL for the short link for Android device targeting.
            geo:
              type: object
              nullable: true
              properties:
                AF:
                  type: string
                  format: uri
                AL:
                  type: string
                  format: uri
                DZ:
                  type: string
                  format: uri
                AS:
                  type: string
                  format: uri
                AD:
                  type: string
                  format: uri
                AO:
                  type: string
                  format: uri
                AI:
                  type: string
                  format: uri
                AQ:
                  type: string
                  format: uri
                AG:
                  type: string
                  format: uri
                AR:
                  type: string
                  format: uri
                AM:
                  type: string
                  format: uri
                AW:
                  type: string
                  format: uri
                AU:
                  type: string
                  format: uri
                AT:
                  type: string
                  format: uri
                AZ:
                  type: string
                  format: uri
                BS:
                  type: string
                  format: uri
                BH:
                  type: string
                  format: uri
                BD:
                  type: string
                  format: uri
                BB:
                  type: string
                  format: uri
                BY:
                  type: string
                  format: uri
                BE:
                  type: string
                  format: uri
                BZ:
                  type: string
                  format: uri
                BJ:
                  type: string
                  format: uri
                BM:
                  type: string
                  format: uri
                BT:
                  type: string
                  format: uri
                BO:
                  type: string
                  format: uri
                BA:
                  type: string
                  format: uri
                BW:
                  type: string
                  format: uri
                BV:
                  type: string
                  format: uri
                BR:
                  type: string
                  format: uri
                IO:
                  type: string
                  format: uri
                BN:
                  type: string
                  format: uri
                BG:
                  type: string
                  format: uri
                BF:
                  type: string
                  format: uri
                BI:
                  type: string
                  format: uri
                KH:
                  type: string
                  format: uri
                CM:
                  type: string
                  format: uri
                CA:
                  type: string
                  format: uri
                CV:
                  type: string
                  format: uri
                KY:
                  type: string
                  format: uri
                CF:
                  type: string
                  format: uri
                TD:
                  type: string
                  format: uri
                CL:
                  type: string
                  format: uri
                CN:
                  type: string
                  format: uri
                CX:
                  type: string
                  format: uri
                CC:
                  type: string
                  format: uri
                CO:
                  type: string
                  format: uri
                KM:
                  type: string
                  format: uri
                CG:
                  type: string
                  format: uri
                CD:
                  type: string
                  format: uri
                CK:
                  type: string
                  format: uri
                CR:
                  type: string
                  format: uri
                CI:
                  type: string
                  format: uri
                HR:
                  type: string
                  format: uri
                CU:
                  type: string
                  format: uri
                CY:
                  type: string
                  format: uri
                CZ:
                  type: string
                  format: uri
                DK:
                  type: string
                  format: uri
                DJ:
                  type: string
                  format: uri
                DM:
                  type: string
                  format: uri
                DO:
                  type: string
                  format: uri
                EC:
                  type: string
                  format: uri
                EG:
                  type: string
                  format: uri
                SV:
                  type: string
                  format: uri
                GQ:
                  type: string
                  format: uri
                ER:
                  type: string
                  format: uri
                EE:
                  type: string
                  format: uri
                ET:
                  type: string
                  format: uri
                FK:
                  type: string
                  format: uri
                FO:
                  type: string
                  format: uri
                FJ:
                  type: string
                  format: uri
                FI:
                  type: string
                  format: uri
                FR:
                  type: string
                  format: uri
                GF:
                  type: string
                  format: uri
                PF:
                  type: string
                  format: uri
                TF:
                  type: string
                  format: uri
                GA:
                  type: string
                  format: uri
                GM:
                  type: string
                  format: uri
                GE:
                  type: string
                  format: uri
                DE:
                  type: string
                  format: uri
                GH:
                  type: string
                  format: uri
                GI:
                  type: string
                  format: uri
                GR:
                  type: string
                  format: uri
                GL:
                  type: string
                  format: uri
                GD:
                  type: string
                  format: uri
                GP:
                  type: string
                  format: uri
                GU:
                  type: string
                  format: uri
                GT:
                  type: string
                  format: uri
                GN:
                  type: string
                  format: uri
                GW:
                  type: string
                  format: uri
                GY:
                  type: string
                  format: uri
                HT:
                  type: string
                  format: uri
                HM:
                  type: string
                  format: uri
                VA:
                  type: string
                  format: uri
                HN:
                  type: string
                  format: uri
                HK:
                  type: string
                  format: uri
                HU:
                  type: string
                  format: uri
                IS:
                  type: string
                  format: uri
                IN:
                  type: string
                  format: uri
                ID:
                  type: string
                  format: uri
                IR:
                  type: string
                  format: uri
                IQ:
                  type: string
                  format: uri
                IE:
                  type: string
                  format: uri
                IL:
                  type: string
                  format: uri
                IT:
                  type: string
                  format: uri
                JM:
                  type: string
                  format: uri
                JP:
                  type: string
                  format: uri
                JO:
                  type: string
                  format: uri
                KZ:
                  type: string
                  format: uri
                KE:
                  type: string
                  format: uri
                KI:
                  type: string
                  format: uri
                KP:
                  type: string
                  format: uri
                KR:
                  type: string
                  format: uri
                KW:
                  type: string
                  format: uri
                KG:
                  type: string
                  format: uri
                LA:
                  type: string
                  format: uri
                LV:
                  type: string
                  format: uri
                LB:
                  type: string
                  format: uri
                LS:
                  type: string
                  format: uri
                LR:
                  type: string
                  format: uri
                LY:
                  type: string
                  format: uri
                LI:
                  type: string
                  format: uri
                LT:
                  type: string
                  format: uri
                LU:
                  type: string
                  format: uri
                MO:
                  type: string
                  format: uri
                MG:
                  type: string
                  format: uri
                MW:
                  type: string
                  format: uri
                MY:
                  type: string
                  format: uri
                MV:
                  type: string
                  format: uri
                ML:
                  type: string
                  format: uri
                MT:
                  type: string
                  format: uri
                MH:
                  type: string
                  format: uri
                MQ:
                  type: string
                  format: uri
                MR:
                  type: string
                  format: uri
                MU:
                  type: string
                  format: uri
                YT:
                  type: string
                  format: uri
                MX:
                  type: string
                  format: uri
                FM:
                  type: string
                  format: uri
                MD:
                  type: string
                  format: uri
                MC:
                  type: string
                  format: uri
                MN:
                  type: string
                  format: uri
                MS:
                  type: string
                  format: uri
                MA:
                  type: string
                  format: uri
                MZ:
                  type: string
                  format: uri
                MM:
                  type: string
                  format: uri
                NA:
                  type: string
                  format: uri
                NR:
                  type: string
                  format: uri
                NP:
                  type: string
                  format: uri
                NL:
                  type: string
                  format: uri
                NC:
                  type: string
                  format: uri
                NZ:
                  type: string
                  format: uri
                NI:
                  type: string
                  format: uri
                NE:
                  type: string
                  format: uri
                NG:
                  type: string
                  format: uri
                NU:
                  type: string
                  format: uri
                NF:
                  type: string
                  format: uri
                MK:
                  type: string
                  format: uri
                MP:
                  type: string
                  format: uri
                'NO':
                  type: string
                  format: uri
                OM:
                  type: string
                  format: uri
                PK:
                  type: string
                  format: uri
                PW:
                  type: string
                  format: uri
                PS:
                  type: string
                  format: uri
                PA:
                  type: string
                  format: uri
                PG:
                  type: string
                  format: uri
                PY:
                  type: string
                  format: uri
                PE:
                  type: string
                  format: uri
                PH:
                  type: string
                  format: uri
                PN:
                  type: string
                  format: uri
                PL:
                  type: string
                  format: uri
                PT:
                  type: string
                  format: uri
                PR:
                  type: string
                  format: uri
                QA:
                  type: string
                  format: uri
                RE:
                  type: string
                  format: uri
                RO:
                  type: string
                  format: uri
                RU:
                  type: string
                  format: uri
                RW:
                  type: string
                  format: uri
                SH:
                  type: string
                  format: uri
                KN:
                  type: string
                  format: uri
                LC:
                  type: string
                  format: uri
                PM:
                  type: string
                  format: uri
                VC:
                  type: string
                  format: uri
                WS:
                  type: string
                  format: uri
                SM:
                  type: string
                  format: uri
                ST:
                  type: string
                  format: uri
                SA:
                  type: string
                  format: uri
                SN:
                  type: string
                  format: uri
                SC:
                  type: string
                  format: uri
                SL:
                  type: string
                  format: uri
                SG:
                  type: string
                  format: uri
                SK:
                  type: string
                  format: uri
                SI:
                  type: string
                  format: uri
                SB:
                  type: string
                  format: uri
                SO:
                  type: string
                  format: uri
                ZA:
                  type: string
                  format: uri
                GS:
                  type: string
                  format: uri
                ES:
                  type: string
                  format: uri
                LK:
                  type: string
                  format: uri
                SD:
                  type: string
                  format: uri
                SR:
                  type: string
                  format: uri
                SJ:
                  type: string
                  format: uri
                SZ:
                  type: string
                  format: uri
                SE:
                  type: string
                  format: uri
                CH:
                  type: string
                  format: uri
                SY:
                  type: string
                  format: uri
                TW:
                  type: string
                  format: uri
                TJ:
                  type: string
                  format: uri
                TZ:
                  type: string
                  format: uri
                TH:
                  type: string
                  format: uri
                TL:
                  type: string
                  format: uri
                TG:
                  type: string
                  format: uri
                TK:
                  type: string
                  format: uri
                TO:
                  type: string
                  format: uri
                TT:
                  type: string
                  format: uri
                TN:
                  type: string
                  format: uri
                TR:
                  type: string
                  format: uri
                TM:
                  type: string
                  format: uri
                TC:
                  type: string
                  format: uri
                TV:
                  type: string
                  format: uri
                UG:
                  type: string
                  format: uri
                UA:
                  type: string
                  format: uri
                AE:
                  type: string
                  format: uri
                GB:
                  type: string
                  format: uri
                US:
                  type: string
                  format: uri
                UM:
                  type: string
                  format: uri
                UY:
                  type: string
                  format: uri
                UZ:
                  type: string
                  format: uri
                VU:
                  type: string
                  format: uri
                VE:
                  type: string
                  format: uri
                VN:
                  type: string
                  format: uri
                VG:
                  type: string
                  format: uri
                VI:
                  type: string
                  format: uri
                WF:
                  type: string
                  format: uri
                EH:
                  type: string
                  format: uri
                YE:
                  type: string
                  format: uri
                ZM:
                  type: string
                  format: uri
                ZW:
                  type: string
                  format: uri
                AX:
                  type: string
                  format: uri
                BQ:
                  type: string
                  format: uri
                CW:
                  type: string
                  format: uri
                GG:
                  type: string
                  format: uri
                IM:
                  type: string
                  format: uri
                JE:
                  type: string
                  format: uri
                ME:
                  type: string
                  format: uri
                BL:
                  type: string
                  format: uri
                MF:
                  type: string
                  format: uri
                RS:
                  type: string
                  format: uri
                SX:
                  type: string
                  format: uri
                SS:
                  type: string
                  format: uri
                XK:
                  type: string
                  format: uri
              additionalProperties: false
              description: 'Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`. Learn more: https://d.to/geo'
            publicStats:
              type: boolean
            tagId:
              type: string
              nullable: true
              description: The unique ID of the tag assigned to the short link. This field is deprecated – use `tags` instead.
              deprecated: true
            tags:
              type: array
              nullable: true
              items:
                $ref: '#/components/schemas/TagSchema'
              description: The tags assigned to the short link.
            webhookIds:
              type: array
              items:
                type: string
              description: The IDs of the webhooks that the short link is associated with.
            comments:
              type: string
              nullable: true
              description: The comments for the short link.
            shortLink:
              type: string
              format: uri
              description: The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
            qrCode:
              type: string
              format: uri
              description: The full URL of the QR code for the short link (e.g. `https://api.dub.co/qr?url=https://dub.sh/try`).
            utm_source:
              type: string
              nullable: true
              description: The UTM source of the short link.
            utm_medium:
              type: string
              nullable: true
              description: The UTM medium of the short link.
            utm_campaign:
              type: string
              nullable: true
              description: The UTM campaign of the short link.
            utm_term:
              type: string
              nullable: true
              description: The UTM term of the short link.
            utm_content:
              type: string
              nullable: true
              description: The UTM content of the short link.
            userId:
              type: string
              nullable: true
            workspaceId:
              type: string
              description: The workspace ID of the short link.
            clicks:
              type: number
              default: 0
              description: The number of clicks on the short link.
            lastClicked:
              type: string
            leads:
              type: number
              default: 0
              description: '[BETA]: The number of leads the short links has generated.'
            sales:
              type: number
              default: 0
              description: '[BETA]: The number of sales the short links has generated.'
            saleAmount:
              type: number
              default: 0
              description: '[BETA]: The total dollar amount of sales the short links has generated (in cents).'
            createdAt:
              type: string
            updatedAt:
              type: string
            projectId:
              type: string
              description: The project ID of the short link. This field is deprecated – use `workspaceId` instead.
              deprecated: true
            programId:
              type: string
              nullable: true
              description: The ID of the program the short link is associated with.
          required:
            - id
            - domain
            - key
            - url
            - externalId
            - expiresAt
            - expiredUrl
            - password
            - title
            - description
            - image
            - video
            - ios
            - android
            - geo
            - tagId
            - tags
            - webhookIds
            - comments
            - shortLink
            - qrCode
            - utm_source
            - utm_medium
            - utm_campaign
            - utm_term
            - utm_content
            - userId
            - workspaceId
            - clicks
            - lastClicked
            - leads
            - sales
            - saleAmount
            - createdAt
            - updatedAt
            - projectId
            - programId
        customer:
          type: object
          properties:
            id:
              type: string
              description: The unique identifier of the customer in Dub.
            externalId:
              type: string
              description: Unique identifier for the customer in the client's app.
            name:
              type: string
              description: Name of the customer.
            email:
              type: string
              nullable: true
              description: Email of the customer.
            avatar:
              type: string
              nullable: true
              description: Avatar URL of the customer.
            country:
              type: string
              nullable: true
              description: Country of the customer.
            createdAt:
              type: string
              description: The date the customer was created.
            link:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                  description: The unique ID of the short link.
                domain:
                  type: string
                  description: The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
                key:
                  type: string
                  description: The short link slug. If not provided, a random 7-character slug will be generated.
                shortLink:
                  type: string
                  format: uri
                  description: The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
                programId:
                  type: string
                  nullable: true
                  description: The ID of the program the short link is associated with.
              required:
                - id
                - domain
                - key
                - shortLink
                - programId
            partner:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                name:
                  type: string
                email:
                  type: string
                image:
                  type: string
                  nullable: true
              required:
                - id
                - name
                - email
            discount:
              type: object
              nullable: true
              properties:
                id:
                  type: string
                couponId:
                  type: string
                  nullable: true
                couponTestId:
                  type: string
                  nullable: true
                amount:
                  type: number
                type:
                  type: string
                  enum:
                    - percentage
                    - flat
                duration:
                  type: number
                  nullable: true
                interval:
                  type: string
                  nullable: true
                  enum:
                    - month
                    - year
                    - null
              required:
                - id
                - couponId
                - couponTestId
                - amount
                - type
                - duration
                - interval
          required:
            - id
            - externalId
            - name
            - createdAt
        click_id:
          type: string
          description: Deprecated. Use `click.id` instead.
          deprecated: true
        link_id:
          type: string
          description: Deprecated. Use `link.id` instead.
          deprecated: true
        domain:
          type: string
          description: Deprecated. Use `link.domain` instead.
          deprecated: true
        key:
          type: string
          description: Deprecated. Use `link.key` instead.
          deprecated: true
        url:
          type: string
          description: Deprecated. Use `click.url` instead.
          deprecated: true
        continent:
          type: string
          description: Deprecated. Use `click.continent` instead.
          deprecated: true
        country:
          type: string
          description: Deprecated. Use `click.country` instead.
          deprecated: true
        city:
          type: string
          description: Deprecated. Use `click.city` instead.
          deprecated: true
        device:
          type: string
          description: Deprecated. Use `click.device` instead.
          deprecated: true
        browser:
          type: string
          description: Deprecated. Use `click.browser` instead.
          deprecated: true
        os:
          type: string
          description: Deprecated. Use `click.os` instead.
          deprecated: true
        qr:
          type: number
          description: Deprecated. Use `click.qr` instead.
          deprecated: true
        ip:
          type: string
          description: Deprecated. Use `click.ip` instead.
          deprecated: true
      required:
        - event
        - eventId
        - eventName
        - click
        - link
        - customer
        - click_id
        - link_id
        - domain
        - key
        - url
        - continent
        - country
        - city
        - device
        - browser
        - os
        - qr
        - ip
    ClickEvent:
      type: object
      properties:
        event:
          type: string
          enum:
            - click
        timestamp:
          type: string
        click:
          type: object
          properties:
            id:
              type: string
            url:
              type: string
            country:
              type: string
            city:
              type: string
            region:
              type: string
            continent:
              type: string
            device:
              type: string
            browser:
              type: string
            os:
              type: string
            referer:
              type: string
            refererUrl:
              type: string
            qr:
              type: boolean
            ip:
              type: string
          required:
            - id
            - url
            - country
            - city
            - region
            - continent
            - device
            - browser
            - os
            - referer
            - refererUrl
            - ip
        link:
          type: object
          properties:
            id:
              type: string
              description: The unique ID of the short link.
            domain:
              type: string
              description: The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
            key:
              type: string
              description: The short link slug. If not provided, a random 7-character slug will be generated.
            url:
              type: string
            trackConversion:
              type: boolean
            externalId:
              type: string
              nullable: true
              description: This is the ID of the link in your database that is unique across your workspace. If set, it can be used to identify the link in future API requests. Must be prefixed with 'ext_' when passed as a query parameter.
            archived:
              type: boolean
            expiresAt:
              type: string
            expiredUrl:
              type: string
              nullable: true
            password:
              type: string
              nullable: true
              description: The password required to access the destination URL of the short link.
            proxy:
              type: boolean
            title:
              type: string
              nullable: true
              description: The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            description:
              type: string
              nullable: true
              description: The description of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            image:
              type: string
              nullable: true
              description: The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
            video:
              type: string
              nullable: true
              description: 'The custom link preview video (og:video). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og'
            rewrite:
              type: boolean
            doIndex:
              type: boolean
            ios:
              type: string
              nullable: true
              description: The iOS destination URL for the short link for iOS device targeting.
            android:
              type: string
              nullable: true
              description: The Android destination URL for the short link for Android device targeting.
            geo:
              type: object
              nullable: true
              properties:
                AF:
                  type: string
                  format: uri
                AL:
                  type: string
                  format: uri
                DZ:
                  type: string
                  format: uri
                AS:
                  type: string
                  format: uri
                AD:
                  type: string
                  format: uri
                AO:
                  type: string
                  format: uri
                AI:
                  type: string
                  format: uri
                AQ:
                  type: string
                  format: uri
                AG:
                  type: string
                  format: uri
                AR:
                  type: string
                  format: uri
                AM:
                  type: string
                  format: uri
                AW:
                  type: string
                  format: uri
                AU:
                  type: string
                  format: uri
                AT:
                  type: string
                  format: uri
                AZ:
                  type: string
                  format: uri
                BS:
                  type: string
                  format: uri
                BH:
                  type: string
                  format: uri
                BD:
                  type: string
                  format: uri
                BB:
                  type: string
                  format: uri
                BY:
                  type: string
                  format: uri
                BE:
                  type: string
                  format: uri
                BZ:
                  type: string
                  format: uri
                BJ:
                  type: string
                  format: uri
                BM:
                  type: string
                  format: uri
                BT:
                  type: string
                  format: uri
                BO:
                  type: string
                  format: uri
                BA:
                  type: string
                  format: uri
                BW:
                  type: string
                  format: uri
                BV:
                  type: string
                  format: uri
                BR:
                  type: string
                  format: uri
                IO:
                  type: string
                  format: uri
                BN:
                  type: string
                  format: uri
                BG:
                  type: string
                  format: uri
                BF:
                  type: string
                  format: uri
                BI:
                  type: string
                  format: uri
                KH:
                  type: string
                  format: uri
                CM:
                  type: string
                  format: uri
                CA:
                  type: string
                  format: uri
                CV:
                  type: string
                  format: uri
                KY:
                  type: string
                  format: uri
                CF:
                  type: string
                  format: uri
                TD:
                  type: string
                  format: uri
                CL:
                  type: string
                  format: uri
                CN:
                  type: string
                  format: uri
                CX:
                  type: string
                  format: uri
                CC:
                  type: string
                  format: uri
                CO:
                  type: string
                  format: uri
                KM:
                  type: string
                  format: uri
                CG:
                  type: string
                  format: uri
                CD:
                  type: string
                  format: uri
                CK:
                  type: string
                  format: uri
                CR:
                  type: string
                  format: uri
                CI:
                  type: string
                  format: uri
                HR:
                  type: string
                  format: uri
                CU:
                  type: string
                  format: uri
                CY:
                  type: string
                  format: uri
                CZ:
                  type: string
                  format: uri
                DK:
                  type: string
                  format: uri
                DJ:
                  type: string
                  format: uri
                DM:
                  type: string
                  format: uri
                DO:
                  type: string
                  format: uri
                EC:
                  type: string
                  format: uri
                EG:
                  type: string
                  format: uri
                SV:
                  type: string
                  format: uri
                GQ:
                  type: string
                  format: uri
                ER:
                  type: string
                  format: uri
                EE:
                  type: string
                  format: uri
                ET:
                  type: string
                  format: uri
                FK:
                  type: string
                  format: uri
                FO:
                  type: string
                  format: uri
                FJ:
                  type: string
                  format: uri
                FI:
                  type: string
                  format: uri
                FR:
                  type: string
                  format: uri
                GF:
                  type: string
                  format: uri
                PF:
                  type: string
                  format: uri
                TF:
                  type: string
                  format: uri
                GA:
                  type: string
                  format: uri
                GM:
                  type: string
                  format: uri
                GE:
                  type: string
                  format: uri
                DE:
                  type: string
                  format: uri
                GH:
                  type: string
                  format: uri
                GI:
                  type: string
                  format: uri
                GR:
                  type: string
                  format: uri
                GL:
                  type: string
                  format: uri
                GD:
                  type: string
                  format: uri
                GP:
                  type: string
                  format: uri
                GU:
                  type: string
                  format: uri
                GT:
                  type: string
                  format: uri
                GN:
                  type: string
                  format: uri
                GW:
                  type: string
                  format: uri
                GY:
                  type: string
                  format: uri
                HT:
                  type: string
                  format: uri
                HM:
                  type: string
                  format: uri
                VA:
                  type: string
                  format: uri
                HN:
                  type: string
                  format: uri
                HK:
                  type: string
                  format: uri
                HU:
                  type: string
                  format: uri
                IS:
                  type: string
                  format: uri
                IN:
                  type: string
                  format: uri
                ID:
                  type: string
                  format: uri
                IR:
                  type: string
                  format: uri
                IQ:
                  type: string
                  format: uri
                IE:
                  type: string
                  format: uri
                IL:
                  type: string
                  format: uri
                IT:
                  type: string
                  format: uri
                JM:
                  type: string
                  format: uri
                JP:
                  type: string
                  format: uri
                JO:
                  type: string
                  format: uri
                KZ:
                  type: string
                  format: uri
                KE:
                  type: string
                  format: uri
                KI:
                  type: string
                  format: uri
                KP:
                  type: string
                  format: uri
                KR:
                  type: string
                  format: uri
                KW:
                  type: string
                  format: uri
                KG:
                  type: string
                  format: uri
                LA:
                  type: string
                  format: uri
                LV:
                  type: string
                  format: uri
                LB:
                  type: string
                  format: uri
                LS:
                  type: string
                  format: uri
                LR:
                  type: string
                  format: uri
                LY:
                  type: string
                  format: uri
                LI:
                  type: string
                  format: uri
                LT:
                  type: string
                  format: uri
                LU:
                  type: string
                  format: uri
                MO:
                  type: string
                  format: uri
                MG:
                  type: string
                  format: uri
                MW:
                  type: string
                  format: uri
                MY:
                  type: string
                  format: uri
                MV:
                  type: string
                  format: uri
                ML:
                  type: string
                  format: uri
                MT:
                  type: string
                  format: uri
                MH:
                  type: string
                  format: uri
                MQ:
                  type: string
                  format: uri
                MR:
                  type: string
                  format: uri
                MU:
                  type: string
                  format: uri
                YT:
                  type: string
                  format: uri
                MX:
                  type: string
                  format: uri
                FM:
                  type: string
                  format: uri
                MD:
                  type: string
                  format: uri
                MC:
                  type: string
                  format: uri
                MN:
                  type: string
                  format: uri
                MS:
                  type: string
                  format: uri
                MA:
                  type: string
                  format: uri
                MZ:
                  type: string
                  format: uri
                MM:
                  type: string
                  format: uri
                NA:
                  type: string
                  format: uri
                NR:
                  type: string
                  format: uri
                NP:
                  type: string
                  format: uri
                NL:
                  type: string
                  format: uri
                NC:
                  type: string
                  format: uri
                NZ:
                  type: string
                  format: uri
                NI:
                  type: string
                  format: uri
                NE:
                  type: string
                  format: uri
                NG:
                  type: string
                  format: uri
                NU:
                  type: string
                  format: uri
                NF:
                  type: string
                  format: uri
                MK:
                  type: string
                  format: uri
                MP:
                  type: string
                  format: uri
                'NO':
                  type: string
                  format: uri
                OM:
                  type: string
                  format: uri
                PK:
                  type: string
                  format: uri
                PW:
                  type: string
                  format: uri
                PS:
                  type: string
                  format: uri
                PA:
                  type: string
                  format: uri
                PG:
                  type: string
                  format: uri
                PY:
                  type: string
                  format: uri
                PE:
                  type: string
                  format: uri
                PH:
                  type: string
                  format: uri
                PN:
                  type: string
                  format: uri
                PL:
                  type: string
                  format: uri
                PT:
                  type: string
                  format: uri
                PR:
                  type: string
                  format: uri
                QA:
                  type: string
                  format: uri
                RE:
                  type: string
                  format: uri
                RO:
                  type: string
                  format: uri
                RU:
                  type: string
                  format: uri
                RW:
                  type: string
                  format: uri
                SH:
                  type: string
                  format: uri
                KN:
                  type: string
                  format: uri
                LC:
                  type: string
                  format: uri
                PM:
                  type: string
                  format: uri
                VC:
                  type: string
                  format: uri
                WS:
                  type: string
                  format: uri
                SM:
                  type: string
                  format: uri
                ST:
                  type: string
                  format: uri
                SA:
                  type: string
                  format: uri
                SN:
                  type: string
                  format: uri
                SC:
                  type: string
                  format: uri
                SL:
                  type: string
                  format: uri
                SG:
                  type: string
                  format: uri
                SK:
                  type: string
                  format: uri
                SI:
                  type: string
                  format: uri
                SB:
                  type: string
                  format: uri
                SO:
                  type: string
                  format: uri
                ZA:
                  type: string
                  format: uri
                GS:
                  type: string
                  format: uri
                ES:
                  type: string
                  format: uri
                LK:
                  type: string
                  format: uri
                SD:
                  type: string
                  format: uri
                SR:
                  type: string
                  format: uri
                SJ:
                  type: string
                  format: uri
                SZ:
                  type: string
                  format: uri
                SE:
                  type: string
                  format: uri
                CH:
                  type: string
                  format: uri
                SY:
                  type: string
                  format: uri
                TW:
                  type: string
                  format: uri
                TJ:
                  type: string
                  format: uri
                TZ:
                  type: string
                  format: uri
                TH:
                  type: string
                  format: uri
                TL:
                  type: string
                  format: uri
                TG:
                  type: string
                  format: uri
                TK:
                  type: string
                  format: uri
                TO:
                  type: string
                  format: uri
                TT:
                  type: string
                  format: uri
                TN:
                  type: string
                  format: uri
                TR:
                  type: string
                  format: uri
                TM:
                  type: string
                  format: uri
                TC:
                  type: string
                  format: uri
                TV:
                  type: string
                  format: uri
                UG:
                  type: string
                  format: uri
                UA:
                  type: string
                  format: uri
                AE:
                  type: string
                  format: uri
                GB:
                  type: string
                  format: uri
                US:
                  type: string
                  format: uri
                UM:
                  type: string
                  format: uri
                UY:
                  type: string
                  format: uri
                UZ:
                  type: string
                  format: uri
                VU:
                  type: string
                  format: uri
                VE:
                  type: string
                  format: uri
                VN:
                  type: string
                  format: uri
                VG:
                  type: string
                  format: uri
                VI:
                  type: string
                  format: uri
                WF:
                  type: string
                  format: uri
                EH:
                  type: string
                  format: uri
                YE:
                  type: string
                  format: uri
                ZM:
                  type: string
                  format: uri
                ZW:
                  type: string
                  format: uri
                AX:
                  type: string
                  format: uri
                BQ:
                  type: string
                  format: uri
                CW:
                  type: string
                  format: uri
                GG:
                  type: string
                  format: uri
                IM:
                  type: string
                  format: uri
                JE:
                  type: string
                  format: uri
                ME:
                  type: string
                  format: uri
                BL:
                  type: string
                  format: uri
                MF:
                  type: string
                  format: uri
                RS:
                  type: string
                  format: uri
                SX:
                  type: string
                  format: uri
                SS:
                  type: string
                  format: uri
                XK:
                  type: string
                  format: uri
              additionalProperties: false
              description: 'Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`. Learn more: https://d.to/geo'
            publicStats:
              type: boolean
            tagId:
              type: string
              nullable: true
              description: The unique ID of the tag assigned to the short link. This field is deprecated – use `tags` instead.
              deprecated: true
            tags:
              type: array
              nullable: true
              items:
                $ref: '#/components/schemas/TagSchema'
              description: The tags assigned to the short link.
            webhookIds:
              type: array
              items:
                type: string
              description: The IDs of the webhooks that the short link is associated with.
            comments:
              type: string
              nullable: true
              description: The comments for the short link.
            shortLink:
              type: string
              format: uri
              description: The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
            qrCode:
              type: string
              format: uri
              description: The full URL of the QR code for the short link (e.g. `https://api.dub.co/qr?url=https://dub.sh/try`).
            utm_source:
              type: string
              nullable: true
              description: The UTM source of the short link.
            utm_medium:
              type: string
              nullable: true
              description: The UTM medium of the short link.
            utm_campaign:
              type: string
              nullable: true
              description: The UTM campaign of the short link.
            utm_term:
              type: string
              nullable: true
              description: The UTM term of the short link.
            utm_content:
              type: string
              nullable: true
              description: The UTM content of the short link.
            userId:
              type: string
              nullable: true
            workspaceId:
              type: string
              description: The workspace ID of the short link.
            clicks:
              type: number
              default: 0
              description: The number of clicks on the short link.
            lastClicked:
              type: string
            leads:
              type: number
              default: 0
              description: '[BETA]: The number of leads the short links has generated.'
            sales:
              type: number
              default: 0
              description: '[BETA]: The number of sales the short links has generated.'
            saleAmount:
              type: number
              default: 0
              description: '[BETA]: The total dollar amount of sales the short links has generated (in cents).'
            createdAt:
              type: string
            updatedAt:
              type: string
            projectId:
              type: string
              description: The project ID of the short link. This field is deprecated – use `workspaceId` instead.
              deprecated: true
            programId:
              type: string
              nullable: true
              description: The ID of the program the short link is associated with.
          required:
            - id
            - domain
            - key
            - url
            - externalId
            - expiresAt
            - expiredUrl
            - password
            - title
            - description
            - image
            - video
            - ios
            - android
            - geo
            - tagId
            - tags
            - webhookIds
            - comments
            - shortLink
            - qrCode
            - utm_source
            - utm_medium
            - utm_campaign
            - utm_term
            - utm_content
            - userId
            - workspaceId
            - clicks
            - lastClicked
            - leads
            - sales
            - saleAmount
            - createdAt
            - updatedAt
            - projectId
            - programId
        click_id:
          type: string
          description: Deprecated. Use `click.id` instead.
          deprecated: true
        link_id:
          type: string
          description: Deprecated. Use `link.id` instead.
          deprecated: true
        domain:
          type: string
          description: Deprecated. Use `link.domain` instead.
          deprecated: true
        key:
          type: string
          description: Deprecated. Use `link.key` instead.
          deprecated: true
        url:
          type: string
          description: Deprecated. Use `click.url` instead.
          deprecated: true
        continent:
          type: string
          description: Deprecated. Use `click.continent` instead.
          deprecated: true
        country:
          type: string
          description: Deprecated. Use `click.country` instead.
          deprecated: true
        city:
          type: string
          description: Deprecated. Use `click.city` instead.
          deprecated: true
        device:
          type: string
          description: Deprecated. Use `click.device` instead.
          deprecated: true
        browser:
          type: string
          description: Deprecated. Use `click.browser` instead.
          deprecated: true
        os:
          type: string
          description: Deprecated. Use `click.os` instead.
          deprecated: true
        qr:
          type: number
          description: Deprecated. Use `click.qr` instead.
          deprecated: true
        ip:
          type: string
          description: Deprecated. Use `click.ip` instead.
          deprecated: true
      required:
        - event
        - click
        - link
        - click_id
        - link_id
        - domain
        - key
        - url
        - continent
        - country
        - city
        - device
        - browser
        - os
        - qr
        - ip
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
To implement the `GET /events` route in the `ExampleClient` class, we will create a new method called `listEvents`. This method will handle the request to retrieve a list of events, including the necessary parameters as defined in the OpenAPI schema.

### Steps to Implement the Method:
1. **Define the Method**: The method will be named `listEvents` and will be an asynchronous function.
2. **Add Route Information**: Include a comment above the method to specify the route path, method, and tags.
3. **Define Input Parameters**: The method will accept an object containing optional parameters that correspond to the query parameters defined in the OpenAPI schema.
4. **Make the API Call**: Use the existing `fetch` method to make the GET request to the `/events` endpoint, passing the query parameters.
5. **Handle the Response**: The response will be typed to return either a list of `ClickEvent`, `LeadEvent`, or `SaleEvent` based on the OpenAPI schema.
6. **Error Handling**: Ensure that any errors during the fetch are properly handled.

### Code Snippet for `client.ts`:
```typescript:client.ts
  // ... existing code ...

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

  // ... existing code ...
```

This code snippet adds the `listEvents` method to the `ExampleClient` class, allowing it to fetch a list of events from the Dub.co API. The method is fully typed, handles optional parameters, and includes error handling for the API response.