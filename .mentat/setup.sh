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
cat > stream.test.patch << 'EOF'
--- a/spiceflow/src/stream.test.ts
+++ b/spiceflow/src/stream.test.ts
@@ -149,7 +149,10 @@
     return new Promise((resolve) => {
         let acc = ''
-        const { promise, resolve } = Promise.withResolvers()
+        let resolvePromise;
+        const promise = new Promise(r => {
+            resolvePromise = r;
+        });
         reader.read().then(function pump({ done, value }): unknown {
             if (done) {
                 resolve(acc)
@@ -209,7 +212,10 @@
         },
     })
-    const { promise, resolve } = Promise.withResolvers<void>()
+    let resolvePromise;
+    const promise = new Promise<void>(r => {
+        resolvePromise = r;
+    });
     const reader = body?.getReader()!
     reader.read().then(function pump({ done, value }): unknown {
         if (done) {
@@ -326,7 +329,10 @@
     return new Promise((resolve) => {
         const reader = x?.getReader()
-        const { promise, resolve } = Promise.withResolvers<void>()
+        let resolvePromise;
+        const promise = new Promise<void>(r => {
+            resolvePromise = r;
+        });
         reader.read().then(function pump({ done, value }): unknown {
             if (done) {
                 resolve()
EOF
patch -p1 < stream.test.patch
pnpm install
pnpm build