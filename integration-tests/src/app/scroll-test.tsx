"use client";

export function ScrollTestPage({ name }: { name: string }) {
	return (
		<div
			data-testid="scroll-test-page"
			style={{ minHeight: "3000px", position: "relative" }}
		>
			<div data-testid="scroll-top" style={{ padding: "20px" }}>
				<h1>{name}</h1>
			</div>
			<div
				data-testid="scroll-middle"
				id="middle"
				style={{ position: "absolute", top: "1500px", padding: "20px" }}
			>
				Middle of {name}
			</div>
			<div
				data-testid="scroll-bottom"
				id="bottom"
				style={{ position: "absolute", top: "2800px", padding: "20px" }}
			>
				Bottom of {name}
			</div>
		</div>
	);
}
