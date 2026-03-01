import { Button } from "./button";
import { changeCounter } from "./action";
import { Calculator, Counter, Hydrated } from "./client";

export function IndexPage({ counter, serverRandom }: { counter: number; serverRandom: string }) {
	return (
		<div className=" bg-gray-50 gap-2">
			<div>server random: {serverRandom}</div>
			<Hydrated />
			<Counter />
			<form
				action={changeCounter}
				data-testid="server-counter"
				style={{ padding: "0.5rem" }}
			>
				<div>Server counter: {counter}</div>
				<div>Unicode test: 🌟 你好 こんにちは ⚡️ 안녕하세요</div>
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


