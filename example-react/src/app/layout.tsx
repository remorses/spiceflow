import { Link } from "spiceflow/dist/react/components";
import { ScrollRestoration } from "spiceflow/dist/react/scroll-restoration";
import { ProgressBar } from "spiceflow/dist/react/progress";
import { Counter } from "./client";

export function Layout(props: React.PropsWithChildren) {
	return (
		<html>
			<head>
				<meta charSet="UTF-8" />
				<meta
					name="viewport"
					content="width=device-width, height=device-height, initial-scale=1.0"
				/>
			</head>
			<body className="px-4 bg-gray-100">
				<ProgressBar />
				<ScrollRestoration />
				<Counter name="Layout" />
				<ul>
					<li>
						<Link href="/">Home</Link>
					</li>
					<li>
						<Link href="/other" data-testid="other-link">
							Other
						</Link>
					</li>
					<li>
						<Link href="/slow">slow page</Link>
					</li>
					<li>
						<Link href="/slow-suspense">slow suspense page</Link>
					</li>
					<li>
						<Link href="#layout-anchor" data-testid="hash-link">
							hash link
						</Link>
					</li>
					<li>
						<Link href="/other" target="_blank" data-testid="blank-link">
							blank link
						</Link>
					</li>
					<li>
						<Link
							href="/other"
							preventScrollReset
							data-testid="prevent-scroll-link"
						>
							prevent scroll reset link
						</Link>
					</li>
					<li>
						<Link
							href="/other"
							reloadDocument
							data-testid="reload-document-link"
						>
							reload document link
						</Link>
					</li>
				</ul>
				<main data-spiceflow-main>{props.children}</main>
				<div data-testid="scroll-spacer" style={{ height: "1400px" }} />
				<div id="layout-anchor">layout anchor</div>
			</body>
		</html>
	);
}
