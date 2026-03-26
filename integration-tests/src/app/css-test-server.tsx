// Server component with its own CSS import for e2e testing.
import "./server-styles.css";

export function CssTestServer() {
	return <div data-testid="css-test-server">Server component with CSS</div>;
}
