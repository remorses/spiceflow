import "./static-page.css";

export function StaticPage({ id }: { id: string }) {
	return <div data-testid="static-page">This is a static page with id {id}</div>;
}
