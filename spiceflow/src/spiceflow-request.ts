import { runValidation, type ValidationFunction } from './validation.ts'

export class SpiceflowRequest<T = any> extends Request {
  validateBody?: ValidationFunction

  async json(): Promise<T> {
    const body = (await super.json()) as Promise<T>
    return runValidation(body, this.validateBody)
  }
}
