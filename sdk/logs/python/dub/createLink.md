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
  /links:
    post:
      operationId: createLink
      x-speakeasy-name-override: create
      x-speakeasy-usage-example: true
      summary: Create a new link
      x-codeSamples:
        - lang: typescript
          label: createLink
          source: |-
            import { Dub } from "dub";

            const dub = new Dub({
              token: "DUB_API_KEY",
            });

            async function run() {
              const result = await dub.links.create();

              // Handle the result
              console.log(result);
            }

            run();
        - lang: go
          label: createLink
        - lang: ruby
          label: createLink
          source: |-
            require 'dub'


            s = ::OpenApiSDK::Dub.new
            s.config_security(
              ::OpenApiSDK::Shared::Security.new(
                token: "DUB_API_KEY",
              )
            )


            req = ::OpenApiSDK::Operations::CreateLinkRequestBody.new(
              url: "https://google.com",
              external_id: "123456",
              tag_ids: [
                "clux0rgak00011...",
              ],
            )
                
            res = s.links.create(req)

            if ! res.link_schema.nil?
              # handle response
            end
        - lang: php
          label: createLink
        - lang: python
          label: createLink
          source: |-
            from dub import Dub

            with Dub(
                token="DUB_API_KEY",
            ) as dub:

                res = dub.links.create(request={
                    "url": "https://google.com",
                    "external_id": "123456",
                    "tag_ids": [
                        "clux0rgak00011...",
                    ],
                })

                assert res is not None

                # Handle response
                print(res)
        - lang: java
      description: Create a new link for the authenticated workspace.
      tags:
        - Links
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  description: The destination URL of the short link.
                  example: https://google.com
                domain:
                  type: string
                  maxLength: 190
                  description: The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
                key:
                  type: string
                  maxLength: 190
                  description: The short link slug. If not provided, a random 7-character slug will be generated.
                externalId:
                  type: string
                  nullable: true
                  minLength: 1
                  maxLength: 255
                  description: This is the ID of the link in your database. If set, it can be used to identify the link in the future. Must be prefixed with `ext_` when passed as a query parameter.
                  example: '123456'
                prefix:
                  type: string
                  description: The prefix of the short link slug for randomly-generated keys (e.g. if prefix is `/c/`, generated keys will be in the `/c/:key` format). Will be ignored if `key` is provided.
                trackConversion:
                  type: boolean
                  default: false
                  description: Whether to track conversions for the short link.
                archived:
                  type: boolean
                  default: false
                  description: Whether the short link is archived.
                publicStats:
                  type: boolean
                  default: false
                  description: 'Deprecated: Use `dashboard` instead. Whether the short link''s stats are publicly accessible.'
                  deprecated: true
                tagId:
                  type: string
                  nullable: true
                  description: The unique ID of the tag assigned to the short link. This field is deprecated – use `tagIds` instead.
                  deprecated: true
                tagIds:
                  anyOf:
                    - type: string
                    - type: array
                      items:
                        type: string
                  description: The unique IDs of the tags assigned to the short link.
                  example:
                    - clux0rgak00011...
                tagNames:
                  anyOf:
                    - type: string
                    - type: array
                      items:
                        type: string
                  description: The unique name of the tags assigned to the short link (case insensitive).
                comments:
                  type: string
                  nullable: true
                  description: The comments for the short link.
                expiresAt:
                  type: string
                  nullable: true
                  description: The date and time when the short link will expire at.
                expiredUrl:
                  type: string
                  nullable: true
                  description: The URL to redirect to when the short link has expired.
                password:
                  type: string
                  nullable: true
                  description: The password required to access the destination URL of the short link.
                proxy:
                  type: boolean
                  default: false
                  description: Whether the short link uses Custom Social Media Cards feature.
                title:
                  type: string
                  nullable: true
                  description: 'The custom link preview title (og:title). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og'
                description:
                  type: string
                  nullable: true
                  description: 'The custom link preview description (og:description). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og'
                image:
                  type: string
                  nullable: true
                  description: 'The custom link preview image (og:image). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og'
                video:
                  type: string
                  nullable: true
                  description: 'The custom link preview video (og:video). Will be used for Custom Social Media Cards if `proxy` is true. Learn more: https://d.to/og'
                rewrite:
                  type: boolean
                  default: false
                  description: Whether the short link uses link cloaking.
                ios:
                  type: string
                  nullable: true
                  description: The iOS destination URL for the short link for iOS device targeting.
                android:
                  type: string
                  nullable: true
                  description: The Android destination URL for the short link for Android device targeting.
                geo:
                  $ref: '#/components/schemas/linkGeoTargeting'
                doIndex:
                  type: boolean
                  default: false
                  description: 'Allow search engines to index your short link. Defaults to `false` if not provided. Learn more: https://d.to/noindex'
                utm_source:
                  type: string
                  nullable: true
                  description: The UTM source of the short link. If set, this will populate or override the UTM source in the destination URL.
                utm_medium:
                  type: string
                  nullable: true
                  description: The UTM medium of the short link. If set, this will populate or override the UTM medium in the destination URL.
                utm_campaign:
                  type: string
                  nullable: true
                  description: The UTM campaign of the short link. If set, this will populate or override the UTM campaign in the destination URL.
                utm_term:
                  type: string
                  nullable: true
                  description: The UTM term of the short link. If set, this will populate or override the UTM term in the destination URL.
                utm_content:
                  type: string
                  nullable: true
                  description: The UTM content of the short link. If set, this will populate or override the UTM content in the destination URL.
                ref:
                  type: string
                  nullable: true
                  description: The referral tag of the short link. If set, this will populate or override the `ref` query parameter in the destination URL.
                programId:
                  type: string
                  nullable: true
                  description: The ID of the program the short link is associated with.
                webhookIds:
                  type: array
                  nullable: true
                  items:
                    type: string
                  description: An array of webhook IDs to trigger when the link is clicked. These webhooks will receive click event data.
              required:
                - url
      responses:
        '200':
          description: The created link
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LinkSchema'
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
      LinkSchema:
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
            format: uri
            description: The destination URL of the short link.
          trackConversion:
            type: boolean
            default: false
            description: '[BETA] Whether to track conversions for the short link.'
          externalId:
            type: string
            nullable: true
            description: This is the ID of the link in your database that is unique across your workspace. If set, it can be used to identify the link in future API requests. Must be prefixed with 'ext_' when passed as a query parameter.
          archived:
            type: boolean
            default: false
            description: Whether the short link is archived.
          expiresAt:
            type: string
            nullable: true
            description: The date and time when the short link will expire in ISO-8601 format.
          expiredUrl:
            type: string
            nullable: true
            format: uri
            description: The URL to redirect to when the short link has expired.
          password:
            type: string
            nullable: true
            description: The password required to access the destination URL of the short link.
          proxy:
            type: boolean
            default: false
            description: Whether the short link uses Custom Social Media Cards feature.
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
            default: false
            description: Whether the short link uses link cloaking.
          doIndex:
            type: boolean
            default: false
            description: Whether to allow search engines to index the short link.
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
            default: false
            description: Whether the short link's stats are publicly accessible.
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
            description: The user ID of the creator of the short link.
          workspaceId:
            type: string
            description: The workspace ID of the short link.
          clicks:
            type: number
            default: 0
            description: The number of clicks on the short link.
          lastClicked:
            type: string
            nullable: true
            description: The date and time when the short link was last clicked.
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
            description: The date and time when the short link was created.
          updatedAt:
            type: string
            description: The date and time when the short link was last updated.
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
          - trackConversion
          - externalId
          - archived
          - expiresAt
          - expiredUrl
          - password
          - proxy
          - title
          - description
          - image
          - video
          - rewrite
          - doIndex
          - ios
          - android
          - geo
          - publicStats
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
        title: Link
      linkGeoTargeting:
        type: object
        nullable: true
        properties:
          AF:
            type: string
          AL:
            type: string
          DZ:
            type: string
          AS:
            type: string
          AD:
            type: string
          AO:
            type: string
          AI:
            type: string
          AQ:
            type: string
          AG:
            type: string
          AR:
            type: string
          AM:
            type: string
          AW:
            type: string
          AU:
            type: string
          AT:
            type: string
          AZ:
            type: string
          BS:
            type: string
          BH:
            type: string
          BD:
            type: string
          BB:
            type: string
          BY:
            type: string
          BE:
            type: string
          BZ:
            type: string
          BJ:
            type: string
          BM:
            type: string
          BT:
            type: string
          BO:
            type: string
          BA:
            type: string
          BW:
            type: string
          BV:
            type: string
          BR:
            type: string
          IO:
            type: string
          BN:
            type: string
          BG:
            type: string
          BF:
            type: string
          BI:
            type: string
          KH:
            type: string
          CM:
            type: string
          CA:
            type: string
          CV:
            type: string
          KY:
            type: string
          CF:
            type: string
          TD:
            type: string
          CL:
            type: string
          CN:
            type: string
          CX:
            type: string
          CC:
            type: string
          CO:
            type: string
          KM:
            type: string
          CG:
            type: string
          CD:
            type: string
          CK:
            type: string
          CR:
            type: string
          CI:
            type: string
          HR:
            type: string
          CU:
            type: string
          CY:
            type: string
          CZ:
            type: string
          DK:
            type: string
          DJ:
            type: string
          DM:
            type: string
          DO:
            type: string
          EC:
            type: string
          EG:
            type: string
          SV:
            type: string
          GQ:
            type: string
          ER:
            type: string
          EE:
            type: string
          ET:
            type: string
          FK:
            type: string
          FO:
            type: string
          FJ:
            type: string
          FI:
            type: string
          FR:
            type: string
          GF:
            type: string
          PF:
            type: string
          TF:
            type: string
          GA:
            type: string
          GM:
            type: string
          GE:
            type: string
          DE:
            type: string
          GH:
            type: string
          GI:
            type: string
          GR:
            type: string
          GL:
            type: string
          GD:
            type: string
          GP:
            type: string
          GU:
            type: string
          GT:
            type: string
          GN:
            type: string
          GW:
            type: string
          GY:
            type: string
          HT:
            type: string
          HM:
            type: string
          VA:
            type: string
          HN:
            type: string
          HK:
            type: string
          HU:
            type: string
          IS:
            type: string
          IN:
            type: string
          ID:
            type: string
          IR:
            type: string
          IQ:
            type: string
          IE:
            type: string
          IL:
            type: string
          IT:
            type: string
          JM:
            type: string
          JP:
            type: string
          JO:
            type: string
          KZ:
            type: string
          KE:
            type: string
          KI:
            type: string
          KP:
            type: string
          KR:
            type: string
          KW:
            type: string
          KG:
            type: string
          LA:
            type: string
          LV:
            type: string
          LB:
            type: string
          LS:
            type: string
          LR:
            type: string
          LY:
            type: string
          LI:
            type: string
          LT:
            type: string
          LU:
            type: string
          MO:
            type: string
          MG:
            type: string
          MW:
            type: string
          MY:
            type: string
          MV:
            type: string
          ML:
            type: string
          MT:
            type: string
          MH:
            type: string
          MQ:
            type: string
          MR:
            type: string
          MU:
            type: string
          YT:
            type: string
          MX:
            type: string
          FM:
            type: string
          MD:
            type: string
          MC:
            type: string
          MN:
            type: string
          MS:
            type: string
          MA:
            type: string
          MZ:
            type: string
          MM:
            type: string
          NA:
            type: string
          NR:
            type: string
          NP:
            type: string
          NL:
            type: string
          NC:
            type: string
          NZ:
            type: string
          NI:
            type: string
          NE:
            type: string
          NG:
            type: string
          NU:
            type: string
          NF:
            type: string
          MK:
            type: string
          MP:
            type: string
          'NO':
            type: string
          OM:
            type: string
          PK:
            type: string
          PW:
            type: string
          PS:
            type: string
          PA:
            type: string
          PG:
            type: string
          PY:
            type: string
          PE:
            type: string
          PH:
            type: string
          PN:
            type: string
          PL:
            type: string
          PT:
            type: string
          PR:
            type: string
          QA:
            type: string
          RE:
            type: string
          RO:
            type: string
          RU:
            type: string
          RW:
            type: string
          SH:
            type: string
          KN:
            type: string
          LC:
            type: string
          PM:
            type: string
          VC:
            type: string
          WS:
            type: string
          SM:
            type: string
          ST:
            type: string
          SA:
            type: string
          SN:
            type: string
          SC:
            type: string
          SL:
            type: string
          SG:
            type: string
          SK:
            type: string
          SI:
            type: string
          SB:
            type: string
          SO:
            type: string
          ZA:
            type: string
          GS:
            type: string
          ES:
            type: string
          LK:
            type: string
          SD:
            type: string
          SR:
            type: string
          SJ:
            type: string
          SZ:
            type: string
          SE:
            type: string
          CH:
            type: string
          SY:
            type: string
          TW:
            type: string
          TJ:
            type: string
          TZ:
            type: string
          TH:
            type: string
          TL:
            type: string
          TG:
            type: string
          TK:
            type: string
          TO:
            type: string
          TT:
            type: string
          TN:
            type: string
          TR:
            type: string
          TM:
            type: string
          TC:
            type: string
          TV:
            type: string
          UG:
            type: string
          UA:
            type: string
          AE:
            type: string
          GB:
            type: string
          US:
            type: string
          UM:
            type: string
          UY:
            type: string
          UZ:
            type: string
          VU:
            type: string
          VE:
            type: string
          VN:
            type: string
          VG:
            type: string
          VI:
            type: string
          WF:
            type: string
          EH:
            type: string
          YE:
            type: string
          ZM:
            type: string
          ZW:
            type: string
          AX:
            type: string
          BQ:
            type: string
          CW:
            type: string
          GG:
            type: string
          IM:
            type: string
          JE:
            type: string
          ME:
            type: string
          BL:
            type: string
          MF:
            type: string
          RS:
            type: string
          SX:
            type: string
          SS:
            type: string
          XK:
            type: string
        additionalProperties: false
        description: 'Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`.'
