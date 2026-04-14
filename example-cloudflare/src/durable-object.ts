export class MyDurableObject implements DurableObject {
  private state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const count =
      ((await this.state.storage.get<number>('count')) ?? 0) + 1
    await this.state.storage.put('count', count)
    return new Response(`Count: ${count}`)
  }
}
