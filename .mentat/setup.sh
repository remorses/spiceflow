apt-get update
apt-get install -y unzip
curl -fsSL https://fnm.vercel.app/install | bash
export PATH=/root/.local/share/fnm:$PATH
eval "$(fnm env)"
fnm install 21
fnm use 21
npm install -g pnpm
mkdir -p openapi-schema-diff
echo '{"name":"openapi-schema-diff","version":"1.0.0"}' > openapi-schema-diff/package.json
cat > spiceflow/src/stream.test.ts << 'EOF'
import { describe, expect, it } from 'vitest'
import { Stream } from './stream'

describe('Stream', () => {
    it('stop stream on canceled request', async () => {
        const controller = new AbortController()
        const signal = controller.signal

        const stream = new Stream({
            signal,
            async *[Symbol.asyncIterator]() {
                yield 'hello'
                await new Promise((r) => setTimeout(r, 100))
                yield 'world'
            },
        })

        const body = stream.toReadableStream()
        const reader = body?.getReader()!

        const text = await new Promise((resolve) => {
            let acc = ''
            let resolvePromise;
            const promise = new Promise(r => {
                resolvePromise = r;
            });
            reader.read().then(function pump({ done, value }): unknown {
                if (done) {
                    resolve(acc)
                    return
                }
                acc += new TextDecoder().decode(value)
                return reader.read().then(pump)
            })
            setTimeout(() => {
                controller.abort()
            }, 10)
            return promise
        })

        expect(text).toBe('hello')
    })

    it('handle stream with objects', async () => {
        const stream = new Stream({
            async *[Symbol.asyncIterator]() {
                yield { hello: 'world' }
                yield { ciao: 'mondo' }
            },
        })
        const body = stream.toReadableStream({
            transform: (x) => {
                return JSON.stringify(x) + '\n'
            },
        })
        let resolvePromise;
        const promise = new Promise<void>(r => {
            resolvePromise = r;
        });
        const reader = body?.getReader()!
        reader.read().then(function pump({ done, value }): unknown {
            if (done) {
                resolvePromise()
                return
            }
            const text = new TextDecoder().decode(value)
            expect(text).toMatch(/\n$/)
            return reader.read().then(pump)
        })
        await promise
    })

    it('handle object and array', async () => {
        const x = new Stream({
            async *[Symbol.asyncIterator]() {
                yield { hello: 'world' }
                yield [1, 2, 3]
            },
        }).toReadableStream({
            transform: (x) => {
                return JSON.stringify(x) + '\n'
            },
        })
        await new Promise((resolve) => {
            const reader = x?.getReader()
            let resolvePromise;
            const promise = new Promise<void>(r => {
                resolvePromise = r;
            });
            reader.read().then(function pump({ done, value }): unknown {
                if (done) {
                    resolve()
                    return
                }
                const text = new TextDecoder().decode(value)
                expect(text).toMatch(/\n$/)
                return reader.read().then(pump)
            })
            return promise
        })
    })
})
EOF
pnpm install
pnpm build