components:
  securitySchemes:
    token:
      type: http
      description: Default authentication mechanism
      scheme: bearer
      x-speakeasy-example: DUB_API_KEY
  schemas:
    LinkSchema:
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
          format: uri
          description: The destination URL of the short link.
        trackConversion:
          type: boolean
          default: false
          description: '[BETA] Whether to track conversions for the short link.'
        externalId:
          type: string
          nullable: true
          description: This is the ID of the link in your database that is unique across your workspace. If set, it can be used to identify the link in future API requests. Must be prefixed with 'ext_' when passed as a query parameter.
        archived:
          type: boolean
          default: false
          description: Whether the short link is archived.
        expiresAt:
          type: string
          nullable: true
          description: The date and time when the short link will expire in ISO-8601 format.
        expiredUrl:
          type: string
          nullable: true
          format: uri
          description: The URL to redirect to when the short link has expired.
        password:
          type: string
          nullable: true
          description: The password required to access the destination URL of the short link.
        proxy:
          type: boolean
          default: false
          description: Whether the short link uses Custom Social Media Cards feature.
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
          default: false
          description: Whether the short link uses link cloaking.
        doIndex:
          type: boolean
          default: false
          description: Whether to allow search engines to index the short link.
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
          default: false
          description: Whether the short link's stats are publicly accessible.
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
          description: The user ID of the creator of the short link.
        workspaceId:
          type: string
          description: The workspace ID of the short link.
        clicks:
          type: number
          default: 0
          description: The number of clicks on the short link.
        lastClicked:
          type: string
          nullable: true
          description: The date and time when the short link was last clicked.
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
          description: The date and time when the short link was created.
        updatedAt:
          type: string
          description: The date and time when the short link was last updated.
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
        - trackConversion
        - externalId
        - archived
        - expiresAt
        - expiredUrl
        - password
        - proxy
        - title
        - description
        - image
        - video
        - rewrite
        - doIndex
        - ios
        - android
        - geo
        - publicStats
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
      title: Link
    WorkspaceSchema:
      type: object
      properties:
        id:
          type: string
          description: The unique ID of the workspace.
        name:
          type: string
          description: The name of the workspace.
        slug:
          type: string
          description: The slug of the workspace.
        logo:
          type: string
          nullable: true
          default: null
          description: The logo of the workspace.
        inviteCode:
          type: string
          nullable: true
          description: The invite code of the workspace.
        plan:
          type: string
          enum:
            - free
            - pro
            - business
            - business plus
            - business extra
            - business max
            - enterprise
          description: The plan of the workspace.
        stripeId:
          type: string
          nullable: true
          description: The Stripe ID of the workspace.
        billingCycleStart:
          type: number
          description: The date and time when the billing cycle starts for the workspace.
        paymentFailedAt:
          type: string
          nullable: true
          description: The date and time when the payment failed for the workspace.
        stripeConnectId:
          type: string
          nullable: true
          description: '[BETA – Dub Conversions]: The Stripe Connect ID of the workspace.'
        payoutMethodId:
          type: string
          nullable: true
          description: '[BETA – Dub Partners]: The ID of the payment method for partner payouts.'
        usage:
          type: number
          description: The usage of the workspace.
        usageLimit:
          type: number
          description: The usage limit of the workspace.
        linksUsage:
          type: number
          description: The links usage of the workspace.
        linksLimit:
          type: number
          description: The links limit of the workspace.
        salesUsage:
          type: number
          description: The dollar amount of tracked revenue in the current billing cycle (in cents).
        salesLimit:
          type: number
          description: The limit of tracked revenue in the current billing cycle (in cents).
        domainsLimit:
          type: number
          description: The domains limit of the workspace.
        tagsLimit:
          type: number
          description: The tags limit of the workspace.
        usersLimit:
          type: number
          description: The users limit of the workspace.
        aiUsage:
          type: number
          description: The AI usage of the workspace.
        aiLimit:
          type: number
          description: The AI limit of the workspace.
        conversionEnabled:
          type: boolean
          description: Whether the workspace has conversion tracking enabled (d.to/conversions).
        dotLinkClaimed:
          type: boolean
          description: Whether the workspace has claimed a free .link domain. (dub.link/free)
        partnersEnabled:
          type: boolean
          description: Whether the workspace has Dub Partners enabled.
        createdAt:
          type: string
          description: The date and time when the workspace was created.
        users:
          type: array
          items:
            type: object
            properties:
              role:
                type: string
                enum:
                  - owner
                  - member
                description: The role of the authenticated user in the workspace.
            required:
              - role
          description: The role of the authenticated user in the workspace.
        domains:
          type: array
          items:
            type: object
            properties:
              slug:
                type: string
                description: The domain name.
                example: acme.com
              primary:
                type: boolean
                default: false
                description: Whether the domain is the primary domain for the workspace.
              verified:
                type: boolean
                default: false
                description: Whether the domain is verified.
            required:
              - slug
              - primary
              - verified
          description: The domains of the workspace.
        flags:
          type: object
          additionalProperties:
            type: boolean
          description: The feature flags of the workspace, indicating which features are enabled.
      required:
        - id
        - name
        - slug
        - logo
        - inviteCode
        - plan
        - stripeId
        - billingCycleStart
        - paymentFailedAt
        - stripeConnectId
        - payoutMethodId
        - usage
        - usageLimit
        - linksUsage
        - linksLimit
        - salesUsage
        - salesLimit
        - domainsLimit
        - tagsLimit
        - usersLimit
        - aiUsage
        - aiLimit
        - conversionEnabled
        - dotLinkClaimed
        - partnersEnabled
        - createdAt
        - users
        - domains
      title: Workspace
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
    DomainSchema:
      type: object
      properties:
        id:
          type: string
          description: The unique identifier of the domain.
        slug:
          type: string
          description: The domain name.
          example: acme.com
        verified:
          type: boolean
          default: false
          description: Whether the domain is verified.
        primary:
          type: boolean
          default: false
          description: Whether the domain is the primary domain for the workspace.
        archived:
          type: boolean
          description: Whether the domain is archived.
          default: false
        placeholder:
          type: string
          nullable: true
          description: Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened.
          example: https://dub.co/help/article/what-is-dub
        expiredUrl:
          type: string
          nullable: true
          description: The URL to redirect to when a link under this domain has expired.
          example: https://acme.com/expired
        notFoundUrl:
          type: string
          nullable: true
          description: The URL to redirect to when a link under this domain doesn't exist.
          example: https://acme.com/not-found
        logo:
          type: string
          nullable: true
          description: The logo of the domain.
        createdAt:
          type: string
          description: The date the domain was created.
        updatedAt:
          type: string
          description: The date the domain was last updated.
        registeredDomain:
          type: object
          nullable: true
          properties:
            id:
              type: string
              description: The ID of the registered domain record.
            createdAt:
              type: string
              description: The date the domain was created.
            expiresAt:
              type: string
              description: The date the domain expires.
          required:
            - id
            - createdAt
            - expiresAt
          description: The registered domain record.
      required:
        - id
        - slug
        - verified
        - primary
        - archived
        - placeholder
        - expiredUrl
        - notFoundUrl
        - logo
        - createdAt
        - updatedAt
        - registeredDomain
    WebhookEvent:
      anyOf:
        - $ref: '#/components/schemas/LinkWebhookEvent'
        - $ref: '#/components/schemas/LinkClickedEvent'
        - $ref: '#/components/schemas/LeadCreatedEvent'
        - $ref: '#/components/schemas/SaleCreatedEvent'
      description: Webhook event schema
      x-speakeasy-include: true
    linkGeoTargeting:
      type: object
      nullable: true
      properties:
        AF:
          type: string
        AL:
          type: string
        DZ:
          type: string
        AS:
          type: string
        AD:
          type: string
        AO:
          type: string
        AI:
          type: string
        AQ:
          type: string
        AG:
          type: string
        AR:
          type: string
        AM:
          type: string
        AW:
          type: string
        AU:
          type: string
        AT:
          type: string
        AZ:
          type: string
        BS:
          type: string
        BH:
          type: string
        BD:
          type: string
        BB:
          type: string
        BY:
          type: string
        BE:
          type: string
        BZ:
          type: string
        BJ:
          type: string
        BM:
          type: string
        BT:
          type: string
        BO:
          type: string
        BA:
          type: string
        BW:
          type: string
        BV:
          type: string
        BR:
          type: string
        IO:
          type: string
        BN:
          type: string
        BG:
          type: string
        BF:
          type: string
        BI:
          type: string
        KH:
          type: string
        CM:
          type: string
        CA:
          type: string
        CV:
          type: string
        KY:
          type: string
        CF:
          type: string
        TD:
          type: string
        CL:
          type: string
        CN:
          type: string
        CX:
          type: string
        CC:
          type: string
        CO:
          type: string
        KM:
          type: string
        CG:
          type: string
        CD:
          type: string
        CK:
          type: string
        CR:
          type: string
        CI:
          type: string
        HR:
          type: string
        CU:
          type: string
        CY:
          type: string
        CZ:
          type: string
        DK:
          type: string
        DJ:
          type: string
        DM:
          type: string
        DO:
          type: string
        EC:
          type: string
        EG:
          type: string
        SV:
          type: string
        GQ:
          type: string
        ER:
          type: string
        EE:
          type: string
        ET:
          type: string
        FK:
          type: string
        FO:
          type: string
        FJ:
          type: string
        FI:
          type: string
        FR:
          type: string
        GF:
          type: string
        PF:
          type: string
        TF:
          type: string
        GA:
          type: string
        GM:
          type: string
        GE:
          type: string
        DE:
          type: string
        GH:
          type: string
        GI:
          type: string
        GR:
          type: string
        GL:
          type: string
        GD:
          type: string
        GP:
          type: string
        GU:
          type: string
        GT:
          type: string
        GN:
          type: string
        GW:
          type: string
        GY:
          type: string
        HT:
          type: string
        HM:
          type: string
        VA:
          type: string
        HN:
          type: string
        HK:
          type: string
        HU:
          type: string
        IS:
          type: string
        IN:
          type: string
        ID:
          type: string
        IR:
          type: string
        IQ:
          type: string
        IE:
          type: string
        IL:
          type: string
        IT:
          type: string
        JM:
          type: string
        JP:
          type: string
        JO:
          type: string
        KZ:
          type: string
        KE:
          type: string
        KI:
          type: string
        KP:
          type: string
        KR:
          type: string
        KW:
          type: string
        KG:
          type: string
        LA:
          type: string
        LV:
          type: string
        LB:
          type: string
        LS:
          type: string
        LR:
          type: string
        LY:
          type: string
        LI:
          type: string
        LT:
          type: string
        LU:
          type: string
        MO:
          type: string
        MG:
          type: string
        MW:
          type: string
        MY:
          type: string
        MV:
          type: string
        ML:
          type: string
        MT:
          type: string
        MH:
          type: string
        MQ:
          type: string
        MR:
          type: string
        MU:
          type: string
        YT:
          type: string
        MX:
          type: string
        FM:
          type: string
        MD:
          type: string
        MC:
          type: string
        MN:
          type: string
        MS:
          type: string
        MA:
          type: string
        MZ:
          type: string
        MM:
          type: string
        NA:
          type: string
        NR:
          type: string
        NP:
          type: string
        NL:
          type: string
        NC:
          type: string
        NZ:
          type: string
        NI:
          type: string
        NE:
          type: string
        NG:
          type: string
        NU:
          type: string
        NF:
          type: string
        MK:
          type: string
        MP:
          type: string
        'NO':
          type: string
        OM:
          type: string
        PK:
          type: string
        PW:
          type: string
        PS:
          type: string
        PA:
          type: string
        PG:
          type: string
        PY:
          type: string
        PE:
          type: string
        PH:
          type: string
        PN:
          type: string
        PL:
          type: string
        PT:
          type: string
        PR:
          type: string
        QA:
          type: string
        RE:
          type: string
        RO:
          type: string
        RU:
          type: string
        RW:
          type: string
        SH:
          type: string
        KN:
          type: string
        LC:
          type: string
        PM:
          type: string
        VC:
          type: string
        WS:
          type: string
        SM:
          type: string
        ST:
          type: string
        SA:
          type: string
        SN:
          type: string
        SC:
          type: string
        SL:
          type: string
        SG:
          type: string
        SK:
          type: string
        SI:
          type: string
        SB:
          type: string
        SO:
          type: string
        ZA:
          type: string
        GS:
          type: string
        ES:
          type: string
        LK:
          type: string
        SD:
          type: string
        SR:
          type: string
        SJ:
          type: string
        SZ:
          type: string
        SE:
          type: string
        CH:
          type: string
        SY:
          type: string
        TW:
          type: string
        TJ:
          type: string
        TZ:
          type: string
        TH:
          type: string
        TL:
          type: string
        TG:
          type: string
        TK:
          type: string
        TO:
          type: string
        TT:
          type: string
        TN:
          type: string
        TR:
          type: string
        TM:
          type: string
        TC:
          type: string
        TV:
          type: string
        UG:
          type: string
        UA:
          type: string
        AE:
          type: string
        GB:
          type: string
        US:
          type: string
        UM:
          type: string
        UY:
          type: string
        UZ:
          type: string
        VU:
          type: string
        VE:
          type: string
        VN:
          type: string
        VG:
          type: string
        VI:
          type: string
        WF:
          type: string
        EH:
          type: string
        YE:
          type: string
        ZM:
          type: string
        ZW:
          type: string
        AX:
          type: string
        BQ:
          type: string
        CW:
          type: string
        GG:
          type: string
        IM:
          type: string
        JE:
          type: string
        ME:
          type: string
        BL:
          type: string
        MF:
          type: string
        RS:
          type: string
        SX:
          type: string
        SS:
          type: string
        XK:
          type: string
      additionalProperties: false
      description: 'Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`.'
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
    regionCode:
      type: string
      description: The ISO 3166-2 region code to retrieve analytics for.
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
    LinkWebhookEvent:
      type: object
      properties:
        id:
          type: string
        event:
          anyOf:
            - type: string
              enum:
                - link.created
            - type: string
              enum:
                - link.updated
            - type: string
              enum:
                - link.deleted
        createdAt:
          type: string
        data:
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
      required:
        - id
        - event
        - createdAt
        - data
      description: Triggered when a link is created, updated, or deleted.
    LinkClickedEvent:
      type: object
      properties:
        id:
          type: string
        event:
          type: string
          enum:
            - link.clicked
        createdAt:
          type: string
        data:
          type: object
          properties:
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
          required:
            - click
            - link
      required:
        - id
        - event
        - createdAt
        - data
      description: Triggered when a link is clicked.
    LeadCreatedEvent:
      type: object
      properties:
        id:
          type: string
        event:
          type: string
          enum:
            - lead.created
        createdAt:
          type: string
        data:
          type: object
          properties:
            eventName:
              type: string
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
          required:
            - eventName
            - customer
            - click
            - link
      required:
        - id
        - event
        - createdAt
        - data
      description: Triggered when a lead is created.
    SaleCreatedEvent:
      type: object
      properties:
        id:
          type: string
        event:
          type: string
          enum:
            - sale.created
        createdAt:
          type: string
        data:
          type: object
          properties:
            eventName:
              type: string
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
            sale:
              type: object
              properties:
                amount:
                  type: number
                currency:
                  type: string
                paymentProcessor:
                  type: string
                invoiceId:
                  type: string
                  nullable: true
              required:
                - amount
                - currency
                - paymentProcessor
                - invoiceId
          required:
            - eventName
            - customer
            - click
            - link
            - sale
      required:
        - id
        - event
        - createdAt
        - data
      description: Triggered when a sale is created.
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

---
