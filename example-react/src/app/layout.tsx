import { Link } from "spiceflow/dist/react/components";
import { ProgressBar } from "spiceflow/dist/react/progress";

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
				</ul>
				{props.children}
			</body>
		</html>
	);
}
