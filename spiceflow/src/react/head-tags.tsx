// Typed Head sub-components with autocomplete for HTML head element attributes.
// Uses the `string & {}` pattern: known values appear in autocomplete, but arbitrary strings are still accepted.
import React from 'react'

// ---------------------------------------------------------------------------
// Head.Meta
// ---------------------------------------------------------------------------

type MetaName =
  // HTML standard
  | 'application-name'
  | 'author'
  | 'description'
  | 'generator'
  | 'keywords'
  | 'referrer'
  | 'color-scheme'
  | 'theme-color'
  | 'viewport'
  // Crawler / SEO
  | 'robots'
  | 'googlebot'
  | 'googlebot-news'
  | 'bingbot'
  // Extended
  | 'creator'
  | 'publisher'
  | 'subject'
  | 'abstract'
  | 'topic'
  | 'summary'
  | 'classification'
  | 'category'
  | 'coverage'
  | 'distribution'
  | 'rating'
  | 'copyright'
  | 'designer'
  | 'owner'
  | 'url'
  | 'identifier-url'
  | 'directory'
  | 'language'
  | 'revised'
  | 'reply-to'
  | 'revisit-after'
  // Mobile / Apple
  | 'apple-mobile-web-app-capable'
  | 'apple-mobile-web-app-status-bar-style'
  | 'apple-mobile-web-app-title'
  | 'apple-touch-fullscreen'
  | 'format-detection'
  | 'mobile-web-app-capable'
  // Microsoft
  | 'msapplication-TileColor'
  | 'msapplication-TileImage'
  | 'msapplication-config'
  // Verification
  | 'google-site-verification'
  | 'yandex-verification'
  | 'msvalidate.01'
  | 'p:domain_verify'
  // Security
  | 'csrf-param'
  | 'csrf-token'
  // Twitter Card
  | 'twitter:card'
  | 'twitter:site'
  | 'twitter:site:id'
  | 'twitter:creator'
  | 'twitter:creator:id'
  | 'twitter:title'
  | 'twitter:description'
  | 'twitter:image'
  | 'twitter:image:alt'
  | 'twitter:player'
  | 'twitter:player:width'
  | 'twitter:player:height'
  | 'twitter:player:stream'
  | 'twitter:app:name:iphone'
  | 'twitter:app:id:iphone'
  | 'twitter:app:url:iphone'
  | 'twitter:app:name:ipad'
  | 'twitter:app:id:ipad'
  | 'twitter:app:url:ipad'
  | 'twitter:app:name:googleplay'
  | 'twitter:app:id:googleplay'
  | 'twitter:app:url:googleplay'
  | (string & {})

type MetaProperty =
  // Open Graph basic
  | 'og:title'
  | 'og:type'
  | 'og:url'
  | 'og:image'
  | 'og:description'
  | 'og:determiner'
  | 'og:locale'
  | 'og:locale:alternate'
  | 'og:site_name'
  | 'og:audio'
  | 'og:video'
  // og:image structured
  | 'og:image:url'
  | 'og:image:secure_url'
  | 'og:image:type'
  | 'og:image:width'
  | 'og:image:height'
  | 'og:image:alt'
  // og:video structured
  | 'og:video:url'
  | 'og:video:secure_url'
  | 'og:video:type'
  | 'og:video:width'
  | 'og:video:height'
  // og:audio structured
  | 'og:audio:url'
  | 'og:audio:secure_url'
  | 'og:audio:type'
  // article
  | 'article:published_time'
  | 'article:modified_time'
  | 'article:expiration_time'
  | 'article:author'
  | 'article:section'
  | 'article:tag'
  // profile
  | 'profile:first_name'
  | 'profile:last_name'
  | 'profile:username'
  | 'profile:gender'
  // book
  | 'book:author'
  | 'book:isbn'
  | 'book:release_date'
  | 'book:tag'
  // music
  | 'music:duration'
  | 'music:album'
  | 'music:album:disc'
  | 'music:album:track'
  | 'music:musician'
  | 'music:song'
  | 'music:song:disc'
  | 'music:song:track'
  | 'music:creator'
  | 'music:release_date'
  // video
  | 'video:actor'
  | 'video:actor:role'
  | 'video:director'
  | 'video:writer'
  | 'video:duration'
  | 'video:release_date'
  | 'video:tag'
  | 'video:series'
  // Facebook
  | 'fb:app_id'
  | 'fb:admins'
  | 'fb:pages'
  | (string & {})

type MetaHttpEquiv =
  | 'content-security-policy'
  | 'content-type'
  | 'default-style'
  | 'x-ua-compatible'
  | 'refresh'
  | 'set-cookie'
  | (string & {})

type MetaCharset = 'utf-8' | 'iso-8859-1' | (string & {})

export type MetaProps = Omit<
  React.MetaHTMLAttributes<HTMLMetaElement>,
  'name' | 'property' | 'httpEquiv' | 'charSet'
> & {
  name?: MetaName
  property?: MetaProperty
  httpEquiv?: MetaHttpEquiv
  charSet?: MetaCharset
}

// ---------------------------------------------------------------------------
// Head.Title
// ---------------------------------------------------------------------------

export type TitleProps = {
  children: string
}

// ---------------------------------------------------------------------------
// Head.Link
// ---------------------------------------------------------------------------

type LinkRel =
  | 'alternate'
  | 'author'
  | 'canonical'
  | 'dns-prefetch'
  | 'help'
  | 'icon'
  | 'apple-touch-icon'
  | 'apple-touch-icon-precomposed'
  | 'license'
  | 'manifest'
  | 'mask-icon'
  | 'me'
  | 'modulepreload'
  | 'next'
  | 'pingback'
  | 'preconnect'
  | 'prefetch'
  | 'preload'
  | 'prerender'
  | 'prev'
  | 'search'
  | 'shortcut icon'
  | 'stylesheet'
  | (string & {})

type LinkAs =
  | 'audio'
  | 'document'
  | 'embed'
  | 'fetch'
  | 'font'
  | 'image'
  | 'object'
  | 'script'
  | 'style'
  | 'track'
  | 'video'
  | 'worker'
  | (string & {})

export type HeadLinkProps = Omit<
  React.LinkHTMLAttributes<HTMLLinkElement>,
  'rel' | 'as'
> & {
  rel?: LinkRel
  as?: LinkAs
}

// ---------------------------------------------------------------------------
// Head.Script
// ---------------------------------------------------------------------------

type ScriptType =
  | 'application/javascript'
  | 'application/json'
  | 'application/ld+json'
  | 'module'
  | 'importmap'
  | 'speculationrules'
  | 'text/javascript'
  | (string & {})

export type ScriptProps = Omit<
  React.ScriptHTMLAttributes<HTMLScriptElement>,
  'type'
> & {
  type?: ScriptType
}

// ---------------------------------------------------------------------------
// Head.Style
// ---------------------------------------------------------------------------

export type StyleProps = React.StyleHTMLAttributes<HTMLStyleElement>

// ---------------------------------------------------------------------------
// Head.Base
// ---------------------------------------------------------------------------

type BaseTarget = '_blank' | '_self' | '_parent' | '_top' | (string & {})

export type BaseProps = Omit<
  React.BaseHTMLAttributes<HTMLBaseElement>,
  'target'
> & {
  target?: BaseTarget
}
