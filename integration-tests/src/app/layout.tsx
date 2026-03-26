import { Link, ProgressBar, ScrollRestoration } from "spiceflow/react";
import { Counter, LayoutMountTracker } from "./client";

export function Layout(props: React.PropsWithChildren) {
	return (
		<html>
			<head>
				<meta charSet="UTF-8" />
				<meta
					name="viewport"
					content="width=device-width, height=device-height, initial-scale=1.0"
				/>
				<ScrollRestoration />
			</head>
			<body className="px-4 bg-gray-100">
				<ProgressBar />
				<LayoutMountTracker />
				<Counter name="Layout" />
				<ul>
					<li>
						<Link href="/">Home</Link>
					</li>
					<li>
						<Link href="/other">Other</Link>
					</li>
					<li>
						<Link href="/slow">slow page</Link>
					</li>
					<li>
						<Link href="/slow-suspense">slow suspense page</Link>
					</li>
					<li>
						<Link href="/scroll-restoration/page-a">Scroll A</Link>
					</li>
					<li>
						<Link href="/scroll-restoration/page-b">Scroll B</Link>
					</li>
					<li>
						<Link
							href="/throw-redirect-in-page"
							data-testid="link-throw-redirect-page"
						>
							throw redirect page
						</Link>
					</li>
					<li>
						<Link
							href="/throw-redirect-in-layout"
							data-testid="link-throw-redirect-layout"
						>
							throw redirect layout
						</Link>
					</li>
					<li>
						<Link
							href="/throw-notfound-in-page"
							data-testid="link-throw-notfound-page"
						>
							throw notfound page
						</Link>
					</li>
					<li>
						<Link
							href="/throw-notfound-in-layout"
							data-testid="link-throw-notfound-layout"
						>
							throw notfound layout
						</Link>
					</li>
					<li>
						<Link href="/slow-redirect" data-testid="link-slow-redirect">
							slow redirect
						</Link>
					</li>
					<li>
						<Link href="/slow-notfound" data-testid="link-slow-notfound">
							slow notfound
						</Link>
					</li>
					<li>
						<Link href="/rsc-error" data-testid="link-rsc-error">
							rsc error
						</Link>
					</li>
					<li>
						<Link href="/cached-page" data-testid="link-cached-page">
							cached page
						</Link>
					</li>
				</ul>
				{props.children}
			</body>
		</html>
	);
}
