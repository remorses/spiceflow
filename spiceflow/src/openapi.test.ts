import { expect, test } from 'vitest'
import { Spiceflow } from './spiceflow.js'
import { openapi } from './openapi.js'
import { z } from 'zod'

test('openapi response', async () => {
	const app = await new Spiceflow()
		.use(
			openapi({
				documentation: {
					info: {
						title: 'Spiceflow Docs',
						version: '0.0.0',
					},
				},
			}),
		)
		.use(
			new Spiceflow({ basePath: '/one' }).get(
				'/ids/:id',
				({ params }) => {
					if (Math.random() < 0.5) {
						// TODO add a way to set status

						return {
							message: 'sdf',
						}
					}
					return params.id
				},
				{
					response: {
						200: z.string(),
						404: z.object({
							message: z.string(),
						}),
					},
				},
			),
		)
		.patch(
			'/addBody',
			async (c) => {
				let body = await c.request.json()
				return body
			},
			{
				body: z.object({
					name: z.string(),
				}),
				response: z.object({
					name: z.string().optional(),
				}),
			},
		)
		.get(
			'/queryParams',
			async (c) => {
				const query = c.query
				return query
			},
			{
				query: z.object({
					name: z.string(),
				}),
				response: z.object({
					name: z.string().optional(),
				}),
			},
		)
		.post(
			'/queryParams',
			async (c) => {
				const query = c.query
				return query
			},
			{
				detail: {
					description: 'This is a post',
					operationId: 'postQueryParamsXXX',
				},
				body: z.object({
					name: z.string(),
				}),
				response: z.object({
					name: z.string().optional(),
				}),
			},
		)
		.use(
			new Spiceflow({ basePath: '/two' }).get(
				'/ids/:id',
				({ params }) => params.id,
				{
					params: z.object({
						id: z.string(),
					}),
				},
			),
		)
	const openapiSchema = await app
		.handle(new Request('http://localhost/openapi'))
		.then((x) => x.json())
	expect(openapiSchema).toMatchInlineSnapshot(`
		{
		  "components": {
		    "schemas": {},
		  },
		  "info": {
		    "description": "Development documentation",
		    "title": "Spiceflow Docs",
		    "version": "0.0.0",
		  },
		  "openapi": "3.0.3",
		  "paths": {
		    "/addBody": {
		      "patch": {
		        "operationId": "patchAddBody",
		        "parameters": [],
		        "requestBody": {
		          "content": {
		            "application/json": {
		              "schema": {
		                "$schema": "http://json-schema.org/draft-07/schema#",
		                "additionalProperties": false,
		                "properties": {
		                  "name": {
		                    "type": "string",
		                  },
		                },
		                "required": [
		                  "name",
		                ],
		                "type": "object",
		              },
		            },
		          },
		          "required": true,
		        },
		        "responses": {
		          "200": {
		            "$schema": "http://json-schema.org/draft-07/schema#",
		            "content": {
		              "application/json": {
		                "schema": {
		                  "properties": {
		                    "name": {
		                      "type": "string",
		                    },
		                  },
		                  "type": "object",
		                },
		              },
		            },
		          },
		        },
		      },
		    },
		    "/one/ids/{id}": {
		      "get": {
		        "operationId": "getOneIdsById",
		        "responses": {
		          "200": {
		            "$schema": "http://json-schema.org/draft-07/schema#",
		            "content": {
		              "application/json": {
		                "schema": {
		                  "$schema": "http://json-schema.org/draft-07/schema#",
		                  "type": "string",
		                },
		              },
		            },
		          },
		          "404": {
		            "$schema": "http://json-schema.org/draft-07/schema#",
		            "content": {
		              "application/json": {
		                "schema": {
		                  "properties": {
		                    "message": {
		                      "type": "string",
		                    },
		                  },
		                  "required": [
		                    "message",
		                  ],
		                  "type": "object",
		                },
		              },
		            },
		          },
		        },
		      },
		    },
		    "/openapi": {
		      "get": {
		        "operationId": "getOpenapi",
		        "responses": {},
		      },
		    },
		    "/queryParams": {
		      "get": {
		        "operationId": "getQueryParams",
		        "parameters": [
		          {
		            "in": "query",
		            "name": "name",
		            "required": true,
		            "schema": {
		              "type": "string",
		            },
		          },
		        ],
		        "responses": {
		          "200": {
		            "$schema": "http://json-schema.org/draft-07/schema#",
		            "content": {
		              "application/json": {
		                "schema": {
		                  "properties": {
		                    "name": {
		                      "type": "string",
		                    },
		                  },
		                  "type": "object",
		                },
		              },
		            },
		          },
		        },
		      },
		      "post": {
		        "description": "This is a post",
		        "operationId": "postQueryParamsXXX",
		        "parameters": [],
		        "requestBody": {
		          "content": {
		            "application/json": {
		              "schema": {
		                "$schema": "http://json-schema.org/draft-07/schema#",
		                "additionalProperties": false,
		                "properties": {
		                  "name": {
		                    "type": "string",
		                  },
		                },
		                "required": [
		                  "name",
		                ],
		                "type": "object",
		              },
		            },
		          },
		          "required": true,
		        },
		        "responses": {
		          "200": {
		            "$schema": "http://json-schema.org/draft-07/schema#",
		            "content": {
		              "application/json": {
		                "schema": {
		                  "properties": {
		                    "name": {
		                      "type": "string",
		                    },
		                  },
		                  "type": "object",
		                },
		              },
		            },
		          },
		        },
		      },
		    },
		    "/two/ids/{id}": {
		      "get": {
		        "operationId": "getTwoIdsById",
		        "parameters": [
		          {
		            "in": "path",
		            "name": "id",
		            "required": true,
		            "schema": {
		              "type": "string",
		            },
		          },
		        ],
		        "responses": {},
		      },
		    },
		  },
		}
	`)
})
