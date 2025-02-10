import { Button } from "./button";
import { changeCounter, getCounter } from "./action";
import { Calculator, Counter, Hydrated } from "./client";

export async function IndexPage() {
	return (
		<div className=" bg-gray-50 gap-2">
			<div>server random: {Math.random().toString(36).slice(2)}</div>
			<Hydrated />
			<Counter />
			<form
				action={changeCounter}
				data-testid="server-counter"
				style={{ padding: "0.5rem" }}
			>
				<div>Server counter: {getCounter()}</div>
				<div>
					<Button className="p-4 border" name="change" value="-1">
						-
					</Button>
					<Button className="p-4 border" name="change" value="+1">
						+
					</Button>
				</div>
			</form>
			<Calculator />
		</div>
	);
}


